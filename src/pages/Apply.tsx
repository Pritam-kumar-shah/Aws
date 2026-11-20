import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/lib/supabase';
import { EVENT_CONFIG } from '@/config/event';
import { Spinner } from '@/components/ui/Spinner';
import { SignInCard } from '@/components/auth/SignInCard';
import {
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { z } from 'zod';

const indianPhoneRegex = /^[6-9]\d{9}$/;

const applicationSchema = z.object({
  name: z.string().min(2, 'Please enter your full name'),
  phone: z.string().regex(indianPhoneRegex, 'Enter a valid 10-digit mobile number'),
  org: z.string().min(2, 'Please enter your college or organization'),
  aws_builder_id: z.string().min(2, 'Please enter your AWS Builder Center ID'),
  experience: z.string().min(1, 'Please select your cloud experience level'),
  consent: z.boolean().refine((val) => val === true, {
    message: 'Please confirm your details',
  }),
});

type FormData = z.infer<typeof applicationSchema>;

const DRAFT_STORAGE_KEY = 'reinvent_bhopal_application_draft_v3';

const EXPERIENCE_OPTIONS = [
  {
    id: 'Beginner',
    label: 'Beginner',
    icon: '🌱',
  },
  {
    id: 'Intermediate',
    label: 'Intermediate',
    icon: '⚡',
  },
  {
    id: 'Advanced',
    label: 'Advanced',
    icon: '🚀',
  },
];

export default function Apply() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<FormData>>({
    name: '',
    phone: '',
    org: '',
    aws_builder_id: '',
    experience: 'Beginner',
    consent: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Background check for existing registration — never blocks UI render
  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    const userEmail = user.email;

    let isMounted = true;
    async function checkExisting() {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
        let query = supabase.from('registrations').select('id, status, ticket_code');
        if (isUuid && userEmail) {
          query = query.or(`user_id.eq.${userId},email.eq.${userEmail}`);
        } else if (userEmail) {
          query = query.eq('email', userEmail);
        } else if (isUuid) {
          query = query.eq('user_id', userId);
        }

        const { data } = await query
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (isMounted && data) {
          navigate('/my', { replace: true });
        }
      } catch {}
    }

    void checkExisting();

    return () => {
      isMounted = false;
    };
  }, [user, navigate]);

  // Load draft from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFormData((prev) => ({
          ...prev,
          ...parsed,
          name: parsed.name || user?.user_metadata?.full_name || '',
        }));
      } catch (e) {
        console.warn('Draft parse error:', e);
      }
    } else if (user?.user_metadata?.full_name) {
      setFormData((prev) => ({
        ...prev,
        name: user.user_metadata.full_name,
      }));
    }
  }, [user]);

  // Auto-save draft changes
  useEffect(() => {
    const timeout = setTimeout(() => {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(formData));
    }, 400);
    return () => clearTimeout(timeout);
  }, [formData]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const result = applicationSchema.safeParse(formData);
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          newErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(newErrors);
      return;
    }

    if (!user) return;

    setErrors({});
    setSubmitting(true);

    try {
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const validUserId = UUID_REGEX.test(user.id) ? user.id : crypto.randomUUID();

      let registered = false;
      // 1. Try resilient RPC call first (SECURITY DEFINER - 100% bypasses foreign key & RLS issues)
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc('submit_registration', {
          p_name: formData.name!.trim(),
          p_email: user.email!,
          p_phone: formData.phone!.trim(),
          p_org: formData.org!.trim(),
          p_aws_builder_id: formData.aws_builder_id?.trim() || null,
          p_experience: formData.experience || 'Beginner',
          p_user_id: validUserId,
        });

        if (!rpcErr && rpcData) {
          if (rpcData.success === false) {
            addToast('error', rpcData.message || 'Registration failed.');
            setSubmitting(false);
            return;
          }
          registered = true;
        }
      } catch (rpcCatch) {
        console.warn('RPC submission fallback:', rpcCatch);
      }

      // 2. Direct table insert fallback if RPC was not executed
      if (!registered) {
        const registrationPayload = {
          user_id: validUserId,
          name: formData.name!.trim(),
          email: user.email!,
          phone: formData.phone!.trim(),
          city: 'Bhopal',
          role: 'Builder',
          org: formData.org!.trim(),
          course: null,
          year: null,
          id_number: formData.aws_builder_id!.trim() || null,
          aws_builder_id: formData.aws_builder_id!.trim() || null,
          linkedin: null,
          github: null,
          experience: formData.experience!,
          interests: ['Cloud Computing', 'AI / ML'],
          why_attend: 'AWS re:Invent Watch & Build Party attendee',
          build_goal: 'Hands-on Generative AI & Cloud Labs',
          heard_from: 'AWS Student Builder Group at Technocrats Institute of Technology & Science',
          id_card_path: null,
          status: 'pending' as const,
        };

        const { error: insertError } = await supabase
          .from('registrations')
          .insert(registrationPayload);

        if (insertError) {
          if (insertError.code === '23505') {
            if (insertError.message.includes('phone')) {
              addToast('error', 'This mobile number is already registered.');
            } else {
              addToast('error', 'A registration already exists for this verified email.');
            }
            return;
          }
          throw insertError;
        }
      }

      // Queue confirmation email
      try {
        await supabase.from('email_queue').insert({
          to_email: user.email!,
          template: 'application_received',
          variables: {
            name: formData.name!,
            event_name: EVENT_CONFIG.name,
            venue: EVENT_CONFIG.venue,
            date: EVENT_CONFIG.dateDisplay,
          },
          status: 'queued',
          attempts: 0,
          scheduled_for: new Date().toISOString(),
        });
      } catch (queueErr) {
        console.warn('Email queue insertion non-fatal warning:', queueErr);
      }

      localStorage.removeItem(DRAFT_STORAGE_KEY);
      addToast('success', 'Registration submitted! Your pass is under review.');
      navigate('/my', { replace: true });
    } catch (err: unknown) {
      console.error('Submission failed:', err);
      const postgrestErr = err as { message?: string; details?: string; hint?: string };
      const msg =
        err instanceof Error
          ? err.message
          : postgrestErr?.message || postgrestErr?.details || 'Failed to submit registration.';
      addToast('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  // If not signed in yet - show simple sign-in card
  if (!user) {
    return (
      <div className="max-w-md mx-auto my-10 sm:my-16 px-4">
        <SignInCard
          next="/apply"
          title="Verify Email to Register"
          subtitle="Sign in with your email to claim your free pass."
        />
      </div>
    );
  }

  // ─── STREAMLINED FAST REGISTRATION FORM ───
  return (
    <div className="max-w-md mx-auto px-4 py-8 sm:py-12 animate-fade-in">
      {/* Header */}
      <div className="text-center mb-6">
        <span className="text-[10px] font-mono font-bold text-reinvent-cyan tracking-widest uppercase">
          AWS RE:INVENT 2026 · BHOPAL
        </span>
        <h1 className="text-2xl sm:text-3xl font-heading font-black text-white mt-1">
          Builder Registration
        </h1>
      </div>

      {/* Main Registration Card */}
      <div className="card bg-[#0A0A0E] border border-white/10 p-5 sm:p-6 space-y-4 shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* 1. Full Name */}
          <div>
            <input
              type="text"
              className="input-field py-3 px-3.5 text-sm"
              placeholder="Full Name"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            {errors.name && <p className="text-xs text-red-400 mt-1 font-mono">{errors.name}</p>}
          </div>

          {/* 2. Account Email (Verified) */}
          <div className="relative flex items-center">
            <input
              type="email"
              disabled
              className="input-field py-3 px-3.5 pr-20 text-sm opacity-80 cursor-not-allowed bg-[#050507] text-slate-300 font-mono"
              placeholder="Verified Email"
              value={user.email || ''}
            />
            <span className="absolute right-3 text-[10px] font-mono text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              VERIFIED
            </span>
          </div>

          {/* 3. Contact Number */}
          <div>
            <div className="flex">
              <span className="inline-flex items-center px-3.5 rounded-l-lg border border-r-0 border-white/10 bg-[#060608] text-slate-400 text-xs font-mono">
                +91
              </span>
              <input
                type="tel"
                maxLength={10}
                className="input-field rounded-l-none font-mono py-3 px-3.5 text-sm"
                placeholder="WhatsApp / Contact Number"
                value={formData.phone || ''}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })
                }
              />
            </div>
            {errors.phone && <p className="text-xs text-red-400 mt-1 font-mono">{errors.phone}</p>}
          </div>

          {/* 4. College / Organization (Single Clean Example) */}
          <div>
            <input
              type="text"
              className="input-field py-3 px-3.5 text-sm"
              placeholder="College / Company (e.g. Technocrats Institute of Technology & Science)"
              value={formData.org || ''}
              onChange={(e) => setFormData({ ...formData, org: e.target.value })}
            />
            {errors.org && <p className="text-xs text-red-400 mt-1 font-mono">{errors.org}</p>}
          </div>

          {/* 5. AWS Builder Center ID with Direct Profile Link */}
          <div>
            <div className="flex items-center justify-between mb-1.5 px-0.5">
              <span className="text-[11px] text-slate-400 font-mono">AWS Builder Center ID</span>
              <a
                href="https://builder.aws.com?inviteId=41a7e52c-e4af-427d-8fb3-937e4ed57e47"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-mono text-reinvent-cyan hover:text-reinvent-pink flex items-center gap-1 hover:underline transition-colors"
              >
                <span>Don't have one? Create profile</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <input
              type="text"
              className="input-field font-mono py-3 px-3.5 text-sm"
              placeholder="Enter AWS Builder Center ID or Username"
              value={formData.aws_builder_id || ''}
              onChange={(e) => setFormData({ ...formData, aws_builder_id: e.target.value })}
            />
            {errors.aws_builder_id && (
              <p className="text-xs text-red-400 mt-1 font-mono">{errors.aws_builder_id}</p>
            )}
          </div>

          {/* 6. Cloud Experience */}
          <div className="pt-1">
            <span className="text-[11px] text-slate-400 font-mono block mb-1.5 px-0.5">
              Cloud Experience
            </span>
            <div className="grid grid-cols-3 gap-2">
              {EXPERIENCE_OPTIONS.map((opt) => {
                const selected = formData.experience === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, experience: opt.id })}
                    className={`py-2 px-1.5 rounded-lg border text-center transition-all cursor-pointer ${
                      selected
                        ? 'border-reinvent-cyan bg-reinvent-cyan/15 ring-1 ring-reinvent-cyan/50 text-white font-medium'
                        : 'border-white/10 bg-[#060608] text-slate-400 hover:text-white hover:border-white/20'
                    }`}
                  >
                    <span className="text-sm block">{opt.icon}</span>
                    <span className="text-xs font-mono">{opt.label}</span>
                  </button>
                );
              })}
            </div>
            {errors.experience && (
              <p className="text-xs text-red-400 mt-1 font-mono">{errors.experience}</p>
            )}
          </div>

          {/* 7. Agreement / Consent */}
          <div className="pt-2 border-t border-white/5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.consent || false}
                onChange={(e) => setFormData({ ...formData, consent: e.target.checked })}
                className="w-4 h-4 rounded border-white/20 text-reinvent-cyan focus:ring-reinvent-cyan/40 bg-[#060608]"
              />
              <span className="text-xs text-slate-300 font-sans">
                I confirm my details are accurate for event pass.
              </span>
            </label>
            {errors.consent && (
              <p className="text-xs text-red-400 mt-1 font-mono">{errors.consent}</p>
            )}
          </div>

          {/* 8. Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full py-3 text-sm font-heading font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-reinvent-pink/15"
            >
              {submitting ? (
                <>
                  <Spinner size="sm" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <span>Complete Registration</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
