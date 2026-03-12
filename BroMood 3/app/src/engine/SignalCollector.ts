/**
 * SignalCollector — gathers all measurable signals that work in Expo Go.
 *
 * WHAT WORKS IN EXPO GO (no native build needed):
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ Signal               │ Method                │ Accuracy          │
 * ├─────────────────────────────────────────────────────────────────┤
 * │ Circadian rhythm     │ App open time vs       │ ★★★★ Very good   │
 * │                      │ baseline sleep time    │                   │
 * │ Typing dynamics      │ In-app chat/journal    │ ★★★ Good         │
 * │                      │ TextInput timing       │                   │
 * │ App usage pattern    │ Time spent in-app,     │ ★★★ Good         │
 * │                      │ screens visited        │                   │
 * │ Self-report (check-in)│ Daily 3-question UX  │ ★★★★★ Accurate   │
 * │ Journal sentiment    │ Gemini NLP analysis    │ ★★★★★ Very good  │
 * │ Chat sentiment       │ Gemini NLP analysis    │ ★★★★★ Very good  │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * WHAT NEEDS NATIVE BUILD (not available Expo Go):
 * - HealthKit sleep data
 * - Cross-app keyboard dynamics
 * - Screen time API
 * - WhatsApp/Instagram session tracking
 */

import { AppState, AppStateStatus } from 'react-native';

// ─── App Session Tracker ───────────────────────────────────────────────────────

interface AppSession {
  openedAt: number;
  openHour: number;
  durationMs?: number;
}

const sessionHistory: AppSession[] = [];
let currentSession: AppSession | null = null;

export function startAppSession(): void {
  const now = new Date();
  currentSession = {
    openedAt: Date.now(),
    openHour: now.getHours(),
  };
  sessionHistory.push(currentSession);
  if (sessionHistory.length > 50) sessionHistory.shift();
}

export function endAppSession(): void {
  if (currentSession) {
    currentSession.durationMs = Date.now() - currentSession.openedAt;
  }
  currentSession = null;
}

/**
 * Circadian score based on when the user opens the app.
 * Baseline: user-reported sleep time from onboarding.
 * Signal: deviation from that baseline.
 */
export function computeCircadianFromSessions(baselineSleepKey: string): number {
  // Map onboarding sleep time selection to hour
  const baselineHours: Record<string, number> = {
    early: 22,    // Before 10 PM
    normal: 23,   // 10 PM – 12 AM
    late: 1,      // 12 AM – 2 AM
    very_late: 3, // After 2 AM
  };
  const baselineHour = baselineHours[baselineSleepKey] ?? 23;

  if (sessionHistory.length === 0) return 7.5;

  // Check last 7 days of sessions for late-night usage
  const recentSessions = sessionHistory.slice(-20);
  const lateNightSessions = recentSessions.filter(s => {
    const h = s.openHour;
    return h >= 0 && h <= 5; // Midnight to 5 AM
  });

  let score = 10.0;

  // Late night sessions → circadian disruption
  const lateRatio = lateNightSessions.length / Math.max(recentSessions.length, 1);
  if (lateRatio > 0.4) score -= 3.5;
  else if (lateRatio > 0.25) score -= 2.0;
  else if (lateRatio > 0.1) score -= 1.0;

  // Right NOW is late night?
  const currentHour = new Date().getHours();
  const isLateNightNow = currentHour >= 0 && currentHour <= 5;
  if (isLateNightNow) score -= 1.5;

  // Sleeping late relative to their own stated baseline
  if (currentHour >= 22) {
    const hoursDeviation = Math.max(0, currentHour - baselineHour);
    score -= Math.min(hoursDeviation * 0.5, 2.0);
  }

  return Math.max(1, Math.min(10, score));
}

// ─── In-App Typing Tracker ────────────────────────────────────────────────────

interface KeystrokeEvent {
  timestamp: number;
  isBackspace: boolean;
  charCount: number;
}

let keystrokeEvents: KeystrokeEvent[] = [];
let typingSessionStart: number | null = null;
let lastKeystrokeTime: number | null = null;

export function onTypingStart(): void {
  typingSessionStart = Date.now();
  keystrokeEvents = [];
  lastKeystrokeTime = null;
}

