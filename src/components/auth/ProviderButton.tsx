import type { ReactNode } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { GoogleIcon, GitHubIcon } from '@/components/common/BrandIcons';
import { AwsLogo, AwsSmile } from '@/components/common/AwsLogo';
import { PROVIDERS, type ProviderId } from '@/lib/authProviders';

function ProviderMark({ id }: { id: ProviderId }): ReactNode {
  switch (id) {
    case 'google':
      return <GoogleIcon className="h-5 w-5 shrink-0" />;
    case 'github':
      return <GitHubIcon className="h-5 w-5 shrink-0" />;
    case 'aws':
      return <AwsLogo className="h-5 w-auto shrink-0" title={null} />;
    case 'aws_builder':
      return (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-aws-squid">
          <AwsSmile className="h-2 w-3.5" />
        </span>
      );
  }
}

export interface ProviderButtonProps {
  id: ProviderId;
  onSelect: (id: ProviderId) => void;
  /** Spinner + locked out while this provider's redirect is being set up. */
  busy?: boolean;
  /** Locked out because another provider is mid-flight. */
  disabled?: boolean;
  /** Dims the row and appends a "set up soon" note. */
  unavailable?: boolean;
}

export function ProviderButton({
  id,
  onSelect,
  busy = false,
  disabled = false,
  unavailable = false,
}: ProviderButtonProps) {
  const provider = PROVIDERS[id];

  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      disabled={busy || disabled}
      aria-label={provider.accessibleName}
      aria-busy={busy || undefined}
      className={`group w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all
        bg-white/[0.03] border-white/10
        hover:bg-white/[0.07] hover:border-white/25
        focus:outline-none focus-visible:ring-2 focus-visible:ring-reinvent-magenta/70
        disabled:cursor-not-allowed disabled:opacity-50
        ${unavailable ? 'opacity-65' : ''}`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-black/60 ring-1 ring-white/10">
        {busy ? <Spinner size="sm" label={`Connecting to ${provider.label}`} /> : <ProviderMark id={id} />}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-heading font-semibold text-white">
          {provider.label}
        </span>
        <span className="block truncate text-[11px] font-mono text-slate-500">
          {unavailable ? 'Not enabled yet — use the email code below' : provider.caption}
        </span>
      </span>

      <svg
        className="h-4 w-4 shrink-0 text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-300"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M9 18l6-6-6-6" />
      </svg>
    </button>
  );
}
