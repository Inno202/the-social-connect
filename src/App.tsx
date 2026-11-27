import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ConfirmHost, Toasts, Spinner } from './components/ui';
import Home from './pages/Home';
import About from './pages/About';
import Events from './pages/Events';
import EventPage from './pages/EventPage';
import Gallery from './pages/Gallery';
import { Terms, Privacy, Cookies } from './pages/Legal';
import NotFound from './pages/NotFound';
import Vendors from './pages/Vendors';

const Tickets = lazy(() => import('./pages/Tickets'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Account = lazy(() => import('./pages/Account'));
const Profile = lazy(() => import('./pages/Profile'));
const MyTickets = lazy(() => import('./pages/MyTickets'));
const Claim = lazy(() => import('./pages/Claim'));
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const Scanner = lazy(() => import('./pages/Scanner'));

function Loading() {
  return (
    <div className="min-h-[50vh] grid place-items-center text-ink-soft" role="status">
      <span className="inline-flex items-center gap-2"><Spinner /> Loading</span>
    </div>
  );
}

export default function App() {
  return (
    <>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/scan" element={<Scanner />} />
          <Route
            path="*"
            element={
              <Layout>
                <Suspense fallback={<Loading />}>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/events" element={<Events />} />
                    <Route path="/events/:id" element={<EventPage />} />
                    <Route path="/events/:id/tickets" element={<Tickets />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/account" element={<Account />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/tickets" element={<MyTickets />} />
                    <Route path="/claim/:code" element={<Claim />} />
                    <Route path="/dashboard/*" element={<Dashboard />} />
                    <Route path="/gallery" element={<Gallery />} />
                    <Route path="/vendors" element={<Vendors />} />
                    <Route path="/vendors/applications" element={<Navigate to="/vendors#my-applications" replace />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/cookies" element={<Cookies />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </Layout>
            }
          />
        </Routes>
      </Suspense>
      <Toasts />
      <ConfirmHost />
    </>
  );
}
