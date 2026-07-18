/**
 * Deck-request form behaviour (/holding-3 desktop, .holding-final).
 *
 * Client-side validation (required fields + basic email shape) with
 * inline, layout-stable errors; honeypot short-circuit (mirrors the
 * server: a filled trap "succeeds" silently — never reveal the trap);
 * restrained loading state (label swap + arrow fade, no spinner);
 * error appears below the intact form with the mailto fallback,
 * typed data preserved.
 *
 * SUCCESS (Oscar's revision): the form state animates OUT — the
 * reverse of its entry (heading/sub .is-in off, field/button leaves
 * .is-visible off; never a group fade, the blended sub/labels would
 * flash) — then the SENT state ("Sent — we'll be in touch shortly.")
 * line-reveals centred in the slot, lingers SENT_LINGER_MS, and the
 * page returns itself to the landing (intro) state with the form
 * fully reset, so the deck CTA works again for a fresh request. That
 * return REPLAYS the intro's original land-on-the-site entrance
 * (title line-rise, paragraph stagger, CTA draw-in — see
 * replayHoldingIntroEntrance in holding-entry.js) rather than a flat
 * container fade — the Back-button's quick return (closeForm) is
 * untouched, it still uses the simple group fade.
 *
 * Boots from holding-3.astro; no-ops on pages without the form.
 */
import { wrapLineRevealElement, playLineRevealElement } from '../line-reveal.js';
import { replayHoldingIntroEntrance } from './holding-entry.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SENDING_LABEL = 'Sending…';
const SENT_LINGER_MS = 3000;
const SENT_EXIT_MS = 320;

const MESSAGES = {
  name: 'Please add your name.',
  email: 'Please add a valid email address.',
  company: 'Please add your company.',
};

