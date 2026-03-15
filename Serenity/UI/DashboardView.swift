// DashboardView.swift
// Main screen. Shows: current zone badge, 4-week mood trend chart, days of data collected.

import SwiftUI
import Charts
import Combine

struct DashboardView: View {

    @StateObject private var viewModel = DashboardViewModel()
    @State private var showCrisisModal = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Zone badge
                    ZoneBadgeView(zone: viewModel.currentZone, score: viewModel.latestScore)
                        .padding(.top, 8)

                    // Trend chart
                    TrendChartView(weeklyScores: viewModel.weeklyScores)

                    // Days of data
                    DataCountView(days: viewModel.daysCollected)

                    // Manual collection button (for testing)
                    if viewModel.isDebugMode {
                        DebugActionsView(viewModel: viewModel)
                    }

                    Spacer(minLength: 40)
                }
                .padding(.horizontal, 20)
            }
            .navigationTitle("Serenity")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showCrisisModal = true
                    } label: {
                        Image(systemName: "heart.text.square")
                            .foregroundColor(.indigo)
                    }
                }
            }
            .onAppear { viewModel.load() }
            .onReceive(NotificationCenter.default.publisher(for: .openCrisisModal)) { _ in
                showCrisisModal = true
            }
            .sheet(isPresented: $showCrisisModal) {
                CrisisModalView()
            }
            .refreshable { viewModel.load() }
        }
    }
}

// MARK: - Zone badge

struct ZoneBadgeView: View {
    let zone: Zone
    let score: Double

    var body: some View {
        VStack(spacing: 8) {
            Text(zone.emoji)
                .font(.system(size: 56))

            Text(zone.displayName)
                .font(.title2.bold())
                .foregroundColor(zoneColor)

            if score >= 0 {
                Text("Mood score: \(Int(score))/100")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(24)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(zoneColor.opacity(0.08))
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(zoneColor.opacity(0.25), lineWidth: 1)
                )
        )
    }

    var zoneColor: Color {
        switch zone {
        case .green:   return .green
        case .yellow:  return .orange
        case .red:     return .red
        case .unknown: return .gray
        }
    }
}

// MARK: - Trend chart

struct TrendChartView: View {
    let weeklyScores: [WeeklyScore]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("4-Week Trend")
                .font(.headline)

            if weeklyScores.isEmpty {
                Text("Collecting data… check back after a few days.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, minHeight: 160, alignment: .center)
            } else {
                Chart(weeklyScores) { week in
                    LineMark(
                        x: .value("Week", week.label),
                        y: .value("Score", week.score)
                    )
                    .foregroundStyle(Color.indigo)
                    .lineStyle(StrokeStyle(lineWidth: 2.5))

                    AreaMark(
                        x: .value("Week", week.label),
                        y: .value("Score", week.score)
                    )
                    .foregroundStyle(
                        LinearGradient(colors: [.indigo.opacity(0.2), .clear],
                                       startPoint: .top, endPoint: .bottom)
                    )

                    PointMark(
                        x: .value("Week", week.label),
                        y: .value("Score", week.score)
                    )
                    .foregroundStyle(Color.indigo)
                }
                .chartYScale(domain: 0...100)
                .chartYAxis {
                    AxisMarks(values: [0, 35, 65, 100]) { value in
                        AxisGridLine()
                        AxisValueLabel { Text("\(value.as(Int.self) ?? 0)") }
                    }
                }
                // Zone reference lines
                .chartBackground { proxy in
                    GeometryReader { geo in
                        let redY = proxy.position(forY: 35)
                        let greenY = proxy.position(forY: 65)
                        Rectangle()
                            .fill(Color.red.opacity(0.04))
                            .frame(height: geo.size.height - (redY ?? 0))
                            .position(x: geo.size.width / 2, y: geo.size.height - ((geo.size.height - (redY ?? 0)) / 2))
                        Rectangle()
                            .fill(Color.green.opacity(0.04))
                            .frame(height: (greenY ?? 0))
                            .position(x: geo.size.width / 2, y: (greenY ?? 0) / 2)
                    }
                }
                .frame(height: 180)
            }
        }
        .padding(20)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(16)
    }
}

// MARK: - Data count

struct DataCountView: View {
    let days: Int

    var body: some View {
        HStack {
            Image(systemName: "calendar.badge.checkmark")
                .foregroundColor(.indigo)
            Text("\(days) day\(days == 1 ? "" : "s") of data collected")
                .font(.subheadline)
                .foregroundColor(.secondary)
            Spacer()
        }
        .padding(.horizontal, 4)
    }
}

// MARK: - Debug panel (only shows in DEBUG builds)

struct DebugActionsView: View {
    @ObservedObject var viewModel: DashboardViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("🛠 Debug Actions")
                .font(.caption.bold())
                .foregroundColor(.secondary)

            Button("Collect Signals Now") {
                Task { try? await SignalAggregator.shared.collectAndStore(); viewModel.load() }
            }
            .buttonStyle(.bordered)

            Button("Run Weekly Scoring") {
                Task {
                    let vectors = try? DatabaseManager.shared.fetchLast(days: 7)
                    for var v in vectors ?? [] {
                        v.rawMoodScore = MoodScoreEngine.shared.score(features: v)
                        v.zone = Zone.from(score: v.rawMoodScore).rawValue
                        try? DatabaseManager.shared.upsert(v)
                    }
                    viewModel.load()
                }
            }
            .buttonStyle(.bordered)

            Button("Test Intervention Notification") {
                Task { await RiskEvaluator.shared.forceFireIntervention() }
            }
            .buttonStyle(.bordered)
            .tint(.red)
        }
        .padding(16)
        .background(Color.yellow.opacity(0.1))
        .cornerRadius(12)
    }
}

// MARK: - ViewModel

struct WeeklyScore: Identifiable {
    let id = UUID()
    let label: String
    let score: Double
}

final class DashboardViewModel: ObservableObject {
    @Published var weeklyScores: [WeeklyScore] = []
    @Published var currentZone: Zone = .unknown
    @Published var latestScore: Double = -1
    @Published var daysCollected: Int = 0

    var isDebugMode: Bool {
        #if DEBUG
        return true
        #else
        return false
        #endif
    }

    func load() {
        guard let vectors = try? DatabaseManager.shared.fetchLast(days: 28) else { return }
        let count = (try? DatabaseManager.shared.totalRowCount()) ?? 0

        // Chunk into weeks of 7, compute average score per week
        let sorted = vectors.sorted { $0.date < $1.date }
        let weeks = sorted.chunked(into: 7)

        let newScores = weeks.enumerated().map { index, chunk in
            let scores = chunk.map { v -> Double in
                v.rawMoodScore >= 0 ? v.rawMoodScore : MoodScoreEngine.shared.score(features: v)
            }
            let avg = scores.average
            return WeeklyScore(label: "W\(index + 1)", score: avg)
        }

        var newLatest: Double = -1
        var newZone: Zone = .unknown
        if let lastWeek = weeks.last {
            let scores = lastWeek.map { v -> Double in
                v.rawMoodScore >= 0 ? v.rawMoodScore : MoodScoreEngine.shared.score(features: v)
            }
            newLatest = scores.average
            newZone = Zone.from(score: newLatest)
        }

        DispatchQueue.main.async {
            self.weeklyScores = newScores
            self.daysCollected = count
            self.latestScore = newLatest
            self.currentZone = newZone
        }
    }
}
