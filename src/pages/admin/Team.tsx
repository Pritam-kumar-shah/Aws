import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import type { AdminRole } from '@/types/database';
import {
  ShieldCheck,
  UserPlus,
  Trash2,
  Mail,
  UserCheck,
  Shield,
  QrCode,
  ClipboardCheck,
  Calendar,
  Sparkles,
} from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  created_at: string;
}

const LOCAL_TEAM_KEY = 'reinvent_team_members';

export default function Team() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AdminRole>('volunteer');
  const [submitting, setSubmitting] = useState(false);

  const loadTeam = async () => {
    setLoading(true);
    try {
      // 1. Try server RPC function (direct from database)
      try {
        const { data: rpcMembers, error: rpcError } = await supabase.rpc('list_team_members');
        if (!rpcError && rpcMembers && rpcMembers.length > 0) {
          setTeam(
            rpcMembers.map((m: any) => ({
              id: m.id || m.email,
              name: m.name || 'Team Member',
              email: m.email,
              role: m.role as AdminRole,
              created_at: m.created_at || new Date().toISOString(),
            }))
          );
          setLoading(false);
          return;
        }
      } catch (rpcErr) {
        // fallback to table & local cache
      }

      // 2. Fallback: Load from Supabase admins table
      const { data: dbAdmins } = await supabase
        .from('admins')
        .select('*')
        .order('created_at', { ascending: false });

      // 3. Fallback: Load from settings table (team_members)
      try {
        const { data: setRow } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'team_members')
          .maybeSingle();

        if (setRow?.value && Array.isArray(setRow.value)) {
          setRow.value.forEach((row: any) => {
            if (row.email && !merged.some((m) => m.email.toLowerCase() === row.email.toLowerCase())) {
              merged.push({
                id: row.id || `set-${row.email}`,
                name: row.name || 'Team Member',
                email: row.email,
                role: row.role as AdminRole,
                created_at: row.created_at || new Date().toISOString(),
              });
            }
          });
        }
      } catch {}

      // 4. Fallback: Load from local team storage
      const localRaw = localStorage.getItem(LOCAL_TEAM_KEY);
      let localList: TeamMember[] = [];
      if (localRaw) {
        try {
          localList = JSON.parse(localRaw);
        } catch {
          localList = [];
        }
      }

      const merged: TeamMember[] = [...localList];

      if (dbAdmins) {
        dbAdmins.forEach((row: any) => {
          const emailVal = row.email || (row.user_id === user?.id ? user?.email : undefined);
          if (emailVal && !merged.some((m) => m.email.toLowerCase() === emailVal.toLowerCase())) {
            merged.push({
              id: row.id,
              name: row.display_name || 'Admin Member',
              email: emailVal,
              role: row.role as AdminRole,
              created_at: row.created_at || new Date().toISOString(),
            });
          }
        });
      }

      // Always ensure Chapter and Pritam are at top as Super Admin Owners
      const withoutOwners = merged.filter(
        (m) =>
          m.email.toLowerCase() !== 'awssbgtitscience@gmail.com' &&
          m.email.toLowerCase() !== 'mrpritamraj21@gmail.com' &&
          m.email.toLowerCase() !== 'vijaymalsah442@gmail.com'
      );

      const finalList: TeamMember[] = [
        {
          id: 'owner-chapter',
          name: 'AWS Student Builder Group (Chapter Admin)',
          email: 'awssbgtitscience@gmail.com',
          role: 'super_admin',
          created_at: '2026-10-28T12:00:00Z',
        },
        {
          id: 'owner-pritam',
          name: 'Pritam Kumar (Lead Organizer)',
          email: 'mrpritamraj21@gmail.com',
          role: 'super_admin',
          created_at: '2026-10-28T12:00:00Z',
        },
        {
          id: 'owner-vijay',
          name: 'Vijay (Super Admin)',
          email: 'vijaymalsah442@gmail.com',
          role: 'super_admin',
          created_at: '2026-10-28T12:00:00Z',
        },
        ...withoutOwners,
      ];

      setTeam(finalList);
    } catch (e) {
      console.warn('Team load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeam();
  }, [user]);

  const syncSettings = async (members: TeamMember[]) => {
    try {
      await supabase.from('settings').upsert({
        key: 'team_members',
        value: members.map((m) => ({
          id: m.id,
          name: m.name,
          email: m.email.trim().toLowerCase(),
          role: m.role,
          created_at: m.created_at,
        })),
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Sync settings notice:', e);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (!cleanEmail || !cleanName) {
      addToast('error', 'Please enter both name and email.');
      return;
    }

    if (
      cleanEmail === 'awssbgtitscience@gmail.com' ||
      cleanEmail === 'mrpritamraj21@gmail.com' ||
      cleanEmail === 'vijaymalsah442@gmail.com'
    ) {
      addToast('info', 'You are already the Super Admin!');
      return;
    }

    if (team.some((m) => m.email.toLowerCase() === cleanEmail)) {
      addToast('error', 'This email is already added to the team!');
      return;
    }

    setSubmitting(true);
    try {
      const newMember: TeamMember = {
        id: `team-${Date.now()}`,
        name: cleanName,
        email: cleanEmail,
        role: role,
        created_at: new Date().toISOString(),
      };

      // 1. Save to local storage for zero-latency instant feedback
      const currentLocal: TeamMember[] = JSON.parse(
        localStorage.getItem(LOCAL_TEAM_KEY) || '[]'
      );
      const updatedLocal = [
        newMember,
        ...currentLocal.filter((m) => m.email.toLowerCase() !== cleanEmail),
      ];
      localStorage.setItem(LOCAL_TEAM_KEY, JSON.stringify(updatedLocal));
      void syncSettings(updatedLocal);

      // 2. Try server RPC function (direct to database)
      let syncedWithDb = false;
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('manage_team_member', {
          p_action: 'add',
          p_email: cleanEmail,
          p_name: cleanName,
          p_role: role,
        });

        if (!rpcErr && rpcRes?.success) {
          syncedWithDb = true;
        }
      } catch {}

      // 3. Fallback: Direct table insert into admins
      if (!syncedWithDb) {
        try {
          await supabase.from('admins').upsert(
            {
              email: cleanEmail,
              display_name: cleanName,
              role: role,
            },
            { onConflict: 'email' }
          );
        } catch (dbErr) {
          console.warn('DB direct upsert notice:', dbErr);
        }
      }

      addToast('success', `Added ${cleanName} (${cleanEmail}) as ${role.toUpperCase()}!`);
      setName('');
      setEmail('');
      setRole('volunteer');
      loadTeam();
    } catch (err: any) {
      console.error('Failed to add team member:', err);
      addToast('error', err?.message || 'Could not add member.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (member: TeamMember, newRole: AdminRole) => {
    const memberEmail = (member.email || '').trim();
    if (
      memberEmail.toLowerCase() === 'awssbgtitscience@gmail.com' ||
      memberEmail.toLowerCase() === 'mrpritamraj21@gmail.com' ||
      memberEmail.toLowerCase() === 'vijaymalsah442@gmail.com'
    ) {
      addToast('error', 'You are the Super Admin owner and cannot demote yourself!');
      return;
    }

    try {
      // 1. Update local storage
      const currentLocal: TeamMember[] = JSON.parse(
        localStorage.getItem(LOCAL_TEAM_KEY) || '[]'
      );
      const updatedLocal = currentLocal.map((m) =>
        (m.id === member.id || (memberEmail && m.email?.toLowerCase() === memberEmail.toLowerCase()))
          ? { ...m, role: newRole }
          : m
      );
      localStorage.setItem(LOCAL_TEAM_KEY, JSON.stringify(updatedLocal));
      void syncSettings(updatedLocal);

      // 2. Try server RPC function
      let synced = false;
      if (memberEmail) {
        try {
          const { data: rpcRes, error: rpcErr } = await supabase.rpc('manage_team_member', {
            p_action: 'update_role',
            p_email: memberEmail.toLowerCase(),
            p_role: newRole,
          });
          if (!rpcErr && rpcRes?.success) synced = true;
        } catch {}
      }

      // 3. Fallback: Direct table update in Supabase
      if (!synced) {
        try {
          if (member.id && !member.id.startsWith('team-')) {
            await supabase
              .from('admins')
              .update({ role: newRole })
              .eq('id', member.id);
          }
          if (memberEmail) {
            await supabase
              .from('admins')
              .update({ role: newRole })
              .ilike('email', memberEmail);
          }
        } catch {}
      }

      setTeam((prev) =>
        prev.map((m) =>
          (m.id === member.id || (memberEmail && m.email?.toLowerCase() === memberEmail.toLowerCase()))
            ? { ...m, role: newRole }
            : m
        )
      );
      addToast('success', `Updated role to ${newRole}`);
    } catch (err: any) {
      addToast('error', 'Failed to update role.');
    }
  };

  const handleRemove = async (member: TeamMember) => {
    const memberEmail = (member.email || '').trim();
    const memberId = member.id;
    const memberName = member.name;

    if (
      memberEmail.toLowerCase() === 'awssbgtitscience@gmail.com' ||
      memberEmail.toLowerCase() === 'mrpritamraj21@gmail.com' ||
      memberEmail.toLowerCase() === 'vijaymalsah442@gmail.com'
    ) {
      addToast('error', 'You cannot remove yourself as Super Admin!');
      return;
    }

    if (!confirm(`Are you sure you want to remove ${memberName || memberEmail} from the team?`)) {
      return;
    }

    try {
      // 1. Remove from local storage
      const currentLocal: TeamMember[] = JSON.parse(
        localStorage.getItem(LOCAL_TEAM_KEY) || '[]'
      );
      const updatedLocal = currentLocal.filter((m) => {
        const mEmail = (m.email || '').trim().toLowerCase();
        const targetEmail = memberEmail.toLowerCase();
        if (targetEmail && mEmail === targetEmail) return false;
        if (memberId && m.id === memberId) return false;
        if (memberName && m.name === memberName) return false;
        return true;
      });
      localStorage.setItem(LOCAL_TEAM_KEY, JSON.stringify(updatedLocal));
      void syncSettings(updatedLocal);

      // 2. Try server RPC function
      if (memberEmail) {
        try {
          await supabase.rpc('manage_team_member', {
            p_action: 'delete',
            p_email: memberEmail.toLowerCase(),
          });
        } catch {}
      }

      // 3. Fallback: Direct table delete from Supabase admins table by ID and Email
      try {
        if (memberId && !memberId.startsWith('team-')) {
          await supabase.from('admins').delete().eq('id', memberId);
        }
      } catch {}
      try {
        if (memberEmail) {
          await supabase.from('admins').delete().ilike('email', memberEmail);
        }
      } catch {}

      setTeam((prev) =>
        prev.filter((m) => {
          if (memberEmail && (m.email || '').toLowerCase() === memberEmail.toLowerCase()) return false;
          if (memberId && m.id === memberId) return false;
          if (memberName && m.name === memberName) return false;
          return true;
        })
      );
      addToast('success', `Removed ${memberName || memberEmail} from team.`);
    } catch {
      addToast('error', 'Failed to remove member.');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      {/* ─── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-widest uppercase bg-purple-500/20 border border-purple-500/30 text-purple-300 mb-1">
            <Shield className="w-3 h-3 text-purple-400" />
            <span>SUPER ADMIN ACCESS CONTROL</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-heading font-black text-white">
            Organizing Team &amp; Access Management
          </h1>
          <p className="text-xs font-mono text-slate-400 mt-0.5">
            Ask anyone for their login email and give them role-based access below.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#0A0A0E] border border-white/10 px-3.5 py-2 rounded-xl text-xs font-mono">
          <span className="text-slate-400">Team Size:</span>
          <span className="text-white font-bold">{team.length}</span>
        </div>
      </div>

      {/* ─── Role Info Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card bg-[#0A0A0E] border border-purple-500/30 p-4 space-y-1">
          <div className="flex items-center gap-2 text-purple-300 font-bold text-xs font-mono uppercase">
            <ShieldCheck className="w-4 h-4" />
            <span>Super Admin (You)</span>
          </div>
          <p className="text-[11px] font-mono text-slate-400 leading-relaxed">
            Full management access. Controls approvals, attendees, CSV exports, and team permissions.
          </p>
        </div>

        <div className="card bg-[#0A0A0E] border border-emerald-500/30 p-4 space-y-1">
          <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs font-mono uppercase">
            <QrCode className="w-4 h-4" />
            <span>Volunteer (Gate Check-in)</span>
          </div>
          <p className="text-[11px] font-mono text-slate-400 leading-relaxed">
            Gate scanner console only. When they log in, they only see the QR scanner to admit attendees.
          </p>
        </div>

        <div className="card bg-[#0A0A0E] border border-amber-500/20 p-4 space-y-1">
          <div className="flex items-center gap-2 text-amber-300 font-bold text-xs font-mono uppercase">
            <ClipboardCheck className="w-4 h-4" />
            <span>Reviewer</span>
          </div>
          <p className="text-[11px] font-mono text-slate-400 leading-relaxed">
            Can review candidate applications and approve/reject seats in the review queue.
          </p>
        </div>
      </div>

      {/* ─── Add Member Form (Direct Email Input) ─────────────────────────── */}
      <form
        onSubmit={handleAddMember}
        className="card bg-[#0A0A0E] border border-white/10 p-5 space-y-4"
      >
        <div className="flex items-center gap-2 text-white font-heading font-bold text-sm">
          <UserPlus className="w-4 h-4 text-reinvent-cyan" />
          <span>Add Member &amp; Assign Role</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label-text">Member Name</label>
            <input
              type="text"
              placeholder="e.g. Rahul Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="input-field text-xs font-mono w-full"
            />
          </div>

          <div>
            <label className="label-text">Login Email Address</label>
            <input
              type="email"
              placeholder="rahul@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input-field text-xs font-mono w-full"
            />
          </div>

          <div>
            <label className="label-text">Select Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as AdminRole)}
              className="input-field text-xs font-mono w-full cursor-pointer"
            >
              <option value="volunteer">Volunteer (Gate Check-in Scanner Only)</option>
              <option value="reviewer">Reviewer (Review Queue + Attendees)</option>
              <option value="super_admin">Super Admin (Full Access)</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <p className="text-[10px] font-mono text-slate-500">
            * Ask for their login email. Once added, whenever they sign in with OTP, they will automatically get this role!
          </p>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary text-xs font-mono py-2.5 px-5 inline-flex items-center justify-center gap-2 w-full sm:w-auto shrink-0 shadow-lg"
          >
            <UserPlus className="w-4 h-4" />
            <span>{submitting ? 'Adding…' : `Add as ${role.toUpperCase()}`}</span>
          </button>
        </div>
      </form>

      {/* ─── Active Team Members List ─────────────────────────────────────── */}
      <div className="card bg-[#0A0A0E] border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-reinvent-cyan" />
            <span className="font-heading font-bold text-sm text-white">
              Active Team Members ({team.length})
            </span>
          </div>
          <button
            onClick={loadTeam}
            className="text-[10px] font-mono text-slate-400 hover:text-white transition-colors"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-8 flex justify-center">
            <Spinner size="md" />
          </div>
        ) : team.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs font-mono">
            No team members added yet.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {team.map((member) => {
              const isOwner =
                member.email.toLowerCase() === 'awssbgtitscience@gmail.com' ||
                member.email.toLowerCase() === 'mrpritamraj21@gmail.com' ||
                member.email.toLowerCase() === 'vijaymalsah442@gmail.com';

              return (
                <div
                  key={member.id}
                  className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-bold text-xs sm:text-sm font-mono shrink-0 ${
                        member.role === 'super_admin'
                          ? 'bg-purple-500/20 border border-purple-500/40 text-purple-300'
                          : member.role === 'reviewer'
                          ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                          : 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                      }`}
                    >
                      {member.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white truncate">
                          {member.name}
                        </span>
                        {isOwner ? (
                          <span className="text-[9px] font-mono font-bold text-purple-300 bg-purple-950/60 border border-purple-500/40 px-2 py-0.5 rounded-full uppercase">
                            Super Admin (Owner)
                          </span>
                        ) : (
                          <span
                            className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                              member.role === 'volunteer'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {member.role.replace('_', ' ')}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-slate-400">
                        <span className="flex items-center gap-1 text-slate-300 truncate">
                          <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate">{member.email}</span>
                        </span>

                        <span className="flex items-center gap-1 text-slate-500 text-[10px]">
                          <Calendar className="w-3 h-3 shrink-0" />
                          {new Date(member.created_at).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Role Switcher */}
                  <div className="flex items-center justify-between sm:justify-end gap-2.5 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5 shrink-0">
                    {!isOwner ? (
                      <select
                        value={member.role}
                        onChange={(e) =>
                          handleRoleChange(member, e.target.value as AdminRole)
                        }
                        className="bg-black/60 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-purple-500 cursor-pointer flex-1 sm:flex-none"
                      >
                        <option value="volunteer">Volunteer (Check-in)</option>
                        <option value="reviewer">Reviewer</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    ) : (
                      <span className="text-[10px] font-mono font-bold uppercase px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300">
                        FULL OWNER
                      </span>
                    )}

                    {!isOwner && (
                      <button
                        onClick={() => handleRemove(member)}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                        title="Remove team member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
