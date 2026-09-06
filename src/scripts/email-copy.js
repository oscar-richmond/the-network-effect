/**
 * EMAIL COPY — R82 (Oscar, 2026-09-05).
 *
 * Oscar's launch-gate item 4: every route to the address should COPY it
 * AND open the mail client with the To and the Subject already filled
 * in. /contact's EMAIL US button already did both (contact.js, with the
 * contact page's own pointer-tracked tooltip). This is the same
 * contract for the address wherever else it appears — the footer's two
 * instances and the menu's — so a visitor gets one behaviour from the
 * site rather than two.
 *
 * WHY NOT REUSE contact.js. That copy block is welded to the contact
 * page's tooltip element and its pointer-following placement, both of
 * which Oscar has already signed off. Lifting it would have meant
 * re-verifying that placement on five other layouts for no gain. This
 * module owns the simpler case: no page markup required, it creates its
 * own tooltip and live region on first use, and it is a no-op on any
 * page that has no marked links. /contact keeps its own; the two are
 * deliberately separate implementations of one behaviour, which is
 * worth revisiting only if a third appears.
 *
 * THE ORDER MATTERS. Copy first, navigate second — `window.location`
 * to a mailto can hand the tab to the OS mid-task, and a clipboard
 * write that has not resolved is lost. The mailto fires from the
 * promise's `finally`, so a blocked clipboard (rare, and silent on
 * some browsers) still opens the client: the visitor is never left with
 * neither.
 *
 * ACCESSIBILITY: the confirmation is announced on a polite live region,
 * because the tooltip is a visual affordance a screen-reader user never
 * sees. Same wording the drawer uses.
 */

const COPY_RESET_MS = 1400;

let tip = null;
let announcer = null;
let hideTimer = 0;

/** The tooltip and live region, made once, on first use. */
function ensureChrome() {
  if (tip && announcer) return;
  tip = document.createElement('div');
  tip.className = 'email-copy-tip';
  tip.setAttribute('aria-hidden', 'true');
  tip.hidden = true;
  tip.innerHTML = '<span class="email-copy-tip__tick" aria-hidden="true">✓</span><span>COPIED</span>';
  document.body.appendChild(tip);

  announcer = document.createElement('p');
  announcer.className = 'email-copy-announcer';
  announcer.setAttribute('aria-live', 'polite');
  document.body.appendChild(announcer);
}

function showTip(x, y) {
  ensureChrome();
  window.clearTimeout(hideTimer);
  tip.hidden = false;
  tip.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
  void tip.offsetWidth; /* reflow so a repeat copy replays the fade */
  tip.classList.add('is-in');
  hideTimer = window.setTimeout(() => {
    tip.classList.remove('is-in');
    hideTimer = window.setTimeout(() => { if (tip) tip.hidden = true; }, 240);
  }, COPY_RESET_MS);
}

function announce(msg) {
  ensureChrome();
  announcer.textContent = '';
  window.setTimeout(() => { if (announcer) announcer.textContent = msg; }, 30);
}

export function initEmailCopy(root = document) {
  const links = Array.from(root.querySelectorAll('a[data-email-copy]'));
  if (!links.length) return () => {};

  const cleanups = [];
  links.forEach((link) => {
    if (!(link instanceof HTMLAnchorElement) || link.dataset.emailCopyWired) return;
    link.dataset.emailCopyWired = '1';
    const address = link.dataset.emailCopy || '';
    if (!address) return;

    const onClick = (event) => {
      /* Let the visitor's own modifiers do what they normally do —
         a middle-click or cmd-click on a mailto should not be
         hijacked into a copy. */
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      const rect = link.getBoundingClientRect();
      const hasPointer = event.clientX !== 0 || event.clientY !== 0;
      const x = hasPointer ? event.clientX : rect.left;
      const y = hasPointer ? event.clientY : rect.bottom;

      const copy = navigator.clipboard
        ? navigator.clipboard.writeText(address)
            .then(() => { showTip(x, y); announce('Email address copied'); })
            .catch(() => { /* blocked — the mailto below is the fallback */ })
        : Promise.resolve();

      copy.finally(() => { window.location.href = link.href; });
    };

    link.addEventListener('click', onClick);
    cleanups.push(() => link.removeEventListener('click', onClick));
  });

  return () => {
    cleanups.forEach((fn) => fn());
    window.clearTimeout(hideTimer);
  };
}
