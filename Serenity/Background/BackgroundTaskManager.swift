// BackgroundTaskManager.swift
// Registers and schedules all three BGTask identifiers.
// These must also be listed in Info.plist under BGTaskSchedulerPermittedIdentifiers.

import Foundation
import BackgroundTasks

enum TaskIdentifier {
    static let collect = "com.serenity.collect" // BGAppRefreshTask — daily ~2am
    static let score   = "com.serenity.score"   // BGProcessingTask — weekly Sunday 3am
    static let risk    = "com.serenity.risk"    // BGProcessingTask — weekly Sunday 3:05am
}

final class BackgroundTaskManager {

    // MARK: - Register (call once at app launch in SerenityApp.init)

    static func registerAll() {
        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: TaskIdentifier.collect,
            using: nil
        ) { task in
            Task { await SignalAggregator.shared.runDailyCollection(task: task) }
        }

        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: TaskIdentifier.score,
            using: nil
        ) { task in
            Task { await MoodScoreEngine.shared.runWeeklyScoring(task: task) }
        }

        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: TaskIdentifier.risk,
            using: nil
        ) { task in
            Task { await RiskEvaluator.shared.evaluate(task: task) }
        }
    }

    // MARK: - Schedule (call after app launch and after each task completes)

    static func scheduleAll() {
        scheduleDailyCollection()
        scheduleWeeklyScoring()
        scheduleWeeklyRisk()
    }

    // MARK: - Individual schedulers

    private static func scheduleDailyCollection() {
        let request = BGAppRefreshTaskRequest(identifier: TaskIdentifier.collect)
        // Run at ~2am tonight
        request.earliestBeginDate = nextOccurrence(hour: 2, minute: 0)
        try? BGTaskScheduler.shared.submit(request)
    }

    private static func scheduleWeeklyScoring() {
        let request = BGProcessingTaskRequest(identifier: TaskIdentifier.score)
        request.requiresNetworkConnectivity = false
        request.requiresExternalPower = false
        request.earliestBeginDate = nextSunday(hour: 3, minute: 0)
        try? BGTaskScheduler.shared.submit(request)
    }

    private static func scheduleWeeklyRisk() {
        let request = BGProcessingTaskRequest(identifier: TaskIdentifier.risk)
        request.requiresNetworkConnectivity = false
        request.requiresExternalPower = false
        request.earliestBeginDate = nextSunday(hour: 3, minute: 5)
        try? BGTaskScheduler.shared.submit(request)
    }

    // MARK: - Date helpers

    private static func nextOccurrence(hour: Int, minute: Int) -> Date {
        var components = DateComponents()
        components.hour = hour
        components.minute = minute
        return Calendar.current.nextDate(
            after: Date(),
            matching: components,
            matchingPolicy: .nextTime
        ) ?? Date().addingTimeInterval(3600)
    }

    private static func nextSunday(hour: Int, minute: Int) -> Date {
        var components = DateComponents()
        components.weekday = 1 // Sunday
        components.hour = hour
        components.minute = minute
        return Calendar.current.nextDate(
            after: Date(),
            matching: components,
            matchingPolicy: .nextTimePreservingSmallerComponents
        ) ?? Date().addingTimeInterval(7 * 24 * 3600)
    }
}
