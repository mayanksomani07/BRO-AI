import SwiftUI
import Charts

struct DataUsageView: View {
    @EnvironmentObject var dataUsageStore: DataUsageStore
    @State private var selectedRange = 7
    @State private var selectedDay: DailyUsage?

    private var dailyData: [DailyUsage] {
        dataUsageStore.dailyDeltas(days: selectedRange)
    }

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    TodaySummaryCard()
                        .environmentObject(dataUsageStore)

                    rangePicker

                    barChartCard

                    trendLineCard

                    wifiCellularSplitCard
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Data Usage")
            .navigationBarTitleDisplayMode(.large)
        }
    }

    private var rangePicker: some View {
        Picker("Range", selection: $selectedRange) {
            Text("7 Days").tag(7)
            Text("14 Days").tag(14)
            Text("30 Days").tag(30)
        }
        .pickerStyle(.segmented)
    }

    private var barChartCard: some View {
        ChartCard(title: "Daily Usage", subtitle: "WiFi & Cellular breakdown") {
            Chart(dailyData) { day in
                BarMark(
                    x: .value("Day", day.dayLabel),
                    y: .value("MB", day.wifiMB)
                )
                .foregroundStyle(.blue.gradient)
                .cornerRadius(4)

                BarMark(
                    x: .value("Day", day.dayLabel),
                    y: .value("MB", day.cellularMB)
                )
                .foregroundStyle(.orange.gradient)
                .cornerRadius(4)
            }
            .chartForegroundStyleScale([
                "WiFi": Color.blue,
                "Cellular": Color.orange
            ])
            .chartYAxis {
                AxisMarks(position: .leading) { value in
                    AxisValueLabel {
                        if let mb = value.as(Double.self) {
                            Text("\(Int(mb))MB").font(.caption2)
                        }
                    }
                    AxisGridLine()
                }
            }
            .chartXAxis {
                AxisMarks { _ in
                    AxisValueLabel().font(.caption2)
                }
            }
            .frame(height: 200)
            .chartOverlay { proxy in
                GeometryReader { geo in
                    Rectangle().fill(.clear).contentShape(Rectangle())
                        .gesture(DragGesture(minimumDistance: 0).onChanged { val in
                            let x = val.location.x - geo[proxy.plotAreaFrame].origin.x
                            if let label: String = proxy.value(atX: x),
                               let match = dailyData.first(where: { $0.dayLabel == label }) {
                                selectedDay = match
                            }
                        })
                }
            }

            if let sel = selectedDay {
                HStack {
                    Label("\(sel.shortDate)", systemImage: "calendar")
                        .font(.caption).foregroundColor(.secondary)
                    Spacer()
                    Text("WiFi: \(String(format: "%.1f", sel.wifiMB)) MB")
                        .font(.caption).foregroundColor(.blue)
                    Text("Cell: \(String(format: "%.1f", sel.cellularMB)) MB")
                        .font(.caption).foregroundColor(.orange)
                }
                .padding(.top, 4)
            }
        }
    }

    private var trendLineCard: some View {
        ChartCard(title: "Usage Trend", subtitle: "Total data over time") {
            Chart(dailyData) { day in
                AreaMark(
                    x: .value("Day", day.dayLabel),
                    y: .value("MB", day.totalMB)
                )
                .foregroundStyle(.linearGradient(
                    colors: [.purple.opacity(0.5), .purple.opacity(0.05)],
                    startPoint: .top, endPoint: .bottom
                ))
                .interpolationMethod(.catmullRom)

                LineMark(
                    x: .value("Day", day.dayLabel),
                    y: .value("MB", day.totalMB)
                )
                .foregroundStyle(.purple)
                .lineStyle(StrokeStyle(lineWidth: 2.5))
                .interpolationMethod(.catmullRom)

                PointMark(
                    x: .value("Day", day.dayLabel),
                    y: .value("MB", day.totalMB)
                )
                .foregroundStyle(.purple)
                .symbolSize(30)
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
            .frame(height: 180)
        }
    }

    private var wifiCellularSplitCard: some View {
        let totalWifi = dailyData.reduce(0) { $0 + $1.wifiMB }
        let totalCell = dailyData.reduce(0) { $0 + $1.cellularMB }
        let total = totalWifi + totalCell

        return ChartCard(title: "Connection Split", subtitle: "WiFi vs Cellular") {
            HStack(spacing: 24) {
                VStack {
                    ZStack {
                        Circle()
                            .stroke(Color(.systemGray5), lineWidth: 14)
                            .frame(width: 100, height: 100)
                        Circle()
                            .trim(from: 0, to: total > 0 ? CGFloat(totalWifi / total) : 0.5)
                            .stroke(Color.blue, style: StrokeStyle(lineWidth: 14, lineCap: .round))
                            .rotationEffect(.degrees(-90))
                            .frame(width: 100, height: 100)
                        VStack(spacing: 0) {
                            Text("\(total > 0 ? Int(totalWifi / total * 100) : 0)%")
                                .font(.title3).bold()
                            Text("WiFi").font(.caption2).foregroundColor(.secondary)
                        }
                    }
                }
                VStack(alignment: .leading, spacing: 12) {
                    statRow(label: "WiFi", value: totalWifi, color: .blue, icon: "wifi")
                    statRow(label: "Cellular", value: totalCell, color: .orange, icon: "antenna.radiowaves.left.and.right")
                    statRow(label: "Total", value: total, color: .purple, icon: "chart.bar.fill")
                }
                Spacer()
            }
        }
    }

    private func statRow(label: String, value: Double, color: Color, icon: String) -> some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .foregroundColor(color)
                .frame(width: 20)
            VStack(alignment: .leading, spacing: 1) {
                Text(label).font(.caption2).foregroundColor(.secondary)
                Text(formatMB(value)).font(.subheadline).bold()
            }
        }
    }

    private func formatMB(_ mb: Double) -> String {
        mb >= 1024 ? String(format: "%.2f GB", mb / 1024) : String(format: "%.0f MB", mb)
    }
}
