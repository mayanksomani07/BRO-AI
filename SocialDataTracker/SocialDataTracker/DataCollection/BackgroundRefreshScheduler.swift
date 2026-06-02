import BackgroundTasks
import Foundation

enum BackgroundRefreshScheduler {
    static let taskID = "com.broai.socialdatatracker.refresh"

    static func register() {
        BGTaskScheduler.shared.register(forTaskWithIdentifier: taskID, using: nil) { task in
            guard let refreshTask = task as? BGAppRefreshTask else { return }
            schedule()
            let store = DataUsageStore()
            store.record()
            refreshTask.setTaskCompleted(success: true)
        }
    }

    static func schedule() {
        let request = BGAppRefreshTaskRequest(identifier: taskID)
        request.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60)
        try? BGTaskScheduler.shared.submit(request)
    }
}
