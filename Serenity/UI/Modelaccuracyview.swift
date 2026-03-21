// ModelAccuracyView.swift
// Measures and visualises ML model accuracy.
//
// 1. Heuristic vs CoreML score comparison + MAE
// 2. Feature contribution breakdown for today
// 3. PHQ-9 self-report ground truth input
// 4. Scatter plot: predicted vs actual

import SwiftUI
import Charts
import Combine

// MARK: - Main View

struct ModelAccuracyView: View {

    @StateObject private var vm = ModelAccuracyViewModel()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    modelStatusCard
                    if !vm.comparisonRows.isEmpty {
                        heuristicVsCoreMLCard
                        featureContributionCard
                    }
                    phq9Card
                    if !vm.phq9Entries.isEmpty {
                        groundTruthCard
                    }
                    interpretationCard
                }
                .padding(16)
            }
            .navigationTitle("Model Accuracy")
            .navigationBarTitleDisplayMode(.inline)
            .onAppear { vm.load() }
        }
    }

    // MARK: - Model status card

    var modelStatusCard: some View {
        HStack(spacing: 16) {
            Image(systemName: vm.isUsingCoreML
                  ? "checkmark.seal.fill"
                  : "exclamationmark.triangle.fill")
                .font(.system(size: 32))
                .foregroundColor(vm.isUsingCoreML ? .green : .orange)

            VStack(alignment: .leading, spacing: 4) {
                Text(vm.isUsingCoreML ? "CoreML Model Active" : "Using Heuristic Fallback")
                    .font(.headline)
                Text(vm.isUsingCoreML
                     ? "MoodScoreModel.mlmodel is loaded and running inference."
                     : "Run train_mood_model.py and drag MoodScoreModel.mlmodel into Xcode to enable CoreML.")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(16)
    }

    // MARK: - Heuristic vs CoreML chart

    var heuristicVsCoreMLCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("Heuristic vs CoreML Scores")
                    .font(.headline)
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text("MAE: \(String(format: "%.1f", vm.mae)) pts")
                        .font(.caption.bold())
                        .foregroundColor(vm.mae < 5 ? .green : vm.mae < 10 ? .orange : .red)
                    Text("Mean Absolute Error")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }

            HStack(spacing: 8) {
                Circle()
                    .fill(vm.mae < 5 ? Color.green : vm.mae < 10 ? Color.orange : Color.red)
                    .frame(width: 8, height: 8)
                Text(vm.maeInterpretation)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Chart(vm.comparisonRows) { row in
                LineMark(
                    x: .value("Day", row.shortDate),
                    y: .value("Score", row.heuristicScore)
                )
                .foregroundStyle(Color.indigo)
                .lineStyle(StrokeStyle(lineWidth: 2))
                .symbol(.circle)

                if row.coreMLScore >= 0 {
                    LineMark(
                        x: .value("Day", row.shortDate),
                        y: .value("Score", row.coreMLScore)
                    )
                    .foregroundStyle(Color.purple)
                    .lineStyle(StrokeStyle(lineWidth: 2, dash: [4]))
                    .symbol(.square)
                }
            }
            .chartYScale(domain: 0...100)
            .frame(height: 160)

            HStack(spacing: 16) {
                HStack(spacing: 4) {
                    Circle().fill(Color.indigo).frame(width: 8, height: 8)
                    Text("Heuristic").font(.caption).foregroundColor(.secondary)
                }
                if vm.isUsingCoreML {
                    HStack(spacing: 4) {
                        Rectangle().fill(Color.purple).frame(width: 12, height: 2)
                        Text("CoreML").font(.caption).foregroundColor(.secondary)
                    }
                }
            }
        }
        .padding(20)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(16)
    }

    // MARK: - Feature contribution bars

    var featureContributionCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Feature Contributions (Today)")
                .font(.headline)
            Text("How much each signal contributes to today's score out of 100.")
                .font(.caption)
                .foregroundColor(.secondary)

            ForEach(vm.featureContributions) { fc in
                VStack(spacing: 4) {
                    HStack {
                        Text(fc.name)
                            .font(.caption.bold())
                            .frame(maxWidth: .infinity, alignment: .leading)
                        Text(String(format: "+%.1f pts", fc.contribution))
                            .font(.caption.monospacedDigit())
                            .foregroundColor(fc.contribution > fc.maxContribution * 0.5 ? .green : .secondary)
                    }
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            RoundedRectangle(cornerRadius: 3)
                                .fill(Color(.systemGray5))
                                .frame(height: 8)
                            RoundedRectangle(cornerRadius: 3)
                                .fill(barColor(fc))
                                .frame(
                                    width: geo.size.width * CGFloat(min(fc.contribution / max(fc.maxContribution, 0.001), 1.0)),
                                    height: 8
                                )
                        }
                    }
                    .frame(height: 8)
                }
            }
        }
        .padding(20)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(16)
    }

    private func barColor(_ fc: AccuracyFeatureItem) -> Color {
        let ratio = fc.contribution / max(fc.maxContribution, 0.001)
        if ratio > 0.65 { return .green }
        if ratio > 0.35 { return .orange }
        return .red
    }

    // MARK: - PHQ-9 self report

    var phq9Card: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Image(systemName: "person.fill.questionmark")
                    .foregroundColor(.indigo)
                Text("PHQ-9 Self Report")
                    .font(.headline)
            }

            Text("The PHQ-9 is a validated 9-question depression screening tool. Enter your score today to measure how well the model matches reality.")
                .font(.caption)
                .foregroundColor(.secondary)

            HStack {
                Text("Your PHQ-9 score today:")
                    .font(.subheadline)
                Spacer()
                Stepper("\(vm.phq9Input)", value: $vm.phq9Input, in: 0...27)
                    .labelsHidden()
                Text("\(vm.phq9Input)/27")
                    .font(.subheadline.bold().monospacedDigit())
                    .foregroundColor(.indigo)
                    .frame(width: 50)
            }

            HStack(spacing: 6) {
                Circle().fill(vm.phq9SeverityColor).frame(width: 8, height: 8)
                Text(vm.phq9SeverityLabel)
                    .font(.caption.bold())
                    .foregroundColor(vm.phq9SeverityColor)
            }

            Text("9 questions rated 0–3 each: little interest, feeling down, sleep trouble, low energy, poor appetite, feeling bad about yourself, trouble concentrating, moving slowly or restless, thoughts of self-harm.")
                .font(.caption2)
                .foregroundColor(.secondary)
                .padding(10)
                .background(Color(.tertiarySystemBackground))
                .cornerRadius(8)

            Button("Save PHQ-9 Entry for Today") {
                vm.savePhq9Entry()
            }
            .buttonStyle(.borderedProminent)
            .tint(.indigo)
            .frame(maxWidth: .infinity)
        }
        .padding(20)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(16)
    }

    // MARK: - Ground truth accuracy

    var groundTruthCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Model vs Ground Truth")
                .font(.headline)
            Text("Your PHQ-9 entries (converted to 0–100) vs model predictions that day.")
                .font(.caption)
                .foregroundColor(.secondary)

            if let accuracy = vm.groundTruthAccuracy {
                HStack(spacing: 16) {
                    metricTile(
                        value: String(format: "%.1f", accuracy.mae),
                        label: "MAE (pts)",
                        color: accuracy.mae < 10 ? .green : .orange
                    )
                    metricTile(
                        value: String(format: "%.0f%%", accuracy.correlation * 100),
                        label: "Correlation",
                        color: accuracy.correlation > 0.6 ? .green : .orange
                    )
                    metricTile(
                        value: "\(accuracy.entries)",
                        label: "Entries",
                        color: .indigo
                    )
                }

                Chart(vm.phq9Entries) { entry in
                    PointMark(
                        x: .value("Predicted", entry.modelScore),
                        y: .value("Actual", entry.phq9AsMoodScore)
                    )
                    .foregroundStyle(Color.indigo.opacity(0.7))
                    .symbolSize(80)
                }
                .chartXScale(domain: 0...100)
                .chartYScale(domain: 0...100)
                .chartXAxisLabel("Model Predicted Score")
                .chartYAxisLabel("Your PHQ-9 Score")
                .frame(height: 200)

                Text("Points closer to the diagonal = more accurate predictions.")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
        .padding(20)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(16)
    }

    func metricTile(value: String, label: String, color: Color) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.title2.bold().monospacedDigit())
                .foregroundColor(color)
            Text(label)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .background(color.opacity(0.08))
        .cornerRadius(10)
    }

    // MARK: - Interpretation guide

    var interpretationCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("How to Read These Results")
                .font(.headline)
            interpretRow(icon: "checkmark.circle.fill", color: .green,
                         title: "MAE < 5 points",
                         detail: "Excellent — model and heuristic almost identical")
            interpretRow(icon: "minus.circle.fill", color: .orange,
                         title: "MAE 5–10 points",
                         detail: "Good — minor divergence, acceptable for personal use")
            interpretRow(icon: "xmark.circle.fill", color: .red,
                         title: "MAE > 10 points",
                         detail: "Check signals — some may be returning stub values (0.50)")
            interpretRow(icon: "person.fill.questionmark", color: .indigo,
                         title: "Low PHQ-9 correlation",
                         detail: "Collect 2+ weeks of entries, then retrain in train_mood_model.py with real labels")
        }
        .padding(20)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(16)
    }

    func interpretRow(icon: String, color: Color, title: String, detail: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon).foregroundColor(color)
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.caption.bold())
                Text(detail).font(.caption).foregroundColor(.secondary)
            }
        }
    }
}

