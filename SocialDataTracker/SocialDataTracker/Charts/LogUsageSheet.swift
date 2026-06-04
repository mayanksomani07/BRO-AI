import SwiftUI
import Charts

struct LogUsageSheet: View {
    let app: SocialApp
    @EnvironmentObject var selfReportStore: SelfReportStore
    @EnvironmentObject var dataUsageStore: DataUsageStore
    @Environment(\.dismiss) private var dismiss

    @State private var minutes = 30
    @State private var dataEstimate: DataEstimate = .medium

    private var todayEntries: [SelfReportEntry] {
        selfReportStore.entries(for: app.id, days: 1)
    }
    private var totalMinutesToday: Int {
        todayEntries.reduce(0) { $0 + $1.estimatedMinutes }
    }
    private var totalMBToday: Double {
        todayEntries.reduce(0) { $0 + $1.dataEstimate.mbValue }
    }

    // Device total for context
    private var deviceTodayMB: Double {
        let t = dataUsageStore.todayUsage()
        return t.wifiMB + t.cellularMB
    }

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // App header hero
                    appHero

                    // Today's logged summary
                    if !todayEntries.isEmpty {
                        todayLogSummary
                    }

                    // Log new entry form
                    logForm

                    // History mini-chart (last 7 days)
                    if selfReportStore.totalMinutes(for: app.id, days: 7) > 0 {
                        weeklyHistoryCard
                    }
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Log Usage")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }

    // MARK: - App Hero

