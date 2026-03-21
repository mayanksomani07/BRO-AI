// SignalDebugView.swift
// Shows every collected signal in human-readable form.
// Use this to verify that data collection is working correctly.

import SwiftUI
import Charts
import Combine

// MARK: - Main View

struct SignalDebugView: View {

    @StateObject private var vm = SignalDebugViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if vm.isLoading {
                    ProgressView("Loading signals…")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if vm.rows.isEmpty {
                    emptyState
                } else {
                    content
                }
            }
            .navigationTitle("Signal Inspector")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        Task { await vm.collectNow() }
                    } label: {
                        if vm.isCollecting {
                            ProgressView().scaleEffect(0.8)
                        } else {
                            Label("Collect", systemImage: "arrow.clockwise")
                        }
                    }
                    .disabled(vm.isCollecting)
                }
            }
            .onAppear { vm.load() }
        }
    }

    // MARK: - Content

    var content: some View {
        ScrollView {
            VStack(spacing: 16) {
                dayPicker
                ForEach(vm.signalGroups) { group in
                    SignalGroupCard(group: group)
                }
                if let vector = vm.selectedVector {
                    scoreCard(vector: vector)
                }
            }
            .padding(16)
        }
    }

    var dayPicker: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(vm.rows.indices, id: \.self) { i in
                    let row = vm.rows[i]
                    Button {
                        vm.selectedIndex = i
                    } label: {
                        Text(row.date)
                            .font(.caption.bold())
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(vm.selectedIndex == i ? Color.indigo : Color(.secondarySystemBackground))
                            .foregroundColor(vm.selectedIndex == i ? .white : .primary)
                            .cornerRadius(20)
                    }
                }
            }
            .padding(.horizontal, 2)
        }
    }

    func scoreCard(vector: DailyFeatureVector) -> some View {
        let heuristic = MoodScoreEngine.shared.score(features: vector)
        let stored    = vector.rawMoodScore >= 0 ? vector.rawMoodScore : heuristic
        let zone      = Zone.from(score: stored)

        return VStack(alignment: .leading, spacing: 12) {
            Text("Computed Score")
                .font(.headline)
            HStack(spacing: 24) {
                VStack(spacing: 4) {
                    Text("\(Int(heuristic))")
                        .font(.system(size: 36, weight: .bold, design: .rounded))
                        .foregroundColor(.indigo)
                    Text("Heuristic")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                if vector.rawMoodScore >= 0 {
                    VStack(spacing: 4) {
                        Text("\(Int(stored))")
                            .font(.system(size: 36, weight: .bold, design: .rounded))
                            .foregroundColor(.purple)
                        Text("CoreML")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                Spacer()
                VStack(spacing: 4) {
                    Text(zone.emoji)
                        .font(.system(size: 32))
                    Text(zone.displayName)
                        .font(.caption.bold())
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding(20)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(16)
    }

    var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "tray")
                .font(.system(size: 48))
                .foregroundColor(.secondary)
            Text("No data yet")
                .font(.headline)
            Text("Tap the refresh button above to collect signals right now.")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
            Button("Collect Signals Now") {
                Task { await vm.collectNow() }
            }
            .buttonStyle(.borderedProminent)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Signal Group Card

struct SignalGroupCard: View {
    let group: DebugSignalGroup

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Image(systemName: group.icon)
                    .foregroundColor(group.color)
                Text(group.title)
                    .font(.headline)
            }
            .padding(.bottom, 4)

            ForEach(group.signals) { signal in
                SignalRow(signal: signal)
                if signal.id != group.signals.last?.id {
                    Divider()
                }
            }
        }
        .padding(16)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(16)
    }
}

// MARK: - Signal Row

struct SignalRow: View {
    let signal: DebugSignalRow

    var body: some View {
        VStack(spacing: 6) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(signal.name)
                        .font(.subheadline.bold())
                    Text(signal.rawDisplay)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text(String(format: "%.2f", signal.normalised))
                        .font(.subheadline.monospacedDigit())
                        .foregroundColor(signal.statusColor)
                    Text(signal.statusLabel)
                        .font(.caption2.bold())
                        .foregroundColor(signal.statusColor)
                }
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color(.systemGray5))
                        .frame(height: 6)
                    RoundedRectangle(cornerRadius: 4)
                        .fill(signal.statusColor)
                        .frame(width: geo.size.width * CGFloat(min(signal.normalised, 1.0)), height: 6)
                }
            }
            .frame(height: 6)
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Local models
// Named "Debug..." to avoid clashing with SignalReading in SignalCollector.swift

struct DebugSignalGroup: Identifiable {
    let id = UUID()
    let title: String
    let icon: String
    let color: Color
    let signals: [DebugSignalRow]
}

struct DebugSignalRow: Identifiable {
    let id = UUID()
    let name: String
    let normalised: Double
    let rawDisplay: String
    let higherIsBetter: Bool

    var statusColor: Color {
        let v = higherIsBetter ? normalised : (1.0 - normalised)
        if v >= 0.65 { return .green }
        if v >= 0.35 { return .orange }
        return .red
    }

    var statusLabel: String {
        let v = higherIsBetter ? normalised : (1.0 - normalised)
        if v >= 0.65 { return "Good" }
        if v >= 0.35 { return "Moderate" }
        return "Low"
    }
}

