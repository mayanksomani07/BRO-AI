import UIKit
import Combine

class AppDetector: ObservableObject {
    @Published var detectedApps: [SocialApp] = []
    @Published var installedApps: [SocialApp] = []
    @Published var isRefreshing = false

    private let cacheKey = "cached_social_apps_v3"
    private var refreshTimer: Timer?

    init() {
        loadFromCache()
        refresh()
        // Re-probe every 30s so the list stays live without user action
        refreshTimer = Timer.scheduledTimer(withTimeInterval: 30, repeats: true) { [weak self] _ in
            self?.refresh()
        }
    }

    deinit {
        refreshTimer?.invalidate()
    }

    func refresh() {
        guard !isRefreshing else { return }
        isRefreshing = true

        // canOpenURL must run on main thread
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }

            var updated = SocialApp.allKnown
            for i in updated.indices {
                updated[i].isInstalled = self.probeInstalled(updated[i])
            }

            self.detectedApps  = updated
            self.installedApps = updated.filter { $0.isInstalled }
            self.isRefreshing  = false
            self.saveToCache(updated)

            print("[AppDetector] Detected \(self.installedApps.count) installed apps: \(self.installedApps.map(\.displayName))")
        }
    }

    // Try every known scheme for an app — canOpenURL needs just "scheme://"
    private func probeInstalled(_ app: SocialApp) -> Bool {
        for scheme in app.allSchemes {
            // Normalise: strip trailing slashes, then re-add "://"
            let base = scheme
                .replacingOccurrences(of: "://", with: "")
                .components(separatedBy: "/").first ?? scheme
            guard let url = URL(string: "\(base)://") else { continue }
            if UIApplication.shared.canOpenURL(url) {
                print("[AppDetector] ✅ \(app.displayName) detected via \(base)://")
                return true
            }
        }
        print("[AppDetector] ❌ \(app.displayName) not found")
        return false
    }

    private func saveToCache(_ apps: [SocialApp]) {
        if let data = try? JSONEncoder().encode(apps) {
            UserDefaults.standard.set(data, forKey: cacheKey)
        }
    }

    private func loadFromCache() {
        guard let data = UserDefaults.standard.data(forKey: cacheKey),
              let apps = try? JSONDecoder().decode([SocialApp].self, from: data) else {
            detectedApps  = SocialApp.allKnown
            return
        }
        detectedApps  = apps
        installedApps = apps.filter { $0.isInstalled }
    }
}
