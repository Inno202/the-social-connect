import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { PageHero } from '../components/Layout';
import { PasswordInput, Skeleton, Spinner, confirmAction, toast } from '../components/ui';
import { useAuth, authErrorMessage } from '../lib/auth';
import { ROLE_LABEL } from '../lib/types';
import { useTitle } from '../lib/useTitle';

function AccountPanel() {
  const { profile, user, rename, changePassword, deleteAccount, signOut, hasPassword } = useAuth();
  const [name, setName] = useState(profile?.name ?? '');
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [delPw, setDelPw] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => { if (profile?.name) setName(profile.name); }, [profile?.name]);

  const run = async (key: string, fn: () => Promise<void>, ok: string) => {
    setBusy(key);
    try { await fn(); toast(ok); } catch (e) { toast(authErrorMessage(e), 'error'); } finally { setBusy(null); }
  };

  return (
    <div className="space-y-6">
      <form className="panel p-6 space-y-4" onSubmit={(e) => { e.preventDefault(); if (name.trim().length >= 2) void run('name', () => rename(name), 'Name saved.'); }}>
        <h2 className="t-card">Your details</h2>
        <p className="text-sm text-ink-soft break-any">{user?.email}{profile && profile.role !== 'USER' ? ` · ${ROLE_LABEL[profile.role]}` : ''}</p>
        <div>
          <label htmlFor="pname" className="field-label">Name</label>
          <input id="pname" className="field" value={name} maxLength={80} autoComplete="name" onChange={(e) => setName(e.target.value)} />
        </div>
        <button className="btn btn-primary btn-block sm:w-auto" disabled={busy === 'name' || name.trim().length < 2}>{busy === 'name' && <Spinner label="Saving" />} Save name</button>
      </form>
      {!hasPassword ? (
        <div className="panel p-6">
          <h2 className="t-card">Password</h2>
          <p className="mt-2 text-ink-soft">You sign in with Google, so there is no password to change here.</p>
        </div>
      ) : (
        <form className="panel p-6 space-y-4" onSubmit={(e) => { e.preventDefault(); if (next.length >= 8) void run('pw', async () => { await changePassword(cur, next); setCur(''); setNext(''); }, 'Password changed.'); }}>
          <h2 className="t-card">Password</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-start">
            <div><label htmlFor="cur" className="field-label">Current password</label><PasswordInput id="cur" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} /></div>
            <div><label htmlFor="new" className="field-label">New password</label><PasswordInput id="new" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} aria-describedby="new-help" /><p id="new-help" className="field-help">At least 8 characters.</p></div>
          </div>
          <button className="btn btn-primary btn-block sm:w-auto" disabled={busy === 'pw' || !cur || next.length < 8}>{busy === 'pw' && <Spinner label="Changing password" />} Change password</button>
        </form>
      )}
      <div className="panel p-6 space-y-4">
        <h2 className="t-card">Sign out</h2>
        <button type="button" className="btn btn-outline btn-block sm:w-auto" onClick={() => void signOut()}>Sign out</button>
      </div>
      <form
        className="panel p-6 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (hasPassword && !delPw) return;
          const ok = await confirmAction({ title: 'Delete your account?', message: 'Your profile and sign-in are removed for good. Your tickets will no longer show here.', confirmLabel: 'Delete account', tone: 'danger' });
          if (ok) await run('del', () => deleteAccount(hasPassword ? delPw : undefined), 'Your account was deleted.');
        }}
      >
        <h2 className="t-card">Delete account</h2>
        {hasPassword ? (
          <>
            <p className="text-ink-soft text-sm">Enter your password to confirm it is you.</p>
            <div><label htmlFor="delpw" className="field-label">Password</label><PasswordInput id="delpw" autoComplete="current-password" value={delPw} onChange={(e) => setDelPw(e.target.value)} /></div>
          </>
        ) : (
          <p className="text-ink-soft text-sm">Google will ask you to confirm it is you.</p>
        )}
        <button className="btn btn-danger btn-block sm:w-auto" disabled={(hasPassword && !delPw) || busy === 'del'}>{busy === 'del' && <Spinner label="Deleting" />} Delete my account</button>
      </form>
    </div>
  );
}

export default function Profile() {
  useTitle('Profile');
  const { user, ready } = useAuth();
  if (!ready) return <div className="wrap max-w-2xl py-10"><Skeleton className="h-60" /></div>;
  if (!user) return <Navigate to="/account?next=/profile" replace />;
  return (
    <>
      <PageHero title="Your profile" photo="/photos/festival-crowd-denim" position="center 40%" />
      <div className="wrap max-w-2xl py-12 md:py-16">
        <p className="mb-6 text-ink-soft">Your tickets are on the <Link to="/tickets" className="link">Tickets</Link> page. Vendor applications you sent while signed in, with replies and any stall fee, are on <Link to="/vendors#my-applications" className="link">Become a vendor</Link>.</p>
        <AccountPanel />
      </div>
    </>
  );
}
