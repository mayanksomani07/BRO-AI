import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MoodEntry, JournalEntry } from './mood-analyzer';

const MOOD_KEY = '@moodguard_moods';
const JOURNAL_KEY = '@moodguard_journals';
const MOTIVATION_SHOWN_KEY = '@moodguard_last_motivation';

export async function saveMoodEntry(entry: MoodEntry): Promise<void> {
  const existing = await getMoodEntries();
  existing.unshift(entry);
  await AsyncStorage.setItem(MOOD_KEY, JSON.stringify(existing));
}

export async function getMoodEntries(): Promise<MoodEntry[]> {
  const data = await AsyncStorage.getItem(MOOD_KEY);
  return data ? JSON.parse(data) : [];
}

export async function saveJournalEntry(entry: JournalEntry): Promise<void> {
  const existing = await getJournalEntries();
  existing.unshift(entry);
  await AsyncStorage.setItem(JOURNAL_KEY, JSON.stringify(existing));
}

export async function getJournalEntries(): Promise<JournalEntry[]> {
  const data = await AsyncStorage.getItem(JOURNAL_KEY);
  return data ? JSON.parse(data) : [];
}

export async function deleteJournalEntry(id: string): Promise<void> {
  const existing = await getJournalEntries();
  const filtered = existing.filter(e => e.id !== id);
  await AsyncStorage.setItem(JOURNAL_KEY, JSON.stringify(filtered));
}

export async function getLastMotivationTime(): Promise<number> {
  const data = await AsyncStorage.getItem(MOTIVATION_SHOWN_KEY);
  return data ? parseInt(data, 10) : 0;
}

export async function setLastMotivationTime(): Promise<void> {
  await AsyncStorage.setItem(MOTIVATION_SHOWN_KEY, Date.now().toString());
}

export async function getMoodStats(days: number = 7): Promise<{
  moodCounts: Record<string, number>;
  averageSentiment: number;
  totalEntries: number;
  streak: number;
}> {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const moods = (await getMoodEntries()).filter(m => m.timestamp > cutoff);
  const journals = (await getJournalEntries()).filter(j => j.timestamp > cutoff);

  const moodCounts: Record<string, number> = {};
  for (const m of moods) {
    moodCounts[m.mood] = (moodCounts[m.mood] || 0) + 1;
  }

  const sentiments = journals.map(j => j.sentimentScore);
  const averageSentiment = sentiments.length > 0
    ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length
    : 0;

  const allEntries = await getMoodEntries();
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i++) {
    const dayStart = today.getTime() - i * 24 * 60 * 60 * 1000;
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    const hasEntry = allEntries.some(m => m.timestamp >= dayStart && m.timestamp < dayEnd);
    if (hasEntry) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  return {
    moodCounts,
    averageSentiment,
    totalEntries: moods.length + journals.length,
    streak,
  };
}
