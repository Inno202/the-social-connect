import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { ArrowLeft, Plus, Trash2, Upload } from 'lucide-react';
import { db } from '../../lib/firebase';
import { toEvent, toType } from '../../lib/data';
import { Poster } from '../../components/Poster';
import { Skeleton, Spinner, toast } from '../../components/ui';
import { cloudinaryReady, isSafeImageUrl, uploadImage, checkImage } from '../../lib/cloudinary';
import { CATEGORY_LABEL, type Category, type MsbEvent, type TicketType } from '../../lib/types';
import { saveEvent, slugify } from './adminData';

const blankEvent = (): MsbEvent => ({
  id: '', title: '', shortTitle: '', category: 'festival', startsAt: '', endsAt: null, gatesOpen: null, timeTbc: false, venue: '', address: '',
  town: 'Welkom', mapQuery: '', poster: '', posterColor: '#0B0B0C', is18Plus: true, description: '', houseRules: [], amenities: [], refundPolicy: '',
  lineup: [], sellMode: 'site', externalUrl: '', externalSeller: '', gatePrice: null, status: 'draft',
});

const blankType = (order: number): TicketType => ({
  id: `t${Math.random().toString(36).slice(2, 8)}`, group: 'General', name: '', price: 0, seats: 1, includes: [], capacity: 100, sold: 0, order, prevId: null, comingSoon: false,
});

const splitDate = (iso: string) => ({ date: iso.slice(0, 10), time: iso.slice(11, 16) });
const joinDate = (date: string, time: string) => (date ? `${date}T${time || '12:00'}:00+02:00` : '');
const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);

function Field({ id, label, children, help }: { id: string; label: string; children: React.ReactNode; help?: string }) {
  return (
    <div>
      <label htmlFor={id} className="field-label">{label}</label>
      {children}
      {help && <p className="field-help">{help}</p>}
    </div>
  );
}

