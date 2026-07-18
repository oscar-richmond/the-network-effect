/**
 * Deck-request form behaviour (/holding-3 desktop, .holding-final).
 *
 * Client-side validation (required fields + basic email shape) with
 * inline, layout-stable errors; honeypot short-circuit (mirrors the
 * server: a filled trap "succeeds" silently — never reveal the trap);
 * restrained loading state (label swap + arrow fade, no spinner);
 * success replaces the form in place (visibility swap — the form is
 * never opacity-faded because its labels are difference-blend roots
 * and an ancestor fade would isolate/flash them); error appears below
 * the intact form with the mailto fallback, typed data preserved.
 *
 * Boots from holding-3.astro; no-ops on pages without the form.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SENDING_LABEL = 'Sending…';

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
  const successNote = document.querySelector('[data-deck-success]');
  const errorNote = document.querySelector('[data-deck-error-note]');
  const restingLabel = submitLabel?.textContent ?? 'Request';

  let sending = false;
  let sent = false;

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

  const showSuccess = () => {
    sent = true;
    if (errorNote instanceof HTMLElement) {
      errorNote.hidden = true;
      errorNote.classList.remove('is-in');
    }
    // Visibility, not opacity: the labels inside are difference-blend
    // roots — fading a shared ancestor would isolate the blend and
    // flash them white mid-fade. Hard cut out, soft fade in.
    form.classList.add('is-sent');
    reveal(successNote);
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
        successShown: successNote instanceof HTMLElement && !successNote.hidden,
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
 * Ported from Oscar's reference (ContactLink.tsx + .module.css) to
 * this project's vanilla-JS pattern — no React/CSS-modules in this
 * codebase. Behaviour matches the reference exactly: copy the email,
 * flip a `data-copied` attribute the CSS crossfades on (label + icon,
 * see holding-page.css), reset after COPY_RESET_MS, and STILL fire
 * the mailto regardless of copy success — most visitors have no
 * desktop mail client configured, so the copy is the affordance that
 * actually helps them; the rare visitor who does have one still gets
 * mailto triggered. mailto never unloads the page, so this is safe
 * alongside the copy confirmation staying visible.
 *
 * The mailto itself is read back from the link's own `href` (server-
 * rendered by Astro from the single contactMailto source of truth)
 * rather than reconstructed here — one address, one place it's typed.
 */
const COPY_RESET_MS = 2600;

export function initHoldingContactCopy() {
  const link = document.querySelector('[data-holding-contact-copy]');
  if (!(link instanceof HTMLAnchorElement)) return () => {};

  const email = link.dataset.contactEmail;
  const announcer = document.querySelector('[data-holding-contact-announcer]');
  if (!email) return () => {};

  let resetTimer = null;

  const announce = (text) => {
    if (announcer instanceof HTMLElement) announcer.textContent = text;
  };

  const onClick = (event) => {
    event.preventDefault();

    const copy = navigator.clipboard
      ? navigator.clipboard
          .writeText(email)
          .then(() => {
            link.setAttribute('data-copied', '');
            announce('Copied — get in touch');
            if (resetTimer) clearTimeout(resetTimer);
            resetTimer = setTimeout(() => {
              link.removeAttribute('data-copied');
              announce('');
            }, COPY_RESET_MS);
          })
          .catch(() => {
            // Clipboard blocked (rare) — mailto below still fires as
            // the fallback; no confirmation state to show.
          })
      : Promise.resolve();

    copy.finally(() => {
      window.location.href = link.href;
    });
  };

  link.addEventListener('click', onClick);

  return () => {
    link.removeEventListener('click', onClick);
    if (resetTimer) clearTimeout(resetTimer);
  };
}
