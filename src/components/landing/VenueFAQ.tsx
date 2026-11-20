import { useState } from 'react';
import { EVENT_CONFIG } from '@/config/event';
import { useScrollFade } from '@/hooks/useScrollFade';
import { ChevronDown, MapPin, Mail, Radio, Bell, Compass } from 'lucide-react';

export function VenueFAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const ref = useScrollFade();

  return (
    <section
      id="venue-faq"
      ref={ref}
      className="relative overflow-hidden bg-[#000000] px-5 py-16 text-slate-200 sm:px-10 sm:py-24 lg:px-16 border-b border-white/10"
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-10 sm:gap-14 lg:gap-20 items-start">
          {/* ─── LEFT: VENUE LOGISTICS (TBA) & CONTACT ─────────────────── */}
          <div>
            <span className="text-[11px] sm:text-xs font-mono uppercase tracking-[0.2em] text-reinvent-cyan block mb-2 sm:mb-3">
              Event Logistics &amp; Contact
            </span>
            <h2 className="text-3xl font-heading font-black tracking-tight sm:text-5xl text-white mb-6 sm:mb-8">
              Venue &amp;{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-reinvent-cyan via-purple-400 to-reinvent-pink">
                Location.
              </span>
            </h2>

            <div className="border-t border-white/10 pt-5 sm:pt-8 mb-6 sm:mb-8">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-reinvent-pink" />
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-reinvent-pink font-semibold">
                  OFFLINE GATHERING · 11:00 AM – 04:00 PM
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-tight">
                Venue TBA
              </h3>

              <p className="mt-1 text-xs sm:text-sm text-slate-400 font-mono">
                Bhopal, Madhya Pradesh (Announcing Soon)
              </p>

              <p className="mt-3 text-xs sm:text-sm font-light leading-relaxed text-slate-300 font-body">
                The offline auditorium venue in Bhopal is currently being finalized. All confirmed attendees will receive the exact hall details and directions directly on their digital admission ticket and via email.
              </p>

              {/* Informative TBA Status Terminal Card */}
              <div className="mt-6 overflow-hidden rounded-xl border border-white/10 bg-[#0A0A0E] p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-reinvent-cyan opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-reinvent-cyan"></span>
                    </span>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-slate-300 font-semibold">
                      Location Status
                    </span>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-reinvent-cyan font-bold bg-reinvent-cyan/10 px-2 py-0.5 rounded border border-reinvent-cyan/30">
                    ANNOUNCING SOON
                  </span>
                </div>

                <div className="space-y-2.5 text-xs font-mono">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-reinvent-pink" />
                      <span>City Coordinates</span>
                    </span>
                    <span className="text-white">Bhopal (23.2599° N, 77.4126° E)</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-reinvent-cyan" />
                      <span>Timing</span>
                    </span>
                    <span className="text-white">11:00 AM – 04:00 PM IST</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Notification</span>
                    </span>
                    <span className="text-emerald-400">Direct Email to Pass Holders</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Contact & Support Note */}
            <div className="border border-white/10 bg-[#0A0A0E] p-5 rounded-xl space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-reinvent-cyan block font-semibold">
                EVENT &amp; ORGANIZER SUPPORT
              </span>
              <p className="text-xs text-slate-400 font-body">
                Have questions or need assistance? Reach out to the organizing team via the official contact details in the footer below.
              </p>
            </div>
          </div>

          {/* ─── RIGHT: ACCORDION FAQ ─────────────────────────────────── */}
          <div>
            <span className="text-[11px] sm:text-xs font-mono uppercase tracking-[0.2em] text-reinvent-pink block mb-2 sm:mb-3">
              Answers &amp; Details
            </span>
            <h2 className="text-3xl font-heading font-black tracking-tight sm:text-5xl text-white mb-6 sm:mb-8">
              Frequently <span className="text-reinvent-cyan">Asked.</span>
            </h2>

            <div className="border-y border-white/10 divide-y divide-white/10">
              {EVENT_CONFIG.faq.map((item, idx) => {
                const isOpen = openIdx === idx;
                const num = String(idx + 1).padStart(2, '0');

                return (
                  <div key={idx} className="transition-colors duration-200">
                    <button
                      onClick={() => setOpenIdx(isOpen ? null : idx)}
                      className="w-full text-left flex items-start sm:items-baseline justify-between gap-4 sm:gap-6 py-4 sm:py-5 min-h-[44px] text-white hover:text-reinvent-cyan transition-colors focus:outline-none"
                      aria-expanded={isOpen}
                    >
                      <div className="flex items-start sm:items-baseline gap-3 sm:gap-4">
                        <span className="text-xs font-mono tracking-wider text-reinvent-cyan font-bold shrink-0">
                          {num}
                        </span>
                        <span className="text-sm sm:text-base font-heading font-semibold text-white leading-snug">
                          {item.q}
                        </span>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 shrink-0 mt-1 transition-transform duration-200 ${
                          isOpen ? 'rotate-180 text-reinvent-pink' : ''
                        }`}
                      />
                    </button>

                    {isOpen && (
                      <div className="pb-5 pl-7 sm:pl-9 pr-2 sm:pr-4 text-xs sm:text-sm font-light text-slate-300 leading-relaxed max-w-2xl font-body">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
