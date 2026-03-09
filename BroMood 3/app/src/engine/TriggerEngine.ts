/**
 * TriggerEngine — evaluates mood state and sends contextual nudges.
 * expo-background-fetch and expo-task-manager are gracefully stubbed
 * for Expo Go testing (background tasks require a full native build).
 */

import * as Notifications from 'expo-notifications';
import { MoodSnapshot } from './MoodEngine';
import { NotificationEngine } from './NotificationEngine';
import {
  getNotificationCountToday,
  getLastNotificationForContext,
  logNotification,
} from '../db/queries';

// ─── Safe stubs for native-only modules ───────────────────────────────────────
// In Expo Go these modules aren't available — we stub them silently.
// In a full native build (eas build), the real modules will be used.
let BackgroundFetch: {
  BackgroundFetchResult: { NewData: string; Failed: string; NoData: string };
  registerTaskAsync: (name: string, opts: object) => Promise<void>;
  unregisterTaskAsync: (name: string) => Promise<void>;
};
let TaskManager: {
  defineTask: (name: string, fn: () => Promise<unknown>) => void;
};
try {
  BackgroundFetch = require('expo-background-fetch');
  TaskManager = require('expo-task-manager');
} catch {
  BackgroundFetch = {
    BackgroundFetchResult: { NewData: 'newData', Failed: 'failed', NoData: 'noData' },
    registerTaskAsync: async () => {},
    unregisterTaskAsync: async () => {},
  };
  TaskManager = { defineTask: () => {} };
}

const TASK_NAME = 'bromood-trigger-evaluation';
const EVALUATION_INTERVAL = 6 * 60 * 60;

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
  cooldown: number;
  priority: number;
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

async function canSendNotification(snapshot: MoodSnapshot, rule: TriggerRule): Promise<boolean> {
  try {
    const todayCount = await getNotificationCountToday();
    if (rule.priority === 0) return todayCount < 3;
    if (snapshot.score < 3) {
      if (todayCount >= 2) return false;
    } else {
      if (todayCount >= 1) return false;
    }
    const lastSent = await getLastNotificationForContext(rule.id);
    if (lastSent !== null && Date.now() - lastSent < rule.cooldown) return false;
    return true;
  } catch {
    return false;
  }
}

export async function evaluateTriggers(snapshot: MoodSnapshot): Promise<void> {
  const sorted = [...TRIGGER_RULES].sort((a, b) => a.priority - b.priority);
  for (const rule of sorted) {
    if (!rule.condition(snapshot)) continue;
    if (!(await canSendNotification(snapshot, rule))) continue;
    const actions = Array.isArray(rule.action) ? rule.action : [rule.action];
    for (const action of actions) {
      await executeAction(action, snapshot, rule.id);
    }
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
      await logNotification(triggerId, notification.body);
      break;
    }
    case 'SHOW_EMERGENCY_BANNER_IN_APP': {
      await logNotification(triggerId, 'EMERGENCY_BANNER');
      break;
    }
  }
}

async function sendPushNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data },
      trigger: null,
    });
  } catch { /* ignore */ }
}

TaskManager.defineTask(TASK_NAME, async () => {
  try {
    const { useMoodStore } = await import('../store/moodStore');
    const snapshot = useMoodStore.getState().currentSnapshot;
    if (snapshot) await evaluateTriggers(snapshot);
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export const TriggerEngine = {
  async startBackgroundEvaluation(): Promise<void> {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return;
      await BackgroundFetch.registerTaskAsync(TASK_NAME, {
        minimumInterval: EVALUATION_INTERVAL,
        stopOnTerminate: false,
        startOnBoot: true,
      });
    } catch { /* Expo Go: silently skip */ }
  },

  async stopBackgroundEvaluation(): Promise<void> {
    try {
      await BackgroundFetch.unregisterTaskAsync(TASK_NAME);
    } catch { /* ignore */ }
  },

  evaluateTriggers,
};