import Foundation
import Combine

class SelfReportStore: ObservableObject {
    @Published var entries: [SelfReportEntry] = []
    private let key = "self_report_entries"

    init() { load() }

    func add(_ entry: SelfReportEntry) {
        entries.append(entry)
        save()
    }

    func entries(for appId: String, days: Int) -> [SelfReportEntry] {
        let cutoff = Calendar.current.date(byAdding: .day, value: -days, to: Date()) ?? Date()
        return entries.filter { $0.appId == appId && $0.date >= cutoff }
    }

    func allEntries(days: Int) -> [SelfReportEntry] {
        let cutoff = Calendar.current.date(byAdding: .day, value: -days, to: Date()) ?? Date()
        return entries.filter { $0.date >= cutoff }
    }

    func totalMinutes(for appId: String, days: Int) -> Int {
        entries(for: appId, days: days).reduce(0) { $0 + $1.estimatedMinutes }
    }

    func estimatedMB(for appId: String, days: Int) -> Double {
        entries(for: appId, days: days).reduce(0) { $0 + $1.dataEstimate.mbValue }
    }

    func delete(_ entry: SelfReportEntry) {
        entries.removeAll { $0.id == entry.id }
        save()
    }

    private func save() {
        if let data = try? JSONEncoder().encode(entries) {
            UserDefaults.standard.set(data, forKey: key)
        }
    }

    private func load() {
        guard let data = UserDefaults.standard.data(forKey: key),
              let loaded = try? JSONDecoder().decode([SelfReportEntry].self, from: data) else { return }
        entries = loaded
    }
}
