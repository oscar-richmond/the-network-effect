/**
 * Start-a-project submission handler — the deck-request function's
 * sibling (api/deck-request.js: a standalone Vercel serverless
 * function beside the static Astro build). Same guards: method guard,
 * honeypot, input length caps, server-side validation, plus a per-
 * instance rate limit; the email body is plain text with every field
 * HTML-escaped as well (defence in depth should a mail client render
 * it as HTML). Sends TO the studio inbox FROM the forms sender via
 * Resend's REST API.
 *
 * Env (set in the Vercel project — none are committed):
 *   RESEND_API_KEY       required for real sends; absent -> 500 and
 *                        the client shows its error state (with the
 *                        mailto fallback).
 *   START_PROJECT_TO     optional recipient override. Default
 *                        hello@networkeffectagency.co.uk.
 *   START_PROJECT_FROM   optional verified-domain sender. Default
 *                        The Network Effect <forms@networkeffectagency.co.uk>
 *                        (the domain verified in Resend).
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_LEN = 200;
const MAX_MESSAGE_LEN = 4000;
const PILLARS = new Set(['immerse', 'connect', 'amplify', 'unsure']);
const WHO = new Set(['brand', 'talent', 'agency', 'other', '']);
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;

const clean = (v, max = MAX_LEN) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const PILLAR_LABEL = { immerse: 'IMMERSE — Experiences & cultural moments', connect: 'CONNECT — Partnerships & talent', amplify: 'AMPLIFY — Narrative & media', unsure: 'NOT SURE YET' };

/* Per-instance token bucket (serverless instances are not shared —
   this bounds bursts against one warm instance; Vercel's own edge
   protections sit in front). */
const hits = new Map();
const rateLimited = (ip) => {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  return list.length > RATE_MAX;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method' });
  }
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
  if (rateLimited(ip)) return res.status(429).json({ ok: false, error: 'rate' });

  const body = req.body ?? {};
  const name = clean(body.name);
  const email = clean(body.email);
  const company = clean(body.company);
  const message = clean(body.message, MAX_MESSAGE_LEN);
  const website = clean(body.website);
  const who = clean(body.who).toLowerCase();
  const pillars = Array.isArray(body.pillars) ? body.pillars.map((p) => clean(p).toLowerCase()).filter((p) => PILLARS.has(p)).slice(0, 4) : [];

  // Honeypot: silently drop but answer success (the deck-request rule).
  if (website) return res.status(200).json({ ok: true });

  if (!name || !message || !EMAIL_RE.test(email) || !pillars.length || !WHO.has(who)) {
    return res.status(400).json({ ok: false, error: 'validation' });
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) return res.status(500).json({ ok: false, error: 'unconfigured' });

  const to = process.env.START_PROJECT_TO || 'hello@networkeffectagency.co.uk';
  const from = process.env.START_PROJECT_FROM || 'The Network Effect <forms@networkeffectagency.co.uk>';
  const subject = `Start a project — ${name}${company ? `, ${company}` : ''}`;
  const lines = [
    'New START A PROJECT enquiry from the site.',
    '',
    `Name:     ${escapeHtml(name)}`,
    `Email:    ${escapeHtml(email)}`,
    `Company:  ${escapeHtml(company) || '—'}`,
    `They are: ${escapeHtml(who || '—')}`,
    `Pillars:  ${pillars.map((p) => PILLAR_LABEL[p]).join(' / ')}`,
    '',
    'What should we know?',
    escapeHtml(message),
  ];

  const send = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], reply_to: email, subject, text: lines.join('\n') }),
  });
  if (!send.ok) {
    const detail = await send.text().catch(() => '<unreadable>');
    console.error('[start-project] Resend rejected the send', { status: send.status, body: detail, from, to });
    return res.status(502).json({ ok: false, error: 'send' });
  }
  return res.status(200).json({ ok: true });
}
