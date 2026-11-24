import { useEffect, useState } from 'react';
import { Pause, Play } from 'lucide-react';

/** Full photo slideshow. No text or buttons on the photos: only pause and dots. */
export function HeroSlideshow({ slides, interval = 6000 }: { slides: { src: string; alt: string }[]; interval?: number }) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setPlaying(false);
  }, []);
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => setI((x) => (x + 1) % slides.length), interval);
    return () => clearTimeout(t);
  }, [i, playing, slides.length, interval]);

  return (
    <section aria-roledescription="carousel" aria-label="MSB Events photos" className="px-3 sm:px-4 pt-3 sm:pt-4">
      <h1 className="sr-only">MSB Events, Matjhabeng</h1>
      <div className="relative overflow-hidden rounded-[2rem] bg-ink h-[62vh] min-h-[340px] max-h-[760px]">
        {slides.map((s, n) => (
          <div key={s.src} className="slide absolute inset-0" data-active={n === i} aria-hidden={n !== i} role="group" aria-roledescription="slide" aria-label={`${n + 1} of ${slides.length}`}>
            <img src={s.src} alt={s.alt} className="w-full h-full object-cover" loading={n === 0 ? 'eager' : 'lazy'} {...{ fetchpriority: n === 0 ? 'high' : 'auto' }} />
          </div>
        ))}
        <div className="absolute bottom-4 inset-x-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPlaying(!playing)}
            className="icon-btn bg-ink/70 text-white hover:bg-ink backdrop-blur"
            aria-label={playing ? 'Pause slideshow' : 'Play slideshow'}
          >
            {playing ? <Pause className="size-5" aria-hidden /> : <Play className="size-5" aria-hidden />}
          </button>
          <div className="flex items-center gap-0.5 rounded-full bg-ink/70 backdrop-blur px-1">
            {slides.map((s, n) => (
              <button
                key={s.src}
                type="button"
                onClick={() => setI(n)}
                className="w-[44px] h-[44px] grid place-items-center"
                aria-label={`Show photo ${n + 1}`}
                aria-current={n === i}
              >
                <span className={`block h-2.5 rounded-full transition-all duration-300 ${n === i ? 'w-6 bg-lime' : 'w-2.5 bg-white/70'}`} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
