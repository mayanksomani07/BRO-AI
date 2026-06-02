import SwiftUI

struct MainTabView: View {
    var body: some View {
        TabView {
            DataUsageView()
                .tabItem {
                    Label("Usage", systemImage: "chart.bar.fill")
                }
            AppsView()
                .tabItem {
                    Label("Apps", systemImage: "apps.iphone")
                }
            ReportsView()
                .tabItem {
                    Label("Reports", systemImage: "chart.line.uptrend.xyaxis")
                }
            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gearshape.fill")
                }
        }
        .accentColor(.purple)
    }
}
