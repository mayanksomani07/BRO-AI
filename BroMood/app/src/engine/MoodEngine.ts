/**
 * BroMood Mood Engine — Core on-device mood calculation
 * All computations happen locally. No data leaves the device.
 */

export interface KeystrokeMetrics {
  avgTypingSpeed: number;       // chars per second
  backspaceRate: number;        // backspace / total keys (0–1)
  pauseCount: number;           // pauses > 2000ms mid-sentence
  typingIrregularity: number;   // std deviation of inter-key intervals (ms)
  sessionDuration: number;      // total time in ms
  deletionBursts: number;       // 3+ consecutive backspaces = 1 burst
}

export interface AppUsageData {
  lateNightSessionsThisWeek: number;
  socialMediaSelfReport: 'none' | 'light' | 'moderate' | 'heavy';
  consecutiveLateNightDays: number;
}

export interface SleepSample {
  startTime: number;   // Unix timestamp ms
  endTime: number;     // Unix timestamp ms
  sleepType: 'inBed' | 'asleep' | 'awake';
}

export interface SocialData {
  selfReportedIsolation: 'no' | 'somewhat' | 'yes_very';
  baselineKeyboardMessagingSessions: number;
  thisWeekKeyboardMessagingSessions: number;
}

export interface AllSignals {
  keystroke: number;
  appUsage: number;
  circadian: number;
  socialWithdrawal: number;
  journalSentiment: number;
}

export interface MoodWeights {
  keystroke: number;
  appUsage: number;
  circadian: number;
  socialWithdrawal: number;
  journalSentiment: number;
}

export interface MoodSnapshot {
  score: number;
  signals: AllSignals;
  trendSlope: number;
  consecutiveImprovingDays: number;
  urgencyFlag: boolean;
  timestamp: number;
}

const DEFAULT_WEIGHTS: MoodWeights = {
  keystroke: 0.25,
  appUsage: 0.20,
  circadian: 0.20,
  socialWithdrawal: 0.20,
  journalSentiment: 0.15,
};

// Rolling session buffer for smoothing keystroke score
const keystrokeSessionBuffer: number[] = [];
const MAX_SESSION_BUFFER = 3;

// 30-day mood history for trend analysis
let moodHistory: { score: number; date: number }[] = [];

export function computeKeystrokeScore(metrics: KeystrokeMetrics): number {
  let score = 10.0;

  // Slow typing = low energy
  if (metrics.avgTypingSpeed < 1.0) score -= 2.5;
  else if (metrics.avgTypingSpeed < 1.5) score -= 1.5;
  else if (metrics.avgTypingSpeed < 2.0) score -= 0.5;

  // High backspace rate = anxiety/restlessness
  if (metrics.backspaceRate > 0.30) score -= 2.5;
  else if (metrics.backspaceRate > 0.20) score -= 1.5;
  else if (metrics.backspaceRate > 0.12) score -= 0.5;

  // Deletion bursts = frustration
  score -= Math.min(metrics.deletionBursts * 0.3, 1.5);

  // Long pauses = rumination
  if (metrics.pauseCount > 8) score -= 1.5;
  else if (metrics.pauseCount > 4) score -= 0.8;

  // High irregularity = distracted / unstable
  if (metrics.typingIrregularity > 800) score -= 1.0;
  else if (metrics.typingIrregularity > 500) score -= 0.5;

  const rawScore = Math.max(1, Math.min(10, score));

  // Rolling 3-session average with recency weighting
  keystrokeSessionBuffer.push(rawScore);
  if (keystrokeSessionBuffer.length > MAX_SESSION_BUFFER) {
    keystrokeSessionBuffer.shift();
  }

  if (keystrokeSessionBuffer.length === 1) return rawScore;

  // Weight: most recent session = 0.5, second = 0.3, third = 0.2
  const weights = [0.5, 0.3, 0.2];
  const n = keystrokeSessionBuffer.length;
  let weighted = 0;
  let totalWeight = 0;
  for (let i = 0; i < n; i++) {
    const w = weights[i] ?? 0.1;
    weighted += keystrokeSessionBuffer[n - 1 - i] * w;
    totalWeight += w;
  }
  return Math.round((weighted / totalWeight) * 10) / 10;
}

export function computeAppUsageScore(data: AppUsageData): number {
  let score = 10.0;
  score -= data.lateNightSessionsThisWeek >= 3 ? 3.0 : data.lateNightSessionsThisWeek * 0.8;
  score -= data.socialMediaSelfReport === 'heavy' ? 2.5 :
           data.socialMediaSelfReport === 'moderate' ? 1.0 : 0;
  score -= data.consecutiveLateNightDays >= 3 ? 1.5 : 0;
  return Math.max(1, Math.min(10, score));
}

export function getSleepMidpoint(sample: SleepSample): number {
  return (sample.startTime + sample.endTime) / 2;
}

