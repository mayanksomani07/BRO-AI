// SerenityApp.swift

import SwiftUI
import BackgroundTasks
import UserNotifications
import CoreMotion

@main
struct SerenityApp: App {

    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    init() {
        // 1. Register BG tasks FIRST — must happen before app finishes launching
        BackgroundTaskManager.registerAll()

        // 2. Set up database synchronously so it's ready before any view loads
        try? DatabaseManager.shared.setup()

        // 3. Start typing monitor — passively observes keyboard speed/deletion rate
        TypingMonitor.shared.startObserving()

        // 4. Touch all singletons so their init() fires (sets up notifications/observers)
        _ = DeviceUsageCollector.shared
        _ = CommMetaCollector.shared
        _ = AmbientCollector.shared
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .onAppear {
                    Task {
                        await requestPermissions()
                        BackgroundTaskManager.scheduleAll()
                    }
                }
        }
    }

    private func requestPermissions() async {
        // Notifications
        try? await UNUserNotificationCenter.current()
            .requestAuthorization(options: [.alert, .sound, .badge])

        // HealthKit sleep
        await SleepCollector.shared.requestPermission()

        // Motion & Fitness (CMPedometer / CMMotionActivityManager)
        if CMMotionActivityManager.isActivityAvailable() {
            let mgr = CMMotionActivityManager()
            mgr.startActivityUpdates(to: .main) { _ in }
            // Brief delay then stop — just triggers the permission dialog
            try? await Task.sleep(nanoseconds: 500_000_000)
            mgr.stopActivityUpdates()
        }

        // Contacts (for CommMetaCollector baseline)
        // CNContactStore prompts on first access automatically
    }
}

// MARK: - Root navigation

struct ContentView: View {
    var body: some View {
        TabView {
            DashboardView()
                .tabItem {
                    Label("Today", systemImage: "waveform.path.ecg")
                }
            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "slider.horizontal.3")
                }
        }
        .accentColor(.indigo)
    }
}