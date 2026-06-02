import Foundation

enum CSVExporter {
    static func export(dailyData: [DailyUsage], entries: [SelfReportEntry], apps: [SocialApp]) -> String {
        var lines = ["date,wifi_mb,cellular_mb,total_mb,app_id,app_name,estimated_minutes,data_estimate_mb"]

        for day in dailyData {
            let dateStr = ISO8601DateFormatter().string(from: day.date).prefix(10)
            let dayEntries = entries.filter {
                Calendar.current.isDate($0.date, inSameDayAs: day.date)
            }
            if dayEntries.isEmpty {
                lines.append("\(dateStr),\(String(format: "%.2f", day.wifiMB)),\(String(format: "%.2f", day.cellularMB)),\(String(format: "%.2f", day.totalMB)),,,,")
            } else {
                for entry in dayEntries {
                    let appName = apps.first(where: { $0.id == entry.appId })?.displayName ?? entry.appId
                    lines.append("\(dateStr),\(String(format: "%.2f", day.wifiMB)),\(String(format: "%.2f", day.cellularMB)),\(String(format: "%.2f", day.totalMB)),\(entry.appId),\(appName),\(entry.estimatedMinutes),\(String(format: "%.0f", entry.dataEstimate.mbValue))")
                }
            }
        }

        return lines.joined(separator: "\n")
    }
}
