import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { EVENT_CONFIG } from '@/config/event';
import { Spinner } from '@/components/ui/Spinner';
import {
  UserCheck,
  QrCode,
  Clock,
  Users,
  Search,
  CheckCircle2,
  AlertTriangle,
  Wifi,
  WifiOff,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface VolunteerStats {
  checkedIn: number;
  totalApproved: number;
  remaining: number;
  recentCheckins: {
    name: string;
    org: string;
    checked_in_at: string;
  }[];
}

export default function VolunteerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<VolunteerStats>({
    checkedIn: 0,
    totalApproved: 0,
    remaining: 0,
    recentCheckins: [],
  });
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const [checkinRes, approvedRes, recentRes] = await Promise.all([
        supabase.from('checkins').select('*', { count: 'exact', head: true }),
        supabase
          .from('registrations')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'approved'),
        supabase
          .from('checkins')
          .select(`checked_in_at, registrations(name, org)`)
          .order('checked_in_at', { ascending: false })
          .limit(5),
      ]);

      const checkedIn = checkinRes.count || 0;
      const totalApproved = approvedRes.count || 0;

      const recentCheckins = (recentRes.data || []).map((item: any) => ({
        name: item.registrations?.name || 'Unknown',
        org: item.registrations?.org || '',
        checked_in_at: item.checked_in_at,
      }));

      setStats({
        checkedIn,
        totalApproved,
        remaining: Math.max(0, totalApproved - checkedIn),
        recentCheckins,
      });
    } catch (err) {
      console.error('Volunteer stats fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const progressPercent = stats.totalApproved > 0
    ? Math.min(100, Math.round((stats.checkedIn / stats.totalApproved) * 100))
    : 0;

  const now = new Date();
  const hours = now.getHours();
  const greeting =
    hours < 12 ? 'Good Morning' : hours < 17 ? 'Good Afternoon' : 'Good Evening';

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Spinner size="lg" />
        <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">
          Loading gate status…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">

      {/* ── Greeting Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-slate-500 uppercase tracking-wider">
            {greeting}
          </p>
          <h1 className="text-xl font-heading font-bold text-white mt-0.5">
            {user?.email?.split('@')[0]}
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            {EVENT_CONFIG.shortName} · Gate Volunteer
          </p>
        </div>

        {/* Online / Offline indicator */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border ${
            online
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          {online ? (
            <Wifi className="w-3.5 h-3.5" />
          ) : (
            <WifiOff className="w-3.5 h-3.5" />
          )}
          <span>{online ? 'Online' : 'Offline'}</span>
        </div>
      </div>

      {/* ── Offline Warning ── */}
      {!online && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs font-mono">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            You're offline. Check-ins will be saved locally and synced when connection is restored.
          </span>
        </div>
      )}

      {/* ── Gate Check-in CTA — Big Prominent Button ── */}
      <Link
        to="/admin/checkin"
        className="block w-full"
      >
        <div className="relative overflow-hidden rounded-2xl border-2 border-reinvent-magenta/50 bg-gradient-to-br from-[#0A0A0E] to-[#12070F] p-6 hover:border-reinvent-magenta/80 transition-all group">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-reinvent-magenta/20 border border-reinvent-magenta/40 flex items-center justify-center">
                  <QrCode className="w-4 h-4 text-reinvent-pink" />
                </div>
                <span className="text-xs font-mono font-bold text-reinvent-pink uppercase tracking-wider">
                  Gate Scanner
                </span>
              </div>
              <p className="text-lg font-heading font-bold text-white">
                Open Check-in Console
              </p>
              <p className="text-xs text-slate-400 font-mono">
                Scan QR codes or search by name / ticket
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </div>
        </div>
      </Link>

      {/* ── 3 Stats Cards ── */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-[#0A0A0E] border border-white/10 rounded-xl p-2.5 sm:p-4 text-center space-y-1">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
            <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
          </div>
          <p className="text-xl sm:text-2xl font-heading font-black text-white font-mono leading-tight">
            {stats.checkedIn}
          </p>
          <p className="text-[9px] sm:text-[10px] font-mono text-slate-500 uppercase tracking-wider">
            Admitted
          </p>
        </div>

        <div className="bg-[#0A0A0E] border border-white/10 rounded-xl p-2.5 sm:p-4 text-center space-y-1">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto">
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
          </div>
          <p className="text-xl sm:text-2xl font-heading font-black text-white font-mono leading-tight">
            {stats.remaining}
          </p>
          <p className="text-[9px] sm:text-[10px] font-mono text-slate-500 uppercase tracking-wider">
            Remaining
          </p>
        </div>

        <div className="bg-[#0A0A0E] border border-white/10 rounded-xl p-2.5 sm:p-4 text-center space-y-1">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto">
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400" />
          </div>
          <p className="text-xl sm:text-2xl font-heading font-black text-white font-mono leading-tight">
            {progressPercent}%
          </p>
          <p className="text-[9px] sm:text-[10px] font-mono text-slate-500 uppercase tracking-wider">
            Complete
          </p>
        </div>
      </div>

      {/* ── Progress Bar ── */}
      <div className="bg-[#0A0A0E] border border-white/10 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
          <span>Check-in Progress</span>
          <span className="text-white font-bold">
            {stats.checkedIn} / {stats.totalApproved} approved attendees
          </span>
        </div>
        <div className="h-2.5 bg-black/60 rounded-full overflow-hidden border border-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-700"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-[11px] font-mono text-slate-500">
          Auto-refreshes every 10 seconds
        </p>
      </div>

      {/* ── Recent Admissions Stack ── */}
      <div className="bg-[#0A0A0E] border border-white/10 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Recent Admissions Stack</h3>
          </div>
          <span className="text-[10px] font-mono text-slate-500 uppercase">Newest at top</span>
        </div>

        {stats.recentCheckins.length === 0 ? (
          <p className="text-xs font-mono text-slate-500 py-4 text-center">
            No check-ins recorded yet.
          </p>
        ) : (
          <div className="space-y-2">
            {stats.recentCheckins.map((entry, i) => {
              const isTop = i === 0;
              return (
                <div
                  key={i}
                  className={`p-3 rounded-lg border transition-all ${
                    isTop
                      ? 'bg-emerald-950/20 border-emerald-500/40 ring-1 ring-emerald-500/20'
                      : 'bg-black/40 border-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
                          isTop
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-white/5 text-slate-500'
                        }`}
                      >
                        {isTop ? '⚡' : `#${i + 1}`}
                      </span>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p
                            className={`text-sm truncate ${
                              isTop ? 'font-bold text-white' : 'font-semibold text-slate-300'
                            }`}
                          >
                            {entry.name}
                          </p>
                          {isTop && (
                            <span className="text-[8px] font-mono font-bold uppercase px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
                              LATEST
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 font-mono truncate">
                          {entry.org || 'Bhopal'}
                        </p>
                      </div>
                    </div>

                    <span className="text-xs font-mono text-emerald-400 font-bold shrink-0">
                      {new Date(entry.checked_in_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Link
          to="/admin/checkin"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-white/10 text-xs font-mono text-slate-400 hover:text-white hover:border-white/20 transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
          Go to Full Scanner →
        </Link>
      </div>

      {/* ── Volunteer Quick Help ── */}
      <div className="bg-[#060608] border border-white/5 rounded-xl p-4 space-y-2">
        <p className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
          Your Access
        </p>
        <div className="space-y-1.5 text-xs font-mono text-slate-500">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Scan & verify QR codes at gate</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Search attendees by name / ticket / email</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>View live check-in count</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <span className="w-3.5 h-3.5 inline-flex items-center justify-center">—</span>
            <span>Cannot approve / reject applications</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <span className="w-3.5 h-3.5 inline-flex items-center justify-center">—</span>
            <span>Cannot view private attendee data</span>
          </div>
        </div>
      </div>
    </div>
  );
}
