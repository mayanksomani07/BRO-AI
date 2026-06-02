import SwiftUI
import Charts

struct ReportsView: View {
    @EnvironmentObject var dataUsageStore: DataUsageStore
    @EnvironmentObject var selfReportStore: SelfReportStore
    @EnvironmentObject var appDetector: AppDetector
    @State private var selectedDays = 30

    private var dailyData: [DailyUsage] { dataUsageStore.dailyDeltas(days: selectedDays) }
    private var allEntries: [SelfReportEntry] { selfReportStore.allEntries(days: selectedDays) }

    private var peakDay: DailyUsage? { dailyData.max(by: { $0.totalMB < $1.totalMB }) }
    private var totalWifi: Double { dailyData.reduce(0) { $0 + $1.wifiMB } }
    private var totalCellular: Double { dailyData.reduce(0) { $0 + $1.cellularMB } }

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

    private var rangePicker: some View {
        Picker("Range", selection: $selectedDays) {
            Text("7 Days").tag(7)
            Text("30 Days").tag(30)
            Text("90 Days").tag(90)
        }
        .pickerStyle(.segmented)
    }

    private var statsGrid: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            StatCard(title: "Total Usage", value: formatMB(totalWifi + totalCellular),
                     icon: "chart.bar.fill", color: .purple)
            StatCard(title: "WiFi", value: formatMB(totalWifi),
                     icon: "wifi", color: .blue)
            StatCard(title: "Cellular", value: formatMB(totalCellular),
                     icon: "antenna.radiowaves.left.and.right", color: .orange)
            if let peak = peakDay {
                StatCard(title: "Peak Day", value: "\(peak.dayLabel) \(formatMB(peak.totalMB))",
                         icon: "bolt.fill", color: .red)
            }
        }
    }

    private var timelineCard: some View {
        ChartCard(title: "Usage Timeline", subtitle: "\(selectedDays)-day overview") {
            Chart {
                ForEach(dailyData) { day in
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
