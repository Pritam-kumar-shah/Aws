import { EVENT_CONFIG } from '@/config/event';
import { useScrollFade } from '@/hooks/useScrollFade';
import { Users, Sparkles, Code2, Mail } from 'lucide-react';

export function About() {
  const ref = useScrollFade();

  return (
    <section
      id="about"
      ref={ref}
      className="relative isolate overflow-hidden bg-[#000000] px-5 py-16 text-slate-200 sm:px-10 sm:py-24 lg:px-16 lg:py-28 border-b border-white/10"
    >
      {/* Original Signature re:Invent atmospheric gradient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_0%,rgba(76,21,139,0.20),transparent_65%)]"
      />

      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-10 sm:gap-14 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20 items-start">
          {/* Left Column: Narrative */}
          <div className="min-w-0">
            <p className="mb-4 sm:mb-6 text-[11px] sm:text-xs font-mono uppercase tracking-[0.2em] text-reinvent-cyan">
              A student builder gathering
            </p>

            <h2 className="text-[clamp(2.4rem,7.5vw,5rem)] font-heading font-black leading-[0.95] tracking-tight text-white">
              Imagine. Build.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-reinvent-cyan via-purple-400 to-reinvent-pink block sm:inline">
                Reinvent.
              </span>
            </h2>

            <p className="mt-5 sm:mt-8 max-w-xl text-base sm:text-lg font-light leading-relaxed text-slate-300">
              {EVENT_CONFIG.shortName} brings student developers, engineering undergraduates, and aspiring cloud architects together to explore next-generation AWS cloud services, dissect generative AI on Amazon Bedrock, and build what comes next.
            </p>

            <p className="mt-3 sm:mt-4 max-w-xl text-xs sm:text-sm font-light leading-relaxed text-slate-400">
              Rather than watching conference announcements in isolation, this in-person watch and build party in Bhopal creates a focused, high-energy environment for collegiate builders to analyze real production systems and collaborate on hands-on labs.
            </p>

            {/* Micro Highlights Pill Grid */}
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-3 border-t border-white/10 pt-6">
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-reinvent-cyan" />
                <span className="text-xs font-mono text-white">Curated Builder Passes</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Code2 className="w-4 h-4 text-reinvent-pink" />
                <span className="text-xs font-mono text-white">1-Hour Hands-on Labs</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono text-white">Swag &amp; Cloud Credits</span>
              </div>
            </div>
          </div>

          {/* Right Column: Host Group Card */}
          <div className="flex min-w-0 flex-col justify-end">
            <div className="bg-[#0A0A0E] border border-white/10 rounded-2xl p-6 sm:p-8">
              <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-reinvent-pink block mb-2 font-semibold">
                HOSTED BY
              </span>

              <h3 className="text-xl sm:text-2xl font-heading font-bold text-white tracking-tight mb-3">
                {EVENT_CONFIG.organizer}
              </h3>

              <p className="text-xs sm:text-sm font-light leading-relaxed text-slate-400 mb-6 font-body">
                We are a student-led developer network at {EVENT_CONFIG.hostInstitution}. Our goal is straightforward: help engineering students move beyond generic tutorials, experiment with production cloud architectures, and turn campus learning into deployed software.
              </p>

              <div className="space-y-3 font-mono text-xs border-y border-white/10 py-5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 uppercase tracking-wider">HOST INSTITUTION</span>
                  <span className="text-white font-semibold text-right max-w-[220px] truncate">{EVENT_CONFIG.hostInstitution}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 uppercase tracking-wider">FOCUS DOMAINS</span>
                  <span className="text-reinvent-cyan">GenAI, Serverless, Cloud Native</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 uppercase tracking-wider">ENTRY TIER</span>
                  <span className="text-emerald-400 font-semibold">100% Free For Approved Students</span>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-4">
                <a
                  href={`mailto:${EVENT_CONFIG.contactEmail}?subject=Query%20AWS%20Watch%20and%20Build`}
                  className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-300 hover:text-white transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-reinvent-cyan" />
                  <span>Email Host</span>
                </a>

                {Boolean(EVENT_CONFIG.whatsAppGroupUrl) && (
                  <a
                    href={EVENT_CONFIG.whatsAppGroupUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
                  >
                    <span>WhatsApp Group ↗</span>
                  </a>
                )}

                {Boolean(EVENT_CONFIG.linkedinUrl) && (
                  <a
                    href={EVENT_CONFIG.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-300 hover:text-reinvent-cyan transition-colors"
                  >
                    <span>LinkedIn ↗</span>
                  </a>
                )}

                {Boolean(EVENT_CONFIG.instagramUrl) && (
                  <a
                    href={EVENT_CONFIG.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-300 hover:text-reinvent-pink transition-colors"
                  >
                    <span>Instagram ↗</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
