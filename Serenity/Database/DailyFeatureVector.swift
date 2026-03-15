// DailyFeatureVector.swift
// GRDB record model. One row per day. All feature values are normalised 0.0–1.0.

import Foundation
import GRDB

struct DailyFeatureVector: Codable, FetchableRecord, PersistableRecord {

    // MARK: - Identifiers
    var id: Int64?
    var date: String           // "2025-11-15" ISO date
    var createdAt: String      // full ISO-8601 timestamp

    // MARK: - Device usage signals (Section 2.1)
    var unlockCountNorm: Double       // daily unlocks / 80
    var screenTimeNorm: Double        // screen minutes / 480
    var socialAppRatio: Double        // social time / total screen time
    var typingWpmNorm: Double         // WPM / 60
    var typingErrorRate: Double       // errors / total keystrokes
    var stepsNorm: Double             // steps / 10000
    var stationaryHoursNorm: Double   // stationary hours / 16
    var chargeRegularity: Double      // 1.0 = consistent charge time

    // MARK: - Communication signals (Section 2.2)
    var callCountNorm: Double         // outgoing calls / 10
    var callDurationNorm: Double      // avg call seconds / 300
    var contactDiversityNorm: Double  // unique contacts / 10

    // MARK: - Sleep signals (Section 2.3)
    var sleepDurationNorm: Double     // sleep hours / 9
    var sleepRegularity: Double       // 1.0 - (std_dev_hours / 4)

    // MARK: - Ambient signals (Section 2.4)
    var leftHome: Double              // 1.0 = left home, 0.0 = stayed in
    var ambientDbNorm: Double         // avg daytime dB / 70

    // MARK: - ML output
    var rawMoodScore: Double          // 0.0 – 100.0 from CoreML model (-1 = not yet scored)
    var zone: String                  // "GREEN" / "YELLOW" / "RED" / "UNKNOWN"

    // MARK: - GRDB table name
    static let databaseTableName = "dailyFeatureVector"

    // MARK: - Convenience init for "today with all signals"
    init(
        date: String = Date().toISODate(),
        unlockCountNorm: Double = 0,
        screenTimeNorm: Double = 0,
        socialAppRatio: Double = 0,
        typingWpmNorm: Double = 0,
        typingErrorRate: Double = 0,
        stepsNorm: Double = 0,
        stationaryHoursNorm: Double = 0,
        chargeRegularity: Double = 0.5,
        callCountNorm: Double = 0,
        callDurationNorm: Double = 0,
        contactDiversityNorm: Double = 0,
        sleepDurationNorm: Double = 0,
        sleepRegularity: Double = 0.5,
        leftHome: Double = 0,
        ambientDbNorm: Double = 0.5,
        rawMoodScore: Double = -1,
        zone: String = "UNKNOWN"
    ) {
        self.date = date
        self.createdAt = Date().toISO()
        self.unlockCountNorm = unlockCountNorm
        self.screenTimeNorm = screenTimeNorm
        self.socialAppRatio = socialAppRatio
        self.typingWpmNorm = typingWpmNorm
        self.typingErrorRate = typingErrorRate
        self.stepsNorm = stepsNorm
        self.stationaryHoursNorm = stationaryHoursNorm
        self.chargeRegularity = chargeRegularity
        self.callCountNorm = callCountNorm
        self.callDurationNorm = callDurationNorm
        self.contactDiversityNorm = contactDiversityNorm
        self.sleepDurationNorm = sleepDurationNorm
        self.sleepRegularity = sleepRegularity
        self.leftHome = leftHome
        self.ambientDbNorm = ambientDbNorm
        self.rawMoodScore = rawMoodScore
        self.zone = zone
    }

    // MARK: - Feature array (must match Python FEATURES list order exactly)
    var featureArray: [Double] {
        [
            unlockCountNorm,
            screenTimeNorm,
            socialAppRatio,
            typingWpmNorm,
            typingErrorRate,
            stepsNorm,
            stationaryHoursNorm,
            callCountNorm,
            callDurationNorm,
            contactDiversityNorm,
            sleepDurationNorm,
            sleepRegularity,
            leftHome,
            ambientDbNorm,
            chargeRegularity
        ]
    }
}
