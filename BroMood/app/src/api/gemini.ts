/**
 * Gemini API client — all calls go through backend proxy
 * API key is NEVER exposed in frontend
 */

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'https://bromood-backend.replit.app';

export interface GeminiMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  message: string;
  urgency_flag: boolean;
  suggested_action?: 'show_emergency' | 'suggest_therapist' | 'show_task' | null;
  detected_emotion?: string;
}

/**
 * Send a raw prompt to Gemini and get text back (for sentiment analysis)
 */
export async function callGeminiBackend(prompt: string): Promise<string> {
  const response = await fetch(`${BACKEND_URL}/api/sentiment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-App-Secret': process.env.EXPO_PUBLIC_APP_SECRET ?? '',
    },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    throw new Error(`Gemini backend error: ${response.status}`);
  }

  const data = await response.json() as { text: string };
  return data.text;
}

/**
 * Send a chat message to Bro_AI
 */
export async function sendChatMessage(
  messages: GeminiMessage[],
  systemContext: {
    moodScore: number;
    themes: string[];
    chatMode: 'vent' | 'advice' | 'listen';
    language: string;
  }
): Promise<ChatResponse> {
  const response = await fetch(`${BACKEND_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-App-Secret': process.env.EXPO_PUBLIC_APP_SECRET ?? '',
    },
    body: JSON.stringify({ messages, systemContext }),
  });

  if (!response.ok) {
    throw new Error(`Chat error: ${response.status}`);
  }

  return response.json() as Promise<ChatResponse>;
}

/**
 * Analyze journal entry for sentiment
 */
export async function analyzeJournalEntry(text: string, language: string): Promise<{
  sentiment: string;
  score: number;
  themes: string[];
  urgencyFlag: boolean;
}> {
  const response = await fetch(`${BACKEND_URL}/api/sentiment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-App-Secret': process.env.EXPO_PUBLIC_APP_SECRET ?? '',
    },
    body: JSON.stringify({ text, language }),
  });

  if (!response.ok) throw new Error('Sentiment analysis failed');
  return response.json();
}
