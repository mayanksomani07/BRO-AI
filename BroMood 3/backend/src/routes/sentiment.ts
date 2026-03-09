import { Router, Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import rateLimit from 'express-rate-limit';

export const sentimentRouter = Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '');

// 20 sentiment analyses per minute
const sentimentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Rate limit exceeded' },
});

sentimentRouter.use(sentimentLimiter);

const SENTIMENT_PROMPT = (text: string, language: string) => `
You are an empathetic AI analyzing the emotional state of an Indian user.
The user's preferred language is: ${language}
Analyze the following text carefully.

Text: """${text}"""

Respond ONLY with valid JSON. No preamble, no explanation, no markdown.

{
  "sentiment": "positive" | "neutral" | "negative" | "critical",
  "score": <number 1-10, where 1=extremely distressed, 10=very positive>,
  "themes": <array containing only matching items from: ["breakup", "loneliness", "career_failure", "self_harm", "grief", "anger", "hope", "anxiety", "overwhelmed"]>,
  "urgencyFlag": <boolean — true ONLY if explicit self-harm, suicide, or immediate crisis language detected>,
  "hinglish_detected": <boolean>,
  "emotion_label": <1-2 word emotion label in English, e.g. "Hopeful", "Grieving", "Anxious", "Frustrated">
}
`;

sentimentRouter.post('/', async (req: Request, res: Response) => {
  const { text, language, prompt } = req.body as {
    text?: string;
    language?: string;
    prompt?: string; // raw prompt for direct Gemini calls
  };

  // Direct prompt mode (for SentimentAnalyzer.ts)
  if (prompt) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const result = await model.generateContent(prompt);
      res.json({ text: result.response.text() });
      return;
    } catch (err) {
      console.error('[Sentiment raw prompt error]', err);
      res.status(500).json({ error: 'Analysis failed' });
      return;
    }
  }

  if (!text || text.trim().length < 5) {
    res.status(400).json({ error: 'Text too short' });
    return;
  }

  // Sanitize: max 2000 chars
  const sanitized = text.slice(0, 2000);

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(
      SENTIMENT_PROMPT(sanitized, language ?? 'hinglish')
    );

    const raw = result.response.text();
    const cleaned = raw.replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // Fallback neutral result
      res.json({
        sentiment: 'neutral',
        score: 5,
        themes: [],
        urgencyFlag: false,
        hinglish_detected: false,
        emotion_label: 'Neutral',
      });
      return;
    }

    // Clamp score
    parsed.score = Math.max(1, Math.min(10, Number(parsed.score) || 5));

    // Validate urgency flag — extra safety check
    const CRISIS_KEYWORDS = ['self_harm', 'suicide', 'mar jaunga', 'khatam kar lunga'];
    if (CRISIS_KEYWORDS.some(k => sanitized.toLowerCase().includes(k))) {
      parsed.urgencyFlag = true;
    }

    res.json(parsed);
  } catch (err) {
    console.error('[Sentiment analysis error]', err);
    res.status(500).json({
      sentiment: 'neutral',
      score: 5,
      themes: [],
      urgencyFlag: false,
      hinglish_detected: false,
      emotion_label: 'Unknown',
    });
  }
});
