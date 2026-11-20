import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { EVENT_CONFIG } from '@/config/event';
import { Spinner } from '@/components/ui/Spinner';
import { Html5Qrcode } from 'html5-qrcode';
import {
  QrCode,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Camera,
  CameraOff,
  UserCheck,
  Clock,
  ShieldAlert,
  Building2,
  Mail,
  Sparkles,
  LogOut,
  UserMinus,
  X,
  Layers,
  List,
} from 'lucide-react';

/* ─── Types ───────────────────────────────────────────────────────────────── */

interface CheckinResult {
  status: 'success' | 'duplicate' | 'not_approved' | 'not_found' | 'error';
  message: string;
  attendee?: {
    name: string;
    email: string;
    org: string;
    ticket_code?: string;
    checked_in_at?: string;
  };
}

interface CheckedInEntry {
  id: string;
  registration_id?: string;
  name: string;
  email: string;
  org: string;
  ticket_code?: string;
  checked_in_at: string;
  is_duplicate?: boolean;
}

const OFFLINE_CHECKINS_KEY = 'reinvent_gate_offline_checkins';

/* ─── Component ───────────────────────────────────────────────────────────── */

export default function CheckinScanner() {
  const { user, isSuperAdmin } = useAuth();
  const { addToast } = useToast();

  // Tabs - Default to 'search' so page loads immediately with zero hardware conflicts
  const [activeTab, setActiveTab] = useState<'camera' | 'search'>('search');
  const [cameraActive, setCameraActive] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Scan visual effect: 'idle' | 'green_flash' | 'red_flash'
  const [scanGlow, setScanGlow] = useState<'idle' | 'green_flash' | 'red_flash'>('idle');

  // Scan result flash (auto-dismiss after 4s)
  const [flashResult, setFlashResult] = useState<CheckinResult | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const glowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [processingCheckin, setProcessingCheckin] = useState(false);

  // Live dashboard data
  const [checkedInList, setCheckedInList] = useState<CheckedInEntry[]>([]);
  const [checkedInCount, setCheckedInCount] = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);
  const [streamView, setStreamView] = useState<'stack' | 'table'>('stack');

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isScannerRunningRef = useRef<boolean>(false);
  const scannerContainerId = 'reader-qr-volunteer';

  // Prevent duplicate rapid scans
  const lastScannedRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);

  /* ─── Audio Feedback ────────────────────────────────────────────────────── */

  const playBeep = (type: 'success' | 'duplicate' | 'error') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.35);
      } else if (type === 'duplicate') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.setValueAtTime(220, audioCtx.currentTime + 0.12);
        osc.frequency.setValueAtTime(440, audioCtx.currentTime + 0.24);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.5);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.3);
      }
    } catch {
      // Audio not permitted
    }
  };

  /* ─── Trigger Visual Glow (Green / Red) ──────────────────────────────────── */

  const triggerVisualGlow = (type: 'green' | 'red') => {
    if (glowTimerRef.current) clearTimeout(glowTimerRef.current);
    setScanGlow(type === 'green' ? 'green_flash' : 'red_flash');

    glowTimerRef.current = setTimeout(() => {
      setScanGlow('idle');
    }, 2800);
  };

  /* ─── Flash Result Banner (Auto-dismiss after 4.5s) ───────────────────────── */

  const showFlash = useCallback((result: CheckinResult) => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setFlashResult(result);

    if (result.status === 'success') {
      triggerVisualGlow('green');
    } else {
      triggerVisualGlow('red');
    }

    flashTimerRef.current = setTimeout(() => {
      setFlashResult(null);
    }, 4500);
  }, []);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      if (glowTimerRef.current) clearTimeout(glowTimerRef.current);
    };
  }, []);

  /* ─── Fetch checked-in list ─────────────────────────────────────────────── */

  const fetchCheckedInList = useCallback(async () => {
    try {
      const { count } = await supabase
        .from('checkins')
        .select('*', { count: 'exact', head: true });

      const { data } = await supabase
        .from('checkins')
        .select(`
          id,
          registration_id,
          checked_in_at,
          registrations (
            id,
            name,
            email,
            org,
            ticket_code
          )
        `)
        .order('checked_in_at', { ascending: false })
        .limit(100);

      let serverItems: CheckedInEntry[] = [];
      if (data) {
        serverItems = data.map((item: any) => ({
          id: item.id,
          registration_id: item.registration_id || item.registrations?.id,
          name: item.registrations?.name || 'Unknown',
          email: item.registrations?.email || '',
          org: item.registrations?.org || '',
          ticket_code: item.registrations?.ticket_code,
          checked_in_at: item.checked_in_at,
        }));
      }

      // Merge local buffered checkins if any
      const rawLocal = localStorage.getItem(OFFLINE_CHECKINS_KEY);
      let localItems: CheckedInEntry[] = [];
      if (rawLocal) {
        try {
          localItems = JSON.parse(rawLocal);
        } catch {
          localItems = [];
        }
      }

      const combined = [...localItems, ...serverItems];
      // Deduplicate by attendee email
      const seen = new Set();
      const unique = combined.filter((el) => {
        const duplicate = seen.has(el.email);
        seen.add(el.email);
        return !duplicate;
      });

      // Strictly sort descending so newest check-in is ALWAYS at the top (LIFO stack)
      unique.sort(
        (a, b) =>
          new Date(b.checked_in_at).getTime() - new Date(a.checked_in_at).getTime()
      );

      setCheckedInList(unique);
      setCheckedInCount(Math.max(count || 0, unique.length));
    } catch (e) {
      console.warn('Checkin list fetch notice:', e);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCheckedInList();
    const interval = setInterval(fetchCheckedInList, 8000);
    return () => clearInterval(interval);
  }, [fetchCheckedInList]);

  /* ─── Core Check-in Processor ───────────────────────────────────────────── */

  const processCheckin = async (
    target: { id?: string; ticketCode?: string },
    method: 'qr_scan' | 'manual_search'
  ) => {
    if (processingCheckin) return;
    setProcessingCheckin(true);

    try {
      const cleanCode = target.ticketCode?.trim();
      const cleanId = target.id?.trim();

      if (!cleanCode && !cleanId) {
        playBeep('error');
        showFlash({
          status: 'not_found',
          message: 'Invalid QR code scanned.',
        });
        return;
      }

      // 1. Find attendee in registrations
      //    Try multiple query strategies to defeat RLS blocks
      let attendee: any = null;
      let findError: any = null;

      // Strategy A: Direct Supabase query (works when RLS allows)
      try {
        let query = supabase
          .from('registrations')
          .select('id, name, email, org, status, ticket_code');

        if (cleanId && cleanCode) {
          query = query.or(`id.eq.${cleanId},ticket_code.ilike.${cleanCode}`);
        } else if (cleanId) {
          query = query.eq('id', cleanId);
        } else if (cleanCode) {
          query = query.ilike('ticket_code', cleanCode);
        }

        const result = await query.maybeSingle();
        attendee = result.data;
        findError = result.error;
      } catch (e) {
        console.warn('Strategy A (direct query) failed:', e);
        findError = e;
      }

      // Strategy B: If RLS blocked (0 rows / error), use RPC function
      if (!attendee && cleanCode) {
        try {
          const { data: rpcData, error: rpcError } = await supabase
            .rpc('lookup_registration_by_ticket', { p_ticket_code: cleanCode });
          if (!rpcError && rpcData && (Array.isArray(rpcData) ? rpcData.length > 0 : rpcData)) {
            attendee = Array.isArray(rpcData) ? rpcData[0] : rpcData;
            findError = null;
          }
        } catch (rpcErr) {
          console.warn('Strategy B (RPC) not available:', rpcErr);
        }
      }

      // Strategy C: If still no result, try querying by id only
      if (!attendee && cleanId) {
        try {
          const { data: byId, error: byIdErr } = await supabase
            .rpc('lookup_registration_by_id', { p_reg_id: cleanId });
          if (!byIdErr && byId && (Array.isArray(byId) ? byId.length > 0 : byId)) {
            attendee = Array.isArray(byId) ? byId[0] : byId;
            findError = null;
          }
        } catch {
          console.warn('Strategy C (RPC by ID) not available');
        }
      }

      // Strategy D: Check local registration cache (offline mode)
      if (!attendee) {
        try {
          const localRegsRaw = localStorage.getItem('reinvent_registrations_cache');
          if (localRegsRaw) {
            const localRegs: any[] = JSON.parse(localRegsRaw);
            attendee = localRegs.find(
              (r) =>
                (cleanCode && r.ticket_code?.toLowerCase() === cleanCode.toLowerCase()) ||
                (cleanId && r.id === cleanId)
            );
            if (attendee) {
              findError = null;
              console.log('Found attendee in local cache:', attendee.name);
            }
          }
        } catch {
          console.warn('Local cache lookup failed');
        }
      }

      if (!attendee) {
        playBeep('error');
        triggerVisualGlow('red');
        const scannedVal = cleanCode || cleanId || 'unknown';
        showFlash({
          status: 'not_found',
          message: `No registration found. Scanned: "${scannedVal}". This may be a database permission issue — run the SQL fix in Supabase.`,
        });
        return;
      }

      // 2. Must be approved (or auto-approve for testing if requested)
      if (attendee.status !== 'approved') {
        playBeep('error');
        triggerVisualGlow('red');
        showFlash({
          status: 'not_approved',
          message: `Status: ${attendee.status?.toUpperCase()}. Only APPROVED attendees can check in at gate!`,
          attendee: { name: attendee.name, email: attendee.email, org: attendee.org },
        });
        return;
      }

      // 3. Duplicate check in database
      const { data: existing } = await supabase
        .from('checkins')
        .select('checked_in_at')
        .eq('registration_id', attendee.id)
        .maybeSingle();

      // Also check local buffer
      const localBuffer: CheckedInEntry[] = JSON.parse(
        localStorage.getItem(OFFLINE_CHECKINS_KEY) || '[]'
      );
      const localExisting = localBuffer.find((b) => b.email === attendee.email);

      if (existing || localExisting) {
        playBeep('duplicate');
        triggerVisualGlow('red');
        const dupTime = new Date(
          existing?.checked_in_at || localExisting?.checked_in_at || new Date()
        ).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });

        showFlash({
          status: 'duplicate',
          message: `ALREADY ADMITTED at ${dupTime}! Duplicate entry prohibited.`,
          attendee: {
            name: attendee.name,
            email: attendee.email,
            org: attendee.org,
            ticket_code: attendee.ticket_code,
            checked_in_at: existing?.checked_in_at || localExisting?.checked_in_at,
          },
        });
        return;
      }

      // 4. Record check-in to Supabase
      let recordedOnServer = false;
      try {
        const { error: insertError } = await supabase.from('checkins').insert({
          registration_id: attendee.id,
          checked_in_by: user?.id,
          method: method,
        });

        if (!insertError) {
          recordedOnServer = true;
        } else {
          console.warn('Server insert returned error, saving to buffer:', insertError);
        }
      } catch (insertErr) {
        console.warn('Network / RLS exception on checkin:', insertErr);
      }

      // If server insert had RLS error, buffer locally so gate NEVER stops!
      const newEntry: CheckedInEntry = {
        id: `gate-${Date.now()}`,
        registration_id: attendee.id,
        name: attendee.name,
        email: attendee.email,
        org: attendee.org,
        ticket_code: attendee.ticket_code,
        checked_in_at: new Date().toISOString(),
      };

      if (!recordedOnServer) {
        localBuffer.unshift(newEntry);
        localStorage.setItem(OFFLINE_CHECKINS_KEY, JSON.stringify(localBuffer.slice(0, 300)));
      }

      // 5. SUCCESS! Flash and chime
      playBeep('success');
      triggerVisualGlow('green');
      showFlash({
        status: 'success',
        message: `Seat pass verified! Welcome to re:Invent Bhopal.`,
        attendee: {
          name: attendee.name,
          email: attendee.email,
          org: attendee.org,
          ticket_code: attendee.ticket_code,
        },
      });

      addToast('success', `Admitted: ${attendee.name}`);

      // Push to VERY TOP of the stack (index 0)
      setCheckedInList((prev) => [
        newEntry,
        ...prev.filter((el) => el.email !== attendee.email && el.id !== newEntry.id),
      ]);
      setCheckedInCount((c) => c + 1);
    } catch (err: any) {
      console.error('Checkin processor error:', err);
      playBeep('error');
      showFlash({
        status: 'error',
        message: err?.message || 'Checkin error. Please try again.',
      });
    } finally {
      setProcessingCheckin(false);
    }
  };

  /* ─── Check Out (Super Admin Exclusive Action) ──────────────────────────── */

  const handleCheckOut = async (entry: CheckedInEntry) => {
    if (!isSuperAdmin) {
      addToast('error', 'Only Super Admin has permission to check out attendees!');
      return;
    }

    if (
      !confirm(
        `Are you sure you want to Check Out ${entry.name}? They will be removed from the admitted list and can be checked in again later.`
      )
    ) {
      return;
    }

    try {
      // 1. Delete from Supabase
      if (entry.registration_id) {
        await supabase
          .from('checkins')
          .delete()
          .eq('registration_id', entry.registration_id);
      } else if (entry.id && !entry.id.startsWith('gate-')) {
        await supabase.from('checkins').delete().eq('id', entry.id);
      }

      // 2. Remove from local storage buffer
      const rawLocal = localStorage.getItem(OFFLINE_CHECKINS_KEY);
      if (rawLocal) {
        try {
          const list: CheckedInEntry[] = JSON.parse(rawLocal);
          const updated = list.filter((el) => el.email !== entry.email);
          localStorage.setItem(OFFLINE_CHECKINS_KEY, JSON.stringify(updated));
        } catch {}
      }

      // 3. Update local state
      setCheckedInList((prev) => prev.filter((el) => el.email !== entry.email));
      setCheckedInCount((c) => Math.max(0, c - 1));
      addToast('info', `Checked out ${entry.name}. Ticket can be scanned again.`);
    } catch (err: any) {
      console.error('Checkout error:', err);
      addToast('error', 'Failed to check out attendee.');
    }
  };

  /* ─── Cache registrations locally for offline QR scan fallback ──────────── */

  const cacheRegistrations = (regs: any[]) => {
    try {
      const existing: any[] = JSON.parse(localStorage.getItem('reinvent_registrations_cache') || '[]');
      const merged = [...existing];
      for (const r of regs) {
        if (!merged.some((m) => m.id === r.id)) {
          merged.push(r);
        }
      }
      localStorage.setItem('reinvent_registrations_cache', JSON.stringify(merged.slice(-500)));
    } catch {}
  };

  /* ─── Pre-fetch ALL approved registrations for reliable scanning ─────── */

  useEffect(() => {
    const prefetchRegistrations = async () => {
      try {
        const { data } = await supabase
          .from('registrations')
          .select('id, name, email, org, status, ticket_code')
          .eq('status', 'approved')
          .limit(500);
        if (data && data.length > 0) {
          cacheRegistrations(data);
          console.log(`Pre-cached ${data.length} approved registrations for gate scanning`);
        }
      } catch (e) {
        console.warn('Pre-fetch registrations failed (RLS?):', e);
      }
    };
    prefetchRegistrations();
  }, []);

  /* ─── Search Handler ────────────────────────────────────────────────────── */

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('registrations')
        .select('id, name, email, org, status, ticket_code')
        .or(`ticket_code.ilike.%${q}%,name.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(8);

      if (error) throw error;
      setSearchResults(data || []);

      // Cache found results for offline fallback
      if (data && data.length > 0) {
        cacheRegistrations(data);
      }

      if (!data || data.length === 0) {
        addToast('info', 'No attendee found. If RLS is blocking, run the SQL fix in Supabase.');
      }
    } catch (err) {
      console.error('Search error:', err);
      addToast('error', 'Search failed. Database permission issue possible.');
    } finally {
      setSearching(false);
    }
  };

  /* ─── Camera QR Scanner Lifecycle (Crash-Proof) ────────────────────────── */

  useEffect(() => {
    let isMounted = true;
    let localScanner: Html5Qrcode | null = null;

    if (activeTab === 'camera') {
      const initScanner = async () => {
        // Wait a tick for the DOM element to mount
        await new Promise((r) => setTimeout(r, 100));
        if (!isMounted) return;

        const container = document.getElementById(scannerContainerId);
        if (!container) return;

        try {
          const isLocal =
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1';

          if (!window.isSecureContext && !isLocal) {
            setCameraActive(false);
            setScannerError(
              'Mobile browser blocked camera on insecure HTTP. Please use "Manual Search" tab or HTTPS.'
            );
            return;
          }

          localScanner = new Html5Qrcode(scannerContainerId);
          html5QrCodeRef.current = localScanner;

          let cameraConfig: any = { facingMode: 'environment' };
          try {
            const devices = await Html5Qrcode.getCameras();
            if (devices && devices.length > 0) {
              const backCam =
                devices.find(
                  (d) =>
                    d.label.toLowerCase().includes('back') ||
                    d.label.toLowerCase().includes('rear') ||
                    d.label.toLowerCase().includes('environment')
                ) || devices[devices.length - 1];

              if (backCam?.id) {
                cameraConfig = backCam.id;
              }
            }
          } catch {
            // fallback
          }

          if (!isMounted) {
            try { localScanner.clear(); } catch {}
            return;
          }

          await localScanner.start(
            cameraConfig,
            { fps: 12, qrbox: { width: 260, height: 260 } },
            (decodedText) => {
              const now = Date.now();
              const code = decodedText.trim();
              if (code === lastScannedRef.current && now - lastScannedTimeRef.current < 4500) {
                return;
              }
              lastScannedRef.current = code;
              lastScannedTimeRef.current = now;

              // Smart QR Parser: handles JSON payloads, ticket= URLs, or plain codes
              let targetPayload: { id?: string; ticketCode?: string } = {};

              if (code.startsWith('{')) {
                try {
                  const parsed = JSON.parse(code);
                  const extractedCode =
                    parsed.ticket ||
                    parsed.ticketCode ||
                    parsed.ticket_code ||
                    parsed.code;
                  const extractedId =
                    parsed.reg ||
                    parsed.registrationId ||
                    parsed.registration_id ||
                    parsed.id;

                  if (extractedCode) targetPayload.ticketCode = String(extractedCode).trim();
                  if (extractedId) targetPayload.id = String(extractedId).trim();
                } catch {
                  targetPayload.ticketCode = code;
                }
              } else if (code.includes('ticket=')) {
                try {
                  const url = new URL(code);
                  const t = url.searchParams.get('ticket');
                  if (t) targetPayload.ticketCode = t.trim();
                } catch {
                  targetPayload.ticketCode = code;
                }
              }

              if (!targetPayload.ticketCode && !targetPayload.id) {
                targetPayload.ticketCode = code.trim();
              }

              processCheckin(targetPayload, 'qr_scan');
            },
            () => {}
          );

          if (!isMounted) {
            try {
              await localScanner.stop();
              localScanner.clear();
            } catch {}
            return;
          }

          isScannerRunningRef.current = true;
          setCameraActive(true);
          setScannerError(null);
        } catch (err: any) {
          console.warn('Scanner camera init error:', err);
          if (isMounted) {
            setCameraActive(false);
            const msg = err?.message || String(err);
            setScannerError(
              msg.includes('Permission')
                ? 'Camera permission denied. Allow camera in browser settings.'
                : 'Camera not available on this device.'
            );
          }
        }
      };

      initScanner();
    }

    return () => {
      isMounted = false;
      const scanner = html5QrCodeRef.current;
      if (scanner && isScannerRunningRef.current) {
        isScannerRunningRef.current = false;
        try {
          scanner
            .stop()
            .then(() => {
              try { scanner.clear(); } catch {}
            })
            .catch(() => {});
        } catch {}
      } else if (scanner) {
        try { scanner.clear(); } catch {}
      }
    };
  }, [activeTab]);

  /* ─── RENDER ────────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-5 max-w-5xl mx-auto animate-fade-in">
      {/* ─── Top Telemetry Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 sm:pb-4 border-b border-white/10">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-widest uppercase bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>GATE ON-SITE OPERATIONS</span>
          </div>
          <h1 className="text-lg sm:text-2xl font-heading font-black text-white">
            Volunteer Check-in Console
          </h1>
          <p className="text-[11px] sm:text-xs font-mono text-slate-400 mt-0.5">
            Event Venue Entry Gate · Scan QR or search ticket code
          </p>
        </div>

        {/* Live Gate Counter */}
        <div className="flex items-center gap-2.5 sm:gap-3 bg-[#0A0A0E] border border-white/10 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl self-start sm:self-auto">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <UserCheck className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <span className="text-[9px] sm:text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
              Checked In
            </span>
            <span className="text-xl sm:text-2xl font-heading font-black text-white font-mono leading-tight">
              {checkedInCount}
              <span className="text-xs text-slate-500 font-normal ml-1">
                / {EVENT_CONFIG.capacity}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* ─── Toast-Style Slide-In Flash Banner ───────────────────────────── */}
      {flashResult && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4 animate-fade-in">
          <div
            role="alert"
            className={`relative rounded-2xl border-2 p-4 flex items-start gap-4 shadow-xl ${
              flashResult.status === 'success'
                ? 'bg-emerald-950 border-emerald-500 text-white'
                : flashResult.status === 'duplicate'
                ? 'bg-red-950 border-red-500 text-white'
                : 'bg-zinc-900 border-zinc-600 text-white'
            }`}
          >
            {/* Animated shrinking countdown bar */}
            <div
              className={`absolute bottom-0 left-0 h-0.5 rounded-b-2xl animate-shrink-bar ${
                flashResult.status === 'success'
                  ? 'bg-emerald-500'
                  : flashResult.status === 'duplicate'
                  ? 'bg-red-500'
                  : 'bg-zinc-600'
              }`}
            />

            {/* Icon */}
            {flashResult.status === 'success' ? (
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
            ) : flashResult.status === 'duplicate' ? (
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5 text-red-400" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-zinc-700 border border-zinc-600 flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5 text-zinc-300" />
              </div>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-0.5">
              <p className="font-semibold text-sm text-white">
                {flashResult.status === 'success'
                  ? 'Entry Granted'
                  : flashResult.status === 'duplicate'
                  ? 'Already Admitted'
                  : 'Entry Denied'}
              </p>
              <p className="text-xs text-white/70 font-mono leading-snug">
                {flashResult.message}
              </p>
              {flashResult.attendee && (
                <div className="pt-1 space-y-0.5">
                  <p className="text-base font-bold text-white leading-tight">
                    {flashResult.attendee.name}
                  </p>
                  <p className="text-xs text-white/60">{flashResult.attendee.org || 'Bhopal Builder'}</p>
                </div>
              )}
              {flashResult.attendee?.ticket_code && (
                <span className="inline-block font-mono text-[10px] px-2 py-0.5 rounded bg-black/40 border border-white/20 text-white/80 mt-1">
                  {flashResult.attendee.ticket_code}
                </span>
              )}
            </div>

            {/* Close button */}
            <button
              onClick={() => {
                if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
                setFlashResult(null);
              }}
              className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ─── Mode Switcher Tabs ────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 sm:gap-2 p-1 bg-[#0A0A0E] border border-white/10 rounded-xl">
        <button
          onClick={() => setActiveTab('camera')}
          className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-2 rounded-lg text-xs font-mono font-semibold transition-all ${
            activeTab === 'camera'
              ? 'bg-gradient-to-r from-[#005C7D] to-[#BD009E] text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Camera className="w-4 h-4 shrink-0" />
          <span className="truncate">Camera Scanner</span>
        </button>

        <button
          onClick={() => setActiveTab('search')}
          className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-2 rounded-lg text-xs font-mono font-semibold transition-all ${
            activeTab === 'search'
              ? 'bg-gradient-to-r from-[#005C7D] to-[#BD009E] text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Search className="w-4 h-4 shrink-0" />
          <span className="truncate">Manual Search</span>
        </button>
      </div>

      {/* ─── Mode 1: Camera Scanner ───────────────────────────────────────── */}
      {activeTab === 'camera' && (
        <div
          className={`card bg-[#0A0A0E] p-5 space-y-4 transition-all duration-300 ${
            scanGlow === 'green_flash'
              ? 'border border-white/10 border-t-4 border-t-emerald-500'
              : scanGlow === 'red_flash'
              ? 'border border-white/10 border-t-4 border-t-red-500'
              : 'border border-white/10'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Point camera at attendee digital pass QR</span>
            {cameraActive && (
              <span className="text-emerald-400 flex items-center gap-1.5 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Scanner Active
              </span>
            )}
          </div>

          {/* Scanner Viewfinder Box */}
          <div
            className={`relative rounded-2xl overflow-hidden min-h-[320px] flex items-center justify-center transition-all ${
              scanGlow === 'green_flash'
                ? 'border-4 border-emerald-400 ring-8 ring-emerald-500/20'
                : scanGlow === 'red_flash'
                ? 'border-4 border-red-500 ring-8 ring-red-500/20'
                : 'border border-white/20 bg-black'
            }`}
          >
            <div id={scannerContainerId} className="w-full max-w-sm mx-auto" />

            {/* In-viewfinder Flash Banner Overlay — success */}
            {scanGlow === 'green_flash' && (
              <div className="absolute inset-0 bg-emerald-950/70 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none animate-fade-in z-20">
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-12 h-12 text-emerald-300" />
                </div>
                <p className="text-xl font-bold text-white mt-3">
                  Checked In!
                </p>
                <p className="text-sm font-mono text-emerald-200 mt-1">
                  {flashResult?.attendee?.name}
                </p>
              </div>
            )}

            {/* In-viewfinder Flash Banner Overlay — denied */}
            {scanGlow === 'red_flash' && (
              <div className="absolute inset-0 bg-red-950/80 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none animate-fade-in z-20">
                <div className="w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-400 flex items-center justify-center">
                  <ShieldAlert className="w-12 h-12 text-red-300" />
                </div>
                <p className="text-xl font-bold text-white mt-3">
                  Entry Denied
                </p>
                <p className="text-sm font-mono text-red-200 mt-1">
                  {flashResult?.message}
                </p>
              </div>
            )}

            {scannerError && (
              <div className="p-6 text-center space-y-3 max-w-xs">
                <CameraOff className="w-8 h-8 text-red-400 mx-auto" />
                <p className="text-xs font-mono text-red-200">{scannerError}</p>
                <button
                  onClick={() => setActiveTab('search')}
                  className="btn-primary text-xs font-mono py-2 px-3"
                >
                  Switch to Manual Search
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Mode 2: Manual Search & Check-in ─────────────────────────────── */}
      {activeTab === 'search' && (
        <div
          className={`card bg-[#0A0A0E] p-5 space-y-4 transition-all duration-300 ${
            scanGlow === 'green_flash'
              ? 'border border-white/10 border-t-4 border-t-emerald-500'
              : scanGlow === 'red_flash'
              ? 'border border-white/10 border-t-4 border-t-red-500'
              : 'border border-white/10'
          }`}
        >
          <form onSubmit={handleSearch} className="space-y-2">
            <label className="label-text">
              Search by Ticket Code (e.g. REINV-XXXX), Name, or Email
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Type REINV-XXXX, Name, or Email…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field pl-10 text-xs font-mono w-full uppercase"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={searching || !searchQuery.trim()}
                className="btn-primary text-xs font-mono py-2.5 px-4 shrink-0"
              >
                {searching ? <Spinner size="sm" /> : 'Search'}
              </button>
            </div>
          </form>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-2 pt-3 border-t border-white/10">
              <p className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                Matching Attendees ({searchResults.length})
              </p>

              <div className="divide-y divide-white/5 border border-white/10 rounded-xl overflow-hidden bg-black/40">
                {searchResults.map((att) => (
                  <div
                    key={att.id}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-sm">{att.name}</span>
                        <span
                          className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                            att.status === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-500/20 text-slate-400'
                          }`}
                        >
                          {att.status}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-slate-400">
                        {att.org || 'Bhopal'} · {att.email}
                      </p>
                      {att.ticket_code && (
                        <span className="text-[10px] font-mono text-reinvent-cyan inline-block">
                          Pass: {att.ticket_code}
                        </span>
                      )}
                    </div>

                    <button
                      disabled={processingCheckin || att.status !== 'approved'}
                      onClick={() => processCheckin({ id: att.id }, 'manual_search')}
                      className={`py-2 px-4 rounded-xl text-xs font-mono uppercase tracking-wider inline-flex items-center gap-1.5 font-bold transition-all shadow-md self-end sm:self-auto ${
                        att.status !== 'approved'
                          ? 'opacity-30 cursor-not-allowed bg-slate-800 text-slate-500'
                          : 'bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Check In
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── LIVE ADMISSION STACK ─────────────────────────────────────────── */}
      <div className="card bg-[#0A0A0E] border border-white/10 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-heading font-bold text-white flex items-center gap-2">
                <span>Live Admission Stack</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  {checkedInCount} / {EVENT_CONFIG.capacity} Admitted
                </span>
              </h3>
              <p className="text-[11px] font-mono text-slate-400">
                LIFO Stack · Most recently admitted attendee stays on top
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* View switcher */}
            <div className="flex items-center p-0.5 bg-black/60 border border-white/10 rounded-lg text-xs font-mono">
              <button
                type="button"
                onClick={() => setStreamView('stack')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                  streamView === 'stack'
                    ? 'bg-white/10 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Stack</span>
              </button>
              <button
                type="button"
                onClick={() => setStreamView('table')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                  streamView === 'table'
                    ? 'bg-white/10 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>
            </div>

            <button
              type="button"
              onClick={fetchCheckedInList}
              className="text-[11px] font-mono py-1 px-2.5 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {statsLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="md" />
          </div>
        ) : checkedInList.length === 0 ? (
          <div className="text-center py-10 space-y-2">
            <QrCode className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-white font-heading">
              No admissions recorded yet
            </p>
            <p className="text-xs font-mono text-slate-500 max-w-sm mx-auto">
              Scan attendee QR passes or search by ticket code above. New admissions will stack here in real-time.
            </p>
          </div>
        ) : streamView === 'stack' ? (
          /* ─── Stack View (Cards with Newest on Top) ─── */
          <div className="space-y-2.5">
            {checkedInList.map((entry, idx) => {
              const isLatest = idx === 0;
              return (
                <div
                  key={entry.id}
                  className={`p-4 rounded-xl border transition-all duration-300 animate-fade-in ${
                    isLatest
                      ? 'bg-gradient-to-r from-emerald-950/40 via-[#0A0A0E] to-[#0A0A0E] border-emerald-500/60 shadow-lg ring-1 ring-emerald-500/30'
                      : entry.is_duplicate
                      ? 'bg-red-950/30 border-red-500/40'
                      : 'bg-black/40 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Stack Order Indicator */}
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs font-mono shrink-0 shadow-sm ${
                          isLatest
                            ? 'bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300'
                            : 'bg-white/5 border border-white/10 text-slate-400'
                        }`}
                      >
                        {isLatest ? '⚡' : `#${idx + 1}`}
                      </div>

                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-sm truncate ${
                              isLatest ? 'text-white font-bold text-base' : 'font-semibold text-slate-200'
                            }`}
                          >
                            {entry.name}
                          </span>

                          {isLatest && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              LATEST CHECK-IN
                            </span>
                          )}

                          {entry.ticket_code && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/60 border border-white/15 text-reinvent-cyan font-bold">
                              {entry.ticket_code}
                            </span>
                          )}

                          {entry.is_duplicate && (
                            <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40">
                              DUPLICATE
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-slate-400">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-slate-500" />
                            <span className="text-slate-300">{entry.org || 'Bhopal'}</span>
                          </span>
                          <span className="flex items-center gap-1 text-slate-500">
                            <Mail className="w-3.5 h-3.5" />
                            <span className="truncate">{entry.email}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Time & Action */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                      <div className="text-left sm:text-right">
                        <span className="text-xs font-mono font-bold text-emerald-400 block">
                          {new Date(entry.checked_in_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                        <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block">
                          Admitted
                        </span>
                      </div>

                      {isSuperAdmin && (
                        <button
                          type="button"
                          onClick={() => handleCheckOut(entry)}
                          className="py-1 px-2.5 rounded-lg text-[10px] font-mono font-bold uppercase bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 inline-flex items-center gap-1 transition-all active:scale-95"
                          title="Check Out attendee (Super Admin only)"
                        >
                          <LogOut className="w-3 h-3" />
                          <span>Check Out</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ─── Table View ─── */
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="text-[10px] text-slate-500 uppercase tracking-wider border-b border-white/10">
                  <th className="text-left py-2 px-3 font-semibold">Stack #</th>
                  <th className="text-left py-2 px-3 font-semibold">Name</th>
                  <th className="text-left py-2 px-3 font-semibold">Pass Code</th>
                  <th className="text-left py-2 px-3 font-semibold">College / Organization</th>
                  <th className="text-left py-2 px-3 font-semibold">Email</th>
                  <th className="text-left py-2 px-3 font-semibold">Time</th>
                  <th className="text-left py-2 px-3 font-semibold">Status</th>
                  {isSuperAdmin && (
                    <th className="text-right py-2 px-3 font-semibold">Action</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {checkedInList.map((entry, idx) => {
                  const isLatest = idx === 0;
                  return (
                    <tr
                      key={entry.id}
                      className={`transition-colors ${
                        isLatest
                          ? 'bg-emerald-950/20'
                          : entry.is_duplicate
                          ? 'bg-red-950/40 animate-pulse'
                          : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <td className="py-2.5 px-3 font-bold text-slate-400">
                        {isLatest ? <span className="text-emerald-400">⚡ Top</span> : `#${idx + 1}`}
                      </td>
                      <td className="py-2.5 px-3 text-white font-semibold">
                        <div className="flex items-center gap-1.5">
                          <span>{entry.name}</span>
                          {isLatest && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-reinvent-cyan font-bold">
                        {entry.ticket_code || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">{entry.org || 'Bhopal'}</td>
                      <td className="py-2.5 px-3 text-slate-400">{entry.email}</td>
                      <td className="py-2.5 px-3 text-emerald-400 font-bold">
                        {new Date(entry.checked_in_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 px-3">
                        {entry.is_duplicate ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] font-bold uppercase">
                            <AlertTriangle className="w-3 h-3" />
                            DUPLICATE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold uppercase">
                            <CheckCircle2 className="w-3 h-3" />
                            ADMITTED
                          </span>
                        )}
                      </td>
                      {isSuperAdmin && (
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleCheckOut(entry)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono font-bold uppercase bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all active:scale-95"
                            title="Check Out attendee (Super Admin only)"
                          >
                            <LogOut className="w-3 h-3" />
                            <span>Check Out</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
