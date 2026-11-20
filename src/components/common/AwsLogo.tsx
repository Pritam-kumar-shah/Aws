/**
 * AWS brand marks.
 *
 * The geometry below is the real "aws" wordmark + smile arrow, drawn on a
 * 24x24 grid. The previous version of this file contained hand-written path
 * data that did not render as the AWS logo at all.
 *
 * Brand rules we follow here:
 *  - The smile arrow is AWS Smile Orange (#FF9900) by default.
 *  - On dark surfaces the wordmark is pure white; on light surfaces it is
 *    AWS Squid Ink (#232F3E).
 *  - Aspect ratio is never distorted (we only ever set a height).
 */

/** Official AWS palette. */
export const AWS_BRAND = {
  smileOrange: '#FF9900',
  squidInk: '#232F3E',
  white: '#FFFFFF',
} as const;

/** "aws" lettermark. */
const AWS_WORDMARK_PATH =
  'M6.763 10.036c0 .296.032.535.088.71.064.176.144.368.248.576.04.063.056.127.056.183 0 .08-.048.16-.152.24l-.503.335a.383.383 0 0 1-.208.072c-.08 0-.16-.04-.239-.112a2.47 2.47 0 0 1-.287-.375 6.18 6.18 0 0 1-.248-.471c-.622.734-1.405 1.101-2.347 1.101-.671 0-1.205-.191-1.596-.574-.391-.383-.59-.894-.59-1.533 0-.678.239-1.23.726-1.644.487-.415 1.133-.623 1.955-.623.272 0 .551.024.846.064.296.04.6.104.918.176v-.583c0-.607-.127-1.03-.375-1.277-.255-.248-.686-.367-1.3-.367-.28 0-.568.031-.863.103-.295.072-.583.16-.862.272a2.287 2.287 0 0 1-.28.104.488.488 0 0 1-.127.023c-.112 0-.168-.08-.168-.247v-.391c0-.128.016-.224.056-.28a.597.597 0 0 1 .224-.167c.279-.144.614-.264 1.005-.36a4.84 4.84 0 0 1 1.246-.151c.95 0 1.644.216 2.091.647.439.43.662 1.085.662 1.963v2.586zm-3.24 1.214c.263 0 .534-.048.822-.144.287-.096.543-.271.758-.51.128-.152.224-.32.272-.512.047-.191.08-.423.08-.694v-.335a6.66 6.66 0 0 0-.735-.136 6.02 6.02 0 0 0-.75-.048c-.535 0-.926.104-1.19.32-.263.215-.39.518-.39.917 0 .375.095.655.295.846.191.2.47.296.838.296zm6.41.862c-.144 0-.24-.024-.304-.08-.064-.048-.12-.16-.168-.311L7.586 5.55a1.398 1.398 0 0 1-.072-.32c0-.128.064-.2.191-.2h.783c.151 0 .255.025.31.08.065.048.113.16.16.312l1.342 5.284 1.245-5.284c.04-.16.088-.264.151-.312a.549.549 0 0 1 .32-.08h.638c.152 0 .256.025.32.08.063.048.12.16.151.312l1.261 5.348 1.381-5.348c.048-.16.104-.264.16-.312a.52.52 0 0 1 .311-.08h.743c.127 0 .2.065.2.2 0 .04-.009.08-.017.128a1.137 1.137 0 0 1-.056.2l-1.923 6.17c-.048.16-.104.263-.168.311a.51.51 0 0 1-.303.08h-.687c-.151 0-.255-.024-.32-.08-.063-.056-.119-.16-.15-.32l-1.238-5.148-1.23 5.14c-.04.16-.087.264-.15.32-.065.056-.177.08-.32.08zm10.256.215c-.415 0-.83-.048-1.229-.143-.399-.096-.71-.2-.918-.32-.128-.071-.215-.151-.247-.223a.563.563 0 0 1-.048-.224v-.407c0-.167.064-.247.183-.247.048 0 .096.008.144.024.048.016.12.048.2.08.271.12.566.215.878.279.319.064.63.096.95.096.502 0 .894-.088 1.165-.264a.86.86 0 0 0 .415-.758.777.777 0 0 0-.215-.559c-.144-.151-.416-.287-.807-.415l-1.157-.36c-.583-.183-1.014-.454-1.277-.813a1.902 1.902 0 0 1-.4-1.158c0-.335.073-.63.216-.886.144-.255.335-.479.575-.654.24-.184.51-.32.83-.415.32-.096.655-.136 1.006-.136.175 0 .359.008.535.032.183.024.35.056.518.088.16.04.312.08.455.127.144.048.256.096.336.144a.69.69 0 0 1 .24.2.43.43 0 0 1 .071.263v.375c0 .168-.064.256-.184.256a.83.83 0 0 1-.303-.096 3.652 3.652 0 0 0-1.532-.311c-.455 0-.815.071-1.062.223-.248.152-.375.383-.375.71 0 .224.08.416.24.567.159.152.454.304.877.44l1.134.358c.574.184.99.44 1.237.767.247.327.367.702.367 1.117 0 .343-.072.655-.207.926a2.157 2.157 0 0 1-.583.703c-.25.2-.55.343-.894.447-.36.111-.734.167-1.142.167z';

