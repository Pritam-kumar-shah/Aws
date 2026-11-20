import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AwsReinventLogo } from '@/components/common/AwsLogo';
import { Menu, X, LogOut, User, Shield, QrCode, ArrowRight } from 'lucide-react';
import { useState } from 'react';

const NAV_LINKS = [
  { label: 'About', href: '#about' },
  { label: 'Benefits', href: '#benefits' },
  { label: 'Tracks', href: '#tracks' },
  { label: 'Agenda', href: '#agenda' },
  { label: 'Speakers', href: '#speakers' },
  { label: 'Venue & FAQ', href: '#venue-faq' },
];

export function Navbar() {
  const { user, isAdmin, adminRole, signOut } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isHome = location.pathname === '/';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#000000]/90 border-b border-white/10 backdrop-blur-md transition-all">
      <div className="max-w-[1600px] mx-auto px-5 sm:px-10 lg:px-16">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* ─── BRAND LOGO LOCKUP ──────────────────────────────────── */}
          <Link to="/" className="flex items-center gap-3">
            <AwsReinventLogo />
          </Link>

          {/* ─── DESKTOP NAV LINKS ──────────────────────────────────── */}
          <nav aria-label="Main navigation" className="hidden md:flex items-center gap-4 lg:gap-6 xl:gap-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={isHome ? link.href : `/${link.href}`}
                className="text-xs font-mono uppercase tracking-wider text-slate-400 hover:text-white transition-colors duration-200 py-1"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* ─── RIGHT ACTION / AUTH AREA ───────────────────────────── */}
          <div className="hidden sm:flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/my"
                  className="text-xs font-mono uppercase tracking-wider text-reinvent-cyan hover:underline font-bold"
                >
                  My Pass
                </Link>

                {isAdmin && (
                  <Link
                    to={adminRole === 'volunteer' ? '/admin/volunteer' : '/admin'}
                    className={`text-[11px] font-mono tracking-wider uppercase inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all ${
                      adminRole === 'volunteer'
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
                        : 'bg-reinvent-violet/30 border-reinvent-violet/50 text-purple-200 hover:bg-reinvent-violet/40'
                    }`}
                  >
                    {adminRole === 'volunteer' ? (
                      <>
                        <QrCode className="w-3 h-3 text-emerald-400" />
                        <span>Scanner</span>
                      </>
                    ) : (
                      <>
                        <Shield className="w-3 h-3 text-reinvent-pink" />
                        <span>Admin</span>
                      </>
                    )}
                  </Link>
                )}

                <div className="flex items-center gap-2 pl-3 border-l border-white/10">
                  {user.user_metadata?.avatar_url ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt="Avatar"
                      className="w-7 h-7 rounded-full border border-white/20"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  )}
                  <button
                    onClick={signOut}
                    className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                    title="Sign out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <Link
                to="/apply"
                className="btn-primary text-xs py-2 px-5"
              >
                <span>Register</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            )}
          </div>

          {/* ─── MOBILE BURGER BUTTON ───────────────────────────────── */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-white transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* ─── MOBILE DRAWER ──────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#050507] px-5 py-6 space-y-4">
          <nav className="flex flex-col space-y-3 font-mono text-xs uppercase tracking-wider">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={isHome ? link.href : `/${link.href}`}
                onClick={() => setMobileOpen(false)}
                className="text-slate-300 hover:text-white transition-colors py-1 block"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="pt-4 border-t border-white/10 space-y-3">
            {user ? (
              <div className="space-y-3">
                <Link
                  to="/my"
                  onClick={() => setMobileOpen(false)}
                  className="block text-xs font-mono uppercase tracking-wider text-reinvent-cyan font-bold"
                >
                  My Admission Pass →
                </Link>
                {isAdmin && (
                  <Link
                    to={adminRole === 'volunteer' ? '/admin/volunteer' : '/admin'}
                    onClick={() => setMobileOpen(false)}
                    className="block text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold"
                  >
                    {adminRole === 'volunteer' ? 'Gate Scanner Console →' : 'Admin Operations Console →'}
                  </Link>
                )}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-400 font-mono truncate">{user.email}</span>
                  <button
                    onClick={() => {
                      signOut();
                      setMobileOpen(false);
                    }}
                    className="text-xs text-red-400 font-mono uppercase tracking-wider"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <Link
                to="/apply"
                onClick={() => setMobileOpen(false)}
                className="w-full btn-primary text-xs"
              >
                <span>Register Now</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
