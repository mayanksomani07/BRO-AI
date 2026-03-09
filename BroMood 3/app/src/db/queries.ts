import { db } from './schema';
import * as Crypto from 'expo-crypto';
import * as SQLite from 'expo-sqlite';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function queryAll<T>(sql: string, args: SQLite.SQLStatementArg[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        tx.executeSql(sql, args, (_tx, result) => {
          const rows: T[] = [];
          for (let i = 0; i < result.rows.length; i++) {
            rows.push(result.rows.item(i) as T);
          }
          resolve(rows);
        });
      },
      (error) => reject(error)
    );
  });
}

function execute(sql: string, args: SQLite.SQLStatementArg[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => { tx.executeSql(sql, args); },
      (error) => reject(error),
      () => resolve()
    );
  });
}

function executeMany(statements: { sql: string; args: SQLite.SQLStatementArg[] }[]): Promise<void> {
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        for (const { sql, args } of statements) {
          tx.executeSql(sql, args);
        }
      },
      (error) => reject(error),
      () => resolve()
    );
  });
}

// ─── Mood Logs ────────────────────────────────────────────────────────────────

export interface MoodLog {
  id: string;
  mood_score: number;
  keystroke_score: number | null;
  app_usage_score: number | null;
  circadian_score: number | null;
  social_withdrawal_score: number | null;
  journal_sentiment_score: number | null;
  detected_themes: string | null;
  urgency_flag: number;
  logged_at: number;
}

export async function insertMoodLog(data: Omit<MoodLog, 'id'>): Promise<void> {
  const id = Crypto.randomUUID();
  await execute(
    `INSERT INTO mood_logs (id, mood_score, keystroke_score, app_usage_score, circadian_score,
     social_withdrawal_score, journal_sentiment_score, detected_themes, urgency_flag, logged_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.mood_score, data.keystroke_score, data.app_usage_score, data.circadian_score,
     data.social_withdrawal_score, data.journal_sentiment_score, data.detected_themes,
     data.urgency_flag, data.logged_at]
  );
}

export async function getMoodLogs(days = 30): Promise<MoodLog[]> {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  return queryAll<MoodLog>(
    `SELECT * FROM mood_logs WHERE logged_at >= ? ORDER BY logged_at ASC`, [since]
  );
}

export async function getLatestMoodLog(): Promise<MoodLog | null> {
  const rows = await queryAll<MoodLog>(
    `SELECT * FROM mood_logs ORDER BY logged_at DESC LIMIT 1`
  );
  return rows[0] ?? null;
}

// ─── Journal ──────────────────────────────────────────────────────────────────

export interface JournalEntry {
  id: string;
  content_encrypted: string;
  sentiment: string | null;
  detected_themes: string | null;
  mood_score_at_time: number | null;
  created_at: number;
}

export async function insertJournalEntry(data: Omit<JournalEntry, 'id'>): Promise<string> {
  const id = Crypto.randomUUID();
  await execute(
    `INSERT INTO journal_entries (id, content_encrypted, sentiment, detected_themes, mood_score_at_time, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, data.content_encrypted, data.sentiment ?? null, data.detected_themes ?? null,
     data.mood_score_at_time ?? null, data.created_at]
  );
  return id;
}

export async function getJournalEntries(limit = 50): Promise<JournalEntry[]> {
  return queryAll<JournalEntry>(
    `SELECT * FROM journal_entries ORDER BY created_at DESC LIMIT ?`, [limit]
  );
}

export async function deleteJournalEntry(id: string): Promise<void> {
  await execute(`DELETE FROM journal_entries WHERE id = ?`, [id]);
}

// ─── Chat Messages ────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  chat_mode: string;
  urgency_flag: number;
  sent_at: number;
}

