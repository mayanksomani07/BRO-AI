// AmbientCollector.swift
// Collects:
//   - Ambient noise level (dB average via AVAudioSession metering — NO audio recorded)
//   - Whether the user left home today (CLVisit — NO GPS coordinates stored)

import Foundation
import AVFoundation
import CoreLocation

final class AmbientCollector: NSObject, SignalCollector, CLLocationManagerDelegate {

    static let shared = AmbientCollector()

    private let locationManager = CLLocationManager()
    private var leftHomeToday: Bool = false
    private var audioRecorder: AVAudioRecorder?

    private override init() {
        super.init()
        locationManager.delegate = self
        locationManager.startMonitoringVisits()
    }

    // MARK: - SignalCollector

    func collect() async -> (inout DailyFeatureVector) -> Void {
        let avgDb = await measureAmbientNoise(duration: 10)
        let didLeave = leftHomeToday

        return { vector in
            vector.ambientDbNorm = Double(avgDb).normalized(max: 70)
            vector.leftHome = didLeave ? 1.0 : 0.0
        }
    }

    // MARK: - Ambient noise measurement
    // Measures dB level for `duration` seconds. No audio data is retained.

    private func measureAmbientNoise(duration: TimeInterval) async -> Float {
        // iOS 17+ uses AVAudioApplication; earlier versions use AVAudioSession
        let hasPermission: Bool
        if #available(iOS 17.0, *) {
            hasPermission = AVAudioApplication.shared.recordPermission == .granted
        } else {
            hasPermission = AVAudioSession.sharedInstance().recordPermission == .granted
        }
        guard hasPermission else { return 35 }

        return await withCheckedContinuation { continuation in
            let session = AVAudioSession.sharedInstance()
            try? session.setCategory(.record, mode: .measurement)
            try? session.setActive(true)

            let settings: [String: Any] = [
                AVFormatIDKey: Int(kAudioFormatAppleLossless),
                AVSampleRateKey: 44100,
                AVNumberOfChannelsKey: 1,
                AVEncoderAudioQualityKey: AVAudioQuality.min.rawValue
            ]

            let tempURL = URL(fileURLWithPath: NSTemporaryDirectory())
                .appendingPathComponent("serenity_meter.caf")

            guard let recorder = try? AVAudioRecorder(url: tempURL, settings: settings) else {
                continuation.resume(returning: 35)
                return
            }

            recorder.isMeteringEnabled = true
            recorder.record()
            self.audioRecorder = recorder

            var readings: [Float] = []
            let interval: TimeInterval = 0.5
            var elapsed: TimeInterval = 0

            RunLoop.main.perform {
                Timer.scheduledTimer(withTimeInterval: interval, repeats: true) { timer in
                    recorder.updateMeters()
                    let db = recorder.averagePower(forChannel: 0)
                    // Convert dBFS (-160 to 0) → approximate SPL (0 to 100)
                    let spl = Float(max(0, db + 100))
                    readings.append(spl)

                    elapsed += interval
                    if elapsed >= duration {
                        timer.invalidate()
                        recorder.stop()
                        try? AVAudioSession.sharedInstance().setActive(false)
                        try? FileManager.default.removeItem(at: tempURL)
                        let avg = readings.isEmpty ? 35 : readings.reduce(0, +) / Float(readings.count)
                        continuation.resume(returning: avg)
                    }
                }
            }
        }
    }

    // MARK: - CLLocationManagerDelegate (CLVisit — no GPS stored)

    func locationManager(_ manager: CLLocationManager, didVisit visit: CLVisit) {
        let today = Calendar.current.startOfDay(for: Date())
        let visitDay = Calendar.current.startOfDay(for: visit.departureDate)
        if visitDay >= today {
            leftHomeToday = true
        }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        print("[AmbientCollector] Location error: \(error.localizedDescription)")
    }
}
