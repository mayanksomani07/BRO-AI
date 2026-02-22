import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Language } from './language-context';

export interface ConfidenceTask {
  id: string;
  title: string;
  description: string;
  duration: string;
  category: 'social' | 'mindfulness' | 'creative' | 'physical' | 'gratitude';
  icon: string;
  xp: number;
}

const TASKS_HINGLISH: ConfidenceTask[] = [
  { id: 't1', title: 'Mirror Pep Talk', description: 'Aaine ke saamne khade ho aur 2 minute tak apne aap ko 3 achhi baatein bolo. Haan, seriously!', duration: '2 min', category: 'mindfulness', icon: 'eye', xp: 10 },
  { id: 't2', title: 'Stranger ko Smile De', description: 'Aaj kisi unknown person ko genuine smile de. Bas smile — kuch bolna zaroori nahi.', duration: '1 min', category: 'social', icon: 'happy', xp: 15 },
  { id: 't3', title: 'Gratitude List', description: '3 cheezein likh jinke liye tu grateful hai aaj. Chhoti cheezein bhi count hoti hain — chai, dhoop, ya koi achha gaana.', duration: '3 min', category: 'gratitude', icon: 'heart', xp: 10 },
  { id: 't4', title: 'Power Pose', description: '2 minute tak superhero pose maar — haath waist pe, seena chauda. Research kehti hai confidence badhta hai!', duration: '2 min', category: 'physical', icon: 'body', xp: 10 },
  { id: 't5', title: 'Compliment Dost Ko', description: 'Kisi dost ya family member ko genuine compliment de. Unka din bana aur tera bhi.', duration: '2 min', category: 'social', icon: 'people', xp: 15 },
  { id: 't6', title: 'Deep Breathing', description: '4-7-8 technique: 4 sec inhale, 7 sec hold, 8 sec exhale. 3 rounds kar. Mind fresh ho jaayega.', duration: '3 min', category: 'mindfulness', icon: 'leaf', xp: 10 },
  { id: 't7', title: 'Doodle Time', description: 'Paper pe kuch bhi draw kar — koi rules nahi. Abstract shapes, faces, patterns — just let your hand flow.', duration: '5 min', category: 'creative', icon: 'color-palette', xp: 15 },
  { id: 't8', title: '10 Jumping Jacks', description: 'Abhi ke abhi 10 jumping jacks kar. Blood flow badhega, mood instantly better hoga.', duration: '1 min', category: 'physical', icon: 'fitness', xp: 10 },
  { id: 't9', title: 'Memory Lane', description: 'Apni favourite memory yaad kar — detail mein. Kahan tha, kaun tha, kya feel hua. Re-live that moment.', duration: '3 min', category: 'mindfulness', icon: 'images', xp: 10 },
  { id: 't10', title: 'Dance Break', description: 'Apna favourite gaana lagao aur 2 minute dance karo. Koi judge nahi kar raha — bas enjoy kar!', duration: '2 min', category: 'physical', icon: 'musical-notes', xp: 15 },
  { id: 't11', title: 'Kisi Ko Thank You Bol', description: 'Aaj kisi ko genuinely thank you bol — chai wale bhaiya, auto uncle, ya apni maa ko.', duration: '1 min', category: 'gratitude', icon: 'thumbs-up', xp: 15 },
  { id: 't12', title: 'Nature Watch', description: '2 minute bahar dekh — trees, sky, birds. Phone mat dekh, bas nature observe kar. Grounding technique hai ye.', duration: '2 min', category: 'mindfulness', icon: 'flower', xp: 10 },
];

