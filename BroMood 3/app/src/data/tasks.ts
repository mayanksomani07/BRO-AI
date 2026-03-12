/**
 * tasks.ts — SINGLE SOURCE OF TRUTH for all daily tasks.
 *
 * Both HomeScreen and TasksScreen import from here.
 * This guarantees they're always in sync — same task pool,
 * same IDs, same XP values, same filtering logic.
 */

export interface DailyTask {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  xpReward: number;
  category: 'mindfulness' | 'social' | 'movement' | 'self_care' | 'reflection';
  moodThreshold?: number; // only show if mood score in this range
  emoji: string;
  tier: 'base' | 'bonus' | 'extra'; // base=daily core, bonus=after all done, extra=infinite pool
}

export const CATEGORY_COLORS: Record<DailyTask['category'], string> = {
  mindfulness: '#A78BFA',
  social:      '#34D399',
  movement:    '#60A5FA',
  self_care:   '#F59E0B',
  reflection:  '#F472B6',
};

// ── BASE TASKS (daily core — shown every day) ─────────────────────────────────
export const BASE_TASKS: DailyTask[] = [
  { id: 'task_water',       title: 'Ek glass paani pi',       description: '2 minutes. Bas itna. Hydration is self-care.',           durationMinutes: 2,  xpReward: 10, category: 'self_care',   emoji: '💧',  tier: 'base', moodThreshold: 3 },
  { id: 'task_breath',      title: '4-7-8 Breathing',         description: '4 sec inhale, hold 7, exhale 8. Do 3 rounds.',           durationMinutes: 5,  xpReward: 20, category: 'mindfulness', emoji: '🌬️', tier: 'base' },
  { id: 'task_walk',        title: '10 min walk — no phone',  description: 'Bahar ja. Kuch mat dekh. Bas chal. Fresh air works.',    durationMinutes: 10, xpReward: 30, category: 'movement',    emoji: '🚶', tier: 'base' },
  { id: 'task_journal',     title: '3 cheezein likh',         description: 'Aaj 3 cheezein jo theek thin. Chhoti bhi chalti hai.',   durationMinutes: 5,  xpReward: 25, category: 'reflection',  emoji: '✍️', tier: 'base' },
  { id: 'task_text_friend', title: 'Ek dost ko text kar',     description: '"Kya haal hai?" — bas itna kaafi hai.',                  durationMinutes: 2,  xpReward: 35, category: 'social',      emoji: '📱', tier: 'base', moodThreshold: 5 },
  { id: 'task_stretch',     title: '5 min stretch',           description: 'Neck, shoulders, back. Body ko thoda pyaar do.',         durationMinutes: 5,  xpReward: 20, category: 'movement',    emoji: '🧘', tier: 'base' },
  { id: 'task_cold_water',  title: 'Cold water on face',      description: 'Emergency reset. 30 seconds. Works every time.',         durationMinutes: 1,  xpReward: 15, category: 'self_care',   emoji: '💦', tier: 'base', moodThreshold: 4 },
  { id: 'task_song',        title: 'Ek achha gaana sun',      description: 'Jo favourite hai. Aankhein band. Sirf sun.',             durationMinutes: 4,  xpReward: 15, category: 'self_care',   emoji: '🎵', tier: 'base' },
  { id: 'task_new_person',  title: 'Naye dost se baat kar',   description: 'LinkedIn, college group, anywhere. Ek hello.',           durationMinutes: 10, xpReward: 50, category: 'social',      emoji: '🤝', tier: 'base', moodThreshold: 7 },
  { id: 'task_gratitude',   title: 'Gratitude note',          description: 'Ek cheez likh jiske liye grateful hai aaj.',             durationMinutes: 3,  xpReward: 20, category: 'reflection',  emoji: '🙏', tier: 'base' },
];

