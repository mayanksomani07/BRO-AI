// RiskEvaluator.swift
// Reads last 4 weeks of scores, detects RED + declining trend, fires intervention.
// Rules: RED zone this week AND 3-week consecutive decline AND 72-hour cooldown.

import Foundation
import BackgroundTasks

final class RiskEvaluator {

    static let shared = RiskEvaluator()
    private init() {}

    // MARK: - Background task (com.serenity.risk)

    func evaluate(task: BGTask) async {
        task.expirationHandler = {
            print("[RiskEvaluator] Risk evaluation task expired.")
        }

        do {
            try await runEvaluation()
            task.setTaskCompleted(success: true)
        } catch {
            print("[RiskEvaluator] Evaluation error: \(error)")
            task.setTaskCompleted(success: false)
        }

        BackgroundTaskManager.scheduleAll()
    }

    // MARK: - Core evaluation

    func runEvaluation() async throws {
        let last28 = try DatabaseManager.shared.fetchLast(days: 28)

        // Need at least 21 days of data before triggering any alert
        guard last28.count >= 21 else {
            print("[RiskEvaluator] Insufficient data (\(last28.count) days). Need 21+.")
            return
        }

        // Sort oldest → newest, then chunk into weeks
        let sorted = last28.sorted { $0.date < $1.date }
        let weeks = sorted.chunked(into: 7)

        // weeklyScores[0] = oldest week, last = most recent
        let weeklyScores = weeks.map { chunk in
            chunk.map { $0.rawMoodScore >= 0 ? $0.rawMoodScore : MoodScoreEngine.shared.score(features: $0) }.average
        }

        guard weeklyScores.count >= 3 else { return }

        // Most recent week is last element
        let thisWeek = weeklyScores.last!
        let prevWeek = weeklyScores[weeklyScores.count - 2]
        let twoWeeksAgo = weeklyScores[weeklyScores.count - 3]

        let isRed = thisWeek < 35
        let isDeclining = thisWeek < prevWeek && prevWeek < twoWeeksAgo
        let cooldownOk = daysSinceLastAlert() > 3

        print("[RiskEvaluator] thisWeek=\(String(format: "%.1f", thisWeek)) prev=\(String(format: "%.1f", prevWeek)) twoAgo=\(String(format: "%.1f", twoWeeksAgo)) | red=\(isRed) declining=\(isDeclining) cooldownOk=\(cooldownOk)")

        if isRed && isDeclining && cooldownOk {
            await InterventionManager.shared.fireIntervention(score: thisWeek)
            UserDefaults.standard.lastAlertDate = Date()
            print("[RiskEvaluator] 🚨 Intervention fired. Score: \(String(format: "%.1f", thisWeek))")
        }
    }

    // MARK: - Manual test trigger (for testing — no restrictions)

    func forceFireIntervention() async {
        await InterventionManager.shared.fireIntervention(score: 28.0)
    }

    // MARK: - Helpers

    private func daysSinceLastAlert() -> Int {
        guard let last = UserDefaults.standard.lastAlertDate else { return Int.max }
        return Date().daysSince(last)
    }
}
