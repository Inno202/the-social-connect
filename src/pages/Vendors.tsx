import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { PageHero } from '../components/Layout';
import { CharCount, Spinner } from '../components/ui';
import { db, firebaseReady } from '../lib/firebase';
import { useEvents } from '../lib/data';
import { useAuth } from '../lib/auth';
import { filterEvents } from '../lib/eventState';
import { shortDate } from '../lib/format';
import { useTitle } from '../lib/useTitle';

export const VENDOR_CATEGORIES = [
  ['food', 'Food'],
  ['drinks', 'Drinks (no alcohol)'],
  ['hubbly', 'Hubbly'],
  ['merchandise', 'Merchandise'],
  ['clothing', 'Clothing and accessories'],
  ['beauty', 'Hair, nails and beauty'],
  ['services', 'Services (photos, DJ gear, other)'],
  ['other', 'Something else'],
] as const;

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PHONE = /^[0-9 +()-]{7,20}$/;

export default function Vendors() {
  useTitle('Become a vendor');
  const { user, profile, ready } = useAuth();
  const { events } = useEvents();
  const upcoming = useMemo(() => (events ? filterEvents(events, 'upcoming') : []), [events]);
  const [f, setF] = useState({ businessName: '', contactName: '', email: '', phone: '', category: '', description: '', link: '', website: '' });
  const [picked, setPicked] = useState<string[]>([]);
  const [anyEvent, setAnyEvent] = useState(false);
  const [needsPower, setNeedsPower] = useState<boolean | null>(null);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState('');

  const set = (k: keyof typeof f, v: string) => { setF({ ...f, [k]: v }); setErrors((e) => ({ ...e, [k]: '' })); };
  const contactName = f.contactName || profile?.name || '';
  const email = f.email || user?.email || '';
  const err = (k: string) => (errors[k] ? { 'aria-invalid': true, 'aria-describedby': `${k}-err` } : {});

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFailed('');
    const x: Record<string, string> = {};
    if (f.businessName.trim().length < 2) x.businessName = 'Enter your business or stall name.';
    if (contactName.trim().length < 2) x.contactName = 'Enter the name of the person we should contact.';
    if (!EMAIL.test(email.trim())) x.email = 'Enter a valid email address.';
    if (!PHONE.test(f.phone.trim())) x.phone = 'Enter a phone number, for example 082 123 4567.';
    if (!f.category) x.category = 'Choose what you sell.';
    if (f.description.trim().length < 10) x.description = 'Tell us a little about what you sell (at least 10 characters).';
    if (!anyEvent && picked.length === 0) x.events = 'Choose at least one event, or any upcoming event.';
    if (needsPower === null) x.power = 'Tell us whether you need electricity.';
    if (f.link.trim() && !/^https:\/\/\S{3,200}$/.test(f.link.trim())) x.link = 'Use a full link that starts with https://';
    if (!consent) x.consent = 'Please agree so we can contact you about your application.';
    setErrors(x);
    const first = Object.keys(x)[0];
    if (first) { document.getElementById(first === 'events' ? 'events-any' : first === 'power' ? 'power-yes' : first)?.focus(); return; }
    // A hidden field only bots fill in: pretend it worked and send nothing.
    if (f.website) { setSent(true); return; }
    if (!db) { setFailed('Applications are not switched on on this copy of the site.'); return; }
    setBusy(true);
    try {
      await addDoc(collection(db, 'vendorApplications'), {
        businessName: f.businessName.trim(),
        contactName: contactName.trim(),
        email: email.trim(),
        phone: f.phone.trim(),
        category: f.category,
        description: f.description.trim(),
        events: anyEvent ? [] : picked,
        anyEvent,
        needsPower: !!needsPower,
        link: f.link.trim(),
        consent: true,
        status: 'new',
        createdAt: serverTimestamp(),
        uid: user?.uid ?? null,
      });
      setSent(true);
      window.scrollTo(0, 0);
    } catch {
      setFailed('Your application could not be sent. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHero title="Become a vendor" photo="/photos/festival-crowd-chairs" position="center 40%" />
      <div className="wrap max-w-2xl py-12 md:py-16">
        {sent ? (
          <div className="band p-8 sm:p-10 ticket-in" role="status">
            <CheckCircle2 className="size-10 text-lime" aria-hidden />
            <h2 className="t-section mt-4">Application <span className="text-lime">sent</span></h2>
            <p className="mt-3 text-white/85 prose-w">
              Thank you. MSB Events will contact you about stall space, fees and set-up for the events you chose.
              {user ? ' You can follow it under My applications.' : ''}
            </p>
            <div className="even-row [--even-min:10rem] mt-6">
              {user && <Link to="/vendors/applications" className="btn btn-accent">My applications <ArrowRight className="btn-arrow" aria-hidden /></Link>}
              <Link to="/events" className={user ? 'btn btn-outline-light' : 'btn btn-accent'}>See upcoming events <ArrowRight className="btn-arrow" aria-hidden /></Link>
              <Link to="/" className="btn btn-outline-light">Back to home</Link>
            </div>
          </div>
        ) : (
          <>
            <p className="t-lead max-w-none">
              Sell food, drinks, hubbly, clothing or services at an MSB event. Tell us about your stall and which events you want; MSB Events
              will contact you about space, fees and set-up.
            </p>
            {!firebaseReady && <p className="mt-6 panel p-5 text-ink-soft">Applications are not switched on on this copy of the site.</p>}
            {firebaseReady && ready && (
              user ? (
                <p className="mt-6 panel p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-ink-soft">You are signed in, so you can follow this application and see MSB Events’ reply.</span>
                  <Link to="/vendors/applications" className="btn btn-outline shrink-0">My applications</Link>
                </p>
              ) : (
                <p className="mt-6 panel p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-ink-soft">Sign in first to follow your application and see MSB Events’ reply on the site. You can also apply without an account.</span>
                  <Link to="/account?next=/vendors" className="btn btn-primary shrink-0">Sign in</Link>
                </p>
              )
            )}
            <form onSubmit={submit} noValidate className="mt-8 space-y-6">
              <section className="panel p-6 grid grid-cols-1 sm:grid-cols-2 gap-5 items-start" aria-labelledby="v-about">
                <h2 id="v-about" className="t-card sm:col-span-2">About you</h2>
                <div className="sm:col-span-2 min-w-0">
                  <label htmlFor="businessName" className="field-label">Business or stall name</label>
                  <input id="businessName" className="field" maxLength={100} autoComplete="organization" value={f.businessName} onChange={(e) => set('businessName', e.target.value)} {...err('businessName')} />
                  {errors.businessName && <p id="businessName-err" className="field-error">{errors.businessName}</p>}
                </div>
                <div className="min-w-0">
                  <label htmlFor="contactName" className="field-label">Contact person</label>
                  <input id="contactName" className="field" maxLength={80} autoComplete="name" value={contactName} onChange={(e) => set('contactName', e.target.value)} {...err('contactName')} />
                  {errors.contactName && <p id="contactName-err" className="field-error">{errors.contactName}</p>}
                </div>
                <div className="min-w-0">
                  <label htmlFor="phone" className="field-label">Phone</label>
                  <input id="phone" type="tel" inputMode="tel" className="field" maxLength={20} autoComplete="tel" placeholder="082 123 4567" value={f.phone} onChange={(e) => set('phone', e.target.value)} {...err('phone')} />
                  {errors.phone && <p id="phone-err" className="field-error">{errors.phone}</p>}
                </div>
                <div className="sm:col-span-2 min-w-0">
                  <label htmlFor="email" className="field-label">Email</label>
                  <input id="email" type="email" inputMode="email" className="field" maxLength={120} autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => set('email', e.target.value)} {...err('email')} />
                  {errors.email && <p id="email-err" className="field-error">{errors.email}</p>}
                </div>
              </section>

              <section className="panel p-6 grid grid-cols-1 sm:grid-cols-2 gap-5 items-start" aria-labelledby="v-stall">
                <h2 id="v-stall" className="t-card sm:col-span-2">Your stall</h2>
                <div className="sm:col-span-2 min-w-0">
                  <label htmlFor="category" className="field-label">What you sell</label>
                  <select id="category" className="field" value={f.category} onChange={(e) => set('category', e.target.value)} {...err('category')}>
                    <option value="">Choose one</option>
                    {VENDOR_CATEGORIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                  {errors.category && <p id="category-err" className="field-error">{errors.category}</p>}
                </div>
                <div className="sm:col-span-2 min-w-0">
                  <label htmlFor="description" className="field-label">Tell us about it</label>
                  <textarea id="description" rows={4} className="field" maxLength={1000} placeholder="What you sell, prices, how big your stall or gazebo is." value={f.description} onChange={(e) => set('description', e.target.value)} {...(errors.description ? err('description') : { 'aria-describedby': 'description-count' })} />
                  {errors.description ? <p id="description-err" className="field-error">{errors.description}</p> : <CharCount id="description-count" value={f.description} max={1000} />}
                </div>
                <div className="sm:col-span-2 min-w-0">
                  <label htmlFor="link" className="field-label">Instagram, Facebook or website (optional)</label>
                  <input id="link" type="url" inputMode="url" className="field" maxLength={200} placeholder="https://instagram.com/yourstall" value={f.link} onChange={(e) => set('link', e.target.value)} {...err('link')} />
                  {errors.link && <p id="link-err" className="field-error">{errors.link}</p>}
                </div>
                <fieldset className="sm:col-span-2 min-w-0" aria-describedby={errors.power ? 'power-err' : undefined}>
                  <legend className="field-label">Do you need electricity?</legend>
                  <div className="even-cols" role="radiogroup">
                    <button id="power-yes" type="button" role="radio" aria-checked={needsPower === true} className="btn btn-chip" onClick={() => { setNeedsPower(true); setErrors((e) => ({ ...e, power: '' })); }}>Yes</button>
                    <button type="button" role="radio" aria-checked={needsPower === false} className="btn btn-chip" onClick={() => { setNeedsPower(false); setErrors((e) => ({ ...e, power: '' })); }}>No</button>
                  </div>
                  {errors.power && <p id="power-err" className="field-error">{errors.power}</p>}
                </fieldset>
              </section>

              <fieldset className="panel p-6" aria-describedby={errors.events ? 'events-err' : undefined}>
                <legend className="sr-only">Events</legend>
                <h2 className="t-card" aria-hidden>Which events?</h2>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-5">
                  <label className="check-row sm:col-span-2">
                    <input id="events-any" type="checkbox" className="check" checked={anyEvent} onChange={(e) => { setAnyEvent(e.target.checked); setErrors((x) => ({ ...x, events: '' })); }} />
                    <span>Any upcoming MSB event</span>
                  </label>
                  {upcoming.map((ev) => (
                    <label key={ev.id} className="check-row min-w-0">
                      <input
                        type="checkbox"
                        className="check"
                        disabled={anyEvent}
                        checked={!anyEvent && picked.includes(ev.id)}
                        onChange={(e) => { setPicked(e.target.checked ? [...picked, ev.id] : picked.filter((p) => p !== ev.id)); setErrors((x) => ({ ...x, events: '' })); }}
                      />
                      <span className="min-w-0 break-any">{ev.title} <span className="text-ink-soft num">· {shortDate(ev.startsAt)}</span></span>
                    </label>
                  ))}
                </div>
                {upcoming.length === 0 && <p className="text-sm text-ink-soft">No dates are announced right now; choose “Any upcoming MSB event”.</p>}
                {errors.events && <p id="events-err" className="field-error">{errors.events}</p>}
              </fieldset>

              <div className="panel p-6">
                <label className="check-row">
                  <input id="consent" type="checkbox" className="check" checked={consent} onChange={(e) => { setConsent(e.target.checked); setErrors((x) => ({ ...x, consent: '' })); }} {...err('consent')} />
                  <span>MSB Events may keep these details and contact me about vendor spaces. See the <Link to="/privacy" className="link" target="_blank">Privacy policy</Link>.</span>
                </label>
                {errors.consent && <p id="consent-err" className="field-error">{errors.consent}</p>}
              </div>

              <div className="sr-only" aria-hidden="true">
                <label htmlFor="website">Leave this empty</label>
                <input id="website" tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => set('website', e.target.value)} />
              </div>

              {failed && <p className="field-error" role="alert">{failed}</p>}
              <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy || !firebaseReady}>
                {busy && <Spinner label="Sending your application" />} Send application
              </button>
            </form>
          </>
        )}
      </div>
    </>
  );
}
