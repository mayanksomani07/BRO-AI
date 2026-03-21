// DeviceUsageCollector.swift
//
// SCREEN TIME: iOS has no public API for total device screen time without the
// FamilyControls entitlement (requires Apple approval). Best achievable proxy:
//   estimatedMinutes = unlockCount × avgSessionMinutes
// Research (Apple/Dscout 2016) shows average phone session = ~3.3 min.
// This gives e.g. 60 unlocks → ~198 min, vs the hardcoded 18 min from before.
//
// SOCIAL APP RATIO: Per-app time is impossible without FamilyControls.
// We detect which social apps are installed and use a daily self-report.
// User enters their estimated social time once per day from the dashboard.
//
// TYPING: TypingMonitor only sees text in Serenity itself. A dedicated
// calibration test (TypingCalibrationView) is the reliable alternative.

import Foundation
import UIKit
import CoreMotion

// MARK: - DeviceUsageCollector

final class DeviceUsageCollector: SignalCollector {

    static let shared = DeviceUsageCollector()
    private let pedometer = CMPedometer()
    private let motionActivityManager = CMMotionActivityManager()

    // Average iOS session length in minutes (source: Dscout / Apple research)
    private let avgSessionMinutes: Double = 3.3

    private enum Keys {
        static let unlockCount    = "serenity_unlock_count_date"   // "YYYY-MM-DD:count"
        static let chargeHistory  = "serenity_charge_fractions"    // [Double]
        static let lastChargeDate = "serenity_last_charge_date"    // "YYYY-MM-DD"
        static let socialRatio    = "serenity_social_ratio_date"   // "YYYY-MM-DD:ratio"
    }

    private init() {
        setupUnlockTracking()
        setupBatteryTracking()
        requestMotionPermission()
    }

    // MARK: - SignalCollector

    func collect() async -> (inout DailyFeatureVector) -> Void {
        let steps           = await fetchSteps()
        let stationaryHours = await fetchStationaryHours()
        let chargeReg       = computeChargeRegularity()
        let (wpm, errRate)  = readTypingMetrics()

        let unlockCount     = readTodayUnlocks()
        let unlockNorm      = unlockCount.normalized(max: 80)
        // Estimated screen time = unlocks × avg session (3.3 min each)
        let estimatedMins   = unlockCount * avgSessionMinutes
        let screenNorm      = estimatedMins.normalized(max: 480)
        let socialRatio     = readTodaySocialRatio()

        print("[DeviceUsage] unlocks=\(Int(unlockCount)) estScreen=\(Int(estimatedMins))min steps=\(Int(steps)) stationary=\(String(format:"%.1f",stationaryHours))h wpm=\(String(format:"%.0f",wpm)) errRate=\(String(format:"%.2f",errRate))")

        return { vector in
            vector.stepsNorm           = steps.normalized(max: 10_000)
            vector.stationaryHoursNorm = stationaryHours.normalized(max: 16)
            vector.chargeRegularity    = chargeReg
            vector.typingWpmNorm       = wpm.normalized(max: 60)
            vector.typingErrorRate     = errRate.clamped(to: 0.0...1.0)
            vector.unlockCountNorm     = unlockNorm
            vector.screenTimeNorm      = screenNorm
            vector.socialAppRatio      = socialRatio
        }
    }

    // MARK: - Screen unlock tracking

    private func setupUnlockTracking() {
        NotificationCenter.default.addObserver(
            forName: UIApplication.didBecomeActiveNotification,
            object: nil, queue: .main
        ) { [weak self] _ in self?.incrementTodayUnlocks() }
    }

    private func incrementTodayUnlocks() {
        let today  = Date().toISODate()
        let stored = UserDefaults.standard.string(forKey: Keys.unlockCount) ?? ""
        let parts  = stored.split(separator: ":").map(String.init)
        if parts.count == 2, parts[0] == today, let c = Int(parts[1]) {
            UserDefaults.standard.set("\(today):\(c + 1)", forKey: Keys.unlockCount)
        } else {
            UserDefaults.standard.set("\(today):1", forKey: Keys.unlockCount)
        }
    }

