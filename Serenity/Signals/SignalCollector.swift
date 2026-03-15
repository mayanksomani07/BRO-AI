// SignalCollector.swift
// Protocol that all signal collectors conform to.
// Each collector is responsible for one domain of signals.

import Foundation

protocol SignalCollector {
    /// Collect signals and return a partial feature update block.
    /// The block mutates a DailyFeatureVector in place.
    func collect() async -> (inout DailyFeatureVector) -> Void
}

// MARK: - Signal collection result
/// Wraps the raw value + normalised float for logging/debugging
struct SignalReading {
    let name: String
    let raw: Double
    let normalised: Double
}