// MARK: - Supporting models
// Prefixed "Accuracy" to avoid any name clashes with other files

struct AccuracyComparisonRow: Identifiable {
    let id = UUID()
    let date: String
    let shortDate: String
    let heuristicScore: Double
    let coreMLScore: Double   // -1 if no CoreML model
}

struct AccuracyFeatureItem: Identifiable {
    let id = UUID()
    let name: String
    let contribution: Double
    let maxContribution: Double
}

struct Phq9Entry: Identifiable {
    let id = UUID()
    let date: String
    let phq9Score: Int
    let modelScore: Double

    // Convert PHQ-9 (0 = best, 27 = worst) → mood score (100 = best, 0 = worst)
    var phq9AsMoodScore: Double {
        100.0 - (Double(phq9Score) / 27.0 * 100.0)
    }
}

struct GroundTruthAccuracy {
    let mae: Double
    let correlation: Double
    let entries: Int
}

// MARK: - ViewModel

final class ModelAccuracyViewModel: ObservableObject {

    @Published var comparisonRows: [AccuracyComparisonRow] = []
    @Published var featureContributions: [AccuracyFeatureItem] = []
    @Published var phq9Entries: [Phq9Entry] = []
    @Published var phq9Input: Int = 5
    @Published var mae: Double = 0
    @Published var isUsingCoreML: Bool = false

