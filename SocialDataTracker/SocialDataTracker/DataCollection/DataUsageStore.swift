import Foundation
import Combine

class DataUsageStore: ObservableObject {
    // liveSnapshot is @Published — every 3s update triggers SwiftUI re-render
    @Published var snapshots: [InterfaceSnapshot] = []
    @Published var liveSnapshot: InterfaceSnapshot = NetworkSampler.currentSnapshot()
    @Published var lastUpdated: Date = Date()

    private let key = "interface_snapshots"
    private let midnightBaselineKey = "midnight_baseline_v2"
    private let maxSnapshots = 5000
    private var timer: Timer?

    init() {
        load()
        saveMidnightBaselineIfNeeded()
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
                // Reset midnight baseline when the day rolls over
                var cal = Calendar.current
                cal.timeZone = TimeZone.current
                let todayMidnight = cal.startOfDay(for: Date())
                if let mb = self.midnightBaseline,
                   cal.startOfDay(for: mb.timestamp) < todayMidnight {
                    self.saveMidnightBaselineIfNeeded()
                }
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

    // MARK: - Midnight baseline
    // Stores the kernel counter value captured at/near 12:00 AM of today.
    // On first launch of a new day, we save the current snapshot tagged with
    // the midnight timestamp so deltas are always "since 12:00 AM local time".

    @Published var midnightBaseline: InterfaceSnapshot?

    func saveMidnightBaselineIfNeeded() {
        var cal = Calendar.current
        cal.timeZone = TimeZone.current
        let todayMidnight = cal.startOfDay(for: Date())  // 12:00 AM today in local tz

        // Check if we already have a baseline saved for today
        if let data = UserDefaults.standard.data(forKey: midnightBaselineKey),
           let saved = try? JSONDecoder().decode(InterfaceSnapshot.self, from: data) {
            let savedMidnight = cal.startOfDay(for: saved.timestamp)
            if savedMidnight == todayMidnight {
                // Already have today's baseline — use it
                midnightBaseline = saved
                return
            }
        }

        // No baseline for today yet — capture current counters but stamp it
        // at 12:00 AM so all delta calculations treat it as "since midnight".
        var fresh = NetworkSampler.currentSnapshot()
        fresh = InterfaceSnapshot(
            timestamp:        todayMidnight,   // stamp at midnight, not app-launch time
            wifiSent:         fresh.wifiSent,
            wifiReceived:     fresh.wifiReceived,
            cellularSent:     fresh.cellularSent,
            cellularReceived: fresh.cellularReceived
        )
        midnightBaseline = fresh
        if let data = try? JSONEncoder().encode(fresh) {
            UserDefaults.standard.set(data, forKey: midnightBaselineKey)
        }
    }

    // Called from background task near midnight — force-captures a fresh baseline for the new day.
    func captureMidnightBaseline() {
        var cal = Calendar.current
        cal.timeZone = TimeZone.current
        let todayMidnight = cal.startOfDay(for: Date())
        let fresh = NetworkSampler.currentSnapshot()
        let baseline = InterfaceSnapshot(
            timestamp:        todayMidnight,
            wifiSent:         fresh.wifiSent,
            wifiReceived:     fresh.wifiReceived,
            cellularSent:     fresh.cellularSent,
            cellularReceived: fresh.cellularReceived
        )
        DispatchQueue.main.async {
            self.midnightBaseline = baseline
        }
        if let data = try? JSONEncoder().encode(baseline) {
            UserDefaults.standard.set(data, forKey: midnightBaselineKey)
        }
        record()
    }

    // MARK: - Today's usage (delta since 12:00 AM local time)

    func todayUsage() -> (wifiMB: Double, cellularMB: Double) {
        guard let baseline = midnightBaseline else { return (0, 0) }
        let current = liveSnapshot
        let wifiMB = Double(safeDelta(current.wifiReceived + current.wifiSent,
                                      baseline.wifiReceived + baseline.wifiSent)) / 1_048_576
        let cellMB = Double(safeDelta(current.cellularReceived + current.cellularSent,
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

            if dayOffset == 0 {
                // Always use midnight baseline for today so the number is accurate from 12:00 AM
                let t = todayUsage()
                result.append(DailyUsage(date: dayStart, wifiMB: t.wifiMB, cellularMB: t.cellularMB))
                continue
            }

            let daySnaps = snapshots.filter { $0.timestamp >= dayStart && $0.timestamp < dayEnd }

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
