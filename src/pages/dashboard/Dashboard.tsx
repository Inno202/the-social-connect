import { lazy, Suspense } from 'react';
import { Link, Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { ScanLine } from 'lucide-react';
import { useAuth, can } from '../../lib/auth';
import { ROLE_LABEL } from '../../lib/types';
import { Skeleton } from '../../components/ui';
import { useTitle } from '../../lib/useTitle';

const EventsAdmin = lazy(() => import('./EventsAdmin'));
const EventEditor = lazy(() => import('./EventEditor'));
const Reports = lazy(() => import('./Reports'));
const GalleryAdmin = lazy(() => import('./GalleryAdmin'));
const UsersAdmin = lazy(() => import('./UsersAdmin'));
const ActivityLog = lazy(() => import('./ActivityLog'));

export default function Dashboard() {
  useTitle('Dashboard');
  const { user, profile, ready } = useAuth();
  if (!ready) return <div className="mx-auto max-w-7xl px-4 py-10"><Skeleton className="h-40" /></div>;
  if (!user) return <Navigate to="/account?next=/dashboard" replace />;
  const role = profile?.role;
  if (!can.dashboard(role) || !profile?.active)
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="display text-5xl">Staff <span className="text-leaf">only</span></h1>
        <p className="mt-3 text-ink-soft">The dashboard is for MSB Events staff.</p>
        <Link to="/profile" className="btn btn-primary mt-6">Go to my tickets</Link>
      </div>
    );

  const tabs = [
    { to: 'events', label: 'Events', ok: can.events(role) },
    { to: 'reports', label: 'Reports', ok: can.reports(role) },
    { to: 'gallery', label: 'Gallery', ok: can.gallery(role) },
    { to: 'users', label: 'Users and roles', ok: can.users(role) },
    { to: 'activity', label: 'Activity', ok: can.activity(role) },
  ].filter((t) => t.ok);
  const first = tabs[0]?.to;

  return (
    <div className="pb-10">
      <div className="px-3 sm:px-4 pt-3 sm:pt-4">
        <div className="rounded-[2rem] bg-ink text-white px-6 sm:px-10 pt-12 pb-6">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-lime">{ROLE_LABEL[role!]}</p>
              <h1 className="display text-5xl sm:text-6xl mt-2">Hello, <span className="text-lime">{profile.name.split(' ')[0]}</span></h1>
            </div>
            {can.scan(role) && (
              <Link to="/scan" className="btn btn-lime self-start sm:self-auto"><ScanLine className="size-5" aria-hidden /> Open door scanner</Link>
            )}
          </div>
          {tabs.length > 0 && (
            <nav aria-label="Dashboard" className="max-w-7xl mx-auto mt-8 no-scrollbar flex gap-2 overflow-x-auto -mx-2 px-2">
              {tabs.map((t) => (
                <NavLink key={t.to} to={`/dashboard/${t.to}`} className={({ isActive }) => `chip ${isActive ? '!bg-lime !text-ink !border-lime' : '!bg-transparent !text-white !border-white/30'}`}>
                  {t.label}
                </NavLink>
              ))}
            </nav>
          )}
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
        <Suspense fallback={<Skeleton className="h-60" />}>
          <Routes>
            {first ? <Route index element={<Navigate to={first} replace />} /> : <Route index element={<p className="text-ink-soft">Use the door scanner to check tickets.</p>} />}
            {can.events(role) && <Route path="events" element={<EventsAdmin />} />}
            {can.events(role) && <Route path="events/:id" element={<EventEditor />} />}
            {can.reports(role) && <Route path="reports" element={<Reports />} />}
            {can.gallery(role) && <Route path="gallery" element={<GalleryAdmin />} />}
            {can.users(role) && <Route path="users" element={<UsersAdmin />} />}
            {can.activity(role) && <Route path="activity" element={<ActivityLog />} />}
            <Route path="*" element={<p className="text-ink-soft">This area is not part of your role.</p>} />
          </Routes>
        </Suspense>
      </div>
    </div>
  );
}