// MARK: - ViewModel

final class SignalDebugViewModel: ObservableObject {
    @Published var rows: [DailyFeatureVector] = []
    @Published var selectedIndex: Int = 0
    @Published var isLoading: Bool = true
    @Published var isCollecting: Bool = false

    var selectedVector: DailyFeatureVector? {
        guard !rows.isEmpty, selectedIndex < rows.count else { return nil }
        return rows[selectedIndex]
    }

    var signalGroups: [DebugSignalGroup] {
        guard let v = selectedVector else { return [] }
        return [
            DebugSignalGroup(title: "Device Usage", icon: "iphone", color: .indigo, signals: [
                DebugSignalRow(name: "Screen Unlocks",
                               normalised: v.unlockCountNorm,
                               rawDisplay: "\(Int(v.unlockCountNorm * 80)) unlocks (cap 80)",
                               higherIsBetter: false),
                DebugSignalRow(name: "Screen Time",
                               normalised: v.screenTimeNorm,
                               rawDisplay: "\(Int(v.screenTimeNorm * 480)) min (cap 480)",
                               higherIsBetter: false),
                DebugSignalRow(name: "Social App Ratio",
                               normalised: v.socialAppRatio,
                               rawDisplay: String(format: "%.0f%% social", v.socialAppRatio * 100),
                               higherIsBetter: true),
                DebugSignalRow(name: "Typing Speed",
                               normalised: v.typingWpmNorm,
                               rawDisplay: String(format: "%.0f WPM (cap 60)", v.typingWpmNorm * 60),
                               higherIsBetter: true),
                DebugSignalRow(name: "Typing Error Rate",
                               normalised: v.typingErrorRate,
                               rawDisplay: String(format: "%.1f%% errors", v.typingErrorRate * 100),
                               higherIsBetter: false),
                DebugSignalRow(name: "Charge Regularity",
                               normalised: v.chargeRegularity,
                               rawDisplay: String(format: "%.0f%% consistent", v.chargeRegularity * 100),
                               higherIsBetter: true),
            ]),
            DebugSignalGroup(title: "Movement", icon: "figure.walk", color: .green, signals: [
                DebugSignalRow(name: "Step Count",
                               normalised: v.stepsNorm,
                               rawDisplay: "\(Int(v.stepsNorm * 10_000)) steps (goal 10k)",
                               higherIsBetter: true),
                DebugSignalRow(name: "Stationary Hours",
                               normalised: v.stationaryHoursNorm,
                               rawDisplay: String(format: "%.1f hrs stationary (cap 16)", v.stationaryHoursNorm * 16),
                               higherIsBetter: false),
                DebugSignalRow(name: "Left Home",
                               normalised: v.leftHome,
                               rawDisplay: v.leftHome >= 0.5 ? "Yes ✓" : "No ✗",
                               higherIsBetter: true),
            ]),
            DebugSignalGroup(title: "Sleep", icon: "bed.double.fill", color: .purple, signals: [
                DebugSignalRow(name: "Sleep Duration",
                               normalised: v.sleepDurationNorm,
                               rawDisplay: String(format: "%.1f hrs (goal 9)", v.sleepDurationNorm * 9),
                               higherIsBetter: true),
                DebugSignalRow(name: "Sleep Regularity",
                               normalised: v.sleepRegularity,
                               rawDisplay: String(format: "%.0f%% consistent", v.sleepRegularity * 100),
                               higherIsBetter: true),
            ]),
            DebugSignalGroup(title: "Social", icon: "person.2.fill", color: .orange, signals: [
                DebugSignalRow(name: "Outgoing Calls",
                               normalised: v.callCountNorm,
                               rawDisplay: "\(Int(v.callCountNorm * 10)) calls today (cap 10)",
                               higherIsBetter: true),
                DebugSignalRow(name: "Avg Call Duration",
                               normalised: v.callDurationNorm,
                               rawDisplay: String(format: "%.0f sec avg (cap 300)", v.callDurationNorm * 300),
                               higherIsBetter: true),
                DebugSignalRow(name: "Contact Diversity",
                               normalised: v.contactDiversityNorm,
                               rawDisplay: "\(Int(v.contactDiversityNorm * 10)) unique contacts (cap 10)",
                               higherIsBetter: true),
            ]),
            DebugSignalGroup(title: "Ambient", icon: "waveform", color: .teal, signals: [
                DebugSignalRow(name: "Ambient Noise Level",
                               normalised: v.ambientDbNorm,
                               rawDisplay: String(format: "%.0f dB avg (cap 70)", v.ambientDbNorm * 70),
                               higherIsBetter: true),
            ]),
        ]
    }

    func load() {
        isLoading = true
        DispatchQueue.global(qos: .userInitiated).async {
            let data = (try? DatabaseManager.shared.fetchLast(days: 14)) ?? []
            DispatchQueue.main.async {
                self.rows = data
                self.selectedIndex = 0
                self.isLoading = false
            }
        }
    }

    func collectNow() async {
        DispatchQueue.main.async { self.isCollecting = true }
        try? await SignalAggregator.shared.collectAndStore()
        load()
        DispatchQueue.main.async { self.isCollecting = false }
    }
}