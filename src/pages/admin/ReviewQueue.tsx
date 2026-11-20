import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/lib/supabase';
import { EVENT_CONFIG } from '@/config/event';
import { Spinner } from '@/components/ui/Spinner';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { Registration } from '@/types/database';
import {
  Check,
  X,
  Clock,
  SkipForward,
  ExternalLink,
  FileText,
  User,
  GraduationCap,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Eye,
  Mail,
  Phone,
  Building2,
  Cpu,
} from 'lucide-react';

const REJECTION_REASONS = [
  'Incomplete application profile or motivation answers',
  'Invalid or unverified college / work ID card provided',
  'Duplicate or proxy submission detected',
  'Non-technical / unrelated profile for this builder track',
  'Venue capacity limit reached for your region/category',
  'Custom note specified below',
];

export default function ReviewQueue() {
  const { user, isReviewer, loading: authLoading } = useAuth();
  const { addToast } = useToast();

  const [queue, setQueue] = useState<Registration[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Rejection modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState(REJECTION_REASONS[0]);
  const [customRejectNote, setCustomRejectNote] = useState('');
  const [reviewerNote, setReviewerNote] = useState('');

  // Signed URL for private ID card image
  const [signedIdUrl, setSignedIdUrl] = useState<string | null>(null);
  const [loadingSignedUrl, setLoadingSignedUrl] = useState(false);

  // Fetch pending applications queue
  const fetchPendingQueue = async () => {
    setLoadingQueue(true);
    try {
      const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setQueue(data || []);
      setCurrentIndex(0);
    } catch (err) {
      console.error('Failed to load pending queue:', err);
      addToast('error', 'Could not load pending registrations.');
    } finally {
      setLoadingQueue(false);
    }
  };

  useEffect(() => {
    if (!authLoading && isReviewer) {
      fetchPendingQueue();
    }
  }, [authLoading, isReviewer]);

  const currentApplicant = queue[currentIndex] || null;

  // Generate signed URL when current applicant changes
  useEffect(() => {
    async function loadSignedUrl() {
      if (!currentApplicant?.id_card_path) {
        setSignedIdUrl(null);
        return;
      }

      setLoadingSignedUrl(true);
      try {
        const { data, error } = await supabase.storage
          .from('id_cards')
          .createSignedUrl(currentApplicant.id_card_path, 3600); // 1 hour validity

        if (error) {
          console.warn('Could not generate signed URL:', error);
          setSignedIdUrl(null);
        } else {
          setSignedIdUrl(data.signedUrl);
        }
      } catch (e) {
        console.warn('Signed URL fetch error:', e);
        setSignedIdUrl(null);
      } finally {
        setLoadingSignedUrl(false);
      }
    }

    loadSignedUrl();
    setReviewerNote('');
  }, [currentApplicant]);

  // Handle APPROVE Action
  const getValidUuid = (id?: string | null): string | null => {
    if (!id) return null;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : null;
  };

  const handleApprove = async () => {
    if (!currentApplicant || !user || actionLoading) return;
    setActionLoading(true);

    try {
      // 1. Generate unique ticket code REINV-XXXXXX
      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      const ticketCode = `REINV-${randomSuffix}`;
      const qrSecret = crypto.randomUUID();
      const reviewerId = getValidUuid(user.id);

      // 2. Update registrations (Try RPC first to bypass RLS, fallback to direct update with verification)
      const updatePayload: Record<string, unknown> = {
        status: 'approved',
        ticket_code: ticketCode,
        qr_secret: qrSecret,
        reviewed_at: new Date().toISOString(),
      };
      if (reviewerId) updatePayload.reviewer_id = reviewerId;
      if (reviewerNote.trim()) updatePayload.reviewer_note = reviewerNote.trim();

      let updateSucceeded = false;
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('admin_update_status', {
          p_reg_id: currentApplicant.id,
          p_status: 'approved',
          p_ticket_code: ticketCode,
        });
        if (!rpcError && rpcData?.success) {
          updateSucceeded = true;
        }
      } catch {}

      if (!updateSucceeded) {
        const { data: updateData, error: updateError } = await supabase
          .from('registrations')
          .update(updatePayload)
          .eq('id', currentApplicant.id)
          .select();

        if (updateError) throw updateError;
        if (!updateData || updateData.length === 0) {
          throw new Error('Database permission blocked: Please run the SQL migration script in your Supabase SQL Editor!');
        }
      }

      // 3. Queue "Approved" email in email_queue
      try {
        await supabase.from('email_queue').insert({
          to_email: currentApplicant.email,
          template: 'ticket_approved',
          variables: {
            name: currentApplicant.name,
            ticket_code: ticketCode,
            event_name: EVENT_CONFIG.name,
            venue: EVENT_CONFIG.fullAddress,
            date: EVENT_CONFIG.dateDisplay,
            map_url: EVENT_CONFIG.googleMapsUrl,
            whatsapp_url: EVENT_CONFIG.whatsAppGroupUrl,
          },
          status: 'queued',
          attempts: 0,
          scheduled_for: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Email queue error:', err);
      }

      // 4. Log to audit_log (only with valid UUID actor)
      if (reviewerId) {
        try {
          await supabase.from('audit_log').insert({
            actor_id: reviewerId,
            action: 'approve_registration',
            target_type: 'registrations',
            target_id: currentApplicant.id,
            details: { applicant_name: currentApplicant.name, ticket_code: ticketCode },
          });
        } catch (e) {
          console.warn('Audit log error:', e);
        }
      }

      addToast('success', `Approved ${currentApplicant.name} (${ticketCode})`);
      removeCurrentAndAdvance();
    } catch (err: unknown) {
      console.error('Approve failed:', err);
      const msg = err instanceof Error ? err.message : 'Failed to approve applicant';
      addToast('error', msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle WAITLIST Action
  const handleWaitlist = async () => {
    if (!currentApplicant || !user || actionLoading) return;
    setActionLoading(true);

    try {
      const reviewerId = getValidUuid(user.id);
      const updatePayload: Record<string, unknown> = {
        status: 'waitlisted',
        reviewed_at: new Date().toISOString(),
      };
      if (reviewerId) updatePayload.reviewer_id = reviewerId;
      if (reviewerNote.trim()) updatePayload.reviewer_note = reviewerNote.trim();

      let updateSucceeded = false;
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('admin_update_status', {
          p_reg_id: currentApplicant.id,
          p_status: 'waitlisted',
        });
        if (!rpcError && rpcData?.success) {
          updateSucceeded = true;
        }
      } catch {}

      if (!updateSucceeded) {
        const { data: updateData, error } = await supabase
          .from('registrations')
          .update(updatePayload)
          .eq('id', currentApplicant.id)
          .select();

        if (error) throw error;
        if (!updateData || updateData.length === 0) {
          throw new Error('Database permission blocked: Please run the SQL migration script in your Supabase SQL Editor!');
        }
      }

      // Queue waitlist email
      try {
        await supabase.from('email_queue').insert({
          to_email: currentApplicant.email,
          template: 'waitlisted',
          variables: {
            name: currentApplicant.name,
            event_name: EVENT_CONFIG.name,
          },
          status: 'queued',
          attempts: 0,
          scheduled_for: new Date().toISOString(),
        });
      } catch {}

      addToast('info', `Moved ${currentApplicant.name} to waitlist`);
      removeCurrentAndAdvance();
    } catch (err) {
      console.error('Waitlist error:', err);
      addToast('error', 'Failed to waitlist applicant.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle REJECT Action Confirmation
  const confirmReject = async () => {
    if (!currentApplicant || !user || actionLoading) return;
    setActionLoading(true);

    const fullReason =
      selectedReason === 'Custom note specified below'
        ? customRejectNote.trim() || 'Profile did not meet criteria for this offline batch'
        : selectedReason + (customRejectNote.trim() ? ` — ${customRejectNote.trim()}` : '');

    try {
      const reviewerId = getValidUuid(user.id);
      const updatePayload: Record<string, unknown> = {
        status: 'rejected',
        reject_reason: fullReason,
        reviewed_at: new Date().toISOString(),
      };
      if (reviewerId) updatePayload.reviewer_id = reviewerId;
      if (reviewerNote.trim()) updatePayload.reviewer_note = reviewerNote.trim();

      let updateSucceeded = false;
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('admin_update_status', {
          p_reg_id: currentApplicant.id,
          p_status: 'rejected',
          p_reject_reason: fullReason,
        });
        if (!rpcError && rpcData?.success) {
          updateSucceeded = true;
        }
      } catch {}

      if (!updateSucceeded) {
        const { data: updateData, error } = await supabase
          .from('registrations')
          .update(updatePayload)
          .eq('id', currentApplicant.id)
          .select();

        if (error) throw error;
        if (!updateData || updateData.length === 0) {
          throw new Error('Database permission blocked: Please run the SQL migration script in your Supabase SQL Editor!');
        }
      }

      // Queue polite rejection email
      try {
        await supabase.from('email_queue').insert({
          to_email: currentApplicant.email,
          template: 'application_rejected',
          variables: {
            name: currentApplicant.name,
            reason: fullReason,
            event_name: EVENT_CONFIG.name,
          },
          status: 'queued',
          attempts: 0,
          scheduled_for: new Date().toISOString(),
        });
      } catch {}

      addToast('warning', `Rejected application for ${currentApplicant.name}`);
      setRejectModalOpen(false);
      removeCurrentAndAdvance();
    } catch (err) {
      console.error('Reject error:', err);
      addToast('error', 'Failed to reject applicant.');
    } finally {
      setActionLoading(false);
    }
  };

  const removeCurrentAndAdvance = () => {
    setQueue((prev) => {
      const updated = prev.filter((_, idx) => idx !== currentIndex);
      if (currentIndex >= updated.length) {
        setCurrentIndex(Math.max(0, updated.length - 1));
      }
      return updated;
    });
  };

  const handleSkip = () => {
    if (queue.length > 1) {
      setCurrentIndex((prev) => (prev + 1) % queue.length);
      addToast('info', 'Skipped to next applicant');
    }
  };

  // Keyboard Shortcuts (A: Approve, R: Reject modal, W: Waitlist, S: Skip, Arrows: Next/Prev)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || rejectModalOpen) {
        return;
      }

      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        handleApprove();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        setRejectModalOpen(true);
      } else if (e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        handleWaitlist();
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleSkip();
      } else if (e.key === 'ArrowRight') {
        if (currentIndex < queue.length - 1) setCurrentIndex((i) => i + 1);
      } else if (e.key === 'ArrowLeft') {
        if (currentIndex > 0) setCurrentIndex((i) => i - 1);
      }
    },
    [currentApplicant, rejectModalOpen, queue.length, currentIndex, actionLoading]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (loadingQueue) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
        <Spinner size="lg" />
        <p className="text-sm text-slate-400 mt-4">Loading review pipeline...</p>
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="max-w-md mx-auto my-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400 flex items-center justify-center mx-auto">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-heading font-bold text-white">
          Queue Cleared!
        </h2>
        <p className="text-slate-400 text-sm">
          There are no pending registrations requiring review right now.
        </p>
        <button onClick={fetchPendingQueue} className="btn-secondary text-xs">
          Refresh Queue
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Bar with Queue Progress & Shortcuts Guide */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <span className="text-xs text-reinvent-pink font-mono font-semibold uppercase tracking-wider">
            Review Pipeline
          </span>
          <h1 className="text-2xl font-heading font-bold text-white mt-1">
            Applicant {currentIndex + 1} of {queue.length}
          </h1>
        </div>

        {/* Keyboard Shortcuts Hint Bar */}
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 bg-navy-800/80 px-4 py-2 rounded-xl border border-white/5">
          <span className="font-semibold text-slate-200">Shortcuts:</span>
          <kbd className="px-1.5 py-0.5 rounded bg-navy-950 border border-white/10 text-white font-mono">A</kbd> Approve
          <kbd className="px-1.5 py-0.5 rounded bg-navy-950 border border-white/10 text-white font-mono">R</kbd> Reject
          <kbd className="px-1.5 py-0.5 rounded bg-navy-950 border border-white/10 text-white font-mono">W</kbd> Waitlist
          <kbd className="px-1.5 py-0.5 rounded bg-navy-950 border border-white/10 text-white font-mono">S</kbd> Skip
        </div>
      </div>

      {/* Main Single Applicant Review Card */}
      {currentApplicant && (
        <div className="card bg-[#0A0A0E] border border-white/10 p-6 sm:p-8 space-y-6 animate-fade-in relative shadow-2xl">
          {/* Header row: Name, Status, and Pagination */}
          <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-white/10">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl sm:text-3xl font-heading font-black text-white">
                  {currentApplicant.name}
                </h2>
                <StatusBadge status={currentApplicant.status} />
              </div>
              <p className="text-xs text-slate-400 mt-1.5 font-mono">
                Applied on {new Date(currentApplicant.created_at).toLocaleString('en-IN')}
              </p>
            </div>

            {/* Pagination Navigator */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                disabled={currentIndex === 0}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white transition-colors cursor-pointer"
                title="Previous applicant"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-400 font-mono font-semibold px-2">
                {currentIndex + 1} / {queue.length}
              </span>
              <button
                onClick={() => setCurrentIndex((i) => Math.min(queue.length - 1, i + 1))}
                disabled={currentIndex === queue.length - 1}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white transition-colors cursor-pointer"
                title="Next applicant"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Clean Details Grid: ONLY actual details collected from user */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Email Address */}
            <div className="bg-[#050507] p-4 rounded-xl border border-white/5 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
                Email Address
              </span>
              <div className="flex items-center gap-2 text-white font-mono text-sm break-all">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{currentApplicant.email}</span>
              </div>
            </div>

            {/* Contact Number */}
            <div className="bg-[#050507] p-4 rounded-xl border border-white/5 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
                WhatsApp / Contact Number
              </span>
              <div className="flex items-center gap-2 text-white font-mono text-sm">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <span>+91 {currentApplicant.phone}</span>
              </div>
            </div>

            {/* College / Organization */}
            <div className="bg-[#050507] p-4 rounded-xl border border-white/5 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
                College / Company / Organization
              </span>
              <div className="flex items-center gap-2 text-white font-sans text-sm font-semibold">
                <Building2 className="w-4 h-4 text-reinvent-cyan shrink-0" />
                <span>{currentApplicant.org}</span>
              </div>
            </div>

            {/* AWS Builder Center ID */}
            <div className="bg-[#050507] p-4 rounded-xl border border-white/5 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
                AWS Builder Center ID
              </span>
              <div className="flex items-center gap-2 font-mono text-sm font-bold text-reinvent-cyan">
                <Cpu className="w-4 h-4 text-reinvent-pink shrink-0" />
                <span>{currentApplicant.id_number || '—'}</span>
              </div>
            </div>

            {/* Cloud Experience */}
            <div className="sm:col-span-2 bg-[#050507] p-4 rounded-xl border border-white/5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block mb-0.5">
                  Cloud &amp; AWS Experience
                </span>
                <span className="text-white font-heading font-semibold text-sm">
                  {currentApplicant.experience || 'Beginner'}
                </span>
              </div>
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-reinvent-cyan/10 border border-reinvent-cyan/30 text-reinvent-cyan font-semibold">
                {currentApplicant.experience === 'Advanced' ? '🚀 Advanced' : currentApplicant.experience === 'Intermediate' ? '⚡ Intermediate' : '🌱 Beginner'}
              </span>
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={handleSkip}
              disabled={actionLoading}
              className="btn-ghost text-xs sm:text-sm flex items-center gap-1.5"
            >
              <SkipForward className="w-4 h-4" /> Skip (S)
            </button>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setRejectModalOpen(true)}
                disabled={actionLoading}
                className="btn-danger py-2.5 px-4 text-xs sm:text-sm flex items-center gap-1.5"
              >
                <X className="w-4 h-4" /> Reject (R)
              </button>

              <button
                onClick={handleWaitlist}
                disabled={actionLoading}
                className="btn-secondary py-2.5 px-4 text-xs sm:text-sm flex items-center gap-1.5"
              >
                <Clock className="w-4 h-4" /> Waitlist (W)
              </button>

              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="btn-primary py-2.5 px-6 text-xs sm:text-sm flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{actionLoading ? 'Processing...' : 'Approve (A)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card max-w-md w-full p-6 space-y-4 animate-scale-in">
            <h3 className="text-lg font-heading font-semibold text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              Select Rejection Reason
            </h3>
            <p className="text-xs text-slate-400">
              The applicant will receive a polite notification email containing this reasoning.
            </p>

            <div className="space-y-2">
              {REJECTION_REASONS.map((reason) => (
                <label
                  key={reason}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                    selectedReason === reason
                      ? 'border-red-500/50 bg-red-500/10 text-white'
                      : 'border-white/5 bg-navy-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="rejectReason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="mt-0.5 text-red-500 focus:ring-red-500/30"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>

            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">
                Custom Note / Additional Details (Optional):
              </label>
              <textarea
                rows={2}
                className="input-field text-xs resize-none"
                placeholder="Specific feedback..."
                value={customRejectNote}
                onChange={(e) => setCustomRejectNote(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="btn-ghost text-xs"
              >
                Cancel
              </button>
              <button
                onClick={confirmReject}
                disabled={actionLoading}
                className="btn-danger text-xs py-2 px-4"
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
