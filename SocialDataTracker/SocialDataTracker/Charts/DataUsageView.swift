import SwiftUI
import Charts

struct DataUsageView: View {
    @EnvironmentObject var dataUsageStore: DataUsageStore
    @State private var selectedTab = 0   // 0 = Today, 1 = 7d, 2 = 30d

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    TodaySummaryCard()
                        .environmentObject(dataUsageStore)

                    // Tab picker
                    Picker("View", selection: $selectedTab) {
                        Text("Today").tag(0)
                        Text("7 Days").tag(1)
                        Text("30 Days").tag(2)
                    }
                    .pickerStyle(.segmented)

                    if selectedTab == 0 {
                        todayHourlyCard
                        wifiCellularSplitCard(days: 1)
                    } else {
                        dailyBarCard(days: selectedTab == 1 ? 7 : 30)
                        trendLineCard(days: selectedTab == 1 ? 7 : 30)
                        wifiCellularSplitCard(days: selectedTab == 1 ? 7 : 30)
                    }
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Data Usage")
            .navigationBarTitleDisplayMode(.large)
        }
    }

    // MARK: - Today Hourly Chart

    private var todayHourlyCard: some View {
        let hourly = dataUsageStore.todayHourly()
        let isEmpty = hourly.allSatisfy { $0.totalMB < 0.01 }

        return ChartCard(title: "Hourly Breakdown", subtitle: "Today — updates every 3 seconds") {
            if isEmpty {
                emptyState("Keep the app open to build hourly data as you use your phone.")
            } else {
                Chart(hourly) { h in
                    BarMark(
                        x: .value("Hour", h.hourLabel),
                        y: .value("MB", h.wifiMB),
                        width: .ratio(0.6)
                    )
                    .foregroundStyle(Color.blue.gradient)
                    .cornerRadius(4)

                    BarMark(
                        x: .value("Hour", h.hourLabel),
                        y: .value("MB", h.cellularMB),
                        width: .ratio(0.6)
                    )
                    .foregroundStyle(Color.orange.gradient)
                    .cornerRadius(4)
                }
                .chartXAxis {
                    AxisMarks(values: .stride(by: 1)) { _ in
                        AxisValueLabel().font(.system(size: 8))
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
                .frame(height: 200)

                HStack(spacing: 16) {
                    legendDot(color: .blue, label: "WiFi")
                    legendDot(color: .orange, label: "Cellular")
                    Spacer()
                    Text("Updates live")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
        }
    }

    // MARK: - Daily Bar Chart

    private func dailyBarCard(days: Int) -> some View {
        let data = dataUsageStore.dailyDeltas(days: days)

        return ChartCard(title: "Daily Usage", subtitle: "Last \(days) days — WiFi & Cellular") {
            if data.allSatisfy({ $0.totalMB < 0.01 }) {
                emptyState("Historical data builds up over days as the app runs in the background.")
            } else {
                Chart(data) { day in
                    BarMark(
                        x: .value("Day", day.dayLabel),
                        y: .value("WiFi MB", day.wifiMB),
                        width: .ratio(0.55)
                    )
                    .foregroundStyle(Color.blue.gradient)
                    .cornerRadius(3)

                    BarMark(
                        x: .value("Day", day.dayLabel),
                        y: .value("Cellular MB", day.cellularMB),
                        width: .ratio(0.55)
                    )
                    .foregroundStyle(Color.orange.gradient)
                    .cornerRadius(3)
                }
                .chartYAxis {
                    AxisMarks(position: .leading) { value in
                        AxisValueLabel {
                            if let mb = value.as(Double.self) {
                                Text("\(Int(mb)) MB").font(.caption2)
                            }
                        }
                        AxisGridLine()
                    }
                }
                .frame(height: 200)

                HStack(spacing: 16) {
                    legendDot(color: .blue, label: "WiFi")
                    legendDot(color: .orange, label: "Cellular")
                }
            }
        }
    }

    // MARK: - Trend Line

    private func trendLineCard(days: Int) -> some View {
        let data = dataUsageStore.dailyDeltas(days: days)

        return ChartCard(title: "Usage Trend", subtitle: "Total data per day") {
            Chart(data) { day in
                AreaMark(
                    x: .value("Day", day.dayLabel),
                    y: .value("MB", day.totalMB)
                )
                .foregroundStyle(.linearGradient(
                    colors: [.purple.opacity(0.45), .purple.opacity(0.05)],
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
                .symbolSize(25)
            }
            .chartYAxis {
                AxisMarks(position: .leading) { value in
                    AxisValueLabel {
                        if let mb = value.as(Double.self) { Text("\(Int(mb))").font(.caption2) }
                    }
                    AxisGridLine()
                }
            }
            .frame(height: 170)
        }
    }

    // MARK: - WiFi/Cellular Split Ring

    private func wifiCellularSplitCard(days: Int) -> some View {
        let data = days == 1
            ? { let t = dataUsageStore.todayUsage(); return (t.wifiMB, t.cellularMB) }()
            : {
                let d = dataUsageStore.dailyDeltas(days: days)
                return (d.reduce(0) { $0 + $1.wifiMB }, d.reduce(0) { $0 + $1.cellularMB })
              }()
        let wifiMB = data.0, cellMB = data.1
        let total = wifiMB + cellMB

        return ChartCard(title: "Connection Split",
                         subtitle: days == 1 ? "Today" : "Last \(days) days") {
            HStack(spacing: 28) {
                ZStack {
                    Circle()
                        .stroke(Color(.systemGray5), lineWidth: 16)
                        .frame(width: 110, height: 110)
                    Circle()
                        .trim(from: 0, to: total > 0 ? CGFloat(wifiMB / total) : 0.5)
                        .stroke(
                            AngularGradient(colors: [.blue, .cyan], center: .center),
                            style: StrokeStyle(lineWidth: 16, lineCap: .round)
                        )
                        .rotationEffect(.degrees(-90))
                        .frame(width: 110, height: 110)
                    VStack(spacing: 1) {
                        Text(total > 0 ? "\(Int(wifiMB / total * 100))%" : "--")
                            .font(.title2).bold()
                        Text("WiFi").font(.caption2).foregroundColor(.secondary)
                    }
                }

                VStack(alignment: .leading, spacing: 14) {
                    splitRow(icon: "wifi", label: "WiFi", mb: wifiMB, color: .blue)
                    splitRow(icon: "antenna.radiowaves.left.and.right", label: "Cellular", mb: cellMB, color: .orange)
                    splitRow(icon: "sum", label: "Total", mb: total, color: .purple)
                }
                Spacer()
            }
        }
    }

    // MARK: - Helpers

    private func splitRow(icon: String, label: String, mb: Double, color: Color) -> some View {
        HStack(spacing: 10) {
            Image(systemName: icon).foregroundColor(color).frame(width: 18)
            VStack(alignment: .leading, spacing: 1) {
                Text(label).font(.caption2).foregroundColor(.secondary)
                Text(mb >= 1024 ? String(format: "%.2f GB", mb/1024) : String(format: "%.1f MB", mb))
                    .font(.subheadline).bold()
            }
        }
    }

    private func legendDot(color: Color, label: String) -> some View {
        HStack(spacing: 4) {
            Circle().fill(color).frame(width: 8, height: 8)
            Text(label).font(.caption2).foregroundColor(.secondary)
        }
    }

    private func emptyState(_ message: String) -> some View {
        VStack(spacing: 10) {
            Image(systemName: "chart.bar.xaxis")
                .font(.system(size: 36))
                .foregroundColor(.secondary)
            Text("No data yet")
                .font(.subheadline).bold()
                .foregroundColor(.secondary)
            Text(message)
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
        }
        .frame(height: 160)
        .frame(maxWidth: .infinity)
    }
}