export async function insertChatMessage(data: Omit<ChatMessage, 'id'>): Promise<void> {
  const id = Crypto.randomUUID();
  await execute(
    `INSERT INTO chat_messages (id, role, content, chat_mode, urgency_flag, sent_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, data.role, data.content, data.chat_mode, data.urgency_flag, data.sent_at]
  );
}

export async function getChatHistory(limit = 100): Promise<ChatMessage[]> {
  return queryAll<ChatMessage>(
    `SELECT * FROM chat_messages ORDER BY sent_at ASC LIMIT ?`, [limit]
  );
}

export async function clearChatHistory(): Promise<void> {
  await execute(`DELETE FROM chat_messages`);
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export interface TaskProgress {
  id: string;
  task_id: string;
  completed: number;
  xp_earned: number;
  completed_at: number | null;
}

export async function markTaskCompleted(taskId: string, xp: number): Promise<void> {
  const id = Crypto.randomUUID();
  await executeMany([
    {
      sql: `INSERT OR REPLACE INTO task_progress (id, task_id, completed, xp_earned, completed_at) VALUES (?, ?, 1, ?, ?)`,
      args: [id, taskId, xp, Date.now()],
    },
    {
      sql: `UPDATE user_stats SET total_xp = total_xp + ?, last_task_completed_at = ? WHERE id = 'singleton'`,
      args: [xp, Date.now()],
    },
  ]);
  await updateUserLevel();
}

export async function getCompletedTaskIds(): Promise<string[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rows = await queryAll<{ task_id: string }>(
    `SELECT task_id FROM task_progress WHERE completed = 1 AND completed_at >= ?`,
    [today.getTime()]
  );
  return rows.map(r => r.task_id);
}

// ─── User Stats ───────────────────────────────────────────────────────────────

export interface UserStats {
  total_xp: number;
  current_level: string;
  streak_days: number;
  badges: string;
}

export const LEVELS = [
  { min: 0,    max: 100,      title: 'Naya Bro' },
  { min: 101,  max: 300,      title: 'Seekhta Bro' },
  { min: 301,  max: 600,      title: 'Resilient Bro' },
  { min: 601,  max: 1000,     title: 'Bro of Steel' },
  { min: 1001, max: Infinity, title: 'Legend 🏆' },
];

export function getLevelForXP(xp: number): string {
  return LEVELS.find(l => xp >= l.min && xp <= l.max)?.title ?? 'Naya Bro';
}

async function updateUserLevel(): Promise<void> {
  const stats = await getUserStats();
  if (!stats) return;
  const level = getLevelForXP(stats.total_xp);
  await execute(
    `UPDATE user_stats SET current_level = ? WHERE id = 'singleton'`, [level]
  );
}

export async function getUserStats(): Promise<UserStats | null> {
  const rows = await queryAll<UserStats>(
    `SELECT total_xp, current_level, streak_days, badges FROM user_stats WHERE id = 'singleton'`
  );
  return rows[0] ?? null;
}

// ─── Notification Helpers (used by TriggerEngine) ────────────────────────────

export async function getNotificationCountToday(): Promise<number> {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const rows = await queryAll<{ count: number }>(
    `SELECT COUNT(*) as count FROM notification_log WHERE sent_at >= ?`, [since.getTime()]
  );
  return rows[0]?.count ?? 0;
}

export async function getLastNotificationForContext(contextType: string): Promise<number | null> {
  const rows = await queryAll<{ sent_at: number }>(
    `SELECT sent_at FROM notification_log WHERE context_type = ? ORDER BY sent_at DESC LIMIT 1`,
    [contextType]
  );
  return rows[0]?.sent_at ?? null;
}

export async function logNotification(contextType: string, message: string): Promise<void> {
  const id = Crypto.randomUUID();
  await execute(
    `INSERT INTO notification_log (id, context_type, message, sent_at) VALUES (?, ?, ?, ?)`,
    [id, contextType, message, Date.now()]
  );
}

// ─── Wipe / Export ────────────────────────────────────────────────────────────

export async function wipeAllData(): Promise<void> {
  await executeMany([
    { sql: `DELETE FROM mood_logs`, args: [] },
    { sql: `DELETE FROM keystroke_sessions`, args: [] },
    { sql: `DELETE FROM journal_entries`, args: [] },
    { sql: `DELETE FROM chat_messages`, args: [] },
    { sql: `DELETE FROM task_progress`, args: [] },
    { sql: `DELETE FROM notification_log`, args: [] },
    { sql: `DELETE FROM app_sessions`, args: [] },
    { sql: `UPDATE user_stats SET total_xp = 0, current_level = 'Naya Bro', streak_days = 0, badges = '[]'`, args: [] },
  ]);
}

export async function exportAllData(): Promise<object> {
  const [moods, journal, chat, tasks, stats] = await Promise.all([
    getMoodLogs(90),
    getJournalEntries(200),
    getChatHistory(500),
    queryAll('SELECT * FROM task_progress'),
    getUserStats(),
  ]);
  return { moods, journal, chat, tasks, stats, exportedAt: new Date().toISOString() };
}