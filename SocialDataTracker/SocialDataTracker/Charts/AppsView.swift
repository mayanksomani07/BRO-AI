import SwiftUI
import Charts

// MARK: - Per-app usage model (live, computed every 3s)
struct AppUsageItem: Identifiable {
    let app: SocialApp
    let wifiMB: Double
    let cellularMB: Double
    let loggedMinutes: Int
    var totalMB: Double { wifiMB + cellularMB }
    var id: String { app.id }
}

struct AppsView: View {
    @EnvironmentObject var appDetector: AppDetector
    @EnvironmentObject var selfReportStore: SelfReportStore
    @EnvironmentObject var dataUsageStore: DataUsageStore

    @State private var selectedApp: SocialApp?
    @State private var showAll = false
    @State private var chartMode: ChartMode = .bar
    @State private var selectedItem: AppUsageItem?

    enum ChartMode: String, CaseIterable {
        case bar = "Bar"
        case donut = "Donut"
        case timeline = "Timeline"
    }

    // Recomputes every time liveSnapshot or selfReportStore changes — fully real-time
    private var appItems: [AppUsageItem] {
        let today = dataUsageStore.todayUsage()
        let totalMB = today.wifiMB + today.cellularMB
        let apps = showAll ? appDetector.detectedApps : appDetector.installedApps
        guard !apps.isEmpty else { return [] }

        // Step 1: Get self-reported estimates for each app
        let reported: [(SocialApp, Double, Int)] = apps.map { app in
            let mins = selfReportStore.totalMinutes(for: app.id, days: 1)
            let mb   = selfReportStore.estimatedMB(for: app.id, days: 1)
            return (app, mb, mins)
        }
        let totalReported = reported.reduce(0.0) { $0 + $1.1 }

        // Step 2: If self-report data exists, use proportional split of device total
        //         If not, split device total equally across installed apps
        return reported.map { app, reportedMB, mins in
            let share: Double
            if totalReported > 0 {
                share = (reportedMB / totalReported) * totalMB
            } else {
                share = totalMB / Double(apps.count)
            }
            // WiFi/Cellular split mirrors device ratio
            let wifiRatio = (today.wifiMB + today.cellularMB) > 0
                ? today.wifiMB / (today.wifiMB + today.cellularMB) : 0.7
            return AppUsageItem(
                app: app,
                wifiMB: share * wifiRatio,
                cellularMB: share * (1 - wifiRatio),
                loggedMinutes: mins
            )
        }
        .filter { showAll || $0.app.isInstalled }
        .sorted { $0.totalMB > $1.totalMB }
    }

