import { useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { PageHero } from '../components/Layout';
import { Spinner, toast } from '../components/ui';
import { useAuth, authErrorMessage } from '../lib/auth';
import { firebaseReady } from '../lib/firebase';
import { useTitle } from '../lib/useTitle';

function safeNext(n: string | null) {
  return n && /^\/[a-z0-9/_-]*$/i.test(n) && !n.startsWith('//') ? n : '/profile';
}

export default function Account() {
  const [params, setParams] = useSearchParams();
  const mode = params.get('mode') === 'signup' ? 'signup' : 'signin';
  useTitle(mode === 'signup' ? 'Create an account' : 'Sign in');
  const next = safeNext(params.get('next'));
  const { user, signIn, signUp, resetPassword } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

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
    if (Object.keys(errs).length) {
      document.getElementById(Object.keys(errs)[0])?.focus();
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signup') {
        await signUp(name, email, password);
        toast('Your account is ready.');
      } else await signIn(email, password);
    } catch (err) {
      setErrors({ form: authErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHero title={mode === 'signup' ? 'Create an account' : 'Sign in'} />
      <div className="mx-auto max-w-md px-4 py-10 md:py-14">
        <div role="tablist" aria-label="Account" className="flex gap-2">
          <button role="tab" aria-selected={mode === 'signin'} className="chip flex-1 justify-center" onClick={() => setMode('signin')}>Sign in</button>
          <button role="tab" aria-selected={mode === 'signup'} className="chip flex-1 justify-center" onClick={() => setMode('signup')}>Create account</button>
        </div>
        {!firebaseReady && <p className="mt-6 panel p-5 text-ink-soft">Accounts are not switched on yet on this copy of the site.</p>}
        <form onSubmit={submit} noValidate className="mt-6 panel p-6 space-y-5">
          {mode === 'signup' && (
            <div>
              <label htmlFor="name" className="field-label">Your name</label>
              <input id="name" className="field" autoComplete="name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} aria-describedby={errors.name ? 'name-err' : undefined} />
              {errors.name && <p id="name-err" className="field-error">{errors.name}</p>}
            </div>
          )}
          <div>
            <label htmlFor="email" className="field-label">Email</label>
            <input id="email" type="email" className="field" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-err' : undefined} />
            {errors.email && <p id="email-err" className="field-error">{errors.email}</p>}
          </div>
          <div>
            <label htmlFor="password" className="field-label">Password</label>
            <input id="password" type="password" className="field" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!errors.password} aria-describedby={errors.password ? 'pw-err' : 'pw-help'} />
            {errors.password ? <p id="pw-err" className="field-error">{errors.password}</p> : mode === 'signup' && <p id="pw-help" className="field-help">At least 8 characters.</p>}
          </div>
          {errors.form && <p className="field-error" role="alert">{errors.form}</p>}
          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy || !firebaseReady}>
            {busy && <Spinner />} {mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
          {mode === 'signin' && (
            <button
              type="button"
              className="btn btn-block text-ink-soft"
              onClick={async () => {
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setErrors({ email: 'Enter your email first, then tap Forgot password.' }); return; }
                try { await resetPassword(email); } catch { /* same message either way, so emails cannot be probed */ }
                toast('If that email has an account, a reset link is on its way.', 'info');
              }}
            >
              Forgot password
            </button>
          )}
        </form>
      </div>
    </>
  );
}
