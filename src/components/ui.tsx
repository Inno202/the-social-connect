import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, Info, Loader2, X, XCircle } from 'lucide-react';

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
        <div
          key={t.id}
          role={t.tone === 'error' ? 'alert' : 'status'}
          className="toast-in pointer-events-auto flex items-start gap-3 rounded-2xl bg-ink text-white px-4 py-3 shadow-xl"
        >
          {t.tone === 'success' ? <CheckCircle2 className="size-5 text-lime shrink-0 mt-0.5" aria-hidden /> : t.tone === 'error' ? <XCircle className="size-5 text-red-400 shrink-0 mt-0.5" aria-hidden /> : <Info className="size-5 text-white shrink-0 mt-0.5" aria-hidden />}
          <p className="text-sm font-medium">{t.text}</p>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Confirmation dialog ---------------- */
interface ConfirmOpts { title: string; message: string; confirmLabel: string; tone?: 'danger' | 'normal' }
let pending: (ConfirmOpts & { resolve: (v: boolean) => void }) | null = null;
const csubs = new Set<() => void>();

/** Site-wide replacement for window.confirm. */
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
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const returnTo = useRef<Element | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d || !current) return;
    returnTo.current = document.activeElement;
    if (!d.open) d.showModal();
    cancelRef.current?.focus();
  }, [current]);

  const close = (v: boolean) => {
    const p = pending;
    pending = null;
    ref.current?.close();
    csubs.forEach((s) => s());
    p?.resolve(v);
    (returnTo.current as HTMLElement | null)?.focus?.();
  };

  if (!current) return null;
  const danger = current.tone === 'danger';
  return (
    <dialog
      ref={ref}
      className="confirm-dialog"
      aria-labelledby="confirm-title"
      onCancel={(e) => { e.preventDefault(); close(false); }}
      onClick={(e) => { if (e.target === ref.current) close(false); }}
    >
      <div className="p-6">
        <div className="flex items-start gap-3">
          {danger && <AlertTriangle className="size-6 text-danger shrink-0" aria-hidden />}
          <div>
            <h2 id="confirm-title" className="text-xl font-bold">{current.title}</h2>
            <p className="mt-2 text-ink-soft">{current.message}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button ref={cancelRef} type="button" className="btn btn-outline" onClick={() => close(false)}>Cancel</button>
          <button type="button" className={`btn ${danger ? 'btn-danger-solid' : 'btn-primary'}`} onClick={() => close(true)}>{current.confirmLabel}</button>
        </div>
      </div>
    </dialog>
  );
}

/* ---------------- Small pieces ---------------- */
export function Spinner({ className = 'size-4' }: { className?: string }) {
  return <Loader2 className={`${className} animate-spin`} aria-hidden />;
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-mist ${className}`} aria-hidden />;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="panel p-8 text-center">
      <h2 className="display text-3xl">{title}</h2>
      {children && <div className="mt-3 text-ink-soft">{children}</div>}
    </div>
  );
}

export function CloseButton({ onClick, label = 'Close', className = '' }: { onClick: () => void; label?: string; className?: string }) {
  return (
    <button type="button" className={`icon-btn hover:bg-ink/10 ${className}`} onClick={onClick} aria-label={label}>
      <X className="size-5" aria-hidden />
    </button>
  );
}

export function Portal({ children }: { children: ReactNode }) {
  const [el, setEl] = useState<Element | null>(null);
  useEffect(() => setEl(document.body), []);
  return el ? createPortal(children, el) : null;
}
