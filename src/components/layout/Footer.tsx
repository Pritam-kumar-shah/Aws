import { EVENT_CONFIG } from '@/config/event';
import { Link, useLocation } from 'react-router-dom';
import { Mail } from 'lucide-react';
import {
  LinkedInIcon,
  InstagramIcon,
  WhatsAppIcon,
} from '@/components/common/BrandIcons';

const FOOTER_LINKS = [
  { label: 'About', href: '#about' },
  { label: 'Benefits', href: '#benefits' },
  { label: 'Tracks', href: '#tracks' },
  { label: 'Agenda', href: '#agenda' },
  { label: 'Speakers', href: '#speakers' },
  { label: 'Venue & FAQ', href: '#venue-faq' },
  { label: 'Register ↗', href: '#register' },
];

export function Footer() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <footer className="relative isolate overflow-hidden bg-[#000000] border-t border-white/10 text-slate-200 pt-12 sm:pt-16 pb-10 px-5 sm:px-10 lg:px-16 mt-auto">
      {/* Ambient bottom glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_100%,rgba(76,21,139,0.20),transparent_60%)]"
      />

      <div className="mx-auto max-w-6xl space-y-8">
        {/* Top Section */}
        <div className="flex flex-col justify-between gap-6 sm:gap-10 pb-8 md:flex-row md:items-end border-b border-white/10">
          <div>
            {/* Social channels placed directly ABOVE re:Invent */}
            <div className="flex flex-wrap items-center gap-2.5 mb-3">
              {Boolean(EVENT_CONFIG.linkedinUrl) && (
                <a
                  href={EVENT_CONFIG.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:border-reinvent-cyan/50 hover:bg-white/10 text-xs font-mono text-slate-300 transition-all group"
                >
                  <LinkedInIcon className="w-3.5 h-3.5 text-reinvent-cyan fill-current" />
                  <span className="group-hover:text-white">AWS SBG LinkedIn ↗</span>
                </a>
              )}

              {Boolean(EVENT_CONFIG.whatsAppGroupUrl && !EVENT_CONFIG.whatsAppGroupUrl.includes('PLACEHOLDER')) && (
                <a
                  href={EVENT_CONFIG.whatsAppGroupUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/10 text-xs font-mono text-slate-300 transition-all group"
                >
                  <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-400 fill-current" />
                  <span className="group-hover:text-white">WhatsApp Community ↗</span>
                </a>
              )}

              {Boolean(EVENT_CONFIG.instagramUrl) && (
                <a
                  href={EVENT_CONFIG.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:border-reinvent-pink/50 hover:bg-white/10 text-xs font-mono text-slate-300 transition-all group"
                >
                  <InstagramIcon className="w-3.5 h-3.5 text-reinvent-pink" />
                  <span className="group-hover:text-white">@awssbgtitscience ↗</span>
                </a>
              )}
            </div>

            <Link
              to="/"
              className="inline-block text-2xl sm:text-4xl font-heading font-black tracking-tight text-white"
            >
              re<span className="text-reinvent-magenta">:</span>Invent<span className="text-white/40">.</span>
            </Link>
            <p className="mt-2 text-xs sm:text-sm font-light leading-relaxed text-slate-400 font-body">
              Watch keynote releases, unpack cloud architectures, and connect with builders in Bhopal.
            </p>
          </div>

          <nav
            aria-label="Footer navigation"
            className="flex flex-wrap gap-x-5 sm:gap-x-7 gap-y-2 font-mono text-xs uppercase tracking-[0.12em]"
          >
            {FOOTER_LINKS.map((link) => (
              <a
                key={link.label}
                href={isHome ? link.href : `/${link.href}`}
                className="text-slate-400 hover:text-white transition-colors py-1"
              >
                {link.label}
              </a>
            ))}
            <Link to="/privacy" className="text-slate-400 hover:text-white transition-colors py-1">
              Privacy
            </Link>
          </nav>
        </div>

        {/* Middle Section: Contact Emails */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between text-xs font-mono text-slate-400 gap-4">
          <p className="text-white font-medium">
            Hosted by <span className="text-reinvent-cyan font-bold">{EVENT_CONFIG.organizer}</span>
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            <a
              href={`mailto:${EVENT_CONFIG.contactEmail}`}
              className="inline-flex items-center gap-1.5 text-slate-300 hover:text-reinvent-cyan transition-colors"
            >
              <Mail className="w-3.5 h-3.5 text-reinvent-cyan" />
              <span>{EVENT_CONFIG.contactEmail}</span>
            </a>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <a
              href={`mailto:${EVENT_CONFIG.organizerEmail}`}
              className="inline-flex items-center gap-1.5 text-slate-300 hover:text-reinvent-pink transition-colors"
            >
              <Mail className="w-3.5 h-3.5 text-reinvent-pink" />
              <span>{EVENT_CONFIG.organizerEmail}</span>
            </a>
          </div>
        </div>

        {/* Bottom Section: Developed By */}
        <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-slate-500 gap-3">
          <div>
            Developed with <span className="text-reinvent-pink">♥</span> by{' '}
            <a
              href={EVENT_CONFIG.developerLinkedIn}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-reinvent-cyan transition-colors font-semibold underline underline-offset-4 decoration-reinvent-cyan/40"
            >
              {EVENT_CONFIG.developerName} ↗
            </a>
          </div>

          <div className="text-[11px] text-slate-500">
            AWS re:Invent Watch &amp; Build Party 2026 · Bhopal
          </div>
        </div>
      </div>
    </footer>
  );
}
