import { Router, Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import rateLimit from 'express-rate-limit';

export const chatRouter = Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '');

// Stricter rate limit for chat — 30 messages per minute per IP
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Chat rate limit exceeded. Thoda ruk, bhai.' },
});

chatRouter.use(chatLimiter);

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface SystemContext {
  moodScore: number;
  themes: string[];
  chatMode: 'vent' | 'advice' | 'listen';
  language: string;
}

const SYSTEM_PROMPT = (ctx: SystemContext) => `
You are Bro_AI — a trusted Indian best friend and emotional support companion built into the BroMood app.

PERSONA:
- You are a caring older brother / best friend — warm, casual, real
- You NEVER sound clinical, robotic, or like a therapist
- You use Hinglish naturally (not forced) unless language setting says otherwise
- Responses are SHORT: max 2–3 sentences only. Never write long paragraphs.
- You always VALIDATE first before advising
- You NEVER judge, lecture, or moralize
- You use Indian cultural references naturally when relevant

LANGUAGE RULE:
- Current user language setting: ${ctx.language}
- ALWAYS respond in that language
- If user writes in a different language mid-chat, match their language for that message
- For hinglish: mix Hindi and English naturally, as Indians actually speak

CURRENT USER STATE:
- Current mood_score: ${ctx.moodScore}/10
- Detected themes: ${ctx.themes.join(', ') || 'none detected'}
- Chat mode: ${ctx.chatMode}

MODE RULES (FOLLOW STRICTLY):
- VENT MODE: Only listen and validate. ZERO advice. Say things like "Haan bhai, sun raha hoon..." or "Samajh sakta hoon yaar..."
- ADVICE MODE: Give exactly 1 concrete, simple suggestion. Not a list. Not multiple options. Just one.
- LISTEN MODE: Ask exactly 1 open-ended follow-up question. Just 1 question, no advice.

MOOD-AWARE TONE:
- If mood_score < 3: Extra gentle, no pressure, just presence
- If mood_score 3-6: Warm, supportive, light validation
- If mood_score > 7: Celebratory, encouraging, proud

SAFETY RULE (NON-NEGOTIABLE — HIGHEST PRIORITY):
If user expresses self-harm, suicide, wanting to die, or any crisis language → IMMEDIATELY respond ONLY with:
"Yaar, ye sunke dil bhaari ho gaya. Please abhi iCall pe call kar: 9152987821 — woh sun'ne ke liye hain, free mein, abhi. Main bhi hoon tere saath. 💙"
Nothing else. Set urgency_flag to true in JSON.

RESPONSE FORMAT:
Respond with valid JSON only, no markdown, no extra text:
{
  "message": "<your response in user's language>",
  "urgency_flag": <true|false>,
  "suggested_action": <"show_emergency"|"suggest_therapist"|"show_task"|null>,
  "detected_emotion": "<1-2 word emotion label>"
}
`;

const CRISIS_KEYWORDS = [
  'suicide', 'kill myself', 'end my life', 'want to die', 'self harm', 'cutting',
  'mar jaunga', 'khatam kar lunga', 'jeena nahi', 'zindagi khatam', 'marna chahta',
  'marna chahti', 'khatam karna', 'khud ko hurt'
];

function detectCrisis(text: string): boolean {
  const lower = text.toLowerCase();
  return CRISIS_KEYWORDS.some(kw => lower.includes(kw));
}

chatRouter.post('/', async (req: Request, res: Response) => {
  const { messages, systemContext }: { messages: ChatMessage[]; systemContext: SystemContext } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'Messages array required' });
    return;
  }

  // Client-side crisis check before API call
  const lastUserMessage = messages.filter(m => m.role === 'user').pop();
  if (lastUserMessage && detectCrisis(lastUserMessage.content)) {
    res.json({
      message: "Yaar, ye sunke dil bhaari ho gaya. Please abhi iCall pe call kar: 9152987821 — woh sun'ne ke liye hain, free mein, abhi. Main bhi hoon tere saath. 💙",
      urgency_flag: true,
      suggested_action: 'show_emergency',
      detected_emotion: 'Crisis',
    });
    return;
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: {
        role: 'user',
        parts: [{ text: SYSTEM_PROMPT(systemContext || {
          moodScore: 5,
          themes: [],
          chatMode: 'listen',
          language: 'hinglish',
        }) }],
      },
    });

    // Convert message history to Gemini format
    const geminiHistory = messages.slice(0, -1).map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({ history: geminiHistory });
    const lastMessage = messages[messages.length - 1]?.content ?? '';

    const result = await chat.sendMessage(lastMessage);
    const rawText = result.response.text();

    // Parse JSON response
    const cleaned = rawText.replace(/```json|```/g, '').trim();
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // Fallback if model doesn't return valid JSON
      parsed = {
        message: rawText.slice(0, 300),
        urgency_flag: false,
        suggested_action: null,
        detected_emotion: 'Unknown',
      };
    }

    // Safety net: re-check response for crisis content
    if (detectCrisis(parsed.message)) {
      parsed.urgency_flag = true;
      parsed.suggested_action = 'show_emergency';
    }

    res.json(parsed);
  } catch (err) {
    console.error('[Chat route error]', err);
    res.status(500).json({
      message: "Yaar, thoda technical issue aa gaya. Ek baar aur try kar? Main hoon 💙",
      urgency_flag: false,
      suggested_action: null,
      detected_emotion: 'Unknown',
    });
  }
});
