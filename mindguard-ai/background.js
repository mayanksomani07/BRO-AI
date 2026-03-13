/**
 * MindGuard AI – Background Service Worker
 * Fix: "-latest" suffix is NOT a valid model name on v1beta API.
 *      Using gemini-2.0-flash with gemini-1.5-flash as fallback.
 */
'use strict';

importScripts('config.js');

// ── Keyword fallback ─────────────────────────────────────────────────────────
const KEYWORD_TIERS = [
  { tier: 'critical', words: [
    'kill myself', 'killing myself',
    'end my life', 'ending my life',
    'commit suicide', 'committing suicide', 'committed suicide',
    'take my own life', 'taking my own life',
    'want to die', 'wanting to die', 'i want to die',
    'going to kill myself', 'going to end it',
    'end it all', 'end everything',
    'suicide method', 'methods of suicide',
    'how to hang', 'how to overdose',
    'overdose on pills', 'jump off a bridge',
    'lethal dose', 'goodbye forever',
    'nobody will miss me', 'better off dead',
    'planning to die', 'no point in living',
  ]},
  { tier: 'high', words: [
    'suicidal', 'suicidal thoughts', 'suicidal feelings', 'feel suicidal',
    'feeling suicidal', 'i am suicidal',
    "don't want to live", "do not want to live",
    'no reason to live', 'no will to live',
    'life is not worth living', 'life not worth living',
    "can't go on", 'cannot go on', 'cant go on',
    'give up on life', 'giving up on life',
    'everyone hates me', 'no one cares if i die',
    'nobody cares if i die', 'nobody would miss me',
    'feel so empty inside', 'completely empty inside',
    'numb inside', 'wish i was never born',
    'wish i was dead', 'wish i were dead',
    'nobody loves me', 'no one loves me',
    'completely alone', 'totally alone',
    'feels like committing', 'feels like ending',
  ]},
  { tier: 'moderate', words: [
    'i hate my life', 'hate my life so much',
    'feeling hopeless', 'feel hopeless', 'so hopeless',
    'feeling worthless', 'feel worthless', 'i am worthless',
    'nothing to live for', 'nothing matters anymore',
    'constant sadness', 'always sad', 'crying all the time',
    'self harm', 'self-harm', 'hurting myself',
    'cutting myself', 'want to hurt myself',
    'severe depression', 'deeply depressed', 'mental breakdown',
    'feel like dying', 'feels like dying',
    'no one understands me', 'nobody understands',
    'so much pain', 'unbearable pain', 'cant take the pain',
  ]},
];

function keywordScan(text) {
  if (!text || text.trim().length < 3) return null;
  const lower = text.toLowerCase();
  for (const { tier, words } of KEYWORD_TIERS) {
    for (const w of words) {
      if (lower.includes(w)) {
        console.log(`[MindGuard] Keyword match: "${w}" → tier=${tier}`);
        return { tier, phrase: w, source: 'keyword' };
      }
    }
  }
  return null;
}

// ── Key management ────────────────────────────────────────────────────────────
async function syncApiKey() {
  const configKey = (typeof MINDGUARD_CONFIG !== 'undefined') ? MINDGUARD_CONFIG.GEMINI_API_KEY : '';
  const isReal = configKey && configKey !== 'YOUR_GEMINI_API_KEY_HERE';
  if (isReal) {
    await chrome.storage.local.set({ _mgKey: configKey });
    MINDGUARD_CONFIG.GEMINI_API_KEY = ''; // wipe global
    console.log('[MindGuard] ✅ Key synced. Preview: ' + configKey.slice(0,8) + '...' + configKey.slice(-4));
    return configKey;
  } else {
    console.warn('[MindGuard] ⚠️  No API key — keyword-only mode. Run: node build.js');
    return null;
  }
}

async function getApiKey() {
  const data = await chrome.storage.local.get('_mgKey');
  return data._mgKey || null;
}

// ── Gemini AI ─────────────────────────────────────────────────────────────────
// IMPORTANT: Do NOT use "-latest" suffix — not a valid model name on v1beta.
// Try models in order; first one that responds wins.
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-1.5-flash'];

const PROMPT_TEMPLATE = (text) => `You are a mental health crisis detection system inside a browser extension.
Read the text and return ONLY a raw JSON object — no markdown fences, no explanation.

Format: {"tier":"...","confidence":0.0,"signals":["phrase"],"reason":"one sentence"}

Tier values:
  critical  = direct suicidal intent, planning self-harm, imminent danger
  high      = passive ideation, severe hopelessness, wishing to die, feeling suicidal
  moderate  = significant distress, depression, isolation, self-harm
  none      = normal text, no crisis signals

Rules:
- "feels like committing suicide" → critical
- "suicidal" alone → high
- "I want to kill this bug" → none (figurative)
- "stressed about exams" → none

Examples:
Input: "feels like committing suicide"
Output: {"tier":"critical","confidence":0.97,"signals":["feels like committing suicide"],"reason":"Direct suicidal ideation expressed"}

Input: "I feel suicidal and don't know what to do"
Output: {"tier":"critical","confidence":0.95,"signals":["feel suicidal"],"reason":"Suicidal feelings explicitly stated"}

Input: "nobody cares about me, I feel completely alone"
Output: {"tier":"high","confidence":0.89,"signals":["nobody cares","completely alone"],"reason":"Severe isolation and hopelessness"}

Input: "this bug is killing me lol"
Output: {"tier":"none","confidence":0.97,"signals":[],"reason":"Figurative coding expression"}

Input: "I can't take this pain anymore, nothing matters"
Output: {"tier":"high","confidence":0.91,"signals":["can't take this pain","nothing matters"],"reason":"Inability to cope with hopelessness"}

Now analyze this text:
"${text.replace(/"/g, "'").replace(/\n/g, ' ').slice(0, 500)}"`;

