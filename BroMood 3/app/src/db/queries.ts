/**
 * Database queries — typed helpers
 * Uses plain types — no expo-sqlite imports (babel aliases it to mock anyway)
 */

import { db } from './schema';
import * as Crypto from 'expo-crypto';

// Plain SQL arg type — no expo-sqlite import needed
type SQLArg = string | number | null;

// ── Helpers ───────────────────────────────────────────────────────────────────

function queryAll<T>(sql: string, args: SQLArg[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx: any) => {
        tx.executeSql(
          sql,
          args,
          (_tx: any, result: any) => {
            const rows: T[] = [];
            for (let i = 0; i < result.rows.length; i++) {
              rows.push(result.rows.item(i) as T);
            }
            resolve(rows);
          },
          (_tx: any, error: any) => { reject(error); return false; }
        );
      },
      (error: any) => reject(error)
    );
  });
}

function execute(sql: string, args: SQLArg[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx: any) => { tx.executeSql(sql, args); },
      (error: any) => reject(error),
      () => resolve()
    );
  });
}

function executeMany(statements: { sql: string; args: SQLArg[] }[]): Promise<void> {
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx: any) => {
        for (const { sql, args } of statements) {
          tx.executeSql(sql, args);
        }
      },
      (error: any) => reject(error),
      () => resolve()
    );
  });
}

// ── Mood Logs ─────────────────────────────────────────────────────────────────

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

