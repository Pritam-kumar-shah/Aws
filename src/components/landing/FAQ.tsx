import { useState } from 'react';
import { EVENT_CONFIG } from '@/config/event';
import { useScrollFade } from '@/hooks/useScrollFade';
import { ChevronDown } from 'lucide-react';

export function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const ref = useScrollFade();

  return (
    <section ref={ref} className="py-20 px-4 sm:px-6 lg:px-8 border-t border-reinvent-border bg-reinvent-squid/30">
      <div className="max-w-4xl mx-auto">
        <div className="text-center max-w-xl mx-auto mb-16">
          <div className="text-xs font-mono tracking-widest text-reinvent-cyan uppercase mb-2">
            EVENT LOGISTICS
          </div>
          <h2 className="text-2xl sm:text-4xl font-heading font-extrabold text-white">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-slate-400 mt-2 font-body">
            Prerequisites, registration approval criteria, and event-day check-in instructions.
          </p>
        </div>

        <div className="space-y-3">
          {EVENT_CONFIG.faq.map((item, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className="bg-reinvent-card border border-reinvent-border rounded-xl overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full text-left p-5 flex items-center justify-between gap-4 font-heading font-bold text-white text-sm sm:text-base focus:outline-none"
                  aria-expanded={isOpen}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-reinvent-pink font-mono text-xs font-bold">Q{idx + 1}.</span>
                    <span>{item.q}</span>
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-reinvent-pink shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-slate-300 text-sm leading-relaxed border-t border-white/5 font-body">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
