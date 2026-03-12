/**
 * moodStore — connects BiomarkerEngine signals to UI state.
 *
 * Signal pipeline:
 *  1. App open           → circadian score updates
 *  2. Daily check-in     → sleep + social + energy signals update (most trusted)
 *  3. Journal/chat typed → typing score updates + Gemini NLP → journal score
 *  4. Background timer   → re-evaluate triggers every 6h
 *
 * WHY score starts at 8.4:
 *  Old defaults: appUsage=9, circadian=10, social=10, typing=5, journal=5
 *  → weighted avg ≈ 7.8 → temporal smoothing → 8.4
 *
 *  Fix: Start ALL signals at neutral 5.0 until real data arrives.
 *  After first check-in, score will reflect actual state.
 */

import { create } from 'zustand';
import {
  AllSignals, MoodSnapshot, buildMoodSnapshot,
  setMoodHistory, getMoodHistory,
} from '../engine/MoodEngine';
import {
  computeCircadianScore, computeTypingScore, computeSleepScore,
  computeSocialScore, computeMoodScore, NEUTRAL_SIGNALS,
  sessionStart, getRecentOpenHours, classifyUrgency,
  TypingMetrics,
} from '../engine/BiomarkerEngine';
import {
  saveCheckIn, needsCheckIn,
} from '../engine/SignalCollector';
import { getMoodLogs, insertMoodLog } from '../db/queries';
import { useUserStore } from './userStore';

interface MoodStore {
  currentSnapshot: MoodSnapshot | null;
  history: { score: number; date: number }[];
  showEmergencyBanner: boolean;
  lastDetectedThemes: string[];
  lastSignals: AllSignals | null;

  // Actions
  recalculateMoodScore: () => Promise<void>;
  applyCheckIn: (answers: {
    energy: number; sleep: number; anxiety: number; social: number; mood: number;
  }) => Promise<void>;
  applyTypingMetrics: (m: TypingMetrics) => void;
  dismissEmergencyBanner: () => void;
  updateJournalSentiment: (score: number, themes: string[], urgency: boolean) => void;
  loadHistory: () => Promise<void>;
}

// ─── Cached signals — updated by each input source ────────────────────────────
// Start truly neutral: all 5.0. Score will show ~5.0 until real data comes in.
let cachedSignals: AllSignals = {
  keystroke:        5.0,  // updates when user types in chat/journal
  appUsage:         5.0,  // updates after daily check-in (sleep question)
  circadian:        5.0,  // updates on app open (compares open hour to baseline)
  socialWithdrawal: 5.0,  // updates after daily check-in (social question)
  journalSentiment: 5.0,  // updates after Gemini NLP analyzes text
};

let previousMoodScore: number | null = null;

// ─── Helper: persist snapshot to DB and update store state ───────────────────
async function persistSnapshot(
  signals: AllSignals,
  themes: string[],
  set: (p: Partial<MoodStore>) => void,
) {
  const urgency  = signals.journalSentiment < 2.5 || signals.keystroke < 2.0;
  const snapshot = buildMoodSnapshot(signals, urgency);

  await insertMoodLog({
    mood_score:                snapshot.score,
    keystroke_score:           signals.keystroke,
    app_usage_score:           signals.appUsage,
    circadian_score:           signals.circadian,
    social_withdrawal_score:   signals.socialWithdrawal,
    journal_sentiment_score:   signals.journalSentiment,
    detected_themes:           JSON.stringify(themes),
    urgency_flag:              urgency ? 1 : 0,
    logged_at:                 Date.now(),
  });

  cachedSignals = { ...signals };
  previousMoodScore = snapshot.score;

  set({
    currentSnapshot:    snapshot,
    lastSignals:        { ...signals },
    showEmergencyBanner:snapshot.score < 2.5 || urgency,
    history:            getMoodHistory(),
    lastDetectedThemes: themes,
  });
}

