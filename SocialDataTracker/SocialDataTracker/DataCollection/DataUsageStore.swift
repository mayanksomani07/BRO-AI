import Foundation
import Combine

class DataUsageStore: ObservableObject {
    // liveSnapshot is @Published — every 3s update triggers SwiftUI re-render
    @Published var snapshots: [InterfaceSnapshot] = []
    @Published var liveSnapshot: InterfaceSnapshot = NetworkSampler.currentSnapshot()
    @Published var lastUpdated: Date = Date()

    private let key = "interface_snapshots"
    private let maxSnapshots = 5000
    private var timer: Timer?
    private var sessionBaseline: InterfaceSnapshot?

    init() {
        load()
        sessionBaseline = NetworkSampler.currentSnapshot()
        record()
        startLivePolling()
    }

    deinit {
        timer?.invalidate()
    }

    // MARK: - Live polling every 3 seconds

    func startLivePolling() {
        timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: 3.0, repeats: true) { [weak self] _ in
            guard let self else { return }
            let snap = NetworkSampler.currentSnapshot()
            DispatchQueue.main.async {
                self.liveSnapshot = snap
                self.lastUpdated = Date()
            }
            // Record into persistent store every 60s
            if let last = self.snapshots.last,
               Date().timeIntervalSince(last.timestamp) >= 60 {
                self.record()
            }
        }
        RunLoop.main.add(timer!, forMode: .common)
    }

    func record() {
        let snapshot = NetworkSampler.currentSnapshot()
        DispatchQueue.main.async {
            self.snapshots.append(snapshot)
            if self.snapshots.count > self.maxSnapshots {
                self.snapshots = Array(self.snapshots.suffix(self.maxSnapshots))
            }
            self.save()
        }
        print("[DataUsage] WiFi RX: \(snapshot.wifiReceived / 1_048_576) MB  Cell RX: \(snapshot.cellularReceived / 1_048_576) MB")
    }

    // MARK: - Today's usage (delta since midnight or first today snapshot)

    func todayUsage() -> (wifiMB: Double, cellularMB: Double) {
        let todayStart = Calendar.current.startOfDay(for: Date())
        let todaySnaps = snapshots.filter { $0.timestamp >= todayStart }

        let baseline: InterfaceSnapshot
        if let first = todaySnaps.first {
            baseline = first
        } else if let sb = sessionBaseline {
            baseline = sb
        } else {
            return (0, 0)
        }

        let current = liveSnapshot
        let wifiMB  = Double(safeDelta(current.wifiReceived  + current.wifiSent,
                                       baseline.wifiReceived + baseline.wifiSent))  / 1_048_576
        let cellMB  = Double(safeDelta(current.cellularReceived  + current.cellularSent,
                                       baseline.cellularReceived + baseline.cellularSent)) / 1_048_576
        return (wifiMB: max(0, wifiMB), cellularMB: max(0, cellMB))
    }

    // MARK: - Live speed (bytes/sec) between last two live readings

    func liveSpeed() -> (wifiMBps: Double, cellularMBps: Double) {
        guard snapshots.count >= 2 else { return (0, 0) }
        let prev = snapshots[snapshots.count - 2]
        let curr = liveSnapshot
        let elapsed = curr.timestamp.timeIntervalSince(prev.timestamp)
        guard elapsed > 0 else { return (0, 0) }
        let wB = Double(safeDelta(curr.wifiReceived + curr.wifiSent,
                                   prev.wifiReceived + prev.wifiSent))
        let cB = Double(safeDelta(curr.cellularReceived + curr.cellularSent,
                                   prev.cellularReceived + prev.cellularSent))
        return (wifiMBps: wB / elapsed / 1_048_576,
                cellularMBps: cB / elapsed / 1_048_576)
    }

    // MARK: - Hourly breakdown for today

    func todayHourly() -> [HourlyUsage] {
        let cal = Calendar.current
        let now = Date()
        let todayStart = cal.startOfDay(for: now)
        let currentHour = cal.component(.hour, from: now)

        var allSnaps = snapshots.filter { $0.timestamp >= todayStart }
        allSnaps.append(liveSnapshot)

        var result: [HourlyUsage] = []
        for h in 0...currentHour {
            guard let hStart = cal.date(byAdding: .hour, value: h, to: todayStart),
                  let hEnd   = cal.date(byAdding: .hour, value: 1, to: hStart) else { continue }

            let hourSnaps = allSnaps.filter { $0.timestamp >= hStart && $0.timestamp < hEnd }
            if hourSnaps.count >= 2 {
                let first = hourSnaps.first!
                let last  = hourSnaps.last!
                let wMB = Double(safeDelta(last.wifiReceived + last.wifiSent,
                                           first.wifiReceived + first.wifiSent)) / 1_048_576
                let cMB = Double(safeDelta(last.cellularReceived + last.cellularSent,
                                           first.cellularReceived + first.cellularSent)) / 1_048_576
                result.append(HourlyUsage(hour: hStart, wifiMB: max(0, wMB), cellularMB: max(0, cMB)))
            } else if h == currentHour {
                // Current hour: use session delta if we only have one snapshot this hour
                let today = todayUsage()
                // Attribute all un-bucketed usage to current hour
                let bucketed = result.reduce(into: 0.0) { $0 += $1.wifiMB + $1.cellularMB }
                let remaining = max(0, today.wifiMB + today.cellularMB - bucketed)
                let wRatio = today.wifiMB + today.cellularMB > 0
                    ? today.wifiMB / (today.wifiMB + today.cellularMB) : 0.5
                result.append(HourlyUsage(hour: hStart,
                                          wifiMB: remaining * wRatio,
                                          cellularMB: remaining * (1 - wRatio)))
            } else {
                result.append(HourlyUsage(hour: hStart, wifiMB: 0, cellularMB: 0))
            }
        }
        return result
    }

    // MARK: - Daily breakdown

    func dailyDeltas(days: Int) -> [DailyUsage] {
        let cal = Calendar.current
        let now = Date()
        var result: [DailyUsage] = []

        for dayOffset in stride(from: -(days - 1), through: 0, by: 1) {
            guard let dayStart = cal.date(byAdding: .day, value: dayOffset, to: cal.startOfDay(for: now)),
                  let dayEnd   = cal.date(byAdding: .day, value: 1, to: dayStart) else { continue }

            var daySnaps = snapshots.filter { $0.timestamp >= dayStart && $0.timestamp < dayEnd }
            if dayOffset == 0 { daySnaps.append(liveSnapshot) }

            if daySnaps.count >= 2 {
                let first  = daySnaps.first!
                let last   = daySnaps.last!
                let wifiMB = Double(safeDelta(last.wifiReceived + last.wifiSent,
                                              first.wifiReceived + first.wifiSent)) / 1_048_576
                let cellMB = Double(safeDelta(last.cellularReceived + last.cellularSent,
                                              first.cellularReceived + first.cellularSent)) / 1_048_576
                result.append(DailyUsage(date: dayStart,
                                         wifiMB: max(0, wifiMB),
                                         cellularMB: max(0, cellMB)))
            } else if dayOffset == 0 {
                let t = todayUsage()
                result.append(DailyUsage(date: dayStart, wifiMB: t.wifiMB, cellularMB: t.cellularMB))
            } else {
                result.append(DailyUsage(date: dayStart, wifiMB: 0, cellularMB: 0))
            }
        }
        return result
    }

    // MARK: - Helpers

    private func safeDelta(_ newer: UInt64, _ older: UInt64) -> UInt64 {
        newer >= older ? newer - older : newer
    }

    private func save() {
        if let data = try? JSONEncoder().encode(snapshots) {
            UserDefaults.standard.set(data, forKey: key)
        }
    }

    private func load() {
        guard let data = UserDefaults.standard.data(forKey: key),
              let loaded = try? JSONDecoder().decode([InterfaceSnapshot].self, from: data) else { return }
        // Keep only last 30 days of snapshots on load
        let cutoff = Calendar.current.date(byAdding: .day, value: -30, to: Date()) ?? Date()
        snapshots = loaded.filter { $0.timestamp >= cutoff }
    }
}
