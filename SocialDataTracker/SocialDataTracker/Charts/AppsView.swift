import SwiftUI
import Charts

struct AppsView: View {
    @EnvironmentObject var appDetector: AppDetector
    @EnvironmentObject var selfReportStore: SelfReportStore
    @EnvironmentObject var dataUsageStore: DataUsageStore
    @State private var selectedApp: SocialApp?
    @State private var showAll = false

    private var installedApps: [SocialApp] { appDetector.installedApps }
    private var displayedApps: [SocialApp] {
        showAll ? appDetector.detectedApps : installedApps
    }

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    installedBanner
                    categoryDonutCard
                    usageInsightCard
                    filterRow
                    appsList
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Social Apps")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        appDetector.refresh()
                    } label: {
                        Label("Refresh", systemImage: "arrow.clockwise")
                    }
                }
            }
            .sheet(item: $selectedApp) { app in
                LogUsageSheet(app: app).environmentObject(selfReportStore)
            }
        }
    }

    // MARK: - Installed Banner

    private var installedBanner: some View {
        HStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 2) {
                Text("\(installedApps.count)")
                    .font(.system(size: 44, weight: .bold, design: .rounded))
                    .foregroundColor(.purple)
                Text("Social apps found")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 6) {
                ForEach(SocialCategory.allCases, id: \.self) { cat in
                    let c = installedApps.filter { $0.category == cat }.count
                    if c > 0 {
                        HStack(spacing: 6) {
                            Text(cat.rawValue).font(.caption).foregroundColor(.secondary)
                            Text("\(c)")
                                .font(.caption).bold()
                                .padding(.horizontal, 8).padding(.vertical, 2)
                                .background(categoryColor(cat).opacity(0.15))
                                .foregroundColor(categoryColor(cat))
                                .clipShape(Capsule())
                        }
                    }
                }
            }
        }
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 18))
    }

    // MARK: - Donut

    private var categoryDonutCard: some View {
        ChartCard(title: "App Categories", subtitle: "Installed social apps breakdown") {
            if installedApps.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "apps.iphone.badge.plus")
                        .font(.system(size: 36)).foregroundColor(.secondary)
                    Text("No social apps detected")
                        .font(.subheadline).foregroundColor(.secondary)
                    Text("Tap ↻ to scan your device")
                        .font(.caption).foregroundColor(.secondary)
                }
                .frame(height: 120).frame(maxWidth: .infinity)
            } else {
                HStack(spacing: 24) {
                    AppDonutChartView(apps: installedApps).frame(width: 130, height: 130)
                    VStack(alignment: .leading, spacing: 10) {
                        ForEach(SocialCategory.allCases, id: \.self) { cat in
                            let count = installedApps.filter { $0.category == cat }.count
                            if count > 0 {
                                HStack(spacing: 8) {
                                    RoundedRectangle(cornerRadius: 3)
                                        .fill(categoryColor(cat))
                                        .frame(width: 12, height: 12)
                                    Text(cat.rawValue).font(.subheadline)
                                    Spacer()
                                    Text("\(count) apps").font(.subheadline).bold()
                                }
                            }
                        }
                    }
                    Spacer()
                }
            }
        }
    }

    // MARK: - Usage Insight Card (device-level data + installed apps context)

    private var usageInsightCard: some View {
        let today = dataUsageStore.todayUsage()
        let totalMB = today.wifiMB + today.cellularMB
        let perAppMB = installedApps.isEmpty ? 0.0 : totalMB / Double(installedApps.count)

        return ChartCard(title: "Device Usage Today", subtitle: "Distributed across \(installedApps.count) detected apps") {
            VStack(spacing: 14) {
                HStack {
                    usageInfoBox(title: "Total Today",
                                 value: totalMB >= 1024 ? String(format: "%.2f GB", totalMB/1024) : String(format: "%.0f MB", totalMB),
                                 icon: "chart.bar.fill", color: .purple)
                    Spacer()
                    usageInfoBox(title: "Avg/App",
                                 value: perAppMB > 0 ? String(format: "%.0f MB", perAppMB) : "--",
                                 icon: "apps.iphone", color: .blue)
                    Spacer()
                    usageInfoBox(title: "Apps Active",
                                 value: "\(installedApps.count)",
                                 icon: "checkmark.circle.fill", color: .green)
                }

                if !installedApps.isEmpty && totalMB > 0 {
                    // Show each installed app as a proportional bar based on self-report or equal split
                    let appBars = buildAppBars(totalMB: totalMB)
                    VStack(spacing: 6) {
                        ForEach(appBars.prefix(6), id: \.app.id) { item in
                            appUsageBar(app: item.app, mb: item.mb, totalMB: totalMB)
                        }
                        if appBars.count > 6 {
                            Text("+ \(appBars.count - 6) more apps")
                                .font(.caption).foregroundColor(.secondary)
                        }
                    }
                }

                Text("iOS limits per-app tracking. Tap + to log your usage per app for better estimates.")
                    .font(.caption2)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.top, 2)
            }
        }
    }

    private func buildAppBars(totalMB: Double) -> [(app: SocialApp, mb: Double)] {
        // Use self-reported data if available, else equal split
        let reported = installedApps.map { app in
            (app: app, mb: selfReportStore.estimatedMB(for: app.id, days: 1))
        }
        let totalReported = reported.reduce(0) { $0 + $1.mb }

        if totalReported > 0 {
            return reported.map { (app: $0.app, mb: $0.mb / totalReported * totalMB) }
                           .sorted { $0.mb > $1.mb }
        } else {
            let share = totalMB / Double(installedApps.count)
            return installedApps.map { (app: $0, mb: share) }
        }
    }

    private func appUsageBar(app: SocialApp, mb: Double, totalMB: Double) -> some View {
        let fraction = totalMB > 0 ? mb / totalMB : 0

        return HStack(spacing: 10) {
            Image(systemName: app.sfSymbol)
                .foregroundColor(categoryColor(app.category))
                .frame(width: 20)
            Text(app.displayName)
                .font(.caption).frame(width: 80, alignment: .leading)
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color(.systemGray5))
                        .frame(height: 8)
                    RoundedRectangle(cornerRadius: 4)
                        .fill(categoryColor(app.category).gradient)
                        .frame(width: geo.size.width * CGFloat(fraction), height: 8)
                }
            }
            .frame(height: 8)
            Text(mb >= 1024 ? String(format: "%.1fGB", mb/1024) : String(format: "%.0fMB", mb))
                .font(.caption2).bold().frame(width: 44, alignment: .trailing)
        }
    }

    private func usageInfoBox(title: String, value: String, icon: String, color: Color) -> some View {
        VStack(spacing: 4) {
            Image(systemName: icon).foregroundColor(color).font(.title3)
            Text(value).font(.subheadline).bold().minimumScaleFactor(0.7).lineLimit(1)
            Text(title).font(.caption2).foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Filter Row

    private var filterRow: some View {
        HStack {
            Text(showAll ? "All apps (\(appDetector.detectedApps.count))"
                        : "Installed (\(installedApps.count))")
                .font(.subheadline).bold()
            Spacer()
            Toggle("Show All", isOn: $showAll)
                .toggleStyle(.switch)
                .labelsHidden()
            Text("Show all").font(.caption).foregroundColor(.secondary)
        }
    }

    // MARK: - App List

    private var appsList: some View {
        LazyVStack(spacing: 10) {
            ForEach(displayedApps) { app in
                AppListRow(app: app, selfReportStore: selfReportStore) {
                    selectedApp = app
                }
            }
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
}

// MARK: - Donut Chart

struct AppDonutChartView: View {
    let apps: [SocialApp]

    private var data: [(SocialCategory, Int)] {
        SocialCategory.allCases.compactMap { cat in
            let n = apps.filter { $0.category == cat }.count
            return n > 0 ? (cat, n) : nil
        }
    }

    var body: some View {
        if #available(iOS 17.0, *) {
            Chart(data, id: \.0) { cat, count in
                SectorMark(angle: .value("Count", count),
                           innerRadius: .ratio(0.58),
                           angularInset: 2.5)
                    .foregroundStyle(categoryColor(cat))
                    .cornerRadius(5)
            }
        } else {
            Chart(data, id: \.0) { cat, count in
                BarMark(x: .value("Count", count), y: .value("Cat", cat.rawValue))
                    .foregroundStyle(categoryColor(cat)).cornerRadius(4)
            }
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
}

// MARK: - App List Row

struct AppListRow: View {
    let app: SocialApp
    let selfReportStore: SelfReportStore
    let onLog: () -> Void

    private var logged7d: Int { selfReportStore.totalMinutes(for: app.id, days: 7) }

    var body: some View {
        HStack(spacing: 14) {
            ZStack {
                RoundedRectangle(cornerRadius: 12)
                    .fill(categoryColor(app.category).opacity(0.12))
                    .frame(width: 52, height: 52)
                Image(systemName: app.sfSymbol)
                    .foregroundColor(categoryColor(app.category))
                    .font(.system(size: 22))
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(app.displayName).font(.subheadline).bold()
                HStack(spacing: 6) {
                    statusBadge
                    Text(app.category.rawValue)
                        .font(.caption2).foregroundColor(.secondary)
                }
                if logged7d > 0 {
                    Text("\(logged7d) min logged this week")
                        .font(.caption2).foregroundColor(.purple)
                }
            }

            Spacer()

            if app.isInstalled {
                Button(action: onLog) {
                    Label("Log", systemImage: "plus.circle.fill")
                        .font(.caption).bold()
                        .foregroundColor(.white)
                        .padding(.horizontal, 10).padding(.vertical, 6)
                        .background(Color.purple)
                        .clipShape(Capsule())
                }
            }
        }
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(app.isInstalled ? Color.green.opacity(0.25) : Color.clear, lineWidth: 1.5)
        )
    }

    private var statusBadge: some View {
        HStack(spacing: 3) {
            Circle()
                .fill(app.isInstalled ? Color.green : Color.gray.opacity(0.5))
                .frame(width: 6, height: 6)
            Text(app.isInstalled ? "Installed" : "Not found")
                .font(.caption2)
        }
        .padding(.horizontal, 7).padding(.vertical, 2)
        .background((app.isInstalled ? Color.green : Color.gray).opacity(0.1))
        .foregroundColor(app.isInstalled ? .green : .secondary)
        .clipShape(Capsule())
    }

    private func categoryColor(_ cat: SocialCategory) -> Color {
        switch cat {
        case .messaging: return .blue
        case .social: return .pink
        case .video: return .red
        case .professional: return .indigo
        }
    }
}
