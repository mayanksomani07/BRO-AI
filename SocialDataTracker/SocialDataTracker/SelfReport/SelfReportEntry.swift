import Foundation

enum DataEstimate: String, Codable, CaseIterable {
    case low     = "Low (~10 MB)"
    case medium  = "Medium (~50 MB)"
    case high    = "High (~150 MB)"
    case heavy   = "Heavy (~500 MB)"
    case unknown = "Unknown"

    var mbValue: Double {
        switch self {
        case .low: return 10
        case .medium: return 50
        case .high: return 150
        case .heavy: return 500
        case .unknown: return 0
        }
    }
}

struct SelfReportEntry: Codable, Identifiable {
    let id: UUID
    let date: Date
    let appId: String
    var estimatedMinutes: Int
    var dataEstimate: DataEstimate

    init(appId: String, estimatedMinutes: Int, dataEstimate: DataEstimate, date: Date = Date()) {
        self.id = UUID()
        self.date = date
        self.appId = appId
        self.estimatedMinutes = estimatedMinutes
        self.dataEstimate = dataEstimate
    }
}
