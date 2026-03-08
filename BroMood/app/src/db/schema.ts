/**
 * SQLite Database Schema — all data stays on device
 * Journal entries encrypted with AES-256
 */

import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('bromood.db');

export async function initDatabase(): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT,
      language TEXT DEFAULT 'hinglish',
      baseline_sleep_time TEXT,
      onboarding_completed INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mood_logs (
      id TEXT PRIMARY KEY,
      mood_score REAL NOT NULL,
      keystroke_score REAL,
      app_usage_score REAL,
      circadian_score REAL,
      social_withdrawal_score REAL,
      journal_sentiment_score REAL,
      detected_themes TEXT,
      urgency_flag INTEGER DEFAULT 0,
      logged_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS keystroke_sessions (
      id TEXT PRIMARY KEY,
      avg_typing_speed REAL,
      backspace_rate REAL,
      pause_count INTEGER,
      typing_irregularity REAL,
      deletion_bursts INTEGER,
      session_duration INTEGER,
      recorded_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY,
      content_encrypted TEXT,
      sentiment TEXT,
      detected_themes TEXT,
      mood_score_at_time REAL,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      role TEXT CHECK(role IN ('user', 'assistant')),
      content TEXT,
      chat_mode TEXT,
      urgency_flag INTEGER DEFAULT 0,
      sent_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS task_progress (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      xp_earned INTEGER DEFAULT 0,
      completed_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS notification_log (
      id TEXT PRIMARY KEY,
      context_type TEXT,
      message TEXT,
      sent_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_sessions (
      id TEXT PRIMARY KEY,
      opened_at INTEGER,
      closed_at INTEGER,
      is_late_night INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS user_stats (
      id TEXT PRIMARY KEY DEFAULT 'singleton',
      total_xp INTEGER DEFAULT 0,
      current_level TEXT DEFAULT 'Naya Bro',
      streak_days INTEGER DEFAULT 0,
      badges TEXT DEFAULT '[]',
      last_task_completed_at INTEGER
    );

    INSERT OR IGNORE INTO user_stats (id) VALUES ('singleton');
  `);
}

export async function cleanupOldData(): Promise<void> {
  const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  await db.execAsync(`
    DELETE FROM mood_logs WHERE logged_at < ${ninetyDaysAgo};
    DELETE FROM keystroke_sessions WHERE recorded_at < ${thirtyDaysAgo};
    DELETE FROM notification_log WHERE sent_at < ${thirtyDaysAgo};
    DELETE FROM app_sessions WHERE opened_at < ${thirtyDaysAgo};
  `);
}