export function initHoldingDeckForm() {
  const form = document.querySelector('[data-holding-deck-form]');
  if (!(form instanceof HTMLFormElement)) return () => {};

  const input = (key) => form.querySelector(`[data-deck-input="${key}"]`);
  const errorEl = (key) => form.querySelector(`[data-deck-error="${key}"]`);
  const fields = ['name', 'email', 'company'];

  const submitBtn = form.querySelector('[data-deck-submit]');
  const submitLabel = form.querySelector('[data-deck-submit-label]');
  const submitArrow = form.querySelector('[data-deck-submit-arrow]');
  const sentBlock = document.querySelector('[data-deck-sent]');
  const sentLine = document.querySelector('[data-deck-sent-line]');
  const errorNote = document.querySelector('[data-deck-error-note]');
  const restingLabel = submitLabel?.textContent ?? 'Request';

  let sending = false;
  let sent = false;
  let sentLineWrapped = false;

  const setFieldError = (key, message) => {
    const el = input(key);
    const err = errorEl(key);
    if (!(el instanceof HTMLInputElement) || !(err instanceof HTMLElement)) return;
    if (message) {
      el.classList.add('is-invalid');
      el.setAttribute('aria-invalid', 'true');
      el.setAttribute('aria-describedby', err.id);
      err.textContent = message;
      err.hidden = false;
    } else {
      el.classList.remove('is-invalid');
      el.removeAttribute('aria-invalid');
      el.removeAttribute('aria-describedby');
      err.hidden = true;
    }
  };

  const validate = () => {
    const errors = {};
    const name = input('name')?.value.trim() ?? '';
    const email = input('email')?.value.trim() ?? '';
    const company = input('company')?.value.trim() ?? '';
    if (!name) errors.name = MESSAGES.name;
    if (!EMAIL_RE.test(email)) errors.email = MESSAGES.email;
    if (!company) errors.company = MESSAGES.company;
    return errors;
  };

  const setSending = (on) => {
    sending = on;
    if (!(submitBtn instanceof HTMLElement)) return;
    submitBtn.classList.toggle('is-sending', on);
    if (on) {
      submitBtn.setAttribute('aria-busy', 'true');
      submitBtn.setAttribute('disabled', '');
    } else {
      submitBtn.removeAttribute('aria-busy');
      submitBtn.removeAttribute('disabled');
    }
    if (submitLabel instanceof HTMLElement) {
      submitLabel.textContent = on ? SENDING_LABEL : restingLabel;
    }
  };

  const reveal = (note) => {
    if (!(note instanceof HTMLElement)) return;
    note.hidden = false;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => note.classList.add('is-in'));
    });
  };

  /* SUCCESS sequence (Oscar's revision): form state OUT (reverse of
   * its entry — the same leaf mechanics the Back swap uses; never a
   * group fade, see the blend note), then the sent line reveals
   * centred in the slot via the house line-reveal, lingers
   * SENT_LINGER_MS, then the slot returns itself to the landing
   * (intro) state with a fully reset form. */
  const armSentLine = () => {
    if (!(sentLine instanceof HTMLElement)) return;
    if (!sentLineWrapped) {
      // Wrap once, AFTER the block is unhidden (wrapping measures
      // line boxes; a display:none measure would mis-group). Same
      // task as the unhide — no unwrapped-frame flash.
      wrapLineRevealElement(sentLine);
      sentLineWrapped = true;
    } else {
      // Re-arm for a repeat play: lr-visible off returns the inner
      // to its below-clip resting state (done while hidden, unseen).
      sentLine
        .querySelectorAll(':scope > .lr-clip')
        .forEach((clip) => clip.classList.remove('lr-visible'));
    }
  };

  const revealSent = () => {
    formBlock instanceof HTMLElement && (formBlock.hidden = true);
    if (!(sentBlock instanceof HTMLElement)) return;
    sentBlock.hidden = false;
    if (reduced) {
      // Static, instant — the line is never wrapped under RM.
      sentBlock.focus({ preventScroll: true });
      timers.push(setTimeout(returnToLanding, SENT_LINGER_MS));
      return;
    }
    armSentLine();
    // Commit the wrapped below-clip state before playing (forced
    // reflow, not rAF — same idiom as the rest of the swaps).
    void sentBlock.offsetWidth;
    timers.push(
      setTimeout(() => {
        if (sentLine instanceof HTMLElement) playLineRevealElement(sentLine);
      }, 20),
    );
    sentBlock.focus({ preventScroll: true });
    // "3 seconds after it says Sent" — the linger starts at reveal.
    timers.push(setTimeout(returnToLanding, SENT_LINGER_MS));
  };

  const showSuccess = () => {
    sent = true;
    animating = true;
    clearTimers();
    if (errorNote instanceof HTMLElement) {
      errorNote.hidden = true;
      errorNote.classList.remove('is-in');
    }
    if (reduced) {
      animating = false;
      revealSent();
      return;
    }
    // Reverse of the form's entry: heading/sub fade back out, field
    // and button leaves retract — identical mechanics to the Back
    // exit, deliberately.
    stripFormReveals();
    timers.push(
      setTimeout(() => {
        animating = false;
        revealSent();
      }, FORM_EXIT_MS),
    );
  };

  const returnToLanding = () => {
    animating = true;

    const finishReturn = () => {
      if (sentBlock instanceof HTMLElement) {
        sentBlock.hidden = true;
        sentBlock.classList.remove('is-out');
        // Re-arm the line while hidden so a future success replays.
        if (sentLine instanceof HTMLElement) {
          sentLine
            .querySelectorAll(':scope > .lr-clip')
            .forEach((clip) => clip.classList.remove('lr-visible'));
        }
      }
      // Fully reset the form: the landing CTA is live again and a
      // second request starts pristine.
      [...fields, 'website'].forEach((key) => {
        const el = input(key);
        if (el instanceof HTMLInputElement) el.value = '';
      });
      fields.forEach((key) => setFieldError(key, undefined));
      setSending(false);
      sent = false;
      if (intro instanceof HTMLElement) {
        // No container-level fade here (unlike closeForm's quick
        // Back-button return) — the container itself is just present
        // at rest, and replayHoldingIntroEntrance's title/paragraph/
        // CTA reveal IS the entrance, matching the original
        // land-on-the-site choreography (Oscar's revision). Reset
        // happens while still hidden (its own contract) so nothing
        // flashes; unhide immediately after so the first scheduled
        // replay timer (title, +0ms) has a visible target.
        intro.classList.remove('is-out');
        replayHoldingIntroEntrance();
        intro.hidden = false;
      }
      state = 'intro';
      animating = false;
      openBtn?.focus();
    };

    if (reduced || !(sentBlock instanceof HTMLElement)) {
      finishReturn();
    } else {
      // Group fade out — legal here, plain text only.
      sentBlock.classList.add('is-out');
      timers.push(setTimeout(finishReturn, SENT_EXIT_MS));
    }
  };

  const showError = () => {
    reveal(errorNote);
  };

  const onSubmit = (event) => {
    event.preventDefault();
    if (sending || sent) return;

    if (errorNote instanceof HTMLElement) {
      errorNote.hidden = true;
      errorNote.classList.remove('is-in');
    }

    const errors = validate();
    fields.forEach((key) => setFieldError(key, errors[key]));
    const firstInvalid = fields.find((key) => errors[key]);
    if (firstInvalid) {
      input(firstInvalid)?.focus();
      return;
    }

    // Honeypot: mirror the server's silent drop — pretend success,
    // send nothing.
    const trap = input('website');
    if (trap instanceof HTMLInputElement && trap.value.trim() !== '') {
      showSuccess();
      return;
    }

    setSending(true);
    fetch(form.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: input('name').value.trim(),
        email: input('email').value.trim(),
        company: input('company').value.trim(),
        website: '',
      }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data) => {
        if (data && data.ok) {
          setSending(false);
          showSuccess();
        } else {
          return Promise.reject(new Error('bad-payload'));
        }
      })
      .catch(() => {
        setSending(false);
        showError();
      });
  };

  const onInput = (event) => {
    const el = event.target;
    if (!(el instanceof HTMLInputElement)) return;
    const key = el.dataset.deckInput;
    if (key && key !== 'website') setFieldError(key, undefined);
  };

  form.addEventListener('submit', onSubmit);
  form.addEventListener('input', onInput);

  /* ── Intro <-> form state swap (Oscar's click-trigger conversion) ──
   * One slot, two states. The intro exits as a GROUP fade (legal —
   * no blend roots inside it); the form enters/leaves via its LEAF
   * elements only (heading/sub .is-in, fields/buttons .is-visible —
   * the blended sub and labels must never sit under an animating
   * ancestor). Sequencing uses timers + a forced reflow rather than
   * rAF so the swap also completes in throttled/background tabs.
   * Reduced motion: both directions swap instantly, no fades. */
  const intro = document.querySelector('[data-deck-intro]');
  const formBlock = document.querySelector('[data-deck-form-block]');
  const openBtn = document.querySelector('[data-deck-open]');
  const backBtn = form.querySelector('[data-deck-back]');
  const formHeading = formBlock?.querySelector('.holding-final__title');
  const formSub = formBlock?.querySelector('.holding-final__sub');
  const fieldRows = Array.from(form.querySelectorAll('[data-holding-final-field]'));

  const INTRO_EXIT_MS = 320;
  const FORM_EXIT_MS = 420;
  // Compressed in-page timings — the page-load 680ms slots would feel
  // sluggish mid-session; same primitives, roughly halved.
  const FORM_IN = { heading: 0, sub: 100, fieldsAt: 160, fieldStep: 80, back: 380, submit: 460 };

  let state = 'intro';
  let animating = false;
  const timers = [];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const later = (fn, ms) => {
    if (reduced) fn();
    else timers.push(setTimeout(fn, ms));
  };
  const clearTimers = () => {
    timers.forEach(clearTimeout);
    timers.length = 0;
  };

  const stripFormReveals = () => {
    formHeading?.classList.remove('is-in');
    formSub?.classList.remove('is-in');
    fieldRows.forEach((row) => row.classList.remove('is-visible'));
    backBtn?.classList.remove('is-visible');
    submitBtn?.classList.remove('is-visible');
  };

  const openForm = () => {
    if (!intro || !formBlock || state !== 'intro' || animating || sent) return;
    animating = true;
    clearTimers();

    const proceed = () => {
      intro.hidden = true;
      stripFormReveals();
      formBlock.hidden = false;
      // Forced reflow: the unhidden elements commit their hidden
      // opacity-0 state before any reveal class lands, so the fades
      // actually run (and none of this depends on rAF).
      void formBlock.offsetWidth;
      later(() => formHeading?.classList.add('is-in'), FORM_IN.heading);
      later(() => formSub?.classList.add('is-in'), FORM_IN.sub);
      fieldRows.forEach((row, i) => {
        later(() => row.classList.add('is-visible'), FORM_IN.fieldsAt + i * FORM_IN.fieldStep);
      });
      later(() => backBtn?.classList.add('is-visible'), FORM_IN.back);
      later(() => submitBtn?.classList.add('is-visible'), FORM_IN.submit);
      state = 'form';
      animating = false;
      input('name')?.focus();
    };

    if (reduced) {
      proceed();
    } else {
      intro.classList.add('is-out');
      timers.push(setTimeout(proceed, INTRO_EXIT_MS));
    }
  };

  const closeForm = () => {
    if (!intro || !formBlock || state !== 'form' || animating || sending || sent) return;
    animating = true;
    clearTimers();

    // Reopening starts clean: errors clear (typed values are kept).
    fields.forEach((key) => setFieldError(key, undefined));
    if (errorNote instanceof HTMLElement) {
      errorNote.hidden = true;
      errorNote.classList.remove('is-in');
    }

    const finish = () => {
      formBlock.hidden = true;
      intro.hidden = false;
      if (reduced) {
        intro.classList.remove('is-out');
      } else {
        void intro.offsetWidth;
        timers.push(setTimeout(() => intro.classList.remove('is-out'), 20));
      }
      state = 'intro';
      animating = false;
      openBtn?.focus();
    };

    if (reduced) {
      finish();
    } else {
      stripFormReveals();
      timers.push(setTimeout(finish, FORM_EXIT_MS));
    }
  };

  const onOpenClick = () => openForm();
  const onBackClick = () => closeForm();
  const onKeydown = (event) => {
    if (event.key === 'Escape') closeForm();
  };

  openBtn?.addEventListener('click', onOpenClick);
  backBtn?.addEventListener('click', onBackClick);
  document.addEventListener('keydown', onKeydown);

  if (import.meta.env.DEV) {
    window.__holdingDeckForm = {
      validate,
      openForm,
      closeForm,
      debugState: () => ({
        state,
        animating,
        sending,
        sent,
        sentShown: sentBlock instanceof HTMLElement && !sentBlock.hidden,
        errorShown: errorNote instanceof HTMLElement && !errorNote.hidden,
        values: Object.fromEntries(
          [...fields, 'website'].map((k) => [k, input(k)?.value ?? null]),
        ),
      }),
    };
  }

  return () => {
    clearTimers();
    form.removeEventListener('submit', onSubmit);
    form.removeEventListener('input', onInput);
    openBtn?.removeEventListener('click', onOpenClick);
    backBtn?.removeEventListener('click', onBackClick);
    document.removeEventListener('keydown', onKeydown);
  };
}