export function onKeystroke(text: string, prevText: string): void {
  const now = Date.now();
  const isBackspace = text.length < prevText.length;

  if (lastKeystrokeTime && now - lastKeystrokeTime > 3000) {
    // Long pause detected — record it implicitly via gap
  }

  keystrokeEvents.push({
    timestamp: now,
    isBackspace,
    charCount: text.length,
  });
  lastKeystrokeTime = now;
}

export function finishTypingSession(): {
  avgTypingSpeed: number;
  backspaceRate: number;
  pauseCount: number;
  typingIrregularity: number;
  deletionBursts: number;
  sessionDuration: number;
} | null {
  if (!typingSessionStart || keystrokeEvents.length < 5) return null;

  const duration = (Date.now() - typingSessionStart) / 1000; // seconds
  const totalKeys = keystrokeEvents.length;
  const backspaces = keystrokeEvents.filter(e => e.isBackspace).length;

  // Average typing speed (chars per second)
  const finalCharCount = keystrokeEvents[keystrokeEvents.length - 1]?.charCount ?? 0;
  const avgTypingSpeed = duration > 0 ? finalCharCount / duration : 0;

  // Backspace rate
  const backspaceRate = totalKeys > 0 ? backspaces / totalKeys : 0;

  // Inter-key intervals
  const intervals: number[] = [];
  for (let i = 1; i < keystrokeEvents.length; i++) {
    intervals.push(keystrokeEvents[i].timestamp - keystrokeEvents[i - 1].timestamp);
  }

  // Pause count (gaps > 2 seconds)
  const pauseCount = intervals.filter(iv => iv > 2000).length;

  // Typing irregularity (standard deviation of intervals, excluding pauses)
  const normalIntervals = intervals.filter(iv => iv < 2000);
  let typingIrregularity = 0;
  if (normalIntervals.length > 1) {
    const mean = normalIntervals.reduce((a, b) => a + b, 0) / normalIntervals.length;
    const variance = normalIntervals.reduce((sum, iv) => sum + Math.pow(iv - mean, 2), 0) / normalIntervals.length;
    typingIrregularity = Math.sqrt(variance);
  }

  // Deletion bursts (3+ consecutive backspaces)
  let deletionBursts = 0;
  let consecutiveBackspaces = 0;
  for (const e of keystrokeEvents) {
    if (e.isBackspace) {
      consecutiveBackspaces++;
      if (consecutiveBackspaces === 3) deletionBursts++;
    } else {
      consecutiveBackspaces = 0;
    }
  }

  typingSessionStart = null;
  keystrokeEvents = [];

  return {
    avgTypingSpeed,
    backspaceRate,
    pauseCount,
    typingIrregularity,
    deletionBursts,
    sessionDuration: duration * 1000,
  };
}

// ─── Daily Check-in Data ───────────────────────────────────────────────────────

export interface DailyCheckIn {
  energy: number;        // 1–5 slider
  socialness: number;    // 1–5 slider
  anxiety: number;       // 1–5 slider (5 = very anxious)
  sleep: number;         // 1–5 slider (5 = slept great)
  timestamp: number;
}

let todayCheckIn: DailyCheckIn | null = null;
let lastCheckInDate = '';

export function saveCheckIn(data: Omit<DailyCheckIn, 'timestamp'>): void {
  todayCheckIn = { ...data, timestamp: Date.now() };
  lastCheckInDate = new Date().toDateString();
}

export function needsCheckIn(): boolean {
  return lastCheckInDate !== new Date().toDateString();
}

export function getTodayCheckIn(): DailyCheckIn | null {
  return todayCheckIn;
}

/**
 * Convert check-in to mood signals (0–10 scale)
 */
export function checkInToSignals(checkIn: DailyCheckIn): {
  keystroke: number;
  appUsage: number;
  socialWithdrawal: number;
} {
  // Energy → typing speed proxy (low energy = slow typing = low score)
  const keystroke = Math.max(1, (checkIn.energy / 5) * 10 - (checkIn.anxiety / 5) * 3);

  // Sleep quality → app usage (poor sleep = more late night = lower score)
  const appUsage = Math.max(1, (checkIn.sleep / 5) * 10);

  // Socialness → social withdrawal (low socialness = withdrawal = lower score)
  const socialWithdrawal = Math.max(1, (checkIn.socialness / 5) * 10);

  return { keystroke, appUsage, socialWithdrawal };
}