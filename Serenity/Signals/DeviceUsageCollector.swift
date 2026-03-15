// DeviceUsageCollector.swift
// Collects: step count (CMPedometer), stationary hours (CMMotionActivityManager),
// charge regularity (UIDevice), typing cadence (UITextInput keyboard notifications).
//
// NOTE: Screen Time / DeviceActivityReport requires FamilyControls entitlement.
// For personal testing we stub it at 0.5 (neutral). Apply for the entitlement
// separately via Apple Developer portal to enable real screen-time data.

import Foundation
import UIKit
import CoreMotion

final class DeviceUsageCollector: SignalCollector {

    static let shared = DeviceUsageCollector()
    private let pedometer = CMPedometer()
    private let motionActivityManager = CMMotionActivityManager()

    private init() {}

    func collect() async -> (inout DailyFeatureVector) -> Void {
        let steps = await fetchSteps()
        let stationaryHours = await fetchStationaryHours()
        let chargeRegularity = computeChargeRegularity()
        let (wpm, errorRate) = readTypingMetrics()

        return { vector in
            vector.stepsNorm = steps.normalized(max: 10_000)
            vector.stationaryHoursNorm = stationaryHours.normalized(max: 16)
            vector.chargeRegularity = chargeRegularity
            vector.typingWpmNorm = wpm.normalized(max: 60)
            vector.typingErrorRate = errorRate.clamped(to: 0.0...1.0)

            // Screen time: stubbed at neutral until FamilyControls entitlement is granted.
            // Replace these three lines with real DeviceActivityReport data once approved.
            vector.unlockCountNorm = 0.5
            vector.screenTimeNorm = 0.5
            vector.socialAppRatio = 0.5
        }
    }

    // MARK: - Step count via CMPedometer (no HealthKit needed)

    private func fetchSteps() async -> Double {
        guard CMPedometer.isStepCountingAvailable() else { return 0 }

        return await withCheckedContinuation { continuation in
            let start = Calendar.current.startOfDay(for: Date())
            pedometer.queryPedometerData(from: start, to: Date()) { data, error in
                guard let data = data, error == nil else {
                    continuation.resume(returning: 0)
                    return
                }
                continuation.resume(returning: data.numberOfSteps.doubleValue)
            }
        }
    }

    // MARK: - Stationary hours via CMMotionActivityManager

    private func fetchStationaryHours() async -> Double {
        guard CMMotionActivityManager.isActivityAvailable() else { return 8 }

        return await withCheckedContinuation { continuation in
            let start = Calendar.current.startOfDay(for: Date())
            motionActivityManager.queryActivityStarting(from: start, to: Date(), to: .main) { activities, error in
                guard let activities = activities, error == nil else {
                    continuation.resume(returning: 8)
                    return
                }
                var stationaryMinutes: Double = 0
                var previousDate: Date? = nil
                for activity in activities where activity.stationary {
                    if let prev = previousDate {
                        let duration = activity.startDate.timeIntervalSince(prev) / 60
                        stationaryMinutes += duration
                    }
                    previousDate = activity.startDate
                }
                continuation.resume(returning: stationaryMinutes / 60.0)
            }
        }
    }

    // MARK: - Charge regularity
    // Logs the time-of-day when the device starts charging.
    // Consistency of that time = good routine signal.

    private func computeChargeRegularity() -> Double {
        UIDevice.current.isBatteryMonitoringEnabled = true
        let now = Date()
        let hour = Double(Calendar.current.component(.hour, from: now))
        let minute = Double(Calendar.current.component(.minute, from: now))
        let timeOfDayFraction = (hour * 60 + minute) / (24 * 60) // 0.0–1.0

        let defaults = UserDefaults.standard
        let key = "chargeTimeFractions"
        var history = defaults.array(forKey: key) as? [Double] ?? []

        // Only log when actively charging
        if UIDevice.current.batteryState == .charging {
            history.append(timeOfDayFraction)
            if history.count > 14 { history.removeFirst() } // rolling 14-day window
            defaults.set(history, forKey: key)
        }

        guard history.count >= 3 else { return 0.5 } // not enough data yet

        let mean = history.reduce(0, +) / Double(history.count)
        let variance = history.map { pow($0 - mean, 2) }.reduce(0, +) / Double(history.count)
        let stdDev = sqrt(variance)

        // stdDev 0.0 = perfectly consistent = 1.0; stdDev ≥ 0.5 = fully erratic = 0.0
        return max(0, 1.0 - (stdDev / 0.5))
    }

    // MARK: - Typing speed / error rate
    // Reads aggregated metrics persisted by TypingMonitor.

    private func readTypingMetrics() -> (wpm: Double, errorRate: Double) {
        let wpm = UserDefaults.standard.double(forKey: "typingWPM")
        let errorRate = UserDefaults.standard.double(forKey: "typingErrorRate")
        return (wpm == 0 ? 30 : wpm, errorRate) // default 30 WPM if no data yet
    }
}

// MARK: - TypingMonitor
// Attach to your root window to passively observe keyboard metrics.
// It NEVER reads what is typed — only speed and deletion rate.

final class TypingMonitor: NSObject {

    static let shared = TypingMonitor()
    private var keystrokeCount: Int = 0
    private var deleteCount: Int = 0
    private var wordCount: Int = 0
    private var sessionStart: Date?

    private override init() {
        super.init()
    }

    func startObserving() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(textDidChange(_:)),
            name: UITextView.textDidChangeNotification,
            object: nil
        )
    }

    @objc private func textDidChange(_ notification: Notification) {
        guard let textView = notification.object as? UITextView else { return }

        if sessionStart == nil { sessionStart = Date() }

        let text = textView.text ?? ""
        keystrokeCount += 1
        wordCount = text.split(separator: " ").count

        // Rough deletion detection: length shorter than last observation
        let lastLen = UserDefaults.standard.integer(forKey: "_lastTextLen")
        let currentLen = text.count
        if currentLen < lastLen { deleteCount += 1 }
        UserDefaults.standard.set(currentLen, forKey: "_lastTextLen")

        // Persist metrics every 50 keystrokes
        if keystrokeCount % 50 == 0, let start = sessionStart {
            let minutes = Date().timeIntervalSince(start) / 60
            if minutes > 0 {
                let wpm = Double(wordCount) / minutes
                let errorRate = keystrokeCount > 0 ? Double(deleteCount) / Double(keystrokeCount) : 0
                UserDefaults.standard.set(wpm, forKey: "typingWPM")
                UserDefaults.standard.set(errorRate, forKey: "typingErrorRate")
            }
        }
    }
}