    private let phq9StorageKey = "phq9Entries_v1"

    var maeInterpretation: String {
        if mae < 5  { return "Excellent agreement — model and heuristic nearly identical." }
        if mae < 10 { return "Good — minor divergence, acceptable for personal use." }
        return "Large divergence — check that signals are collecting real data, not stubs."
    }

    var phq9SeverityColor: Color {
        switch phq9Input {
        case 0...4:   return .green
        case 5...9:   return .yellow
        case 10...14: return .orange
        default:      return .red
        }
    }

    var phq9SeverityLabel: String {
        switch phq9Input {
        case 0...4:   return "Minimal / None"
        case 5...9:   return "Mild"
        case 10...14: return "Moderate"
        case 15...19: return "Moderately Severe"
        default:      return "Severe"
        }
    }

    var groundTruthAccuracy: GroundTruthAccuracy? {
        guard phq9Entries.count >= 2 else { return nil }
        let predicted = phq9Entries.map { $0.modelScore }
        let actual    = phq9Entries.map { $0.phq9AsMoodScore }
        let mae       = zip(predicted, actual).map { abs($0 - $1) }.reduce(0, +) / Double(phq9Entries.count)
        let corr      = pearsonCorrelation(predicted, actual)
        return GroundTruthAccuracy(mae: mae, correlation: corr, entries: phq9Entries.count)
    }

    // MARK: - Load

