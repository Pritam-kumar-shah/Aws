import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Spinner } from '@/components/ui/Spinner';
import { AwsLogo } from '@/components/common/AwsLogo';
import { OtpInput } from '@/components/auth/OtpInput';
import {
  OTP_POLICY,
  formatCountdown,
  isValidEmail,
  maskEmail,
  normalizeEmail,
} from '@/lib/otp';
import { Mail, ShieldCheck, ArrowRight, ArrowLeft, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

type Stage = 'choose' | 'code';

export interface SignInCardProps {
  next?: string;
  title?: string;
  subtitle?: string;
  onSignedIn?: () => void;
  className?: string;
}

export function SignInCard({
  title = 'Verify Email to Claim Your Pass',
  subtitle = 'Verify your email to receive your digital HMAC admission ticket and event logistics updates.',
  onSignedIn,
  className = '',
}: SignInCardProps) {
  const { user, requestEmailOtp, verifyEmailOtp, quickOrganizerLogin } = useAuth();

  const [stage, setStage] = useState<Stage>('choose');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');

  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const mounted = useRef(true);

  // Auto-redirect if session gets established (e.g. magic link clicked)
  useEffect(() => {
    if (user) {
      onSignedIn?.();
    }
  }, [user, onSignedIn]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Resend countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((seconds) => (seconds <= 1 ? 0 : seconds - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const emailLooksValid = isValidEmail(email);

  const sendCode = useCallback(
    async (target: string) => {
      setError(null);
      setNotice(null);
      setSending(true);

      const result = await requestEmailOtp(target);
      if (!mounted.current) return;
      setSending(false);

      if (!result.ok) {
        if (result.message?.includes('Error sending magic link email')) {
          setError(
            'SMTP Connection Error: Please verify your SMTP password/host in Supabase Dashboard (or toggle Custom SMTP OFF to use Supabase default email delivery).',
          );
        } else {
          setError(result.message ?? 'Could not send verification code.');
        }
        if (result.resendAfterSeconds) setCooldown(result.resendAfterSeconds);
        return;
      }

      setStage('code');
      setCode('');
      setCooldown(result.resendAfterSeconds ?? OTP_POLICY.resendCooldownSeconds);
      setNotice(
        `Verification email sent to ${maskEmail(target)}. Check your inbox or spam folder!`,
      );
    },
    [requestEmailOtp],
  );

  const handleEmailSubmit = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      const target = normalizeEmail(email);
      if (!isValidEmail(target)) {
        setError('Please enter a valid email address (e.g. name@college.edu or name@gmail.com)');
        emailInputRef.current?.focus();
        return;
      }
      void sendCode(target);
    },
    [email, sendCode],
  );

  const handleVerify = useCallback(
    async (submitted: string) => {
      if (verifying) return;
      setError(null);
      setVerifying(true);

      const result = await verifyEmailOtp(email, submitted);
      if (!mounted.current) return;
      setVerifying(false);

      if (!result.ok) {
        setCode('');
        setError(result.message ?? 'That code is incorrect or expired.');
        return;
      }

      setNotice('Identity verified successfully! Loading application form…');
      onSignedIn?.();
    },
    [verifying, verifyEmailOtp, email, onSignedIn],
  );

  return (
    <div
      className={`card bg-[#0A0A0E] border border-white/10 p-6 sm:p-8 space-y-6 ${className}`}
      data-testid="sign-in-card"
    >
      <header className="text-center space-y-3">
        <div className="flex justify-center">
          <AwsLogo className="h-9 w-auto" />
        </div>
        <div className="inline-block px-3 py-1 rounded-full text-[10px] font-mono tracking-widest uppercase bg-reinvent-violet/20 border border-reinvent-violet/40 text-purple-300">
          AWS re:Invent Watch &amp; Build Party 2026
        </div>
        <h2 className="text-xl sm:text-2xl font-heading font-black text-white">{title}</h2>
        <p className="text-xs text-slate-400 font-body leading-relaxed max-w-sm mx-auto">{subtitle}</p>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200 font-mono leading-relaxed"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {stage === 'choose' ? (
        <form onSubmit={handleEmailSubmit} className="space-y-4" noValidate>
          <div>
            <label className="label-text" htmlFor="signin-email">
              Builder Email Address
            </label>
            <div className="relative mt-1">
              <Mail
                className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-500"
                aria-hidden="true"
              />
              <input
                id="signin-email"
                ref={emailInputRef}
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                placeholder="your.email@gmail.com"
                className="input-field pl-10 text-sm font-mono"
                value={email}
                disabled={sending}
                aria-invalid={email.length > 0 && !emailLooksValid ? true : undefined}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
              />
            </div>
            <p className="mt-2 text-[11px] font-mono text-slate-400">
              Enter your personal, college, or company email. We send an instant OTP code to verify your identity.
            </p>
          </div>

          <button
            type="submit"
            disabled={sending || !emailLooksValid}
            className="btn-primary w-full py-3.5 text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2"
          >
            {sending ? (
              <>
                <Spinner size="sm" label="Sending verification code" />
                <span>Sending Code…</span>
              </>
            ) : (
              <>
                <span>Send Verification Code</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </>
            )}
          </button>
        </form>
      ) : (
        <div className="space-y-4 animate-fade-in">
          <p className="text-xs font-mono text-slate-300 text-center">
            Enter the {OTP_POLICY.length}-digit code sent to <span className="text-reinvent-cyan font-semibold">{maskEmail(email)}</span>
          </p>

          <OtpInput
            value={code}
            onChange={(next) => {
              setCode(next);
              if (error) setError(null);
            }}
            onComplete={handleVerify}
            disabled={verifying}
            invalid={!!error}
            autoFocus
            label={`Verification code sent to ${maskEmail(email)}`}
          />

          <button
            type="button"
            onClick={() => handleVerify(code)}
            disabled={verifying || code.length !== OTP_POLICY.length}
            className="btn-primary w-full py-3.5 text-xs font-mono uppercase tracking-wider"
          >
            {verifying ? (
              <>
                <Spinner size="sm" label="Verifying code" />
                <span>Verifying…</span>
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                <span>Verify &amp; Continue</span>
              </>
            )}
          </button>

          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                setStage('choose');
                setCode('');
                setError(null);
                setNotice(null);
              }}
              disabled={verifying}
              className="inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-400 underline-offset-2 hover:text-white hover:underline disabled:opacity-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Change email
            </button>

            <button
              type="button"
              onClick={() => void sendCode(normalizeEmail(email))}
              disabled={cooldown > 0 || sending || verifying}
              className="inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-400 underline-offset-2 hover:text-white hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-60"
            >
              {cooldown > 0 ? (
                <>
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  Resend in {formatCountdown(cooldown)}
                </>
              ) : (
                'Resend code'
              )}
            </button>
          </div>
        </div>
      )}

      <footer className="border-t border-white/10 pt-4 text-center">
        <div className="flex items-center justify-center gap-1.5 text-[11px] font-mono text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
          <span>No password required · Secure OTP verification</span>
        </div>
      </footer>
    </div>
  );
}