export const useMoodStore = create<MoodStore>((set, get) => ({
  currentSnapshot:    null,
  history:            [],
  showEmergencyBanner:false,
  lastDetectedThemes: [],
  lastSignals:        null,

  loadHistory: async () => {
    const logs    = await getMoodLogs(30);
    const history = logs.map(l => ({ score: l.mood_score, date: l.logged_at }));
    setMoodHistory(history);
    set({ history });

    // Restore previousMoodScore from last DB entry
    if (logs.length > 0) {
      previousMoodScore = logs[logs.length - 1].mood_score;
    }
  },

  recalculateMoodScore: async () => {
    await get().loadHistory();

    const { baselineSleepTime } = useUserStore.getState();

    // ── Signal 3: Circadian — based on app open hour ──────────────────────
    const recentHours    = getRecentOpenHours(14);
    const circadianResult = computeCircadianScore(
      recentHours,
      baselineSleepTime ?? 'normal',
    );
    cachedSignals.circadian = circadianResult.score;

    // ── Compute final score using current cached signals ──────────────────
    // (typing, sleep, social, journal remain as last updated by check-in/typing)
    await persistSnapshot(cachedSignals, get().lastDetectedThemes, set);
  },

  /**
   * applyCheckIn — most trusted signal source.
   * Called after user completes 5-question daily check-in.
   * Updates: sleep, social, typing (energy proxy), journal (mood self-report)
   */
  applyCheckIn: async ({ energy, sleep, anxiety, social, mood }) => {
    const { baselineSleepTime } = useUserStore.getState();

    // Signal 1: Typing proxy from energy + anxiety
    // High energy + low anxiety → faster, steadier typing
    const typingScore = computeTypingScore({
      avgCharsPerSecond:  (energy / 5) * 3.0,                    // 0.6–3.0 chars/sec
      backspaceRate:      (anxiety / 5) * 0.35,                  // 0–35% backspace
      pauseCount:         Math.round(((5 - energy) / 5) * 10),   // 0–10 pauses
      typingIrregularity: Math.round(((anxiety / 5) * 700)),      // 0–700ms std dev
      deletionBursts:     Math.round((anxiety / 5) * 3),          // 0–3 bursts
      sessionDurationSec: 120,
      totalCharacters:    Math.round((energy / 5) * 200),
    });

    // Signal 2: Sleep quality → direct map
    const sleepScore = computeSleepScore(sleep);

    // Signal 3: Circadian (re-compute with fresh timestamps)
    const circadianResult = computeCircadianScore(
      getRecentOpenHours(14),
      baselineSleepTime ?? 'normal',
    );

    // Signal 4: Social contact
    const socialScore = computeSocialScore({
      socialRating:   social,
      isolationLevel: social === 1 ? 'severe' : social === 2 ? 'some' : 'none',
    });

    // Signal 5: Self-reported mood → journal sentiment proxy
    const journalScore = computeSleepScore(mood); // same 1-5→1-10 mapping

    // Save check-in for SignalCollector backwards compat
    saveCheckIn({ energy, socialness: social, anxiety, sleep });

    const newSignals: AllSignals = {
      keystroke:        typingScore,
      appUsage:         sleepScore,
      circadian:        circadianResult.score,
      socialWithdrawal: socialScore,
      journalSentiment: journalScore,
    };

    await persistSnapshot(newSignals, get().lastDetectedThemes, set);
  },

  /**
   * applyTypingMetrics — called from ChatScreen/JournalScreen after a typing session ends.
   * Only updates the typing signal (doesn't re-run full check-in).
   */
  applyTypingMetrics: (m: TypingMetrics) => {
    if (m.totalCharacters < 10) return; // Too short to be meaningful

    const typingScore = computeTypingScore(m);
    cachedSignals.keystroke = typingScore;

    const { currentSnapshot } = get();
    if (currentSnapshot) {
      // Lightweight update — just recalculate mood with new typing score
      const score = computeMoodScore(
        {
          typing:    typingScore,
          sleep:     cachedSignals.appUsage,
          circadian: cachedSignals.circadian,
          social:    cachedSignals.socialWithdrawal,
          journal:   cachedSignals.journalSentiment,
        },
        previousMoodScore,
      );

      const urgency = score < 2.5;
      set({
        currentSnapshot: { ...currentSnapshot, score },
        lastSignals:     { ...cachedSignals },
        showEmergencyBanner: urgency,
      });
    }
  },

  dismissEmergencyBanner: () => set({ showEmergencyBanner: false }),

  updateJournalSentiment: (score, themes, urgency) => {
    cachedSignals.journalSentiment = score;

    const { currentSnapshot } = get();
    if (currentSnapshot) {
      const updated: AllSignals = { ...cachedSignals, journalSentiment: score };
      const newSnapshot = buildMoodSnapshot(updated, urgency);
      set({
        currentSnapshot: newSnapshot,
        lastSignals:     updated,
        lastDetectedThemes: themes,
        showEmergencyBanner: newSnapshot.score < 2.5 || urgency,
      });
      previousMoodScore = newSnapshot.score;
    }
  },
}));

// sessionStart() is called from App.tsx after DB initialisation
export { sessionStart };