async function callGemini(apiKey, model, text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  console.log(`[MindGuard] Trying model: ${model}`);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: PROMPT_TEMPLATE(text) }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 256 },
    }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const msg = errBody?.error?.message || `HTTP ${res.status}`;
    throw new Error(`${model}: ${msg}`);
  }

  const data = await res.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error(`${model}: empty response`);

  const clean = rawText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
  return JSON.parse(clean);
}

async function analyzeWithGemini(text) {
  const apiKey = await getApiKey();
  if (!apiKey) { console.log('[MindGuard] No key in storage'); return null; }

  for (const model of GEMINI_MODELS) {
    try {
      const result = await callGemini(apiKey, model, text);
      console.log(`[MindGuard] ✅ ${model} → tier="${result.tier}" conf=${result.confidence} — ${result.reason}`);
      return result;
    } catch (err) {
      console.warn(`[MindGuard] ❌ ${model} failed: ${err.message}`);
      // Try next model in the list
    }
  }

  console.error('[MindGuard] All models failed.');
  return null;
}

// ── Rate limiting ─────────────────────────────────────────────────────────────
let lastCallTime = 0;
const MIN_INTERVAL_MS = 4000;

// ── Main pipeline ─────────────────────────────────────────────────────────────
async function analyzeText(text) {
  if (!text || text.trim().length < 8) return null;

  const kwResult = keywordScan(text);
  if (kwResult?.tier === 'critical') {
    console.log('[MindGuard] Critical keyword — responding immediately');
    return kwResult;
  }

  const now = Date.now();
  if (now - lastCallTime < MIN_INTERVAL_MS) {
    console.log('[MindGuard] Rate limited — using keyword result');
    return kwResult || null;
  }

  try {
    lastCallTime = now;
    const ai = await analyzeWithGemini(text);
    if (!ai) return kwResult || null;

    const threshold = MINDGUARD_CONFIG?.CONFIDENCE_THRESHOLD ?? 0.65;

    if (ai.tier !== 'none' && ai.confidence >= threshold) {
      const { aiCallCount = 0 } = await chrome.storage.local.get('aiCallCount');
      chrome.storage.local.set({ aiCallCount: aiCallCount + 1 });
      return { tier: ai.tier, phrase: ai.signals?.[0] || text.slice(0,60),
               confidence: ai.confidence, reason: ai.reason, source: 'gemini-ai' };
    }
    if (ai.tier === 'none') return null;
  } catch (err) {
    console.warn('[MindGuard] Gemini pipeline error:', err.message);
  }

  return kwResult || null;
}

// ── Badge ──────────────────────────────────────────────────────────────────────
function setBadge(t, c) {
  chrome.action.setBadgeText({ text: t });
  chrome.action.setBadgeBackgroundColor({ color: c });
}

// ── Messages ───────────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg.type === 'ANALYZE_TEXT') {
    analyzeText(msg.payload.text).then(r => reply({ result: r })).catch(() => reply({ result: null }));
    return true;
  }
  if (msg.type === 'CRISIS_DETECTED') {
    const { tier, source, url, phrase } = msg.payload;
    setBadge('!', { critical:'#e05a5a', high:'#e0945a', moderate:'#7c9fd4' }[tier] || '#7c9fd4');
    chrome.storage.local.get(['events'], ({ events = [] }) => {
      events.unshift({ tier, source, hostname: url||'unknown', phrase:(phrase||'').slice(0,60), time: new Date().toLocaleString() });
      chrome.storage.local.set({ events: events.slice(0,100) });
    });
    if (tier !== 'moderate') {
      chrome.notifications.create({ type:'basic', iconUrl:'icons/icon128.png',
        title:'MindGuard – You are not alone', message:'Support resources are now showing. 💙', priority:2 });
    }
    reply({ ok: true });
  }
  if (msg.type === 'GET_EVENTS') {
    chrome.storage.local.get(['events'], ({ events }) => reply({ events: events||[] }));
    return true;
  }
  if (msg.type === 'CLEAR_EVENTS') {
    chrome.storage.local.set({ events:[] }, () => { setBadge('','#5a9fd4'); reply({ ok:true }); });
    return true;
  }
});

// ── Startup ────────────────────────────────────────────────────────────────────
(async () => {
  setBadge('', '#5a9fd4');
  const key = await syncApiKey();
  if (!key) return;

  // Smoke-test: find which model actually works with this key
  let workingModel = null;
  for (const model of GEMINI_MODELS) {
    try {
      const r = await callGemini(key, model, 'just browsing the internet today');
      console.log(`[MindGuard] ✅ Smoke-test passed with ${model}. tier=${r?.tier}`);
      workingModel = model;
      break;
    } catch (e) {
      console.warn(`[MindGuard] ❌ Smoke-test failed for ${model}:`, e.message);
    }
  }

  if (!workingModel) {
    console.error('[MindGuard] ❌ NO WORKING MODEL FOUND. Check your API key.');
    console.error('           Verify key at: https://aistudio.google.com/app/apikey');
  }
})();
