/**
 * KeystrokeAnalyzer — reads raw keystroke events from App Group shared storage
 * and computes KeystrokeMetrics for the MoodEngine.
 */

import * as SecureStore from 'expo-secure-store';
import { KeystrokeMetrics } from './MoodEngine';

export type KeyType = 'character' | 'backspace' | 'space' | 'delete' | 'return' | 'shift';

export interface KeystrokeEvent {
  timestamp: number;         // Unix ms
  keyType: KeyType;
  interKeyInterval: number;  // ms since last keypress
  sessionId: string;
}

export interface RawSession {
  sessionId: string;
  events: KeystrokeEvent[];
  recordedAt: number;
}

const SHARED_STORAGE_KEY = 'bromood.keystroke.sessions';
const PAUSE_THRESHOLD_MS = 2000;
const DELETION_BURST_SIZE = 3;

/**
 * Read raw session data from shared App Group storage (bridged via native module)
 * In production this reads from UserDefaults group.com.bromood.shared
 * Falls back to SecureStore for demo/development
 */
export async function readSharedKeystrokeSessions(): Promise<RawSession[]> {
  try {
    const raw = await SecureStore.getItemAsync(SHARED_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RawSession[];
  } catch {
    return [];
  }
}

export async function clearSharedKeystrokeSessions(): Promise<void> {
  await SecureStore.deleteItemAsync(SHARED_STORAGE_KEY);
}

export function computeMetricsFromSession(events: KeystrokeEvent[]): KeystrokeMetrics {
  if (!events.length) {
    return {
      avgTypingSpeed: 0,
      backspaceRate: 0,
      pauseCount: 0,
      typingIrregularity: 0,
      sessionDuration: 0,
      deletionBursts: 0,
    };
  }

  const totalKeys = events.length;
  const backspaceCount = events.filter(e =>
    e.keyType === 'backspace' || e.keyType === 'delete'
  ).length;
  const charCount = events.filter(e => e.keyType === 'character').length;

  // Session duration
  const sessionDuration = events[events.length - 1].timestamp - events[0].timestamp;
  const sessionDurationSeconds = Math.max(sessionDuration / 1000, 0.001);

  // Average typing speed (chars per second)
  const avgTypingSpeed = charCount / sessionDurationSeconds;

  // Backspace rate
  const backspaceRate = totalKeys > 0 ? backspaceCount / totalKeys : 0;

  // Inter-key intervals
  const intervals = events
    .map(e => e.interKeyInterval)
    .filter(i => i > 0 && i < 30000); // ignore outliers

  // Pause count (> 2s)
  const pauseCount = intervals.filter(i => i > PAUSE_THRESHOLD_MS).length;

  // Typing irregularity (std dev of intervals, excluding pauses)
  const shortIntervals = intervals.filter(i => i < PAUSE_THRESHOLD_MS);
  const typingIrregularity = shortIntervals.length > 1
    ? standardDeviation(shortIntervals)
    : 0;

  // Deletion bursts (3+ consecutive backspaces)
  let deletionBursts = 0;
  let consecutiveDels = 0;
  let burstOpen = false;
  for (const e of events) {
    if (e.keyType === 'backspace' || e.keyType === 'delete') {
      consecutiveDels++;
      if (consecutiveDels === DELETION_BURST_SIZE && !burstOpen) {
        deletionBursts++;
        burstOpen = true;
      }
    } else {
      consecutiveDels = 0;
      burstOpen = false;
    }
  }

  return {
    avgTypingSpeed: Math.round(avgTypingSpeed * 100) / 100,
    backspaceRate: Math.round(backspaceRate * 1000) / 1000,
    pauseCount,
    typingIrregularity: Math.round(typingIrregularity),
    sessionDuration,
    deletionBursts,
  };
}

function standardDeviation(values: number[]): number {
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - avg, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquaredDiff);
}

/**
 * Aggregate metrics across multiple recent sessions
 */
export function aggregateSessionMetrics(sessions: RawSession[]): KeystrokeMetrics | null {
  if (!sessions.length) return null;

  const allMetrics = sessions.map(s => computeMetricsFromSession(s.events));

  const avg = (key: keyof KeystrokeMetrics) =>
    allMetrics.reduce((sum, m) => sum + m[key], 0) / allMetrics.length;

  return {
    avgTypingSpeed: avg('avgTypingSpeed'),
    backspaceRate: avg('backspaceRate'),
    pauseCount: avg('pauseCount'),
    typingIrregularity: avg('typingIrregularity'),
    sessionDuration: avg('sessionDuration'),
    deletionBursts: avg('deletionBursts'),
  };
}
