import { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { EVENT_CONFIG } from '@/config/event';
import { ReinventPill } from '@/components/common/AwsLogo';
import { WhatsAppIcon } from '@/components/common/BrandIcons';
import { ArrowRight, ChevronDown, ShieldCheck } from 'lucide-react';

export function Hero() {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);

  // Guarantee 100% browser autoplay compatibility (iOS, Safari, Chrome, Android)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Fallback if browser low-power mode pauses video
      });
    }
  }, []);

  return (
    <section
      id="hero"
      className="relative isolate min-h-screen flex items-center overflow-hidden bg-[#000000] text-slate-200 pt-28 pb-16 sm:pt-36 sm:pb-20 lg:pt-32 lg:pb-24 border-b border-white/10"
    >
      {/* ─── VIDEO BACKGROUND & ATMOSPHERIC GLOWS ───────────────────── */}
      <div className="absolute inset-0 -z-30 w-full h-full overflow-hidden" aria-hidden="true">
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/images/hero-poster.jpg"
          disablePictureInPicture
          disableRemotePlayback
          className="h-full w-full object-cover object-center opacity-45 sm:opacity-55 scale-105 pointer-events-none select-none transition-opacity duration-1000"
        >
          {/* High-speed local official AWS re:Invent Foyer Loop */}
          <source src="/videos/aws_foyer_loop.mp4" type="video/mp4" />
          <source src="/videos/hero_background.mp4" type="video/mp4" />
          <source
            src="https://d1.awsstatic.com/onedam/marketing-channels/website/aws/en_US/events/approved/reinvent26/video/RIV%20Website%20Loop_Foyer_v2.c6bbccb6cb4e0256ab5c1b7d63c862ddf2dd6636.mp4"
            type="video/mp4"
          />
        </video>
      </div>

      {/* Dark overlay for maximum contrast */}
      <div className="absolute inset-0 -z-20 bg-black/60 sm:bg-black/50 pointer-events-none" aria-hidden="true" />

      {/* Original Signature re:Invent atmospheric gradient glow */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-reinvent-glow -z-10"
        aria-hidden="true"
      />

      {/* ─── HERO CONTENT CONTAINER ─────────────────────────────────── */}
      <div className="w-full max-w-6xl mx-auto px-5 sm:px-10 lg:px-16 text-center space-y-8">
        {/* Official re:Invent Pill */}
        <div className="flex justify-center">
          <ReinventPill text="For those who build and implement" />
        </div>

        {/* Location & Edition Badge */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/5 border border-white/15 text-xs font-mono text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-white font-bold tracking-wide">BHOPAL EDITION</span>
          <span className="text-slate-600">|</span>
          <span className="text-reinvent-cyan font-mono uppercase text-[11px]">2026</span>
        </div>

        {/* Main Hero Headline with original signature gradient */}
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-heading font-black text-white tracking-tight leading-[1.05]">
            AWS re:Invent
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-reinvent-cyan via-purple-400 to-reinvent-pink">
              Watch &amp; Build Party
            </span>
            <br />
            2026, Bhopal
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed font-body">
            Central India's premier student cloud &amp; AI gathering. Experience keynote broadcasts live, deploy hands-on labs with Amazon Bedrock, and connect with fellow builders.
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Link
            to={user ? '/my' : '/apply'}
            className="w-full sm:w-auto btn-primary px-10 py-4 text-base"
          >
            <span>{user ? 'VIEW MY ADMISSION PASS' : 'APPLY FOR FREE ADMISSION'}</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>

          <a
            href="#about"
            className="w-full sm:w-auto btn-secondary px-8 py-4 text-sm font-mono uppercase tracking-wider inline-flex items-center justify-center gap-2"
          >
            <span>Explore Gathering</span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </a>
        </div>

        {/* WhatsApp Community Callout */}
        {Boolean(EVENT_CONFIG.whatsAppGroupUrl) && (
          <div className="flex justify-center pt-1">
            <a
              href={EVENT_CONFIG.whatsAppGroupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 text-xs sm:text-sm font-mono font-semibold tracking-wide transition-all shadow-lg shadow-emerald-500/10 group cursor-pointer"
            >
              <WhatsAppIcon className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
              <span>Join Official WhatsApp Community ↗</span>
            </a>
          </div>
        )}

        {/* Security & Endorsement Note */}
        <div className="flex items-center justify-center gap-2 text-xs font-mono text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>STUDENT COMMUNITY GATHERING · 100% FREE PASS · ADVANCE RSVP REQUIRED</span>
        </div>

        {/* Coordinates Strip: DATE (TBA), TIMINGS (10 AM check-in, 1-2 PM lunch, 1h sessions), VENUE (TBA), ADMISSION */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-4xl mx-auto text-left pt-4">
          <div className="bg-[#0A0A0E] border border-white/10 p-4 rounded-xl">
            <span className="text-[10px] font-mono tracking-wider text-slate-500 uppercase block">
              DATE
            </span>
            <span className="font-mono text-xs sm:text-sm font-bold text-reinvent-cyan mt-1 block">
              {EVENT_CONFIG.dateDisplay}
            </span>
            <span className="text-[10px] font-mono text-slate-500 mt-0.5 block">
              Announcing Soon
            </span>
          </div>

          <div className="bg-[#0A0A0E] border border-white/10 p-4 rounded-xl">
            <span className="text-[10px] font-mono tracking-wider text-slate-500 uppercase block">
              TIMINGS
            </span>
            <span className="font-mono text-xs sm:text-sm font-bold text-white mt-1 block">
              {EVENT_CONFIG.timeDisplay}
            </span>
            <span className="text-[10px] font-mono text-slate-500 mt-0.5 block truncate">
              10 AM Check-in · 1 PM Lunch
            </span>
          </div>

          <div className="bg-[#0A0A0E] border border-white/10 p-4 rounded-xl">
            <span className="text-[10px] font-mono tracking-wider text-slate-500 uppercase block">
              VENUE
            </span>
            <span className="font-mono text-xs sm:text-sm font-bold text-reinvent-pink truncate block mt-1">
              {EVENT_CONFIG.venue}
            </span>
            <span className="text-[10px] font-mono text-slate-500 mt-0.5 block truncate">
              Announcing Soon
            </span>
          </div>

          <div className="bg-[#0A0A0E] border border-white/10 p-4 rounded-xl">
            <span className="text-[10px] font-mono tracking-wider text-slate-500 uppercase block">
              ADMISSION
            </span>
            <span className="font-mono text-xs sm:text-sm font-bold text-emerald-400 block mt-1">
              100% FREE PASS
            </span>
            <span className="text-[10px] font-mono text-slate-500 mt-0.5 block">
              Advance RSVP Required
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
