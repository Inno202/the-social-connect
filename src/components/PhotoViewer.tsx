import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export interface ViewerPhoto { src: string; alt: string; caption?: string }

/** Full-screen viewer: arrows, arrow keys, swipe, Escape / X / tap outside to close. */
export function PhotoViewer({ photos, index, onClose, onIndex }: { photos: ViewerPhoto[]; index: number; onClose: () => void; onIndex: (i: number) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const touchX = useRef<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const n = photos.length;
  const go = (d: number) => onIndex((index + d + n) % n);

  useEffect(() => {
    const d = ref.current;
    const back = document.activeElement as HTMLElement | null;
    d?.showModal();
    return () => back?.focus?.();
  }, []);
  useEffect(() => setLoaded(false), [index]);
  useEffect(() => {
    [photos[(index + 1) % n], photos[(index - 1 + n) % n]].forEach((p) => {
      if (p) new Image().src = p.src;
    });
  }, [index, n, photos]);

  const p = photos[index];
  return (
    <dialog
      ref={ref}
      className="photo-viewer"
      aria-label="Photo viewer"
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') go(1);
        if (e.key === 'ArrowLeft') go(-1);
      }}
    >
      <div
        className="w-full h-full flex flex-col"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current == null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          touchX.current = null;
        }}
      >
        <div className="flex items-center justify-between p-3">
          <p className="text-sm text-white/80 num px-2" aria-live="polite">{index + 1} / {n}</p>
          <button type="button" className="viewer-btn" onClick={onClose} aria-label="Close viewer" autoFocus>
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <div className="flex-1 min-h-0 flex items-center justify-center px-2 sm:px-16 relative" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
          <img
            key={p.src}
            src={p.src}
            alt={p.alt}
            onLoad={() => setLoaded(true)}
            className={`photo-viewer-img max-w-full max-h-full object-contain rounded-xl transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          />
          {n > 1 && (
            <>
              <button type="button" className="viewer-btn absolute left-2 sm:left-4" onClick={() => go(-1)} aria-label="Previous photo">
                <ChevronLeft className="size-6" aria-hidden />
              </button>
              <button type="button" className="viewer-btn absolute right-2 sm:right-4" onClick={() => go(1)} aria-label="Next photo">
                <ChevronRight className="size-6" aria-hidden />
              </button>
            </>
          )}
        </div>
        <p className="p-4 text-center text-sm text-white/85 min-h-[3.5rem]">{p.caption ?? p.alt}</p>
      </div>
    </dialog>
  );
}