    func load() {
        let usingCoreML = Bundle.main.url(forResource: "MoodScoreModel", withExtension: "mlmodelc") != nil
                       || Bundle.main.url(forResource: "MoodScoreModel", withExtension: "mlmodel") != nil

        DispatchQueue.global(qos: .userInitiated).async {
            let vectors = (try? DatabaseManager.shared.fetchLast(days: 14)) ?? []
            let sorted  = vectors.sorted { $0.date < $1.date }

            let rows: [AccuracyComparisonRow] = sorted.map { v in
                let heuristic = MoodScoreEngine.shared.score(features: v)
                let coreML    = v.rawMoodScore >= 0 ? v.rawMoodScore : -1.0
                return AccuracyComparisonRow(
                    date: v.date,
                    shortDate: String(v.date.suffix(5)),
                    heuristicScore: heuristic,
                    coreMLScore: coreML
                )
            }

            let maePairs = rows.filter { $0.coreMLScore >= 0 }
            let mae = maePairs.isEmpty ? 0.0
                : maePairs.map { abs($0.heuristicScore - $0.coreMLScore) }.reduce(0, +) / Double(maePairs.count)

            let contributions: [AccuracyFeatureItem]
            if let today = sorted.last {
                contributions = Self.buildContributions(from: today)
            } else {
                contributions = []
            }

            let phq9 = self.loadRawPhq9().compactMap { dict -> Phq9Entry? in
                guard let date       = dict["date"] as? String,
                      let score      = dict["phq9"] as? Int,
                      let modelScore = dict["modelScore"] as? Double
                else { return nil }
                return Phq9Entry(date: date, phq9Score: score, modelScore: modelScore)
            }
            .sorted { $0.date < $1.date }

            DispatchQueue.main.async {
                self.isUsingCoreML       = usingCoreML
                self.comparisonRows      = rows
                self.mae                 = mae
                self.featureContributions = contributions
                self.phq9Entries         = phq9
            }
        }
    }

    // MARK: - Save PHQ-9 entry

    func savePhq9Entry() {
        let todayStr = Date().toISODate()
        let modelScore: Double
        if let v = (try? DatabaseManager.shared.fetchLast(days: 1))?.first {
            modelScore = MoodScoreEngine.shared.score(features: v)
        } else {
            modelScore = 50.0
        }

        var all = loadRawPhq9()
        all.removeAll { $0["date"] as? String == todayStr }
        all.append(["date": todayStr, "phq9": phq9Input, "modelScore": modelScore])
        UserDefaults.standard.set(all, forKey: phq9StorageKey)

        let entry = Phq9Entry(date: todayStr, phq9Score: phq9Input, modelScore: modelScore)
        DispatchQueue.main.async {
            self.phq9Entries.removeAll { $0.date == todayStr }
            self.phq9Entries.append(entry)
            self.phq9Entries.sort { $0.date < $1.date }
        }
    }

    private func loadRawPhq9() -> [[String: Any]] {
        UserDefaults.standard.array(forKey: phq9StorageKey) as? [[String: Any]] ?? []
    }

    // MARK: - Feature contributions

    private static func buildContributions(from v: DailyFeatureVector) -> [AccuracyFeatureItem] {
        [
            AccuracyFeatureItem(name: "Steps",               contribution: 15 * v.stepsNorm,                 maxContribution: 15),
            AccuracyFeatureItem(name: "Sleep Duration",      contribution: 15 * v.sleepDurationNorm,         maxContribution: 15),
            AccuracyFeatureItem(name: "Sleep Regularity",    contribution: 12 * v.sleepRegularity,           maxContribution: 12),
            AccuracyFeatureItem(name: "Contact Diversity",   contribution: 12 * v.contactDiversityNorm,      maxContribution: 12),
            AccuracyFeatureItem(name: "Outgoing Calls",      contribution: 10 * v.callCountNorm,             maxContribution: 10),
            AccuracyFeatureItem(name: "Left Home",           contribution: 10 * v.leftHome,                  maxContribution: 10),
            AccuracyFeatureItem(name: "Typing Speed",        contribution:  8 * v.typingWpmNorm,             maxContribution:  8),
            AccuracyFeatureItem(name: "Activity (not stat)", contribution:  8 * (1 - v.stationaryHoursNorm), maxContribution:  8),
            AccuracyFeatureItem(name: "Ambient Noise",       contribution:  5 * v.ambientDbNorm,             maxContribution:  5),
            AccuracyFeatureItem(name: "Charge Regularity",   contribution:  5 * v.chargeRegularity,          maxContribution:  5),
        ]
        .sorted { $0.contribution > $1.contribution }
    }

    // MARK: - Pearson correlation

    private func pearsonCorrelation(_ x: [Double], _ y: [Double]) -> Double {
        guard x.count == y.count, x.count > 1 else { return 0 }
        let n    = Double(x.count)
        let xBar = x.reduce(0, +) / n
        let yBar = y.reduce(0, +) / n
        let num  = zip(x, y).map { ($0 - xBar) * ($1 - yBar) }.reduce(0, +)
        let denX = sqrt(x.map { pow($0 - xBar, 2) }.reduce(0, +))
        let denY = sqrt(y.map { pow($0 - yBar, 2) }.reduce(0, +))
        guard denX * denY > 0 else { return 0 }
        return (num / (denX * denY)).clamped(to: -1.0...1.0)
    }
}