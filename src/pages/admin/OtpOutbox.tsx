import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/useToast';
import { Spinner } from '@/components/ui/Spinner';
import { formatCountdown, maskEmail } from '@/lib/otp';
import { EVENT_CONFIG } from '@/config/event';
import { Copy, Check, Mail, RefreshCw, Inbox, KeyRound, ShieldAlert } from 'lucide-react';

interface OutboxEntry {
  id: string;
  email: string;
  code: string;
  expires_at: string;
  created_at: string;
  seconds_remaining: number;
}

/**
 * Manual OTP delivery console.
 *
 * When `OTP_DELIVERY=manual` (or automatic delivery fails), codes land here
 * instead of being emailed. A reviewer copies the code or opens a prefilled
 * draft in their own mail client, sends it from their own address, then marks
 * the entry delivered — which also wipes the plaintext code from the database.
 */
export default function OtpOutbox() {
  const { addToast } = useToast();
  const [entries, setEntries] = useState<OutboxEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      setError(null);
      try {
        const { data, error: rpcError } = await supabase.rpc('list_manual_otp_outbox', {
          limit_count: 50,
        });
        if (rpcError) throw rpcError;
        setEntries((data as OutboxEntry[]) ?? []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Could not load the outbox. Check your admin role.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    void load();
    // Codes expire in minutes, so a stale list is actively misleading.
    const timer = setInterval(() => void load(true), 30_000);
    return () => clearInterval(timer);
  }, [load]);

  // Local countdown so the remaining time ticks between refreshes.
  useEffect(() => {
    const timer = setInterval(() => {
      setEntries((prev) =>
        prev
          .map((e) => ({ ...e, seconds_remaining: Math.max(0, e.seconds_remaining - 1) }))
          .filter((e) => e.seconds_remaining > 0),
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const copyCode = async (entry: OutboxEntry) => {
    try {
      await navigator.clipboard.writeText(entry.code);
      setCopiedId(entry.id);
      setTimeout(() => setCopiedId((id) => (id === entry.id ? null : id)), 2000);
    } catch {
      addToast('error', 'Clipboard blocked by the browser — select the code manually.');
    }
  };

  const mailtoFor = (entry: OutboxEntry) => {
    const subject = `${entry.code} is your ${EVENT_CONFIG.shortName} verification code`;
    const body = [
      `Your verification code is ${entry.code}`,
      '',
      `Enter it on the registration page to verify your email and continue your application for ${EVENT_CONFIG.name}.`,
      `It expires in ${Math.max(1, Math.round(entry.seconds_remaining / 60))} minutes and can be used once.`,
      '',
      `${EVENT_CONFIG.dateDisplay} - ${EVENT_CONFIG.venue}, ${EVENT_CONFIG.city}`,
      '',
      'If you did not request this code, you can ignore this email.',
      '',
      `- ${EVENT_CONFIG.organizer}`,
    ].join('\n');

    return `mailto:${encodeURIComponent(entry.email)}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
  };

  const markSent = async (entry: OutboxEntry) => {
    setMarkingId(entry.id);
    try {
      const { data, error: rpcError } = await supabase.rpc('mark_manual_otp_sent', {
        otp_id: entry.id,
      });
      if (rpcError) throw rpcError;
      if (data && (data as { success?: boolean }).success === false) {
        throw new Error((data as { error?: string }).error || 'Entry already handled');
      }
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
      addToast('success', `Marked as sent to ${maskEmail(entry.email)}`);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Could not update the entry.');
    } finally {
      setMarkingId(null);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-heading font-bold text-white">
            <KeyRound className="h-5 w-5 text-aws-orange" aria-hidden="true" />
            OTP Outbox
          </h1>
          <p className="mt-1 max-w-xl text-xs font-mono leading-relaxed text-slate-400">
            Codes waiting to be emailed by hand. Send from your own mailbox, then mark the entry as
            sent — that immediately wipes the code from the database.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void load(true)}
          disabled={refreshing}
          className="btn-secondary px-4 py-2 text-xs font-mono uppercase tracking-wider"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          Refresh
        </button>
      </header>

      <p className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 text-[11px] font-mono leading-relaxed text-amber-200">
        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>
          These codes grant access to an applicant's account. Never forward them to anyone except
          the address shown, and never paste one into a shared channel.
        </span>
      </p>

      {error && (
        <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs font-mono text-red-200">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" label="Loading outbox" />
        </div>
      ) : entries.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 border border-white/10 bg-[#0A0A0E] py-16 text-center">
          <Inbox className="h-8 w-8 text-slate-600" aria-hidden="true" />
          <p className="text-sm font-heading font-semibold text-white">Outbox is empty</p>
          <p className="max-w-sm text-xs font-mono leading-relaxed text-slate-500">
            Nothing is waiting to be sent by hand. If automatic delivery is configured, codes go out
            on their own and never appear here.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="card flex flex-col gap-4 border border-white/10 bg-[#0A0A0E] p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <p className="truncate text-sm font-semibold text-white">{entry.email}</p>
                <p className="text-[11px] font-mono text-slate-500">
                  Expires in{' '}
                  <span className={entry.seconds_remaining < 120 ? 'text-red-400' : 'text-slate-300'}>
                    {formatCountdown(entry.seconds_remaining)}
                  </span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <code className="rounded-lg border border-white/10 bg-black px-4 py-2 font-mono text-lg font-bold tracking-[0.3em] text-white tabular-nums">
                  {entry.code}
                </code>

                <button
                  type="button"
                  onClick={() => void copyCode(entry)}
                  className="btn-ghost px-3 py-2 text-xs font-mono"
                  aria-label={`Copy code for ${entry.email}`}
                >
                  {copiedId === entry.id ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      Copy
                    </>
                  )}
                </button>

                <a
                  href={mailtoFor(entry)}
                  className="btn-secondary px-3 py-2 text-xs font-mono"
                  aria-label={`Compose an email to ${entry.email}`}
                >
                  <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                  Compose
                </a>

                <button
                  type="button"
                  onClick={() => void markSent(entry)}
                  disabled={markingId === entry.id}
                  className="btn-primary px-4 py-2 text-xs font-mono uppercase tracking-wider"
                >
                  {markingId === entry.id ? (
                    <Spinner size="sm" label="Marking as sent" />
                  ) : (
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  Mark sent
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
