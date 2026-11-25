import { useMemo, useState } from 'react';
import { Expand } from 'lucide-react';
import { PageHero } from '../components/Layout';
import { PhotoViewer } from '../components/PhotoViewer';
import { useGallery, posterImg } from '../lib/data';
import { useTitle } from '../lib/useTitle';

export default function Gallery() {
  useTitle('Gallery');
  const items = useGallery();
  const [open, setOpen] = useState<number | null>(null);

  // Grouped by year (newest first), then by event.
  const { groups, flat } = useMemo(() => {
    // Undated photos come last; within them the general "MSB events" set comes after the named events.
    const general = (g: { group: string }) => (g.group === 'MSB events' ? 1 : 0);
    const sorted = [...(items ?? [])].sort((a, b) => b.year - a.year || general(a) - general(b) || a.group.localeCompare(b.group) || a.order - b.order);
    const groups: { key: string; year: number; group: string; idx: number[] }[] = [];
    sorted.forEach((g, i) => {
      const key = `${g.year}-${g.group}`;
      let grp = groups.find((x) => x.key === key);
      if (!grp) groups.push((grp = { key, year: g.year, group: g.group, idx: [] }));
      grp.idx.push(i);
    });
    return { groups, flat: sorted };
  }, [items]);
  const photos = flat.map((g) => {
    const img = posterImg(g.src);
    return { src: img?.src ?? '', srcSet: img?.srcSet, alt: g.alt, caption: `${g.group}${g.year ? ` ${g.year}` : ''}: ${g.alt}` };
  });

  return (
    <>
      <PageHero title="Gallery" photo="/photos/festival-crowd-rain-sunset" position="center 70%" />
      <div className="wrap py-12 md:py-16 space-y-14">
        {!items && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3" aria-hidden>
            {Array.from({ length: 8 }, (_, n) => <div key={n} className="aspect-square rounded-[var(--radius-xl)] bg-mist animate-pulse" />)}
          </div>
        )}
        {items && items.length === 0 && <p className="text-ink-soft">Photos from our events will appear here.</p>}
        {groups.map((g) => (
          <section key={g.key} aria-labelledby={`g-${g.key}`}>
            <h2 id={`g-${g.key}`} className="t-section mb-5">
              {g.group} {g.year > 0 && <span className="text-leaf num">{g.year}</span>}
            </h2>
            <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {g.idx.map((i) => (
                <li key={flat[i].id}>
                  <button type="button" onClick={() => setOpen(i)} className="tap-card zoomable group frame aspect-square relative" aria-label={`Open photo: ${flat[i].alt}`}>
                    <img src={photos[i].src} srcSet={photos[i].srcSet} sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw" width={posterImg(flat[i].src)?.width} height={posterImg(flat[i].src)?.height} alt={flat[i].alt} loading="lazy" decoding="async" className="photo-zoom w-full h-full object-cover" />
                    <span className="zoom-hint icon-btn icon-btn-glass absolute top-2 right-2" aria-hidden><Expand /></span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {open !== null && photos[open] && <PhotoViewer photos={photos} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />}
    </>
  );
}