    // Hourly app usage — proportional split of hourly device data
    private var appHourlyData: [(hour: HourlyUsage, items: [AppUsageItem])] {
        let apps = appDetector.installedApps
        guard !apps.isEmpty else { return [] }
        return dataUsageStore.todayHourly().map { hourly in
            let share = hourly.totalMB / Double(apps.count)
            let wifiR = hourly.totalMB > 0 ? hourly.wifiMB / hourly.totalMB : 0.7
            let items = apps.map { app in
                AppUsageItem(app: app, wifiMB: share * wifiR, cellularMB: share * (1 - wifiR), loggedMinutes: 0)
            }
            return (hour: hourly, items: items)
        }
    }

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 18) {
                    // Hero live summary
                    liveAppsSummaryHero

                    // Chart mode picker
                    chartModePicker

                    // Main chart card — switches by mode
                    switch chartMode {
                    case .bar:      appBarChartCard
                    case .donut:    appDonutCard
                    case .timeline: appTimelineCard
                    }

                    // Separator
                    HStack {
                        Text(showAll ? "All Apps (\(appDetector.detectedApps.count))"
                                     : "Installed (\(appDetector.installedApps.count))")
                            .font(.headline)
                        Spacer()
                        Toggle("", isOn: $showAll)
                            .labelsHidden()
                        Text("Show all").font(.caption).foregroundColor(.secondary)
                    }
                    .padding(.horizontal, 4)

                    // Per-app rows with inline mini-bar
                    appRowsList
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Social Apps")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button { appDetector.refresh() } label: {
                        if appDetector.isRefreshing {
                            ProgressView().tint(.purple)
                        } else {
                            Image(systemName: "arrow.clockwise")
                        }
                    }
                }
            }
            .sheet(item: $selectedApp) { app in
                LogUsageSheet(app: app)
                    .environmentObject(selfReportStore)
                    .environmentObject(dataUsageStore)
            }
        }
    }

    // MARK: - Live hero banner

    private var liveAppsSummaryHero: some View {
        let today = dataUsageStore.todayUsage()
        let total = today.wifiMB + today.cellularMB
        let speed = dataUsageStore.liveSpeed()
        let kbps  = (speed.wifiMBps + speed.cellularMBps) * 1024

        return ZStack {
            LinearGradient(colors: [.indigo, .purple, .pink],
                           startPoint: .topLeading, endPoint: .bottomTrailing)
            .clipShape(RoundedRectangle(cornerRadius: 22))
            .shadow(color: .purple.opacity(0.3), radius: 14, x: 0, y: 6)

            VStack(spacing: 14) {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("APPS DATA TODAY")
                            .font(.caption).bold()
                            .foregroundColor(.white.opacity(0.7))
                            .tracking(1.2)
                        Text(total >= 1024
                             ? String(format: "%.2f GB", total / 1024)
                             : String(format: "%.1f MB", total))
                            .font(.system(size: 40, weight: .bold, design: .rounded))
                            .foregroundColor(.white)
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 6) {
                        LiveBadge(kbps: kbps)
                        Text("\(appDetector.installedApps.count) apps detected")
                            .font(.caption2)
                            .foregroundColor(.white.opacity(0.7))
                    }
                }
                // Mini proportional bars for top 4 apps
                let top4 = appItems.prefix(4)
                if !top4.isEmpty {
                    VStack(spacing: 5) {
                        ForEach(top4) { item in
                            miniAppBar(item: item, maxMB: top4.first?.totalMB ?? 1)
                        }
                    }
                } else {
                    Text("Tap ↻ to detect your social apps")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.65))
                }
            }
            .padding(18)
        }
        .frame(minHeight: appItems.isEmpty ? 120 : 220)
    }

    private func miniAppBar(item: AppUsageItem, maxMB: Double) -> some View {
        HStack(spacing: 8) {
            Image(systemName: item.app.sfSymbol)
                .foregroundColor(.white.opacity(0.9))
                .font(.caption2)
                .frame(width: 16)
            Text(item.app.displayName)
                .font(.caption2)
                .foregroundColor(.white.opacity(0.85))
                .frame(width: 72, alignment: .leading)
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 3).fill(.white.opacity(0.15)).frame(height: 6)
                    RoundedRectangle(cornerRadius: 3)
                        .fill(.white.opacity(0.8))
                        .frame(width: maxMB > 0
                               ? geo.size.width * CGFloat(item.totalMB / maxMB) : 0,
                               height: 6)
                }
            }
            .frame(height: 6)
            Text(item.totalMB >= 1024
                 ? String(format: "%.1fG", item.totalMB/1024)
                 : String(format: "%.0fMB", item.totalMB))
                .font(.caption2).bold()
                .foregroundColor(.white)
                .frame(width: 42, alignment: .trailing)
        }
    }

    // MARK: - Chart mode picker

    private var chartModePicker: some View {
        Picker("Chart", selection: $chartMode) {
            ForEach(ChartMode.allCases, id: \.self) { mode in
                Text(mode.rawValue).tag(mode)
            }
        }
        .pickerStyle(.segmented)
    }

    // MARK: - Bar Chart Card

    private var appBarChartCard: some View {
        ChartCard(title: "Per-App Data Usage", subtitle: "Today — live, updates every 3s") {
            if appItems.isEmpty {
                emptyAppsState
            } else {
                Chart(appItems) { item in
                    BarMark(
                        x: .value("MB", item.wifiMB),
                        y: .value("App", item.app.displayName)
                    )
                    .foregroundStyle(appColor(item.app).gradient)
                    .cornerRadius(5)

                    BarMark(
                        x: .value("MB", item.cellularMB),
                        y: .value("App", item.app.displayName)
                    )
                    .foregroundStyle(appColor(item.app).opacity(0.45).gradient)
                    .cornerRadius(5)
                }
                .chartXAxis {
                    AxisMarks { value in
                        AxisValueLabel {
                            if let mb = value.as(Double.self) {
                                Text(mb >= 1024
                                     ? String(format: "%.1fG", mb/1024)
                                     : String(format: "%.0fMB", mb))
                                    .font(.caption2)
                            }
                        }
                        AxisGridLine()
                    }
                }
                .chartYAxis {
                    AxisMarks { _ in AxisValueLabel().font(.caption2) }
                }
                .frame(height: CGFloat(min(appItems.count, 10)) * 38 + 20)
                .chartOverlay { proxy in
                    GeometryReader { geo in
                        Rectangle().fill(.clear).contentShape(Rectangle())
                            .onTapGesture { loc in
                                let y = loc.y - geo[proxy.plotAreaFrame].origin.y
                                if let name: String = proxy.value(atY: y),
                                   let match = appItems.first(where: { $0.app.displayName == name }) {
                                    selectedItem = match
                                }
                            }
                    }
                }

                if let sel = selectedItem {
                    appDetailPopup(sel)
                        .transition(.opacity.combined(with: .scale(scale: 0.95)))
                }

                HStack(spacing: 14) {
                    legendDot(color: .purple, label: "WiFi (darker)")
                    legendDot(color: .purple.opacity(0.4), label: "Cellular (lighter)")
                    Spacer()
                    Text("Tap bar to inspect")
                        .font(.caption2).foregroundColor(.secondary)
                }
                .padding(.top, 6)
            }
        }
    }

    private func appDetailPopup(_ item: AppUsageItem) -> some View {
        HStack(spacing: 14) {
            Image(systemName: item.app.sfSymbol)
                .foregroundColor(appColor(item.app))
                .font(.title2)
            VStack(alignment: .leading, spacing: 3) {
                Text(item.app.displayName).font(.subheadline).bold()
                HStack(spacing: 10) {
                    Label(item.totalMB >= 1024
                          ? String(format: "%.2f GB", item.totalMB/1024)
                          : String(format: "%.1f MB", item.totalMB),
                          systemImage: "chart.bar.fill")
                        .font(.caption).foregroundColor(.purple)
                    if item.loggedMinutes > 0 {
                        Label("\(item.loggedMinutes) min", systemImage: "clock")
                            .font(.caption).foregroundColor(.secondary)
                    }
                }
            }
            Spacer()
            Button { selectedItem = nil } label: {
                Image(systemName: "xmark.circle.fill")
                    .foregroundColor(.secondary)
            }
        }
        .padding(12)
        .background(Color(.tertiarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Donut Card

    private var appDonutCard: some View {
        ChartCard(title: "Data Share by App", subtitle: "Today — proportional") {
            if appItems.isEmpty {
                emptyAppsState
            } else {
                HStack(spacing: 20) {
                    if #available(iOS 17.0, *) {
                        Chart(appItems) { item in
                            SectorMark(
                                angle: .value("MB", max(item.totalMB, 0.01)),
                                innerRadius: .ratio(0.52),
                                angularInset: 2
                            )
                            .foregroundStyle(appColor(item.app))
                            .cornerRadius(5)
                        }
                        .frame(width: 160, height: 160)
                    } else {
                        // iOS 16 fallback: pie as bar
                        Chart(appItems) { item in
                            BarMark(x: .value("MB", item.totalMB),
                                    y: .value("App", item.app.displayName))
                                .foregroundStyle(appColor(item.app).gradient)
                                .cornerRadius(4)
                        }
                        .frame(width: 160, height: 160)
                    }

                    ScrollView {
                        VStack(alignment: .leading, spacing: 8) {
                            ForEach(appItems.prefix(8)) { item in
                                HStack(spacing: 8) {
                                    Circle()
                                        .fill(appColor(item.app))
                                        .frame(width: 10, height: 10)
                                    Text(item.app.displayName)
                                        .font(.caption2)
                                        .lineLimit(1)
                                    Spacer()
                                    Text(item.totalMB >= 1024
                                         ? String(format: "%.1fG", item.totalMB/1024)
                                         : String(format: "%.0fMB", item.totalMB))
                                        .font(.caption2).bold()
                                }
                            }
                        }
                    }
                    .frame(maxHeight: 160)
                }
            }
        }
    }

    // MARK: - Timeline Card (hourly per-app stacked bars)

    private var appTimelineCard: some View {
        ChartCard(title: "Hourly App Timeline", subtitle: "Today — how usage is spread across hours") {
            let hourly = dataUsageStore.todayHourly()
            let nonEmpty = hourly.filter { $0.totalMB > 0 }

            if nonEmpty.isEmpty {
                emptyAppsState
            } else {
                // Build stacked bar data: one series per app
                let topApps = Array(appDetector.installedApps.prefix(6))
                let appCount = max(Double(topApps.count), 1)

                Chart {
                    ForEach(nonEmpty) { h in
                        let sharePerApp = h.totalMB / appCount
                        ForEach(Array(topApps.enumerated()), id: \.offset) { idx, app in
                            BarMark(
                                x: .value("Hour", h.hourLabel),
                                y: .value("MB", sharePerApp)
                            )
                            .foregroundStyle(appColor(app))
                            .cornerRadius(idx == topApps.count - 1 ? 4 : 0)
                        }
                    }
                }
                .chartXAxis {
                    AxisMarks { _ in
                        AxisValueLabel().font(.system(size: 8))
                        AxisGridLine()
                    }
                }
                .chartYAxis {
                    AxisMarks(position: .leading) { v in
                        AxisValueLabel {
                            if let mb = v.as(Double.self) {
                                Text("\(Int(mb))").font(.caption2)
                            }
                        }
                        AxisGridLine()
                    }
                }
                .frame(height: 200)

                // Legend
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()),
                                    GridItem(.flexible())], spacing: 6) {
                    ForEach(topApps) { app in
                        HStack(spacing: 5) {
                            Circle().fill(appColor(app)).frame(width: 8, height: 8)
                            Text(app.displayName).font(.caption2).lineLimit(1)
                        }
                    }
                }
                .padding(.top, 6)
            }
        }
    }

    // MARK: - Per-app rows list

    private var appRowsList: some View {
        LazyVStack(spacing: 10) {
            ForEach(appItems.isEmpty
                    ? (showAll ? appDetector.detectedApps : appDetector.installedApps)
                        .map { AppUsageItem(app: $0, wifiMB: 0, cellularMB: 0, loggedMinutes: 0) }
                    : appItems) { item in
                AppUsageRow(
                    item: item,
                    maxMB: appItems.first?.totalMB ?? 1,
                    onLog: { selectedApp = item.app }
                )
            }
        }
    }

    // MARK: - Helpers

    private var emptyAppsState: some View {
        VStack(spacing: 12) {
            Image(systemName: "apps.iphone.badge.plus")
                .font(.system(size: 40)).foregroundColor(.secondary)
            Text("No installed apps detected yet")
                .font(.subheadline).bold().foregroundColor(.secondary)
            Text("Tap ↻ in the top-right to scan for installed social apps on your device.")
                .font(.caption).foregroundColor(.secondary)
                .multilineTextAlignment(.center).padding(.horizontal)
        }
        .frame(height: 160).frame(maxWidth: .infinity)
    }

    private func legendDot(color: Color, label: String) -> some View {
        HStack(spacing: 4) {
            Circle().fill(color).frame(width: 8, height: 8)
            Text(label).font(.caption2).foregroundColor(.secondary)
        }
    }

    private func appColor(_ app: SocialApp) -> Color {
        // Give each app a unique, stable color using its index in allKnown
        let palette: [Color] = [.blue, .pink, .red, .orange, .green, .indigo,
                                 .purple, .teal, .cyan, .yellow, .mint, .brown,
                                 .gray, .blue, .pink, .red, .orange, .green, .indigo, .purple]
        let idx = SocialApp.allKnown.firstIndex(where: { $0.id == app.id }) ?? 0
        return palette[idx % palette.count]
    }
}

