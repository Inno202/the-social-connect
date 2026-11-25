import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { db } from '../../lib/firebase';
import { toEvent, toType } from '../../lib/data';
import { Poster } from '../../components/Poster';
import { CharCount, Dialog, Skeleton, Spinner, toast } from '../../components/ui';
import { cloudinaryReady, isSafeImageUrl, uploadImage, checkImage } from '../../lib/cloudinary';
import { rands } from '../../lib/format';
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
const int = (v: string, min: number, max: number) => Math.min(max, Math.max(min, Math.round(Number(v) || 0)));

function Field({ id, label, children, help, error, className = '' }: { id: string; label: string; children: React.ReactNode; help?: React.ReactNode; error?: string; className?: string }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={id} className="field-label">{label}</label>
      {children}
      {error ? <p id={`${id}-err`} className="field-error">{error}</p> : help && <div id={`${id}-help`} className="field-help">{help}</div>}
    </div>
  );
}

/** Staff form dialog: one ticket type or release. Scrolls inside itself; Save / Cancel stay visible. */
function TicketTypeDialog({ value, all, onSave, onClose }: { value: TicketType | null; all: TicketType[]; onSave: (t: TicketType) => void; onClose: () => void }) {
  const [t, setT] = useState<TicketType | null>(value);
  const [err, setErr] = useState('');
  useEffect(() => { setT(value); setErr(''); }, [value]);
  const set = (p: Partial<TicketType>) => t && setT({ ...t, ...p });
  const includes = t ? t.includes.join('\n') : '';
  return (
    <Dialog
      open={!!value}
      onClose={onClose}
      wide
      title={value && all.some((x) => x.id === value.id) ? 'Edit ticket type' : 'New ticket type'}
      footer={
        <div className="even-row [--even-min:9rem]">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button
            type="submit"
            form="type-form"
            className="btn btn-primary"
          >
            Save ticket type
          </button>
        </div>
      }
    >
      {t && (
        <form
          id="type-form"
          noValidate
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!t.name.trim()) { setErr('Name this ticket type, for example “1st release”.'); document.getElementById('tt-name')?.focus(); return; }
            onSave({ ...t, name: t.name.trim(), group: t.group.trim() || 'General', includes: lines(includes) });
          }}
        >
          <Field id="tt-group" label="Group" help="Tickets are grouped under this heading, for example General, VIP tables or Children.">
            <input id="tt-group" className="field" value={t.group} maxLength={40} onChange={(e) => set({ group: e.target.value })} aria-describedby="tt-group-help" />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_8rem_7rem] gap-3 items-start">
            <Field id="tt-name" label="Name" error={err}>
              <input id="tt-name" className="field" value={t.name} maxLength={80} placeholder="1st release" onChange={(e) => { set({ name: e.target.value }); setErr(''); }} aria-invalid={!!err} aria-describedby={err ? 'tt-name-err' : undefined} />
            </Field>
            <Field id="tt-price" label="Price (R)">
              <input id="tt-price" type="number" inputMode="numeric" min={0} className="field num" value={t.price} onChange={(e) => set({ price: int(e.target.value, 0, 100000) })} />
            </Field>
            <Field id="tt-seats" label="Admits">
              <input id="tt-seats" type="number" inputMode="numeric" min={1} max={20} className="field num" value={t.seats} onChange={(e) => set({ seats: int(e.target.value, 1, 20) })} />
            </Field>
          </div>
          <p className="field-help -mt-2">Price 0 makes a free ticket. For a VIP table, “Admits” is 4 or 8: one table issues one ticket per seat.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-start">
            <Field id="tt-cap" label="Online allocation" help={`${t.sold} sold so far. 0 means not sold online.`}>
              <input id="tt-cap" type="number" inputMode="numeric" min={0} className="field num" value={t.capacity} onChange={(e) => set({ capacity: int(e.target.value, 0, 100000) })} aria-describedby="tt-cap-help" />
            </Field>
            <Field id="tt-order" label="Order on the page">
              <input id="tt-order" type="number" inputMode="numeric" className="field num" value={t.order} onChange={(e) => set({ order: int(e.target.value, -999, 999) })} />
            </Field>
            <Field id="tt-prev" label="Opens after" help="Goes on sale when that release sells out." className="sm:col-span-2">
              <select id="tt-prev" className="field" value={t.prevId ?? ''} onChange={(e) => set({ prevId: e.target.value || null })} aria-describedby="tt-prev-help">
                <option value="">Open now</option>
                {all.filter((x) => x.id !== t.id).map((x) => <option key={x.id} value={x.id}>{x.group}: {x.name || 'unnamed'}</option>)}
              </select>
            </Field>
            <Field id="tt-inc" label="Included" help="One per line, for example “Soft seating”." className="sm:col-span-2">
              <textarea id="tt-inc" rows={3} className="field" value={includes} onChange={(e) => set({ includes: e.target.value.split('\n') })} aria-describedby="tt-inc-help" />
            </Field>
          </div>
          <label className="check-row">
            <input type="checkbox" className="check" checked={t.comingSoon} onChange={(e) => set({ comingSoon: e.target.checked })} />
            <span>Show as “Coming soon” (not on sale yet)</span>
          </label>
        </form>
      )}
    </Dialog>
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
  const [editingType, setEditingType] = useState<TicketType | null>(null);

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
  const sd = splitDate(ev.startsAt);
  const err = (k: string) => (errors[k] ? { 'aria-invalid': true, 'aria-describedby': `${k}-err` } : {});

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!ev) return;
    const errs: Record<string, string> = {};
    if (ev.title.trim().length < 3) errs.title = 'Give the event a title.';
    if (!ev.startsAt) errs.date = 'Choose the date.';
    if (ev.poster && !isSafeImageUrl(ev.poster)) errs.poster = 'Upload the poster, or use a Cloudinary https link.';
    if (ev.sellMode === 'external' && !/^https:\/\/\S{3,}$/.test(ev.externalUrl.trim())) errs.externalUrl = 'Enter the seller’s https:// link.';
    setErrors(errs);
    const first = Object.keys(errs)[0];
    if (first) { document.getElementById(first)?.focus(); return; }
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
    <>
      <form onSubmit={save} noValidate className="space-y-6 max-w-3xl">
        <Link to="/dashboard/events" className="inline-flex items-center gap-2 min-h-[44px] text-sm font-semibold text-ink-soft hover:text-ink"><ArrowLeft className="size-4" aria-hidden /> All events</Link>
        <h2 className="t-section">{isNew ? 'New event' : 'Edit event'}</h2>

        <section className="panel p-6 grid grid-cols-1 sm:grid-cols-2 gap-5 items-start" aria-label="Basics">
          <Field id="title" label="Title" error={errors.title} className="sm:col-span-2">
            <input id="title" className="field" value={ev.title} maxLength={140} onChange={(e) => set({ title: e.target.value })} {...err('title')} />
          </Field>
          <Field id="short" label="Short name" help="Used on calendar cards, for example “Spring Blow”.">
            <input id="short" className="field" value={ev.shortTitle} maxLength={60} onChange={(e) => set({ shortTitle: e.target.value })} aria-describedby="short-help" />
          </Field>
          <Field id="cat" label="Category">
            <select id="cat" className="field" value={ev.category} onChange={(e) => set({ category: e.target.value as Category })}>
              {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field id="date" label="Date" error={errors.date}>
            <input id="date" type="date" className="field" value={sd.date} onChange={(e) => set({ startsAt: joinDate(e.target.value, sd.time) })} {...err('date')} />
          </Field>
          <Field id="time" label="Start time (SAST)">
            <input id="time" type="time" className="field" value={sd.time} onChange={(e) => set({ startsAt: joinDate(sd.date, e.target.value) })} />
          </Field>
          <Field id="gates" label="Gates open" help="Leave empty if not known.">
            <input id="gates" type="time" className="field" value={ev.gatesOpen ?? ''} onChange={(e) => set({ gatesOpen: e.target.value || null })} aria-describedby="gates-help" />
          </Field>
          <Field id="ends" label="Last day (events over several days)">
            <input id="ends" type="date" className="field" value={ev.endsAt?.slice(0, 10) ?? ''} onChange={(e) => set({ endsAt: e.target.value ? joinDate(e.target.value, sd.time) : null })} />
          </Field>
          <Field id="status" label="Status" className="sm:col-span-2">
            <select id="status" className="field" value={ev.status} onChange={(e) => set({ status: e.target.value as MsbEvent['status'] })}>
              <option value="draft">Draft (hidden)</option><option value="published">Published</option><option value="cancelled">Cancelled</option>
            </select>
          </Field>
          <label className="check-row"><input type="checkbox" className="check" checked={ev.timeTbc} onChange={(e) => set({ timeTbc: e.target.checked })} /> <span>Times to be announced</span></label>
          <label className="check-row"><input type="checkbox" className="check" checked={ev.is18Plus} onChange={(e) => set({ is18Plus: e.target.checked })} /> <span>18+ event (shows the no under 18s notice)</span></label>
        </section>

        <section className="panel p-6 grid grid-cols-1 sm:grid-cols-2 gap-5 items-start" aria-labelledby="venue-h">
          <h3 id="venue-h" className="t-card sm:col-span-2">Venue</h3>
          <Field id="venue" label="Venue"><input id="venue" className="field" value={ev.venue} maxLength={120} onChange={(e) => set({ venue: e.target.value })} /></Field>
          <Field id="town" label="Town"><input id="town" className="field" value={ev.town} maxLength={60} autoComplete="address-level2" onChange={(e) => set({ town: e.target.value })} /></Field>
          <Field id="addr" label="Address" className="sm:col-span-2"><input id="addr" className="field" value={ev.address} maxLength={200} autoComplete="street-address" onChange={(e) => set({ address: e.target.value })} /></Field>
          <Field id="map" label="Map search" help="What to search in Google Maps, for example “Robs Cricket Club, Welkom”." className="sm:col-span-2">
            <input id="map" className="field" value={ev.mapQuery} maxLength={200} onChange={(e) => set({ mapQuery: e.target.value })} aria-describedby="map-help" />
          </Field>
        </section>

        <section className="panel p-6 grid grid-cols-1 sm:grid-cols-[10rem_1fr] gap-5 items-start" aria-labelledby="poster-h">
          <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-mist max-w-[10rem]"><Poster event={ev} sizes="160px" /></div>
          <div className="space-y-4 min-w-0">
            <h3 id="poster-h" className="t-card">Poster</h3>
            <label className="btn btn-outline" aria-disabled={!cloudinaryReady}>
              {uploading && <Spinner label="Uploading" />} Upload poster
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={!cloudinaryReady || uploading}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const bad = checkImage(f);
                  if (bad) { toast(bad, 'error'); return; }
                  setUploading(true);
                  try { set({ poster: await uploadImage(f, 'posters') }); toast('Poster uploaded.'); } catch (er) { toast((er as Error).message, 'error'); } finally { setUploading(false); }
                }}
              />
            </label>
            {!cloudinaryReady && <p className="field-help">Uploads switch on once Cloudinary is set up. Until then, paste a link below.</p>}
            <Field id="poster" label="Poster link" error={errors.poster}>
              <input id="poster" type="url" inputMode="url" className="field" value={ev.poster} onChange={(e) => set({ poster: e.target.value })} placeholder="https://res.cloudinary.com/…" {...err('poster')} />
            </Field>
            <Field id="pcolor" label="Poster colour" help="Used when there is no poster.">
              <input id="pcolor" type="color" className="h-12 w-24 rounded-xl border border-ink/25" value={ev.posterColor} onChange={(e) => set({ posterColor: e.target.value.toUpperCase() })} aria-describedby="pcolor-help" />
            </Field>
          </div>
        </section>

        <section className="panel p-6 grid grid-cols-1 sm:grid-cols-2 gap-5 items-start" aria-labelledby="info-h">
          <h3 id="info-h" className="t-card sm:col-span-2">Info and line-up</h3>
          <Field id="desc" label="Description" className="sm:col-span-2" help={<CharCount value={ev.description} max={5000} />}>
            <textarea id="desc" rows={6} className="field" value={ev.description} maxLength={5000} onChange={(e) => set({ description: e.target.value })} aria-describedby="desc-help" />
          </Field>
          <Field id="rules" label="House rules" help="One per line, for example “No cooler boxes”.">
            <textarea id="rules" rows={3} className="field" value={ev.houseRules.join('\n')} onChange={(e) => set({ houseRules: e.target.value.split('\n') })} aria-describedby="rules-help" />
          </Field>
          <Field id="amen" label="Available" help="One per line, for example “Food available”.">
            <textarea id="amen" rows={3} className="field" value={ev.amenities.join('\n')} onChange={(e) => set({ amenities: e.target.value.split('\n') })} aria-describedby="amen-help" />
          </Field>
          <Field id="refund" label="Refund policy for this event" className="sm:col-span-2" help={<><span>Leave empty to use the site's general wording.</span><CharCount value={ev.refundPolicy} max={3000} /></>}>
            <textarea id="refund" rows={3} className="field" value={ev.refundPolicy} maxLength={3000} onChange={(e) => set({ refundPolicy: e.target.value })} aria-describedby="refund-help" />
          </Field>
          <Field id="lineup" label="Line-up" className="sm:col-span-2" help="One artist per line. Add a group after a bar, for example “Nasty C | Headliners”.">
            <textarea id="lineup" rows={8} className="field" value={lineupText} onChange={(e) => setLineupText(e.target.value)} aria-describedby="lineup-help" />
          </Field>
        </section>

        <section className="panel p-6 space-y-5" aria-labelledby="sell-h">
          <h3 id="sell-h" className="t-card">How tickets are sold</h3>
          <div role="radiogroup" aria-labelledby="sell-h" className="even-row [--even-min:8rem]" data-chips>
            {([['site', 'On this site'], ['external', 'Outside link'], ['none', 'Not on sale']] as const).map(([k, l]) => (
              <button key={k} type="button" role="radio" aria-checked={ev.sellMode === k} className="btn btn-chip" onClick={() => set({ sellMode: k })}>{l}</button>
            ))}
          </div>
          {ev.sellMode === 'external' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-start">
              <Field id="seller" label="Seller name"><input id="seller" className="field" value={ev.externalSeller} maxLength={60} placeholder="Computicket" onChange={(e) => set({ externalSeller: e.target.value })} /></Field>
              <Field id="externalUrl" label="Seller link" error={errors.externalUrl}>
                <input id="externalUrl" type="url" inputMode="url" className="field" value={ev.externalUrl} onChange={(e) => set({ externalUrl: e.target.value })} placeholder="https://" {...err('externalUrl')} />
              </Field>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-start">
            <Field id="gate" label="Gate price (R, information only)">
              <input id="gate" type="number" inputMode="numeric" min={0} className="field num" value={ev.gatePrice ?? ''} onChange={(e) => set({ gatePrice: e.target.value === '' ? null : int(e.target.value, 0, 100000) })} />
            </Field>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h4 className="font-bold">Ticket types and releases</h4>
              <button type="button" className="btn btn-outline shrink-0" onClick={() => setEditingType(blankType(types.length + 1))}>Add ticket type</button>
            </div>
            {types.length === 0 && <p className="text-sm text-ink-soft">No ticket types yet.</p>}
            <ul className="space-y-2">
              {types.map((t) => (
                <li key={t.id} className="rounded-2xl border border-line p-3 pl-4 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold break-any">{t.group}: {t.name || 'unnamed'}</p>
                    <p className="text-sm text-ink-soft num">{rands(t.price)}{t.seats > 1 ? ` · admits ${t.seats}` : ''} · {t.sold}/{t.capacity} sold{t.comingSoon ? ' · coming soon' : ''}</p>
                  </div>
                  <button type="button" className="icon-btn icon-btn-ghost" aria-label={`Edit ${t.name || 'ticket type'}`} onClick={() => setEditingType(t)}><Pencil aria-hidden /></button>
                  <button type="button" className="icon-btn icon-btn-danger" aria-label={`Remove ${t.name || 'ticket type'}`} disabled={t.sold > 0} title={t.sold > 0 ? 'Tickets of this type were sold' : undefined} onClick={() => setTypes(types.filter((x) => x.id !== t.id))}><Trash2 aria-hidden /></button>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <div className="even-row [--even-min:10rem]">
          <button className="btn btn-primary btn-lg" disabled={busy}>{busy && <Spinner label="Saving" />} Save event</button>
          <Link to="/dashboard/events" className="btn btn-outline btn-lg">Cancel</Link>
        </div>
      </form>
      <TicketTypeDialog
        value={editingType}
        all={types}
        onClose={() => setEditingType(null)}
        onSave={(t) => {
          setTypes((cur) => (cur.some((x) => x.id === t.id) ? cur.map((x) => (x.id === t.id ? t : x)) : [...cur, t]).sort((a, b) => a.order - b.order));
          setEditingType(null);
        }}
      />
    </>
  );
}
