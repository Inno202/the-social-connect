import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, ShoppingBag, UserRound, X } from 'lucide-react';
import { Logo } from './Logo';
import { useCart } from '../lib/cart';
import { useAuth, can } from '../lib/auth';
import { PARTNERS } from '../data/site';

const NAV = [
  { to: '/events', label: 'Events' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/about', label: 'About' },
];

export function Header() {
  const cart = useCart();
  const count = cart.reduce((n, l) => n + l.qty, 0);
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);

  return (
    <header className="bg-ink text-white sticky top-0 z-50">
      <a href="#main" className="skip-link">Skip to content</a>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-[68px] flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center min-h-[44px]" aria-label="MSB Events home">
          <Logo />
        </Link>
        <nav aria-label="Main" className="hidden md:flex items-center gap-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `px-4 min-h-[44px] inline-flex items-center text-sm font-semibold uppercase tracking-[0.14em] rounded-full transition-colors ${isActive ? 'text-lime' : 'text-white/85 hover:text-lime'}`
              }
            >
              {n.label}
            </NavLink>
          ))}
          {can.dashboard(profile?.role) && (
            <NavLink to="/dashboard" className={({ isActive }) => `px-4 min-h-[44px] inline-flex items-center text-sm font-semibold uppercase tracking-[0.14em] ${isActive ? 'text-lime' : 'text-white/85 hover:text-lime'}`}>
              Dashboard
            </NavLink>
          )}
        </nav>
        <div className="flex items-center gap-1">
          <Link to="/cart" className="icon-btn relative hover:bg-white/10" aria-label={count ? `Cart, ${count} item${count === 1 ? '' : 's'}` : 'Cart'}>
            <ShoppingBag className="size-5" aria-hidden />
            {count > 0 && (
              <span className="absolute top-1 right-0.5 min-w-[20px] h-[20px] px-1 rounded-full bg-lime text-ink text-[11px] font-bold grid place-items-center num" aria-hidden>
                {count}
              </span>
            )}
          </Link>
          <Link to={user ? '/profile' : '/account'} className="icon-btn hover:bg-white/10" aria-label={user ? 'My tickets and account' : 'Sign in'}>
            <UserRound className="size-5" aria-hidden />
          </Link>
          <button type="button" className="icon-btn md:hidden hover:bg-white/10" aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(!open)}>
            {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Main" className="md:hidden border-t border-white/10 px-4 pb-4">
          {[...NAV, ...(can.dashboard(profile?.role) ? [{ to: '/dashboard', label: 'Dashboard' }] : [])].map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => `display block py-3 text-3xl ${isActive ? 'text-lime' : 'text-white'}`}>
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
    <footer className="bg-ink text-white mt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-5 max-w-[34ch] text-white/75">Events from Matjhabeng, Welkom, in the Free State. More than 5 years of MSB Events.</p>
          <AgeNotice className="mt-5 text-white/75 max-w-[44ch]" />
        </div>
        <div>
          <h2 className="eyebrow text-lime">Explore</h2>
          <ul className="mt-4 space-y-1">
            {[['/events', 'Events'], ['/gallery', 'Gallery'], ['/about', 'About'], ['/profile', 'My tickets']].map(([to, l]) => (
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
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row gap-2 sm:items-center justify-between text-sm text-white/70">
          <p>© {new Date().getFullYear()} MSB Events</p>
          <ul className="flex flex-wrap gap-x-2">
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
      <div className="rounded-[2rem] bg-ink text-white px-6 sm:px-10 pt-24 sm:pt-32 pb-8 sm:pb-10">
        <h1 className="display text-5xl sm:text-7xl md:text-8xl hero-rise max-w-7xl mx-auto">
          <span>{words.join(' ')}{words.length ? ' ' : ''}<span className="text-lime">{last}</span></span>
        </h1>
      </div>
    </div>
  );
}
