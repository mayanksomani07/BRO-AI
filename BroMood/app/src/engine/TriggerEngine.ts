/**
 * TriggerEngine — evaluates mood state every 6 hours and sends contextual nudges.
 * Enforces strict notification limits (max 1/day under normal, 2/day critical).
 */

import * as Notifications from 'expo-notifications';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { MoodSnapshot } from './MoodEngine';
import { NotificationEngine } from './NotificationEngine';
import { db } from '../db/schema';

const TASK_NAME = 'bromood-trigger-evaluation';
const EVALUATION_INTERVAL = 6 * 60 * 60; // 6 hours in seconds

export type TriggerAction =
  | 'SEND_CRITICAL_NUDGE'
  | 'OFFER_CHAT'
  | 'SHOW_EMERGENCY_BANNER_IN_APP'
  | 'SEND_EMERGENCY_NOTIFICATION'
  | 'SEND_CELEBRATION_NOTIFICATION';

export interface TriggerRule {
  id: string;
  condition: (snapshot: MoodSnapshot) => boolean;
  action: TriggerAction | TriggerAction[];
  cooldown: number; // ms
  priority: number; // lower = higher priority
}

export const TRIGGER_RULES: TriggerRule[] = [
  {
    id: 'emergency_zone',
    condition: (s) => s.score < 2 || s.urgencyFlag,
    action: ['SHOW_EMERGENCY_BANNER_IN_APP', 'SEND_EMERGENCY_NOTIFICATION'],
    cooldown: 6 * 60 * 60 * 1000,
    priority: 0,
  },
  {
    id: 'critical_night',
    condition: (s) => s.score < 3 && isLateNight(),
    action: 'SEND_CRITICAL_NUDGE',
    cooldown: 24 * 60 * 60 * 1000,
    priority: 1,
  },
  {
    id: 'social_isolation',
    condition: (s) => s.score < 3.5 && s.signals.socialWithdrawal < 4,
    action: 'OFFER_CHAT',
    cooldown: 12 * 60 * 60 * 1000,
    priority: 2,
  },
  {
    id: 'improvement_celebrate',
    condition: (s) => s.trendSlope > 0.3 && s.consecutiveImprovingDays >= 5,
    action: 'SEND_CELEBRATION_NOTIFICATION',
    cooldown: 7 * 24 * 60 * 60 * 1000,
    priority: 3,
  },
];

function isLateNight(): boolean {
  const hour = new Date().getHours();
  return hour >= 22 || hour <= 5;
}

async function getNotificationsToday(): Promise<number> {
  try {
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const rows = await db.getAllAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM notification_log WHERE sent_at >= ?`,
      [since.getTime()]
    );
    return rows[0]?.count ?? 0;
  } catch {
    return 0;
  }
}

async function getLastNotificationForTrigger(triggerId: string): Promise<number | null> {
  try {
    const rows = await db.getAllAsync<{ sent_at: number }>(
      `SELECT sent_at FROM notification_log WHERE context_type = ? ORDER BY sent_at DESC LIMIT 1`,
      [triggerId]
    );
    return rows[0]?.sent_at ?? null;
  } catch {
    return null;
  }
}

async function logNotificationSent(triggerId: string, message: string): Promise<void> {
  await db.runAsync(
    `INSERT INTO notification_log (id, context_type, message, sent_at) VALUES (?, ?, ?, ?)`,
    [crypto.randomUUID(), triggerId, message, Date.now()]
  );
}

async function canSendNotification(
  snapshot: MoodSnapshot,
  rule: TriggerRule
): Promise<boolean> {
  const todayCount = await getNotificationsToday();
  const isEmergency = rule.priority === 0;

  // Emergency bypass — max 3/day
  if (isEmergency) return todayCount < 3;

  // Critical: max 2/day
  if (snapshot.score < 3) {
    if (todayCount >= 2) return false;
  } else {
    // Normal: max 1/day
    if (todayCount >= 1) return false;
  }

  // Check cooldown for this specific trigger
  const lastSent = await getLastNotificationForTrigger(rule.id);
  if (lastSent !== null && Date.now() - lastSent < rule.cooldown) return false;

  return true;
}

export async function evaluateTriggers(snapshot: MoodSnapshot): Promise<void> {
  // Sort by priority
  const sorted = [...TRIGGER_RULES].sort((a, b) => a.priority - b.priority);

  for (const rule of sorted) {
    if (!rule.condition(snapshot)) continue;
    if (!(await canSendNotification(snapshot, rule))) continue;

    const actions = Array.isArray(rule.action) ? rule.action : [rule.action];

    for (const action of actions) {
      await executeAction(action, snapshot, rule.id);
    }

    // Only execute the highest-priority matching trigger for notifications
    // Emergency can stack
    if (rule.priority > 0) break;
  }
}

async function executeAction(
  action: TriggerAction,
  snapshot: MoodSnapshot,
  triggerId: string
): Promise<void> {
  switch (action) {
    case 'SEND_CRITICAL_NUDGE':
    case 'OFFER_CHAT':
    case 'SEND_CELEBRATION_NOTIFICATION':
    case 'SEND_EMERGENCY_NOTIFICATION': {
      const notification = NotificationEngine.buildNotification(action, snapshot);
      await sendPushNotification(notification.title, notification.body, notification.data);
      await logNotificationSent(triggerId, notification.body);
      break;
    }
    case 'SHOW_EMERGENCY_BANNER_IN_APP': {
      // This is handled by useMoodStore — set emergency flag
      // The store will pick it up on next app foreground
      await logNotificationSent(triggerId, 'EMERGENCY_BANNER');
      break;
    }
  }
}

async function sendPushNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data, sound: 'nudge.wav' },
    trigger: null, // immediate
  });
}

// Background task registration
TaskManager.defineTask(TASK_NAME, async () => {
  try {
    const { useMoodStore } = await import('../store/moodStore');
    const snapshot = useMoodStore.getState().currentSnapshot;
    if (snapshot) {
      await evaluateTriggers(snapshot);
    }
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export const TriggerEngine = {
  async startBackgroundEvaluation(): Promise<void> {
    await Notifications.requestPermissionsAsync();
    await BackgroundFetch.registerTaskAsync(TASK_NAME, {
      minimumInterval: EVALUATION_INTERVAL,
      stopOnTerminate: false,
      startOnBoot: true,
    });
  },

  async stopBackgroundEvaluation(): Promise<void> {
    await BackgroundFetch.unregisterTaskAsync(TASK_NAME);
  },

  evaluateTriggers,
};
