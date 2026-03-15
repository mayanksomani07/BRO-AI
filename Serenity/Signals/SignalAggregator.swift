// SignalAggregator.swift
// Runs all signal collectors concurrently and merges results into one
// DailyFeatureVector, which is then upserted to the database.

import Foundation
import BackgroundTasks

final class SignalAggregator {

    static let shared = SignalAggregator()
    private init() {}

    // MARK: - Called by BGAppRefreshTask (com.serenity.collect)

    func runDailyCollection(task: BGTask) async {
        task.expirationHandler = {
            print("[Serenity] Daily collection task expired.")
        }

        do {
            let vector = await collectAll()
            try DatabaseManager.shared.upsert(vector)
            try DatabaseManager.shared.purgeOldData()
            print("[Serenity] Daily collection complete: \(vector.date) | steps: \(vector.stepsNorm)")
            task.setTaskCompleted(success: true)
        } catch {
            print("[Serenity] Daily collection failed: \(error)")
            task.setTaskCompleted(success: false)
        }

        BackgroundTaskManager.scheduleAll()
    }

    // MARK: - Manual trigger (for testing)

    func collectAndStore() async throws {
        let vector = await collectAll()
        try DatabaseManager.shared.upsert(vector)
        print("[Serenity] Manual collection stored: \(vector.date)")
    }

    // MARK: - Core collection

    private func collectAll() async -> DailyFeatureVector {
        var vector = DailyFeatureVector(date: Date().toISODate())

        // Run all collectors concurrently
        async let deviceUpdate = DeviceUsageCollector.shared.collect()
        async let sleepUpdate = SleepCollector.shared.collect()
        async let commUpdate = CommMetaCollector.shared.collect()
        async let ambientUpdate = AmbientCollector.shared.collect()

        // Apply all updates
        let updates = await [deviceUpdate, sleepUpdate, commUpdate, ambientUpdate]
        for apply in updates {
            apply(&vector)
        }

        return vector
    }
}