export function computeBaselineSleepMidpoint(samples: SleepSample[]): number {
  if (!samples.length) return 3 * 60 * 60 * 1000; // default 3 AM
  const asleepSamples = samples.filter(s => s.sleepType === 'asleep');
  if (!asleepSamples.length) return 3 * 60 * 60 * 1000;
  const midpoints = asleepSamples.map(getSleepMidpoint);
  return midpoints.reduce((a, b) => a + b, 0) / midpoints.length;
}

function mean(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function computeCircadianScore(sleepData: SleepSample[]): number {
  if (sleepData.length < 3) return 7.5; // Not enough data, neutral

  const baseline = computeBaselineSleepMidpoint(sleepData.slice(0, 7));
  const recentDays = sleepData.slice(-7);
  const deviations = recentDays.map(d => Math.abs(getSleepMidpoint(d) - baseline) / (1000 * 60 * 60));
  const avgDeviation = mean(deviations);

  let score = 10.0;
  if (avgDeviation > 3) score -= 4.0;
  else if (avgDeviation > 2) score -= 2.5;
  else if (avgDeviation > 1) score -= 1.5;
  else if (avgDeviation > 0.5) score -= 0.5;

  // Count consecutive late nights
  let consecutiveLate = 0;
  for (let i = recentDays.length - 1; i >= 0; i--) {
    const mid = getSleepMidpoint(recentDays[i]);
    const hour = new Date(mid).getHours();
    if (hour >= 1 && hour <= 5) consecutiveLate++;
    else break;
  }
  score -= consecutiveLate >= 5 ? 2.0 : consecutiveLate >= 3 ? 1.0 : 0;

  return Math.max(1, Math.min(10, score));
}

export function computeSocialWithdrawalScore(data: SocialData): number {
  let score = 10.0;
  score -= data.selfReportedIsolation === 'yes_very' ? 3.0 :
           data.selfReportedIsolation === 'somewhat' ? 1.5 : 0;

  if (data.baselineKeyboardMessagingSessions > 0) {
    const sessionDrop = (data.baselineKeyboardMessagingSessions - data.thisWeekKeyboardMessagingSessions) /
                        data.baselineKeyboardMessagingSessions;
    score -= sessionDrop > 0.5 ? 2.5 :
             sessionDrop > 0.3 ? 1.5 :
             sessionDrop > 0.15 ? 0.5 : 0;
  }

  return Math.max(1, Math.min(10, score));
}

let previousMoodScore: number | null = null;

export function getPreviousMoodScore(): number | null {
  return previousMoodScore;
}

export function computeFinalMoodScore(
  signals: AllSignals,
  weights: MoodWeights = DEFAULT_WEIGHTS
): number {
  const rawScore =
    signals.keystroke * weights.keystroke +
    signals.appUsage * weights.appUsage +
    signals.circadian * weights.circadian +
    signals.socialWithdrawal * weights.socialWithdrawal +
    signals.journalSentiment * weights.journalSentiment;

  // Temporal smoothing: 70% current, 30% yesterday
  const smoothed = previousMoodScore !== null
    ? rawScore * 0.7 + previousMoodScore * 0.3
    : rawScore;

  const finalScore = Math.round(Math.max(1, Math.min(10, smoothed)) * 10) / 10;
  previousMoodScore = finalScore;

  // Store in rolling history
  moodHistory.push({ score: finalScore, date: Date.now() });
  if (moodHistory.length > 30) moodHistory = moodHistory.slice(-30);

  return finalScore;
}

export function computeTrendSlope(): number {
  const last7 = moodHistory.slice(-7);
  if (last7.length < 3) return 0;

  const n = last7.length;
  const xs = last7.map((_, i) => i);
  const ys = last7.map(h => h.score);

  const meanX = mean(xs);
  const meanY = mean(ys);

  const numerator = xs.reduce((sum, x, i) => sum + (x - meanX) * (ys[i] - meanY), 0);
  const denominator = xs.reduce((sum, x) => sum + Math.pow(x - meanX, 2), 0);

  return denominator !== 0 ? numerator / denominator : 0;
}

export function countConsecutiveImprovingDays(): number {
  if (moodHistory.length < 2) return 0;
  let count = 0;
  for (let i = moodHistory.length - 1; i > 0; i--) {
    if (moodHistory[i].score > moodHistory[i - 1].score) count++;
    else break;
  }
  return count;
}

export function setMoodHistory(history: { score: number; date: number }[]): void {
  moodHistory = history;
}

export function getMoodHistory(): { score: number; date: number }[] {
  return moodHistory;
}

export function buildMoodSnapshot(
  signals: AllSignals,
  urgencyFlag: boolean,
  weights?: MoodWeights
): MoodSnapshot {
  const score = computeFinalMoodScore(signals, weights);
  return {
    score,
    signals,
    trendSlope: computeTrendSlope(),
    consecutiveImprovingDays: countConsecutiveImprovingDays(),
    urgencyFlag,
    timestamp: Date.now(),
  };
}
