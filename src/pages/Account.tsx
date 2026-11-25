import { useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { PlainTitle } from '../components/Layout';
import { PasswordInput, Spinner, toast } from '../components/ui';
import { useAuth, authErrorMessage } from '../lib/auth';
import { firebaseReady } from '../lib/firebase';
import { useTitle } from '../lib/useTitle';

function safeNext(n: string | null) {
  return n && /^\/[a-z0-9/_-]*$/i.test(n) && !n.startsWith('//') ? n : '/profile';
}

/** Google's own mark: their branding rules ask for it on "Continue with Google". */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-5 shrink-0" aria-hidden><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.2-.1-2.3-.4-3.5z"/></svg>
  );
}

export default function Account() {
  const [params, setParams] = useSearchParams();
  const mode = params.get('mode') === 'signup' ? 'signup' : 'signin';
  useTitle(mode === 'signup' ? 'Create an account' : 'Sign in');
  const next = safeNext(params.get('next'));
  const { user, signIn, signUp, resetPassword, signInWithGoogle } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<'' | 'form' | 'google'>('');

  if (user) return <Navigate to={next} replace />;

  function setMode(m: 'signin' | 'signup') {
    const p = new URLSearchParams(params);
    if (m === 'signup') p.set('mode', 'signup'); else p.delete('mode');
    setParams(p, { replace: true });
    setErrors({});
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (mode === 'signup' && name.trim().length < 2) errs.name = 'Enter your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = 'Enter a valid email address.';
    if (password.length < 8) errs.password = 'Use at least 8 characters.';
    setErrors(errs);
    const first = Object.keys(errs)[0];
    if (first) {
      document.getElementById(first)?.focus();
      return;
    }
    setBusy('form');
    try {
      if (mode === 'signup') {
        await signUp(name, email, password);
        toast('Your account is ready.');
      } else await signIn(email, password);
    } catch (err) {
      setErrors({ form: authErrorMessage(err) });
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="wrap py-12 md:py-20">
      <div className="mx-auto w-full max-w-sm">
        <PlainTitle title={mode === 'signup' ? 'Create an account' : 'Sign in'} />
        <div role="tablist" aria-label="Account" className="even-cols mt-8">
          <button role="tab" aria-selected={mode === 'signin'} className="btn btn-chip" onClick={() => setMode('signin')}>Sign in</button>
          <button role="tab" aria-selected={mode === 'signup'} className="btn btn-chip" onClick={() => setMode('signup')}>Create account</button>
        </div>
        {!firebaseReady && <p className="mt-6 panel p-5 text-ink-soft">Accounts are not switched on yet on this copy of the site.</p>}
        <div className="panel p-6 mt-6 space-y-5">
          <button
            type="button"
            className="btn btn-outline btn-block"
            disabled={!!busy || !firebaseReady}
            onClick={async () => {
              setBusy('google');
              setErrors({});
              try { await signInWithGoogle(); } catch (err) { setErrors({ form: authErrorMessage(err) }); } finally { setBusy(''); }
            }}
          >
            {busy === 'google' ? <Spinner label="Opening Google" /> : <GoogleMark />} Continue with Google
          </button>
          <p className="text-center text-sm text-ink-soft">or with your email</p>
          <form onSubmit={submit} noValidate className="space-y-5">
            {mode === 'signup' && (
              <div>
                <label htmlFor="name" className="field-label">Your name</label>
                <input id="name" className="field" autoComplete="name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} aria-describedby={errors.name ? 'name-err' : undefined} />
                {errors.name && <p id="name-err" className="field-error">{errors.name}</p>}
              </div>
            )}
            <div>
              <label htmlFor="email" className="field-label">Email</label>
              <input id="email" type="email" inputMode="email" className="field" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-err' : undefined} />
              {errors.email && <p id="email-err" className="field-error">{errors.email}</p>}
            </div>
            <div>
              <label htmlFor="password" className="field-label">Password</label>
              <PasswordInput id="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!errors.password} aria-describedby={errors.password ? 'pw-err' : mode === 'signup' ? 'pw-help' : undefined} />
              {errors.password ? <p id="pw-err" className="field-error">{errors.password}</p> : mode === 'signup' && <p id="pw-help" className="field-help">At least 8 characters.</p>}
            </div>
            {errors.form && <p className="field-error" role="alert">{errors.form}</p>}
            <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={!!busy || !firebaseReady}>
              {busy === 'form' && <Spinner label={mode === 'signup' ? 'Creating your account' : 'Signing in'} />} {mode === 'signup' ? 'Create account' : 'Sign in'}
            </button>
            {mode === 'signin' && (
              <button
                type="button"
                className="btn btn-ghost btn-block"
                onClick={async () => {
                  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setErrors({ email: 'Enter your email first, then tap Forgot password.' }); document.getElementById('email')?.focus(); return; }
                  try { await resetPassword(email); } catch { /* same message either way, so emails cannot be probed */ }
                  toast('If that email has an account, a reset link is on its way.', 'info');
                }}
              >
                Forgot password
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
