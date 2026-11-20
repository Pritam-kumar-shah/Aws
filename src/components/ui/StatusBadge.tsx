import type { RegistrationStatus } from '@/types/database';

const statusConfig: Record<RegistrationStatus, { label: string; className: string }> = {
  pending: { label: 'Pending Review', className: 'bg-status-pending/15 text-status-pending border-status-pending/30' },
  approved: { label: 'Approved', className: 'bg-status-approved/15 text-status-approved border-status-approved/30' },
  rejected: { label: 'Rejected', className: 'bg-status-rejected/15 text-status-rejected border-status-rejected/30' },
  waitlisted: { label: 'Waitlisted', className: 'bg-status-waitlisted/15 text-status-waitlisted border-status-waitlisted/30' },
  cancelled: { label: 'Cancelled', className: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
};

export function StatusBadge({ status }: { status: RegistrationStatus }) {
  const config = statusConfig[status] || statusConfig.pending;
  return (
    <span className={`status-badge border ${config.className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {config.label}
    </span>
  );
}
