// SleepCollector.swift
// FIXED: Checks authorization status before querying.
//        Wider sleep window (8pm-2pm) to catch late sleepers.
//        Better fallback logic — shows 0 (not 0.5) when no data so the UI is honest.
//        Works with or without Apple Watch.
//        iPhone Sleep Focus mode data is included.

import Foundation
import HealthKit

final class SleepCollector: SignalCollector {

    static let shared = SleepCollector()
    private let healthStore = HKHealthStore()
    private let sleepType   = HKObjectType.categoryType(forIdentifier: .sleepAnalysis)!

    private init() {}

    // MARK: - Permission request

    func requestPermission() async {
        guard HKHealthStore.isHealthDataAvailable() else { return }
        try? await healthStore.requestAuthorization(toShare: [], read: [sleepType])
    }

    // MARK: - SignalCollector

    func collect() async -> (inout DailyFeatureVector) -> Void {
        guard HKHealthStore.isHealthDataAvailable() else {
            return { vector in
                vector.sleepDurationNorm = 0.0
                vector.sleepRegularity   = 0.5
            }
        }

        // Check we actually have permission — don't assume
        let status = healthStore.authorizationStatus(for: sleepType)
        guard status == .sharingAuthorized else {
            // Re-request silently
            await requestPermission()
            return { vector in
                vector.sleepDurationNorm = 0.0
                vector.sleepRegularity   = 0.5
            }
        }

        let samples        = await fetchSleepSamples(days: 8)
        let lastNightHours = computeLastNightDuration(from: samples)
        let regularity     = computeRegularityIndex(from: samples)

        print("[SleepCollector] Samples: \(samples.count) | lastNight: \(String(format: "%.1f", lastNightHours))h | regularity: \(String(format: "%.2f", regularity))")

        return { vector in
            vector.sleepDurationNorm = lastNightHours.normalized(max: 9)
            vector.sleepRegularity   = regularity
        }
    }

    // MARK: - Fetch

    private func fetchSleepSamples(days: Int) async -> [HKCategorySample] {
        let cutoff       = Calendar.current.date(byAdding: .day, value: -days, to: Date())!
        let predicate    = HKQuery.predicateForSamples(withStart: cutoff, end: Date(), options: .strictStartDate)
        let sortDesc     = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)

        return await withCheckedContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: sleepType,
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: [sortDesc]
            ) { _, samples, error in
                guard let raw = samples as? [HKCategorySample], error == nil else {
                    print("[SleepCollector] Query error: \(error?.localizedDescription ?? "unknown")")
                    continuation.resume(returning: [])
                    return
                }
                // Accept all asleep categories and inBed
                // iOS 16+ uses asleepCore/asleepDeep/asleepREM; older uses asleepUnspecified
                let accepted = raw.filter {
                    $0.value == HKCategoryValueSleepAnalysis.inBed.rawValue               ||
                    $0.value == HKCategoryValueSleepAnalysis.asleepUnspecified.rawValue   ||
                    $0.value == HKCategoryValueSleepAnalysis.asleepCore.rawValue          ||
                    $0.value == HKCategoryValueSleepAnalysis.asleepDeep.rawValue          ||
                    $0.value == HKCategoryValueSleepAnalysis.asleepREM.rawValue
                }
                continuation.resume(returning: accepted)
            }
            self.healthStore.execute(query)
        }
    }

    // MARK: - Last night's sleep duration
    // Window: yesterday 8pm → today 2pm (covers late sleepers and long sleepers)

    private func computeLastNightDuration(from samples: [HKCategorySample]) -> Double {
        let cal        = Calendar.current
        let now        = Date()

        // today at 2pm
        guard let todayAfternoon   = cal.date(bySettingHour: 14, minute: 0, second: 0, of: now),
              // yesterday at 8pm
              let yesterdayEvening = cal.date(byAdding: .hour, value: -18, to: todayAfternoon)
        else { return 0 }

        let windowSamples = samples.filter {
            $0.startDate >= yesterdayEvening && $0.startDate < todayAfternoon
        }

        // Merge overlapping intervals to avoid double-counting
        let merged = mergeIntervals(windowSamples.map { ($0.startDate, $0.endDate) })
        let totalSeconds = merged.reduce(0.0) { $0 + $1.1.timeIntervalSince($1.0) }
        return totalSeconds / 3600.0
    }

    // MARK: - Sleep regularity index

    private func computeRegularityIndex(from samples: [HKCategorySample]) -> Double {
        // Group by "sleep date" = the calendar date the sleep session STARTED
        // (normalise late-night hours so midnight = 24, 1am = 25, etc.)
        var dayBuckets: [String: [HKCategorySample]] = [:]
        for sample in samples {
            let key = sample.startDate.toISODate()
            dayBuckets[key, default: []].append(sample)
        }

        var startHours: [Double] = []
        for (_, daySamples) in dayBuckets {
            guard let earliest = daySamples.map({ $0.startDate }).min() else { continue }
            let cal    = Calendar.current
            var hour   = Double(cal.component(.hour,   from: earliest))
            let minute = Double(cal.component(.minute, from: earliest))
            // Normalise: treat hours 0–6 as 24–30 so that 11pm and 1am are close together
            if hour < 6 { hour += 24 }
            startHours.append(hour + minute / 60.0)
        }

        guard startHours.count >= 2 else { return 0.5 }

        let mean     = startHours.reduce(0, +) / Double(startHours.count)
        let variance = startHours.map { pow($0 - mean, 2) }.reduce(0, +) / Double(startHours.count)
        let stdDev   = sqrt(variance)
        // stdDev 0 = perfect regularity = 1.0; stdDev >= 3 hours = very irregular = 0.0
        return max(0.0, 1.0 - (stdDev / 3.0))
    }

    // MARK: - Merge overlapping time intervals

    private func mergeIntervals(_ intervals: [(Date, Date)]) -> [(Date, Date)] {
        guard !intervals.isEmpty else { return [] }
        let sorted = intervals.sorted { $0.0 < $1.0 }
        var result = [sorted[0]]
        for interval in sorted.dropFirst() {
            var last = result[result.count - 1]
            if interval.0 <= last.1 {
                last.1 = max(last.1, interval.1)
                result[result.count - 1] = last
            } else {
                result.append(interval)
            }
        }
        return result
    }
}