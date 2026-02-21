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
  { title: "You Are Not Alone", message: "Whatever you're going through, remember that millions of people share similar feelings. You matter, and your feelings are valid." },
  { title: "This Too Shall Pass", message: "Tough times don't last, but tough people do. Every storm runs out of rain eventually." },
  { title: "You Are Stronger Than You Think", message: "Look how far you've come. Every challenge you've faced has made you more resilient." },
  { title: "One Step at a Time", message: "You don't have to solve everything today. Just take the next small step. Progress is progress, no matter how small." },
  { title: "Be Kind to Yourself", message: "You deserve the same compassion you give to others. It's okay to rest. It's okay to not be okay." },
  { title: "Your Feelings Are Valid", message: "It takes courage to acknowledge how you feel. That awareness is the first step toward feeling better." },
  { title: "Tomorrow Is a New Day", message: "Every sunrise brings a fresh start. Tonight, rest easy knowing that a new beginning is just hours away." },
  { title: "You Make a Difference", message: "Your presence in this world matters more than you know. Someone out there is grateful for you." },
  { title: "Breathe", message: "Take a deep breath in... and slowly let it out. In this moment, you are safe. In this moment, you are enough." },
  { title: "Small Joys Matter", message: "A warm cup of tea, a kind word, a moment of sunshine. These small things add up to something beautiful." },
  { title: "You Are Enough", message: "You don't need to prove your worth to anyone. You are worthy of love and happiness just as you are." },
  { title: "Keep Going", message: "The fact that you're here, reading this, shows incredible strength. Never underestimate your own resilience." },
];

export function getRandomMotivation() {
  return MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
}

export const MOOD_CONFIG: Record<MoodType, { label: string; icon: string; color: string }> = {
  happy: { label: 'Happy', icon: 'sunny', color: '#10B981' },
  calm: { label: 'Calm', icon: 'water', color: '#3B82F6' },
  neutral: { label: 'Okay', icon: 'remove-circle', color: '#F59E0B' },
  stressed: { label: 'Stressed', icon: 'flash', color: '#F97316' },
  sad: { label: 'Sad', icon: 'rainy', color: '#8B5CF6' },
  anxious: { label: 'Anxious', icon: 'thunderstorm', color: '#EF4444' },
};
