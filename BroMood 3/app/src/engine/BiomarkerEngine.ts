/**
 * BiomarkerEngine — single source of truth for all digital biomarker signals.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  WHAT WORKS IN EXPO GO (no native build needed)                         │
 * ├──────────────────────────┬────────────────────────────┬─────────────────┤
 * │  Signal                  │  How we get it             │  Accuracy       │
 * ├──────────────────────────┼────────────────────────────┼─────────────────┤
 * │  1. Typing dynamics      │  Chat + Journal TextInput  │  ★★★★ Good     │
 * │  2. Circadian rhythm     │  App open timestamps       │  ★★★★ Good     │
 * │  3. Self-report check-in │  5-question daily UI       │  ★★★★★ Best    │
 * │  4. Journal sentiment    │  Gemini NLP (free tier)    │  ★★★★★ Best    │
 * │  5. Session frequency    │  App open count/day        │  ★★★ Moderate  │
 * ├──────────────────────────┼────────────────────────────┼─────────────────┤
 * │  NEEDS NATIVE BUILD                                                      │
 * ├──────────────────────────┼────────────────────────────┼─────────────────┤
 * │  Cross-app keyboard      │  iOS Keyboard Extension    │  ★★★★ Good     │
 * │  HealthKit sleep         │  expo-health (native)      │  ★★★★★ Best    │
 * │  Screen time             │  Screen Time API (native)  │  ★★★★★ Best    │
 * └──────────────────────────┴────────────────────────────┴─────────────────┘
 *
 * MOOD SCORE FORMULA (1–10 scale, weighted average):
 *   mood_score = (
 *     typing_score      * 0.25  ← energy, anxiety, rumination
 *     + sleep_score     * 0.20  ← circadian health
 *     + circadian_score * 0.20  ← late-night usage deviation
 *     + social_score    * 0.20  ← isolation vs connection
 *     + journal_score   * 0.15  ← NLP sentiment from written text
 *   )
 *
 *   Then apply temporal smoothing: 70% current + 30% yesterday
 *   Clamp to [1, 10]
 *
 * WHY 8.4 SHOWS AS DEFAULT:
 *   Without any real data, defaults are:
 *     typing=5.0  sleep=9.0(daytime)  circadian=10.0(daytime)
 *     social=10.0(no isolation)  journal=5.0
 *   → weighted avg ≈ 7.8  → temporal drift → ~8.4
 *   FIX: start all signals at 5.0 neutral until real data arrives.
 */

export interface TypingMetrics {
  // All measured in-app from chat/journal TextInput
  avgCharsPerSecond: number;   // Typing speed (2.0+ = energetic, <1.0 = low energy)
  backspaceRate: number;       // Backspaces / total keys (>0.25 = anxious/uncertain)
  pauseCount: number;          // Pauses >2s mid-sentence (>6 = ruminating/distracted)
  typingIrregularity: number;  // Std dev of inter-key intervals in ms (>600 = unstable)
  deletionBursts: number;      // 3+ consecutive backspaces = frustration burst
  sessionDurationSec: number;  // How long the typing session lasted
  totalCharacters: number;     // Total characters typed (low = disengaged)
}

export interface CircadianMetrics {
  openHour: number;            // Hour (0–23) when app was opened
  baselineHour: number;        // User's stated normal sleep time (from onboarding)
  lateNightRatio: number;      // % of recent sessions between 12 AM–5 AM
  consecutiveLateNights: number; // Days in a row with late-night opens
  isCurrentlyLateNight: boolean;
}

export interface SocialMetrics {
  selfReportedIsolation: 'none' | 'some' | 'severe';  // From check-in
  weeklySessionDrop: number;    // 0–1: how much messaging sessions dropped vs baseline
  responsesRejected: number;    // Calls/messages declined (requires permission)
}

export interface BiomarkerSignals {
  typing: number;        // 1–10
  sleep: number;         // 1–10
  circadian: number;     // 1–10
  social: number;        // 1–10
  journal: number;       // 1–10
  // Metadata for debug panel
  sources: Record<string, string>;       // signal → where data came from
  confidence: Record<string, 'high' | 'medium' | 'low' | 'simulated'>;
  rawMetrics: {
    typing?: Partial<TypingMetrics>;
    circadian?: Partial<CircadianMetrics>;
    social?: Partial<SocialMetrics>;
  };
}

// ─── In-App Typing Tracker ────────────────────────────────────────────────────
// Tracks typing in chat + journal TextInput components

interface KeyEvent { t: number; wasBackspace: boolean; charLen: number }

let _keyEvents: KeyEvent[] = [];
let _sessionStart: number | null = null;
let _lastKeyTime: number | null = null;

