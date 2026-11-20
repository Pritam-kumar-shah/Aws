import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useScrollFade } from '@/hooks/useScrollFade';
import { EVENT_CONFIG } from '@/config/event';
import { WhatsAppIcon } from '@/components/common/BrandIcons';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

export function FinalCTA() {
  const { user } = useAuth();
  const ref = useScrollFade();

  return (
    <section
      id="register"
      ref={ref}
      className="relative isolate overflow-hidden bg-[#000000] px-5 py-20 text-slate-200 sm:px-10 sm:py-28 lg:px-16 border-b border-white/10"
    >
      {/* Ambient original re:Invent glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_100%,rgba(76,21,139,0.25),transparent_65%)]"
      />

      <div className="mx-auto max-w-4xl text-center flex flex-col items-center">
        <span className="text-[11px] sm:text-xs font-mono uppercase tracking-[0.2em] text-reinvent-cyan block mb-4 sm:mb-6 font-semibold">
          Registration · 100% Free
        </span>

        <h2 className="text-[clamp(2.2rem,6.5vw,5rem)] font-heading font-black tracking-tight text-white mb-4 sm:mb-6 leading-[0.95]">
          Ready to build with us in{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-reinvent-cyan via-purple-400 to-reinvent-pink">
            Bhopal?
          </span>
        </h2>

        <p className="max-w-xl text-xs sm:text-base font-light leading-relaxed text-slate-300 mb-8 sm:mb-10 font-body">
          Admission is completely free for all approved applicants. Reserve your spot early. Date &amp; venue details will be dispatched directly to your registered email.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
          <Link
            to={user ? '/my' : '/apply'}
            className="w-full sm:w-auto btn-primary text-sm sm:text-base px-10 py-4 shadow-lg shadow-reinvent-magenta/30"
          >
            <span>{user ? 'VIEW MY ADMISSION PASS' : 'APPLY FOR FREE ADMISSION'}</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>

          {Boolean(EVENT_CONFIG.whatsAppGroupUrl) && (
            <a
              href={EVENT_CONFIG.whatsAppGroupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 text-sm font-mono font-semibold transition-all shadow-lg shadow-emerald-500/10"
            >
              <WhatsAppIcon className="w-4 h-4 fill-current" />
              <span>Join WhatsApp Group ↗</span>
            </a>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Instant HMAC QR pass · 100% Free attendance · Offline in Bhopal</span>
        </div>
      </div>
    </section>
  );
}
