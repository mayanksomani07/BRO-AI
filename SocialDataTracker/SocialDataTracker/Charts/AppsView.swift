import SwiftUI
import Charts

struct AppsView: View {
    @EnvironmentObject var appDetector: AppDetector
    @EnvironmentObject var selfReportStore: SelfReportStore
    @State private var showLogSheet = false
    @State private var selectedApp: SocialApp?
    @State private var filterInstalled = true

    private var displayedApps: [SocialApp] {
        filterInstalled ? appDetector.detectedApps.filter { $0.isInstalled } : appDetector.detectedApps
    }

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    donutSection

                    filterToggle

                    appListSection
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Social Apps")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { appDetector.refresh() }) {
                        Image(systemName: "arrow.clockwise")
                    }
                }
            }
            .sheet(item: $selectedApp) { app in
                LogUsageSheet(app: app)
                    .environmentObject(selfReportStore)
            }
        }
    }

    private var donutSection: some View {
        ChartCard(title: "Installed Apps", subtitle: "By category") {
            HStack(alignment: .center, spacing: 24) {
                AppDonutChartView(apps: appDetector.installedApps)
                    .frame(width: 140, height: 140)

                VStack(alignment: .leading, spacing: 8) {
                    ForEach(SocialCategory.allCases, id: \.self) { cat in
                        let count = appDetector.installedApps.filter { $0.category == cat }.count
                        if count > 0 {
                            legendRow(category: cat, count: count)
                        }
                    }
                    if appDetector.installedApps.isEmpty {
                        Text("No apps detected yet.\nTap refresh above.")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                Spacer()
            }
        }
    }

    private func legendRow(category: SocialCategory, count: Int) -> some View {
        HStack(spacing: 8) {
            Circle()
                .fill(categoryColor(category))
                .frame(width: 10, height: 10)
            Text(category.rawValue)
                .font(.caption)
            Spacer()
            Text("\(count)")
                .font(.caption).bold()
        }
    }

    private var filterToggle: some View {
        HStack {
            Text("Show")
                .font(.subheadline)
                .foregroundColor(.secondary)
            Spacer()
            Picker("Filter", selection: $filterInstalled) {
                Text("Installed").tag(true)
                Text("All").tag(false)
            }
            .pickerStyle(.segmented)
            .frame(width: 180)
        }
    }

    private var appListSection: some View {
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

struct AppDonutChartView: View {
    let apps: [SocialApp]

    private var categoryData: [(SocialCategory, Int)] {
        SocialCategory.allCases.compactMap { cat in
            let count = apps.filter { $0.category == cat }.count
            return count > 0 ? (cat, count) : nil
        }
    }

    var body: some View {
        if #available(iOS 17.0, *) {
            Chart(categoryData, id: \.0) { cat, count in
                SectorMark(
                    angle: .value("Count", count),
                    innerRadius: .ratio(0.55),
                    angularInset: 2
                )
                .foregroundStyle(categoryColor(cat))
                .cornerRadius(4)
            }
        } else {
            Chart(categoryData, id: \.0) { cat, count in
                BarMark(
                    x: .value("Count", count),
                    y: .value("Category", cat.rawValue)
                )
                .foregroundStyle(categoryColor(cat))
                .cornerRadius(4)
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

struct AppListRow: View {
    let app: SocialApp
    let selfReportStore: SelfReportStore
    let onLog: () -> Void

    private var totalMinutes: Int { selfReportStore.totalMinutes(for: app.id, days: 7) }
    private var estimatedMB: Double { selfReportStore.estimatedMB(for: app.id, days: 7) }

    var body: some View {
        HStack(spacing: 14) {
            ZStack {
                RoundedRectangle(cornerRadius: 12)
                    .fill(categoryColor(app.category).opacity(0.15))
                    .frame(width: 48, height: 48)
                Image(systemName: app.sfSymbol)
                    .foregroundColor(categoryColor(app.category))
                    .font(.system(size: 20))
            }

            VStack(alignment: .leading, spacing: 3) {
                Text(app.displayName)
                    .font(.subheadline).bold()
                HStack(spacing: 6) {
                    installBadge
                    Text(app.category.rawValue)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                if totalMinutes > 0 {
                    Text("\(totalMinutes) min logged · ~\(Int(estimatedMB)) MB (7d)")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }

            Spacer()

            if app.isInstalled {
                Button(action: onLog) {
                    Image(systemName: "plus.circle.fill")
                        .font(.title3)
                        .foregroundColor(.purple)
                }
            }
        }
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private var installBadge: some View {
        Text(app.isInstalled ? "Installed" : "Not found")
            .font(.caption2)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(app.isInstalled ? Color.green.opacity(0.15) : Color.gray.opacity(0.15))
            .foregroundColor(app.isInstalled ? .green : .gray)
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
