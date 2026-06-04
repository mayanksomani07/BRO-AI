import SwiftUI

/// Debug screen — shows exactly which schemes return true/false from canOpenURL.
/// Add to Settings tab to diagnose detection issues on device.
struct SchemeDebugView: View {
    @State private var results: [(app: String, scheme: String, detected: Bool)] = []
    @State private var isScanning = false

    // Every scheme we probe, keyed by display name
    private let probeList: [(String, [String])] = [
        ("WhatsApp",    ["whatsapp://app"]),
        ("Instagram",   ["instagram://app"]),
        ("Telegram",    ["tg://app"]),
        ("Facebook",    ["fb://app", "fbauth2://app"]),
        ("X/Twitter",   ["twitter://app", "x-twitter://app"]),
        ("Snapchat",    ["snapchat://app"]),
        ("TikTok",      ["snssdk1233://app", "snssdk1180://app"]),
        ("YouTube",     ["youtube://app", "vnd.youtube://app"]),
        ("LinkedIn",    ["linkedin://app"]),
        ("Reddit",      ["reddit://app"]),
        ("Pinterest",   ["pinterest://app"]),
        ("Discord",     ["discord://app"]),
        ("Threads",     ["barcelona://app"]),
        ("Signal",      ["sgnl://app"]),
        ("Viber",       ["viber://app"]),
        ("WeChat",      ["weixin://app", "wechat://app"]),
        ("BeReal",      ["bereal://app"]),
        ("Tumblr",      ["tumblr://app"]),
        ("Clubhouse",   ["clubhouse://app"]),
        ("Mastodon",    ["mastodon://app"]),
    ]

    var body: some View {
        NavigationView {
            List {
                Section {
                    Text("This screen calls canOpenURL() for every scheme. Green = app installed. If all show red even for apps you have, the LSApplicationQueriesSchemes in your Xcode target Info.plist is missing entries.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                if isScanning {
                    HStack { Spacer(); ProgressView("Scanning..."); Spacer() }
                }

                ForEach(results, id: \.scheme) { row in
                    HStack {
                        Circle()
                            .fill(row.detected ? Color.green : Color.red.opacity(0.5))
                            .frame(width: 10, height: 10)
                        VStack(alignment: .leading, spacing: 1) {
                            Text(row.app).font(.subheadline).bold()
                            Text(row.scheme).font(.caption2).foregroundColor(.secondary)
                        }
                        Spacer()
                        Text(row.detected ? "FOUND ✓" : "not found")
                            .font(.caption).bold()
                            .foregroundColor(row.detected ? .green : .secondary)
                    }
                }
            }
            .navigationTitle("Scheme Debug")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Scan") { runScan() }
                }
            }
            .onAppear { runScan() }
        }
    }

    private func runScan() {
        isScanning = true
        results = []
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            var out: [(app: String, scheme: String, detected: Bool)] = []
            for (name, schemes) in probeList {
                for scheme in schemes {
                    let detected = URL(string: scheme).map { UIApplication.shared.canOpenURL($0) } ?? false
                    out.append((app: name, scheme: scheme, detected: detected))
                }
            }
            results = out
            isScanning = false
        }
    }
}