    private var appHero: some View {
        HStack(spacing: 16) {
            ZStack {
                RoundedRectangle(cornerRadius: 18)
                    .fill(appColor.opacity(0.15))
                    .frame(width: 70, height: 70)
                Image(systemName: app.sfSymbol)
                    .font(.system(size: 30))
                    .foregroundColor(appColor)
            }
            VStack(alignment: .leading, spacing: 4) {
                Text(app.displayName)
                    .font(.title2).bold()
                Text(app.category.rawValue)
                    .font(.subheadline).foregroundColor(.secondary)
                HStack(spacing: 6) {
                    Circle().fill(Color.green).frame(width: 7, height: 7)
                    Text("Installed on this device")
                        .font(.caption).foregroundColor(.green)
                }
            }
            Spacer()
        }
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 18))
    }

    // MARK: - Today summary

    private var todayLogSummary: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Today's Logged Usage")
                .font(.headline)

            HStack(spacing: 0) {
                summaryBox(icon: "clock.fill", color: .purple,
                           title: "Time", value: formatMinutes(totalMinutesToday))
                Divider().frame(height: 44)
                summaryBox(icon: "chart.bar.fill", color: .blue,
                           title: "Data Est.", value: formatMB(totalMBToday))
                Divider().frame(height: 44)
                summaryBox(icon: "iphone", color: .orange,
                           title: "Device Today", value: formatMB(deviceTodayMB))
            }
            .background(Color(.secondarySystemGroupedBackground))
            .clipShape(RoundedRectangle(cornerRadius: 14))

            // Logged entries list
            ForEach(todayEntries) { entry in
                HStack {
                    Image(systemName: "clock.arrow.circlepath")
                        .foregroundColor(appColor)
                    Text("\(entry.estimatedMinutes) min · \(entry.dataEstimate.rawValue)")
                        .font(.subheadline)
                    Spacer()
                    Text(entry.date, style: .time)
                        .font(.caption).foregroundColor(.secondary)
                    Button {
                        selfReportStore.delete(entry)
                    } label: {
                        Image(systemName: "trash")
                            .font(.caption)
                            .foregroundColor(.red.opacity(0.7))
                    }
                }
                .padding(.horizontal, 12).padding(.vertical, 8)
                .background(Color(.secondarySystemGroupedBackground))
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }
        }
    }

    private func summaryBox(icon: String, color: Color, title: String, value: String) -> some View {
        VStack(spacing: 4) {
            Image(systemName: icon).foregroundColor(color).font(.subheadline)
            Text(value).font(.subheadline).bold().minimumScaleFactor(0.7).lineLimit(1)
            Text(title).font(.caption2).foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
    }

    // MARK: - Log Form

    private var logForm: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Add New Entry")
                .font(.headline)

            // Time picker
            VStack(alignment: .leading, spacing: 8) {
                Text("Time Spent").font(.subheadline).foregroundColor(.secondary)
                // Quick buttons
                HStack(spacing: 8) {
                    ForEach([5, 15, 30, 60, 90, 120], id: \.self) { min in
                        Button {
                            withAnimation(.spring(response: 0.2)) { minutes = min }
                        } label: {
                            Text(min < 60 ? "\(min)m" : "\(min/60)h")
                                .font(.subheadline).bold()
                                .foregroundColor(minutes == min ? .white : appColor)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 8)
                                .background(minutes == min ? appColor : appColor.opacity(0.1))
                                .clipShape(RoundedRectangle(cornerRadius: 10))
                        }
                    }
                }
                Stepper("Custom: \(minutes) minutes", value: $minutes, in: 1...720, step: 5)
                    .font(.subheadline)
            }
            .padding()
            .background(Color(.secondarySystemGroupedBackground))
            .clipShape(RoundedRectangle(cornerRadius: 14))

            // Data estimate
            VStack(alignment: .leading, spacing: 8) {
                Text("Data Used (Estimate)").font(.subheadline).foregroundColor(.secondary)
                HStack(spacing: 8) {
                    ForEach(DataEstimate.allCases, id: \.self) { est in
                        Button {
                            withAnimation { dataEstimate = est }
                        } label: {
                            VStack(spacing: 3) {
                                Text(estimateIcon(est)).font(.title3)
                                Text(estimateShortLabel(est))
                                    .font(.caption2).bold()
                                    .foregroundColor(dataEstimate == est ? .white : .primary)
                                Text(est.rawValue.components(separatedBy: "(").last?
                                        .replacingOccurrences(of: ")", with: "") ?? "")
                                    .font(.system(size: 9))
                                    .foregroundColor(dataEstimate == est ? .white.opacity(0.8) : .secondary)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 10)
                            .background(dataEstimate == est ? appColor : Color(.secondarySystemGroupedBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                    }
                }
            }
            .padding()
            .background(Color(.tertiarySystemGroupedBackground))
            .clipShape(RoundedRectangle(cornerRadius: 14))

            // Save button
            Button(action: save) {
                HStack {
                    Spacer()
                    Image(systemName: "checkmark.circle.fill")
                    Text("Save \(formatMinutes(minutes)) · \(dataEstimate.rawValue)")
                        .font(.headline)
                    Spacer()
                }
                .foregroundColor(.white)
                .padding()
                .background(appColor)
                .clipShape(RoundedRectangle(cornerRadius: 14))
            }
        }
    }

    // MARK: - Weekly history chart

    private var weeklyHistoryCard: some View {
        let entries = selfReportStore.allEntries(days: 7)
        let cal = Calendar.current
        let now = Date()
        var dailyMins: [(date: Date, minutes: Int)] = (0..<7).compactMap { offset in
            guard let date = cal.date(byAdding: .day, value: -offset, to: cal.startOfDay(for: now)) else { return nil }
            let dayEntries = entries.filter {
                $0.appId == app.id && cal.isDate($0.date, inSameDayAs: date)
            }
            return (date: date, minutes: dayEntries.reduce(0) { $0 + $1.estimatedMinutes })
        }.reversed()

        return VStack(alignment: .leading, spacing: 10) {
            Text("Last 7 Days — \(app.displayName)")
                .font(.headline)
            Chart(dailyMins, id: \.date) { item in
                BarMark(
                    x: .value("Day", item.date, unit: .day),
                    y: .value("Minutes", item.minutes)
                )
                .foregroundStyle(appColor.gradient)
                .cornerRadius(5)
            }
            .chartXAxis {
                AxisMarks(values: .stride(by: .day)) { _ in
                    AxisValueLabel(format: .dateTime.weekday(.abbreviated))
                        .font(.caption2)
                }
            }
            .chartYAxis {
                AxisMarks(position: .leading) { v in
                    AxisValueLabel {
                        if let m = v.as(Int.self) {
                            Text(m < 60 ? "\(m)m" : "\(m/60)h\(m%60>0 ? "\(m%60)m" : "")")
                                .font(.caption2)
                        }
                    }
                    AxisGridLine()
                }
            }
            .frame(height: 140)
        }
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    // MARK: - Helpers

    private func save() {
        let entry = SelfReportEntry(appId: app.id, estimatedMinutes: minutes, dataEstimate: dataEstimate)
        selfReportStore.add(entry)
        dismiss()
    }

    private func formatMinutes(_ m: Int) -> String {
        m < 60 ? "\(m) min" : "\(m/60)h \(m%60 > 0 ? "\(m%60)m" : "")"
    }

    private func formatMB(_ mb: Double) -> String {
        mb >= 1024 ? String(format: "%.2f GB", mb/1024) : String(format: "%.0f MB", mb)
    }

    private func estimateShortLabel(_ est: DataEstimate) -> String {
        switch est {
        case .low: return "Low"
        case .medium: return "Med"
        case .high: return "High"
        case .heavy: return "Heavy"
        case .unknown: return "?"
        }
    }

    private func estimateIcon(_ est: DataEstimate) -> String {
        switch est {
        case .low: return "🟢"
        case .medium: return "🟡"
        case .high: return "🟠"
        case .heavy: return "🔴"
        case .unknown: return "⚪️"
        }
    }

    private var appColor: Color {
        let palette: [Color] = [.blue, .pink, .red, .orange, .green, .indigo,
                                 .purple, .teal, .cyan, .yellow, .mint, .brown,
                                 .gray, .blue, .pink, .red, .orange, .green, .indigo, .purple]
        let idx = SocialApp.allKnown.firstIndex(where: { $0.id == app.id }) ?? 0
        return palette[idx % palette.count]
    }
}
