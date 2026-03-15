// DatabaseManager.swift
// GRDB SQLite database. Auto-sets up on first access — safe to call from any context.

import Foundation
import GRDB

final class DatabaseManager {

    static let shared = DatabaseManager()

    // Optional so we can guard safely instead of force-unwrap crashing
    private var dbQueue: DatabaseQueue?
    private var setupError: Error?
    private var isSetup = false

    private init() {
        // Set up immediately at init so dbQueue is ready before any view loads
        do {
            try performSetup()
        } catch {
            setupError = error
            print("[DatabaseManager] ⚠️ Setup failed: \(error). Will retry on next access.")
        }
    }

    // MARK: - Setup

    func setup() throws {
        guard !isSetup else { return }
        try performSetup()
    }

    private func performSetup() throws {
        var config = Configuration()
        config.prepareDatabase { db in
            try db.execute(sql: "PRAGMA journal_mode = WAL")
            try db.execute(sql: "PRAGMA synchronous = NORMAL")
        }

        let appSupport = FileManager.default
            .urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]

        try FileManager.default.createDirectory(
            at: appSupport,
            withIntermediateDirectories: true,
            attributes: nil
        )

        let dbPath = appSupport.appendingPathComponent("serenity.db").path
        let queue = try DatabaseQueue(path: dbPath, configuration: config)

        // Exclude from iCloud backup
        var dbURL = URL(fileURLWithPath: dbPath)
        var resourceValues = URLResourceValues()
        resourceValues.isExcludedFromBackup = true
        try? dbURL.setResourceValues(resourceValues)

        dbQueue = queue
        isSetup = true
        setupError = nil

        try runMigrations(queue: queue)
        print("[DatabaseManager] ✅ Ready at \(dbPath)")
    }

    // MARK: - Migrations

    private func runMigrations(queue: DatabaseQueue) throws {
        var migrator = DatabaseMigrator()

        migrator.registerMigration("v1_create_daily_feature_vector") { db in
            try db.create(table: "dailyFeatureVector", ifNotExists: true) { t in
                t.autoIncrementedPrimaryKey("id")
                t.column("date", .text).notNull().unique()
                t.column("unlockCountNorm", .double).notNull().defaults(to: 0.0)
                t.column("screenTimeNorm", .double).notNull().defaults(to: 0.0)
                t.column("socialAppRatio", .double).notNull().defaults(to: 0.0)
                t.column("typingWpmNorm", .double).notNull().defaults(to: 0.0)
                t.column("typingErrorRate", .double).notNull().defaults(to: 0.0)
                t.column("stepsNorm", .double).notNull().defaults(to: 0.0)
                t.column("stationaryHoursNorm", .double).notNull().defaults(to: 0.0)
                t.column("callCountNorm", .double).notNull().defaults(to: 0.0)
                t.column("callDurationNorm", .double).notNull().defaults(to: 0.0)
                t.column("contactDiversityNorm", .double).notNull().defaults(to: 0.0)
                t.column("sleepDurationNorm", .double).notNull().defaults(to: 0.0)
                t.column("sleepRegularity", .double).notNull().defaults(to: 0.5)
                t.column("leftHome", .double).notNull().defaults(to: 0.0)
                t.column("ambientDbNorm", .double).notNull().defaults(to: 0.5)
                t.column("chargeRegularity", .double).notNull().defaults(to: 0.5)
                t.column("rawMoodScore", .double).notNull().defaults(to: -1.0)
                t.column("zone", .text).notNull().defaults(to: "UNKNOWN")
                t.column("createdAt", .text).notNull()
            }
            try db.create(
                index: "idx_date",
                on: "dailyFeatureVector",
                columns: ["date"],
                ifNotExists: true
            )
        }

        try migrator.migrate(queue)
    }

    // MARK: - Safe queue accessor (retries setup if it previously failed)

    private func queue() throws -> DatabaseQueue {
        if let q = dbQueue { return q }
        // Retry setup if it failed at init (e.g. first launch timing issue)
        try performSetup()
        guard let q = dbQueue else {
            throw DatabaseError.setupFailed(setupError?.localizedDescription ?? "unknown")
        }
        return q
    }

    // MARK: - Write helpers

    func upsert(_ vector: DailyFeatureVector) throws {
        _ = try queue().write { db in
            try vector.save(db)
        }
    }

    // MARK: - Read helpers

    func fetchLast(days: Int) throws -> [DailyFeatureVector] {
        let q = try queue()
        return try q.read { db in
            let cutoff = Calendar.current.date(byAdding: .day, value: -days, to: Date())!
            return try DailyFeatureVector
                .filter(Column("date") >= cutoff.toISODate())
                .order(Column("date").desc)
                .fetchAll(db)
        }
    }

    func fetchAll() throws -> [DailyFeatureVector] {
        let q = try queue()
        return try q.read { db in
            try DailyFeatureVector
                .order(Column("date").desc)
                .fetchAll(db)
        }
    }

    // MARK: - Auto-purge

    func purgeOldData() throws {
        let cutoff = Calendar.current.date(byAdding: .day, value: -30, to: Date())!
        _ = try queue().write { db in
            try DailyFeatureVector
                .filter(Column("date") < cutoff.toISODate())
                .deleteAll(db)
        }
        print("[DatabaseManager] Purged data older than 30 days.")
    }

    // MARK: - Delete all

    func deleteAllData() throws {
        _ = try queue().write { db in
            try DailyFeatureVector.deleteAll(db)
        }
    }

    func totalRowCount() throws -> Int {
        let q = try queue()
        return try q.read { db in
            try DailyFeatureVector.fetchCount(db)
        }
    }
}

// MARK: - Custom error

enum DatabaseError: LocalizedError {
    case setupFailed(String)
    var errorDescription: String? {
        switch self {
        case .setupFailed(let reason): return "Database setup failed: \(reason)"
        }
    }
}