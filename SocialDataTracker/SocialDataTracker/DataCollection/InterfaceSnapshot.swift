import Foundation

struct InterfaceSnapshot: Codable, Identifiable {
    let id: UUID
    let timestamp: Date
    let wifiSent: UInt64
    let wifiReceived: UInt64
    let cellularSent: UInt64
    let cellularReceived: UInt64

    init(timestamp: Date = Date(),
         wifiSent: UInt64, wifiReceived: UInt64,
         cellularSent: UInt64, cellularReceived: UInt64) {
        self.id = UUID()
        self.timestamp = timestamp
        self.wifiSent = wifiSent
        self.wifiReceived = wifiReceived
        self.cellularSent = cellularSent
        self.cellularReceived = cellularReceived
    }
}

struct DailyUsage: Identifiable {
    let id: UUID = UUID()
    let date: Date
    let wifiMB: Double
    let cellularMB: Double
    var totalMB: Double { wifiMB + cellularMB }

    var dayLabel: String {
        let f = DateFormatter()
        f.dateFormat = "EEE"
        return f.string(from: date)
    }
    var shortDate: String {
        let f = DateFormatter()
        f.dateFormat = "MMM d"
        return f.string(from: date)
    }
}

struct HourlyUsage: Identifiable {
    let id: UUID = UUID()
    let hour: Date
    let wifiMB: Double
    let cellularMB: Double
    var totalMB: Double { wifiMB + cellularMB }

    var hourLabel: String {
        let f = DateFormatter()
        f.dateFormat = "ha"
        return f.string(from: hour)
    }
}