export function typingStart(): void {
  _sessionStart = Date.now();
  _keyEvents = [];
  _lastKeyTime = null;
}

export function typingKeystroke(newText: string, prevText: string): void {
  const now = Date.now();
  _keyEvents.push({
    t: now,
    wasBackspace: newText.length < prevText.length,
    charLen: newText.length,
  });
  _lastKeyTime = now;
}

export function typingFinish(): TypingMetrics | null {
  if (!_sessionStart || _keyEvents.length < 8) {
    _sessionStart = null;
    _keyEvents = [];
    return null;
  }

  const durationSec = (Date.now() - _sessionStart) / 1000;
  const total       = _keyEvents.length;
  const backspaces  = _keyEvents.filter(e => e.wasBackspace).length;
  const finalChars  = _keyEvents[_keyEvents.length - 1]?.charLen ?? 0;

  const intervals: number[] = [];
  for (let i = 1; i < _keyEvents.length; i++) {
    intervals.push(_keyEvents[i].t - _keyEvents[i - 1].t);
  }

  const pauseCount = intervals.filter(iv => iv > 2000).length;
  const shortIvs   = intervals.filter(iv => iv < 2000 && iv > 0);

  let typingIrregularity = 0;
  if (shortIvs.length > 1) {
    const mean     = shortIvs.reduce((a, b) => a + b, 0) / shortIvs.length;
    const variance = shortIvs.reduce((s, iv) => s + (iv - mean) ** 2, 0) / shortIvs.length;
    typingIrregularity = Math.sqrt(variance);
  }

  let deletionBursts = 0, consecDels = 0;
  for (const e of _keyEvents) {
    if (e.wasBackspace) { consecDels++; if (consecDels === 3) deletionBursts++; }
    else consecDels = 0;
  }

  const result: TypingMetrics = {
    avgCharsPerSecond:  durationSec > 0 ? finalChars / durationSec : 0,
    backspaceRate:      total > 0 ? backspaces / total : 0,
    pauseCount,
    typingIrregularity: Math.round(typingIrregularity),
    deletionBursts,
    sessionDurationSec: durationSec,
    totalCharacters:    finalChars,
  };

  _sessionStart = null;
  _keyEvents    = [];
  return result;
}

// ─── Signal Computers ─────────────────────────────────────────────────────────

/**
 * computeTypingScore — converts raw typing metrics → mood signal (1–10)
 *
 * Psychology basis:
 *  - Depressed people type slower (low energy, motor retardation)
 *  - Anxious people backspace more (self-doubt, perfectionism)
 *  - Ruminating people pause mid-sentence (intrusive thoughts interrupt flow)
 *  - Frustrated people do deletion bursts (impulsive editing)
 */
export function computeTypingScore(m: TypingMetrics): number {
  let score = 10.0;

  // Speed: chars/sec. Healthy typing ≈ 2–4 chars/sec
  if (m.avgCharsPerSecond < 0.5)      score -= 3.0; // very slow = very low energy
  else if (m.avgCharsPerSecond < 1.0) score -= 2.0;
  else if (m.avgCharsPerSecond < 1.5) score -= 1.0;
  else if (m.avgCharsPerSecond > 4.0) score -= 0.5; // frantic typing = agitated

  // Backspace rate: normal ≈ 5–10%. >25% = anxious/uncertain
  if (m.backspaceRate > 0.40)      score -= 3.0;
  else if (m.backspaceRate > 0.28) score -= 2.0;
  else if (m.backspaceRate > 0.18) score -= 1.0;
  else if (m.backspaceRate > 0.12) score -= 0.5;

  // Pauses >2s: >8 = heavily ruminating, mind keeps going elsewhere
  if (m.pauseCount > 10) score -= 2.0;
  else if (m.pauseCount > 6)  score -= 1.5;
  else if (m.pauseCount > 3)  score -= 0.8;

  // Deletion bursts: each burst = frustration micro-event
  score -= Math.min(m.deletionBursts * 0.4, 2.0);

  // Irregularity: std dev > 700ms = very distracted/unstable attention
  if (m.typingIrregularity > 800)      score -= 1.5;
  else if (m.typingIrregularity > 500) score -= 0.8;
  else if (m.typingIrregularity > 300) score -= 0.3;

  // Short session + few chars = disengaged (not trying)
  if (m.totalCharacters < 20 && m.sessionDurationSec > 10) score -= 1.0;

  return Math.max(1, Math.min(10, score));
}

/**
 * computeCircadianScore — app open time vs user's stated sleep baseline
 *
 * Circadian disruption is one of the strongest predictors of depression.
 * (Borbely 1982, Harvey 2011 — delayed sleep phase correlates with mood disorders)
 */
