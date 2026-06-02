import BackgroundTasks
import Foundation

enum BackgroundRefreshScheduler {
    static let taskID         = "com.broai.socialdatatracker.refresh"
    static let midnightTaskID = "com.broai.socialdatatracker.midnight"

    // MARK: - Register both tasks

    static func register() {
        // Regular 15-min refresh — records a snapshot
        BGTaskScheduler.shared.register(forTaskWithIdentifier: taskID, using: nil) { task in
            guard let refreshTask = task as? BGAppRefreshTask else { return }
            schedule()
            let store = DataUsageStore()
            store.record()
            refreshTask.setTaskCompleted(success: true)
        }

        // Midnight baseline task — captures counter value near 12:00 AM
        BGTaskScheduler.shared.register(forTaskWithIdentifier: midnightTaskID, using: nil) { task in
            guard let refreshTask = task as? BGAppRefreshTask else { return }
            let store = DataUsageStore()
            store.captureMidnightBaseline()   // force-reset baseline for the new day
            scheduleMidnight()                // schedule again for next midnight
            refreshTask.setTaskCompleted(success: true)
        }
    }

    // MARK: - Schedule regular refresh (every 15 min)

    static func schedule() {
        let request = BGAppRefreshTaskRequest(identifier: taskID)
        request.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60)
        try? BGTaskScheduler.shared.submit(request)
    }

    // MARK: - Schedule midnight baseline capture

    static func scheduleMidnight() {
        var cal = Calendar.current
        cal.timeZone = TimeZone.current
        // Next midnight = start of tomorrow
        guard let tomorrow = cal.date(byAdding: .day, value: 1, to: cal.startOfDay(for: Date())) else { return }

        let request = BGAppRefreshTaskRequest(identifier: midnightTaskID)
        request.earliestBeginDate = tomorrow   // iOS will wake app at or after midnight
        try? BGTaskScheduler.shared.submit(request)
    }
}
