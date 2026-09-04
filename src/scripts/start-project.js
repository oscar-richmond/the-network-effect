/**
 * START A PROJECT — the site-wide form modal's driver (R40, Oscar
 * 2026-09-04). The schedule-a-call modal's machinery (contact.js)
 * reused wholesale: hidden → reflow → is-open (the backdrop fades on
 * its own properties), body overflow lock + Lenis stop/start, Esc, a
 * Tab loop across the modal's focusables + the logo twin, focus to
 * the first control on open and back to the TRIGGER on close, the
 * 0.6s frost-out before [hidden]. Every `[data-start-project]` on the
 * page opens it (delegated — the footer chip, the contact CTA, the
 * floating chip, the menu CTA), passing itself as the return-focus
 * target. Opening announces `ne:modal-open` so a sibling modal (the
 * contact page's) closes; it listens for the same to close itself.
 *
 * STEPS: a small state machine — /01 (pillars ≥ 1, who optional) →
 * /02 (name, email, message required; company optional) → success |
 * error. The step transition is the house blur-crossfade
 * (SP_STEP_OUT_MS / SP_STEP_IN_MS), the /0N index updating at the
 * swap. R44: the panel is a full-height DRAWER, so the R40 height
 * tween is retired — the steps crossfade in place and the scroll
 * wrapper returns to its top; the PROGRESS BAR (--sp-progress on the
 * panel: ⅓ / ⅔ / full, error holds ⅔) tweens at SP_PROGRESS_MS. The
 * slide durations are CSS tunables (--sp-drawer-in-s / -out-s); the
 * close guard still waits SP_CLOSE_MS. RM: instant swaps, no tweens.
 *
 * SUBMIT: the deck-request client pattern — the honeypot short-
 * circuits to success, fetch JSON to /api/start-project, the send
 * button holds SENDING (aria-busy) while pending; error keeps the
 * entered data for retry. DEEP LINK: ?project=1 or #start-project.
 */
import { getLenisInstance } from './landing/site-scroll.js';

export const SP_STEP_OUT_MS = 360;
export const SP_STEP_IN_MS = 420;
export const SP_PROGRESS_MS = 420; /* the progress bar's tween (CSS --sp-progress-s) */
export const SP_CLOSE_MS = 620; /* the frost-out and the drawer's slide-out guard (CSS --sp-drawer-out-s 0.48s inside it) */
export const SP_PROGRESS = { 1: '33.3333%', 2: '66.6667%', success: '100%', error: '66.6667%' };
export const SP_QUERY_KEY = 'project';
export const SP_HASH = '#start-project';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MESSAGES = {
  pillars: 'Choose at least one.',
  name: 'Tell us your name.',
  email: 'That email doesn’t look right.',
  message: 'A line or two is all we need.',
};

