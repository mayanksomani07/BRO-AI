// TypingCalibrationView.swift
// A 60-second typing test that measures real WPM and error rate.
// Results are saved to UserDefaults and used by DeviceUsageCollector.

import SwiftUI

struct TypingCalibrationView: View {

    // Sentences the user is asked to type (neutral, medium length)
    private let prompts = [
        "The quick brown fox jumps over the lazy dog near the river bank.",
        "She sells sea shells by the shore on a bright and sunny morning.",
        "Pack my box with five dozen liquor jugs left on the kitchen shelf.",
        "How vexingly quick daft zebras jump over the wide frozen plain.",
        "Bright vixens jump dozing fowl quack by the old willow tree.",
    ]

    @Environment(\.dismiss) private var dismiss

    @State private var promptIndex    = Int.random(in: 0...4)
    @State private var typedText      = ""
    @State private var testState: TestState = .ready
    @State private var startTime: Date?
    @State private var secondsLeft    = 60
    @State private var timer: Timer?
    @State private var resultWPM: Double = 0
    @State private var resultErrorRate: Double = 0

    enum TestState { case ready, running, done }

    var prompt: String { prompts[promptIndex % prompts.count] }

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                headerSection
                switch testState {
                case .ready:   readyView
                case .running: runningView
                case .done:    resultView
                }
                Spacer()
            }
            .padding(24)
            .navigationTitle("Typing Calibration")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }

    // MARK: - Header

    var headerSection: some View {
        VStack(spacing: 8) {
            Image(systemName: "keyboard")
                .font(.system(size: 36))
                .foregroundColor(.indigo)
            Text("Type the sentence below as fast and accurately as you can.")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
    }

    // MARK: - Ready state

    var readyView: some View {
        VStack(spacing: 20) {
            promptCard
            Button("Start 60-second test") {
                beginTest()
            }
            .buttonStyle(.borderedProminent)
            .tint(.indigo)
            .controlSize(.large)
        }
    }

    // MARK: - Running state

    var runningView: some View {
        VStack(spacing: 20) {
            // Timer ring
            ZStack {
                Circle()
                    .stroke(Color(.systemGray5), lineWidth: 6)
                Circle()
                    .trim(from: 0, to: CGFloat(secondsLeft) / 60.0)
                    .stroke(Color.indigo, style: StrokeStyle(lineWidth: 6, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                Text("\(secondsLeft)s")
                    .font(.title2.bold().monospacedDigit())
                    .foregroundColor(.indigo)
            }
            .frame(width: 80, height: 80)
            .animation(.linear(duration: 1), value: secondsLeft)

            promptCard

            // Typing area — coloured by accuracy
            ZStack(alignment: .topLeading) {
                RoundedRectangle(cornerRadius: 12)
                    .stroke(borderColor, lineWidth: 2)
                    .background(RoundedRectangle(cornerRadius: 12).fill(Color(.systemBackground)))

                if typedText.isEmpty {
                    Text("Start typing here…")
                        .foregroundColor(.secondary)
                        .padding(12)
                }

                TextEditor(text: $typedText)
                    .frame(minHeight: 100)
                    .padding(8)
                    .scrollContentBackground(.hidden)
                    .autocorrectionDisabled(true)
                    .autocapitalization(.none)
            }
            .frame(minHeight: 120)

            // Live stats
            HStack(spacing: 32) {
                statPill(label: "Words", value: "\(wordCount)")
                statPill(label: "Errors", value: "\(errorCount)")
                statPill(label: "Est. WPM", value: liveWPM)
            }
        }
    }

    // MARK: - Done state

    var resultView: some View {
        VStack(spacing: 24) {
            Text("Test Complete!")
                .font(.title.bold())

            HStack(spacing: 32) {
                resultTile(value: String(format: "%.0f", resultWPM),
                           label: "WPM",
                           color: resultWPM >= 40 ? .green : resultWPM >= 25 ? .orange : .red)
                resultTile(value: String(format: "%.0f%%", resultErrorRate * 100),
                           label: "Error Rate",
                           color: resultErrorRate < 0.05 ? .green : resultErrorRate < 0.15 ? .orange : .red)
            }

            VStack(spacing: 6) {
                Text(wpmFeedback).font(.headline)
                Text("Results saved. Serenity will use these as your typing baseline.")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }

            Button("Done") {
                dismiss()
            }
            .buttonStyle(.borderedProminent)
            .tint(.indigo)
            .controlSize(.large)

            Button("Try again") {
                resetTest()
            }
            .foregroundColor(.indigo)
        }
    }

    func resultTile(value: String, label: String, color: Color) -> some View {
        VStack(spacing: 6) {
            Text(value)
                .font(.system(size: 44, weight: .bold, design: .rounded))
                .foregroundColor(color)
            Text(label)
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .frame(width: 120)
        .padding(.vertical, 20)
        .background(color.opacity(0.08))
        .cornerRadius(16)
    }

    var wpmFeedback: String {
        switch resultWPM {
        case 60...: return "Excellent! You're a fast typist."
        case 40..<60: return "Good — above average speed."
        case 25..<40: return "Average typing speed."
        default: return "Slower today — that's okay."
        }
    }

    // MARK: - Helpers

    var promptCard: some View {
        Text(prompt)
            .font(.body)
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.indigo.opacity(0.06))
            .cornerRadius(12)
    }

    func statPill(label: String, value: String) -> some View {
        VStack(spacing: 2) {
            Text(value).font(.title3.bold().monospacedDigit())
            Text(label).font(.caption2).foregroundColor(.secondary)
        }
    }

    var wordCount: Int {
        typedText.split(separator: " ").count
    }

    var errorCount: Int {
        let promptWords = prompt.split(separator: " ").map(String.init)
        let typedWords  = typedText.split(separator: " ").map(String.init)
        var errors = 0
        for (i, word) in typedWords.enumerated() {
            if i < promptWords.count, word != promptWords[i] { errors += 1 }
        }
        return errors
    }

    var liveWPM: String {
        guard let start = startTime else { return "—" }
        let mins = Date().timeIntervalSince(start) / 60.0
        guard mins > 0 else { return "—" }
        return String(format: "%.0f", Double(wordCount) / mins)
    }

    var borderColor: Color {
        if typedText.isEmpty { return Color(.systemGray4) }
        return errorCount == 0 ? .green : .orange
    }

    // MARK: - Test control

    func beginTest() {
        typedText  = ""
        startTime  = Date()
        secondsLeft = 60
        testState  = .running
        promptIndex = Int.random(in: 0...99)

        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { t in
            secondsLeft -= 1
            if secondsLeft <= 0 { t.invalidate(); finishTest() }
        }
    }

    func finishTest() {
        guard let start = startTime else { return }
        let mins      = Date().timeIntervalSince(start) / 60.0
        let wpm       = mins > 0 ? Double(wordCount) / mins : 0
        let errRate   = wordCount > 0 ? Double(errorCount) / Double(max(wordCount, 1)) : 0

        resultWPM       = wpm
        resultErrorRate = errRate
        testState       = .done

        TypingMonitor.shared.saveCalibrationResult(wpm: wpm, errorRate: errRate)
    }

    func resetTest() {
        timer?.invalidate()
        typedText   = ""
        testState   = .ready
        secondsLeft = 60
        startTime   = nil
    }
}