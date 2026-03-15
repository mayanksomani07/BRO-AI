// SerenityApp.swift
// @main entry point.

import SwiftUI
import BackgroundTasks
import UserNotifications

@main
struct SerenityApp: App {

    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    init() {
        // Register BG tasks FIRST — must happen before app finishes launching
        BackgroundTaskManager.registerAll()

        // DB is already set up inside DatabaseManager.init() (singleton).
        // This call is a no-op if init already succeeded, or retries if it failed.
        try? DatabaseManager.shared.setup()
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
        try? await UNUserNotificationCenter.current()
            .requestAuthorization(options: [.alert, .sound, .badge])
        await SleepCollector.shared.requestPermission()
    }
}

// MARK: - Root tab view

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