/** Smile arrow — long sweep. */
const AWS_SMILE_SWEEP_PATH =
  'M21.698 16.207c-2.626 1.94-6.442 2.969-9.722 2.969-4.598 0-8.74-1.7-11.87-4.526-.247-.223-.024-.527.272-.351 3.384 1.963 7.559 3.153 11.877 3.153 2.914 0 6.114-.607 9.06-1.852.439-.2.814.287.383.607z';

/** Smile arrow — arrowhead. */
const AWS_SMILE_TIP_PATH =
  'M22.792 14.961c-.336-.43-2.22-.207-3.074-.103-.255.032-.295-.192-.063-.36 1.5-1.053 3.967-.75 4.254-.398.287.36-.08 2.826-1.485 4.007-.215.184-.423.088-.327-.151.32-.79 1.03-2.57.695-2.995z';

export interface AwsLogoProps {
  /** Tailwind classes. Set a height only — width stays `auto` to keep ratio. */
  className?: string;
  /**
   * `dark` = for dark backgrounds (white wordmark, orange smile).
   * `light` = for light backgrounds (squid-ink wordmark, orange smile).
   * `mono` = single colour throughout, inherits `currentColor`.
   */
  variant?: 'dark' | 'light' | 'mono';
  /** Accessible name. Pass `null` to mark the logo decorative. */
  title?: string | null;
}

/** Full AWS logo: "aws" wordmark above the smile arrow. */
export function AwsLogo({
  className = 'h-6 w-auto',
  variant = 'dark',
  title = 'Amazon Web Services',
}: AwsLogoProps) {
  const wordmarkFill =
    variant === 'mono'
      ? 'currentColor'
      : variant === 'light'
        ? AWS_BRAND.squidInk
        : AWS_BRAND.white;
  const smileFill = variant === 'mono' ? 'currentColor' : AWS_BRAND.smileOrange;

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? 'img' : 'presentation'}
      aria-label={title ?? undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <path fill={wordmarkFill} d={AWS_WORDMARK_PATH} />
      <path fill={smileFill} d={AWS_SMILE_SWEEP_PATH} />
      <path fill={smileFill} d={AWS_SMILE_TIP_PATH} />
    </svg>
  );
}

/**
 * Smile arrow on its own — used where the "aws" letters would be redundant
 * because adjacent text already says AWS (e.g. the Builder Center button).
 */
export function AwsSmile({
  className = 'h-4 w-auto',
  color = AWS_BRAND.smileOrange,
  title = null,
}: {
  className?: string;
  color?: string;
  title?: string | null;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 7"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? 'img' : 'presentation'}
      aria-label={title ?? undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {/* Shift the 24x24 smile geometry up so it fills this short viewBox. */}
      <g transform="translate(0,-13.4)">
        <path fill={color} d={AWS_SMILE_SWEEP_PATH} />
        <path fill={color} d={AWS_SMILE_TIP_PATH} />
      </g>
    </svg>
  );
}

/**
 * Header lockup: AWS logo + "re:Invent 2026" + optional subtitle.
 */
export function AwsReinventLogo({
  subtitle = 'WATCH & BUILD · BHOPAL',
  className = '',
}: {
  subtitle?: string | null;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <AwsLogo className="h-7 sm:h-8 w-auto shrink-0" title="Amazon Web Services" />

      <div className="h-6 w-px bg-white/20" aria-hidden="true" />

      <div className="flex flex-col justify-center">
        <div className="flex items-baseline font-heading tracking-tight leading-none">
          <span className="text-white font-bold text-base sm:text-lg tracking-tight">
            re<span className="text-reinvent-magenta">:</span>Invent
          </span>
          <span className="ml-1.5 text-[9px] font-mono font-semibold text-white/90 tracking-widest uppercase border border-white/20 px-1 py-0.2 rounded bg-white/10">
            2026
          </span>
        </div>
        {subtitle ? (
          <span className="text-[9px] sm:text-[10px] font-mono tracking-[0.18em] sm:tracking-[0.22em] text-reinvent-cyan uppercase mt-1">
            {subtitle}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/**
 * re:Invent gradient pill.
 * Gradient: #005C7D → #083D8D → #4C158B → #8A188B → #BD009E
 */
export function ReinventPill({
  text = 'For those who build and implement',
  className = '',
}: {
  text?: string;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex items-center px-6 py-2 rounded-full bg-reinvent-pill text-white text-xs sm:text-sm font-semibold shadow-lg shadow-reinvent-magenta/20 border border-white/20 tracking-wide select-none ${className}`}
    >
      {text}
    </div>
  );
}
