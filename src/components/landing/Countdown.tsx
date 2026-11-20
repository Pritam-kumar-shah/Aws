import { useState, useEffect } from 'react';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calcTimeLeft(target: string): TimeLeft {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export function Countdown({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calcTimeLeft(targetDate));

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(calcTimeLeft(targetDate)), 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  const units = [
    { label: 'DAYS', val: timeLeft.days },
    { label: 'HOURS', val: timeLeft.hours },
    { label: 'MINS', val: timeLeft.minutes },
    { label: 'SECS', val: timeLeft.seconds },
  ];

  return (
    <div className="flex flex-col items-start sm:items-center">
      <div className="text-[10px] font-mono tracking-widest text-[#C2B6BA]/70 uppercase mb-2 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#C24A70] animate-ping" />
        <span>COUNTDOWN TO RE:INVENT BHOPAL</span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 bg-white/[0.02] border border-white/15 px-3 py-2.5 sm:px-5 sm:py-3 rounded-xl">
        {units.map((unit, idx) => (
          <div key={unit.label} className="flex items-center gap-2 sm:gap-3">
            <div className="text-center min-w-[42px] sm:min-w-[56px]">
              <div className="font-mono text-xl sm:text-3xl font-light text-[#F5F0EE] tabular-nums tracking-wider">
                {String(unit.val).padStart(2, '0')}
              </div>
              <div className="text-[8px] sm:text-[9px] font-mono tracking-widest text-[#C2B6BA]/60 mt-0.5 uppercase">
                {unit.label}
              </div>
            </div>
            {idx < units.length - 1 && (
              <span className="font-mono text-base sm:text-xl text-[#C24A70] font-light mb-2">:</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
