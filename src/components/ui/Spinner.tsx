const SIZES = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-[3px]',
  lg: 'w-12 h-12 border-4',
} as const;

export type SpinnerSize = keyof typeof SIZES;

export function Spinner({
  size = 'md',
  className = '',
  label = 'Loading',
}: {
  size?: SpinnerSize;
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={`${SIZES[size]} border-white/20 border-t-aws-orange rounded-full animate-spin ${className}`}
      role="status"
      aria-label={label}
    />
  );
}