export function computeCircadianScore(
  sessionOpenHours: number[],   // last 14 session open hours
  baselineSleepKey: string,     // 'early'|'normal'|'late'|'very_late'
): CircadianMetrics & { score: number } {
  const baselineMap: Record<string, number> = {
    early: 22, normal: 23, late: 1, very_late: 3,
  };
  const baselineHour = baselineMap[baselineSleepKey] ?? 23;
  const currentHour  = new Date().getHours();

  const lateNightSessions = sessionOpenHours.filter(h => h >= 0 && h <= 5);
  const lateRatio = sessionOpenHours.length > 0
    ? lateNightSessions.length / sessionOpenHours.length
    : 0;

  // Count consecutive late nights (last N sessions all late-night)
  let consecutiveLate = 0;
  for (let i = sessionOpenHours.length - 1; i >= 0; i--) {
    const h = sessionOpenHours[i];
    if (h >= 0 && h <= 5) consecutiveLate++;
    else break;
  }

  let score = 10.0;

  // Late-night usage ratio penalty
  if (lateRatio > 0.5)       score -= 4.0;
  else if (lateRatio > 0.35) score -= 2.5;
  else if (lateRatio > 0.2)  score -= 1.5;
  else if (lateRatio > 0.1)  score -= 0.8;

  // Opening app right NOW at late night
  const isLateNightNow = currentHour >= 0 && currentHour <= 5;
  if (isLateNightNow) score -= 2.0;

  // Current hour deviation from baseline sleep time
  if (currentHour >= 22) {
    const deviation = Math.abs(currentHour - baselineHour);
    score -= Math.min(deviation * 0.4, 1.5);
  }

  // Consecutive late nights = habit forming = worse
  if (consecutiveLate >= 5) score -= 2.0;
  else if (consecutiveLate >= 3) score -= 1.0;

  const finalScore = Math.max(1, Math.min(10, score));

  return {
    openHour: currentHour,
    baselineHour,
    lateNightRatio: lateRatio,
    consecutiveLateNights: consecutiveLate,
    isCurrentlyLateNight: isLateNightNow,
    score: finalScore,
  };
}

/**
 * computeSleepScore — from daily check-in sleep quality answer (1–5 scale)
 *
 * Sleep deprivation is the most reliable physiological predictor of mood.
 * Even one bad night reduces positive affect by ~30% (Walker, 2017)
 */
export function computeSleepScore(sleepRating: number): number {
  // 1–5 Likert → 1–10 mood signal, non-linear (poor sleep hurts more than good helps)
  const map: Record<number, number> = { 1: 1.5, 2: 3.5, 3: 5.5, 4: 7.5, 5: 9.5 };
  return map[sleepRating] ?? 5.5;
}

/**
 * computeSocialScore — from check-in + (future) messaging frequency
 *
 * Social withdrawal is a diagnostic criterion for major depressive episode (DSM-5).
 * Also: declining message frequency precedes depressive episodes by 3–7 days (Bell, 2019)
 */
export function computeSocialScore(params: {
  socialRating: number;         // 1–5 from check-in
  isolationLevel: 'none' | 'some' | 'severe';
  weeklyMessageDrop?: number;   // 0–1, optional (needs native keyboard)
}): number {
  const baseMap: Record<number, number> = { 1: 1.5, 2: 3.5, 3: 5.5, 4: 7.5, 5: 9.5 };
  let score = baseMap[params.socialRating] ?? 5.5;

  // Isolation self-report compounds the signal
  if (params.isolationLevel === 'severe') score = Math.min(score, 4.0);
  else if (params.isolationLevel === 'some') score -= 0.5;

  // Message frequency drop (only available with keyboard extension)
  if (params.weeklyMessageDrop !== undefined) {
    if (params.weeklyMessageDrop > 0.5)       score -= 2.0;
    else if (params.weeklyMessageDrop > 0.3)  score -= 1.0;
    else if (params.weeklyMessageDrop > 0.15) score -= 0.5;
  }

  return Math.max(1, Math.min(10, score));
}

/**
 * Weighted mood score formula — configurable weights
 */
export const SIGNAL_WEIGHTS = {
  typing:   0.25,
  sleep:    0.20,
  circadian:0.20,
  social:   0.20,
  journal:  0.15,
};

export function computeMoodScore(
  signals: { typing: number; sleep: number; circadian: number; social: number; journal: number },
  previousScore: number | null = null,
): number {
  const raw =
    signals.typing    * SIGNAL_WEIGHTS.typing    +
    signals.sleep     * SIGNAL_WEIGHTS.sleep     +
    signals.circadian * SIGNAL_WEIGHTS.circadian +
    signals.social    * SIGNAL_WEIGHTS.social    +
    signals.journal   * SIGNAL_WEIGHTS.journal;

  // Temporal smoothing: 70% current snapshot, 30% yesterday
  // Prevents wild swings from single bad check-in
  const smoothed = previousScore !== null
    ? raw * 0.7 + previousScore * 0.3
    : raw;

  return Math.round(Math.max(1, Math.min(10, smoothed)) * 10) / 10;
}

