import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { EVENT_CONFIG } from '@/config/event';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/hooks/useToast';
import {
  Users,
  CheckCircle2,
  Clock,
  Hourglass,
  QrCode,
  ArrowRight,
  Download,
  Upload,
  RefreshCw,
  Calendar,
  MapPin,
  Sparkles,
  BarChart3,
  FileSpreadsheet,
  X,
  FileCheck2,
} from 'lucide-react';

interface EventMetrics {
  total: number;
  approved: number;
  pending: number;
  waitlisted: number;
  rejected: number;
  checkedIn: number;
  students: number;
  professionals: number;
  tracks: Record<string, number>;
  colleges: Record<string, number>;
}

export default function AdminDashboard() {
  const { addToast } = useToast();
  const [metrics, setMetrics] = useState<EventMetrics>({
    total: 0,
    approved: 0,
    pending: 0,
    waitlisted: 0,
    rejected: 0,
    checkedIn: 0,
    students: 0,
    professionals: 0,
    tracks: {},
    colleges: {},
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Import Modal State
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadMetrics = async () => {
    try {
      // Fetch registrations data for analytics
      const { data: regs, error } = await supabase
        .from('registrations')
        .select('id, name, email, phone, org, role, status, interests, ticket_code, city, created_at');

      if (error) throw error;

      const all = regs || [];
      const approved = all.filter((r) => r.status === 'approved').length;
      const pending = all.filter((r) => r.status === 'pending').length;
      const waitlisted = all.filter((r) => r.status === 'waitlisted').length;
      const rejected = all.filter((r) => r.status === 'rejected').length;
      const students = all.filter((r) => r.role === 'Student').length;
      const professionals = all.filter((r) => r.role !== 'Student').length;

      // Group by Tracks / Interests
      const tracks: Record<string, number> = {};
      const colleges: Record<string, number> = {};

      all.forEach((r) => {
        if (Array.isArray(r.interests)) {
          r.interests.forEach((t: string) => {
            tracks[t] = (tracks[t] || 0) + 1;
          });
        }
        if (r.org) {
          const orgName = r.org.trim();
          colleges[orgName] = (colleges[orgName] || 0) + 1;
        }
      });

      // Fetch gate checkins count
      const { count: checkinsCount } = await supabase
        .from('checkins')
        .select('*', { count: 'exact', head: true });

      setMetrics({
        total: all.length,
        approved,
        pending,
        waitlisted,
        rejected,
        checkedIn: checkinsCount || 0,
        students,
        professionals,
        tracks,
        colleges,
      });
    } catch (err) {
      console.error('Failed to load metrics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadMetrics();
  };

  // 1-Click Excel / CSV Download
  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) {
        addToast('info', 'No attendee data found to export yet.');
        return;
      }

      const headers = [
        'Registration ID',
        'Full Name',
        'Email Address',
        'Phone Number',
        'College / Company',
        'AWS Builder ID',
        'Experience Level',
        'Application Status',
        'Ticket Code',
        'Registration Date',
      ];

      const rows = data.map((r) => [
        `"${r.id}"`,
        `"${(r.name || '').replace(/"/g, '""')}"`,
        `"${r.email}"`,
        `"${r.phone}"`,
        `"${(r.org || '').replace(/"/g, '""')}"`,
        `"${r.id_number || ''}"`,
        `"${r.experience || ''}"`,
        `"${r.status}"`,
        `"${r.ticket_code || ''}"`,
        `"${new Date(r.created_at).toLocaleString()}"`,
      ]);

      const csvString =
        '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `aws_reinvent_bhopal_attendees_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      addToast('success', `Exported ${data.length} attendee records to Excel (CSV)!`);
    } catch (err: any) {
      console.error('Export failed:', err);
      addToast('error', 'Failed to generate Excel export.');
    } finally {
      setExporting(false);
    }
  };

  // CSV Import Parser for offline/bulk registrations
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
          addToast('error', 'CSV file is empty or missing headers.');
          setImporting(false);
          return;
        }

        // Header mapping
        const headers = lines[0].split(',').map((h) => h.replace(/"/g, '').trim().toLowerCase());
        const nameIdx = headers.findIndex((h) => h.includes('name'));
        const emailIdx = headers.findIndex((h) => h.includes('email'));
        const phoneIdx = headers.findIndex((h) => h.includes('phone') || h.includes('mobile'));
        const orgIdx = headers.findIndex((h) => h.includes('org') || h.includes('college'));

        if (nameIdx === -1 || emailIdx === -1) {
          addToast('error', 'CSV must have at least "Name" and "Email" columns.');
          setImporting(false);
          return;
        }

        let importedCount = 0;
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.replace(/"/g, '').trim());
          const name = cols[nameIdx];
          const email = cols[emailIdx];
          const phone = phoneIdx !== -1 ? cols[phoneIdx] : '9800000000';
          const org = orgIdx !== -1 ? cols[orgIdx] : 'Bhopal Community';

          if (name && email && email.includes('@')) {
            const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
            await supabase.from('registrations').upsert(
              {
                user_id: crypto.randomUUID(),
                name,
                email: email.toLowerCase(),
                phone: phone.replace(/\D/g, '') || `98${Math.floor(10000000 + Math.random() * 90000000)}`,
                city: 'Bhopal',
                role: 'Student',
                org,
                experience: 'Beginner',
                interests: ['Cloud Computing'],
                why_attend: 'Bulk imported by event organizers',
                build_goal: 'Learn AWS hands-on',
                heard_from: 'AWS Community',
                status: 'approved',
                ticket_code: `REINV-${randomSuffix}`,
                qr_secret: crypto.randomUUID(),
              },
              { onConflict: 'email' }
            );
            importedCount++;
          }
        }

        addToast('success', `Successfully imported ${importedCount} attendees!`);
        setImportModalOpen(false);
        loadMetrics();
      } catch (err: any) {
        console.error('Import failed:', err);
        addToast('error', 'Could not process CSV file.');
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
        <Spinner size="lg" />
        <p className="text-xs font-mono text-slate-400 mt-4 uppercase tracking-widest">
          Loading Event Command Center…
        </p>
      </div>
    );
  }

  const capacity = EVENT_CONFIG.capacity; // 300
  const occupancyPercent = Math.min(100, Math.round((metrics.approved / capacity) * 100));

  // Top 4 Colleges
  const topColleges = Object.entries(metrics.colleges)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  // Top 4 Tracks
  const topTracks = Object.entries(metrics.tracks)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
      {/* ─── Top Executive Bar ───────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-mono tracking-widest uppercase bg-reinvent-violet/20 border border-reinvent-violet/40 text-purple-300 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>OPERATIONAL EVENT CONSOLE</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-black text-white">
            AWS re:Invent Watch &amp; Build Party 2026
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 mt-1">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-reinvent-cyan" />
              {EVENT_CONFIG.dateDisplay}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-reinvent-pink" />
              {EVENT_CONFIG.venue}
            </span>
          </div>
        </div>

        {/* Global Action Buttons: Export Excel, Import CSV, Refresh */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh statistics"
            className="btn-secondary text-xs font-mono py-2.5 px-3 inline-flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {/* Import CSV Button */}
          <button
            onClick={() => setImportModalOpen(true)}
            className="btn-secondary text-xs font-mono py-2.5 px-3.5 inline-flex items-center gap-2 text-slate-200 hover:text-white"
          >
            <Upload className="w-3.5 h-3.5 text-reinvent-cyan" />
            <span>Import CSV</span>
          </button>

          {/* Download Excel Button */}
          <button
            onClick={handleExportCSV}
            disabled={exporting}
            className="btn-primary text-xs font-mono py-2.5 px-4 inline-flex items-center gap-2 shadow-lg"
          >
            {exporting ? (
              <Spinner size="sm" />
            ) : (
              <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
            )}
            <span>Export to Excel</span>
          </button>
        </div>
      </div>

      {/* ─── Capacity Gauge Hero Card ─────────────────────────────────────── */}
      <div className="card bg-gradient-to-r from-[#005C7D]/25 via-[#4C158B]/25 to-[#BD009E]/25 border border-white/15 p-6 sm:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-slate-300">
              Auditorium · Hall Capacity Status
            </span>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-3xl sm:text-4xl font-heading font-black text-white font-mono">
                {metrics.approved}
              </span>
              <span className="text-slate-400 font-mono text-sm">
                / {capacity} Total Seats Confirmed
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {occupancyPercent}% Full
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            {metrics.pending > 0 ? (
              <Link
                to="/admin/review"
                className="btn-primary py-2.5 px-4 text-xs font-mono uppercase tracking-wider inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold"
              >
                <Clock className="w-4 h-4" />
                <span>Review {metrics.pending} Pending</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
                <CheckCircle2 className="w-4 h-4" />
                <span>All Pending Reviews Cleared!</span>
              </div>
            )}
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="space-y-2">
          <div className="w-full bg-black/60 rounded-full h-4 p-0.5 border border-white/10 overflow-hidden shadow-inner">
            <div
              className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-[#005C7D] via-[#4C158B] to-[#BD009E]"
              style={{ width: `${occupancyPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] font-mono text-slate-400">
            <span>0 Registrations</span>
            <span>{capacity - metrics.approved} Seats Remaining</span>
            <span>{capacity} Hall Limit</span>
          </div>
        </div>
      </div>

      {/* ─── 4 Primary KPI Summary Cards ─────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Applications */}
        <div className="card bg-[#0A0A0E] border border-white/10 p-5 space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono uppercase tracking-wider">Total Received</span>
            <Users className="w-4 h-4 text-reinvent-cyan" />
          </div>
          <p className="text-2xl sm:text-3xl font-heading font-black text-white font-mono">
            {metrics.total}
          </p>
          <p className="text-[10px] font-mono text-slate-500">Gross builder applications</p>
        </div>

        {/* Pending Reviews */}
        <Link
          to="/admin/review"
          className="card bg-[#0A0A0E] border border-amber-500/30 hover:border-amber-500/60 p-5 space-y-1.5 transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-[11px] font-mono uppercase tracking-wider">Awaiting Decision</span>
            <Clock className="w-4 h-4 group-hover:rotate-45 transition-transform" />
          </div>
          <p className="text-2xl sm:text-3xl font-heading font-black text-amber-300 font-mono">
            {metrics.pending}
          </p>
          <p className="text-[10px] font-mono text-amber-400/80 group-hover:underline">
            Click to process review queue &rarr;
          </p>
        </Link>

        {/* Waitlisted */}
        <div className="card bg-[#0A0A0E] border border-white/10 p-5 space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono uppercase tracking-wider">Waitlisted</span>
            <Hourglass className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-heading font-black text-white font-mono">
            {metrics.waitlisted}
          </p>
          <p className="text-[10px] font-mono text-slate-500">Auto-promoted on cancel</p>
        </div>

        {/* Onsite Check-ins (Clickable to /admin/checkin) */}
        <Link
          to="/admin/checkin"
          className="card bg-[#0A0A0E] border border-white/10 hover:border-reinvent-magenta/50 p-5 space-y-1.5 transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono uppercase tracking-wider">Gate Check-Ins</span>
            <QrCode className="w-4 h-4 text-reinvent-magenta group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-2xl sm:text-3xl font-heading font-black text-white font-mono">
            {metrics.checkedIn}
          </p>
          <p className="text-[10px] font-mono text-reinvent-magenta group-hover:underline">
            Open volunteer gate console &rarr;
          </p>
        </Link>
      </div>

      {/* ─── Operational Controls Bar ───────────────────────────────────── */}
      <div className="card bg-[#0A0A0E] border border-white/10 p-6 space-y-4">
        <h3 className="text-sm font-mono font-bold text-slate-300 uppercase tracking-wider">
          Quick Management Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link
            to="/admin/review"
            className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 transition-colors group"
          >
            <div>
              <p className="text-sm font-semibold text-white">Review Queue</p>
              <p className="text-[11px] font-mono text-slate-400">Card-by-card applicant review</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </Link>

          <Link
            to="/admin/attendees"
            className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 transition-colors group"
          >
            <div>
              <p className="text-sm font-semibold text-white">All Attendees Table</p>
              <p className="text-[11px] font-mono text-slate-400">Search, filter &amp; edit records</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </Link>

          <Link
            to="/admin/checkin"
            className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 transition-colors group"
          >
            <div>
              <p className="text-sm font-semibold text-white">Gate Scanner</p>
              <p className="text-[11px] font-mono text-slate-400">Live check-in &amp; barcode reader</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </Link>

          <Link
            to="/admin/team"
            className="flex items-center justify-between p-4 rounded-xl bg-purple-950/20 hover:bg-purple-950/30 border border-purple-500/20 transition-colors group"
          >
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-white">Organizing Team</p>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-bold uppercase">Super</span>
              </div>
              <p className="text-[11px] font-mono text-slate-400">Volunteers &amp; reviewers</p>
            </div>
            <ArrowRight className="w-4 h-4 text-purple-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </Link>
        </div>
      </div>

      {/* ─── Breakdown & Demographics Grid ──────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Track / Interest Breakdown */}
        <div className="card bg-[#0A0A0E] border border-white/10 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-heading font-bold text-white uppercase tracking-wider">
              Popular Tracks
            </h3>
            <span className="text-[10px] font-mono text-slate-500">Applicant Interests</span>
          </div>

          {topTracks.length === 0 ? (
            <p className="text-xs font-mono text-slate-500 py-4">No track data registered yet.</p>
          ) : (
            <div className="space-y-3 font-mono text-xs">
              {topTracks.map(([trackName, count]) => (
                <div key={trackName} className="space-y-1">
                  <div className="flex justify-between text-slate-300">
                    <span className="truncate max-w-[220px]">{trackName}</span>
                    <span className="font-bold text-white">{count}</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-reinvent-cyan h-full rounded-full"
                      style={{
                        width: `${Math.min(100, Math.round((count / (metrics.total || 1)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Colleges Representation */}
        <div className="card bg-[#0A0A0E] border border-white/10 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-heading font-bold text-white uppercase tracking-wider">
              Top Colleges / Organizations
            </h3>
            <span className="text-[10px] font-mono text-slate-500">Institution Breakdown</span>
          </div>

          {topColleges.length === 0 ? (
            <p className="text-xs font-mono text-slate-500 py-4">No college data registered yet.</p>
          ) : (
            <div className="space-y-3 font-mono text-xs">
              {topColleges.map(([collegeName, count]) => (
                <div key={collegeName} className="space-y-1">
                  <div className="flex justify-between text-slate-300">
                    <span className="truncate max-w-[220px]">{collegeName}</span>
                    <span className="font-bold text-white">{count}</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-reinvent-magenta h-full rounded-full"
                      style={{
                        width: `${Math.min(100, Math.round((count / (metrics.total || 1)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── CSV Import Modal ────────────────────────────────────────────── */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="card bg-[#0A0A0E] border border-white/20 p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2 text-white font-heading font-bold text-base">
                <FileCheck2 className="w-5 h-5 text-reinvent-cyan" />
                <span>Import Attendees from CSV</span>
              </div>
              <button
                onClick={() => setImportModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 font-mono leading-relaxed">
              Upload a CSV file containing offline registrations or partner guest lists. The CSV must have column headers: <span className="text-white">Name, Email, Phone, College</span>.
            </p>

            <div className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center hover:border-reinvent-cyan transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={importing}
                className="hidden"
                id="csv-file-input"
              />
              <label
                htmlFor="csv-file-input"
                className="cursor-pointer flex flex-col items-center justify-center gap-2"
              >
                <Upload className="w-8 h-8 text-slate-400" />
                <span className="text-xs font-mono font-semibold text-white">
                  {importing ? 'Processing & Importing…' : 'Click to select CSV file'}
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  CSV format only (.csv)
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setImportModalOpen(false)}
                disabled={importing}
                className="btn-secondary text-xs font-mono py-2 px-4"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