export default function EventEditor() {
  const { id } = useParams();
  const isNew = id === 'new';
  const nav = useNavigate();
  const [ev, setEv] = useState<MsbEvent | null>(isNew ? blankEvent() : null);
  const [types, setTypes] = useState<TicketType[]>([]);
  const existing = useRef<string[]>([]);
  const [lineupText, setLineupText] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isNew || !db || !id) return;
    void (async () => {
      const d = await getDoc(doc(db!, 'events', id));
      if (!d.exists()) { setEv(blankEvent()); return; }
      const e = toEvent(d.id, d.data());
      setEv(e);
      setLineupText(e.lineup.map((l) => (l.group ? `${l.name} | ${l.group}` : l.name)).join('\n'));
      const ts = (await getDocs(collection(db!, 'events', id, 'ticketTypes'))).docs.map((x) => toType(x.id, x.data())).sort((a, b) => a.order - b.order);
      existing.current = ts.map((t) => t.id);
      setTypes(ts);
    })();
  }, [id, isNew]);

  if (!ev) return <Skeleton className="h-96" />;
  const set = (patch: Partial<MsbEvent>) => setEv({ ...ev, ...patch });
  const setType = (i: number, patch: Partial<TicketType>) => setTypes(types.map((t, n) => (n === i ? { ...t, ...patch } : t)));
  const sd = splitDate(ev.startsAt);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!ev) return;
    const errs: Record<string, string> = {};
    if (ev.title.trim().length < 3) errs.title = 'Give the event a title.';
    if (!ev.startsAt) errs.date = 'Choose the date.';
    if (ev.sellMode === 'external' && !/^https:\/\/\S{3,}$/.test(ev.externalUrl.trim())) errs.externalUrl = 'Enter the seller’s https:// link.';
    if (ev.poster && !isSafeImageUrl(ev.poster)) errs.poster = 'Upload the poster, or use a Cloudinary https link.';
    types.forEach((t, i) => { if (!t.name.trim()) errs[`type-${i}`] = 'Name this ticket type.'; });
    setErrors(errs);
    if (Object.keys(errs).length) { toast('Check the highlighted fields.', 'error'); return; }
    const final: MsbEvent = {
      ...ev,
      id: isNew ? `${slugify(ev.title)}-${ev.startsAt.slice(0, 4)}` : ev.id,
      lineup: lines(lineupText).map((l) => { const [name, group] = l.split('|').map((x) => x.trim()); return { name, ...(group ? { group } : {}) }; }),
    };
    setBusy(true);
    try {
      await saveEvent(final, types, existing.current, isNew);
      toast('Event saved.');
      nav('/dashboard/events');
    } catch {
      toast('The event could not be saved. Check the fields and your role.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} noValidate className="space-y-6 max-w-4xl">
      <Link to="/dashboard/events" className="inline-flex items-center gap-2 min-h-[44px] text-sm font-semibold text-ink-soft hover:text-ink"><ArrowLeft className="size-4" aria-hidden /> All events</Link>
      <h2 className="display text-4xl">{isNew ? 'New event' : 'Edit event'}</h2>

      <section className="panel p-6 grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2"><Field id="title" label="Title">
          <input id="title" className="field" value={ev.title} maxLength={140} onChange={(e) => set({ title: e.target.value })} aria-invalid={!!errors.title} />
          {errors.title && <p className="field-error">{errors.title}</p>}
        </Field></div>
        <Field id="short" label="Short name" help="Used on calendar cards, for example “Spring Blow”."><input id="short" className="field" value={ev.shortTitle} maxLength={60} onChange={(e) => set({ shortTitle: e.target.value })} /></Field>
        <Field id="cat" label="Category">
          <select id="cat" className="field" value={ev.category} onChange={(e) => set({ category: e.target.value as Category })}>
            {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field id="date" label="Date">
          <input id="date" type="date" className="field" value={sd.date} onChange={(e) => set({ startsAt: joinDate(e.target.value, sd.time) })} aria-invalid={!!errors.date} />
          {errors.date && <p className="field-error">{errors.date}</p>}
        </Field>
        <Field id="time" label="Start time (SAST)"><input id="time" type="time" className="field" value={sd.time} onChange={(e) => set({ startsAt: joinDate(sd.date, e.target.value) })} /></Field>
        <Field id="gates" label="Gates open" help="Leave empty if not known."><input id="gates" type="time" className="field" value={ev.gatesOpen ?? ''} onChange={(e) => set({ gatesOpen: e.target.value || null })} /></Field>
        <Field id="ends" label="Last day (events over several days)"><input id="ends" type="date" className="field" value={ev.endsAt?.slice(0, 10) ?? ''} onChange={(e) => set({ endsAt: e.target.value ? joinDate(e.target.value, sd.time) : null })} /></Field>
        <label className="flex items-center gap-3 min-h-[44px]"><input type="checkbox" className="size-5 accent-[#0B0B0C]" checked={ev.timeTbc} onChange={(e) => set({ timeTbc: e.target.checked })} /> Times to be announced</label>
        <label className="flex items-center gap-3 min-h-[44px]"><input type="checkbox" className="size-5 accent-[#0B0B0C]" checked={ev.is18Plus} onChange={(e) => set({ is18Plus: e.target.checked })} /> 18+ event (shows the no under 18s notice)</label>
        <Field id="status" label="Status">
          <select id="status" className="field" value={ev.status} onChange={(e) => set({ status: e.target.value as MsbEvent['status'] })}>
            <option value="draft">Draft (hidden)</option><option value="published">Published</option><option value="cancelled">Cancelled</option>
          </select>
        </Field>
      </section>

      <section className="panel p-6 grid gap-5 sm:grid-cols-2">
        <h3 className="sm:col-span-2 display text-2xl">Venue</h3>
        <Field id="venue" label="Venue"><input id="venue" className="field" value={ev.venue} onChange={(e) => set({ venue: e.target.value })} /></Field>
        <Field id="town" label="Town"><input id="town" className="field" value={ev.town} onChange={(e) => set({ town: e.target.value })} /></Field>
        <Field id="addr" label="Address"><input id="addr" className="field" value={ev.address} onChange={(e) => set({ address: e.target.value })} /></Field>
        <Field id="map" label="Map search" help="What to search in Google Maps, for example “Robs Cricket Club, Welkom”."><input id="map" className="field" value={ev.mapQuery} onChange={(e) => set({ mapQuery: e.target.value })} /></Field>
      </section>

      <section className="panel p-6 grid gap-5 sm:grid-cols-[160px_1fr] items-start">
        <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-mist"><Poster event={ev} size="sm" /></div>
        <div className="space-y-4">
          <h3 className="display text-2xl">Poster</h3>
          <label className="btn btn-outline">
            {uploading ? <Spinner /> : <Upload className="size-4" aria-hidden />} Upload poster
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const bad = checkImage(f);
                if (bad) { toast(bad, 'error'); return; }
                setUploading(true);
                try { set({ poster: await uploadImage(f, 'posters') }); toast('Poster uploaded.'); } catch (err) { toast((err as Error).message, 'error'); } finally { setUploading(false); }
              }}
            />
          </label>
          {!cloudinaryReady && <p className="field-help">Uploads switch on once Cloudinary is set up. Until then, paste a link below.</p>}
          <Field id="poster" label="Poster link">
            <input id="poster" className="field" value={ev.poster} onChange={(e) => set({ poster: e.target.value })} aria-invalid={!!errors.poster} placeholder="https://res.cloudinary.com/…" />
            {errors.poster && <p className="field-error">{errors.poster}</p>}
          </Field>
          <Field id="pcolor" label="Poster colour" help="Used when there is no poster."><input id="pcolor" type="color" className="h-12 w-24 rounded-xl border border-ink/25" value={ev.posterColor} onChange={(e) => set({ posterColor: e.target.value.toUpperCase() })} /></Field>
        </div>
      </section>

      <section className="panel p-6 space-y-5">
        <h3 className="display text-2xl">Info and line-up</h3>
        <Field id="desc" label="Description"><textarea id="desc" rows={5} className="field" value={ev.description} maxLength={5000} onChange={(e) => set({ description: e.target.value })} /></Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="rules" label="House rules" help="One per line, for example “No cooler boxes”."><textarea id="rules" rows={3} className="field" value={ev.houseRules.join('\n')} onChange={(e) => set({ houseRules: e.target.value.split('\n') })} /></Field>
          <Field id="amen" label="Available" help="One per line, for example “Food available”."><textarea id="amen" rows={3} className="field" value={ev.amenities.join('\n')} onChange={(e) => set({ amenities: e.target.value.split('\n') })} /></Field>
        </div>
        <Field id="refund" label="Refund policy for this event" help="Leave empty to use the site's general wording."><textarea id="refund" rows={2} className="field" value={ev.refundPolicy} onChange={(e) => set({ refundPolicy: e.target.value })} /></Field>
        <Field id="lineup" label="Line-up" help="One artist per line. Add a group after a bar, for example “Nasty C | Headliners”."><textarea id="lineup" rows={6} className="field" value={lineupText} onChange={(e) => setLineupText(e.target.value)} /></Field>
      </section>

      <section className="panel p-6 space-y-5">
        <h3 className="display text-2xl">How tickets are sold</h3>
        <div role="radiogroup" aria-label="How tickets are sold" className="flex flex-wrap gap-2">
          {([['site', 'On this site'], ['external', 'Outside link'], ['none', 'Not on sale']] as const).map(([k, l]) => (
            <button key={k} type="button" role="radio" aria-checked={ev.sellMode === k} aria-pressed={ev.sellMode === k} className="chip" onClick={() => set({ sellMode: k })}>{l}</button>
          ))}
        </div>
        {ev.sellMode === 'external' && (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="seller" label="Seller name"><input id="seller" className="field" value={ev.externalSeller} onChange={(e) => set({ externalSeller: e.target.value })} placeholder="Computicket" /></Field>
            <Field id="externalUrl" label="Seller link">
              <input id="externalUrl" className="field" value={ev.externalUrl} onChange={(e) => set({ externalUrl: e.target.value })} placeholder="https://" aria-invalid={!!errors.externalUrl} />
              {errors.externalUrl && <p className="field-error">{errors.externalUrl}</p>}
            </Field>
          </div>
        )}
        <Field id="gate" label="Gate price (information only, in rand)"><input id="gate" type="number" min={0} className="field max-w-[200px] num" value={ev.gatePrice ?? ''} onChange={(e) => set({ gatePrice: e.target.value === '' ? null : Math.max(0, Math.round(Number(e.target.value))) })} /></Field>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-bold">Ticket types and releases</h4>
            <button type="button" className="btn btn-outline" onClick={() => setTypes([...types, blankType(types.length + 1)])}><Plus className="size-4" aria-hidden /> Add ticket type</button>
          </div>
          <p className="field-help">For VIP tables, set “Admits” to 4 or 8: one table issues one ticket per seat. For free tickets, set the price to 0. A release with “Opens after” set goes on sale when that release sells out.</p>
          {types.map((t, i) => (
            <fieldset key={t.id} className="rounded-3xl border border-line p-4 grid gap-4 sm:grid-cols-3">
              <legend className="sr-only">Ticket type {i + 1}</legend>
              <Field id={`tg-${i}`} label="Group"><input id={`tg-${i}`} className="field" value={t.group} onChange={(e) => setType(i, { group: e.target.value })} placeholder="General, VIP tables, Children" /></Field>
              <Field id={`tn-${i}`} label="Name">
                <input id={`tn-${i}`} className="field" value={t.name} onChange={(e) => setType(i, { name: e.target.value })} placeholder="1st release" aria-invalid={!!errors[`type-${i}`]} />
                {errors[`type-${i}`] && <p className="field-error">{errors[`type-${i}`]}</p>}
              </Field>
              <Field id={`tp-${i}`} label="Price (rand)"><input id={`tp-${i}`} type="number" min={0} className="field num" value={t.price} onChange={(e) => setType(i, { price: Math.max(0, Math.round(Number(e.target.value))) })} /></Field>
              <Field id={`ts-${i}`} label="Admits (people)"><input id={`ts-${i}`} type="number" min={1} max={20} className="field num" value={t.seats} onChange={(e) => setType(i, { seats: Math.min(20, Math.max(1, Math.round(Number(e.target.value)))) })} /></Field>
              <Field id={`tc-${i}`} label="Online allocation" help={`${t.sold} sold so far. 0 = not sold online.`}><input id={`tc-${i}`} type="number" min={0} className="field num" value={t.capacity} onChange={(e) => setType(i, { capacity: Math.max(0, Math.round(Number(e.target.value))) })} /></Field>
              <Field id={`to-${i}`} label="Order"><input id={`to-${i}`} type="number" className="field num" value={t.order} onChange={(e) => setType(i, { order: Math.round(Number(e.target.value)) })} /></Field>
              <Field id={`tprev-${i}`} label="Opens after">
                <select id={`tprev-${i}`} className="field" value={t.prevId ?? ''} onChange={(e) => setType(i, { prevId: e.target.value || null })}>
                  <option value="">Open now</option>
                  {types.filter((x) => x.id !== t.id).map((x) => <option key={x.id} value={x.id}>{x.group}: {x.name || 'unnamed'}</option>)}
                </select>
              </Field>
              <div className="sm:col-span-2"><Field id={`ti-${i}`} label="Included" help="One per line."><textarea id={`ti-${i}`} rows={2} className="field" value={t.includes.join('\n')} onChange={(e) => setType(i, { includes: e.target.value.split('\n') })} /></Field></div>
              <label className="flex items-center gap-3 min-h-[44px]"><input type="checkbox" className="size-5 accent-[#0B0B0C]" checked={t.comingSoon} onChange={(e) => setType(i, { comingSoon: e.target.checked })} /> Coming soon</label>
              <div className="sm:col-span-2 flex items-end justify-end">
                <button type="button" className="btn btn-danger" disabled={t.sold > 0} title={t.sold > 0 ? 'Tickets of this type were sold' : undefined} onClick={() => setTypes(types.filter((_, n) => n !== i))}>
                  <Trash2 className="size-4" aria-hidden /> Remove
                </button>
              </div>
            </fieldset>
          ))}
        </div>
      </section>

      <div className="flex gap-2">
        <button className="btn btn-primary btn-lg" disabled={busy}>{busy && <Spinner />} Save event</button>
        <Link to="/dashboard/events" className="btn btn-outline btn-lg">Cancel</Link>
      </div>
    </form>
  );
}
