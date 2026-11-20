import { useState } from 'react';
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Spinner } from '@/components/ui/Spinner';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { AwsLogo } from '@/components/common/AwsLogo';
import {
  LayoutDashboard,
  ClipboardCheck,
  Users,
  UserCog,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  ChevronRight,
  QrCode,
  Home,
} from 'lucide-react';

const adminNav = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', shortLabel: 'Dashboard', roles: ['super_admin', 'reviewer'] },
  { to: '/admin/checkin', icon: QrCode, label: 'Gate Check-in', shortLabel: 'Check-in', roles: ['super_admin', 'reviewer', 'volunteer'] },
  { to: '/admin/review', icon: ClipboardCheck, label: 'Review Queue', shortLabel: 'Review', roles: ['super_admin', 'reviewer'] },
  { to: '/admin/attendees', icon: Users, label: 'All Attendees', shortLabel: 'Attendees', roles: ['super_admin', 'reviewer'] },
  { to: '/admin/team', icon: UserCog, label: 'Organizing Team', shortLabel: 'Team', roles: ['super_admin'] },
];

// Volunteer sees their own dashboard + checkin only
const volunteerNav = [
  { to: '/admin/volunteer', icon: Home, label: 'My Dashboard', shortLabel: 'Home', roles: ['volunteer'] },
  { to: '/admin/checkin', icon: QrCode, label: 'Gate Scanner', shortLabel: 'Scanner', roles: ['volunteer'] },
];

