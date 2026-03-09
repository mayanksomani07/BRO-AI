import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

export const syncRouter = Router();

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// POST /api/sync/mood — sync anonymised mood trends
syncRouter.post('/mood', async (req: Request, res: Response) => {
  const supabase = getSupabase();
  if (!supabase) {
    res.status(503).json({ error: 'Cloud sync not configured' });
    return;
  }

  const { userId, moodHistory } = req.body as {
    userId?: string;
    moodHistory?: { score: number; date: number }[];
  };

  if (!userId || !Array.isArray(moodHistory)) {
    res.status(400).json({ error: 'userId and moodHistory required' });
    return;
  }

  try {
    // Only sync the score and date — NO personal content ever leaves device
    const anonymised = moodHistory.map(m => ({
      user_id: userId,
      mood_score: m.score,
      logged_at: new Date(m.date).toISOString(),
    }));

    const { error } = await supabase
      .from('mood_trends')
      .upsert(anonymised, { onConflict: 'user_id,logged_at' });

    if (error) throw error;

    res.json({ synced: anonymised.length });
  } catch (err) {
    console.error('[Sync error]', err);
    res.status(500).json({ error: 'Sync failed' });
  }
});

// DELETE /api/sync/user — wipe all cloud data for a user
syncRouter.delete('/user/:userId', async (req: Request, res: Response) => {
  const supabase = getSupabase();
  if (!supabase) {
    res.status(503).json({ error: 'Cloud sync not configured' });
    return;
  }

  const { userId } = req.params;
  if (!userId) {
    res.status(400).json({ error: 'userId required' });
    return;
  }

  try {
    await supabase.from('mood_trends').delete().eq('user_id', userId);
    res.json({ deleted: true });
  } catch (err) {
    console.error('[Delete user data error]', err);
    res.status(500).json({ error: 'Delete failed' });
  }
});
