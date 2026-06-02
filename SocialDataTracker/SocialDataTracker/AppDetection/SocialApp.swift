import Foundation

enum SocialCategory: String, Codable, CaseIterable {
    case messaging = "Messaging"
    case social = "Social"
    case video = "Video"
    case professional = "Professional"

    var color: String {
        switch self {
        case .messaging: return "blue"
        case .social: return "pink"
        case .video: return "red"
        case .professional: return "indigo"
        }
    }
}

struct SocialApp: Codable, Identifiable, Hashable {
    let id: String
    let displayName: String
    let sfSymbol: String
    let scheme: String
    let category: SocialCategory
    var isInstalled: Bool

    static let allKnown: [SocialApp] = [
        SocialApp(id: "whatsapp",   displayName: "WhatsApp",   sfSymbol: "message.fill",          scheme: "whatsapp://",      category: .messaging, isInstalled: false),
        SocialApp(id: "instagram",  displayName: "Instagram",  sfSymbol: "camera.fill",           scheme: "instagram://",     category: .social,    isInstalled: false),
        SocialApp(id: "telegram",   displayName: "Telegram",   sfSymbol: "paperplane.fill",       scheme: "tg://",            category: .messaging, isInstalled: false),
        SocialApp(id: "facebook",   displayName: "Facebook",   sfSymbol: "person.2.fill",         scheme: "fb://",            category: .social,    isInstalled: false),
        SocialApp(id: "twitter",    displayName: "X (Twitter)", sfSymbol: "bird.fill",            scheme: "twitter://",       category: .social,    isInstalled: false),
        SocialApp(id: "snapchat",   displayName: "Snapchat",   sfSymbol: "camera.circle.fill",    scheme: "snapchat://",      category: .social,    isInstalled: false),
        SocialApp(id: "tiktok",     displayName: "TikTok",     sfSymbol: "play.rectangle.fill",   scheme: "snssdk1233://",    category: .video,     isInstalled: false),
        SocialApp(id: "youtube",    displayName: "YouTube",    sfSymbol: "play.circle.fill",      scheme: "youtube://",       category: .video,     isInstalled: false),
        SocialApp(id: "linkedin",   displayName: "LinkedIn",   sfSymbol: "briefcase.fill",        scheme: "linkedin://",      category: .professional, isInstalled: false),
        SocialApp(id: "reddit",     displayName: "Reddit",     sfSymbol: "bubble.left.fill",      scheme: "reddit://",        category: .social,    isInstalled: false),
        SocialApp(id: "pinterest",  displayName: "Pinterest",  sfSymbol: "pin.fill",              scheme: "pinterest://",     category: .social,    isInstalled: false),
        SocialApp(id: "discord",    displayName: "Discord",    sfSymbol: "gamecontroller.fill",   scheme: "discord://",       category: .messaging, isInstalled: false),
        SocialApp(id: "threads",    displayName: "Threads",    sfSymbol: "at.circle.fill",        scheme: "barcelona://",     category: .social,    isInstalled: false),
        SocialApp(id: "bereal",     displayName: "BeReal",     sfSymbol: "circle.grid.2x2.fill",  scheme: "bereal://",        category: .social,    isInstalled: false),
        SocialApp(id: "tumblr",     displayName: "Tumblr",     sfSymbol: "heart.fill",            scheme: "tumblr://",        category: .social,    isInstalled: false),
        SocialApp(id: "signal",     displayName: "Signal",     sfSymbol: "lock.fill",             scheme: "sgnl://",          category: .messaging, isInstalled: false),
        SocialApp(id: "viber",      displayName: "Viber",      sfSymbol: "phone.fill",            scheme: "viber://",         category: .messaging, isInstalled: false),
        SocialApp(id: "wechat",     displayName: "WeChat",     sfSymbol: "bubble.right.fill",     scheme: "weixin://",        category: .messaging, isInstalled: false),
        SocialApp(id: "clubhouse",  displayName: "Clubhouse",  sfSymbol: "waveform",              scheme: "clubhouse://",     category: .social,    isInstalled: false),
        SocialApp(id: "mastodon",   displayName: "Mastodon",   sfSymbol: "globe",                 scheme: "mastodon://",      category: .social,    isInstalled: false),
    ]
}
