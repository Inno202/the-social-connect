import { useState } from 'react';
import { addDoc, collection, deleteDoc, doc } from 'firebase/firestore';
import { Trash2 } from 'lucide-react';
import { db } from '../../lib/firebase';
import { useGallery, posterImg } from '../../lib/data';
import { cloudinaryReady, isSafeImageUrl, uploadImage, checkImage } from '../../lib/cloudinary';
import { CharCount, Dialog, Spinner, confirmAction, toast } from '../../components/ui';
import { logActivity } from '../../lib/activity';

/** Staff form dialog for adding a gallery photo. */
function AddPhotoDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [src, setSrc] = useState('');
  const [alt, setAlt] = useState('');
  const [group, setGroup] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [busy, setBusy] = useState<'' | 'upload' | 'save'>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!isSafeImageUrl(src)) errs['g-src'] = 'Upload a photo or paste a Cloudinary link.';
    if (!group.trim()) errs['g-group'] = 'Name the event, for example “Spring Blow”.';
    if (!alt.trim()) errs['g-alt'] = 'Describe what is in the photo.';
    setErrors(errs);
    const first = Object.keys(errs)[0];
    if (first || !db) { if (first) document.getElementById(first)?.focus(); return; }
    setBusy('save');
    try {
      await addDoc(collection(db, 'gallery'), { src, alt: alt.trim(), group: group.trim(), year, order: Date.now() % 1_000_000 });
      await logActivity('Added gallery photo', group, alt);
      setSrc(''); setAlt('');
      toast('Photo added to the gallery.');
      onClose();
    } catch { toast('The photo could not be added.', 'error'); } finally { setBusy(''); }
  }
  const e = (k: string) => (errors[k] ? { 'aria-invalid': true, 'aria-describedby': `${k}-err` } : {});

  return (
    <Dialog
      open={open}
      onClose={onClose}
      wide
      title="Add a photo"
      footer={
        <div className="even-row [--even-min:9rem]">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" form="photo-form" className="btn btn-primary" disabled={!!busy}>{busy === 'save' && <Spinner label="Adding photo" />} Add to gallery</button>
        </div>
      }
    >
      <form id="photo-form" noValidate onSubmit={add} className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-start">
        <div className="sm:col-span-2 space-y-2">
          <label className="btn btn-outline" aria-disabled={!cloudinaryReady}>
            {busy === 'upload' && <Spinner label="Uploading" />} Upload photo
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={!cloudinaryReady || !!busy} onChange={async (ev) => {
              const f = ev.target.files?.[0]; if (!f) return;
              const bad = checkImage(f); if (bad) return toast(bad, 'error');
              setBusy('upload');
              try { setSrc(await uploadImage(f, 'gallery')); } catch (err) { toast((err as Error).message, 'error'); } finally { setBusy(''); }
            }} />
          </label>
          {!cloudinaryReady && <p className="field-help">Uploads switch on once Cloudinary is set up; paste a link until then.</p>}
        </div>
        <div className="sm:col-span-2 min-w-0">
          <label htmlFor="g-src" className="field-label">Photo link</label>
          <input id="g-src" type="url" inputMode="url" className="field" value={src} onChange={(ev) => setSrc(ev.target.value)} placeholder="https://res.cloudinary.com/…" {...e('g-src')} />
          {errors['g-src'] && <p id="g-src-err" className="field-error">{errors['g-src']}</p>}
        </div>
        <div className="min-w-0">
          <label htmlFor="g-group" className="field-label">Event</label>
          <input id="g-group" className="field" value={group} maxLength={60} placeholder="Spring Blow" onChange={(ev) => setGroup(ev.target.value)} {...e('g-group')} />
          {errors['g-group'] && <p id="g-group-err" className="field-error">{errors['g-group']}</p>}
        </div>
        <div className="min-w-0">
          <label htmlFor="g-year" className="field-label">Year</label>
          <input id="g-year" type="number" inputMode="numeric" className="field num" aria-describedby="g-year-hint" value={year} onChange={(ev) => setYear(Math.round(Number(ev.target.value)))} />
          <p id="g-year-hint" className="mt-1 text-sm text-ink-soft">Use 0 if you do not know the year.</p>
        </div>
        <div className="sm:col-span-2 min-w-0">
          <label htmlFor="g-alt" className="field-label">What is in the photo</label>
          <textarea id="g-alt" rows={3} className="field" value={alt} maxLength={200} onChange={(ev) => setAlt(ev.target.value)} placeholder="The crowd at the main stage at sunset" {...e('g-alt')} />
          {errors['g-alt'] ? <p id="g-alt-err" className="field-error">{errors['g-alt']}</p> : <CharCount value={alt} max={200} />}
        </div>
      </form>
    </Dialog>
  );
}

export default function GalleryAdmin() {
  const items = useGallery();
  const [adding, setAdding] = useState(false);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="t-section">Gallery</h2>
        <button type="button" className="btn btn-primary shrink-0" onClick={() => setAdding(true)}>Add a photo</button>
      </div>
      <ul className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(items ?? []).map((g) => {
          const img = posterImg(g.src);
          return (
            <li key={g.id} className="relative min-w-0">
              <div className="frame aspect-square">
                {img && <img src={img.src} srcSet={img.srcSet} sizes="(min-width: 768px) 25vw, 50vw" width={img.width} height={img.height} alt={g.alt} className="w-full h-full object-cover" loading="lazy" decoding="async" />}
              </div>
              <p className="mt-1 text-sm font-semibold line-clamp-1">{g.group} {g.year > 0 ? g.year : ''}</p>
              <button type="button" className="icon-btn icon-btn-light absolute top-2 right-2 text-danger" aria-label={`Remove photo: ${g.alt}`} onClick={async () => {
                if (!db || !(await confirmAction({ title: 'Remove this photo?', message: 'It will no longer show in the gallery.', confirmLabel: 'Remove photo', tone: 'danger' }))) return;
                try { await deleteDoc(doc(db, 'gallery', g.id)); await logActivity('Removed gallery photo', g.group, g.alt); toast('Photo removed.'); } catch { toast('The photo could not be removed.', 'error'); }
              }}><Trash2 aria-hidden /></button>
            </li>
          );
        })}
      </ul>
      <AddPhotoDialog open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}
