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

  if (import.meta.env.DEV) {
    window.__holdingDeckForm = {
      validate,
      debugState: () => ({
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
    form.removeEventListener('submit', onSubmit);
    form.removeEventListener('input', onInput);
  };
}
