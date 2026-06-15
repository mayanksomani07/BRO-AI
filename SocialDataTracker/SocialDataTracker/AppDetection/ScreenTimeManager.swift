import Foundation
import Combine
import SwiftUI
#if canImport(FamilyControls)
import FamilyControls
import DeviceActivity
import ManagedSettings
#endif

/// Wraps Apple's Screen Time APIs (FamilyControls + DeviceActivity) so we can
/// read REAL per-app screen time minutes for apps the user has selected.
///
/// Requirements (cannot be done from code — see SETUP_GUIDE.md):
///   1. Family Controls capability enabled on the target in Xcode
///   2. Apple Developer Family Controls entitlement (request from Apple)
///   3. Run on a real iPhone (not Simulator)
///   4. User taps "Grant Screen Time Access" and approves the system prompt
@MainActor
final class ScreenTimeManager: ObservableObject {

    enum AuthState: Equatable {
        case unknown
        case notDetermined
        case denied
        case approved
        case unsupportedPlatform   // simulator, missing entitlement, iOS < 16
    }

    @Published var authState: AuthState = .unknown
    @Published var lastError: String?

    /// Apps the user picked in the FamilyActivityPicker. Persisted across launches.
    #if canImport(FamilyControls)
    @Published var selection = FamilyActivitySelection() {
        didSet { persistSelection() }
    }
    #endif

    /// Per-app minutes used today, keyed by app bundle/token hash.
    /// Filled in by the DeviceActivityMonitor extension via App Group UserDefaults.
    @Published var minutesToday: [String: Int] = [:]

    private let selectionKey  = "screen_time_selection_v1"
    private let minutesKey    = "screen_time_minutes_today_v1"
    // App Group ID — must match the one configured in Xcode capabilities.
    // If you don't set up an App Group, this falls back to standard UserDefaults.
    private let appGroupID    = "group.com.broai.socialdatatracker"

    init() {
        loadSelection()
        loadMinutes()
        Task { await refreshAuthState() }
    }

    // MARK: - Authorization

    func requestAuthorization() async {
        #if canImport(FamilyControls)
        guard #available(iOS 16.0, *) else {
            authState = .unsupportedPlatform
            lastError = "Screen Time API requires iOS 16 or newer."
            return
        }
        #if targetEnvironment(simulator)
        authState = .unsupportedPlatform
        lastError = "Screen Time API does not work in the iOS Simulator. Run on a real iPhone."
        return
        #else
        do {
            try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
            await refreshAuthState()
        } catch {
            lastError = "Authorization failed: \(error.localizedDescription). " +
                        "Make sure Family Controls capability is enabled in Xcode."
            authState = .denied
        }
        #endif
        #else
        authState = .unsupportedPlatform
        lastError = "FamilyControls framework not available on this build."
        #endif
    }

    func refreshAuthState() async {
        #if canImport(FamilyControls)
        guard #available(iOS 16.0, *) else {
            authState = .unsupportedPlatform
            return
        }
        #if targetEnvironment(simulator)
        authState = .unsupportedPlatform
        #else
        switch AuthorizationCenter.shared.authorizationStatus {
        case .notDetermined: authState = .notDetermined
        case .denied:        authState = .denied
        case .approved:      authState = .approved
            startMonitoring()
        @unknown default:    authState = .unknown
        }
        #endif
        #else
        authState = .unsupportedPlatform
        #endif
    }

    // MARK: - DeviceActivity monitoring

    /// Starts a daily activity monitor. The schedule runs from midnight to 23:59 every day,
    /// so callbacks fire as the user spends time in selected apps.
    func startMonitoring() {
        #if canImport(FamilyControls)
        guard #available(iOS 16.0, *), authState == .approved else { return }
        #if targetEnvironment(simulator)
        return
        #else
        let center = DeviceActivityCenter()
        let schedule = DeviceActivitySchedule(
            intervalStart: DateComponents(hour: 0, minute: 0),
            intervalEnd:   DateComponents(hour: 23, minute: 59),
            repeats: true
        )
        let activityName = DeviceActivityName("daily.social.usage")
        do {
            try center.startMonitoring(activityName, during: schedule)
        } catch {
            lastError = "Failed to start activity monitoring: \(error.localizedDescription)"
        }
        #endif
        #endif
    }

    func stopMonitoring() {
        #if canImport(FamilyControls)
        guard #available(iOS 16.0, *) else { return }
        #if !targetEnvironment(simulator)
        DeviceActivityCenter().stopMonitoring()
        #endif
        #endif
    }

    // MARK: - Selection persistence

    #if canImport(FamilyControls)
    private func persistSelection() {
        guard let data = try? JSONEncoder().encode(selection) else { return }
        sharedDefaults.set(data, forKey: selectionKey)
    }

    private func loadSelection() {
        guard let data = sharedDefaults.data(forKey: selectionKey),
              let decoded = try? JSONDecoder().decode(FamilyActivitySelection.self, from: data)
        else { return }
        selection = decoded
    }
    #else
    private func persistSelection() {}
    private func loadSelection() {}
    #endif

    // MARK: - Minutes (read from App Group, written by extension)

    /// Reload minute data from the shared App Group container.
    /// The DeviceActivityMonitor extension writes here on each interval event.
    func loadMinutes() {
        if let dict = sharedDefaults.dictionary(forKey: minutesKey) as? [String: Int] {
            minutesToday = dict
        }
    }

    func minutesUsed(forBundleID bundleID: String) -> Int {
        minutesToday[bundleID] ?? 0
    }

    // MARK: - App Group defaults helper

    private var sharedDefaults: UserDefaults {
        UserDefaults(suiteName: appGroupID) ?? .standard
    }
}
