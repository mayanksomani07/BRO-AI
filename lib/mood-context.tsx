import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback } from 'react';
import * as Crypto from 'expo-crypto';
import {
  type MoodType,
  type MoodEntry,
  type JournalEntry,
  analyzeSentiment,
  analyzeTypingPattern,
  shouldShowMotivation,
  getRandomMotivation,
} from './mood-analyzer';
import {
  saveMoodEntry,
  getMoodEntries,
  saveJournalEntry,
  getJournalEntries,
  deleteJournalEntry,
  getMoodStats,
  getLastMotivationTime,
  setLastMotivationTime,
} from './storage';

interface MotivationMessage {
  title: string;
  message: string;
}

interface MoodContextValue {
  moods: MoodEntry[];
  journals: JournalEntry[];
  isLoading: boolean;
  stats: {
    moodCounts: Record<string, number>;
    averageSentiment: number;
    totalEntries: number;
    streak: number;
  };
  motivation: MotivationMessage | null;
  showMotivation: boolean;
  addMood: (mood: MoodType, note?: string) => Promise<void>;
  addJournal: (text: string, typingDuration: number) => Promise<void>;
  removeJournal: (id: string) => Promise<void>;
  dismissMotivation: () => void;
  refreshData: () => Promise<void>;
}

const MoodContext = createContext<MoodContextValue | null>(null);

export function MoodProvider({ children }: { children: ReactNode }) {
  const [moods, setMoods] = useState<MoodEntry[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    moodCounts: {} as Record<string, number>,
    averageSentiment: 0,
    totalEntries: 0,
    streak: 0,
  });
  const [motivation, setMotivation] = useState<MotivationMessage | null>(null);
  const [showMotivation, setShowMotivation] = useState(false);

  const refreshData = useCallback(async () => {
    const [moodData, journalData, statsData] = await Promise.all([
      getMoodEntries(),
      getJournalEntries(),
      getMoodStats(7),
    ]);
    setMoods(moodData);
    setJournals(journalData);
    setStats(statsData);
  }, []);

  useEffect(() => {
    (async () => {
      await refreshData();
      setIsLoading(false);
    })();
  }, [refreshData]);

  const checkMotivation = useCallback(async (currentMoods: MoodEntry[], currentJournals: JournalEntry[]) => {
    if (shouldShowMotivation(currentMoods, currentJournals)) {
      const lastShown = await getLastMotivationTime();
      const hoursSinceShown = (Date.now() - lastShown) / (1000 * 60 * 60);
      if (hoursSinceShown >= 1) {
        setMotivation(getRandomMotivation());
        setShowMotivation(true);
        await setLastMotivationTime();
      }
    }
  }, []);

  const addMood = useCallback(async (mood: MoodType, note?: string) => {
    const entry: MoodEntry = {
      id: Crypto.randomUUID(),
      mood,
      timestamp: Date.now(),
      note,
    };
    await saveMoodEntry(entry);
    const updatedMoods = [entry, ...moods];
    setMoods(updatedMoods);
    const newStats = await getMoodStats(7);
    setStats(newStats);
    await checkMotivation(updatedMoods, journals);
  }, [moods, journals, checkMotivation]);

  const addJournal = useCallback(async (text: string, typingDuration: number) => {
    const { score, mood } = analyzeSentiment(text);
    const entry: JournalEntry = {
      id: Crypto.randomUUID(),
      text,
      timestamp: Date.now(),
      sentimentScore: score,
      detectedMood: mood,
      typingDuration,
    };
    await saveJournalEntry(entry);
    const updatedJournals = [entry, ...journals];
    setJournals(updatedJournals);
    const newStats = await getMoodStats(7);
    setStats(newStats);
    await checkMotivation(moods, updatedJournals);
  }, [moods, journals, checkMotivation]);

  const removeJournal = useCallback(async (id: string) => {
    await deleteJournalEntry(id);
    setJournals(prev => prev.filter(j => j.id !== id));
  }, []);

  const dismissMotivation = useCallback(() => {
    setShowMotivation(false);
  }, []);

  const value = useMemo(() => ({
    moods,
    journals,
    isLoading,
    stats,
    motivation,
    showMotivation,
    addMood,
    addJournal,
    removeJournal,
    dismissMotivation,
    refreshData,
  }), [moods, journals, isLoading, stats, motivation, showMotivation, addMood, addJournal, removeJournal, dismissMotivation, refreshData]);

  return (
    <MoodContext.Provider value={value}>
      {children}
    </MoodContext.Provider>
  );
}

export function useMood() {
  const context = useContext(MoodContext);
  if (!context) {
    throw new Error('useMood must be used within a MoodProvider');
  }
  return context;
}
