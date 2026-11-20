import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Spinner } from '@/components/ui/Spinner';

// Lazy-loaded pages for blistering fast mobile loading and minimal bundle size
const Landing = lazy(() => import('@/pages/Landing'));
const Apply = lazy(() => import('@/pages/Apply'));
const AuthCallback = lazy(() => import('@/pages/AuthCallback'));
const MyTicket = lazy(() => import('@/pages/MyTicket'));
const Privacy = lazy(() => import('@/pages/Privacy'));

// Admin & Gate Pages
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'));
const Attendees = lazy(() => import('@/pages/admin/Attendees'));
const ReviewQueue = lazy(() => import('@/pages/admin/ReviewQueue'));
const Team = lazy(() => import('@/pages/admin/Team'));
const OtpOutbox = lazy(() => import('@/pages/admin/OtpOutbox'));
const CheckinScanner = lazy(() => import('@/pages/admin/CheckinScanner'));
const VolunteerDashboard = lazy(() => import('@/pages/admin/VolunteerDashboard'));

function PageFallback() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
      <Spinner size="md" />
      <span className="text-[11px] font-mono text-slate-500 uppercase tracking-widest">
        Loading…
      </span>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* Public & Student Routes */}
        <Route element={<Layout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/apply" element={<Apply />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/my" element={<MyTicket />} />
          <Route path="/privacy" element={<Privacy />} />
        </Route>

        {/* Admin Panel Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="review" element={<ReviewQueue />} />
          <Route path="attendees" element={<Attendees />} />
          <Route path="team" element={<Team />} />
          <Route path="checkin" element={<CheckinScanner />} />
          <Route path="otp-outbox" element={<OtpOutbox />} />
          <Route path="volunteer" element={<VolunteerDashboard />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
