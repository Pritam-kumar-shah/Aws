// Supabase Edge Function: Brevo Email Queue Worker
// Triggered every 2-5 minutes by pg_cron or HTTP webhook.
// Strict enforcement of Brevo free tier limits (daily cap default 280).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const SENDER_EMAIL = Deno.env.get('EMAIL_FROM_ADDRESS') || 'awssbgtitscience@gmail.com';
const SENDER_NAME = Deno.env.get('EMAIL_FROM_NAME') || 'AWS re:Invent Watch & Build';
const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

interface EmailJob {
  id: string;
  to_email: string;
  template: string;
  variables: Record<string, string>;
  attempts: number;
}

// Generate styled HTML template
function renderEmail(template: string, vars: Record<string, string>): { subject: string; html: string } {
  const brandHeader = `
    <div style="background-color: #0B1220; padding: 24px; text-align: center; border-radius: 12px 12px 0 0;">
      <h1 style="color: #FF9900; margin: 0; font-family: sans-serif; font-size: 22px; font-weight: 700;">
        AWS re:Invent Watch & Build Party 2026
      </h1>
      <p style="color: #94A3B8; margin: 4px 0 0; font-size: 13px; font-family: sans-serif;">
        Bhopal, Madhya Pradesh (Date & Venue TBA)
      </p>
    </div>
  `;

  const brandFooter = `
    <div style="background-color: #111927; padding: 20px; text-align: center; font-family: sans-serif; font-size: 11px; color: #64748B; border-radius: 0 0 12px 12px;">
      <p style="margin: 0 0 8px;">Hosted by AWS Student Builder Group at Technocrats Institute of Technology & Science</p>
      <p style="margin: 0;">Contact: awssbgtitscience@gmail.com | mrpritamraj21@gmail.com</p>
    </div>
  `;

  switch (template) {
    case 'application_received':
      return {
        subject: `Application Received: ${vars.event_name || 'AWS re:Invent Bhopal 2026'}`,
        html: `
          <div style="max-width: 580px; margin: 0 auto; background: #161E2D; border: 1px solid #243044; border-radius: 12px; font-family: sans-serif; color: #E2E8F0;">
            ${brandHeader}
            <div style="padding: 28px;">
              <h2 style="color: #FFFFFF; font-size: 18px; margin-top: 0;">Hello ${vars.name},</h2>
              <p style="line-height: 1.6; font-size: 14px; color: #CBD5E1;">
                We have received your application for the <strong>AWS re:Invent Watch & Build Party 2026, Bhopal</strong>.
              </p>
              <div style="background: #1B2638; border-left: 4px solid #FF9900; padding: 14px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; font-size: 13px; color: #CBD5E1;">
                  <strong>Status:</strong> Under Review<br>
                  Every submission is manually screened by the organizing team. You will receive another notification once your admission pass is approved.
                </p>
              </div>
            </div>
            ${brandFooter}
          </div>
        `,
      };

    case 'ticket_approved':
      return {
        subject: `🎉 Ticket Confirmed! Your Admission Badge for AWS re:Invent Bhopal [${vars.ticket_code}]`,
        html: `
          <div style="max-width: 580px; margin: 0 auto; background: #161E2D; border: 1px solid #243044; border-radius: 12px; font-family: sans-serif; color: #E2E8F0;">
            ${brandHeader}
            <div style="padding: 28px;">
              <h2 style="color: #22C55E; font-size: 20px; margin-top: 0;">Congratulations, ${vars.name}!</h2>
              <p style="line-height: 1.6; font-size: 14px; color: #CBD5E1;">
                Your application has been <strong>approved</strong>! Your admission ticket has been confirmed.
              </p>

              <div style="background: #0B1220; border: 2px dashed #FF9900; padding: 20px; text-align: center; border-radius: 12px; margin: 24px 0;">
                <span style="font-size: 11px; text-transform: uppercase; color: #94A3B8; letter-spacing: 1.5px; display: block;">Official Ticket Code</span>
                <span style="font-family: monospace; font-size: 26px; font-weight: 700; color: #FF9900; letter-spacing: 2px;">${vars.ticket_code}</span>
                <p style="font-size: 12px; color: #94A3B8; margin: 8px 0 0;">Please keep this code or save your digital QR ticket.</p>
              </div>

              <div style="background: #1B2638; padding: 16px; border-radius: 8px; margin-bottom: 24px; font-size: 13px;">
                <p style="margin: 4px 0;"><strong>📅 Date & Time:</strong> 11:00 AM – 04:00 PM IST (Date TBA)</p>
                <p style="margin: 4px 0;"><strong>📍 Venue:</strong> Venue TBA (Bhopal, Madhya Pradesh)</p>
                <p style="margin: 4px 0;"><strong>💻 What to bring:</strong> Laptop for hands-on labs + College/Work ID card</p>
              </div>

              <div style="text-align: center; margin: 24px 0;">
                <a href="${vars.whatsapp_url || '#'}" style="background-color: #25D366; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
                  Join Attendee WhatsApp Group
                </a>
              </div>
            </div>
            ${brandFooter}
          </div>
        `,
      };

    case 'application_rejected':
      return {
        subject: `Update regarding your AWS re:Invent Watch & Build Party 2026 application`,
        html: `
          <div style="max-width: 580px; margin: 0 auto; background: #161E2D; border: 1px solid #243044; border-radius: 12px; font-family: sans-serif; color: #E2E8F0;">
            ${brandHeader}
            <div style="padding: 28px;">
              <h2 style="color: #FFFFFF; font-size: 18px; margin-top: 0;">Hello ${vars.name},</h2>
              <p style="line-height: 1.6; font-size: 14px; color: #CBD5E1;">
                Thank you for applying to attend the AWS re:Invent Watch & Build Party in Bhopal. Due to physical venue capacity limits, we are unable to approve your application for this session.
              </p>
              ${
                vars.reason
                  ? `<div style="background: #1B2638; border-left: 4px solid #EF4444; padding: 12px; margin: 18px 0; font-size: 13px; color: #CBD5E1;">
                      <strong>Review note:</strong> ${vars.reason}
                    </div>`
                  : ''
              }
              <p style="font-size: 13px; color: #94A3B8;">
                You are warmly invited to follow community online sessions and our future community meetups.
              </p>
            </div>
            ${brandFooter}
          </div>
        `,
      };

    case 'waitlisted':
      return {
        subject: `Waitlist Update: AWS re:Invent Watch & Build Party 2026`,
        html: `
          <div style="max-width: 580px; margin: 0 auto; background: #161E2D; border: 1px solid #243044; border-radius: 12px; font-family: sans-serif; color: #E2E8F0;">
            ${brandHeader}
            <div style="padding: 28px;">
              <h2 style="color: #38BDF8; font-size: 18px; margin-top: 0;">Hello ${vars.name},</h2>
              <p style="line-height: 1.6; font-size: 14px; color: #CBD5E1;">
                Your application has been placed on the <strong>Waitlist</strong>. All 300 confirmed seats are currently booked. As seats are surrendered or cancelled, candidates on the waitlist are automatically promoted in order.
              </p>
              <p style="font-size: 13px; color: #94A3B8;">
                We will notify you immediately by email if a seat frees up!
              </p>
            </div>
            ${brandFooter}
          </div>
        `,
      };

    default:
      return {
        subject: vars.subject || 'Notification from AWS re:Invent Bhopal',
        html: `<p style="font-family: sans-serif; color: #333;">${vars.message || 'Notification'}</p>`,
      };
  }
}

