import SwiftUI
import Charts

struct ReportsView: View {
    @EnvironmentObject var dataUsageStore: DataUsageStore
    @EnvironmentObject var selfReportStore: SelfReportStore
    @EnvironmentObject var appDetector: AppDetector
    @State private var selectedDays = 1

    private var dailyData: [DailyUsage] { dataUsageStore.dailyDeltas(days: selectedDays) }
    private var allEntries: [SelfReportEntry] { selfReportStore.allEntries(days: selectedDays) }

    private var peakDay: DailyUsage? { dailyData.max(by: { $0.totalMB < $1.totalMB }) }
    private var totalWifi: Double { dailyData.reduce(0) { $0 + $1.wifiMB } }
    private var totalCellular: Double { dailyData.reduce(0) { $0 + $1.cellularMB } }

    // Days that have at least some recorded data
    private var daysWithData: Int { dailyData.filter { $0.totalMB > 0.01 }.count }
    private var isDataSparse: Bool { daysWithData < max(1, selectedDays / 2) }

    private var perAppSummary: [(app: SocialApp, minutes: Int, mb: Double)] {
        appDetector.installedApps.map { app in
            (app: app,
             minutes: selfReportStore.totalMinutes(for: app.id, days: selectedDays),
             mb: selfReportStore.estimatedMB(for: app.id, days: selectedDays))
        }.filter { $0.minutes > 0 }.sorted { $0.minutes > $1.minutes }
    }

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    rangePicker

                    if isDataSparse {
                        sparseDataBanner
                    }

                    statsGrid

                    timelineCard

                    if !perAppSummary.isEmpty {
                        perAppCard
                    }

