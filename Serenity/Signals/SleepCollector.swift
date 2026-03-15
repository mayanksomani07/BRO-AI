// SleepCollector.swift
// Reads HealthKit sleep analysis and computes:
//   - Last night's sleep duration (normalised)
//   - 7-day sleep regularity index (1.0 = very regular, 0.0 = chaotic)

import Foundation
import HealthKit

final class SleepCollector: SignalCollector {

    static let shared = SleepCollector()
    private let healthStore = HKHealthStore()
    private let sleepType = HKObjectType.categoryType(forIdentifier: .sleepAnalysis)!

    private init() {}

    // MARK: - Permission

    func requestPermission() async {
        guard HKHealthStore.isHealthDataAvailable() else { return }
        try? await healthStore.requestAuthorization(toShare: [], read: [sleepType])
    }

    // MARK: - SignalCollector

    func collect() async -> (inout DailyFeatureVector) -> Void {
        guard HKHealthStore.isHealthDataAvailable() else {
            return { vector in
                vector.sleepDurationNorm = 0.5
                vector.sleepRegularity = 0.5
            }
        }

        let samples = await fetchSleepSamples(days: 7)
        let lastNightHours = computeLastNightDuration(from: samples)
        let regularity = computeRegularityIndex(from: samples)

        return { vector in
            vector.sleepDurationNorm = lastNightHours.normalized(max: 9)
            vector.sleepRegularity = regularity
        }
    }

    // MARK: - Fetch sleep samples for last N days

    private func fetchSleepSamples(days: Int) async -> [HKCategorySample] {
        let cutoff = Calendar.current.date(byAdding: .day, value: -days, to: Date())!
        let predicate = HKQuery.predicateForSamples(withStart: cutoff, end: Date())
        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)

        return await withCheckedContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: sleepType,
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: [sortDescriptor]
            ) { _, samples, error in
                guard let samples = samples as? [HKCategorySample], error == nil else {
                    continuation.resume(returning: [])
                    return
                }
                // Only keep "InBed" or "Asleep" values
                let sleepSamples = samples.filter {
                    $0.value == HKCategoryValueSleepAnalysis.inBed.rawValue ||
                    $0.value == HKCategoryValueSleepAnalysis.asleepUnspecified.rawValue ||
                    $0.value == HKCategoryValueSleepAnalysis.asleepCore.rawValue ||
                    $0.value == HKCategoryValueSleepAnalysis.asleepDeep.rawValue ||
                    $0.value == HKCategoryValueSleepAnalysis.asleepREM.rawValue
                }
                continuation.resume(returning: sleepSamples)
            }
            healthStore.execute(query)
        }
    }

    // MARK: - Last night's total sleep duration in hours

    private func computeLastNightDuration(from samples: [HKCategorySample]) -> Double {
        // "Last night" = samples that started between yesterday 6pm and today 12pm
        let now = Date()
        let cal = Calendar.current
        let todayNoon = cal.date(bySettingHour: 12, minute: 0, second: 0, of: now)!
        let yesterdayEvening = cal.date(byAdding: .hour, value: -18, to: todayNoon)!

        let lastNightSamples = samples.filter {
            $0.startDate >= yesterdayEvening && $0.endDate <= todayNoon
        }

        let totalSeconds = lastNightSamples.reduce(0.0) {
            $0 + $1.endDate.timeIntervalSince($1.startDate)
        }
        return totalSeconds / 3600.0 // convert to hours
    }

    // MARK: - Sleep regularity index
    // Returns 1.0 for perfectly consistent sleep onset times, 0.0 for completely erratic.

    private func computeRegularityIndex(from samples: [HKCategorySample]) -> Double {
        // Group samples by calendar day, find earliest sleep start each night
        var dailyStartHours: [Double] = []
        var dayBuckets: [String: [HKCategorySample]] = [:]

        for sample in samples {
            let key = sample.startDate.toISODate()
            dayBuckets[key, default: []].append(sample)
        }

        for (_, daySamples) in dayBuckets {
            if let earliest = daySamples.map({ $0.startDate }).min() {
                let cal = Calendar.current
                let hour = Double(cal.component(.hour, from: earliest))
                let minute = Double(cal.component(.minute, from: earliest))
                dailyStartHours.append(hour + minute / 60.0)
            }
        }

        guard dailyStartHours.count >= 2 else { return 0.5 } // not enough data

        let mean = dailyStartHours.reduce(0, +) / Double(dailyStartHours.count)
        let variance = dailyStartHours.map { pow($0 - mean, 2) }.reduce(0, +) / Double(dailyStartHours.count)
        let stdDev = sqrt(variance)

        // stdDev of 0 hours = perfect = 1.0; stdDev of 4+ hours = fully irregular = 0.0
        return max(0.0, 1.0 - (stdDev / 4.0))
    }
}
