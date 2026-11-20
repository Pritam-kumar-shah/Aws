import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/lib/supabase';
import { EVENT_CONFIG } from '@/config/event';
import { generateQrDataUrl, downloadCalendarInvite } from '@/lib/ticket';
import { AwsLogo } from '@/components/common/AwsLogo';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Spinner } from '@/components/ui/Spinner';
import { toPng } from 'html-to-image';
import type { Registration } from '@/types/database';
import {
  Download,
  Calendar,
  MapPin,
  MessageCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Info,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

export default function MyTicket() {
  const { user, loading: authLoading } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [registration, setRegistration] = useState<Registration | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [downloadingPng, setDownloadingPng] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const badgeRef = useRef<HTMLDivElement>(null);

  const fetchRegistration = async () => {
    if (!user) return;
    try {
      // Find registration by user_id OR email safely without UUID parse crashes
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
      let query = supabase.from('registrations').select('*');
      if (isUuid && user.email) {
        query = query.or(`user_id.eq.${user.id},email.eq.${user.email}`);
      } else if (user.email) {
        query = query.eq('email', user.email);
      } else if (isUuid) {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setRegistration(data);

      if (data && data.status === 'approved' && data.ticket_code) {
        const payloadString = JSON.stringify({
          ticket: data.ticket_code,
          reg: data.id,
          name: data.name,
          secret: data.qr_secret || 'verified',
        });
        const url = await generateQrDataUrl(payloadString);
        setQrCodeUrl(url);
      }
    } catch (err) {
      console.error('Error fetching ticket data:', err);
      addToast('error', 'Could not load registration details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/apply');
      } else {
        fetchRegistration();
      }
    }
  }, [user, authLoading]);

  // Real-time live sync: Automatically updates when admin approves/waitlists/rejects
  useEffect(() => {
    if (!user) return;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
    const channelId = user.email ? user.email.replace(/[^a-zA-Z0-9]/g, '_') : user.id;

    const channel = supabase
      .channel(`ticket-live-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'registrations',
        },
        async (payload) => {
          if (payload.new) {
            const row = payload.new as Registration;
            const matches =
              (isUuid && row.user_id === user.id) ||
              (user.email && row.email?.toLowerCase() === user.email.toLowerCase());

            if (matches) {
              setRegistration(row);
              if (row.status === 'approved' && row.ticket_code) {
                const payloadString = JSON.stringify({
                  ticket: row.ticket_code,
                  reg: row.id,
                  name: row.name,
                  secret: row.qr_secret || 'verified',
                });
                try {
                  const url = await generateQrDataUrl(payloadString);
                  setQrCodeUrl(url);
                } catch {}
                addToast('success', 'Your admission pass has been approved! Badge unlocked.');
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, addToast]);

  const handleDownloadPng = async () => {
    if (!badgeRef.current || !registration) return;
    setDownloadingPng(true);
    try {
      const dataUrl = await toPng(badgeRef.current, {
        cacheBust: true,
        quality: 0.98,
        backgroundColor: '#05070E',
      });
      const link = document.createElement('a');
      link.download = `AWS-reInvent-2026-Badge-${registration.ticket_code || 'Pass'}.png`;
      link.href = dataUrl;
      link.click();
      addToast('success', 'Official attendee badge saved as PNG!');
    } catch (err) {
      console.error('Download ticket error:', err);
      addToast('error', 'Could not generate PNG. Please take a screenshot.');
    } finally {
      setDownloadingPng(false);
    }
  };

  const handleCancelRegistration = async () => {
    if (!registration) return;
    const confirmed = window.confirm(
      'Are you sure you want to cancel your seat? This action is permanent. Your seat will be immediately given to the next candidate on the waitlist.'
    );
    if (!confirmed) return;

    setCancelling(true);
    try {
      const { error } = await supabase.rpc('cancel_registration', {
        reg_id: registration.id,
      });

      if (error) {
        await supabase
          .from('registrations')
          .update({ status: 'cancelled' })
          .eq('id', registration.id);
      }

      addToast('info', 'Your registration has been cancelled and seat surrendered.');
      await fetchRegistration();
    } catch (err) {
      console.error('Cancellation error:', err);
      addToast('error', 'Failed to cancel registration.');
    } finally {
      setCancelling(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
        <Spinner size="lg" />
        <p className="text-xs font-mono text-slate-400 mt-4 uppercase tracking-widest">
          AUTHENTICATING ADMISSION CREDENTIALS...
        </p>
      </div>
    );
  }

  if (!registration) {
    return (
      <div className="max-w-md mx-auto my-16 px-4">
        <div className="card text-center p-8 space-y-5">
          <div className="w-12 h-12 rounded-full bg-reinvent-violet/20 border border-reinvent-violet/40 flex items-center justify-center mx-auto text-reinvent-pink">
            <Info className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-heading font-bold text-white">
            No Application Found
          </h2>
          <p className="text-slate-400 text-xs font-mono leading-relaxed">
            No submission is registered under {user?.email}. Submit your application for the offline watch party.
          </p>
          <Link to="/apply" className="w-full btn-primary text-xs">
            Apply for Admission Pass
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 sm:py-16">
      {/* Console Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-8 border-b border-reinvent-border">
        <div>
          <span className="text-[10px] font-mono tracking-widest text-reinvent-pink uppercase font-bold">
            AWS RE:INVENT 2026 · ATTENDEE CONSOLE
          </span>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white mt-1">
            Admission Status
          </h1>
        </div>
        <div>
          <StatusBadge status={registration.status} />
        </div>
      </div>

      {/* ─── STATUS: PENDING ─── */}
      {registration.status === 'pending' && (
        <div className="space-y-6">
          <div className="bg-reinvent-card border border-amber-500/40 p-6 rounded-xl space-y-3">
            <div className="flex items-center gap-2.5 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider">
              <Clock className="w-4 h-4" />
              <span>APPLICATION QUEUED FOR PEER REVIEW</span>
            </div>
            <p className="text-slate-300 text-sm font-body leading-relaxed">
              Hello <strong className="text-white">{registration.name}</strong>, your application has been received into our sequential review queue. Our team is vetting profiles manually to ensure genuine builder participation.
            </p>
            <div className="p-3 bg-reinvent-obsidian rounded border border-white/5 font-mono text-xs text-slate-400 space-y-1">
              <div>REGISTRATION ID: <span className="text-white">{registration.id}</span></div>
              <div>REGISTERED EMAIL: <span className="text-white">{registration.email}</span></div>
              <div>SUBMITTED ON: <span className="text-white">{new Date(registration.created_at).toLocaleString('en-IN')}</span></div>
            </div>

            {Boolean(EVENT_CONFIG.whatsAppGroupUrl && !EVENT_CONFIG.whatsAppGroupUrl.includes('PLACEHOLDER')) && (
              <a
                href={EVENT_CONFIG.whatsAppGroupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-mono font-semibold transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Join WhatsApp Community for Updates ↗</span>
              </a>
            )}

            <div className="pt-2 flex items-center justify-between border-t border-white/5">
              <button
                type="button"
                onClick={() => {
                  setRefreshing(true);
                  fetchRegistration();
                }}
                disabled={refreshing}
                className="btn-secondary py-2 px-3.5 text-xs font-mono flex items-center gap-1.5 cursor-pointer text-reinvent-cyan border-reinvent-cyan/30 hover:bg-reinvent-cyan/10"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                <span>{refreshing ? 'Checking...' : 'Check Approval Status'}</span>
              </button>

              <span className="text-[11px] font-mono text-slate-500">Auto-sync active</span>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs font-mono text-slate-500 pt-2">
            <span>Change of schedule?</span>
            <button
              onClick={handleCancelRegistration}
              disabled={cancelling}
              className="text-red-400 hover:text-red-300 underline cursor-pointer"
            >
              {cancelling ? 'Surrendering seat...' : 'Cancel Application'}
            </button>
          </div>
        </div>
      )}

      {/* ─── STATUS: APPROVED (AUTHENTIC CONFERENCE BADGE) ─── */}
      {registration.status === 'approved' && (
        <div className="space-y-8 animate-fade-in">
          {/* Lanyard Badge Container (Snapshot target) */}
          <div
            ref={badgeRef}
            className="relative bg-reinvent-card border-2 border-reinvent-magenta/50 rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-8"
          >
            {/* Lanyard punch hole aesthetic */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-3 bg-reinvent-obsidian border border-white/20 rounded-full" />
            </div>

            {/* Top Brand Banner */}
            <div className="flex flex-wrap items-center justify-between pb-6 border-b border-white/10 gap-4">
              <div className="flex items-center gap-3">
                <AwsLogo className="h-6 w-auto" />
                <div className="h-5 w-px bg-white/20" />
                <div>
                  <div className="font-heading font-black text-white text-base tracking-tight flex items-baseline">
                    <span>re:Invent</span>
                    <span className="ml-1.5 text-xs text-reinvent-pink font-mono font-bold">2026</span>
                  </div>
                  <div className="text-[9px] font-mono tracking-widest text-slate-400 uppercase">
                    WATCH & BUILD PARTY · BHOPAL
                  </div>
                </div>
              </div>

              {/* Ticket Code Tag */}
              <div className="text-right">
                <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500 block">
                  ADMISSION CODE
                </span>
                <span className="font-mono text-xl sm:text-2xl font-black text-reinvent-cyan tracking-widest">
                  {registration.ticket_code || 'REINV-VALID'}
                </span>
              </div>
            </div>

            {/* Attendee Details & QR Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-8 items-center">
              {/* QR Code */}
              <div className="flex flex-col items-center justify-center">
                <div className="bg-white p-3 rounded-xl border border-white/20 shadow-lg">
                  {qrCodeUrl ? (
                    <img
                      src={qrCodeUrl}
                      alt="Encrypted Entry Pass QR"
                      className="w-40 h-40 object-contain"
                    />
                  ) : (
                    <div className="w-40 h-40 flex items-center justify-center bg-slate-100">
                      <Spinner size="md" />
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-mono text-slate-400 mt-2 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  HMAC-SHA256 SIGNED
                </span>
              </div>

              {/* Attendee Metadata */}
              <div className="md:col-span-2 space-y-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 block">
                    ATTENDEE NAME
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-white">
                    {registration.name}
                  </h2>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                  <div>
                    <span className="text-slate-500 uppercase block text-[10px]">ORGANIZATION</span>
                    <span className="text-white font-medium">{registration.org}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase block text-[10px]">ACCESS TIER</span>
                    <span className="text-emerald-400 font-bold">ALL-ACCESS BUILDER</span>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase block text-[10px]">DATE & REPORTING</span>
                    <span className="text-reinvent-cyan font-bold">{EVENT_CONFIG.dateDisplay} · 10:00 AM IST</span>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase block text-[10px]">VENUE LOCATION</span>
                    <span className="text-white font-medium">{EVENT_CONFIG.venue}</span>
                  </div>
                </div>

                {/* Simulated Barcode */}
                <div className="pt-2">
                  <div className="h-6 w-full flex items-center gap-0.5 opacity-60 overflow-hidden">
                    {Array.from({ length: 48 }).map((_, i) => (
                      <div
                        key={i}
                        className="bg-white h-full"
                        style={{ width: `${(i % 3) + 1}px` }}
                      />
                    ))}
                  </div>
                  <span className="text-[9px] font-mono text-slate-500 block mt-1 tracking-widest">
                    ENTRY PASS // BHOPAL REGION OFFLINE ADMISSION
                  </span>
                </div>
              </div>
            </div>

            {/* Badge Footer */}
            <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 gap-2">
              <span>SCAN AT EVENT VENUE GATE ENTRANCE</span>
              <span className="text-emerald-400 font-bold">● CONFIRMED PASS</span>
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={handleDownloadPng}
              disabled={downloadingPng}
              className="btn-primary py-3 text-xs flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>{downloadingPng ? 'EXPORTING...' : 'DOWNLOAD BADGE (PNG)'}</span>
            </button>

            <button
              onClick={downloadCalendarInvite}
              className="btn-secondary py-3 text-xs flex items-center justify-center gap-2 font-mono uppercase"
            >
              <Calendar className="w-4 h-4 text-reinvent-cyan" />
              <span>ADD TO CALENDAR (.ICS)</span>
            </button>

            <a
              href={EVENT_CONFIG.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary py-3 text-xs flex items-center justify-center gap-2 font-mono uppercase"
            >
              <MapPin className="w-4 h-4 text-reinvent-pink" />
              <span>VENUE MAP ↗</span>
            </a>

            {Boolean(EVENT_CONFIG.whatsAppGroupUrl && !EVENT_CONFIG.whatsAppGroupUrl.includes('PLACEHOLDER')) && (
              <a
                href={EVENT_CONFIG.whatsAppGroupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 py-3 text-xs flex items-center justify-center gap-2 font-mono uppercase"
              >
                <MessageCircle className="w-4 h-4" />
                <span>ATTENDEE WHATSAPP ↗</span>
              </a>
            )}
          </div>

          {/* Cancellation Option */}
          <div className="bg-reinvent-card border border-reinvent-border p-4 rounded-xl flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Unable to attend? Relinquish your seat so a waitlisted engineer can participate.</span>
            <button
              onClick={handleCancelRegistration}
              disabled={cancelling}
              className="text-red-400 hover:text-red-300 underline ml-2 shrink-0 font-semibold"
            >
              Cancel Seat
            </button>
          </div>
        </div>
      )}

      {/* ─── STATUS: WAITLISTED ─── */}
      {registration.status === 'waitlisted' && (
        <div className="bg-reinvent-card border border-reinvent-cyan/40 p-6 sm:p-8 rounded-xl space-y-4">
          <div className="flex items-center gap-2.5 text-reinvent-cyan font-mono text-xs font-bold uppercase tracking-wider">
            <Info className="w-5 h-5" />
            <span>SEAT ALLOCATED ON WAITLIST</span>
          </div>
          <p className="text-slate-300 text-sm font-body leading-relaxed">
            All 300 seats are currently filled. However, as applicants cancel or change plans, candidates on the waitlist are automatically promoted. You will receive an email confirmation immediately if a seat frees up.
          </p>
          <div className="pt-2 flex justify-between items-center text-xs font-mono text-slate-500">
            <span>SUBMITTED: {new Date(registration.created_at).toLocaleDateString()}</span>
            <button onClick={handleCancelRegistration} className="text-red-400 underline">
              Cancel Waitlist Entry
            </button>
          </div>
        </div>
      )}

      {/* ─── STATUS: REJECTED ─── */}
      {registration.status === 'rejected' && (
        <div className="bg-reinvent-card border border-red-500/40 p-6 sm:p-8 rounded-xl space-y-4">
          <div className="flex items-center gap-2.5 text-red-400 font-mono text-xs font-bold uppercase tracking-wider">
            <XCircle className="w-5 h-5" />
            <span>APPLICATION NOT APPROVED</span>
          </div>
          <p className="text-slate-300 text-sm font-body leading-relaxed">
            Thank you for applying. We were unable to accommodate your application for this offline batch due to seating limits.
          </p>
          {registration.reject_reason && (
            <div className="bg-reinvent-obsidian p-4 rounded border border-red-500/20 text-xs font-mono text-red-300">
              AUDIT NOTE: {registration.reject_reason}
            </div>
          )}
        </div>
      )}

      {/* ─── STATUS: CANCELLED ─── */}
      {registration.status === 'cancelled' && (
        <div className="card text-center p-8 space-y-4">
          <AlertTriangle className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="text-lg font-heading font-bold text-white uppercase font-mono">
            Registration Surrendered
          </h3>
          <p className="text-slate-400 text-xs font-mono">
            Your seat was surrendered. If you want to re-apply, proceed below.
          </p>
          <Link to="/apply" className="btn-secondary text-xs inline-block font-mono uppercase">
            Submit New Application
          </Link>
        </div>
      )}
    </div>
  );
}