                    exportCard
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Reports")
            .navigationBarTitleDisplayMode(.large)
        }
    }

    private var sparseDataBanner: some View {
        HStack(spacing: 12) {
            Image(systemName: "clock.badge.fill")
                .foregroundColor(.orange)
                .font(.title3)
            VStack(alignment: .leading, spacing: 2) {
                Text("Data is still building up")
                    .font(.subheadline).bold()
                Text("Stats show \(daysWithData) day\(daysWithData == 1 ? "" : "s") of data so far. Keep the app open daily for full history.")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            Spacer()
        }
        .padding(14)
        .background(Color.orange.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.orange.opacity(0.3), lineWidth: 1))
    }

    private var rangePicker: some View {
        Picker("Range", selection: $selectedDays) {
            Text("Today").tag(1)
            Text("7 Days").tag(7)
            Text("30 Days").tag(30)
        }
        .pickerStyle(.segmented)
    }

    private var statsGrid: some View {
        let rangeLabel = selectedDays == 1 ? "Today" : "\(selectedDays) Days"

        return LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            StatCard(title: "Total — \(rangeLabel)", value: formatMB(totalWifi + totalCellular),
                     icon: "chart.bar.fill", color: .purple)
            StatCard(title: "WiFi — \(rangeLabel)", value: formatMB(totalWifi),
                     icon: "wifi", color: .blue)
            StatCard(title: "Cellular — \(rangeLabel)", value: formatMB(totalCellular),
                     icon: "antenna.radiowaves.left.and.right", color: .orange)
            if selectedDays > 1, let peak = peakDay, peak.totalMB > 0.01 {
                StatCard(title: "Peak Day", value: "\(peak.dayLabel) \(formatMB(peak.totalMB))",
                         icon: "bolt.fill", color: .red)
            }
            if selectedDays > 1 {
                StatCard(title: "Days Tracked", value: "\(daysWithData) / \(selectedDays)",
                         icon: "calendar", color: .teal)
            }
        }
    }

    private var timelineCard: some View {
        let subtitle = selectedDays == 1 ? "Today — updates every 3 seconds" : "\(selectedDays)-day overview"
        return ChartCard(title: "Usage Timeline", subtitle: subtitle) {
            if daysWithData == 0 {
                VStack(spacing: 10) {
                    Image(systemName: "chart.line.uptrend.xyaxis")
                        .font(.system(size: 36)).foregroundColor(.secondary)
                    Text("No data yet for this range")
                        .font(.subheadline).bold().foregroundColor(.secondary)
                    Text("Keep the app open and data will appear here automatically.")
                        .font(.caption).foregroundColor(.secondary)
                        .multilineTextAlignment(.center).padding(.horizontal)
                }
                .frame(height: 180).frame(maxWidth: .infinity)
            } else {
            Chart {
                ForEach(dailyData.filter { $0.totalMB > 0 }) { day in
                    AreaMark(
                        x: .value("Date", day.date, unit: .day),
                        yStart: .value("", 0),
                        yEnd: .value("WiFi", day.wifiMB)
                    )
                    .foregroundStyle(.blue.opacity(0.3))
                    .interpolationMethod(.catmullRom)

                    LineMark(
                        x: .value("Date", day.date, unit: .day),
                        y: .value("WiFi", day.wifiMB)
                    )
                    .foregroundStyle(.blue)
                    .lineStyle(StrokeStyle(lineWidth: 2))
                    .interpolationMethod(.catmullRom)

                    AreaMark(
                        x: .value("Date", day.date, unit: .day),
                        yStart: .value("WiFi", day.wifiMB),
                        yEnd: .value("Total", day.totalMB)
                    )
                    .foregroundStyle(.orange.opacity(0.3))
                    .interpolationMethod(.catmullRom)

                    LineMark(
                        x: .value("Date", day.date, unit: .day),
                        y: .value("Total", day.totalMB)
                    )
                    .foregroundStyle(.orange)
                    .lineStyle(StrokeStyle(lineWidth: 2, dash: [4, 2]))
                    .interpolationMethod(.catmullRom)
                }
            }
            .chartXAxis {
                AxisMarks(values: .stride(by: .day, count: max(1, selectedDays / 7))) { val in
                    AxisValueLabel(format: .dateTime.day().month(.abbreviated))
                        .font(.caption2)
                    AxisGridLine()
                }
            }
            .chartYAxis {
                AxisMarks(position: .leading) { value in
                    AxisValueLabel {
                        if let mb = value.as(Double.self) {
                            Text("\(Int(mb))").font(.caption2)
                        }
                    }
                    AxisGridLine()
                }
            }
            .frame(height: 220)

            HStack(spacing: 16) {
                legendDot(color: .blue, label: "WiFi")
                legendDot(color: .orange, label: "Cellular")
            }
            .padding(.top, 4)
            } // end else
        }
    }

    private var perAppCard: some View {
        ChartCard(title: "Per-App Usage", subtitle: "Self-reported (last \(selectedDays) days)") {
            Chart(perAppSummary, id: \.app.id) { item in
                BarMark(
                    x: .value("Minutes", item.minutes),
                    y: .value("App", item.app.displayName)
                )
                .foregroundStyle(categoryColor(item.app.category).gradient)
                .cornerRadius(6)
                .annotation(position: .trailing) {
                    Text("\(item.minutes)m")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
            .chartXAxis {
                AxisMarks { val in
                    AxisValueLabel {
                        if let min = val.as(Int.self) { Text("\(min)").font(.caption2) }
                    }
                    AxisGridLine()
                }
            }
            .frame(height: CGFloat(perAppSummary.count) * 44 + 20)
        }
    }

    private var exportCard: some View {
        ChartCard(title: "Export Data", subtitle: "Share as CSV") {
            ShareLink(item: CSVExporter.export(dailyData: dailyData, entries: allEntries,
                                               apps: appDetector.detectedApps),
                      preview: SharePreview("Data Usage Report.csv")) {
                HStack {
                    Spacer()
                    Label("Export CSV", systemImage: "square.and.arrow.up")
                        .font(.headline)
                        .foregroundColor(.white)
                    Spacer()
                }
                .padding()
                .background(Color.purple)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
    }

    private func legendDot(color: Color, label: String) -> some View {
        HStack(spacing: 4) {
            Circle().fill(color).frame(width: 8, height: 8)
            Text(label).font(.caption2).foregroundColor(.secondary)
        }
    }

    private func categoryColor(_ cat: SocialCategory) -> Color {
        switch cat {
        case .messaging: return .blue
        case .social: return .pink
        case .video: return .red
        case .professional: return .indigo
        }
    }

    private func formatMB(_ mb: Double) -> String {
        mb >= 1024 ? String(format: "%.1f GB", mb / 1024) : String(format: "%.0f MB", mb)
    }
}

struct StatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(color)
                Spacer()
            }
            Text(value)
                .font(.headline).bold()
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }
}
