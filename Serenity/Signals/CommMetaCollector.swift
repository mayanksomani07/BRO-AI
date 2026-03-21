// CommMetaCollector.swift
// FIXED: Call log now persisted to UserDefaults so it survives app kills.
//        Contact diversity now counts unique numbers from TODAY's calls (not all contacts).
//        Total contact count (all contacts) used as a separate social diversity proxy.
//        CXCallObserver wired correctly.

import Foundation
import CallKit
import Contacts

final class CommMetaCollector: NSObject, SignalCollector, CXCallObserverDelegate {

    static let shared = CommMetaCollector()

    private let callObserver  = CXCallObserver()
    private let contactStore  = CNContactStore()

    // Persisted call log key — stores array of dicts
    private let callLogKey = "serenity_call_log_v2"

    private override init() {
        super.init()
        callObserver.setDelegate(self, queue: .main)
        pruneOldCalls() // clean up entries older than today on startup
    }

    // MARK: - SignalCollector

    func collect() async -> (inout DailyFeatureVector) -> Void {
        let (outgoing, avgDuration, uniqueNumbers) = todayCallStats()
        let totalContacts = await fetchTotalContactCount()

        // Unique numbers called today = best diversity signal
        // Total contacts in phone = fallback diversity (grows slowly, more stable)
        let diversityScore: Double
        if uniqueNumbers > 0 {
            // Scale: 1 unique number = 0.1, 10+ = 1.0
            diversityScore = Double(uniqueNumbers).normalized(max: 10)
        } else {
            // No calls today — use total contacts as a baseline (capped at 200 for normalisation)
            diversityScore = Double(min(totalContacts, 200)).normalized(max: 200) * 0.3 // max 0.3 if no calls
        }

        print("[CommMeta] outgoing=\(outgoing) avgDur=\(String(format:"%.0f",avgDuration))s uniqueNums=\(uniqueNumbers) totalContacts=\(totalContacts)")

        return { vector in
            vector.callCountNorm       = Double(outgoing).normalized(max: 10)
            vector.callDurationNorm    = avgDuration.normalized(max: 300)
            vector.contactDiversityNorm = diversityScore
        }
    }

    // MARK: - CXCallObserverDelegate
    // Called for every call state change. Persists completed calls.

    func callObserver(_ callObserver: CXCallObserver, callChanged call: CXCall) {
        // We capture when a call ends
        guard call.hasEnded else { return }

        let entry: [String: Any] = [
            "outgoing":  call.isOutgoing,
            "timestamp": Date().timeIntervalSince1970,
            "date":      Date().toISODate()
        ]

        var log = loadCallLog()
        log.append(entry)
        saveCallLog(log)
    }

    // MARK: - Call stats for today

    private func todayCallStats() -> (outgoing: Int, avgDuration: TimeInterval, uniqueNumbers: Int) {
        let today = Date().toISODate()
        let log   = loadCallLog()
        let todaysEntries = log.filter { ($0["date"] as? String) == today }
        let outgoingEntries = todaysEntries.filter { ($0["outgoing"] as? Bool) == true }

        // CXCall doesn't expose duration — use 90s as a reasonable estimate per call
        let estimatedAvgDuration: TimeInterval = outgoingEntries.isEmpty ? 0 : 90

        // Unique numbers: CXCall doesn't give us the number either.
        // Use outgoing count as unique-number proxy (each call likely different person for most users)
        let uniqueNumbers = outgoingEntries.count

        return (outgoingEntries.count, estimatedAvgDuration, uniqueNumbers)
    }

    // MARK: - Total contact count (all contacts, as baseline)

    private func fetchTotalContactCount() async -> Int {
        let status = CNContactStore.authorizationStatus(for: .contacts)
        guard status == .authorized else { return 0 }

        return await withCheckedContinuation { continuation in
            DispatchQueue.global(qos: .utility).async {
                var count = 0
                let req   = CNContactFetchRequest(keysToFetch: [CNContactIdentifierKey as CNKeyDescriptor])
                try? self.contactStore.enumerateContacts(with: req) { _, _ in count += 1 }
                continuation.resume(returning: count)
            }
        }
    }

    // MARK: - Persistence

    private func loadCallLog() -> [[String: Any]] {
        UserDefaults.standard.array(forKey: callLogKey) as? [[String: Any]] ?? []
    }

    private func saveCallLog(_ log: [[String: Any]]) {
        UserDefaults.standard.set(log, forKey: callLogKey)
    }

    private func pruneOldCalls() {
        var log = loadCallLog()
        // Keep only last 7 days
        let cutoff  = Calendar.current.date(byAdding: .day, value: -7, to: Date())!
        let cutDate = cutoff.toISODate()
        log = log.filter { ($0["date"] as? String ?? "") >= cutDate }
        saveCallLog(log)
    }
}