import UIKit
import Combine

class AppDetector: ObservableObject {
    @Published var detectedApps: [SocialApp] = []
    @Published var installedApps: [SocialApp] = []
    @Published var isRefreshing = false

    private let cacheKey = "cached_social_apps_v3"

    init() {
        loadFromCache()
        // Always probe on init — don't rely on cache for isInstalled
        refresh()
    }

    func refresh() {
        guard !isRefreshing else { return }
        isRefreshing = true

        // Must run on main thread — UIApplication.shared requires it
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

    // Try every known scheme for an app — returns true if any one works
    private func probeInstalled(_ app: SocialApp) -> Bool {
        for scheme in app.allSchemes {
            // canOpenURL needs a valid URL — append path if bare scheme
            let urlString = scheme.hasSuffix("://") ? scheme + "app" : scheme
            guard let url = URL(string: urlString) else { continue }
            if UIApplication.shared.canOpenURL(url) {
                print("[AppDetector] ✅ \(app.displayName) detected via \(scheme)")
                return true
            }
        }
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
