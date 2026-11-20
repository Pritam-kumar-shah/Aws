import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from 'react';
import { OTP_POLICY, sanitizeOtpInput } from '@/lib/otp';

export interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Fired once the final digit lands, including after a paste. */
  onComplete?: (value: string) => void;
  length?: number;
  disabled?: boolean;
  /** Renders the boxes in the error colour and sets aria-invalid. */
  invalid?: boolean;
  autoFocus?: boolean;
  label?: string;
}

/**
 * Six separate boxes that behave like one field:
 *  - typing advances, backspace on an empty box steps back,
 *  - arrow keys move the caret between boxes,
 *  - pasting a whole code fills every box regardless of which one has focus,
 *  - non-digits are dropped everywhere, so "123 456" and "123-456" both work.
 *
 * The real value is a single string; the boxes are just a presentation of it.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  length = OTP_POLICY.length,
  disabled = false,
  invalid = false,
  autoFocus = false,
  label = 'Verification code',
}: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const commit = (next: string) => {
    const clean = sanitizeOtpInput(next, length);
    onChange(clean);
    if (clean.length === length) onComplete?.(clean);
    return clean;
  };

  const focusBox = (index: number) => {
    const clamped = Math.max(0, Math.min(length - 1, index));
    const el = refs.current[clamped];
    el?.focus();
    el?.select();
  };

  const handleInput = (index: number, raw: string) => {
    const typed = sanitizeOtpInput(raw, length);
    if (typed.length === 0) return;

    // More than one digit at a position means a paste or an autofilled code.
    if (typed.length > 1) {
      const filled = commit(typed);
      focusBox(filled.length >= length ? length - 1 : filled.length);
      return;
    }

    const next = (value.slice(0, index) + typed + value.slice(index + 1)).slice(0, length);
    commit(next);
    if (index < length - 1) focusBox(index + 1);
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      event.preventDefault();
      if (digits[index]) {
        commit(value.slice(0, index) + value.slice(index + 1));
      } else if (index > 0) {
        commit(value.slice(0, index - 1) + value.slice(index));
        focusBox(index - 1);
      }
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusBox(index - 1);
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusBox(index + 1);
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = sanitizeOtpInput(event.clipboardData.getData('text'), length);
    if (!pasted) return;
    const filled = commit(pasted);
    focusBox(filled.length >= length ? length - 1 : filled.length);
  };

  return (
    <div
      role="group"
      aria-label={label}
      aria-invalid={invalid || undefined}
      className="flex justify-between gap-2"
    >
      {digits.map((digit, index) => (
        <input
          // Boxes are positional, so the index is the identity here.
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          pattern="[0-9]*"
          maxLength={length}
          disabled={disabled}
          value={digit}
          aria-label={`${label}, digit ${index + 1} of ${length}`}
          onChange={(e) => handleInput(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={`w-full min-w-0 h-14 text-center rounded-lg bg-[#060608] text-white text-xl font-mono font-bold tabular-nums transition-all outline-none border
            ${
              invalid
                ? 'border-red-500/70 focus:border-red-400 focus:ring-1 focus:ring-red-400/50'
                : 'border-white/10 focus:border-reinvent-magenta focus:ring-1 focus:ring-reinvent-magenta/60'
            }
            disabled:opacity-40 disabled:cursor-not-allowed`}
        />
      ))}
    </div>
  );
}
