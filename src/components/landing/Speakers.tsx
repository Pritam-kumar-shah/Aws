import { useScrollFade } from '@/hooks/useScrollFade';
import { Radio } from 'lucide-react';

export function Speakers() {
  const ref = useScrollFade();

  return (
    <section
      id="speakers"
      ref={ref}
      className="relative overflow-hidden bg-[#000000] px-5 py-16 text-slate-200 sm:px-10 sm:py-24 lg:px-16 border-b border-white/10"
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 sm:mb-12">
          <span className="text-[11px] sm:text-xs font-mono uppercase tracking-[0.2em] text-reinvent-cyan block mb-2 sm:mb-3">
            Industry &amp; Technical Mentors
          </span>
          <h2 className="text-3xl font-heading font-black tracking-tight sm:text-5xl text-white">
            Speakers &amp;{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-reinvent-cyan via-purple-400 to-reinvent-pink">
              Mentors.
            </span>
          </h2>
        </div>

        {/* Minimalist TBA Notice Container */}
        <div className="rounded-2xl border border-white/10 bg-[#0A0A0E] p-8 sm:p-12 text-center relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(189,0,158,0.12),transparent_70%)]"
          />

          <div className="relative z-10 max-w-xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/5 border border-white/15 text-xs font-mono text-reinvent-pink">
              <Radio className="w-3.5 h-3.5 text-reinvent-pink animate-pulse" />
              <span className="font-semibold tracking-wider uppercase">Speaker Lineup · TBA</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-heading font-bold text-white tracking-tight">
              Announcing Soon
            </h3>

            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-body">
              Speaker confirmations and technical workshop leaders are currently in progress. Detailed profiles, session tracks, and topics will be revealed here once confirmations are finalized.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
