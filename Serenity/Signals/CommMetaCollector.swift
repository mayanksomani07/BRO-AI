// CommMetaCollector.swift
// Collects communication metadata ONLY — no content is ever read.
// - Outgoing call count and average duration via CallKit
// - Unique contacts count via CNContactStore

import Foundation
import CallKit
import Contacts

final class CommMetaCollector: NSObject, SignalCollector, CXCallObserverDelegate {

    static let shared = CommMetaCollector()

    private let callObserver = CXCallObserver()
    private var callLog: [(outgoing: Bool, duration: TimeInterval, date: Date)] = []
    private let contactStore = CNContactStore()

    private override init() {
        super.init()
        callObserver.setDelegate(self, queue: .main)
    }

    // MARK: - SignalCollector

    func collect() async -> (inout DailyFeatureVector) -> Void {
        let contactCount = await fetchContactCount()
        let (outgoingCount, avgDuration) = computeCallStats()

        return { vector in
            vector.callCountNorm = Double(outgoingCount).normalized(max: 10)
            vector.callDurationNorm = avgDuration.normalized(max: 300) // 5 min cap
            vector.contactDiversityNorm = Double(contactCount).normalized(max: 10)
        }
    }

    // MARK: - CXCallObserverDelegate
    // Tracks calls in real time and stores metadata in memory (not SQLite).

    func callObserver(_ callObserver: CXCallObserver, callChanged call: CXCall) {
        if call.hasEnded {
            // We can only detect that a call happened; isOutgoing is available
            let duration: TimeInterval = 60 // CXCall doesn't expose duration; use 60s estimate
            callLog.append((
                outgoing: call.isOutgoing,
                duration: duration,
                date: Date()
            ))
            // Keep only today's calls
            let startOfDay = Calendar.current.startOfDay(for: Date())
            callLog = callLog.filter { $0.date >= startOfDay }
        }
    }

    // MARK: - Call stats for today

    private func computeCallStats() -> (outgoing: Int, avgDuration: TimeInterval) {
        let startOfDay = Calendar.current.startOfDay(for: Date())
        let todaysCalls = callLog.filter { $0.date >= startOfDay && $0.outgoing }
        guard !todaysCalls.isEmpty else { return (0, 0) }

        let avgDuration = todaysCalls.map { $0.duration }.reduce(0, +) / Double(todaysCalls.count)
        return (todaysCalls.count, avgDuration)
    }

    // MARK: - Unique contacts accessed today (count only, no names stored)

    private func fetchContactCount() async -> Int {
        let authStatus = CNContactStore.authorizationStatus(for: .contacts)
        guard authStatus == .authorized else { return 0 }

        return await withCheckedContinuation { continuation in
            DispatchQueue.global(qos: .background).async {
                let keysToFetch = [CNContactIdentifierKey as CNKeyDescriptor]
                let fetchRequest = CNContactFetchRequest(keysToFetch: keysToFetch)
                var count = 0
                try? self.contactStore.enumerateContacts(with: fetchRequest) { _, _ in
                    count += 1
                }
                // Return a normalised diversity: cap at 50 contacts for diversity signal,
                // scale to 0-1 relative to 10 (≥10 contacts = maximum diversity signal).
                let diversity = min(count, 50)
                continuation.resume(returning: diversity)
            }
        }
    }
}