Deno.serve(async (_req) => {
  if (!BREVO_API_KEY) {
    return new Response(JSON.stringify({ error: 'BREVO_API_KEY is not configured in Supabase secrets.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // 1. Check daily sent quota
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const { count: sentTodayCount } = await supabase
      .from('email_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'sent')
      .gte('sent_at', today.toISOString());

    const dailyCap = 280; // Keep safety buffer for 300 free quota
    const remainingQuota = Math.max(0, dailyCap - (sentTodayCount || 0));

    if (remainingQuota <= 0) {
      return new Response(
        JSON.stringify({
          message: 'Daily Brevo free quota reached (280 cap). Remaining emails held in queue.',
          sentToday: sentTodayCount,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Fetch pending batch (up to remaining quota or 20 per tick)
    const batchSize = Math.min(remainingQuota, 20);
    const { data: queueItems, error: fetchErr } = await supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'queued')
      .lte('scheduled_for', new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(batchSize);

    if (fetchErr) throw fetchErr;
    if (!queueItems || queueItems.length === 0) {
      return new Response(JSON.stringify({ message: 'No queued emails to process.' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let successCount = 0;
    let failCount = 0;

    // 3. Process each email sequentially
    for (const job of queueItems as EmailJob[]) {
      const { subject, html } = renderEmail(job.template, job.variables);

      try {
        const brevoRes = await fetch(BREVO_API_URL, {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'api-key': BREVO_API_KEY,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            sender: { name: SENDER_NAME, email: SENDER_EMAIL },
            to: [{ email: job.to_email }],
            subject,
            htmlContent: html,
          }),
        });

        if (brevoRes.ok) {
          await supabase
            .from('email_queue')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              error: null,
            })
            .eq('id', job.id);
          successCount++;
        } else {
          const errText = await brevoRes.text();
          const nextAttempts = job.attempts + 1;
          await supabase
            .from('email_queue')
            .update({
              attempts: nextAttempts,
              status: nextAttempts >= 3 ? 'failed' : 'queued',
              error: `Brevo HTTP ${brevoRes.status}: ${errText.slice(0, 300)}`,
            })
            .eq('id', job.id);
          failCount++;
        }
      } catch (sendErr) {
        const nextAttempts = job.attempts + 1;
        await supabase
          .from('email_queue')
          .update({
            attempts: nextAttempts,
            status: nextAttempts >= 3 ? 'failed' : 'queued',
            error: sendErr instanceof Error ? sendErr.message : 'Network error',
          })
          .eq('id', job.id);
        failCount++;
      }
    }

    return new Response(
      JSON.stringify({
        processed: queueItems.length,
        succeeded: successCount,
        failed: failCount,
        sentToday: (sentTodayCount || 0) + successCount,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown server error';
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