    func readTodayUnlocks() -> Double {
        let today  = Date().toISODate()
        let stored = UserDefaults.standard.string(forKey: Keys.unlockCount) ?? ""
        let parts  = stored.split(separator: ":").map(String.init)
        guard parts.count == 2, parts[0] == today, let c = Int(parts[1]) else { return 0 }
        return Double(c)
    }

    // MARK: - Social ratio (self-report, stored by SocialReportView)

    func saveTodaySocialRatio(_ ratio: Double) {
        let today = Date().toISODate()
        UserDefaults.standard.set("\(today):\(ratio)", forKey: Keys.socialRatio)
    }

    func readTodaySocialRatio() -> Double {
        let today  = Date().toISODate()
        let stored = UserDefaults.standard.string(forKey: Keys.socialRatio) ?? ""
        let parts  = stored.split(separator: ":").map(String.init)
        guard parts.count == 2, parts[0] == today, let r = Double(parts[1]) else { return 0.5 }
        return r.clamped(to: 0.0...1.0)
    }

    // Returns list of social apps installed on this device (via URL scheme detection)
    func detectInstalledSocialApps() -> [String] {
        let schemes: [(name: String, scheme: String)] = [
            ("WhatsApp",   "whatsapp://"),
            ("Instagram",  "instagram://"),
            ("Telegram",   "tg://"),
            ("Snapchat",   "snapchat://"),
            ("Twitter/X",  "twitter://"),
            ("Facebook",   "fb://"),
            ("LinkedIn",   "linkedin://"),
            ("TikTok",     "snssdk1233://"),
            ("YouTube",    "youtube://"),
            ("Reddit",     "reddit://"),
        ]
        return schemes.compactMap { item in
            guard let url = URL(string: item.scheme),
                  UIApplication.shared.canOpenURL(url) else { return nil }
            return item.name
        }
    }

    // MARK: - Battery / charge regularity

    private func setupBatteryTracking() {
        UIDevice.current.isBatteryMonitoringEnabled = true
        NotificationCenter.default.addObserver(
            forName: UIDevice.batteryStateDidChangeNotification,
            object: nil, queue: .main
        ) { [weak self] _ in self?.recordChargeEventIfNeeded() }
    }

    private func recordChargeEventIfNeeded() {
        guard UIDevice.current.batteryState == .charging ||
              UIDevice.current.batteryState == .full else { return }
        let today = Date().toISODate()
        guard UserDefaults.standard.string(forKey: Keys.lastChargeDate) != today else { return }
        UserDefaults.standard.set(today, forKey: Keys.lastChargeDate)

        let now    = Date()
        let hour   = Double(Calendar.current.component(.hour,   from: now))
        let minute = Double(Calendar.current.component(.minute, from: now))
        let frac   = (hour * 60 + minute) / (24 * 60)

        var history = UserDefaults.standard.array(forKey: Keys.chargeHistory) as? [Double] ?? []
        history.append(frac)
        if history.count > 14 { history.removeFirst() }
        UserDefaults.standard.set(history, forKey: Keys.chargeHistory)
    }

    private func computeChargeRegularity() -> Double {
        let history = UserDefaults.standard.array(forKey: Keys.chargeHistory) as? [Double] ?? []
        guard history.count >= 3 else { return 0.5 }
        let mean     = history.reduce(0, +) / Double(history.count)
        let variance = history.map { pow($0 - mean, 2) }.reduce(0, +) / Double(history.count)
        let stdDev   = sqrt(variance)
        return max(0, 1.0 - (stdDev / 0.5))
    }

    // MARK: - Motion permission

    private func requestMotionPermission() {
        guard CMMotionActivityManager.isActivityAvailable() else { return }
        motionActivityManager.startActivityUpdates(to: .main) { _ in }
        motionActivityManager.stopActivityUpdates()
    }

    // MARK: - Steps

