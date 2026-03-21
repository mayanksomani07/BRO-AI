// SocialReportView.swift
// Daily self-report for social media usage.
// Per-app screen time requires the FamilyControls entitlement (Apple approval needed).
// This view lets the user report their social usage in ~5 seconds.
// It also detects which social apps are installed as context.

import SwiftUI

struct SocialReportView: View {

    @Environment(\.dismiss) private var dismiss
    @State private var selectedHours: Double = 1.0
    @State private var saved = false

    private let installedApps = DeviceUsageCollector.shared.detectInstalledSocialApps()

    var body: some View {
        NavigationStack {
            VStack(spacing: 28) {
                headerSection
                if !installedApps.isEmpty { installedAppsSection }
                sliderSection
                saveButton
                whySection
                Spacer()
            }
            .padding(24)
            .navigationTitle("Social Media Today")
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
        VStack(spacing: 10) {
            Image(systemName: "person.2.wave.2")
                .font(.system(size: 44))
                .foregroundColor(.indigo)
            Text("How much time did you spend on social media today?")
                .font(.headline)
                .multilineTextAlignment(.center)
            Text("WhatsApp, Instagram, Telegram, Snapchat, etc.")
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }

    // MARK: - Installed social apps

    var installedAppsSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Detected on your device:")
                .font(.caption.bold())
                .foregroundColor(.secondary)
            FlowLayout(items: installedApps) { app in
                Text(app)
                    .font(.caption.bold())
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(Color.indigo.opacity(0.1))
                    .foregroundColor(.indigo)
                    .cornerRadius(20)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(12)
    }

    // MARK: - Slider

    var sliderSection: some View {
        VStack(spacing: 16) {
            // Big hour display
            VStack(spacing: 4) {
                Text(hourLabel)
                    .font(.system(size: 52, weight: .bold, design: .rounded))
                    .foregroundColor(.indigo)
                    .monospacedDigit()
                Text("of social media")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            Slider(value: $selectedHours, in: 0...12, step: 0.5)
                .tint(.indigo)

            HStack {
                Text("None").font(.caption).foregroundColor(.secondary)
                Spacer()
                Text("12+ hrs").font(.caption).foregroundColor(.secondary)
            }

            // Context label
            Text(contextLabel)
                .font(.caption)
                .foregroundColor(contextColor)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(contextColor.opacity(0.1))
                .cornerRadius(8)
        }
        .padding(20)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(16)
    }

    // MARK: - Save button

    var saveButton: some View {
        Button {
            saveReport()
        } label: {
            HStack {
                if saved {
                    Image(systemName: "checkmark.circle.fill")
                    Text("Saved!")
                } else {
                    Image(systemName: "square.and.arrow.down")
                    Text("Save Today's Report")
                }
            }
            .font(.headline)
            .frame(maxWidth: .infinity)
            .padding()
            .background(saved ? Color.green : Color.indigo)
            .foregroundColor(.white)
            .cornerRadius(14)
        }
        .disabled(saved)
        .animation(.spring(), value: saved)
    }

    // MARK: - Why section

    var whySection: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "info.circle").foregroundColor(.secondary)
                Text("Why can't Serenity read this automatically?")
                    .font(.caption.bold())
                    .foregroundColor(.secondary)
            }
            Text("iOS requires Apple's FamilyControls entitlement to access per-app screen time. This requires a review process with Apple. Until approved, your self-report is the most accurate source.")
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .padding(12)
        .background(Color(.tertiarySystemBackground))
        .cornerRadius(10)
    }

    // MARK: - Helpers

    var hourLabel: String {
        if selectedHours == 0    { return "None" }
        if selectedHours < 1     { return "30 min" }
        let h = Int(selectedHours)
        let m = selectedHours.truncatingRemainder(dividingBy: 1) > 0 ? "30m" : "h"
        return "\(h)\(m)"
    }

    var contextLabel: String {
        switch selectedHours {
        case 0:      return "No social media today"
        case 0.5..<1: return "Light usage — healthy"
        case 1..<2:  return "Average usage"
        case 2..<4:  return "Above average — monitor"
        default:     return "Heavy usage — consider reducing"
        }
    }

    var contextColor: Color {
        switch selectedHours {
        case 0..<2:  return .green
        case 2..<4:  return .orange
        default:     return .red
        }
    }

    func saveReport() {
        // Convert hours to a 0–1 ratio: 0h=0.0, 4h+=1.0
        // Higher social time = higher social engagement score
        let ratio = min(selectedHours / 4.0, 1.0)
        DeviceUsageCollector.shared.saveTodaySocialRatio(ratio)
        saved = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) { dismiss() }
    }
}

// MARK: - Simple FlowLayout for app chips

struct FlowLayout<Item: Hashable, Content: View>: View {
    let items: [Item]
    let content: (Item) -> Content

    var body: some View {
        var width: CGFloat = 0
        var rows: [[Item]] = [[]]

        // Simple word-wrap approximation: 80pt per item
        for item in items {
            width += 80
            if width > UIScreen.main.bounds.width - 80 {
                rows.append([item])
                width = 80
            } else {
                rows[rows.count - 1].append(item)
            }
        }

        return VStack(alignment: .leading, spacing: 6) {
            ForEach(rows, id: \.self) { row in
                HStack(spacing: 6) {
                    ForEach(row, id: \.self) { item in
                        content(item)
                    }
                }
            }
        }
    }
}