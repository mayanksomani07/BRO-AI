/**
 * SentimentAnalyzer — uses Gemini API (via backend proxy) to analyze journal/chat text
 */

import { callGeminiBackend } from '../api/gemini';

export type SentimentLevel = 'positive' | 'neutral' | 'negative' | 'critical';

export type EmotionTheme =
  | 'breakup'
  | 'loneliness'
  | 'career_failure'
  | 'self_harm'
  | 'grief'
  | 'anger'
  | 'hope'
  | 'anxiety'
  | 'overwhelmed';

export interface SentimentResult {
  sentiment: SentimentLevel;
  score: number;         // 1–10, 1=extremely distressed, 10=very positive
  detected_themes: EmotionTheme[];
  urgency_flag: boolean;
  hinglish_detected: boolean;
  emotion_label: string;
}

const SENTIMENT_PROMPT = (text: string) => `
You are an empathetic AI analyzing the emotional state of an Indian user.
Analyze the following text carefully.

Text: """${text}"""

Respond ONLY with valid JSON. No preamble, no explanation, no markdown.

{
  "sentiment": "positive" | "neutral" | "negative" | "critical",
  "score": <number 1-10, where 1=extremely distressed, 10=very positive>,
  "detected_themes": <array from: ["breakup", "loneliness", "career_failure", "self_harm", "grief", "anger", "hope", "anxiety", "overwhelmed"]>,
  "urgency_flag": <boolean — true ONLY if explicit self-harm, suicide, or crisis language detected>,
  "hinglish_detected": <boolean>,
  "emotion_label": <short emotion label in 1-2 words, e.g. "Hopeful", "Grieving", "Anxious">
}
`;

export async function analyzeJournalSentiment(text: string): Promise<SentimentResult> {
  if (!text || text.trim().length < 10) {
    return defaultNeutralResult();
  }

  try {
    const response = await callGeminiBackend(SENTIMENT_PROMPT(text));
    const cleaned = response.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned) as SentimentResult;

    // Validate and clamp score
    parsed.score = Math.max(1, Math.min(10, parsed.score));
    if (!parsed.detected_themes) parsed.detected_themes = [];
    if (typeof parsed.urgency_flag !== 'boolean') parsed.urgency_flag = false;
    if (typeof parsed.hinglish_detected !== 'boolean') parsed.hinglish_detected = false;

    return parsed;
  } catch (err) {
    console.warn('[SentimentAnalyzer] Parse error, returning neutral', err);
    return defaultNeutralResult();
  }
}

function defaultNeutralResult(): SentimentResult {
  return {
    sentiment: 'neutral',
    score: 5,
    detected_themes: [],
    urgency_flag: false,
    hinglish_detected: false,
    emotion_label: 'Neutral',
  };
}

export function sentimentToMoodScore(result: SentimentResult): number {
  // Normalize sentiment score (1–10) to mood contribution (1–10)
  return result.score;
}
