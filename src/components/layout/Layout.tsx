import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { ToastContainer } from '@/components/ui/ToastContainer';

export function Layout() {
  const { isAdmin, adminRole, loading } = useAuth();

  // If user is a Volunteer, lock them exclusively to Volunteer Check-in console
  if (!loading && adminRole === 'volunteer') {
    return <Navigate to="/admin/checkin" replace />;
  }

  // If user is Admin/Reviewer, route directly to Admin Dashboard
  if (!loading && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Navbar />
      <main className="flex-1 pt-16">
        <Outlet />
      </main>
      <Footer />
      <ToastContainer />
    </div>
  );
}