const TASKS_ENGLISH: ConfidenceTask[] = [
  { id: 't1', title: 'Mirror Pep Talk', description: 'Stand in front of a mirror and tell yourself 3 good things for 2 minutes. Yes, seriously!', duration: '2 min', category: 'mindfulness', icon: 'eye', xp: 10 },
  { id: 't2', title: 'Smile at a Stranger', description: 'Give a genuine smile to someone you don\'t know today. Just a smile — no words needed.', duration: '1 min', category: 'social', icon: 'happy', xp: 15 },
  { id: 't3', title: 'Gratitude List', description: 'Write 3 things you\'re grateful for today. Small things count — tea, sunshine, or a good song.', duration: '3 min', category: 'gratitude', icon: 'heart', xp: 10 },
  { id: 't4', title: 'Power Pose', description: 'Strike a superhero pose for 2 minutes — hands on waist, chest out. Research says it boosts confidence!', duration: '2 min', category: 'physical', icon: 'body', xp: 10 },
  { id: 't5', title: 'Compliment Someone', description: 'Give a genuine compliment to a friend or family member. Make their day and yours too.', duration: '2 min', category: 'social', icon: 'people', xp: 15 },
  { id: 't6', title: 'Deep Breathing', description: '4-7-8 technique: 4 sec inhale, 7 sec hold, 8 sec exhale. Do 3 rounds. Mind will feel fresh.', duration: '3 min', category: 'mindfulness', icon: 'leaf', xp: 10 },
  { id: 't7', title: 'Doodle Time', description: 'Draw anything on paper — no rules. Abstract shapes, faces, patterns — just let your hand flow.', duration: '5 min', category: 'creative', icon: 'color-palette', xp: 15 },
  { id: 't8', title: '10 Jumping Jacks', description: 'Do 10 jumping jacks right now. It increases blood flow and instantly improves mood.', duration: '1 min', category: 'physical', icon: 'fitness', xp: 10 },
  { id: 't9', title: 'Memory Lane', description: 'Recall your favorite memory in detail. Where were you, who was there, how did it feel. Re-live it.', duration: '3 min', category: 'mindfulness', icon: 'images', xp: 10 },
  { id: 't10', title: 'Dance Break', description: 'Play your favorite song and dance for 2 minutes. Nobody\'s judging — just enjoy!', duration: '2 min', category: 'physical', icon: 'musical-notes', xp: 15 },
  { id: 't11', title: 'Say Thank You', description: 'Genuinely thank someone today — the tea vendor, cab driver, or your mom.', duration: '1 min', category: 'gratitude', icon: 'thumbs-up', xp: 15 },
  { id: 't12', title: 'Nature Watch', description: 'Look outside for 2 minutes — trees, sky, birds. Don\'t look at your phone, just observe nature.', duration: '2 min', category: 'mindfulness', icon: 'flower', xp: 10 },
];

export function getTasks(language: Language): ConfidenceTask[] {
  if (language === 'hinglish' || language === 'hindi') return TASKS_HINGLISH;
  return TASKS_ENGLISH;
}

export function getDailyTasks(language: Language): ConfidenceTask[] {
  const all = getTasks(language);
  const today = new Date().toDateString();
  let seed = 0;
  for (let i = 0; i < today.length; i++) seed += today.charCodeAt(i);
  const shuffled = [...all].sort((a, b) => {
    const ha = (seed * a.id.charCodeAt(1)) % 100;
    const hb = (seed * b.id.charCodeAt(1)) % 100;
    return ha - hb;
  });
  return shuffled.slice(0, 3);
}

const TASKS_COMPLETED_KEY = '@moodguard_tasks_completed';
const TASKS_XP_KEY = '@moodguard_tasks_xp';

export async function getCompletedTasks(): Promise<Record<string, boolean>> {
  const data = await AsyncStorage.getItem(TASKS_COMPLETED_KEY);
  if (!data) return {};
  const parsed = JSON.parse(data);
  const today = new Date().toDateString();
  if (parsed._date !== today) return {};
  return parsed;
}

export async function markTaskCompleted(taskId: string, xp: number): Promise<number> {
  const completed = await getCompletedTasks();
  completed[taskId] = true;
  completed._date = new Date().toDateString();
  await AsyncStorage.setItem(TASKS_COMPLETED_KEY, JSON.stringify(completed));

  const totalXp = await getTotalXP();
  const newXp = totalXp + xp;
  await AsyncStorage.setItem(TASKS_XP_KEY, newXp.toString());
  return newXp;
}

export async function getTotalXP(): Promise<number> {
  const data = await AsyncStorage.getItem(TASKS_XP_KEY);
  return data ? parseInt(data, 10) : 0;
}

export function getLevel(xp: number): { level: number; title: string; nextLevelXp: number; progress: number } {
  const levels = [
    { level: 1, title: 'Beginner', threshold: 0 },
    { level: 2, title: 'Explorer', threshold: 50 },
    { level: 3, title: 'Warrior', threshold: 120 },
    { level: 4, title: 'Champion', threshold: 250 },
    { level: 5, title: 'Legend', threshold: 500 },
    { level: 6, title: 'Master', threshold: 1000 },
  ];

  let current = levels[0];
  let next = levels[1];

  for (let i = levels.length - 1; i >= 0; i--) {
    if (xp >= levels[i].threshold) {
      current = levels[i];
      next = levels[i + 1] || levels[i];
      break;
    }
  }

  const progress = next === current ? 1 : (xp - current.threshold) / (next.threshold - current.threshold);

  return {
    level: current.level,
    title: current.title,
    nextLevelXp: next.threshold,
    progress: Math.min(1, progress),
  };
}

export const CATEGORY_COLORS: Record<string, string> = {
  social: '#3B82F6',
  mindfulness: '#8B5CF6',
  creative: '#EC4899',
  physical: '#10B981',
  gratitude: '#F59E0B',
};
