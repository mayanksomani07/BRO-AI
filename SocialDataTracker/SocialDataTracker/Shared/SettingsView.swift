import SwiftUI

struct SettingsView: View {
    @AppStorage("hasCompletedOnboarding") private var hasCompletedOnboarding = true
    @AppStorage("backgroundRefreshEnabled") private var backgroundRefreshEnabled = true
    @State private var showDisclaimer = false
    @State private var showDebug = false
    @State private var showScreenTime = false
    @EnvironmentObject var screenTime: ScreenTimeManager

    var body: some View {
        NavigationView {
            Form {
                Section("Screen Time (REAL per-app data)") {
                    Button {
                        showScreenTime = true
                    } label: {
                        HStack {
                            Label("Manage Screen Time Access",
                                  systemImage: "lock.shield.fill")
                            Spacer()
                            Text(screenTime.authState == .approved ? "On" : "Off")
                                .foregroundColor(screenTime.authState == .approved ? .green : .orange)
                                .font(.caption).bold()
                        }
                    }
                }

                Section("App") {
                    Toggle("Background Refresh", isOn: $backgroundRefreshEnabled)
                    Button("View Disclaimer") { showDisclaimer = true }
                    NavigationLink("Debug App Detection") {
                        DebugDetectionView()
                    }
                }

                Section("About") {
                    LabeledContent("Version", value: "1.0.0")
                    LabeledContent("Data Source", value: "Device network counters")
                    LabeledContent("Min iOS", value: "16.0")
                }

                Section("Reset") {
                    Button(role: .destructive) {
                        UserDefaults.standard.removeObject(forKey: "interface_snapshots")
                        UserDefaults.standard.removeObject(forKey: "self_report_entries")
                    } label: {
                        Label("Clear All Data", systemImage: "trash")
                    }
                    Button(role: .destructive) {
                        hasCompletedOnboarding = false
                    } label: {
                        Label("Reset Onboarding", systemImage: "arrow.counterclockwise")
                    }
                }
            }
            .navigationTitle("Settings")
            .sheet(isPresented: $showDisclaimer) {
                SandboxDisclaimerSheet()
            }
            .sheet(isPresented: $showScreenTime) {
                ScreenTimePickerView()
                    .environmentObject(screenTime)
            }
        }
    }
}

struct SandboxDisclaimerSheet: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    infoBlock(
                        icon: "checkmark.seal.fill", color: .green,
                        title: "What this app CAN do",
                        bullets: [
                            "Detect if social apps are installed using URL scheme probing",
                            "Read total device WiFi and Cellular byte counters",
                            "Build a time-series of your device's overall data usage",
                            "Let you manually log per-app usage estimates"
                        ]
                    )

                    infoBlock(
                        icon: "xmark.seal.fill", color: .red,
                        title: "What this app CANNOT do",
                        bullets: [
                            "Read per-app data usage for other apps (iOS sandbox prevents this)",
                            "Access the Settings > Cellular per-app list programmatically",
                            "Monitor other apps' network traffic without a VPN entitlement",
                            "Identify which app generated which network packet"
                        ]
                    )

                    Text("This is an iOS platform limitation, not a limitation of this app. No third-party app on the App Store can read per-app data usage without special Apple entitlements.")
                        .font(.footnote)
                        .foregroundColor(.secondary)
                        .padding()
                        .background(Color(.systemGray6))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .padding()
            }
            .navigationTitle("Privacy & Capabilities")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    private func infoBlock(icon: String, color: Color, title: String, bullets: [String]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: icon).foregroundColor(color)
                Text(title).font(.headline)
            }
            ForEach(bullets, id: \.self) { bullet in
                HStack(alignment: .top, spacing: 8) {
                    Text("•").foregroundColor(color)
                    Text(bullet).font(.subheadline)
                }
            }
        }
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }
}
