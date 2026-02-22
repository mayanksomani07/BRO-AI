export type MoodType = 'happy' | 'calm' | 'neutral' | 'stressed' | 'sad' | 'anxious';

export interface MoodEntry {
  id: string;
  mood: MoodType;
  timestamp: number;
  note?: string;
}

export interface JournalEntry {
  id: string;
  text: string;
  timestamp: number;
  sentimentScore: number;
  detectedMood: MoodType;
  typingDuration: number;
}

const NEGATIVE_KEYWORDS = [
  'sad', 'depressed', 'lonely', 'alone', 'hopeless', 'worthless',
  'anxious', 'worried', 'stressed', 'overwhelmed', 'tired', 'exhausted',
  'angry', 'frustrated', 'irritated', 'miserable', 'unhappy', 'hurt',
  'crying', 'tears', 'pain', 'suffering', 'broken', 'empty',
  'scared', 'afraid', 'nervous', 'panic', 'dread', 'fear',
  'hate', 'terrible', 'awful', 'horrible', 'worst', 'failed',
  'failure', 'useless', 'helpless', 'stuck', 'lost', 'confused',
  'burden', 'guilt', 'shame', 'regret', 'sorry', 'weak',
  'cant cope', 'give up', 'no point', 'whats the point',
  'nobody cares', 'all alone', 'not enough', 'never good',
  'motivation', 'motivational', 'cope', 'coping', 'self help',
  'how to feel better', 'cheer up', 'feeling down',
];

const POSITIVE_KEYWORDS = [
  'happy', 'joy', 'excited', 'grateful', 'thankful', 'blessed',
  'love', 'wonderful', 'amazing', 'great', 'fantastic', 'awesome',
  'peaceful', 'calm', 'relaxed', 'content', 'satisfied', 'proud',
  'confident', 'strong', 'hopeful', 'inspired', 'motivated',
  'beautiful', 'brilliant', 'excellent', 'perfect', 'best',
  'smile', 'laugh', 'fun', 'enjoy', 'celebrate', 'accomplish',
];

export function analyzeSentiment(text: string): { score: number; mood: MoodType } {
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/);
  const totalWords = words.length;

  if (totalWords === 0) return { score: 0, mood: 'neutral' };

  let negativeCount = 0;
  let positiveCount = 0;

  for (const keyword of NEGATIVE_KEYWORDS) {
    if (lower.includes(keyword)) {
      negativeCount++;
    }
  }

  for (const keyword of POSITIVE_KEYWORDS) {
    if (lower.includes(keyword)) {
      positiveCount++;
    }
  }

  const negativeRatio = negativeCount / Math.max(totalWords, 1);
  const positiveRatio = positiveCount / Math.max(totalWords, 1);

  const score = Math.max(-1, Math.min(1, (positiveRatio - negativeRatio) * 10));

  let mood: MoodType;
  if (score > 0.3) mood = 'happy';
  else if (score > 0.1) mood = 'calm';
  else if (score > -0.1) mood = 'neutral';
  else if (score > -0.3) mood = 'stressed';
  else if (score > -0.5) mood = 'anxious';
  else mood = 'sad';

  return { score, mood };
}

export function analyzeTypingPattern(
  textLength: number,
  durationMs: number,
): { speed: 'slow' | 'normal' | 'fast'; indicator: MoodType } {
  if (durationMs === 0 || textLength === 0) {
    return { speed: 'normal', indicator: 'neutral' };
  }

  const charsPerSecond = textLength / (durationMs / 1000);

  if (charsPerSecond < 1.5) {
    return { speed: 'slow', indicator: 'sad' };
  } else if (charsPerSecond > 6) {
    return { speed: 'fast', indicator: 'anxious' };
  }
  return { speed: 'normal', indicator: 'neutral' };
}

