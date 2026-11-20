import { EVENT_CONFIG } from '@/config/event';
import { useScrollFade } from '@/hooks/useScrollFade';

export function Agenda() {
  const ref = useScrollFade();

  return (
    <section
      id="agenda"
      ref={ref}
      className="relative overflow-hidden bg-[#000000] px-5 py-16 text-slate-200 sm:px-10 sm:py-24 lg:px-16 border-b border-white/10"
    >
      <div className="relative mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8 sm:mb-12">
          <span className="text-[11px] sm:text-xs font-mono uppercase tracking-[0.2em] text-reinvent-cyan block mb-2 sm:mb-3">
            Program Schedule · 11:00 AM – 04:00 PM
          </span>
          <h2 className="text-3xl font-heading font-black tracking-tight sm:text-5xl text-white">
            Session{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-reinvent-cyan via-purple-400 to-reinvent-pink">
              Outline.
            </span>
          </h2>
        </div>

        {/* Minimalist Uniform Timeline Table */}
        <div className="border-y border-white/10 divide-y divide-white/10">
          {EVENT_CONFIG.agenda.map((item, idx) => {
            const num = String(idx + 1).padStart(2, '0');

            return (
              <div
                key={idx}
                className="py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-6 group transition-colors duration-200 px-3 sm:px-5 hover:bg-white/[0.02]"
              >
                <div className="flex items-center gap-4">
                  <span className="text-xs font-mono tracking-wider text-reinvent-cyan font-bold shrink-0">
                    / {num}
                  </span>
                  <h3 className="text-base sm:text-lg font-heading font-bold tracking-tight text-white group-hover:text-reinvent-cyan transition-colors">
                    {item.title}
                  </h3>
                </div>

                <div className="pl-8 sm:pl-0">
                  <span className="font-mono text-xs sm:text-sm font-semibold text-slate-300 bg-white/5 border border-white/10 px-3 py-1 rounded inline-block">
                    {item.time}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
