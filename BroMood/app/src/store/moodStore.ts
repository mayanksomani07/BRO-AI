/**
 * moodStore — global mood state, recalculation, and history
 */

import { create } from 'zustand';
import {
  AllSignals, MoodSnapshot, buildMoodSnapshot,
  computeAppUsageScore, computeCircadianScore,
  computeSocialWithdrawalScore, setMoodHistory, getMoodHistory,
} from '../engine/MoodEngine';
import {
  computeMetricsFromSession, readSharedKeystrokeSessions,
  clearSharedKeystrokeSessions, aggregateSessionMetrics,
} from '../engine/KeystrokeAnalyzer';
import { computeKeystrokeScore } from '../engine/MoodEngine';
import { getMoodLogs, insertMoodLog } from '../db/queries';
import { useUserStore } from './userStore';

interface MoodStore {
  currentSnapshot: MoodSnapshot | null;
  history: { score: number; date: number }[];
  showEmergencyBanner: boolean;
  lastDetectedThemes: string[];

  recalculateMoodScore: () => Promise<void>;
  dismissEmergencyBanner: () => void;
  updateJournalSentiment: (score: number, themes: string[], urgency: boolean) => void;
  loadHistory: () => Promise<void>;
}

// In-memory signal tracking between recalculations
let cachedSignals: AllSignals = {
  keystroke: 7.5,
  appUsage: 7.5,
  circadian: 7.5,
  socialWithdrawal: 7.5,
  journalSentiment: 7.0,
};

export const useMoodStore = create<MoodStore>((set, get) => ({
  currentSnapshot: null,
  history: [],
  showEmergencyBanner: false,
  lastDetectedThemes: [],

  loadHistory: async () => {
    const logs = await getMoodLogs(30);
    const history = logs.map(l => ({ score: l.mood_score, date: l.logged_at }));
    setMoodHistory(history);
    set({ history });
  },

  recalculateMoodScore: async () => {
    await get().loadHistory();

    // --- Signal 1: Keystroke dynamics ---
    const sessions = await readSharedKeystrokeSessions();
    if (sessions.length > 0) {
      const metrics = aggregateSessionMetrics(sessions);
      if (metrics) {
        cachedSignals.keystroke = computeKeystrokeScore(metrics);
        await clearSharedKeystrokeSessions();
      }
    }

    // --- Signal 2: App usage ---
    const { socialMediaHabit } = useUserStore.getState();
    const hour = new Date().getHours();
    const isLate = hour >= 22 || hour <= 5;
    cachedSignals.appUsage = computeAppUsageScore({
      lateNightSessionsThisWeek: isLate ? 1 : 0,
      socialMediaSelfReport: socialMediaHabit,
      consecutiveLateNightDays: 0, // tracked in app_sessions
    });

    // --- Signal 3: Circadian (HealthKit) ---
    // Would be populated by HealthKit integration
    // Using neutral if no data
    cachedSignals.circadian = cachedSignals.circadian ?? 7.5;

    // --- Signal 4: Social withdrawal ---
    cachedSignals.socialWithdrawal = computeSocialWithdrawalScore({
      selfReportedIsolation: 'no',
      baselineKeyboardMessagingSessions: 10,
      thisWeekKeyboardMessagingSessions: 10,
    });

    // --- Build snapshot ---
    const urgencyFlag = cachedSignals.journalSentiment < 2;
    const snapshot = buildMoodSnapshot(cachedSignals, urgencyFlag);

    // --- Persist to DB ---
    await insertMoodLog({
      mood_score: snapshot.score,
      keystroke_score: cachedSignals.keystroke,
      app_usage_score: cachedSignals.appUsage,
      circadian_score: cachedSignals.circadian,
      social_withdrawal_score: cachedSignals.socialWithdrawal,
      journal_sentiment_score: cachedSignals.journalSentiment,
      detected_themes: JSON.stringify(get().lastDetectedThemes),
      urgency_flag: urgencyFlag ? 1 : 0,
      logged_at: Date.now(),
    });

    set({
      currentSnapshot: snapshot,
      showEmergencyBanner: snapshot.score < 2 || urgencyFlag,
      history: getMoodHistory(),
    });
  },

  dismissEmergencyBanner: () => set({ showEmergencyBanner: false }),

  updateJournalSentiment: (score: number, themes: string[], urgency: boolean) => {
    cachedSignals.journalSentiment = score;
    set({ lastDetectedThemes: themes });

    // Trigger immediate recalculation
    const { currentSnapshot } = get();
    if (currentSnapshot) {
      const updated: AllSignals = { ...cachedSignals, journalSentiment: score };
      const newSnapshot = buildMoodSnapshot(updated, urgency);
      set({
        currentSnapshot: newSnapshot,
        showEmergencyBanner: newSnapshot.score < 2 || urgency,
      });
    }
  },
}));
