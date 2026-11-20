import { useScrollFade } from '@/hooks/useScrollFade';

const pipeline = [
  {
    step: '/ 01',
    phase: 'APPLICATION SUBMISSION',
    title: 'Submit Builder Profile',
    desc: 'Sign in with your email and submit your background, technical interests, and student or developer credentials.',
    requirement: 'Email Verification + Profile',
  },
  {
    step: '/ 02',
    phase: 'APPLICATION SCREENING',
    title: 'Profile Screening',
    desc: 'To prevent no-shows and ensure genuine hands-on participation, applications are reviewed individually by the host team.',
    requirement: 'Profile Review',
  },
  {
    step: '/ 03',
    phase: 'ADMISSION ISSUANCE',
    title: 'Digital HMAC Admission Pass',
    desc: 'Approved builders receive a digitally signed cryptographic admission ticket with a unique QR code for gate check-in.',
    requirement: 'Instant Digital Pass',
  },
];

export function HowItWorks() {
  const ref = useScrollFade();

  return (
    <section
      ref={ref}
      className="relative overflow-hidden bg-[#000000] px-5 py-16 text-slate-200 sm:px-10 sm:py-24 lg:px-16 border-b border-white/10"
    >
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex flex-col justify-between gap-3 sm:mb-16 sm:flex-row sm:items-end">
          <div>
            <span className="text-[11px] sm:text-xs font-mono uppercase tracking-[0.2em] text-reinvent-cyan block mb-2 sm:mb-3">
              Admission Pipeline
            </span>
            <h2 className="text-3xl font-heading font-black tracking-tight sm:text-5xl lg:text-6xl text-white">
              How Selection{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-reinvent-cyan via-purple-400 to-reinvent-pink">
                Works.
              </span>
            </h2>
          </div>
          <p className="max-w-sm text-xs sm:text-sm leading-relaxed text-slate-400 sm:text-right font-light font-body">
            Seats are limited to curated builders. We prioritize curious learners and active builders.
          </p>
        </div>

        {/* 3 Step Grid with signature re:Invent styling */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pipeline.map((item) => (
            <div
              key={item.step}
              className="bg-[#0A0A0E] border border-white/10 hover:border-reinvent-cyan/40 rounded-2xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 group"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                  <span className="font-mono text-sm font-bold text-reinvent-cyan tracking-wider">
                    {item.step}
                  </span>
                  <span className="text-[10px] font-mono tracking-wider uppercase text-reinvent-pink bg-reinvent-magenta/10 border border-reinvent-magenta/20 px-2.5 py-1 rounded-full font-semibold">
                    {item.phase}
                  </span>
                </div>

                <h3 className="text-xl font-heading font-bold tracking-tight text-white mb-3 group-hover:text-reinvent-cyan transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm font-light leading-relaxed text-slate-400 font-body mb-6">
                  {item.desc}
                </p>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>VERIFICATION:</span>
                <span className="text-emerald-400 font-semibold">{item.requirement}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