export async function insertMoodLog(log: Omit<MoodLog, 'id'>): Promise<void> {
  const id = Crypto.randomUUID();
  await execute(
    `INSERT INTO mood_logs (id, mood_score, keystroke_score, app_usage_score,
      circadian_score, social_withdrawal_score, journal_sentiment_score,
      detected_themes, urgency_flag, logged_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, log.mood_score, log.keystroke_score ?? null,
      log.app_usage_score ?? null, log.circadian_score ?? null,
      log.social_withdrawal_score ?? null, log.journal_sentiment_score ?? null,
      log.detected_themes ?? null, log.urgency_flag, log.logged_at,
    ]
  );
}

export async function getMoodLogs(days = 30): Promise<MoodLog[]> {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  return queryAll<MoodLog>(
    `SELECT * FROM mood_logs WHERE logged_at >= ? ORDER BY logged_at ASC`,
    [since]
  );
}

// ── Task Progress ─────────────────────────────────────────────────────────────

export async function markTaskCompleted(taskId: string, xp: number): Promise<void> {
  // Guard: already done today → skip entirely (prevents double XP)
  const doneToday = await getCompletedTaskIds();
  if (doneToday.includes(taskId)) return;

  const id  = Crypto.randomUUID();
  const now = Date.now();

  // Streak logic
  const stats     = await getUserStats();
  const today     = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = today.getTime() - 86_400_000;
  const lastAt    = (stats as any)?.last_task_completed_at as number ?? 0;

  let newStreak = stats?.streak_days ?? 0;
  if (!lastAt || lastAt < yesterday) {
    newStreak = 1;                                      // streak broken
  } else if (lastAt >= yesterday && lastAt < today.getTime()) {
    newStreak = (stats?.streak_days ?? 0) + 1;          // consecutive day
  }
  // lastAt >= today → same day, streak unchanged

  await executeMany([
    {
      sql: `INSERT OR IGNORE INTO task_progress (id, task_id, completed, xp_earned, completed_at)
            VALUES (?, ?, ?, ?, ?)`,
      args: [id, taskId, 1, xp, now],
    },
    {
      sql: `UPDATE user_stats
            SET total_xp = total_xp + ?,
                last_task_completed_at = ?,
                streak_days = ?
            WHERE id = ?`,
      args: [xp, now, newStreak, 'singleton'],
    },
  ]);
  await updateUserLevel();
}

/** XP earned from tasks completed TODAY */
export async function getTodayXP(): Promise<number> {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  // Avoid literal value in WHERE — only filter by date
  const rows = await queryAll<{ task_id: string; xp_earned: number }>(
    `SELECT task_id, xp_earned FROM task_progress WHERE completed_at >= ?`,
    [today.getTime()]
  );
  // Deduplicate by task_id and sum
  const seen = new Set<string>();
  let total = 0;
  for (const r of rows) {
    if (!seen.has(r.task_id)) { seen.add(r.task_id); total += Number(r.xp_earned ?? 0); }
  }
  return total;
}

/** Last 7 days as booleans (true = at least 1 task completed that day) */
export async function getStreakCalendar(): Promise<boolean[]> {
  const result: boolean[] = [];
  for (let i = 6; i >= 0; i--) {
    const d    = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
    const next = d.getTime() + 86_400_000;
    const rows = await queryAll<{ task_id: string }>(
      `SELECT task_id FROM task_progress WHERE completed_at >= ? AND completed_at < ?`,
      [d.getTime(), next]
    );
    result.push(rows.length > 0);
  }
  return result;
}

export async function getCompletedTaskIds(): Promise<string[]> {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  // Only filter by date — `completed = 1` is a literal that breaks the mock parseWhere
  const rows = await queryAll<{ task_id: string }>(
    `SELECT task_id FROM task_progress WHERE completed_at >= ?`,
    [today.getTime()]
  );
  return [...new Set(rows.map(r => r.task_id))];
}

// ── User Stats ────────────────────────────────────────────────────────────────

export interface UserStats {
  total_xp: number;
  current_level: string;
  streak_days: number;
  badges: string;
}

export const LEVELS = [
  { min: 0,    max: 100,      title: 'Naya Bro'       },
  { min: 101,  max: 300,      title: 'Seekhta Bro'    },
  { min: 301,  max: 600,      title: 'Resilient Bro'  },
  { min: 601,  max: 1000,     title: 'Bro of Steel'   },
  { min: 1001, max: Infinity, title: 'Legend 🏆'      },
];

export function getLevelForXP(xp: number): string {
  return LEVELS.find(l => xp >= l.min && xp <= l.max)?.title ?? 'Naya Bro';
}

async function updateUserLevel(): Promise<void> {
  const stats = await getUserStats();
  if (!stats) return;
  const level = getLevelForXP(stats.total_xp);
  await execute(
    `UPDATE user_stats SET current_level = ? WHERE id = ?`,
    [level, 'singleton']
  );
}

export async function getUserStats(): Promise<UserStats | null> {
  const rows = await queryAll<UserStats>(
    `SELECT total_xp, current_level, streak_days, badges FROM user_stats WHERE id = ?`,
    ['singleton']
  );
  return rows[0] ?? null;
}

// ── Notification Log ──────────────────────────────────────────────────────────

export async function getNotificationCountToday(): Promise<number> {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const rows = await queryAll<{ count: number }>(
    `SELECT COUNT(*) as count FROM notification_log WHERE sent_at >= ?`,
    [since.getTime()]
  );
  return rows[0]?.count ?? 0;
}

export async function logNotificationSent(contextType: string, message: string): Promise<void> {
  const id = Crypto.randomUUID();
  await execute(
    `INSERT INTO notification_log (id, context_type, message, sent_at) VALUES (?, ?, ?, ?)`,
    [id, contextType, message, Date.now()]
  );
}

// ── Journal ───────────────────────────────────────────────────────────────────

export interface JournalEntry {
  id: string;
  content_encrypted: string;
  sentiment: string | null;
  created_at: number;
}

export async function insertJournalEntry(content: string, sentiment?: string): Promise<void> {
  const id = Crypto.randomUUID();
  await execute(
    `INSERT INTO journal_entries (id, content_encrypted, sentiment, created_at) VALUES (?, ?, ?, ?)`,
    [id, content, sentiment ?? null, Date.now()]
  );
}

export async function getJournalEntries(limit = 20): Promise<JournalEntry[]> {
  return queryAll<JournalEntry>(
    `SELECT * FROM journal_entries ORDER BY created_at DESC LIMIT ?`,
    [limit]
  );
}

// ── Chat Messages ─────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  chat_mode: string;
  created_at: number;
}

export async function insertChatMessage(role: string, content: string, mode: string): Promise<void> {
  const id = Crypto.randomUUID();
  await execute(
    `INSERT INTO chat_messages (id, role, content, chat_mode, created_at) VALUES (?, ?, ?, ?, ?)`,
    [id, role, content, mode, Date.now()]
  );
}

export async function getChatHistory(limit = 50): Promise<ChatMessage[]> {
  return queryAll<ChatMessage>(
    `SELECT * FROM chat_messages ORDER BY created_at ASC LIMIT ?`,
    [limit]
  );
}

// ── Reset (dev/testing) ───────────────────────────────────────────────────────

export async function resetAllData(): Promise<void> {
  await executeMany([
    { sql: `DELETE FROM mood_logs`,        args: [] },
    { sql: `DELETE FROM task_progress`,    args: [] },
    { sql: `DELETE FROM journal_entries`,  args: [] },
    { sql: `DELETE FROM chat_messages`,    args: [] },
    { sql: `DELETE FROM notification_log`, args: [] },
    { sql: `UPDATE user_stats SET total_xp = 0, current_level = 'Naya Bro', streak_days = 0, badges = '[]' WHERE id = ?`, args: ['singleton'] },
  ]);
}