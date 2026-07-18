/**
 * Deck-request submission handler — a standalone Vercel serverless
 * function (anything under /api/*.js deploys as a function regardless
 * of the static Astro build; the site's `output: 'static'` config is
 * untouched). Validates server-side (defense in depth behind the
 * client's own checks) and forwards the submission to the studio inbox
 * via Resend's REST API.
 *
 * Env (set in the Vercel project — none are committed):
 *   RESEND_API_KEY      required for real sends; absent -> 500 and the
 *                       client shows its mailto fallback.
 *   DECK_REQUEST_TO     optional recipient override. Default is
 *                       hello@networkeffectagency.co.uk — Oscar's
 *                       corrected FINAL address ("there's no 'the'"),
 *                       closing the domain saga: this is the domain
 *                       actually verified in Resend, the one the
 *                       successful live end-to-end test delivered
 *                       through.
 *   DECK_REQUEST_FROM   optional verified-domain sender. Defaults to
 *                       Resend's shared onboarding sender as a
 *                       fallback-of-last-resort; the Vercel env sets
 *                       a networkeffectagency.co.uk sender.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_LEN = 200;

const clean = (v) => (typeof v === 'string' ? v.trim().slice(0, MAX_LEN) : '');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method' });
  }

  const body = req.body ?? {};
  const name = clean(body.name);
  const email = clean(body.email);
  const company = clean(body.company);
  const website = clean(body.website);

  // Honeypot ("website" is invisible and tab-skipped in the real form —
  // only autofilling bots reach it). Silently drop but answer success:
  // never tell the trap-filler it was trapped.
  if (website) {
    return res.status(200).json({ ok: true });
  }

  if (!name || !company || !EMAIL_RE.test(email)) {
    return res.status(400).json({ ok: false, error: 'validation' });
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return res.status(500).json({ ok: false, error: 'unconfigured' });
  }

  const to = process.env.DECK_REQUEST_TO || 'hello@networkeffectagency.co.uk';
  const from =
    process.env.DECK_REQUEST_FROM || 'The Network Effect <onboarding@resend.dev>';

  const send = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: email,
      subject: `Deck request — ${name}, ${company}`,
      text: [
        'New deck request from the holding page.',
        '',
        `Name:    ${name}`,
        `Email:   ${email}`,
        `Company: ${company}`,
      ].join('\n'),
    }),
  });

  if (!send.ok) {
    // Diagnostic only — the client still just gets a plain 502; this
    // goes to the Vercel function's own runtime logs so a rejection
    // reason (unverified domain, malformed sender, etc.) is visible
    // without changing anything the user-facing side sees.
    const body = await send.text().catch(() => '<unreadable>');
    console.error('[deck-request] Resend rejected the send', {
      status: send.status,
      body,
      from,
      to,
    });
    return res.status(502).json({ ok: false, error: 'send' });
  }

  return res.status(200).json({ ok: true });
}
