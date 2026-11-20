import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Spinner } from '@/components/ui/Spinner';
import { AwsLogo } from '@/components/common/AwsLogo';
import { AlertTriangle, ArrowRight } from 'lucide-react';

/**
 * Landing spot for every OAuth / SSO round trip.
 *
 * The Supabase client parses the tokens out of the URL on its own
 * (`detectSessionInUrl`), so all this screen does is wait for the resulting
 * auth state and then forward the user — or explain what went wrong, which
 * is the part the previous `redirectTo: /apply` setup silently swallowed.
 */
export default function AuthCallback() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [timedOut, setTimedOut] = useState(false);

  const next = params.get('next') || '/apply';

  /** Providers report failures as query or hash params; check both. */
  const providerError = useMemo(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const description =
      params.get('error_description') || hash.get('error_description') || '';
    const code = params.get('error') || hash.get('error') || '';
    if (!description && !code) return null;
    return description || code;
  }, [params]);

  useEffect(() => {
    if (providerError || loading) return;
    if (user) navigate(next, { replace: true });
  }, [providerError, loading, user, navigate, next]);

  // If no session materialises the user is stuck staring at a spinner —
  // give them a way out instead.
  useEffect(() => {
    if (providerError) return;
    const timer = setTimeout(() => setTimedOut(true), 12_000);
    return () => clearTimeout(timer);
  }, [providerError]);

  const failed = Boolean(providerError) || (timedOut && !user);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="card bg-[#0A0A0E] border border-white/10 w-full max-w-sm p-8 text-center space-y-5">
        <div className="flex justify-center">
          <AwsLogo className="h-7 w-auto" />
        </div>

        {failed ? (
          <>
            <div className="flex justify-center">
              <AlertTriangle className="h-8 w-8 text-amber-400" aria-hidden="true" />
            </div>
            <h1 className="text-lg font-heading font-bold text-white">Sign-in did not complete</h1>
            <p role="alert" className="text-xs font-mono leading-relaxed text-slate-400">
              {providerError ||
                'We did not hear back from the identity provider. This usually means the pop-up was closed or the provider is not configured yet.'}
            </p>
            <Link to="/apply" className="btn-primary w-full py-3 text-xs font-mono uppercase tracking-wider">
              Try another option
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </>
        ) : (
          <>
            <div className="flex justify-center">
              <Spinner size="lg" label="Completing sign-in" />
            </div>
            <h1 className="text-lg font-heading font-bold text-white">Completing sign-in…</h1>
            <p className="text-xs font-mono uppercase tracking-widest text-slate-500">
              Verifying your identity
            </p>
          </>
        )}
      </div>
    </div>
  );
}
