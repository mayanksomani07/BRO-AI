// Extensions.swift
// Small utility extensions used throughout Serenity.

import Foundation

// MARK: - Array helpers
extension Array where Element == Double {
    var average: Double {
        guard !isEmpty else { return 0.0 }
        return reduce(0.0, +) / Double(count)
    }
}

extension Array {
    /// Splits array into chunks of the given size.
    func chunked(into size: Int) -> [[Element]] {
        guard size > 0 else { return [] }
        return stride(from: 0, to: count, by: size).map {
            Array(self[$0..<Swift.min($0 + size, count)])
        }
    }
}

// MARK: - Date helpers
extension Date {
    /// Returns ISO-8601 date string: "2025-11-15"
    func toISODate() -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        return formatter.string(from: self)
    }

    /// Returns ISO-8601 datetime string for timestamps
    func toISO() -> String {
        ISO8601DateFormatter().string(from: self)
    }

    /// Returns a Date from an ISO date string "yyyy-MM-dd"
    static func fromISODate(_ string: String) -> Date? {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        return formatter.date(from: string)
    }

    /// Start of this calendar day (midnight)
    var startOfDay: Date {
        Calendar.current.startOfDay(for: self)
    }

    /// Days since another date (positive = self is later)
    func daysSince(_ other: Date) -> Int {
        let components = Calendar.current.dateComponents([.day], from: other, to: self)
        return components.day ?? 0
    }
}

// MARK: - Double helpers
extension Double {
    /// Clamps value to [min, max]
    func clamped(to range: ClosedRange<Double>) -> Double {
        Swift.max(range.lowerBound, Swift.min(range.upperBound, self))
    }

    /// Normalises a value given a max. Clamps to 0.0–1.0
    func normalized(max: Double) -> Double {
        guard max > 0 else { return 0.0 }
        return (self / max).clamped(to: 0.0...1.0)
    }
}

// MARK: - UserDefaults convenience
extension UserDefaults {
    var lastAlertDate: Date? {
        get { object(forKey: "lastAlertDate") as? Date }
        set { set(newValue, forKey: "lastAlertDate") }
    }

    var didCompleteOnboarding: Bool {
        get { bool(forKey: "didCompleteOnboarding") }
        set { set(newValue, forKey: "didCompleteOnboarding") }
    }

    var signalToggles: [String: Bool] {
        get { dictionary(forKey: "signalToggles") as? [String: Bool] ?? [:] }
        set { set(newValue, forKey: "signalToggles") }
    }
}