    private func fetchSteps() async -> Double {
        guard CMPedometer.isStepCountingAvailable() else { return 0 }
        return await withCheckedContinuation { continuation in
            let start = Calendar.current.startOfDay(for: Date())
            pedometer.queryPedometerData(from: start, to: Date()) { data, error in
                guard let data = data, error == nil else { continuation.resume(returning: 0); return }
                continuation.resume(returning: data.numberOfSteps.doubleValue)
            }
        }
    }

    // MARK: - Stationary hours

    private func fetchStationaryHours() async -> Double {
        guard CMMotionActivityManager.isActivityAvailable() else { return 8 }
        return await withCheckedContinuation { continuation in
            let start = Calendar.current.startOfDay(for: Date())
            let end   = Date()
            motionActivityManager.queryActivityStarting(from: start, to: end, to: .main) { activities, error in
                guard let activities = activities, error == nil, !activities.isEmpty else {
                    continuation.resume(returning: 8); return
                }
                var stationarySeconds: Double = 0
                for i in 0..<activities.count {
                    let activity  = activities[i]
                    let nextStart = i + 1 < activities.count ? activities[i + 1].startDate : end
                    let duration  = nextStart.timeIntervalSince(activity.startDate)
                    if activity.stationary && duration > 0 { stationarySeconds += duration }
                }
                continuation.resume(returning: stationarySeconds / 3600.0)
            }
        }
    }

    // MARK: - Typing metrics

    private func readTypingMetrics() -> (wpm: Double, errorRate: Double) {
        let wpm       = UserDefaults.standard.double(forKey: "typingWPM")
        let errorRate = UserDefaults.standard.double(forKey: "typingErrorRate")
        return (wpm == 0 ? 0 : wpm, errorRate)
    }
}

// MARK: - TypingMonitor

final class TypingMonitor: NSObject {

    static let shared = TypingMonitor()
    private var keystrokeCount: Int = 0
    private var deleteCount: Int    = 0
    private var wordCount: Int      = 0
    private var sessionStart: Date?
    private var isObserving         = false

    private override init() { super.init() }

    func startObserving() {
        guard !isObserving else { return }
        isObserving = true
        NotificationCenter.default.addObserver(self, selector: #selector(textDidChange(_:)),
            name: UITextView.textDidChangeNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(textFieldDidChange(_:)),
            name: UITextField.textDidChangeNotification, object: nil)
    }

    @objc private func textDidChange(_ n: Notification) {
        guard let tv = n.object as? UITextView else { return }
        processTextChange(tv.text ?? "")
    }
    @objc private func textFieldDidChange(_ n: Notification) {
        guard let tf = n.object as? UITextField else { return }
        processTextChange(tf.text ?? "")
    }

    private func processTextChange(_ text: String) {
        if sessionStart == nil { sessionStart = Date() }
        keystrokeCount += 1
        wordCount = text.split(separator: " ").count

        let lastLen    = UserDefaults.standard.integer(forKey: "_serenity_lastTextLen")
        let currentLen = text.count
        if currentLen < lastLen { deleteCount += 1 }
        UserDefaults.standard.set(currentLen, forKey: "_serenity_lastTextLen")

        if keystrokeCount % 30 == 0, let start = sessionStart {
            let minutes = Date().timeIntervalSince(start) / 60
            guard minutes > 0 else { return }
            let wpm       = Double(wordCount) / minutes
            let errorRate = Double(deleteCount) / Double(max(keystrokeCount, 1))
            UserDefaults.standard.set(wpm.clamped(to: 0...200), forKey: "typingWPM")
            UserDefaults.standard.set(errorRate.clamped(to: 0...1),  forKey: "typingErrorRate")
        }
    }

    // Called by TypingCalibrationView after a completed test
    func saveCalibrationResult(wpm: Double, errorRate: Double) {
        UserDefaults.standard.set(wpm.clamped(to: 0...200),       forKey: "typingWPM")
        UserDefaults.standard.set(errorRate.clamped(to: 0...1),   forKey: "typingErrorRate")
        print("[TypingMonitor] Calibration saved: \(String(format:"%.0f",wpm)) WPM, \(String(format:"%.2f",errorRate)) err")
    }
}