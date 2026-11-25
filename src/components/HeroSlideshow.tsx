import { useEffect, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { heroImg } from '../lib/data';

/** Full photo slideshow. No text or buttons on the photos: only pause and dots.
 *  Each slide's photo loads only when its turn is near (current, next and previous). */
export function HeroSlideshow({ slides, interval = 6000 }: { slides: { src: string; alt: string; position?: string }[]; interval?: number }) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const n = slides.length;

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setPlaying(false);
  }, []);
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => setI((x) => (x + 1) % n), interval);
    return () => clearTimeout(t);
  }, [i, playing, n, interval]);

  return (
    <section aria-roledescription="carousel" aria-label="MSB Events photos" className="px-3 sm:px-4 pt-3 sm:pt-4">
      <h1 className="sr-only">MSB Events, Matjhabeng</h1>
      <div className="relative band h-[calc(100svh-200px)] min-h-[340px] max-h-[860px]">
        {slides.map((s, k) => {
          const near = k === i || k === (i + 1) % n || k === (i - 1 + n) % n;
          const img = heroImg(s.src);
          return (
            <div key={s.src} className="slide absolute inset-0" data-active={k === i} aria-hidden={k !== i} role="group" aria-roledescription="slide" aria-label={`${k + 1} of ${n}`}>
              {near && (
                <img
                  src={img.src}
                  srcSet={img.srcSet}
                  sizes="100vw"
                  width={img.width}
                  height={img.height}
                  alt={s.alt}
                  className="w-full h-full object-cover"
                  style={s.position ? { objectPosition: s.position } : undefined}
                  loading={k === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  {...(k === 0 ? { fetchpriority: 'high' } : {})}
                />
              )}
            </div>
          );
        })}
        {/* One pill: slide dots, then play / pause at the end. */}
        <div className="absolute bottom-3 right-3 flex items-center rounded-full bg-ink/60 backdrop-blur-sm px-1">
          {slides.map((s, k) => (
            <button key={s.src} type="button" onClick={() => setI(k)} className="icon-btn icon-btn-ghost-light" aria-label={`Show photo ${k + 1}`} aria-current={k === i}>
              <span className="dot" data-on={k === i} aria-hidden />
            </button>
          ))}
          <button type="button" onClick={() => setPlaying(!playing)} className="icon-btn icon-btn-ghost-light" aria-label={playing ? 'Pause slideshow' : 'Play slideshow'}>
            {playing ? <Pause aria-hidden /> : <Play aria-hidden />}
          </button>
        </div>
      </div>
    </section>
  );
}
