import UIKit
import Combine

class AppDetector: ObservableObject {
    @Published var detectedApps: [SocialApp] = []
    @Published var installedApps: [SocialApp] = []
    @Published var isRefreshing = false

    private let cacheKey = "cached_social_apps"

    init() {
        loadFromCache()
        // Auto-detect on launch
        refresh()
    }

    func refresh() {
        isRefreshing = true
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self else { return }
            var updated = SocialApp.allKnown
            for i in updated.indices {
                if let url = URL(string: updated[i].scheme) {
                    updated[i].isInstalled = UIApplication.shared.canOpenURL(url)
                }
            }
            DispatchQueue.main.async {
                self.detectedApps = updated
                self.installedApps = updated.filter { $0.isInstalled }
                self.isRefreshing = false
                self.saveToCache(updated)
            }
        }
    }

    private func saveToCache(_ apps: [SocialApp]) {
        if let data = try? JSONEncoder().encode(apps) {
            UserDefaults.standard.set(data, forKey: cacheKey)
        }
    }

    private func loadFromCache() {
        guard let data = UserDefaults.standard.data(forKey: cacheKey),
              let apps = try? JSONDecoder().decode([SocialApp].self, from: data) else {
            detectedApps = SocialApp.allKnown
            return
        }
        detectedApps = apps
        installedApps = apps.filter { $0.isInstalled }
    }
}
