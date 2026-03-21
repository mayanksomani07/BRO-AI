// AmbientCollector.swift
// FIXED: Audio format changed to LinearPCM (more compatible for metering).
//        Microphone permission requested proactively.
//        leftHome persisted to UserDefaults so it survives background kills.
//        CLLocationManager permission requested properly.

import Foundation
import AVFoundation
import CoreLocation

final class AmbientCollector: NSObject, SignalCollector, CLLocationManagerDelegate {

    static let shared = AmbientCollector()

    private let locationManager  = CLLocationManager()
    private var audioRecorder: AVAudioRecorder?

    // Persist leftHome flag per day
    private let leftHomeKey = "serenity_left_home_date" // "YYYY-MM-DD:bool"

    private override init() {
        super.init()
        locationManager.delegate             = self
        locationManager.desiredAccuracy      = kCLLocationAccuracyThreeKilometers
        locationManager.distanceFilter       = 500
        locationManager.allowsBackgroundLocationUpdates = true
        locationManager.pausesLocationUpdatesAutomatically = false

        // Request permission then start visits
        locationManager.requestAlwaysAuthorization()
        locationManager.startMonitoringVisits()
    }

    // MARK: - SignalCollector

    func collect() async -> (inout DailyFeatureVector) -> Void {
        let avgDb    = await measureAmbientNoise(duration: 8)
        let didLeave = readLeftHomeToday()

        print("[Ambient] dB=\(String(format:"%.1f",avgDb)) leftHome=\(didLeave)")

        return { vector in
            vector.ambientDbNorm = Double(avgDb).normalized(max: 70)
            vector.leftHome      = didLeave ? 1.0 : 0.0
        }
    }

    // MARK: - Ambient noise measurement
    // Uses LinearPCM format (most reliable for AVAudioRecorder metering).
    // Records for `duration` seconds then deletes the temp file immediately.

    private func measureAmbientNoise(duration: TimeInterval) async -> Float {
        let hasPermission: Bool
        if #available(iOS 17.0, *) {
            hasPermission = AVAudioApplication.shared.recordPermission == .granted
        } else {
            hasPermission = AVAudioSession.sharedInstance().recordPermission == .granted
        }

        guard hasPermission else {
            // Request permission for next time
            if #available(iOS 17.0, *) {
                await AVAudioApplication.requestRecordPermission()
            } else {
                await withCheckedContinuation { (cont: CheckedContinuation<Void, Never>) in
                    AVAudioSession.sharedInstance().requestRecordPermission { _ in cont.resume() }
                }
            }
            return 35.0 // neutral default
        }

        return await withCheckedContinuation { continuation in
            let session = AVAudioSession.sharedInstance()
            do {
                try session.setCategory(.record, mode: .measurement)
                try session.setActive(true, options: .notifyOthersOnDeactivation)
            } catch {
                continuation.resume(returning: 35.0)
                return
            }

            // Use LinearPCM — universally supported and best for metering
            let settings: [String: Any] = [
                AVFormatIDKey:              kAudioFormatLinearPCM,
                AVSampleRateKey:            16000.0,
                AVNumberOfChannelsKey:      1,
                AVLinearPCMBitDepthKey:     16,
                AVLinearPCMIsFloatKey:      false,
                AVLinearPCMIsBigEndianKey:  false
            ]

            let tempURL = URL(fileURLWithPath: NSTemporaryDirectory())
                .appendingPathComponent("serenity_noise_\(Int(Date().timeIntervalSince1970)).wav")

            guard let recorder = try? AVAudioRecorder(url: tempURL, settings: settings) else {
                continuation.resume(returning: 35.0)
                return
            }

            recorder.isMeteringEnabled = true
            guard recorder.record() else {
                continuation.resume(returning: 35.0)
                return
            }
            self.audioRecorder = recorder

            var readings: [Float] = []
            let tickInterval: TimeInterval = 0.4
            var elapsed: TimeInterval      = 0

            DispatchQueue.main.async {
                Timer.scheduledTimer(withTimeInterval: tickInterval, repeats: true) { timer in
                    recorder.updateMeters()
                    // averagePower returns dBFS (-160 to 0). Convert to approximate SPL.
                    let dbFS = recorder.averagePower(forChannel: 0)
                    let spl  = Float(max(0, min(100, dbFS + 100)))
                    readings.append(spl)
                    elapsed += tickInterval

                    if elapsed >= duration {
                        timer.invalidate()
                        recorder.stop()
                        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
                        try? FileManager.default.removeItem(at: tempURL)
                        let avg = readings.isEmpty ? 35 : readings.reduce(0, +) / Float(readings.count)
                        continuation.resume(returning: avg)
                    }
                }
            }
        }
    }

    // MARK: - Left home tracking (persisted)

    private func markLeftHome() {
        let today = Date().toISODate()
        UserDefaults.standard.set("\(today):true", forKey: leftHomeKey)
    }

    private func readLeftHomeToday() -> Bool {
        let today  = Date().toISODate()
        let stored = UserDefaults.standard.string(forKey: leftHomeKey) ?? ""
        return stored == "\(today):true"
    }

    // MARK: - CLLocationManagerDelegate

    func locationManager(_ manager: CLLocationManager, didVisit visit: CLVisit) {
        // A CLVisit fires when you arrive at or depart a significant location
        let today    = Calendar.current.startOfDay(for: Date())
        let visitDay = Calendar.current.startOfDay(for: visit.departureDate)
        if visitDay >= today {
            markLeftHome()
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        // Significant location change = user moved. Mark as left home.
        if let loc = locations.last, loc.horizontalAccuracy > 0 {
            markLeftHome()
        }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        print("[AmbientCollector] Location error: \(error.localizedDescription)")
    }

    func locationManager(_ manager: CLLocationManager, didChangeAuthorization status: CLAuthorizationStatus) {
        if status == .authorizedAlways || status == .authorizedWhenInUse {
            locationManager.startMonitoringVisits()
            locationManager.startMonitoringSignificantLocationChanges()
        }
    }
}