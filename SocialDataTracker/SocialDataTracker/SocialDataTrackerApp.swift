import SwiftUI
import BackgroundTasks

@main
struct SocialDataTrackerApp: App {
    @StateObject private var appDetector = AppDetector()
    @StateObject private var dataUsageStore = DataUsageStore()
    @StateObject private var selfReportStore = SelfReportStore()
    @Environment(\.scenePhase) private var scenePhase

    init() {
        BackgroundRefreshScheduler.register()
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(appDetector)
                .environmentObject(dataUsageStore)
                .environmentObject(selfReportStore)
        }
        .onChange(of: scenePhase) { phase in
            if phase == .active {
                dataUsageStore.record()
                appDetector.refresh()
            }
            if phase == .background {
                BackgroundRefreshScheduler.schedule()
                BackgroundRefreshScheduler.scheduleMidnight()
            }
        }
        .backgroundTask(.appRefresh("com.broai.socialdatatracker.refresh")) {
            dataUsageStore.record()
            BackgroundRefreshScheduler.schedule()
        }
        .backgroundTask(.appRefresh("com.broai.socialdatatracker.midnight")) {
            dataUsageStore.captureMidnightBaseline()
            BackgroundRefreshScheduler.scheduleMidnight()
        }
    }
}
