//
//  KeystrokeLogger.swift
//  BroMoodKeyboard
//
//  Logs keystroke METADATA only — never the actual characters typed.
//  All data stored on-device in shared App Group UserDefaults.
//

import Foundation

enum KeyType: String, Codable {
    case character
    case backspace
    case space
    case delete
    case return_   = "return"
    case shift
}

struct KeystrokeEvent: Codable {
    let timestamp: Double          // Unix ms
    let keyType: KeyType
    let interKeyInterval: Double   // ms since last keypress
    let sessionId: String
}

struct RawSession: Codable {
    let sessionId: String
    var events: [KeystrokeEvent]
    let recordedAt: Double
}

class KeystrokeLogger {

    private var currentSession: RawSession?
    private let appGroupId = "group.com.bromood.shared"
    private let storageKey = "bromood.keystroke.sessions"

    // Max sessions stored before oldest is dropped
    private let maxStoredSessions = 20

    func startSession() {
        let sessionId = UUID().uuidString
        currentSession = RawSession(
            sessionId: sessionId,
            events: [],
            recordedAt: Date().timeIntervalSince1970 * 1000
        )
    }

    func log(keyType: KeyType, interKeyInterval: Double) {
        guard var session = currentSession else { return }

        let event = KeystrokeEvent(
            timestamp: Date().timeIntervalSince1970 * 1000,
            keyType: keyType,
            interKeyInterval: interKeyInterval,
            sessionId: session.sessionId
        )

        session.events.append(event)
        currentSession = session
    }

    func endSession() {
        guard let session = currentSession, session.events.count >= 5 else {
            // Don't save trivially short sessions (< 5 keys)
            currentSession = nil
            return
        }

        persistSession(session)
        currentSession = nil
    }

    // ─── Persistence ──────────────────────────────────────────────────────────
    private func persistSession(_ session: RawSession) {
        guard let defaults = UserDefaults(suiteName: appGroupId) else {
            // Fallback to standard defaults in simulator/dev
            persistToStandardDefaults(session)
            return
        }

        var existing = loadSessions(from: defaults)
        existing.append(session)

        // Rolling window — keep only the most recent N sessions
        if existing.count > maxStoredSessions {
            existing = Array(existing.suffix(maxStoredSessions))
        }

        do {
            let encoded = try JSONEncoder().encode(existing)
            defaults.set(encoded, forKey: storageKey)
            defaults.synchronize()
        } catch {
            print("[KeystrokeLogger] Failed to encode sessions: \(error)")
        }
    }

    private func loadSessions(from defaults: UserDefaults) -> [RawSession] {
        guard let data = defaults.data(forKey: storageKey) else { return [] }
        do {
            return try JSONDecoder().decode([RawSession].self, from: data)
        } catch {
            return []
        }
    }

    private func persistToStandardDefaults(_ session: RawSession) {
        var existing: [RawSession] = []
        if let data = UserDefaults.standard.data(forKey: storageKey),
           let decoded = try? JSONDecoder().decode([RawSession].self, from: data) {
            existing = decoded
        }
        existing.append(session)
        if existing.count > maxStoredSessions {
            existing = Array(existing.suffix(maxStoredSessions))
        }
        if let encoded = try? JSONEncoder().encode(existing) {
            UserDefaults.standard.set(encoded, forKey: storageKey)
        }
    }
}