export function initStartProject() {
  const modal = document.querySelector('[data-sp-modal]');
  if (!(modal instanceof HTMLElement)) return () => {};
  const backdrop = modal.querySelector('[data-sp-backdrop]');
  const panel = modal.querySelector('[data-sp-panel]');
  const logoTwin = document.querySelector('[data-sp-logo]');
  const steps = new Map(Array.from(modal.querySelectorAll('[data-sp-step]')).map((el) => [el.dataset.spStep, el]));
  const index = modal.querySelector('[data-sp-index]');
  const scroll = modal.querySelector('[data-sp-scroll]');
  const live = modal.querySelector('[data-sp-live]');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cleanups = [];
  const timeouts = [];
  const schedule = (fn, ms) => timeouts.push(window.setTimeout(fn, ms));
  let open = false;
  let opener = null;
  let step = '1';
  let animating = false;
  let sending = false;

  /* ── the logo twin: the desktop wordmark text (the ensureLogoChars discipline) */
  if (logoTwin instanceof HTMLElement && window.matchMedia('(min-width: 1025px)').matches) logoTwin.textContent = 'TheNetworkEffect';

  const announce = (text) => { if (live instanceof HTMLElement) { live.textContent = ''; schedule(() => { live.textContent = text; }, 30); } };
  const errorEl = (key) => modal.querySelector(`[data-sp-error="${key}"]`);
  const setError = (key, msg) => {
    const el = errorEl(key); if (!(el instanceof HTMLElement)) return;
    el.textContent = msg || '';
    el.classList.toggle('is-on', !!msg);
    const ctl = key === 'pillars' ? modal.querySelector('[data-sp-pillars]') : modal.querySelector(`[name="${key}"]`);
    if (ctl instanceof HTMLElement) ctl.setAttribute('aria-invalid', msg ? 'true' : 'false');
  };
  const field = (name) => modal.querySelector(`[name="${name}"]`);
  const value = (name) => { const el = field(name); return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement ? el.value.trim() : ''; };
  const pillars = () => Array.from(modal.querySelectorAll('input[name="pillars"]:checked')).map((c) => c.value);
  const who = () => { const r = modal.querySelector('input[name="who"]:checked'); return r instanceof HTMLInputElement ? r.value : ''; };

  /* ── steps */
  const setIndex = (s) => { if (index instanceof HTMLElement) index.textContent = s === '1' ? '/01' : s === '2' ? '/02' : ''; };
  const setProgress = (s) => { if (panel instanceof HTMLElement) panel.style.setProperty('--sp-progress', SP_PROGRESS[s] || SP_PROGRESS[1]); };
  setProgress(step);
  const focusFirst = (s) => {
    if (!open) return; /* a closed modal never takes focus (the post-close reset swaps steps silently) */
    const el = steps.get(s); if (!(el instanceof HTMLElement)) return;
    const first = el.querySelector('input:not([tabindex="-1"]), textarea, button');
    if (first instanceof HTMLElement) first.focus({ preventScroll: true });
  };
  const showStep = (next, { instant = false } = {}) => {
    if (next === step || animating) return;
    const from = steps.get(step); const to = steps.get(next);
    if (!(from instanceof HTMLElement) || !(to instanceof HTMLElement) || !(panel instanceof HTMLElement)) return;
    step = next; setIndex(next); setProgress(next);
    const toTop = () => { if (scroll instanceof HTMLElement) scroll.scrollTop = 0; };
    if (reduced || instant) {
      from.hidden = true; to.hidden = false; toTop(); focusFirst(next); return;
    }
    animating = true;
    from.classList.add('is-out');
    schedule(() => {
      from.hidden = true; from.classList.remove('is-out');
      to.hidden = false; to.classList.add('is-in'); toTop();
      void to.offsetWidth;
      to.classList.remove('is-in');
      schedule(() => { animating = false; focusFirst(next); }, SP_STEP_IN_MS + 20);
    }, SP_STEP_OUT_MS);
  };

  /* ── validation */
  const validateStep1 = () => { const ok = pillars().length > 0; setError('pillars', ok ? '' : MESSAGES.pillars); if (!ok) announce(MESSAGES.pillars); return ok; };
  const validateStep2 = () => {
    const errs = {};
    if (!value('name')) errs.name = MESSAGES.name;
    if (!EMAIL_RE.test(value('email'))) errs.email = MESSAGES.email;
    if (!value('message')) errs.message = MESSAGES.message;
    ['name', 'email', 'company', 'message'].forEach((k) => setError(k, errs[k]));
    const first = ['name', 'email', 'message'].find((k) => errs[k]);
    if (first) { announce(errs[first]); field(first)?.focus(); }
    return !first;
  };

  /* ── submit */
  const sendBtn = modal.querySelector('[data-sp-send]');
  const sendLabel = modal.querySelector('[data-sp-send-label]');
  const setSending = (on) => {
    sending = on;
    if (sendBtn instanceof HTMLButtonElement) { sendBtn.disabled = on; sendBtn.setAttribute('aria-busy', on ? 'true' : 'false'); sendBtn.classList.toggle('is-sending', on); }
    if (sendLabel instanceof HTMLElement) {
      /* the char-ripple wrap holds the label in a cr-sr + cr-chars pair — swap the text at the source and let the wrap rebuild */
      const sr = sendLabel.querySelector('.cr-sr'); const chars = sendLabel.querySelector('.cr-chars');
      const text = on ? 'SENDING' : 'SEND';
      if (sr && chars) { sr.textContent = text; chars.textContent = ''; for (const ch of text) { const s = document.createElement('span'); s.className = 'cr-char'; s.textContent = ch; chars.appendChild(s); } }
      else sendLabel.textContent = text;
    }
  };
  const submit = () => {
    if (sending || !validateStep2()) return;
    const trap = field('website');
    if (trap instanceof HTMLInputElement && trap.value.trim() !== '') { showStep('success'); return; } /* the honeypot: pretend success */
    setSending(true);
    const payload = { pillars: pillars(), who: who(), name: value('name'), email: value('email'), company: value('company'), message: value('message'), website: '' };
    const req = window.__spMockSend ? window.__spMockSend(payload) : fetch('/api/start-project', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    Promise.resolve(req)
      .then((res) => (res && res.ok ? res.json() : Promise.reject(new Error(String(res && res.status)))))
      .then((data) => { if (!(data && data.ok)) return Promise.reject(new Error('bad-payload')); setSending(false); showStep('success'); announce('Sent. We’ll be in touch within two working days.'); })
      .catch(() => { setSending(false); showStep('error'); announce('Something didn’t send.'); });
  };

  /* ── open / close (the contact modal's construction) */
  const focusables = () => {
    const list = Array.from(modal.querySelectorAll('button, a[href], input, textarea, select, [tabindex]:not([tabindex="-1"])'))
      .filter((el) => el instanceof HTMLElement && !el.hidden && !el.closest('[hidden]') && !el.closest('.sp-hp') && !(el instanceof HTMLButtonElement && el.disabled));
    if (logoTwin instanceof HTMLElement && !logoTwin.hidden) list.push(logoTwin);
    return list;
  };
  const onTrapKey = (e) => {
    if (!open || e.key !== 'Tab') return;
    const list = focusables(); if (!list.length) return;
    const first = list[0], last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    else if (!list.includes(document.activeElement)) { e.preventDefault(); first.focus(); }
  };
  const openModal = (triggerEl) => {
    if (open) return;
    open = true; opener = triggerEl instanceof HTMLElement ? triggerEl : null;
    document.dispatchEvent(new CustomEvent('ne:modal-open', { detail: 'start-project' }));
    getLenisInstance()?.stop();
    document.body.style.overflow = 'hidden';
    document.documentElement.classList.add('sp-modal-open');
    modal.hidden = false;
    if (logoTwin instanceof HTMLElement) logoTwin.hidden = false;
    void modal.offsetWidth;
    modal.classList.add('is-open');
    logoTwin?.classList.add('is-open');
    schedule(() => focusFirst(step), reduced ? 0 : 120);
  };
  const closeModal = () => {
    if (!open) return;
    open = false;
    modal.classList.remove('is-open');
    logoTwin?.classList.remove('is-open');
    document.documentElement.classList.remove('sp-modal-open');
    const finish = () => {
      modal.hidden = true;
      if (logoTwin instanceof HTMLElement) logoTwin.hidden = true;
      document.body.style.overflow = '';
      getLenisInstance()?.start();
      /* return focus to the trigger; a trigger that is no longer focusable
         (inside the retracted menu, or a chip that is hidden at this scroll
         position) hands focus to the menu toggle instead of nothing */
      if (opener instanceof HTMLElement) {
        opener.focus({ preventScroll: true });
        if (document.activeElement !== opener) {
          /* the menu toggle is on every page and always focusable — the
             wordmark is not a link on the landing */
          const alt = document.querySelector('[data-menu-toggle]');
          if (alt instanceof HTMLElement) alt.focus({ preventScroll: true });
        }
      }
      opener = null;
      /* a finished submission starts clean next time; an abandoned one keeps its data (the reference's pattern) */
      if (step === 'success') { resetForm(); showStep('1', { instant: true }); }
      else if (step === 'error') showStep('2', { instant: true });
    };
    if (reduced) finish(); else schedule(finish, SP_CLOSE_MS);
  };
  const resetForm = () => {
    if (panel instanceof HTMLFormElement) panel.reset();
    modal.querySelectorAll('[data-sp-tile]').forEach((t) => t.classList.remove('is-selected'));
    modal.querySelectorAll('[data-sp-chip]').forEach((t) => t.classList.remove('is-selected'));
    ['pillars', 'name', 'email', 'company', 'message'].forEach((k) => setError(k, ''));
  };

  /* ── wiring */
  const onDocClick = (e) => {
    const t = e.target instanceof Element ? e.target.closest('[data-start-project]') : null;
    if (!(t instanceof HTMLElement)) return;
    e.preventDefault();
    openModal(t);
  };
  document.addEventListener('click', onDocClick);
  cleanups.push(() => document.removeEventListener('click', onDocClick));
  const onSiblingOpen = (e) => { if (e.detail !== 'start-project') closeModal(); };
  document.addEventListener('ne:modal-open', onSiblingOpen);
  cleanups.push(() => document.removeEventListener('ne:modal-open', onSiblingOpen));
  const onKey = (e) => { if (open && e.key === 'Escape') { e.preventDefault(); closeModal(); } };
  document.addEventListener('keydown', onKey);
  document.addEventListener('keydown', onTrapKey);
  cleanups.push(() => { document.removeEventListener('keydown', onKey); document.removeEventListener('keydown', onTrapKey); });
  const onModalClick = (e) => {
    const t = e.target instanceof Element ? e.target : null; if (!t) return;
    if (t.closest('[data-sp-close]') || t.closest('[data-sp-cancel]') || t.closest('[data-sp-done]')) { closeModal(); return; }
    if (t.closest('[data-sp-next]')) { if (validateStep1()) showStep('2'); return; }
    if (t.closest('[data-sp-back]')) { showStep('1'); return; }
    if (t.closest('[data-sp-retry]')) { showStep('2'); return; }
  };
  modal.addEventListener('click', onModalClick);
  cleanups.push(() => modal.removeEventListener('click', onModalClick));
  if (backdrop instanceof HTMLElement) { backdrop.addEventListener('click', closeModal); cleanups.push(() => backdrop.removeEventListener('click', closeModal)); }
  const onSubmit = (e) => { e.preventDefault(); if (step === '2') submit(); };
  panel?.addEventListener('submit', onSubmit);
  cleanups.push(() => panel?.removeEventListener('submit', onSubmit));
  /* the tiles / chips reflect their inputs (the visible state is a class; the input is the truth) */
  const onChange = (e) => {
    const t = e.target;
    if (!(t instanceof HTMLInputElement)) return;
    if (t.name === 'pillars') { t.closest('[data-sp-tile]')?.classList.toggle('is-selected', t.checked); if (pillars().length) setError('pillars', ''); }
    if (t.name === 'who') modal.querySelectorAll('[data-sp-chip]').forEach((c) => c.classList.toggle('is-selected', c.querySelector('input')?.checked === true));
  };
  modal.addEventListener('change', onChange);
  cleanups.push(() => modal.removeEventListener('change', onChange));
  const onInput = (e) => { const t = e.target; if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) { if (t.name && t.name !== 'website') setError(t.name, ''); } };
  modal.addEventListener('input', onInput);
  cleanups.push(() => modal.removeEventListener('input', onInput));
  const onBlur = (e) => { const t = e.target; if (!(t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) || step !== '2') return; if (t.name === 'name' && !t.value.trim()) setError('name', MESSAGES.name); if (t.name === 'email' && t.value.trim() && !EMAIL_RE.test(t.value.trim())) setError('email', MESSAGES.email); if (t.name === 'message' && !t.value.trim()) setError('message', MESSAGES.message); };
  modal.addEventListener('focusout', onBlur);
  cleanups.push(() => modal.removeEventListener('focusout', onBlur));

  /* ── the deep link */
  const params = new URLSearchParams(window.location.search);
  if (params.get(SP_QUERY_KEY) === '1' || window.location.hash === SP_HASH) schedule(() => openModal(null), 400);

  if (import.meta.env.DEV) {
    window.__startProject = { open: () => openModal(null), close: closeModal, isOpen: () => open, step: () => step, showStep, validateStep1, validateStep2, sending: () => sending, progress: () => panel instanceof HTMLElement ? panel.style.getPropertyValue('--sp-progress') : '' };
  }

  return () => {
    cleanups.forEach((fn) => fn());
    timeouts.forEach(clearTimeout);
    if (open) { modal.hidden = true; modal.classList.remove('is-open'); if (logoTwin instanceof HTMLElement) { logoTwin.hidden = true; logoTwin.classList.remove('is-open'); } document.body.style.overflow = ''; document.documentElement.classList.remove('sp-modal-open'); open = false; }
    if (import.meta.env.DEV) window.__startProject = null;
  };
}
