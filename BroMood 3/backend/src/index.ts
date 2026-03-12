import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

import { chatRouter } from './routes/chat';
import { sentimentRouter } from './routes/sentiment';
import { syncRouter } from './routes/sync';
import { authMiddleware } from './middleware/auth';

const app = express();
const PORT = process.env.PORT ?? 3000;

// ─── Security middleware ───────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: ['https://bromood.app', 'exp://localhost:8082', 'http://localhost:8082'],
  methods: ['GET', 'POST'],
  credentials: false,
}));

// Global rate limiter — 200 requests per 15 minutes per IP
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests. Chill, bhai.' },
  standardHeaders: true,
  legacyHeaders: false,
}));

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
});

// ─── API routes (auth-protected) ──────────────────────────────────────────────
app.use('/api', authMiddleware);
app.use('/api/chat', chatRouter);
app.use('/api/sentiment', sentimentRouter);
app.use('/api/sync', syncRouter);

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Error]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 BroMood backend running on port ${PORT}`);
  console.log(`   Gemini key: ${process.env.GEMINI_API_KEY ? '✅ set' : '❌ missing'}`);
  console.log(`   Supabase:   ${process.env.SUPABASE_URL ? '✅ set' : '⚠️  not set (sync disabled)'}`);
});

export default app;
