/**
 * Outbound mail for the OTP flow.
 *
 * The organiser asked for verification codes to go out from their OWN mailbox
 * rather than an anonymous service address, so Gmail SMTP is the primary
 * transport: set `GMAIL_USER` + `GMAIL_APP_PASSWORD` and every code is sent
 * from that exact address.
 *
 * Transports, in the order `auto` tries them:
 *   gmail  — SMTP as the organiser's own Gmail account (From: = GMAIL_USER)
 *   brevo  — Brevo HTTP API, From: = EMAIL_FROM_ADDRESS (must be a verified
 *            sender in Brevo; the organiser's Gmail works once verified)
 *   resend — Resend HTTP API, for a custom domain
 *   manual — nothing is sent automatically; the code is parked in the outbox
 *            for a human to send by hand from their own mail client
 */

export type Transport = 'gmail' | 'brevo' | 'resend' | 'manual';

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface SendResult {
  /** `manual` means nothing was sent — a human still has to. */
  delivered: boolean;
  transport: Transport;
  error?: string;
}

const env = (key: string): string => (Deno.env.get(key) || '').trim();

export function senderIdentity(): { name: string; address: string } {
  const gmailUser = env('GMAIL_USER');
  return {
    name: env('EMAIL_FROM_NAME') || 'AWS re:Invent Bhopal',
    address: env('EMAIL_FROM_ADDRESS') || gmailUser || 'awsugbhopal@gmail.com',
  };
}

/**
 * Resolves which transport to use. An explicit `OTP_DELIVERY` always wins so
 * the organiser can force manual mode during an event without removing keys.
 */
export function resolveTransport(): Transport {
  const explicit = env('OTP_DELIVERY').toLowerCase();
  if (explicit === 'gmail' || explicit === 'brevo' || explicit === 'resend' || explicit === 'manual') {
    return explicit;
  }
  if (env('GMAIL_USER') && env('GMAIL_APP_PASSWORD')) return 'gmail';
  if (env('BREVO_API_KEY')) return 'brevo';
  if (env('RESEND_API_KEY')) return 'resend';
  return 'manual';
}

export async function sendMail(message: MailMessage): Promise<SendResult> {
  const transport = resolveTransport();

  try {
    switch (transport) {
      case 'gmail':
        await sendViaGmail(message);
        return { delivered: true, transport };
      case 'brevo':
        await sendViaBrevo(message);
        return { delivered: true, transport };
      case 'resend':
        await sendViaResend(message);
        return { delivered: true, transport };
      case 'manual':
        return { delivered: false, transport };
    }
  } catch (error) {
    return {
      delivered: false,
      transport,
      error: error instanceof Error ? error.message : 'Unknown mail transport error',
    };
  }
}

// ─── Transports ──────────────────────────────────────────────────────────────

/**
 * Gmail SMTP over implicit TLS (port 465).
 *
 * Requires a Google *App Password* — a normal account password is rejected,
 * and the account needs 2-Step Verification turned on to create one.
 */
async function sendViaGmail(message: MailMessage): Promise<void> {
  const user = env('GMAIL_USER');
  const password = env('GMAIL_APP_PASSWORD');
  if (!user || !password) throw new Error('GMAIL_USER / GMAIL_APP_PASSWORD are not set');

  // Imported lazily so deployments that never use SMTP don't pay for it.
  const { SMTPClient } = await import('https://deno.land/x/denomailer@1.6.0/mod.ts');

  const client = new SMTPClient({
    connection: {
      hostname: env('GMAIL_SMTP_HOST') || 'smtp.gmail.com',
      port: Number(env('GMAIL_SMTP_PORT') || '465'),
      tls: true,
      auth: { username: user, password },
    },
  });

  const { name } = senderIdentity();
  try {
    await client.send({
      // Gmail rewrites From: to the authenticated account anyway, so we state
      // it explicitly rather than letting it look like a spoof attempt.
      from: `${name} <${user}>`,
      to: message.to,
      subject: message.subject,
      content: message.text,
      html: message.html,
    });
  } finally {
    await client.close();
  }
}

async function sendViaBrevo(message: MailMessage): Promise<void> {
  const apiKey = env('BREVO_API_KEY');
  if (!apiKey) throw new Error('BREVO_API_KEY is not set');
  const sender = senderIdentity();

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: sender.name, email: sender.address },
      to: [{ email: message.to }],
      subject: message.subject,
      htmlContent: message.html,
      textContent: message.text,
    }),
  });

  if (!res.ok) {
    throw new Error(`Brevo HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
}

async function sendViaResend(message: MailMessage): Promise<void> {
  const apiKey = env('RESEND_API_KEY');
  if (!apiKey) throw new Error('RESEND_API_KEY is not set');
  const sender = senderIdentity();

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: `${sender.name} <${sender.address}>`,
      to: [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
  });

  if (!res.ok) {
    throw new Error(`Resend HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
}
