/**
 * The verification-code email.
 *
 * Deliberately plain: a single large code, a short expiry line, and a
 * "you didn't ask for this" line. Dark-styled HTML with a matching plaintext
 * part so Gmail's clipping and text-only clients both behave.
 */

import type { MailMessage } from './mailer.ts';

export interface OtpEmailInput {
  to: string;
  code: string;
  expiresInMinutes: number;
  eventName?: string;
  eventDate?: string;
  venue?: string;
  supportEmail?: string;
}

/** Escapes anything we interpolate into the HTML part. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** `123456` → `123 456`, which is much easier to copy off a phone screen. */
export function groupCode(code: string): string {
  const mid = Math.ceil(code.length / 2);
  return `${code.slice(0, mid)} ${code.slice(mid)}`;
}

export function buildOtpEmail(input: OtpEmailInput): MailMessage {
  const {
    to,
    code,
    expiresInMinutes,
    eventName = 'AWS re:Invent Watch & Build Party 2026',
    eventDate = '2 December 2026',
    venue = 'Ravindra Bhawan, Bhopal',
    supportEmail = 'awsugbhopal@gmail.com',
  } = input;

  const safeCode = escapeHtml(code);
  const subject = `${code} is your ${escapeHtml(eventName).replace(/&amp;/g, '&')} verification code`;

  const text = [
    `Your verification code is ${code}`,
    '',
    `Enter this code to verify your email and continue your application for ${eventName}.`,
    `It expires in ${expiresInMinutes} minutes and can be used once.`,
    '',
    `${eventDate} - ${venue}`,
    '',
    `If you did not request this code, you can ignore this email. Questions: ${supportEmail}`,
  ].join('\n');

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px 12px;background:#07070A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#0E0E14;border:1px solid #23232E;border-radius:14px;overflow:hidden;">
      <div style="padding:22px 28px;border-bottom:1px solid #23232E;">
        <div style="font-size:13px;font-weight:700;color:#FF9900;letter-spacing:.5px;">AWS re:Invent 2026</div>
        <div style="font-size:12px;color:#8A8A99;margin-top:2px;">Watch &amp; Build Party &middot; Bhopal</div>
      </div>

      <div style="padding:28px;">
        <h1 style="margin:0 0 8px;font-size:19px;color:#FFFFFF;font-weight:700;">Verify your email</h1>
        <p style="margin:0 0 22px;font-size:14px;line-height:1.6;color:#B4B4C4;">
          Enter this code to confirm your email and continue your application.
        </p>

        <div style="background:#050508;border:1px dashed #FF9900;border-radius:12px;padding:20px;text-align:center;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#8A8A99;">Verification code</div>
          <div style="font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-size:34px;font-weight:700;color:#FFFFFF;letter-spacing:8px;margin-top:8px;">${safeCode}</div>
        </div>

        <p style="margin:18px 0 0;font-size:12px;line-height:1.6;color:#8A8A99;">
          Expires in <strong style="color:#D4D4E0;">${expiresInMinutes} minutes</strong> and can only be used once.
        </p>

        <div style="margin-top:22px;padding-top:18px;border-top:1px solid #23232E;font-size:12px;line-height:1.7;color:#8A8A99;">
          <div><strong style="color:#D4D4E0;">${escapeHtml(eventDate)}</strong></div>
          <div>${escapeHtml(venue)}</div>
        </div>

        <p style="margin:18px 0 0;font-size:11px;line-height:1.6;color:#6A6A7A;">
          Didn't request this? You can safely ignore this email — nobody can use the code without it.
          Questions: <a href="mailto:${escapeHtml(supportEmail)}" style="color:#FF9900;">${escapeHtml(supportEmail)}</a>
        </p>
      </div>

      <div style="padding:14px 28px;background:#08080C;border-top:1px solid #23232E;font-size:10px;color:#5A5A6A;text-align:center;">
        Community event by AWS User Group Bhopal &middot; not officially affiliated with Amazon Web Services.
      </div>
    </div>
  </body>
</html>`;

  return { to, subject, html, text };
}