export function shouldShowMotivation(
  recentMoods: MoodEntry[],
  recentJournals: JournalEntry[],
): boolean {
  const negativeMoods: MoodType[] = ['sad', 'stressed', 'anxious'];

  const recentNegativeMoods = recentMoods
    .filter(m => Date.now() - m.timestamp < 24 * 60 * 60 * 1000)
    .filter(m => negativeMoods.includes(m.mood));

  if (recentNegativeMoods.length >= 2) return true;

  const recentNegativeJournals = recentJournals
    .filter(j => Date.now() - j.timestamp < 24 * 60 * 60 * 1000)
    .filter(j => j.sentimentScore < -0.2);

  if (recentNegativeJournals.length >= 1) return true;

  const lastMood = recentMoods[0];
  if (lastMood && negativeMoods.includes(lastMood.mood)) return true;

  return false;
}

export const MOTIVATIONAL_MESSAGES = [
  { title: "Bhai, tu akela nahi hai", message: "Jo bhi chal raha hai, yaad rakh ki crores log aise hi feel karte hain. Tu matter karta hai, teri feelings valid hain." },
  { title: "Ye waqt bhi guzar jaayega", message: "Mushkil waqt hamesha nahi rehta, lekin strong log hamesha rehte hain. Har toofan ke baad dhoop aati hai." },
  { title: "Tu sochta hai se zyada strong hai", message: "Dekh kitna door aaya hai tu. Har challenge ne tujhe aur mazboot banaya hai." },
  { title: "Ek kadam ek waqt", message: "Sab kuch aaj solve karna zaroori nahi. Bas agla chhota step le. Progress progress hoti hai, chahe kitni bhi chhoti ho." },
  { title: "Apne aap se pyaar kar", message: "Tu bhi utni hi kindness deserve karta hai jitni doosron ko deta hai. Rest karna okay hai. Not okay hona bhi okay hai." },
  { title: "Teri feelings valid hain", message: "Apne feelings acknowledge karne mein himmat lagti hai. Ye awareness pehla step hai better feel karne ka." },
  { title: "Kal naya din hai", message: "Har subah ek fresh start laati hai. Aaj raat chaiyn se so, kal nayi shuruaat hogi." },
  { title: "Tu fark dalta hai", message: "Is duniya mein teri presence teri soch se zyada matter karti hai. Koi tere liye grateful hai." },
  { title: "Saans le", message: "Gehri saans le andar... aur dheere se bahar chhod. Is pal mein tu safe hai. Is pal mein tu kaafi hai." },
  { title: "Chhoti khushiyan matter karti hain", message: "Ek garam chai, ek achha word, ek pal dhoop ka. Ye chhoti cheezein milke kuch khoobsurat banti hain." },
  { title: "Tu kaafi hai", message: "Tujhe kisi ko apni worth prove nahi karni. Tu pyaar aur khushi ka haqdar hai, jaisa bhi hai." },
  { title: "Chalte reh", message: "Ye fact ki tu yahan hai, ye padh raha hai — ye incredible strength dikhata hai. Apni resilience ko underestimate mat kar." },
];

export function getRandomMotivation() {
  return MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
}

export function getMoodScore(mood: MoodType): number {
  const scores: Record<MoodType, number> = {
    happy: 5, calm: 4, neutral: 3, stressed: 2, anxious: 1, sad: 0,
  };
  return scores[mood];
}

export function getTimeOfDayContext(): 'earlyMorning' | 'morning' | 'afternoon' | 'evening' | 'lateNight' {
  const hour = new Date().getHours();
  if (hour >= 0 && hour < 5) return 'lateNight';
  if (hour >= 5 && hour < 8) return 'earlyMorning';
  if (hour >= 8 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'lateNight';
}

export const MOOD_CONFIG: Record<MoodType, { label: string; icon: string; color: string }> = {
  happy: { label: 'Happy', icon: 'sunny', color: '#10B981' },
  calm: { label: 'Calm', icon: 'water', color: '#3B82F6' },
  neutral: { label: 'Okay', icon: 'remove-circle', color: '#F59E0B' },
  stressed: { label: 'Stressed', icon: 'flash', color: '#F97316' },
  sad: { label: 'Sad', icon: 'rainy', color: '#8B5CF6' },
  anxious: { label: 'Anxious', icon: 'thunderstorm', color: '#EF4444' },
};