/**
 * Contact click-to-copy (/holding-3 desktop, .holding-final).
 *
 * Copies the email, confirms via the CURSOR-BOUND tooltip pill
 * (Oscar's revision — the link itself shows no feedback; see
 * .holding-final__copy-tip in holding-page.css): shown at the click
 * point, then following the pointer on every mousemove while
 * visible, auto-hiding after COPY_RESET_MS. Keyboard activation has
 * no cursor — the pill anchors to the link's own box instead and
 * simply doesn't track. The hidden announcer live-region mirrors the
 * confirmation for AT (the visual pill is aria-hidden — a
 * pointer-chasing element is useless to a screen reader).
 *
 * The mailto STILL fires regardless of copy success — most visitors
 * have no desktop mail client configured (the copy is what actually
 * helps them), but the rare visitor who does still gets it; mailto
 * never unloads the page, so the tooltip survives it.
 *
 * The mailto itself is read from the link's own `href` (Astro-
 * rendered from the single contactMailto source of truth) rather
 * than reconstructed here — one address, one place it's typed.
 */
const COPY_RESET_MS = 2600;
const TIP_OFFSET_X = 14;
const TIP_OFFSET_Y = 18;
const TIP_FADE_OUT_MS = 220;

export function initHoldingContactCopy() {
  const link = document.querySelector('[data-holding-contact-copy]');
  if (!(link instanceof HTMLAnchorElement)) return () => {};

  const email = link.dataset.contactEmail;
  const tip = document.querySelector('[data-holding-copy-tip]');
  const announcer = document.querySelector('[data-holding-contact-announcer]');
  if (!email) return () => {};

  let hideTimer = null;
  let removeTimer = null;
  let tracking = false;

  const announce = (text) => {
    if (announcer instanceof HTMLElement) announcer.textContent = text;
  };

  const place = (x, y) => {
    if (tip instanceof HTMLElement) {
      tip.style.transform = `translate3d(${x + TIP_OFFSET_X}px, ${y + TIP_OFFSET_Y}px, 0)`;
    }
  };

  const onMove = (event) => place(event.clientX, event.clientY);

  const stopTracking = () => {
    if (tracking) {
      window.removeEventListener('mousemove', onMove);
      tracking = false;
    }
  };

  const hideTip = () => {
    stopTracking();
    announce('');
    if (!(tip instanceof HTMLElement)) return;
    tip.classList.remove('is-in');
    // Let the no-preference fade-out play before display:none; under
    // reduced motion opacity snaps instantly and the extra beat is
    // invisible.
    removeTimer = setTimeout(() => {
      tip.hidden = true;
    }, TIP_FADE_OUT_MS);
  };

  const showTip = (x, y) => {
    if (!(tip instanceof HTMLElement)) return;
    if (hideTimer) clearTimeout(hideTimer);
    if (removeTimer) clearTimeout(removeTimer);
    place(x, y);
    tip.hidden = false;
    // Commit the hidden opacity-0 state before .is-in so the entrance
    // fade actually runs (same forced-reflow idiom as the state swap).
    void tip.offsetWidth;
    tip.classList.add('is-in');
    if (!tracking) {
      window.addEventListener('mousemove', onMove);
      tracking = true;
    }
    hideTimer = setTimeout(hideTip, COPY_RESET_MS);
  };

  const onClick = (event) => {
    event.preventDefault();

    // Keyboard activation (Enter) reports no useful coordinates —
    // anchor the pill just under the link instead and skip tracking
    // until the mouse next moves (the listener re-anchors it).
    const rect = link.getBoundingClientRect();
    const hasPointer = event.clientX !== 0 || event.clientY !== 0;
    const x = hasPointer ? event.clientX : rect.left;
    const y = hasPointer ? event.clientY : rect.bottom;

    const copy = navigator.clipboard
      ? navigator.clipboard
          .writeText(email)
          .then(() => {
            showTip(x, y);
            announce('Email copied');
          })
          .catch(() => {
            // Clipboard blocked (rare) — mailto below still fires as
            // the fallback; no confirmation to show.
          })
      : Promise.resolve();

    copy.finally(() => {
      window.location.href = link.href;
    });
  };

  link.addEventListener('click', onClick);

  return () => {
    link.removeEventListener('click', onClick);
    stopTracking();
    if (hideTimer) clearTimeout(hideTimer);
    if (removeTimer) clearTimeout(removeTimer);
  };
}