// MARK: - Per-App Row with inline progress bar

struct AppUsageRow: View {
    let item: AppUsageItem
    let maxMB: Double
    let onLog: () -> Void

    private var fraction: Double {
        maxMB > 0 ? min(item.totalMB / maxMB, 1.0) : 0
    }

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 14) {
                // Icon
                ZStack {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(appColor.opacity(0.12))
                        .frame(width: 52, height: 52)
                    Image(systemName: item.app.sfSymbol)
                        .foregroundColor(appColor)
                        .font(.system(size: 22))
                }

                // Info
                VStack(alignment: .leading, spacing: 3) {
                    HStack {
                        Text(item.app.displayName).font(.subheadline).bold()
                        Spacer()
                        Text(item.totalMB >= 1024
                             ? String(format: "%.2f GB", item.totalMB / 1024)
                             : String(format: "%.1f MB", item.totalMB))
                            .font(.subheadline).bold()
                            .foregroundColor(appColor)
                    }

                    // Progress bar
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            RoundedRectangle(cornerRadius: 4)
                                .fill(Color(.systemGray5))
                                .frame(height: 6)
                            RoundedRectangle(cornerRadius: 4)
                                .fill(appColor.gradient)
                                .frame(width: geo.size.width * CGFloat(fraction), height: 6)
                                .animation(.spring(response: 0.4), value: fraction)
                        }
                    }
                    .frame(height: 6)

                    HStack(spacing: 10) {
                        // Status
                        HStack(spacing: 3) {
                            Circle()
                                .fill(item.app.isInstalled ? Color.green : Color.gray.opacity(0.4))
                                .frame(width: 6, height: 6)
                            Text(item.app.isInstalled ? "Installed" : "Not found")
                                .font(.caption2)
                        }
                        .padding(.horizontal, 7).padding(.vertical, 2)
                        .background((item.app.isInstalled ? Color.green : Color.gray).opacity(0.1))
                        .foregroundColor(item.app.isInstalled ? .green : .secondary)
                        .clipShape(Capsule())

                        // Data split
                        if item.totalMB > 0 {
                            Text("WiFi \(String(format: "%.0f", item.wifiMB))MB · Cell \(String(format: "%.0f", item.cellularMB))MB")
                                .font(.caption2).foregroundColor(.secondary)
                        }

                        Spacer()

                        // Logged time badge
                        if item.loggedMinutes > 0 {
                            Label("\(item.loggedMinutes)m", systemImage: "clock")
                                .font(.caption2).bold()
                                .foregroundColor(.purple)
                        }
                    }
                }
            }
            .padding(.horizontal, 14).padding(.vertical, 12)
        }
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(item.app.isInstalled ? appColor.opacity(0.2) : Color.clear, lineWidth: 1.5)
        )
        .onTapGesture {
            if item.app.isInstalled { onLog() }
        }
    }

    private var appColor: Color {
        let palette: [Color] = [.blue, .pink, .red, .orange, .green, .indigo,
                                 .purple, .teal, .cyan, .yellow, .mint, .brown,
                                 .gray, .blue, .pink, .red, .orange, .green, .indigo, .purple]
        let idx = SocialApp.allKnown.firstIndex(where: { $0.id == item.app.id }) ?? 0
        return palette[idx % palette.count]
    }
}
