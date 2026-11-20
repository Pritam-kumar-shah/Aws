import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { EVENT_CONFIG } from '@/config/event';

export function SeatsProgress() {
  const [approvedCount, setApprovedCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCount() {
      try {
        const { count, error } = await supabase
          .from('registrations')
          .select('*', { count: 'exact', head: true })
          .in('status', ['approved', 'checked_in']);

        if (!error && typeof count === 'number') {
          setApprovedCount(count);
        }
      } catch (err) {
        console.warn('Seats count error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchCount();
  }, []);

  const capacity = EVENT_CONFIG.capacity;
  const pct = Math.min(Math.round((approvedCount / capacity) * 100), 100);

  return (
    <div className="w-full bg-white/[0.02] border border-white/15 rounded-xl p-3.5 sm:p-4">
      {/* Header telemetry */}
      <div className="flex items-center justify-between text-xs font-mono mb-2">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-[#C2B6BA]/80 uppercase tracking-wider text-[10px] font-semibold">
            CAPACITY ALLOCATION
          </span>
        </div>
        <div className="text-[#C24A70] font-semibold font-mono text-[11px]">
          {loading ? 'CALCULATING...' : `${approvedCount} / ${capacity} SEATS (${pct}%)`}
        </div>
      </div>

      {/* Progress Track */}
      <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden border border-white/10 p-0.5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#005C7D] via-[#4C158B] to-[#C24A70] transition-all duration-700 ease-out"
          style={{ width: `${Math.max(pct, 5)}%` }}
        />
      </div>

      {/* Footer telemetry */}
      <div className="flex justify-between items-center text-[9px] sm:text-[10px] font-mono text-[#C2B6BA]/60 mt-2">
        <span>CURATED ADMISSION · 100% FREE</span>
        <span className="text-emerald-400 font-semibold">{capacity - approvedCount} SEATS REMAINING</span>
      </div>
    </div>
  );
}
