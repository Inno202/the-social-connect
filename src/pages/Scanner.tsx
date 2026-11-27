import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { collection, doc, getDoc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import jsQR from 'jsqr';
import { ArrowLeft, CheckCircle2, WifiOff, XCircle } from 'lucide-react';
import { useAuth, can } from '../lib/auth';
import { db } from '../lib/firebase';
import { useEvents } from '../lib/data';
import { isPast } from '../lib/eventState';
import { HoldGuard, parseCode, resultDuration, verdict, type Verdict } from '../lib/scan';
import { logActivity } from '../lib/activity';
import { shortDate } from '../lib/format';
import { Spinner } from '../components/ui';
import { useTitle } from '../lib/useTitle';
import type { Ticket } from '../lib/types';

type Mode = 'camera' | 'type';

/** The one live camera stream. Starting a new one always stops the old one first. */
let liveStream: MediaStream | null = null;
function stopCamera() {
  liveStream?.getTracks().forEach((t) => t.stop());
  liveStream = null;
}

export default function Scanner() {
  useTitle('Door scanner');
  const { profile, ready, user } = useAuth();
  const { events } = useEvents({ includeDrafts: true });
  const choices = useMemo(
    () => (events ?? []).filter((e) => e.sellMode === 'site' && e.status === 'published' && !isPast(e)).sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    [events],
  );
  const [eventId, setEventId] = useState('');
  const [mode, setMode] = useState<Mode>('camera');
  const [tickets, setTickets] = useState<Map<string, Ticket>>(new Map());
  const [listReady, setListReady] = useState(false);
  const [result, setResult] = useState<(Verdict & { key: number }) | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [frame, setFrame] = useState<'idle' | 'ok' | 'bad'>('idle');
  const [camState, setCamState] = useState<'starting' | 'on' | 'blocked' | 'off'>('off');
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const usedHere = useRef(new Set<string>());
  const guard = useRef(new HoldGuard(1500));
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timers = useRef<number[]>([]);
  const processing = useRef(false);

  // Default to the first event, but never override an event the person has already picked.
  useEffect(() => {
    if (choices[0]) setEventId((cur) => cur || choices[0].id);
  }, [choices]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // The event's whole ticket list is kept on the device, so scanning works without signal.
  useEffect(() => {
    if (!db || !eventId || !can.scan(profile?.role)) return;
    setListReady(false);
    usedHere.current = new Set();
    return onSnapshot(query(collection(db, 'tickets'), where('eventId', '==', eventId)), (snap) => {
      const m = new Map<string, Ticket>();
      snap.docs.forEach((d) => m.set(d.id, { ...(d.data() as Ticket), id: d.id }));
      setTickets(m);
      setListReady(true);
    });
  }, [eventId, profile?.role]);

  const event = choices.find((e) => e.id === eventId);

  const show = useCallback((v: Verdict) => {
    timers.current.forEach(clearTimeout);
    setLeaving(false);
    setResult({ ...v, key: Date.now() });
    setFrame(v.ok ? 'ok' : 'bad');
    const ms = resultDuration(v);
    timers.current = [
      window.setTimeout(() => setLeaving(true), ms - 300),
      window.setTimeout(() => { setResult(null); setFrame('idle'); setLeaving(false); }, ms),
    ];
  }, []);

  const check = useCallback(
    async (raw: string) => {
      if (processing.current || !db || !event) return;
      const id = parseCode(raw);
      if (!id) return show({ ok: false, reason: 'invalid', title: 'Not an MSB ticket', detail: 'This code is not an MSB Events ticket.' });
      processing.current = true;
      try {
        let t = tickets.get(id) ?? null;
        if (!t && navigator.onLine) {
          // Not in this event's list: look it up so a ticket for another event says so.
          try {
            const snap = await getDoc(doc(db, 'tickets', id));
            if (snap.exists()) t = { ...(snap.data() as Ticket), id };
          } catch { /* not readable: treated as not found */ }
        }
        if (t && usedHere.current.has(id)) t = { ...t, status: 'used' };
        const v = verdict(t, event, event.id);
        if (v.ok && t) {
          usedHere.current.add(id);
          // Queued by Firestore when offline; the database rules stamp the server time when it syncs.
          updateDoc(doc(db, 'tickets', id), { status: 'used', usedAt: serverTimestamp(), usedBy: user!.uid }).catch(() => {
            usedHere.current.delete(id);
          });
          void logActivity('Scanned ticket in', event.title, id);
        }
        show(v);
      } finally {
        processing.current = false;
      }
    },
    [tickets, event, show, user],
  );

  const checkRef = useRef(check);
  checkRef.current = check;
  const hasEvent = Boolean(event);

  // Camera: started only in camera mode with an event chosen; always stopped on leave or mode switch.
  useEffect(() => {
    if (mode !== 'camera' || !hasEvent || !can.scan(profile?.role)) return;
    let cancelled = false;
    let raf = 0;
    let last = 0;
    setCamState('starting');
    stopCamera();
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } }, audio: false })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        stopCamera();
        liveStream = stream;
        const v = videoRef.current!;
        v.srcObject = stream;
        // play() is cut short when the camera view closes mid-start (switching camera, leaving): that is expected, not an error.
        v.play().catch(() => undefined);
        setCamState('on');
        const tick = (ts: number) => {
          if (cancelled) return;
          raf = requestAnimationFrame(tick);
          if (ts - last < 120 || v.readyState < 2) return;
          last = ts;
          const c = canvasRef.current!;
          const size = Math.min(v.videoWidth, v.videoHeight);
          if (!size) return;
          const S = 480;
          c.width = S;
          c.height = S;
          const ctx = c.getContext('2d', { willReadFrequently: true })!;
          ctx.drawImage(v, (v.videoWidth - size) / 2, (v.videoHeight - size) / 2, size, size, 0, 0, S, S);
          const img = ctx.getImageData(0, 0, S, S);
          const code = jsQR(img.data, S, S, { inversionAttempts: 'dontInvert' });
          // A code held in view is checked once; it is accepted again only after leaving the view.
          if (code?.data && guard.current.accept(code.data)) void checkRef.current(code.data);
        };
        raf = requestAnimationFrame(tick);
      })
      .catch(() => !cancelled && setCamState('blocked'));
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stopCamera();
      setCamState('off');
    };
  }, [mode, hasEvent, eventId, profile?.role]);

  useEffect(() => () => { timers.current.forEach(clearTimeout); stopCamera(); }, []);

  if (!ready) return <div className="screen-full bg-ink grid place-items-center text-white"><Spinner className="size-6" label="Loading" /></div>;
  if (!user) return <Navigate to="/account?next=/scan" replace />;
  if (!can.scan(profile?.role))
    return (
      <div className="screen-full bg-ink text-white grid place-items-center p-6 text-center">
        <div>
          <h1 className="t-title">Staff <span className="text-lime">only</span></h1>
          <p className="mt-3 text-white/80">The door scanner is for MSB door staff.</p>
          <Link to="/" className="btn btn-accent mt-6">Go to the home page</Link>
        </div>
      </div>
    );

  const frameColor = frame === 'ok' ? 'border-green-500' : frame === 'bad' ? 'border-red-500' : 'border-white/80';
  const usedCount = [...tickets.values()].filter((t) => t.status === 'used').length;

  return (
    <div className="screen-full bg-ink text-white flex flex-col overflow-hidden">
      <h1 className="sr-only">Door scanner</h1>
      <div className="mx-auto w-full max-w-md px-4 pt-3 flex items-center gap-2 shrink-0">
        <Link to="/dashboard" className="icon-btn icon-btn-ghost-light" aria-label="Back to the dashboard"><ArrowLeft aria-hidden /></Link>
        <label className="sr-only" htmlFor="scan-event">Event</label>
        <select
          id="scan-event"
          value={eventId}
          onChange={(e) => { setEventId(e.target.value); guard.current.reset(); }}
          className="field field-dark field-pill flex-1 min-w-0 font-semibold truncate"
        >
          {choices.length === 0 && <option value="">No events to scan</option>}
          {choices.map((e) => <option key={e.id} value={e.id}>{e.shortTitle} · {shortDate(e.startsAt)}</option>)}
        </select>
      </div>

      <div className="mx-auto w-full max-w-md px-4 mt-3 shrink-0">
        <div role="group" aria-label="Scan mode" className="even-cols">
          <button type="button" aria-pressed={mode === 'camera'} onClick={() => setMode('camera')} className="btn btn-chip-light">Camera</button>
          <button type="button" aria-pressed={mode === 'type'} onClick={() => setMode('type')} className="btn btn-chip-light">Type</button>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 text-sm text-white/75 min-h-[1.5rem]">
          <span aria-live="polite" className="num">{listReady ? `${usedCount} in · ${tickets.size} tickets` : 'Loading tickets'}</span>
          {!online && <span className="inline-flex items-center gap-1.5 text-lime"><WifiOff className="size-4" aria-hidden /> No signal: scans sync later</span>}
        </div>
      </div>

      <div className="tool-body flex-1 min-h-0 px-4 pt-3 pb-4">
        {mode === 'camera' ? (
          <div className="tool-stage">
            <div className={`tool-frame relative frame !bg-charcoal border-4 transition-colors duration-200 ${frameColor}`}>
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted aria-label="Camera view" />
              <div className={`pointer-events-none absolute inset-[18%] rounded-2xl border-4 transition-colors duration-200 ${frameColor}`} aria-hidden />
              {camState === 'starting' && <p className="absolute inset-0 grid place-items-center text-white/80"><span className="inline-flex items-center gap-2"><Spinner label="Starting the camera" /> Starting the camera</span></p>}
              {camState === 'blocked' && (
                <div className="absolute inset-0 grid place-items-center p-6 text-center bg-charcoal">
                  <div>
                    <p>Camera access is blocked. Allow the camera for this site in the browser settings, then tap Try again.</p>
                    <button type="button" className="btn btn-accent mt-4" onClick={() => { setMode('type'); setTimeout(() => setMode('camera'), 50); }}>Try again</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <form
            className="tool-stage rounded-[var(--radius-xl)] bg-white/5 p-5 space-y-3"
            onSubmit={async (e) => { e.preventDefault(); if (!typed.trim()) return; setBusy(true); await check(typed); setBusy(false); setTyped(''); }}
          >
            <label htmlFor="code" className="field-label text-white">Ticket code</label>
            <input id="code" value={typed} onChange={(e) => setTyped(e.target.value)} className="field font-mono" autoComplete="off" autoCapitalize="off" spellCheck={false} placeholder="Code printed under the QR" />
            <button className="btn btn-accent btn-block" disabled={busy}>{busy && <Spinner label="Checking ticket" />} Check ticket</button>
          </form>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="fixed inset-x-0 bottom-0 pointer-events-none" aria-live="assertive">
        {result && (
          <div key={result.key} className="scan-result mx-auto max-w-md px-4 pb-4" data-leaving={leaving}>
            <div className={`rounded-[var(--radius-xl)] p-5 shadow-2xl ${result.ok ? 'bg-green-700' : 'bg-red-700'} text-white`} data-testid="scan-result" data-ok={result.ok}>
              <div className="flex items-center gap-3">
                {result.ok ? <CheckCircle2 className="size-9 shrink-0" aria-hidden /> : <XCircle className="size-9 shrink-0" aria-hidden />}
                <div className="min-w-0">
                  <p className="t-section">{result.title}</p>
                  <p className="text-white/95 font-medium break-any">{result.detail}</p>
                </div>
              </div>
              <div className="mt-4 h-1 rounded-full bg-white/30 overflow-hidden"><div className="scan-timer h-full bg-white" style={{ ['--ms' as string]: `${resultDuration(result)}ms` }} /></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
