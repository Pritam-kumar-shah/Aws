import { useScrollFade } from '@/hooks/useScrollFade';

const benefits = [
  {
    num: '/ 01',
    title: '100% Free Entry',
    description:
      'Zero entry fees. Curated 300 spots open to enrolled college and polytechnic students, working developers, and faculty in Bhopal.',
  },
  {
    num: '/ 02',
    title: 'Practical Cloud & GenAI',
    description:
      'Stream the AWS re:Invent keynote broadcasts live and dissect real production architectures, agentic AI workflows on Bedrock, and serverless systems.',
  },
  {
    num: '/ 03',
    title: 'AWS Goodies & Swag Kit',
    description:
      'Get exclusive AWS stickers, event t-shirts, badge lanyards, community recognition swags, and AWS promotional credits to power your next build.',
  },
  {
    num: '/ 04',
    title: 'Collegiate Networking',
    description:
      'Connect with fellow student builders, collegiate tech club leads, and cloud mentors from the regional community.',
  },
];

export function Benefits() {
  const ref = useScrollFade();

  return (
    <section
      id="benefits"
      ref={ref}
      className="relative overflow-hidden bg-[#000000] px-5 py-16 text-slate-200 sm:px-10 sm:py-24 lg:px-16 border-b border-white/10"
    >
      <div className="relative mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex flex-col justify-between gap-3 sm:mb-16 sm:flex-row sm:items-end">
          <div>
            <span className="text-[11px] sm:text-xs font-mono uppercase tracking-[0.2em] text-reinvent-cyan block mb-2 sm:mb-3">
              Attendee Experience
            </span>
            <h2 className="text-3xl font-heading font-black tracking-tight sm:text-5xl lg:text-6xl text-white">
              Experience{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-reinvent-cyan via-purple-400 to-reinvent-pink">
                more.
              </span>
            </h2>
          </div>
          <p className="max-w-sm text-xs sm:text-sm leading-relaxed text-slate-400 sm:text-right font-light">
            Discover new ideas, experiment with cloud technology, and meet the student builders creating what comes next.
          </p>
        </div>

        {/* Responsive Grid with Divider Borders */}
        <div className="grid border-y border-white/10 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/10">
          {benefits.map((b) => (
            <article
              key={b.num}
              className="group relative isolate overflow-hidden px-5 py-8 sm:px-6 sm:py-10 transition-colors duration-300 hover:bg-white/[0.02]"
            >
              <div className="mb-4 sm:mb-8 flex items-center justify-between">
                <span className="text-xs font-mono tracking-wider text-reinvent-cyan font-bold">
                  {b.num}
                </span>
                <span className="h-1.5 w-1.5 rotate-45 bg-reinvent-cyan group-hover:bg-reinvent-pink group-hover:scale-125 transition-all" />
              </div>

              <h3 className="text-xl sm:text-2xl font-heading font-bold tracking-tight text-white group-hover:text-reinvent-cyan transition-colors mb-2.5 sm:mb-4">
                {b.title}
              </h3>

              <p className="max-w-sm text-xs sm:text-sm leading-relaxed text-slate-400 font-light">
                {b.description}
              </p>

              {/* Bottom accent indicator */}
              <div className="mt-6 w-8 h-0.5 bg-reinvent-cyan/40 group-hover:w-16 group-hover:bg-reinvent-pink transition-all duration-300" />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
