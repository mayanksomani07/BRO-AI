// SettingsView.swift
// Signal source toggles, data management, diagnostics links, and app info.

import SwiftUI
import Combine

struct SettingsView: View {

    @AppStorage("enableSleep")   private var enableSleep   = true
    @AppStorage("enableMotion")  private var enableMotion  = true
    @AppStorage("enableCalls")   private var enableCalls   = true
    @AppStorage("enableAmbient") private var enableAmbient = true

    @State private var showDeleteConfirm = false
    @State private var rowCount: Int = 0
    @State private var toastMessage: String? = nil

    var body: some View {
        NavigationStack {
            Form {
                diagnosticsSection       // ← new
                signalSection
                dataSection
                aboutSection
            }
            .navigationTitle("Settings")
            .onAppear { loadRowCount() }
            .alert("Delete all data?", isPresented: $showDeleteConfirm) {
                Button("Delete", role: .destructive) { deleteAllData() }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("This will permanently delete all \(rowCount) days of collected data. This cannot be undone.")
            }
            .overlay(alignment: .bottom) {
                if let msg = toastMessage {
                    Text(msg)
                        .font(.subheadline)
                        .padding(12)
                        .background(Color(.secondarySystemBackground))
                        .cornerRadius(10)
                        .shadow(radius: 4)
                        .padding(.bottom, 24)
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                }
            }
            .animation(.spring(), value: toastMessage)
        }
    }

    // MARK: - Diagnostics section (new)

    var diagnosticsSection: some View {
        Section {
            NavigationLink(destination: SignalDebugView()) {
                Label {
                    VStack(alignment: .leading) {
                        Text("Signal Inspector")
                        Text("View every collected signal value in real time.")
                            .font(.caption).foregroundColor(.secondary)
                    }
                } icon: {
                    Image(systemName: "antenna.radiowaves.left.and.right")
                        .foregroundColor(.indigo)
                }
            }

            NavigationLink(destination: ModelAccuracyView()) {
                Label {
                    VStack(alignment: .leading) {
                        Text("Model Accuracy")
                        Text("Heuristic vs CoreML scores, PHQ-9 ground truth.")
                            .font(.caption).foregroundColor(.secondary)
                    }
                } icon: {
                    Image(systemName: "chart.xyaxis.line")
                        .foregroundColor(.purple)
                }
            }

            NavigationLink(destination: TypingCalibrationView()) {
                Label {
                    VStack(alignment: .leading) {
                        Text("Typing Calibration")
                        Text("60-second test to measure your real WPM and error rate.")
                            .font(.caption).foregroundColor(.secondary)
                    }
                } icon: {
                    Image(systemName: "keyboard")
                        .foregroundColor(.teal)
                }
            }

            NavigationLink(destination: SocialReportView()) {
                Label {
                    VStack(alignment: .leading) {
                        Text("Social Media Report")
                        Text("Log today's social media usage time.")
                            .font(.caption).foregroundColor(.secondary)
                    }
                } icon: {
                    Image(systemName: "person.2.wave.2")
                        .foregroundColor(.orange)
                }
            }
        } header: {
            Text("Diagnostics")
        }
    }

    // MARK: - Signal sources

    var signalSection: some View {
        Section {
            Toggle(isOn: $enableSleep) {
                Label {
                    VStack(alignment: .leading) {
                        Text("Sleep Analysis")
                        Text("HealthKit read-only. Never uploaded.")
                            .font(.caption).foregroundColor(.secondary)
                    }
                } icon: {
                    Image(systemName: "bed.double.fill").foregroundColor(.indigo)
                }
            }

            Toggle(isOn: $enableMotion) {
                Label {
                    VStack(alignment: .leading) {
                        Text("Motion & Steps")
                        Text("CMPedometer, no HealthKit needed.")
                            .font(.caption).foregroundColor(.secondary)
                    }
                } icon: {
                    Image(systemName: "figure.walk").foregroundColor(.green)
                }
            }

            Toggle(isOn: $enableCalls) {
                Label {
                    VStack(alignment: .leading) {
                        Text("Call Metadata")
                        Text("Counts only. No call content ever.")
                            .font(.caption).foregroundColor(.secondary)
                    }
                } icon: {
                    Image(systemName: "phone.fill").foregroundColor(.orange)
                }
            }

            Toggle(isOn: $enableAmbient) {
                Label {
                    VStack(alignment: .leading) {
                        Text("Ambient Noise Level")
                        Text("dB meter only. No audio recorded.")
                            .font(.caption).foregroundColor(.secondary)
                    }
                } icon: {
                    Image(systemName: "waveform").foregroundColor(.teal)
                }
            }
        } header: {
            Text("Signal Sources")
        } footer: {
            Text("Toggling a source off stops new data collection for that signal. Existing data is kept.")
        }
    }

    // MARK: - Data section

    var dataSection: some View {
        Section {
            HStack {
                Text("Days collected")
                Spacer()
                Text("\(rowCount)")
                    .foregroundColor(.secondary)
            }

            Button {
                Task {
                    try? await SignalAggregator.shared.collectAndStore()
                    loadRowCount()
                    showToast("Signals collected ✓")
                }
            } label: {
                Label("Collect signals now", systemImage: "arrow.clockwise")
            }

            Button(role: .destructive) {
                showDeleteConfirm = true
            } label: {
                Label("Delete all data", systemImage: "trash")
                    .foregroundColor(.red)
            }
        } header: {
            Text("Your Data")
        } footer: {
            Text("All data is encrypted on your device and never leaves it. Storage: ~\(max(1, rowCount / 2)) KB.")
        }
    }

    // MARK: - About section

    var aboutSection: some View {
        Section("About Serenity") {
            HStack {
                Text("Version")
                Spacer()
                Text("1.0.0").foregroundColor(.secondary)
            }
            HStack {
                Text("Model")
                Spacer()
                Text("On-device CoreML").foregroundColor(.secondary)
            }
            HStack {
                Text("Network calls")
                Spacer()
                Text("Zero 🔒").foregroundColor(.green)
            }
            Link("iCall Helpline", destination: URL(string: "https://icallhelpline.org")!)
        }
    }

    // MARK: - Actions

    private func loadRowCount() {
        rowCount = (try? DatabaseManager.shared.totalRowCount()) ?? 0
    }

    private func deleteAllData() {
        try? DatabaseManager.shared.deleteAllData()
        loadRowCount()
        showToast("All data deleted")
    }

    private func showToast(_ message: String) {
        toastMessage = message
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) {
            toastMessage = nil
        }
    }
}