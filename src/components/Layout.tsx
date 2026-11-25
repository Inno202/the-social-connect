import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, ShoppingBag, UserRound, X } from 'lucide-react';
import { Logo } from './Logo';
import { useCart } from '../lib/cart';
import { useAuth, can } from '../lib/auth';
import { PARTNERS } from '../data/site';
import { useBackClose } from './ui';

const NAV = [
  { to: '/', label: 'Home' },
  { to: '/events', label: 'Events' },
  { to: '/tickets', label: 'Tickets' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/about', label: 'About' },
  { to: '/vendors', label: 'Become a vendor' },
];

/**
 * Signed out: the nav, then a "Sign in" button on the far right.
 * Signed in: the nav, then the cart and profile icons on the far right.
 */
export function Header() {
  const cart = useCart();
  const count = cart.reduce((n, l) => n + l.qty, 0);
  const { user, profile, ready } = useAuth();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);
  useBackClose(open, () => setOpen(false));
  const links = [...NAV, ...(can.dashboard(profile?.role) ? [{ to: '/dashboard', label: 'Dashboard' }] : [])];
  // The phone menu also names what is an icon in the bar.
  const mobileLinks = user ? [...links, { to: '/cart', label: count ? `Cart (${count})` : 'Cart' }, { to: '/profile', label: 'Profile' }] : links;
  const signInHref = `/account?next=${encodeURIComponent(loc.pathname.startsWith('/account') ? '/tickets' : loc.pathname)}`;

  return (
    <header className="bg-ink text-white sticky top-0 z-50">
      <a href="#main" className="skip-link">Skip to content</a>
      <div className="wrap h-[68px] flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center min-h-[44px] shrink-0" aria-label="MSB Events home">
          <Logo className="h-10 w-auto" />
        </Link>
        <nav aria-label="Main" className="hidden xl:flex items-center">
          {links.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) => `px-3 min-h-[44px] inline-flex items-center text-sm font-semibold uppercase tracking-[0.12em] whitespace-nowrap ${isActive ? 'text-lime' : 'text-white/85 hover:text-lime'}`}
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-1 shrink-0">
          {user ? (
            <>
              <Link to="/cart" className="icon-btn icon-btn-ghost-light relative" aria-label={count ? `Cart, ${count} item${count === 1 ? '' : 's'}` : 'Cart'}>
                <ShoppingBag aria-hidden />
                {count > 0 && (
                  <span className="absolute top-0.5 right-0 min-w-[20px] h-[20px] px-1 rounded-full bg-lime text-ink text-xs font-bold grid place-items-center num" aria-hidden>
                    {count}
                  </span>
                )}
              </Link>
              <Link to="/profile" className="icon-btn icon-btn-ghost-light" aria-label="Profile">
                <UserRound aria-hidden />
              </Link>
            </>
          ) : (
            ready && <Link to={signInHref} className="btn btn-accent">Sign in</Link>
          )}
          <button type="button" className="icon-btn icon-btn-ghost-light xl:hidden" aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(!open)}>
            {open ? <X aria-hidden /> : <Menu aria-hidden />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Main" className="xl:hidden border-t border-white/10 wrap pb-4">
          {mobileLinks.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => `t-section flex items-center min-h-[56px] ${isActive ? 'text-lime' : 'text-white'}`}>
              {n.label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}

export function AgeNotice({ className = '' }: { className?: string }) {
  return (
    <p className={`text-sm ${className}`}>
      <strong className="font-bold">No under 18s.</strong> Drink responsibly. Alcohol is not for sale to persons under 18.
    </p>
  );
}

export function Footer() {
  return (
    <footer className="bg-ink text-white mt-20 md:mt-28">
      <div className="wrap py-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div className="sm:col-span-2 lg:col-span-1">
          <Logo className="h-11 w-auto" />
          <p className="mt-5 max-w-[34ch] text-white/75">Events from Matjhabeng, Welkom, in the Free State. More than 5 years of MSB Events.</p>
          <AgeNotice className="mt-5 text-white/75 max-w-[44ch]" />
        </div>
        <div>
          <h2 className="eyebrow text-lime">Explore</h2>
          <ul className="mt-4">
            {[['/events', 'Events'], ['/tickets', 'My tickets'], ['/gallery', 'Gallery'], ['/about', 'About'], ['/vendors', 'Become a vendor']].map(([to, l]) => (
              <li key={to}><Link to={to} className="inline-flex min-h-[44px] min-w-[44px] items-center text-white/85 hover:text-lime">{l}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="eyebrow text-lime">Partners</h2>
          <ul className="mt-4 space-y-1.5 text-white/75 text-sm">
            {PARTNERS.map((p) => <li key={p}>{p}</li>)}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="wrap py-4 flex flex-col sm:flex-row gap-2 sm:items-center justify-between text-sm text-white/70">
          <p>© {new Date().getFullYear()} MSB Events</p>
          <ul className="flex flex-wrap gap-x-2 -mx-2">
            {[['/terms', 'Terms'], ['/privacy', 'Privacy'], ['/cookies', 'Cookies']].map(([to, l]) => (
              <li key={to}><Link to={to} className="inline-flex min-h-[44px] items-center px-2 hover:text-lime">{l}</Link></li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <div className="min-h-dvh flex flex-col">
      <Header />
      <main id="main" className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

/** Inner page header: a rounded black band with the title at its foot, last word in lime. Title only. */
export function PageHero({ title }: { title: string }) {
  const words = title.split(' ');
  const last = words.pop();
  return (
    <div className="px-3 sm:px-4 pt-3 sm:pt-4">
      <div className="band px-6 sm:px-10 pt-20 sm:pt-28 pb-8 sm:pb-10">
        <h1 className="t-hero hero-rise max-w-7xl mx-auto">
          <span className="block">{words.join(' ')}{words.length ? ' ' : ''}<span className="text-lime">{last}</span></span>
        </h1>
      </div>
    </div>
  );
}

/** A plain page title (404, sign in) with an optional eyebrow. */
export function PlainTitle({ title, eyebrow }: { title: string; eyebrow?: string }) {
  const words = title.split(' ');
  const last = words.pop();
  return (
    <div>
      {eyebrow && <p className="eyebrow text-ink-soft mb-3">{eyebrow}</p>}
      <h1 className="t-title">{words.join(' ')}{words.length ? ' ' : ''}<span className="text-leaf">{last}</span></h1>
    </div>
  );
}
