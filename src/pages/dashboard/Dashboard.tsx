import { lazy, Suspense } from 'react';
import { Link, Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth, can } from '../../lib/auth';
import { ROLE_LABEL } from '../../lib/types';
import { Skeleton } from '../../components/ui';
import { useTitle } from '../../lib/useTitle';

const EventsAdmin = lazy(() => import('./EventsAdmin'));
const EventEditor = lazy(() => import('./EventEditor'));
const Reports = lazy(() => import('./Reports'));
const GalleryAdmin = lazy(() => import('./GalleryAdmin'));
const VendorsAdmin = lazy(() => import('./VendorsAdmin'));
const UsersAdmin = lazy(() => import('./UsersAdmin'));
const ActivityLog = lazy(() => import('./ActivityLog'));

export default function Dashboard() {
  useTitle('Dashboard');
  const { user, profile, ready } = useAuth();
  if (!ready) return <div className="wrap py-10"><Skeleton className="h-40" /></div>;
  if (!user) return <Navigate to="/account?next=/dashboard" replace />;
  const role = profile?.role;
  if (!can.dashboard(role) || !profile?.active)
    return (
      <div className="wrap py-20 md:py-28">
        <div className="max-w-xl mx-auto text-center">
          <h1 className="t-title">Staff <span className="text-leaf">only</span></h1>
          <p className="mt-4 t-lead mx-auto">The dashboard is for MSB Events staff.</p>
          <div className="even-row [--even-min:10rem] mt-8">
            <Link to="/" className="btn btn-outline">Back to home</Link>
            <Link to="/profile" className="btn btn-primary">Go to my tickets</Link>
          </div>
        </div>
      </div>
    );

  const tabs = [
    { to: 'events', label: 'Events', ok: can.events(role) },
    { to: 'reports', label: 'Reports', ok: can.reports(role) },
    { to: 'gallery', label: 'Gallery', ok: can.gallery(role) },
    { to: 'vendors', label: 'Vendors', ok: can.vendors(role) },
    { to: 'users', label: 'Users and roles', ok: can.users(role) },
    { to: 'activity', label: 'Activity', ok: can.activity(role) },
  ].filter((t) => t.ok);
  const first = tabs[0]?.to;

  return (
    <div className="pb-10">
      <div className="px-3 sm:px-4 pt-3 sm:pt-4">
        <div className="band px-6 sm:px-10 pt-12 pb-6">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="eyebrow text-lime">{ROLE_LABEL[role!]}</p>
              <h1 className="t-hero mt-2">Hello, <span className="text-lime">{profile.name.split(' ')[0]}</span></h1>
            </div>
            {can.scan(role) && (
              <Link to="/scan" className="btn btn-accent self-stretch sm:self-auto">Open door scanner <ArrowRight className="btn-arrow" aria-hidden /></Link>
            )}
          </div>
          {tabs.length > 0 && (
            <nav aria-label="Dashboard" className="max-w-7xl mx-auto mt-8 even-row [--even-min:7.5rem]" data-chips>
              {tabs.map((t) => (
                <NavLink key={t.to} to={`/dashboard/${t.to}`} className="btn btn-chip-light">
                  {t.label}
                </NavLink>
              ))}
            </nav>
          )}
        </div>
      </div>
      <div className="wrap pt-8">
        <Suspense fallback={<Skeleton className="h-60" />}>
          <Routes>
            {first ? <Route index element={<Navigate to={first} replace />} /> : <Route index element={<p className="text-ink-soft">Use the door scanner to check tickets.</p>} />}
            {can.events(role) && <Route path="events" element={<EventsAdmin />} />}
            {can.events(role) && <Route path="events/:id" element={<EventEditor />} />}
            {can.reports(role) && <Route path="reports" element={<Reports />} />}
            {can.gallery(role) && <Route path="gallery" element={<GalleryAdmin />} />}
            {can.vendors(role) && <Route path="vendors" element={<VendorsAdmin />} />}
            {can.users(role) && <Route path="users" element={<UsersAdmin />} />}
            {can.activity(role) && <Route path="activity" element={<ActivityLog />} />}
            <Route path="*" element={<p className="text-ink-soft">This area is not part of your role.</p>} />
          </Routes>
        </Suspense>
      </div>
    </div>
  );
}
