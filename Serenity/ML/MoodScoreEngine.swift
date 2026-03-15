// MoodScoreEngine.swift
// Loads MoodScoreModel.mlmodel and runs inference on DailyFeatureVector values.
// Also handles weekly scoring via BGProcessingTask.

import Foundation
import CoreML
import BackgroundTasks

// MARK: - Zone classification
enum Zone: String, CaseIterable {
    case green  = "GREEN"
    case yellow = "YELLOW"
    case red    = "RED"
    case unknown = "UNKNOWN"

    static func from(score: Double) -> Zone {
        switch score {
        case 65...100: return .green
        case 35..<65:  return .yellow
        case 0..<35:   return .red
        default:       return .unknown
        }
    }

    var displayName: String {
        switch self {
        case .green:   return "Doing well"
        case .yellow:  return "Check in"
        case .red:     return "Needs attention"
        case .unknown: return "Gathering data"
        }
    }

    var emoji: String {
        switch self {
        case .green:   return "🟢"
        case .yellow:  return "🟡"
        case .red:     return "🔴"
        case .unknown: return "⚪️"
        }
    }
}

// MARK: - MoodScoreEngine

final class MoodScoreEngine {

    static let shared = MoodScoreEngine()

    // The CoreML model — loaded lazily. Will be nil until MoodScoreModel.mlmodel is added.
    private var model: MLModel?

    private init() {
        loadModel()
    }

    private func loadModel() {
        guard let modelURL = Bundle.main.url(forResource: "MoodScoreModel", withExtension: "mlmodelc")
               ?? Bundle.main.url(forResource: "MoodScoreModel", withExtension: "mlmodel") else {
            print("[MoodScoreEngine] MoodScoreModel.mlmodel not found — using heuristic fallback.")
            return
        }
        do {
            model = try MLModel(contentsOf: modelURL)
        } catch {
            print("[MoodScoreEngine] Failed to load model: \(error)")
        }
    }

    // MARK: - Score a single day's features → 0.0–100.0

    func score(features: DailyFeatureVector) -> Double {
        if let model = model {
            return coreMLScore(model: model, features: features)
        }
        // Heuristic fallback (matches training formula) used until mlmodel is added
        return heuristicScore(features: features)
    }

    // MARK: - Score a week → average + zone

    func scoreWeek(vectors: [DailyFeatureVector]) -> (score: Double, zone: Zone) {
        guard !vectors.isEmpty else { return (50.0, .unknown) }
        let weekAvg = vectors.map { score(features: $0) }.average
        return (weekAvg, Zone.from(score: weekAvg))
    }

    // MARK: - Background task (com.serenity.score)

    func runWeeklyScoring(task: BGTask) async {
        task.expirationHandler = {
            print("[MoodScoreEngine] Weekly scoring task expired.")
        }

        do {
            let last7 = try DatabaseManager.shared.fetchLast(days: 7)
            guard !last7.isEmpty else {
                task.setTaskCompleted(success: true)
                BackgroundTaskManager.scheduleAll()
                return
            }

            let (weekScore, zone) = scoreWeek(vectors: last7)

            // Update scores in the database for each day
            for var vector in last7 {
                let dayScore = score(features: vector)
                vector.rawMoodScore = dayScore
                vector.zone = Zone.from(score: dayScore).rawValue
                try DatabaseManager.shared.upsert(vector)
            }

            print("[MoodScoreEngine] Weekly score: \(String(format: "%.1f", weekScore)) | \(zone.rawValue)")
            task.setTaskCompleted(success: true)
        } catch {
            print("[MoodScoreEngine] Scoring failed: \(error)")
            task.setTaskCompleted(success: false)
        }

        BackgroundTaskManager.scheduleAll()
    }

    // MARK: - CoreML inference

    private func coreMLScore(model: MLModel, features: DailyFeatureVector) -> Double {
        let featureNames = [
            "unlock_count_norm", "screen_time_norm", "social_app_ratio",
            "typing_wpm_norm", "typing_error_rate", "steps_norm",
            "stationary_hours_norm", "call_count_norm", "call_duration_norm",
            "contact_diversity_norm", "sleep_duration_norm", "sleep_regularity",
            "left_home", "ambient_db_norm", "charge_regularity"
        ]
        let values = features.featureArray

        var featureDict: [String: MLFeatureValue] = [:]
        for (name, value) in zip(featureNames, values) {
            featureDict[name] = MLFeatureValue(double: value)
        }

        guard let provider = try? MLDictionaryFeatureProvider(dictionary: featureDict),
              let output = try? model.prediction(from: provider),
              let score = output.featureValue(for: "mood_score")?.doubleValue else {
            return heuristicScore(features: features)
        }

        return score.clamped(to: 0.0...100.0)
    }

    // MARK: - Heuristic fallback (mirrors Python training formula)

    private func heuristicScore(features: DailyFeatureVector) -> Double {
        let score =
            15 * features.stepsNorm +
            15 * features.sleepDurationNorm +
            12 * features.sleepRegularity +
            12 * features.contactDiversityNorm +
            10 * features.callCountNorm +
            10 * features.leftHome +
             8 * features.typingWpmNorm +
             8 * (1 - features.stationaryHoursNorm) +
             5 * features.ambientDbNorm +
             5 * features.chargeRegularity

        return score.clamped(to: 0.0...100.0)
    }
}
