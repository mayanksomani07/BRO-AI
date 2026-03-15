// InterventionManager.swift
// Fires a compassionate push notification with action buttons.
// Also handles deep-linking into CrisisModalView.

import Foundation
import UserNotifications

final class InterventionManager {

    static let shared = InterventionManager()
    private init() {}

    // MARK: - Register notification categories (call at app launch)

    func registerNotificationCategories() {
        let callAction = UNNotificationAction(
            identifier: "CALL_ICALL",
            title: "Call iCall free (9152987821)",
            options: [.foreground]
        )
        let dismissAction = UNNotificationAction(
            identifier: "DISMISS",
            title: "I'm okay right now",
            options: []
        )
        let category = UNNotificationCategory(
            identifier: "CRISIS_CHECKIN",
            actions: [callAction, dismissAction],
            intentIdentifiers: [],
            options: [.customDismissAction]
        )
        UNUserNotificationCenter.current().setNotificationCategories([category])
    }

    // MARK: - Fire intervention notification

    func fireIntervention(score: Double) async {
        let content = UNMutableNotificationContent()
        content.title = "Checking in on you"
        content.body = "Things might feel heavy right now — you don't have to face it alone."
        content.sound = .default
        content.userInfo = ["action": "openCrisisScreen", "score": score]
        content.categoryIdentifier = "CRISIS_CHECKIN"
        content.interruptionLevel = .timeSensitive

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
        let request = UNNotificationRequest(
            identifier: "serenity-crisis-\(UUID().uuidString)",
            content: content,
            trigger: trigger
        )

        do {
            try await UNUserNotificationCenter.current().add(request)
        } catch {
            print("[InterventionManager] Notification failed: \(error)")
        }
    }
}
