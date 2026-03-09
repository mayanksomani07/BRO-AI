/**
 * Gemini API client
 * Primary: direct Gemini API (uses EXPO_PUBLIC_GEMINI_KEY)
 * Fallback: smart offline responses if no key / no network
 */

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';
const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_KEY ?? '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;

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

// ─── Offline fallback responses ────────────────────────────────────────────────
const OFFLINE_RESPONSES = [
  "Bhai, sun raha hoon. Bata, kya ho raha hai? 💙",
  "Yaar, teri baat important hai. Continue kar.",
  "Main samajh sakta hoon. Ye sach mein mushkil hai.",
  "Tu akela nahi hai is mein. Main hoon na.",
  "Acha, phir kya hua? Bata mujhe.",
  "Bhai, ye feel karna bilkul valid hai. Kuch aur bata.",
  "Sunn, ek kaam kar — ek deep breath le pehle. Phir bata.",
  "Tu sahi kar raha hai. Baat karna seedha pehla step hai.",
];

function getOfflineResponse(content: string, language: string): string {
  const lower = content.toLowerCase();
  if (lower.includes('suicide') || lower.includes('mar') || lower.includes('end') || lower.includes('harm')) {
    return language === 'english'
      ? "Bhai, ye sunke dil heavy ho gaya. Please abhi iCall helpline call kar: 9152987821. They are trained, free, and available now. 💙"
      : "Bhai, please abhi iCall ko call kar: 9152987821. Ye free hai aur trained log hain. Tu important hai. 💙";
  }
  if (lower.includes('breakup') || lower.includes('ex') || lower.includes('relationship')) {
    return language === 'english'
      ? "Breakup pain is real pain bhai. It physically hurts. You don't have to be okay right now. Tell me more. 💙"
      : "Breakup ka dard real hota hai yaar. Abhi theek na hona bilkul sahi hai. Aur bata mujhe. 💙";
  }
  if (lower.includes('job') || lower.includes('career') || lower.includes('fail')) {
    return language === 'english'
      ? "Career pressure is brutal. One setback doesn't define you. Every person you respect has failed too. What happened? 💙"
      : "Career pressure bahut tough hai. Ek setback tujhe define nahi karta. Kya hua exactly? 💙";
  }
  if (lower.includes('lonely') || lower.includes('akela') || lower.includes('alone')) {
    return language === 'english'
      ? "Feeling lonely is one of the hardest feelings. I'm here. Tell me what's going on today. 💙"
      : "Akela feel karna bahut bhaari hota hai. Main hoon na. Aaj kya hua? 💙";
  }
  return OFFLINE_RESPONSES[Math.floor(Math.random() * OFFLINE_RESPONSES.length)];
}

// ─── Direct Gemini call ────────────────────────────────────────────────────────
async function callGeminiDirect(
  messages: GeminiMessage[],
  systemPrompt: string
): Promise<string> {
  const contents = [
    { role: 'user', parts: [{ text: systemPrompt }] },
    { role: 'model', parts: [{ text: 'Understood. I am Bro_AI, ready to help.' }] },
    ...messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
  ];

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: { temperature: 0.85, maxOutputTokens: 300 },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      ],
    }),
  });

  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json() as { candidates: { content: { parts: { text: string }[] } }[] };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

// ─── Backend proxy call ────────────────────────────────────────────────────────
async function callBackend(path: string, body: object): Promise<Response> {
  return fetch(`${BACKEND_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-App-Secret': process.env.EXPO_PUBLIC_APP_SECRET ?? '',
    },
    body: JSON.stringify(body),
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function sendChatMessage(
  messages: GeminiMessage[],
  systemContext: {
    moodScore: number;
    themes: string[];
    chatMode: 'vent' | 'advice' | 'listen';
    language: string;
  }
): Promise<ChatResponse> {
  const lastMsg = messages[messages.length - 1]?.content ?? '';
  const isUrgent = /suicide|kill myself|end it|harm|self harm/i.test(lastMsg);

  const modeInstructions: Record<string, string> = {
    vent: 'The user wants to vent — just listen, validate, do NOT give advice unless asked.',
    advice: 'The user wants advice — give clear, actionable suggestions.',
    listen: 'The user wants to be understood — reflect emotions back empathetically.',
  };

  const systemPrompt = `You are Bro_AI — a caring, non-judgmental AI companion for young Indian men experiencing emotional distress. Speak like a trustworthy older brother/best friend. Language: ${systemContext.language}. Mix Hindi/English naturally if language is hinglish.

Current mood score: ${systemContext.moodScore}/10. ${systemContext.themes.length > 0 ? `Detected themes: ${systemContext.themes.join(', ')}.` : ''}

Mode: ${modeInstructions[systemContext.chatMode]}

Rules:
- Keep responses SHORT (2-4 sentences max)
- Never be robotic or formal
- For crisis/self-harm: immediately provide iCall number: 9152987821
- Do NOT start with "I understand" or "I'm sorry" — be natural like a friend
- End with a question to keep conversation going`;

  // Try backend first (if configured)
  if (BACKEND_URL) {
    try {
      const res = await callBackend('/api/chat', { messages, systemContext });
      if (res.ok) return res.json() as Promise<ChatResponse>;
    } catch { /* fall through */ }
  }

  // Try direct Gemini API
  if (GEMINI_KEY) {
    try {
      const reply = await callGeminiDirect(messages, systemPrompt);
      if (reply) {
        return {
          message: reply,
          urgency_flag: isUrgent,
          detected_emotion: systemContext.themes[0] ?? 'neutral',
        };
      }
    } catch { /* fall through */ }
  }

  // Smart offline fallback
  return {
    message: getOfflineResponse(lastMsg, systemContext.language),
    urgency_flag: isUrgent,
    detected_emotion: 'unknown',
  };
}

export async function callGeminiBackend(prompt: string): Promise<string> {
  if (BACKEND_URL) {
    try {
      const res = await callBackend('/api/sentiment', { prompt });
      if (res.ok) {
        const data = await res.json() as { text: string };
        return data.text;
      }
    } catch { /* fall through */ }
  }

  if (GEMINI_KEY) {
    try {
      const res = await callGeminiDirect([{ role: 'user', content: prompt }], 'You are a helpful assistant.');
      return res;
    } catch { /* fall through */ }
  }

  return 'neutral';
}

export async function analyzeJournalEntry(text: string, language: string): Promise<{
  sentiment: string;
  score: number;
  themes: string[];
  urgencyFlag: boolean;
}> {
  const prompt = `Analyze the emotional sentiment of this journal entry. Return JSON only: {"sentiment":"positive|neutral|negative|distressed","score":0-10,"themes":["array","of","emotions"],"urgencyFlag":false}

Entry: "${text.substring(0, 500)}"`;

  try {
    let raw = '';
    if (BACKEND_URL) {
      const res = await callBackend('/api/sentiment', { text, language });
      if (res.ok) return res.json();
    }
    if (GEMINI_KEY) {
      raw = await callGeminiDirect([{ role: 'user', content: prompt }], 'Return only valid JSON.');
      const clean = raw.replace(/```json|```/g, '').trim();
      return JSON.parse(clean);
    }
  } catch { /* fall through */ }

  return { sentiment: 'neutral', score: 5, themes: [], urgencyFlag: false };
}