import Foundation
import Combine

class DataUsageStore: ObservableObject {
    @Published var snapshots: [InterfaceSnapshot] = []
    @Published var liveSnapshot: InterfaceSnapshot = NetworkSampler.currentSnapshot()

    private let key = "interface_snapshots"
    private let maxSnapshots = 5000
    private var timer: Timer?
    private var sessionBaseline: InterfaceSnapshot?

    init() {
        load()
        // Take a baseline at app launch so "today since open" delta is accurate
        sessionBaseline = NetworkSampler.currentSnapshot()
        record()
        startLivePolling()
    }

    // MARK: - Live polling every 3 seconds

    func startLivePolling() {
        timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: 3.0, repeats: true) { [weak self] _ in
            guard let self else { return }
            self.liveSnapshot = NetworkSampler.currentSnapshot()
            // Record a snapshot every 60s into the persistent store
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
        print("[DataUsageStore] snap WiFi RX: \(snapshot.wifiReceived / 1_048_576) MB  Cell RX: \(snapshot.cellularReceived / 1_048_576) MB")
    }

    // MARK: - Today live delta (since midnight or since first snap today)

    func todayUsage() -> (wifiMB: Double, cellularMB: Double) {
        let cal = Calendar.current
        let todayStart = cal.startOfDay(for: Date())
        let todaySnaps = snapshots.filter { $0.timestamp >= todayStart }

        let baseline: InterfaceSnapshot
        if let first = todaySnaps.first {
            baseline = first
        } else if let sb = sessionBaseline {
            baseline = sb
        } else {
            // No history — show live totals since session
            return liveDeltaSinceBaseline()
        }

        let current = liveSnapshot
        let wifiMB = Double(safeDelta(
            current.wifiReceived + current.wifiSent,
            baseline.wifiReceived + baseline.wifiSent)) / 1_048_576
        let cellMB = Double(safeDelta(
            current.cellularReceived + current.cellularSent,
            baseline.cellularReceived + baseline.cellularSent)) / 1_048_576
        return (wifiMB: wifiMB, cellularMB: cellMB)
    }

    private func liveDeltaSinceBaseline() -> (wifiMB: Double, cellularMB: Double) {
        guard let baseline = sessionBaseline else { return (0, 0) }
        let current = liveSnapshot
        let wifiMB = Double(safeDelta(
            current.wifiReceived + current.wifiSent,
            baseline.wifiReceived + baseline.wifiSent)) / 1_048_576
        let cellMB = Double(safeDelta(
            current.cellularReceived + current.cellularSent,
            baseline.cellularReceived + baseline.cellularSent)) / 1_048_576
        return (wifiMB: wifiMB, cellularMB: cellMB)
    }

    // MARK: - Live speed (bytes/sec) computed from last two snapshots

    func liveSpeed() -> (wifiMBps: Double, cellularMBps: Double) {
        guard snapshots.count >= 2 else { return (0, 0) }
        let prev = snapshots[snapshots.count - 2]
        let curr = snapshots[snapshots.count - 1]
        let elapsed = curr.timestamp.timeIntervalSince(prev.timestamp)
        guard elapsed > 0 else { return (0, 0) }

        let wifiBytes = Double(safeDelta(curr.wifiReceived + curr.wifiSent,
                                         prev.wifiReceived + prev.wifiSent))
        let cellBytes = Double(safeDelta(curr.cellularReceived + curr.cellularSent,
                                          prev.cellularReceived + prev.cellularSent))
        return (wifiMBps: wifiBytes / elapsed / 1_048_576,
                cellularMBps: cellBytes / elapsed / 1_048_576)
    }

    // MARK: - Hourly breakdown for today

    func todayHourly() -> [HourlyUsage] {
        let cal = Calendar.current
        let now = Date()
        let todayStart = cal.startOfDay(for: now)
        let currentHour = cal.component(.hour, from: now)

        // Collect all today's snaps plus live
        var allSnaps = snapshots.filter { $0.timestamp >= todayStart }
        allSnaps.append(liveSnapshot)

        var result: [HourlyUsage] = []
        for h in 0...currentHour {
            guard let hStart = cal.date(byAdding: .hour, value: h, to: todayStart),
                  let hEnd = cal.date(byAdding: .hour, value: 1, to: hStart) else { continue }

            let hourSnaps = allSnaps.filter { $0.timestamp >= hStart && $0.timestamp < hEnd }
            if hourSnaps.count >= 2 {
                let first = hourSnaps.first!
                let last = hourSnaps.last!
                let wMB = Double(safeDelta(last.wifiReceived + last.wifiSent,
                                           first.wifiReceived + first.wifiSent)) / 1_048_576
                let cMB = Double(safeDelta(last.cellularReceived + last.cellularSent,
                                           first.cellularReceived + first.cellularSent)) / 1_048_576
                result.append(HourlyUsage(hour: hStart, wifiMB: wMB, cellularMB: cMB))
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
                  let dayEnd = cal.date(byAdding: .day, value: 1, to: dayStart) else { continue }

            // Include live snapshot for today
            var daySnaps = snapshots.filter { $0.timestamp >= dayStart && $0.timestamp < dayEnd }
            if dayOffset == 0 { daySnaps.append(liveSnapshot) }

            if daySnaps.count >= 2 {
                let first = daySnaps.first!
                let last = daySnaps.last!
                let wifiMB = Double(safeDelta(last.wifiReceived + last.wifiSent,
                                              first.wifiReceived + first.wifiSent)) / 1_048_576
                let cellMB = Double(safeDelta(last.cellularReceived + last.cellularSent,
                                              first.cellularReceived + first.cellularSent)) / 1_048_576
                result.append(DailyUsage(date: dayStart, wifiMB: wifiMB, cellularMB: cellMB))
            } else {
                // Use today's live delta for today, 0 for past days with no history
                if dayOffset == 0 {
                    let today = todayUsage()
                    result.append(DailyUsage(date: dayStart, wifiMB: today.wifiMB, cellularMB: today.cellularMB))
                } else {
                    result.append(DailyUsage(date: dayStart, wifiMB: 0, cellularMB: 0))
                }
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
        snapshots = loaded
    }
}
