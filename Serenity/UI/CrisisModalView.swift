// CrisisModalView.swift
// Full-screen intervention modal presented when the user taps the crisis notification.
// Shows: iCall helpline, motivational quote, journaling text editor, dismiss.

import SwiftUI

struct CrisisModalView: View {

    @Environment(\.dismiss) private var dismiss
    @State private var journalText: String = ""
    @State private var showingJournal = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 32) {

                    // Header
                    headerSection

                    // iCall helpline card
                    iCallCard

                    // Motivational quote
                    quoteCard

                    // Journal section
                    journalSection

                    // Breathing exercise
                    breathingCard

                    Spacer(minLength: 40)
                }
                .padding(24)
            }
            .background(
                LinearGradient(
                    colors: [Color.indigo.opacity(0.05), Color(.systemBackground)],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
            .navigationTitle("You're Not Alone")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    // MARK: - Header

    var headerSection: some View {
        VStack(spacing: 12) {
            Text("💙")
                .font(.system(size: 60))
            Text("Things might feel heavy right now.")
                .font(.title3.bold())
                .multilineTextAlignment(.center)
            Text("That takes courage to sit with. Here are some things that might help.")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
    }

    // MARK: - iCall card

    var iCallCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Image(systemName: "phone.fill")
                    .foregroundColor(.white)
                    .padding(8)
                    .background(Color.green)
                    .clipShape(Circle())
                Text("iCall — Free counselling helpline")
                    .font(.headline)
            }

            Text("Trained counsellors available. Your call is confidential.")
                .font(.subheadline)
                .foregroundColor(.secondary)

            Button {
                if let url = URL(string: "tel://9152987821") {
                    UIApplication.shared.open(url)
                }
            } label: {
                HStack {
                    Image(systemName: "phone.fill")
                    Text("Call 9152987821")
                        .bold()
                }
                .frame(maxWidth: .infinity)
                .padding(14)
                .background(Color.green)
                .foregroundColor(.white)
                .cornerRadius(12)
            }

            Link("Chat or email instead →", destination: URL(string: "https://icallhelpline.org")!)
                .font(.footnote)
                .foregroundColor(.indigo)
        }
        .padding(20)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(16)
    }

    // MARK: - Quote card

    var quoteCard: some View {
        let quotes = [
            ("You don't have to be positive all the time. It's perfectly okay to feel sad, angry, annoyed, frustrated, or overwhelmed.", "Lori Deschene"),
            ("Even the darkest night will end and the sun will rise.", "Victor Hugo"),
            ("You are stronger than you believe.", "Wonder Woman"),
            ("This feeling, it will pass. It always passes.", "Anonymous"),
            ("What you are going through is not a reflection of your worth.", "Anonymous")
        ]
        let quote = quotes[Int(Date().timeIntervalSince1970) % quotes.count]

        return VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "quote.bubble")
                    .foregroundColor(.indigo)
                Text("A thought for you")
                    .font(.headline)
            }
            Text(quote.0)
                .font(.body)
                .italic()
                .foregroundColor(.primary)
            Text("— \(quote.1)")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(20)
        .background(Color.indigo.opacity(0.06))
        .cornerRadius(16)
    }

    // MARK: - Journal section

    var journalSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "pencil.and.outline")
                    .foregroundColor(.indigo)
                Text("Write it out")
                    .font(.headline)
            }
            Text("Sometimes putting words to feelings helps. This stays only on your device.")
                .font(.caption)
                .foregroundColor(.secondary)

            TextEditor(text: $journalText)
                .frame(minHeight: 120)
                .padding(8)
                .background(Color(.systemBackground))
                .cornerRadius(10)
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(Color(.systemGray4), lineWidth: 1)
                )
        }
        .padding(20)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(16)
    }

    // MARK: - Breathing card

    var breathingCard: some View {
        BreathingExerciseView()
    }
}

// MARK: - Breathing exercise

struct BreathingExerciseView: View {
    @State private var phase: BreathPhase = .idle
    @State private var circleScale: CGFloat = 0.6
    @State private var label = "Tap to start"

    enum BreathPhase { case idle, inhale, hold, exhale }

    var body: some View {
        VStack(spacing: 16) {
            HStack {
                Image(systemName: "wind")
                    .foregroundColor(.teal)
                Text("4-7-8 Breathing")
                    .font(.headline)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            Text("Breathe in 4s, hold 7s, out 8s. Activates your calm response.")
                .font(.caption)
                .foregroundColor(.secondary)
                .frame(maxWidth: .infinity, alignment: .leading)

            ZStack {
                Circle()
                    .fill(Color.teal.opacity(0.15))
                    .frame(width: 120, height: 120)
                    .scaleEffect(circleScale)
                    .animation(.easeInOut(duration: breathDuration), value: circleScale)

                Text(label)
                    .font(.caption.bold())
                    .foregroundColor(.teal)
            }
            .onTapGesture { startBreathing() }
        }
        .padding(20)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(16)
    }

    var breathDuration: Double {
        switch phase {
        case .inhale: return 4
        case .hold:   return 0.1
        case .exhale: return 8
        case .idle:   return 0.5
        }
    }

    func startBreathing() {
        guard phase == .idle else { return }
        runCycle()
    }

    func runCycle() {
        phase = .inhale
        label = "Breathe in…"
        circleScale = 1.0

        DispatchQueue.main.asyncAfter(deadline: .now() + 4) {
            phase = .hold
            label = "Hold…"
            DispatchQueue.main.asyncAfter(deadline: .now() + 7) {
                phase = .exhale
                label = "Breathe out…"
                circleScale = 0.6
                DispatchQueue.main.asyncAfter(deadline: .now() + 8) {
                    phase = .idle
                    label = "Again"
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
                        runCycle()
                    }
                }
            }
        }
    }
}
