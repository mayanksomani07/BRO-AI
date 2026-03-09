//
//  SharedDataManager.swift
//  BroMoodKeyboard
//
//  App Group bridge — reads keystroke session data from shared UserDefaults
//  so the main BroMood app can process it.
//

import Foundation

class SharedDataManager {

    static let shared = SharedDataManager()

    private let appGroupId = "group.com.bromood.shared"
    private let sessionsKey = "bromood.keystroke.sessions"
    private let lastClearedKey = "bromood.keystroke.lastCleared"

    private var defaults: UserDefaults? {
        return UserDefaults(suiteName: appGroupId)
    }

    // ─── Read all pending sessions ────────────────────────────────────────────
    func readPendingSessions() -> [[String: Any]]? {
        guard let data = defaults?.data(forKey: sessionsKey) else { return nil }
        return try? JSONSerialization.jsonObject(with: data) as? [[String: Any]]
    }

    // ─── Clear after reading ──────────────────────────────────────────────────
    func clearSessions() {
        defaults?.removeObject(forKey: sessionsKey)
        defaults?.set(Date().timeIntervalSince1970 * 1000, forKey: lastClearedKey)
        defaults?.synchronize()
    }

    // ─── Keyboard enabled state (set by main app) ─────────────────────────────
    var isKeyboardEnabled: Bool {
        get { defaults?.bool(forKey: "bromood.keyboard.enabled") ?? false }
        set { defaults?.set(newValue, forKey: "bromood.keyboard.enabled") }
    }

    // ─── Session count (for debugging/stats) ─────────────────────────────────
    var pendingSessionCount: Int {
        guard let data = defaults?.data(forKey: sessionsKey),
              let arr = try? JSONSerialization.jsonObject(with: data) as? [Any] else {
            return 0
        }
        return arr.count
    }
}