// ── BONUS + EXTRA TASKS (infinite pool — shown after base done) ───────────────
export const EXTRA_TASKS: DailyTask[] = [
  { id: 'bonus_mirror',    title: 'Mirror mein muskurao',    description: 'Apne aap se pyaar karo. Cheesy but it works.',          durationMinutes: 1,  xpReward: 10, category: 'self_care',   emoji: '🪞',  tier: 'bonus' },
  { id: 'bonus_nophone',   title: 'Phone 10 min door rakh',  description: 'Sirf present raho. No notifications.',                  durationMinutes: 10, xpReward: 25, category: 'mindfulness', emoji: '📵',  tier: 'bonus' },
  { id: 'bonus_outside',   title: 'Bahar jao 5 min',         description: 'Fresh air. Every single time it helps.',                durationMinutes: 5,  xpReward: 20, category: 'movement',    emoji: '☀️', tier: 'bonus' },
  { id: 'bonus_sweet',     title: 'Kuch meetha kha',         description: 'Chhoti khushi bhi count karti hai.',                    durationMinutes: 2,  xpReward: 10, category: 'self_care',   emoji: '🍫',  tier: 'bonus' },
  { id: 'bonus_photo',     title: 'Ek purana photo dekh',    description: 'Good memories exist. Find one.',                        durationMinutes: 3,  xpReward: 15, category: 'reflection',  emoji: '📸',  tier: 'bonus' },
  { id: 'extra_sunlight',  title: '5 min sunlight',          description: 'Vitamin D + mood boost. Even cloudy counts.',            durationMinutes: 5,  xpReward: 20, category: 'movement',    emoji: '🌤️', tier: 'extra' },
  { id: 'extra_cold_show', title: '30 sec cold shower end',  description: 'Just the last 30 seconds cold. Dopamine spike.',         durationMinutes: 5,  xpReward: 30, category: 'self_care',   emoji: '🚿',  tier: 'extra' },
  { id: 'extra_compliment',title: 'Kisi ko compliment do',   description: 'Genuine ek compliment — makes both of you feel good.',  durationMinutes: 1,  xpReward: 25, category: 'social',      emoji: '💬',  tier: 'extra' },
  { id: 'extra_laugh',     title: 'Kuch funny dekh/sun',     description: 'YouTube, Reels, memes. 5 min laughter is medicine.',    durationMinutes: 5,  xpReward: 15, category: 'self_care',   emoji: '😂',  tier: 'extra' },
  { id: 'extra_meditate',  title: '5 min meditation',        description: 'Just sit. Eyes closed. No app needed.',                 durationMinutes: 5,  xpReward: 35, category: 'mindfulness', emoji: '🧠',  tier: 'extra' },
  { id: 'extra_pushup',    title: '10 pushups',              description: 'One set. Doesn\'t matter if form is bad. Just do it.',   durationMinutes: 3,  xpReward: 25, category: 'movement',    emoji: '💪',  tier: 'extra' },
  { id: 'extra_family',    title: 'Family se baat kar',      description: 'Call ya text — parents, siblings. Matters more than you think.', durationMinutes: 5, xpReward: 40, category: 'social', emoji: '👨‍👩‍👧', tier: 'extra' },
  { id: 'extra_read',      title: '10 min kuch padh',        description: 'Book, article, long-form. Reels not included.',         durationMinutes: 10, xpReward: 30, category: 'reflection',  emoji: '📚',  tier: 'extra' },
  { id: 'extra_declutter', title: 'Ek cheez clean karo',     description: 'Desk, bag, room corner. Ek cheez kaafi hai.',            durationMinutes: 5,  xpReward: 20, category: 'self_care',   emoji: '🧹',  tier: 'extra' },
  { id: 'extra_plan',      title: 'Kal ka ek plan banao',    description: 'Ek small goal for tomorrow. Clarity reduces anxiety.',  durationMinutes: 3,  xpReward: 20, category: 'reflection',  emoji: '🗓️', tier: 'extra' },
  { id: 'extra_dance',     title: '2 min dance karo',        description: 'Literally any song. Alone in room. Works every time.',  durationMinutes: 2,  xpReward: 20, category: 'movement',    emoji: '🕺',  tier: 'extra' },
  { id: 'extra_affirmation',title: '3 affirmations likho',   description: '"Main capable hun." — 3 times. Sounds dumb, works anyway.', durationMinutes: 2, xpReward: 15, category: 'mindfulness', emoji: '✨', tier: 'extra' },
  { id: 'extra_helpsome',  title: 'Kisi ki help karo',       description: 'Small thing. Hold door, help colleague, tip delivery guy.', durationMinutes: 5, xpReward: 40, category: 'social', emoji: '🤲', tier: 'extra' },
  { id: 'extra_nosocial',  title: '15 min social media off', description: 'Just 15 minutes. Silence is productive.',               durationMinutes: 15, xpReward: 25, category: 'mindfulness', emoji: '🔕',  tier: 'extra' },
  { id: 'extra_cooktea',   title: 'Chai ya coffee bana',     description: 'Manual brewing = mindfulness you can drink.',           durationMinutes: 8,  xpReward: 15, category: 'self_care',   emoji: '☕',  tier: 'extra' },
];

// ALL tasks combined (for imports that need the full pool)
export const ALL_TASKS_POOL = [...BASE_TASKS, ...EXTRA_TASKS];

/**
 * getAvailableTasks — returns the 6 daily tasks filtered by mood score.
 * IDENTICAL logic used by both HomeScreen and TasksScreen.
 * This is the single source of truth for "what tasks show today".
 */
export function getAvailableTasks(moodScore: number): DailyTask[] {
  return BASE_TASKS.filter(task => {
    if (task.moodThreshold !== undefined) {
      if (moodScore >= 5 && task.moodThreshold <= 3) return false;
      if (moodScore < 3 && task.moodThreshold > 3)  return false;
    }
    return true;
  }).slice(0, 6);
}

/**
 * getNextBonusTasks — returns N bonus tasks not yet completed.
 * Called infinitely after all base tasks are done.
 * Shuffles EXTRA_TASKS and excludes already completed ones.
 */
export function getNextBonusTasks(completedIds: Set<string>, count = 3): DailyTask[] {
  const available = EXTRA_TASKS.filter(t => !completedIds.has(t.id));
  // Deterministic shuffle based on time-of-day so both screens match
  const seed = Math.floor(Date.now() / (1000 * 60 * 60)); // changes every hour
  const shuffled = [...available].sort((a, b) => {
    const ha = simpleHash(a.id + seed);
    const hb = simpleHash(b.id + seed);
    return ha - hb;
  });
  return shuffled.slice(0, count);
}

function simpleHash(str: string | number): number {
  const s = String(str);
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash) + s.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}