/**
 * Neutral baseline — used when no real data is available yet.
 * All signals = 5.0 (true neutral) → mood_score = 5.0
 * NOT: appUsage=9, circadian=10, social=10, journal=5 → 7.8 → drifts to 8.4
 */
export const NEUTRAL_SIGNALS: BiomarkerSignals = {
  typing:   5.0,
  sleep:    5.0,
  circadian:5.0,
  social:   5.0,
  journal:  5.0,
  sources: {
    typing:   'No data yet — type in chat or journal',
    sleep:    'No check-in yet — tap Check-in button',
    circadian:'No data yet — will update after daily use',
    social:   'No check-in yet — tap Check-in button',
    journal:  'No journal or chat yet',
  },
  confidence: {
    typing:   'simulated',
    sleep:    'simulated',
    circadian:'simulated',
    social:   'simulated',
    journal:  'simulated',
  },
  rawMetrics: {},
};

// ─── Persistent session history (in-memory, survives app sessions via store) ──
export interface SessionRecord {
  openHour:   number;
  openedAt:   number;
  durationMs: number;
}

let _sessionHistory: SessionRecord[] = [];
let _currentSession: SessionRecord | null = null;

export function sessionStart(): void {
  _currentSession = { openHour: new Date().getHours(), openedAt: Date.now(), durationMs: 0 };
  _sessionHistory.push(_currentSession);
  if (_sessionHistory.length > 60) _sessionHistory.shift();
}

export function sessionEnd(): void {
  if (_currentSession) {
    _currentSession.durationMs = Date.now() - _currentSession.openedAt;
  }
  _currentSession = null;
}

export function getSessionHistory(): SessionRecord[] {
  return [..._sessionHistory];
}

export function loadSessionHistory(records: SessionRecord[]): void {
  _sessionHistory = records;
}

export function getRecentOpenHours(n = 14): number[] {
  return _sessionHistory.slice(-n).map(s => s.openHour);
}

// ─── Notification cooldown tracker ───────────────────────────────────────────
const _lastNotifTimes: Record<string, number> = {};

export function canSendNotification(type: string, cooldownMs: number): boolean {
  const last = _lastNotifTimes[type] ?? 0;
  return Date.now() - last > cooldownMs;
}

export function markNotificationSent(type: string): void {
  _lastNotifTimes[type] = Date.now();
}

// ─── Urgency classifier ───────────────────────────────────────────────────────
export type UrgencyLevel = 'ok' | 'watch' | 'concern' | 'critical';

export function classifyUrgency(moodScore: number, journalScore: number, isLateNight: boolean): UrgencyLevel {
  if (moodScore < 2 || journalScore < 2)                   return 'critical';
  if (moodScore < 3 && isLateNight)                        return 'critical';
  if (moodScore < 3.5 && journalScore < 3)                 return 'concern';
  if (moodScore < 4)                                       return 'concern';
  if (moodScore < 5.5 && isLateNight)                      return 'watch';
  if (moodScore < 5)                                       return 'watch';
  return 'ok';
}

export function notificationMessage(
  urgency: UrgencyLevel,
  context: { isLateNight: boolean; themes: string[] }
): { title: string; body: string } | null {
  const { isLateNight, themes } = context;

  // Decide message based on context — NOT generic
  if (themes.includes('breakup')) {
    return {
      title: '💙 Bhai...',
      body: 'Phone rakh aur gehri saans le. Tu isse kahin behtar deserve karta hai.',
    };
  }
  if (themes.includes('career_failure')) {
    return {
      title: '💪 Sun bhai',
      body: 'Ek failure = end of life nahi hota. Tu sirf ek step peeche hai, not out of the game.',
    };
  }
  if (isLateNight && urgency !== 'ok') {
    const hour = new Date().getHours();
    return {
      title: `🌙 ${hour} baj gaye hain`,
      body: 'So ja yaar. Kal subah uthkar sab theek lagega, promise.',
    };
  }
  if (urgency === 'critical') {
    return {
      title: '🤝 Tu akela nahi hai',
      body: 'Bro_AI yahan hai — no judgment, 24/7. Baat kar?',
    };
  }
  if (urgency === 'concern') {
    return {
      title: '💬 Kaafi time ho gaya...',
      body: 'Sab theek hai? Ek message kar, main sun\'ne ke liye hoon.',
    };
  }
  // 'watch' or 'ok' — no notification needed
  return null;
}