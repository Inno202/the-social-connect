import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode, type InputHTMLAttributes } from 'react';
import { AlertTriangle, CheckCircle2, Eye, EyeOff, Info, Loader2, X, XCircle } from 'lucide-react';

/* ---------------- Back button closes overlays ---------------- */
let ignorePops = 0;
/**
 * While `open` is true, the phone's back button closes the overlay (viewer, dialog, menu, ticket)
 * instead of leaving the page. Closing it another way removes the extra history step again.
 */
export function useBackClose(open: boolean, close: () => void) {
  const closeRef = useRef(close);
  closeRef.current = close;
  const wantOpen = useRef(false);
  const entry = useRef<string | null>(null);
  useEffect(() => {
    if (!open || typeof window === 'undefined') return;
    wantOpen.current = true;
    // Reuse our history step if it is still the current one (React may re-run this effect).
    if (!(entry.current && window.history.state?.__overlay === entry.current)) {
      entry.current = Math.random().toString(36).slice(2);
      window.history.pushState({ ...(window.history.state ?? {}), __overlay: entry.current }, '');
    }
    const id = entry.current;
    let popped = false;
    const onPop = () => {
      if (ignorePops > 0) { ignorePops--; return; }
      if (window.history.state?.__overlay === id) return;
      popped = true;
      entry.current = null;
      closeRef.current();
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      wantOpen.current = false;
      setTimeout(() => {
        if (wantOpen.current) return;
        // Closed with X, Escape or a tap outside: remove the extra step so Back still leaves the page next.
        if (!popped && window.history.state?.__overlay === id) {
          ignorePops++;
          window.history.back();
        }
        if (entry.current === id) entry.current = null;
      }, 0);
    };
  }, [open]);
}

/* ---------------- Toasts ---------------- */
type Tone = 'success' | 'info' | 'error';
interface ToastItem { id: number; tone: Tone; text: string }
let toasts: ToastItem[] = [];
let nextId = 1;
const subs = new Set<() => void>();
const emit = () => subs.forEach((s) => s());

export function toast(text: string, tone: Tone = 'success') {
  const id = nextId++;
  toasts = [...toasts, { id, tone, text }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, tone === 'error' ? 7000 : 3800);
}

const noToasts: ToastItem[] = [];
export function Toasts() {
  const list = useSyncExternalStore(
    (fn) => { subs.add(fn); return () => subs.delete(fn); },
    () => toasts,
    () => noToasts,
  );
  return (
    <div className="fixed z-[200] bottom-4 inset-x-4 sm:inset-x-auto sm:right-4 sm:w-96 flex flex-col gap-2 pointer-events-none">
      {list.map((t) => (
        <div key={t.id} role={t.tone === 'error' ? 'alert' : 'status'} className="toast-in pointer-events-auto flex items-start gap-3 rounded-2xl bg-ink text-white px-4 py-3 shadow-xl">
          {t.tone === 'success' ? <CheckCircle2 className="size-5 text-lime shrink-0 mt-0.5" aria-hidden /> : t.tone === 'error' ? <XCircle className="size-5 text-red-400 shrink-0 mt-0.5" aria-hidden /> : <Info className="size-5 text-white shrink-0 mt-0.5" aria-hidden />}
          <p className="text-sm font-medium">{t.text}</p>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Native dialog with a fixed header and footer ---------------- */
export function Dialog({
  open, onClose, title, children, footer, wide = false, labelledBy, initialFocus,
}: {
  open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean; labelledBy?: string; initialFocus?: React.RefObject<HTMLElement | null>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useRef(`dlg-${Math.random().toString(36).slice(2, 8)}`).current;
  useBackClose(open, onClose);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      const back = document.activeElement as HTMLElement | null;
      d.showModal();
      initialFocus?.current?.focus();
      return () => back?.focus?.();
    }
    if (!open && d.open) d.close();
  }, [open, initialFocus]);
  if (!open) return null;
  return (
    <dialog
      ref={ref}
      className={`dialog ${wide ? 'dialog-wide' : ''}`}
      aria-labelledby={labelledBy ?? (title ? titleId : undefined)}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
    >
      <div className="dialog-head flex items-start justify-between gap-3">
        {title ? <h2 id={titleId} className="t-card min-w-0">{title}</h2> : <span />}
        <button type="button" className="icon-btn icon-btn-ghost -mt-1 -mr-2" onClick={onClose} aria-label="Close"><X aria-hidden /></button>
      </div>
      <div className="dialog-body">{children}</div>
      {footer && <div className="dialog-foot">{footer}</div>}
    </dialog>
  );
}

/* ---------------- Confirmation dialog (replaces window.confirm) ---------------- */
interface ConfirmOpts { title: string; message: string; confirmLabel: string; tone?: 'danger' | 'normal' }
let pending: (ConfirmOpts & { resolve: (v: boolean) => void }) | null = null;
const csubs = new Set<() => void>();

export function confirmAction(opts: ConfirmOpts): Promise<boolean> {
  return new Promise((resolve) => {
    pending = { ...opts, resolve };
    csubs.forEach((s) => s());
  });
}

export function ConfirmHost() {
  const current = useSyncExternalStore(
    (fn) => { csubs.add(fn); return () => csubs.delete(fn); },
    () => pending,
    () => null,
  );
  const cancelRef = useRef<HTMLButtonElement>(null);
  const close = (v: boolean) => {
    const p = pending;
    pending = null;
    csubs.forEach((s) => s());
    p?.resolve(v);
  };
  const danger = current?.tone === 'danger';
  return (
    <Dialog
      open={!!current}
      onClose={() => close(false)}
      labelledBy="confirm-title"
      initialFocus={cancelRef}
      footer={
        <div className="even-cols">
          <button ref={cancelRef} type="button" className="btn btn-outline" onClick={() => close(false)}>Cancel</button>
          <button type="button" className={`btn ${danger ? 'btn-danger-solid' : 'btn-primary'}`} onClick={() => close(true)}>{current?.confirmLabel}</button>
        </div>
      }
    >
      <div className="flex items-start gap-3">
        {danger && <AlertTriangle className="size-6 text-danger shrink-0" aria-hidden />}
        <div className="min-w-0">
          <h2 id="confirm-title" className="text-xl font-bold">{current?.title}</h2>
          <p className="mt-2 text-ink-soft">{current?.message}</p>
        </div>
      </div>
    </Dialog>
  );
}

/* ---------------- Small pieces ---------------- */
/** Spinner shown inside a busy button. */
export function Spinner({ className = 'size-4', label = 'Working' }: { className?: string; label?: string }) {
  return (
    <span role="status" aria-label={label} className="inline-flex">
      <Loader2 className={`${className} animate-spin`} aria-hidden />
    </span>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-mist ${className}`} aria-hidden />;
}

/** Password field with a 44px show / hide button inside, on the right. */
export function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={show ? 'text' : 'password'} className={`field field-icon-r ${props.className ?? ''}`} />
      <button
        type="button"
        className="icon-btn icon-btn-ghost absolute right-1 top-1/2 -translate-y-1/2"
        onClick={() => setShow(!show)}
        aria-label={show ? 'Hide password' : 'Show password'}
        aria-pressed={show}
      >
        {show ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
      </button>
    </div>
  );
}

/** "120 / 300" under long text fields. */
export function CharCount({ value, max, id }: { value: string; max: number; id?: string }) {
  return (
    <p id={id} className="field-help text-right num" aria-live="polite">
      {value.length} / {max}
    </p>
  );
}
