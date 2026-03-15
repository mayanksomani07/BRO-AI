// AppDelegate.swift
// Handles UNUserNotificationCenter delegate callbacks and notification action responses.

import UIKit
import UserNotifications

class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        InterventionManager.shared.registerNotificationCategories()
        return true
    }

    // Called when a notification is tapped while app is in foreground
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound])
    }

    // Called when user taps notification or an action button
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo

        switch response.actionIdentifier {
        case "CALL_ICALL":
            if let url = URL(string: "tel://9152987821") {
                UIApplication.shared.open(url)
            }
        case "DISMISS":
            break // User is okay, log dismissal
        case UNNotificationDefaultActionIdentifier:
            // User tapped the notification body — open crisis modal
            NotificationCenter.default.post(name: .openCrisisModal, object: userInfo)
        default:
            break
        }

        completionHandler()
    }
}

extension Notification.Name {
    static let openCrisisModal = Notification.Name("openCrisisModal")
}
