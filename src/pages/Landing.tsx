import { Hero } from '@/components/landing/Hero';
import { About } from '@/components/landing/About';
import { Benefits } from '@/components/landing/Benefits';
import { HighlightCards } from '@/components/landing/HighlightCards';
import { Agenda } from '@/components/landing/Agenda';
import { Speakers } from '@/components/landing/Speakers';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { VenueFAQ } from '@/components/landing/VenueFAQ';
import { FinalCTA } from '@/components/landing/FinalCTA';

export default function Landing() {
  return (
    <div className="relative min-h-screen bg-[#000000] text-slate-200 selection:bg-reinvent-magenta/40 selection:text-white">
      {/* ─── 1. HERO SECTION WITH VIDEO BACKGROUND ─────────────────── */}
      <Hero />

      {/* ─── 2. ABOUT THE GATHERING (#about) ───────────────────────── */}
      <About />

      {/* ─── 3. ATTENDEE BENEFITS & EXPERIENCE (#benefits) ─────────── */}
      <Benefits />

      {/* ─── 4. CONFERENCE TRACKS (#tracks) ────────────────────────── */}
      <HighlightCards />

      {/* ─── 5. TECHNICAL AGENDA (#agenda) ─────────────────────────── */}
      <Agenda />

      {/* ─── 6. SPEAKERS & MENTORS (#speakers - TBA) ───────────────── */}
      <Speakers />

      {/* ─── 7. APPLICATION & SELECTION PROCESS ────────────────────── */}
      <div id="how-it-works" className="bg-[#000000]">
        <HowItWorks />
      </div>

      {/* ─── 8. VENUE & FAQ ACCORDION (#venue-faq) ─────────────────── */}
      <VenueFAQ />

      {/* ─── 9. FINAL REGISTRATION CALL TO ACTION (#register) ──────── */}
      <FinalCTA />
    </div>
  );
}
