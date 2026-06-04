import Foundation

enum SocialCategory: String, Codable, CaseIterable {
    case messaging   = "Messaging"
    case social      = "Social"
    case video       = "Video"
    case professional = "Professional"
}

struct SocialApp: Codable, Identifiable, Hashable {
    let id: String
    let displayName: String
    let sfSymbol: String
    // Primary scheme — the one in LSApplicationQueriesSchemes
    let scheme: String
    // All schemes to try — first one that returns true wins
    let fallbackSchemes: [String]
    let category: SocialCategory
    var isInstalled: Bool

    // All schemes to probe (primary + fallbacks)
    var allSchemes: [String] { [scheme] + fallbackSchemes }

    static let allKnown: [SocialApp] = [
        // WhatsApp: whatsapp:// is the official, registered scheme
        SocialApp(id: "whatsapp",   displayName: "WhatsApp",
                  sfSymbol: "message.fill",
                  scheme: "whatsapp://",
                  fallbackSchemes: ["whatsapp://send"],
                  category: .messaging, isInstalled: false),

        // Instagram
        SocialApp(id: "instagram",  displayName: "Instagram",
                  sfSymbol: "camera.fill",
                  scheme: "instagram://",
                  fallbackSchemes: ["instagram://app"],
                  category: .social, isInstalled: false),

        // Telegram
        SocialApp(id: "telegram",   displayName: "Telegram",
                  sfSymbol: "paperplane.fill",
                  scheme: "tg://",
                  fallbackSchemes: ["tg://resolve"],
                  category: .messaging, isInstalled: false),

        // Facebook
        SocialApp(id: "facebook",   displayName: "Facebook",
                  sfSymbol: "person.2.fill",
                  scheme: "fb://",
                  fallbackSchemes: ["fbauth2://", "fb://profile"],
                  category: .social, isInstalled: false),

        // X / Twitter — tries both old and new scheme
        SocialApp(id: "twitter",    displayName: "X (Twitter)",
                  sfSymbol: "bubble.left.and.bubble.right.fill",
                  scheme: "twitter://",
                  fallbackSchemes: ["x-twitter://"],
                  category: .social, isInstalled: false),

        // Snapchat
        SocialApp(id: "snapchat",   displayName: "Snapchat",
                  sfSymbol: "camera.circle.fill",
                  scheme: "snapchat://",
                  fallbackSchemes: [],
                  category: .social, isInstalled: false),

        // TikTok — multiple known schemes
        SocialApp(id: "tiktok",     displayName: "TikTok",
                  sfSymbol: "play.rectangle.fill",
                  scheme: "snssdk1233://",
                  fallbackSchemes: ["snssdk1180://", "musical.ly://"],
                  category: .video, isInstalled: false),

        // YouTube
        SocialApp(id: "youtube",    displayName: "YouTube",
                  sfSymbol: "play.circle.fill",
                  scheme: "youtube://",
                  fallbackSchemes: ["vnd.youtube://", "googleyoutube://"],
                  category: .video, isInstalled: false),

        // LinkedIn
        SocialApp(id: "linkedin",   displayName: "LinkedIn",
                  sfSymbol: "briefcase.fill",
                  scheme: "linkedin://",
                  fallbackSchemes: ["linkedin://feed"],
                  category: .professional, isInstalled: false),

        // Reddit
        SocialApp(id: "reddit",     displayName: "Reddit",
                  sfSymbol: "bubble.left.fill",
                  scheme: "reddit://",
                  fallbackSchemes: ["apollo://reddit.com"],
                  category: .social, isInstalled: false),

        // Pinterest
        SocialApp(id: "pinterest",  displayName: "Pinterest",
                  sfSymbol: "pin.fill",
                  scheme: "pinterest://",
                  fallbackSchemes: [],
                  category: .social, isInstalled: false),

        // Discord
        SocialApp(id: "discord",    displayName: "Discord",
                  sfSymbol: "gamecontroller.fill",
                  scheme: "discord://",
                  fallbackSchemes: [],
                  category: .messaging, isInstalled: false),

        // Threads (Meta) — barcelona:// is the confirmed scheme
        SocialApp(id: "threads",    displayName: "Threads",
                  sfSymbol: "at.circle.fill",
                  scheme: "barcelona://",
                  fallbackSchemes: [],
                  category: .social, isInstalled: false),

        // BeReal
        SocialApp(id: "bereal",     displayName: "BeReal",
                  sfSymbol: "circle.grid.2x2.fill",
                  scheme: "bereal://",
                  fallbackSchemes: [],
                  category: .social, isInstalled: false),

        // Signal
        SocialApp(id: "signal",     displayName: "Signal",
                  sfSymbol: "lock.fill",
                  scheme: "sgnl://",
                  fallbackSchemes: [],
                  category: .messaging, isInstalled: false),

        // Viber
        SocialApp(id: "viber",      displayName: "Viber",
                  sfSymbol: "phone.fill",
                  scheme: "viber://",
                  fallbackSchemes: [],
                  category: .messaging, isInstalled: false),

        // WeChat
        SocialApp(id: "wechat",     displayName: "WeChat",
                  sfSymbol: "bubble.right.fill",
                  scheme: "weixin://",
                  fallbackSchemes: ["wechat://"],
                  category: .messaging, isInstalled: false),

        // Tumblr
        SocialApp(id: "tumblr",     displayName: "Tumblr",
                  sfSymbol: "heart.fill",
                  scheme: "tumblr://",
                  fallbackSchemes: [],
                  category: .social, isInstalled: false),

        // Clubhouse
        SocialApp(id: "clubhouse",  displayName: "Clubhouse",
                  sfSymbol: "waveform",
                  scheme: "clubhouse://",
                  fallbackSchemes: [],
                  category: .social, isInstalled: false),

        // Mastodon
        SocialApp(id: "mastodon",   displayName: "Mastodon",
                  sfSymbol: "globe",
                  scheme: "mastodon://",
                  fallbackSchemes: [],
                  category: .social, isInstalled: false),
    ]
}
