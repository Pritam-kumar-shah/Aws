import { useScrollFade } from '@/hooks/useScrollFade';
import { Radio, Terminal, Cpu } from 'lucide-react';

const tracks = [
  {
    code: 'TRK-KEYNOTE',
    category: 'LIVE SATELLITE BROADCAST',
    title: 'Global AWS re:Invent Keynotes Live',
    description:
      'Experience the biggest cloud and AI announcements straight from Las Vegas on the main theater screen. Live architecture breakdowns of breakthroughs in Foundation Models, agentic reasoning, and next-gen cloud hardware.',
    specs: ['Executive Keynotes Stream', 'Werner Vogels CTO Address', 'Real-Time Architecture Breakdown'],
    tagColor: 'text-reinvent-cyan border-reinvent-cyan/40 bg-reinvent-cyan/10',
    icon: Radio,
  },
  {
    code: 'TRK-BUILD',
    category: 'HANDS-ON TECHNICAL LAB',
    title: 'Generative AI & Serverless Labs',
    description:
      'Bring your laptop and build live. Hands-on coding exercises deploying multi-agent reasoning with Amazon Bedrock, serverless microservices with AWS Lambda & Step Functions, and vector search techniques.',
    specs: ['Amazon Bedrock & Claude Labs', 'Serverless Event-Driven Patterns', 'Starter Repos & AWS Cloud Credits'],
    tagColor: 'text-reinvent-pink border-reinvent-pink/40 bg-reinvent-pink/10',
    icon: Terminal,
  },
  {
    code: 'TRK-CONNECT',
    category: 'COMMUNITY & ARCHITECTURE CLINIC',
    title: 'Architecture Clinic & Showcase',
    description:
      'Connect with student builder leads, tech club coordinators, and cloud mentors. Get your architectures reviewed 1:1 and participate in the community demo arena.',
    specs: ['1:1 Well-Architected Reviews', 'Community Swags & Badge Lanyards', 'Collegiate Networking & Teams'],
    tagColor: 'text-purple-300 border-purple-400/40 bg-purple-500/10',
    icon: Cpu,
  },
];

export function HighlightCards() {
  const ref = useScrollFade();

  return (
    <section
      id="tracks"
      ref={ref}
      className="relative overflow-hidden bg-[#000000] px-5 py-16 text-slate-200 sm:px-10 sm:py-24 lg:px-16 border-b border-white/10"
    >
      <div className="mx-auto max-w-6xl">
        {/* Section Header */}
        <div className="mb-8 flex flex-col justify-between gap-3 sm:mb-16 sm:flex-row sm:items-end">
          <div>
            <span className="text-[11px] sm:text-xs font-mono uppercase tracking-[0.2em] text-reinvent-cyan block mb-2 sm:mb-3">
              Conference Tracks
            </span>
            <h2 className="text-3xl font-heading font-black tracking-tight sm:text-5xl lg:text-6xl text-white">
              Engineered for{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-reinvent-cyan via-purple-400 to-reinvent-pink">
                Builders.
              </span>
            </h2>
          </div>
          <p className="max-w-sm text-xs sm:text-sm leading-relaxed text-slate-400 sm:text-right font-light">
            Three parallel learning and building experiences curated for maximum hands-on engineering value.
          </p>
        </div>

        {/* 3-Track Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 border-y border-white/10 divide-y md:divide-y-0 md:divide-x divide-white/10">
          {tracks.map((track) => {
            const Icon = track.icon;
            return (
              <div
                key={track.code}
                className="group relative isolate overflow-hidden px-5 py-8 sm:px-8 sm:py-10 transition-colors duration-300 hover:bg-white/[0.02] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-mono mb-6">
                    <span className={`px-2.5 py-1 rounded text-[10px] font-semibold border ${track.tagColor}`}>
                      {track.code}
                    </span>
                    <Icon className="w-4 h-4 text-slate-500 group-hover:text-reinvent-cyan transition-colors" />
                  </div>

                  <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-slate-500 block mb-2">
                    {track.category}
                  </span>

                  <h3 className="text-xl sm:text-2xl font-heading font-bold text-white mb-3 group-hover:text-reinvent-cyan transition-colors">
                    {track.title}
                  </h3>

                  <p className="text-xs sm:text-sm font-light leading-relaxed text-slate-400 mb-6 font-body">
                    {track.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-white/10 space-y-2">
                  <span className="text-[10px] font-mono tracking-wider uppercase text-slate-500 block mb-2">
                    INCLUDED IN THIS TRACK:
                  </span>
                  {track.specs.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-300 font-mono">
                      <span className="text-reinvent-cyan font-bold">›</span>
                      <span className="text-xs font-light text-slate-300">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