export function AdminLayout() {
  const { isAdmin, adminRole, loading, user, signOut } = useAuth();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Spinner size="lg" />
      </div>
    );
  }

  // Strict Protection 1: Non-admins blocked
  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  // Strict Protection 2: Granular RBAC per route
  const path = location.pathname;

  // Volunteers are strictly isolated to Volunteer Dashboard + Gate Check-in only
  if (adminRole === 'volunteer' && path !== '/admin/checkin' && path !== '/admin/volunteer') {
    return <Navigate to="/admin/volunteer" replace />;
  }

  // When volunteer hits /admin root redirect to volunteer dashboard
  if (adminRole === 'volunteer' && path === '/admin') {
    return <Navigate to="/admin/volunteer" replace />;
  }

  // Super Admin only route: Team Management
  if (path.startsWith('/admin/team') && adminRole !== 'super_admin') {
    return <Navigate to="/admin" replace />;
  }

  // Reviewer & Super Admin routes
  if (
    (path.startsWith('/admin/review') || path.startsWith('/admin/attendees')) &&
    !['super_admin', 'reviewer'].includes(adminRole || '')
  ) {
    return <Navigate to="/admin/checkin" replace />;
  }

  const isVolunteer = adminRole === 'volunteer';
  const visibleNav = isVolunteer
    ? volunteerNav
    : adminNav.filter((item) => adminRole && item.roles.includes(adminRole));

  // ─── Volunteer Layout — has own nav (Dashboard + Scanner) ──────────
  if (isVolunteer) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-reinvent-violet/40">
        {/* Volunteer Header */}
        <header className="sticky top-0 z-40 bg-[#0A0A0E]/95 backdrop-blur-md border-b border-white/10 px-3 sm:px-6">
          <div className="max-w-2xl mx-auto h-14 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AwsLogo className="h-5 w-auto" />
              <div className="h-4 w-px bg-white/15" />
              <span className="font-heading font-bold text-xs sm:text-sm text-white truncate">
                Volunteer Console
              </span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <div className="max-w-[100px] sm:max-w-[140px] truncate">
                  <p className="text-[10px] sm:text-[11px] font-semibold text-white truncate leading-tight">
                    {user.email?.split('@')[0]}
                  </p>
                  <p className="text-[8px] sm:text-[9px] font-mono text-emerald-400 font-bold leading-tight">
                    VOLUNTEER
                  </p>
                </div>
              </div>

              <button
                onClick={() => signOut()}
                title="Sign Out"
                className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Volunteer Desktop Tab Bar (Hidden on mobile - mobile uses bottom thumb bar) */}
          <div className="hidden sm:flex max-w-2xl mx-auto items-center gap-1 border-t border-white/5 py-2">
            {volunteerNav.map((item) => {
              const active =
                item.to === '/admin/volunteer'
                  ? location.pathname === '/admin/volunteer'
                  : location.pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                    active
                      ? 'bg-white/10 text-white border border-white/20'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <item.icon className={`w-3.5 h-3.5 ${active ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </header>

        <main className="flex-1 max-w-2xl w-full mx-auto p-3 sm:p-6 pb-24 sm:pb-8">
          <Outlet />
        </main>

        {/* Mobile Bottom Thumb Navigation for Volunteers */}
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-[#0A0A0E]/95 backdrop-blur-xl border-t border-white/10 z-30 safe-area-pb">
          <div className="grid grid-cols-2 h-14">
            {volunteerNav.map((item) => {
              const active =
                item.to === '/admin/volunteer'
                  ? location.pathname === '/admin/volunteer'
                  : location.pathname.startsWith(item.to);

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                    active ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="text-[10px] font-mono leading-none">{item.shortLabel}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <ToastContainer />
      </div>
    );
  }

  // ─── Full Admin / Super Admin / Reviewer Layout ────────────────────────
  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-reinvent-violet/40">
      {/* ─── Top Master Header ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#0A0A0E]/95 backdrop-blur-md border-b border-white/10 px-3 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand Lockup + Mobile Hamburger */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Mobile Hamburger Drawer Button */}
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Open Navigation Menu"
              className="md:hidden p-2 -ml-1 text-slate-300 hover:text-white rounded-lg hover:bg-white/5 active:bg-white/10 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            <AwsLogo className="h-6 sm:h-7 w-auto" />
            <div className="h-4 w-px bg-white/15 hidden sm:block" />
            <div className="hidden sm:flex items-center gap-2">
              <span className="font-heading font-black text-sm tracking-wide text-white uppercase">
                Operations Console
              </span>
              <span className="hidden lg:inline-block px-2 py-0.5 rounded text-[9px] font-mono tracking-widest uppercase bg-reinvent-violet/30 border border-reinvent-violet/40 text-purple-300">
                re:Invent 2026 Bhopal
              </span>
            </div>
          </div>

          {/* Admin Identity & Sign Out */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1 rounded-lg bg-white/5 border border-white/10 max-w-[190px] sm:max-w-xs">
              <ShieldCheck className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-emerald-400 shrink-0" />
              <div className="text-right overflow-hidden">
                <p className="text-[11px] sm:text-xs font-semibold text-white truncate leading-tight">
                  {user.email}
                </p>
                <p className="text-[9px] sm:text-[10px] font-mono text-reinvent-cyan capitalize font-bold leading-tight">
                  {adminRole?.replace('_', ' ')}
                </p>
              </div>
            </div>

            <button
              onClick={() => signOut()}
              title="Sign Out"
              aria-label="Sign Out"
              className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ─── Desktop Top Operations Tabs (Hidden on mobile) ───────────── */}
        <div className="hidden md:flex max-w-7xl mx-auto items-center gap-1.5 border-t border-white/5 py-2 font-mono text-xs">
          {visibleNav.map((item) => {
            const active =
              item.to === '/admin'
                ? location.pathname === '/admin'
                : location.pathname.startsWith(item.to);

            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                  active
                    ? 'bg-gradient-to-r from-[#005C7D]/35 to-[#BD009E]/35 text-white font-bold border border-white/20 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon className={`w-3.5 h-3.5 ${active ? 'text-reinvent-cyan' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </header>

      {/* ─── Mobile Slide-out Sidenav (Drawer) ────────────────────────────── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden animate-fade-in">
          {/* Backdrop */}
          <div
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Drawer Sidebar */}
          <div className="relative w-72 max-w-[80vw] h-full bg-[#0A0A0E] border-r border-white/10 p-5 flex flex-col justify-between shadow-2xl">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <AwsLogo className="h-6 w-auto" />
                  <span className="font-heading font-black text-xs uppercase tracking-wider text-white">
                    Console
                  </span>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User Profile Info */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                  Logged in as
                </p>
                <p className="text-xs font-semibold text-white truncate">{user.email}</p>
                <div className="inline-flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="capitalize">{adminRole?.replace('_', ' ')}</span>
                </div>
              </div>

              {/* Navigation Links */}
              <nav className="space-y-1.5 font-mono text-xs">
                {visibleNav.map((item) => {
                  const active =
                    item.to === '/admin'
                      ? location.pathname === '/admin'
                      : location.pathname.startsWith(item.to);

                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setDrawerOpen(false)}
                      className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                        active
                          ? 'bg-gradient-to-r from-[#005C7D]/35 to-[#BD009E]/35 text-white font-bold border border-white/20'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon
                          className={`w-4 h-4 ${active ? 'text-reinvent-cyan' : 'text-slate-500'}`}
                        />
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600" />
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Drawer Footer: Sign Out */}
            <div className="pt-4 border-t border-white/10">
              <button
                onClick={() => {
                  setDrawerOpen(false);
                  signOut();
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-mono text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-all font-semibold"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out of Console</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Main Content Canvas (Optimized for all viewports) ────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8 pb-20 md:pb-8">
        <Outlet />
      </main>

      {/* ─── Mobile Bottom Icon Navigation Bar (Thumb friendly) ──────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0A0A0E]/95 backdrop-blur-xl border-t border-white/10 z-30 safe-area-pb">
        <div
          className="grid h-14"
          style={{ gridTemplateColumns: `repeat(${visibleNav.length}, minmax(0, 1fr))` }}
        >
          {visibleNav.map((item) => {
            const active =
              item.to === '/admin'
                ? location.pathname === '/admin'
                : location.pathname.startsWith(item.to);

            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                  active ? 'text-reinvent-cyan font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span className="text-[10px] font-mono leading-none">{item.shortLabel}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <ToastContainer />
    </div>
  );
}
