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
 *                       hello@thenetworkeffect.com — the codebase's
 *                       unanimous contact address (Oscar-confirmed).
 *   DECK_REQUEST_FROM   optional verified-domain sender. Defaults to
 *                       Resend's shared onboarding sender so the form
 *                       works before domain verification is done.
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

  const to = process.env.DECK_REQUEST_TO || 'hello@thenetworkeffect.com';
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
    return res.status(502).json({ ok: false, error: 'send' });
  }

  return res.status(200).json({ ok: true });
}
