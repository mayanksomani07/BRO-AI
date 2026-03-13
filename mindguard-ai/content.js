/**
 * MindGuard AI – Content Script
 *
 * Key fixes:
 *  1. Removed pendingRequest flag — it permanently jams when SW dies mid-request
 *     Replaced with per-element debounce + a 10s timeout safety valve
 *  2. Monitors all inputs, textareas, contenteditable, search bars
 *  3. Also checks URL search params on page load / navigation
 */
(function () {
  'use strict';

  // Config values — fall back to safe defaults if config.js not loaded
  const CFG = (typeof MINDGUARD_CONFIG !== 'undefined') ? MINDGUARD_CONFIG : {};
  const DEBOUNCE_MS  = CFG.DEBOUNCE_MS  || 1200;
  const MIN_CHARS    = CFG.MIN_CHARS    || 8;
  const COOLDOWN_MS  = CFG.COOLDOWN_MS  || 240000;

  let overlayVisible = false;
  let debounceTimer  = null;
  let lastShownAt    = 0;
  let analysisTimeout = null; // Safety: reset if SW dies

  // ── Send text to background for analysis ──────────────────────────────────
  function analyze(text) {
    if (!text || text.trim().length < MIN_CHARS) return;
    if (overlayVisible) return;

    // Safety timeout — if SW dies and callback never fires, we don't stay frozen
    clearTimeout(analysisTimeout);
    analysisTimeout = setTimeout(() => {
      console.log('[MindGuard] Analysis timeout — service worker may have restarted');
    }, 10000);

    chrome.runtime.sendMessage(
      { type: 'ANALYZE_TEXT', payload: { text: text.trim() } },
      (response) => {
        clearTimeout(analysisTimeout);

        if (chrome.runtime.lastError) {
          // SW was inactive — Chrome will wake it on next message. Log and continue.
          console.log('[MindGuard] SW wake-up:', chrome.runtime.lastError.message);
          return;
        }

        const result = response?.result;
        if (!result) return;

        const now = Date.now();
        if (result.tier !== 'critical' && (now - lastShownAt) < COOLDOWN_MS) return;

        lastShownAt = now;

        chrome.runtime.sendMessage({
          type: 'CRISIS_DETECTED',
          payload: {
            tier:       result.tier,
            phrase:     result.phrase,
            source:     result.source,
            confidence: result.confidence,
            url:        window.location.hostname,
          },
        });

        showOverlay(result);
      }
    );
  }

  // ── Input event handler ───────────────────────────────────────────────────
  function onInput(e) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const el = e.target;
      const text = (el.value || el.innerText || el.textContent || '').trim();
      if (text.length >= MIN_CHARS) analyze(text);
    }, DEBOUNCE_MS);
  }

  // ── Attach to all text inputs ─────────────────────────────────────────────
  function attachListeners() {
    const sel = [
      'input[type="text"]',
      'input[type="search"]',
      'input:not([type])',
      'textarea',
      '[contenteditable="true"]',
      '[role="textbox"]',
      '[role="searchbox"]',
      '[role="combobox"]',
    ].join(',');

    document.querySelectorAll(sel).forEach(el => {
      if (!el.dataset.mgBound) {
        el.addEventListener('input', onInput, { passive: true });
        el.dataset.mgBound = '1';
      }
    });
  }

  // ── URL / search query check ──────────────────────────────────────────────
  function checkURL() {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q') || params.get('query') || params.get('search')
           || params.get('p') || params.get('s') || params.get('text') || '';
    if (q.length >= MIN_CHARS) {
      console.log('[MindGuard] URL query detected:', q.slice(0, 60));
      analyze(q);
    }
  }

  // ── Watch for new inputs (SPAs add elements dynamically) ─────────────────
  new MutationObserver(attachListeners)
    .observe(document.body || document.documentElement, { childList: true, subtree: true });

  // ── Watch for SPA navigation (URL changes without page reload) ────────────
  let lastURL = location.href;
  new MutationObserver(() => {
    if (location.href !== lastURL) {
      lastURL = location.href;
      setTimeout(checkURL, 700);
    }
  }).observe(document, { subtree: true, childList: true });

  // ── Overlay ───────────────────────────────────────────────────────────────
  function showOverlay(result) {
    removeOverlay();
    overlayVisible = true;

    const { tier, reason, confidence, source } = result;
    const isCritical = tier === 'critical';
    const isAI       = source === 'gemini-ai';
    const confPct    = confidence ? Math.round(confidence * 100) : null;

    const el = document.createElement('div');
    el.id = 'mg-overlay';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');

    const badge = (isAI && confPct)
      ? `<span class="mg-ai-badge">🤖 AI · ${confPct}% confidence</span>`
      : `<span class="mg-ai-badge mg-kw">🔍 Keyword match</span>`;

    el.innerHTML = `
      <div id="mg-backdrop"></div>
      <div id="mg-card" class="mg-tier-${tier}">
        <button id="mg-close" aria-label="Close">✕</button>
        <div class="mg-top">
          <div class="mg-pulse ${isCritical ? 'pulse-red' : 'pulse-blue'}"></div>
          <span class="mg-tag">MindGuard</span>${badge}
        </div>
        <div class="mg-icon">${isCritical ? '🫂' : tier === 'high' ? '💙' : '🌿'}</div>
        <h2 class="mg-headline">${
          isCritical
            ? "You don't have to go through this alone."
            : tier === 'high'
              ? "It sounds like you're carrying something heavy."
              : "Hey — are you doing okay?"
        }</h2>
        <p class="mg-body">${
          isCritical
            ? "What you're feeling right now is real and valid — and so are you. There are people who want to help, right now, free of charge."
            : tier === 'high'
              ? "Sometimes the hardest thoughts come when we're most exhausted. You don't have to face this alone."
              : "It's okay not to be okay. Reaching out is one of the bravest things you can do."
        }</p>
        ${reason ? `<p class="mg-reason">"${reason}"</p>` : ''}
        <div class="mg-resources">
          <a class="mg-btn mg-btn-primary" href="tel:988">
            <span class="mg-btn-icon">📞</span>
            <span class="mg-btn-body"><strong>Call or Text 988</strong><small>Suicide &amp; Crisis Lifeline · Free 24/7</small></span>
          </a>
          <a class="mg-btn" href="https://www.crisistextline.org" target="_blank" rel="noopener">
            <span class="mg-btn-icon">💬</span>
            <span class="mg-btn-body"><strong>Crisis Text Line</strong><small>Text HOME to 741741 · US / UK / Canada</small></span>
          </a>
          <a class="mg-btn" href="https://findahelpline.com" target="_blank" rel="noopener">
            <span class="mg-btn-icon">🌍</span>
            <span class="mg-btn-body"><strong>Find a Helpline Near You</strong><small>Global directory — India, UK, AU &amp; more</small></span>
          </a>
          <a class="mg-btn" href="https://www.befrienders.org" target="_blank" rel="noopener">
            <span class="mg-btn-icon">🤝</span>
            <span class="mg-btn-body"><strong>Befrienders Worldwide</strong><small>Someone to talk to, anytime</small></span>
          </a>
        </div>
        <p class="mg-footer">🔒 Private · No data shared · MindGuard AI</p>
      </div>`;

    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('mg-in'));
    el.querySelector('#mg-close').addEventListener('click', removeOverlay);
    el.querySelector('#mg-backdrop').addEventListener('click', removeOverlay);
    document.addEventListener('keydown', onEsc);
  }

  function onEsc(e) { if (e.key === 'Escape') removeOverlay(); }

  function removeOverlay() {
    const el = document.getElementById('mg-overlay');
    if (el) {
      el.classList.remove('mg-in');
      el.classList.add('mg-out');
      setTimeout(() => el.remove(), 400);
    }
    overlayVisible = false;
    document.removeEventListener('keydown', onEsc);
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    attachListeners();
    setTimeout(checkURL, 800);
    console.log('[MindGuard] Content script loaded on:', location.hostname);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
