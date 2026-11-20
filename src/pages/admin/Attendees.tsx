import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components/ui/Spinner';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/hooks/useToast';
import type { Registration, RegistrationStatus } from '@/types/database';
import {
  Search,
  Download,
  Check,
  X,
  Hourglass,
  RefreshCw,
  Phone,
  Mail,
  Building,
  Cpu,
} from 'lucide-react';

export default function Attendees() {
  const { addToast } = useToast();
  const [attendees, setAttendees] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchAttendees = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAttendees(data || []);
    } catch (err) {
      console.error('Failed to fetch attendees:', err);
      addToast('error', 'Could not load attendees list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendees();
  }, []);

  // Update status directly from table
  const handleQuickStatusChange = async (id: string, newStatus: RegistrationStatus) => {
    setUpdatingId(id);
    try {
      let updatePayload: any = { status: newStatus };
      if (newStatus === 'approved') {
        const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
        updatePayload.ticket_code = `REINV-${randomSuffix}`;
        updatePayload.qr_secret = crypto.randomUUID();
        updatePayload.reviewed_at = new Date().toISOString();
      }

      let updateSucceeded = false;
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('admin_update_status', {
          p_reg_id: id,
          p_status: newStatus,
          p_ticket_code: updatePayload.ticket_code || null,
        });
        if (!rpcError && rpcData?.success) {
          updateSucceeded = true;
        }
      } catch {}

      if (!updateSucceeded) {
        const { data: updateData, error } = await supabase
          .from('registrations')
          .update(updatePayload)
          .eq('id', id)
          .select();

        if (error) throw error;
        if (!updateData || updateData.length === 0) {
          throw new Error('Supabase RLS blocked this update. Please run the migration script in Supabase SQL Editor!');
        }
      }

      setAttendees((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...updatePayload } : a))
      );
      addToast('success', `Status updated to ${newStatus}`);
    } catch (err: any) {
      console.error('Update status error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to update status.';
      addToast('error', msg);
    } finally {
      setUpdatingId(null);
    }
  };

  // Filter and search
  const filteredAttendees = useMemo(() => {
    return attendees.filter((item) => {
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const q = search.toLowerCase();
      const matchesSearch =
        !search ||
        item.name.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.phone.includes(q) ||
        item.org.toLowerCase().includes(q) ||
        (item.id_number && item.id_number.toLowerCase().includes(q)) ||
        (item.ticket_code && item.ticket_code.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [attendees, statusFilter, search]);

  // Export to CSV for Excel
  const exportToCSV = () => {
    if (filteredAttendees.length === 0) {
      addToast('info', 'No records to export.');
      return;
    }

    const headers = [
      'Name',
      'Email',
      'Phone',
      'Organization / College',
      'AWS Builder ID',
      'Experience',
      'Status',
      'Ticket Code',
      'Registered At',
    ];

    const rows = filteredAttendees.map((a) => [
      `"${a.name.replace(/"/g, '""')}"`,
      `"${a.email}"`,
      `"${a.phone}"`,
      `"${a.org.replace(/"/g, '""')}"`,
      `"${a.id_number || ''}"`,
      `"${a.experience}"`,
      `"${a.status}"`,
      `"${a.ticket_code || ''}"`,
      `"${new Date(a.created_at).toLocaleString()}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `aws_reinvent_bhopal_attendees_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast('success', 'Attendees exported to CSV successfully!');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-black text-white">
            All Attendees Directory
          </h1>
          <p className="text-xs font-mono text-slate-400 mt-0.5">
            Total {attendees.length} builder submissions · Search, filter and manage
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchAttendees}
            disabled={loading}
            className="btn-secondary text-xs font-mono py-2 px-3 inline-flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={exportToCSV}
            className="btn-primary text-xs font-mono py-2 px-3.5 inline-flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search name, email, phone, college…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10 text-xs font-mono w-full"
          />
        </div>

        {/* Status Filter Tabs (Scrollable on small screens) */}
        <div className="flex items-center gap-1 overflow-x-auto bg-[#0A0A0E] border border-white/10 p-1 rounded-xl">
          {['all', 'pending', 'approved', 'waitlisted', 'rejected'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono capitalize whitespace-nowrap transition-all ${
                statusFilter === s
                  ? 'bg-gradient-to-r from-[#005C7D] to-[#BD009E] text-white font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Content: Mobile Cards + Desktop Table ───────────────────────── */}
      <div className="card bg-[#0A0A0E] border border-white/10 overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center">
            <Spinner size="lg" />
            <p className="text-xs font-mono text-slate-400 mt-3">Loading attendee records…</p>
          </div>
        ) : filteredAttendees.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs font-mono">
            No attendees found matching your search.
          </div>
        ) : (
          <>
            {/* Mobile View: Clean, Touch-Optimized Cards */}
            <div className="md:hidden divide-y divide-white/5">
              {filteredAttendees.map((item) => (
                <div key={item.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-white text-sm">{item.name}</p>
                      <span className="text-[10px] font-mono text-reinvent-cyan">
                        {item.role} · {item.city}
                      </span>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>

                  <div className="space-y-1 text-xs font-mono text-slate-400">
                    <div className="flex items-center gap-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{item.email}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{item.phone}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <Building className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{item.org}</span>
                    </div>
                    {item.id_number && (
                      <div className="flex items-center gap-1.5 truncate text-reinvent-cyan">
                        <Cpu className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Builder ID: {item.id_number}</span>
                      </div>
                    )}
                    {item.experience && (
                      <div className="text-[11px] text-slate-400">
                        Experience: <span className="text-white">{item.experience}</span>
                      </div>
                    )}
                  </div>

                  {item.ticket_code && (
                    <div className="pt-1">
                      <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded">
                        Ticket: {item.ticket_code}
                      </span>
                    </div>
                  )}

                  {/* Mobile Quick Action Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                    {item.status !== 'approved' && (
                      <button
                        disabled={updatingId === item.id}
                        onClick={() => handleQuickStatusChange(item.id, 'approved')}
                        className="btn-secondary text-[11px] font-mono py-1.5 px-3 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 inline-flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        <span>Approve</span>
                      </button>
                    )}
                    {item.status !== 'rejected' && (
                      <button
                        disabled={updatingId === item.id}
                        onClick={() => handleQuickStatusChange(item.id, 'rejected')}
                        className="btn-secondary text-[11px] font-mono py-1.5 px-3 text-red-400 border-red-500/30 hover:bg-red-500/10 inline-flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        <span>Reject</span>
                      </button>
                    )}
                    {item.status !== 'waitlisted' && (
                      <button
                        disabled={updatingId === item.id}
                        onClick={() => handleQuickStatusChange(item.id, 'waitlisted')}
                        className="btn-secondary text-[11px] font-mono py-1.5 px-3 text-amber-400 border-amber-500/30 hover:bg-amber-500/10 inline-flex items-center gap-1"
                      >
                        <Hourglass className="w-3 h-3" />
                        <span>Waitlist</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View: Full Data Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-slate-400 font-mono uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4">Applicant</th>
                    <th className="py-3.5 px-4">Contact</th>
                    <th className="py-3.5 px-4">College / Company</th>
                    <th className="py-3.5 px-4">AWS Builder ID</th>
                    <th className="py-3.5 px-4">Experience</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Ticket</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {filteredAttendees.map((item) => (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 font-sans">
                        <div className="font-semibold text-white">{item.name}</div>
                      </td>

                      <td className="py-3 px-4 text-slate-300">
                        <div>{item.email}</div>
                        <div className="text-[10px] text-slate-500">{item.phone}</div>
                      </td>

                      <td className="py-3 px-4 text-slate-300 font-sans">
                        <div className="font-medium text-slate-200">{item.org}</div>
                      </td>

                      <td className="py-3 px-4 text-reinvent-cyan font-mono text-xs font-semibold">
                        {item.id_number || '—'}
                      </td>

                      <td className="py-3 px-4 text-slate-300 font-mono text-xs">
                        <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">
                          {item.experience || 'Beginner'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <StatusBadge status={item.status} />
                      </td>

                      <td className="py-3 px-4">
                        {item.ticket_code ? (
                          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded">
                            {item.ticket_code}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.status !== 'approved' && (
                            <button
                              title="Approve"
                              disabled={updatingId === item.id}
                              onClick={() => handleQuickStatusChange(item.id, 'approved')}
                              className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {item.status !== 'rejected' && (
                            <button
                              title="Reject"
                              disabled={updatingId === item.id}
                              onClick={() => handleQuickStatusChange(item.id, 'rejected')}
                              className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all disabled:opacity-50"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {item.status !== 'waitlisted' && (
                            <button
                              title="Waitlist"
                              disabled={updatingId === item.id}
                              onClick={() => handleQuickStatusChange(item.id, 'waitlisted')}
                              className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition-all disabled:opacity-50"
                            >
                              <Hourglass className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
