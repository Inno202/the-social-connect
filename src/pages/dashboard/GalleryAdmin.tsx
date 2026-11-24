import { useState } from 'react';
import { addDoc, collection, deleteDoc, doc } from 'firebase/firestore';
import { Trash2, Upload } from 'lucide-react';
import { db } from '../../lib/firebase';
import { useGallery, posterSrc } from '../../lib/data';
import { cloudinaryReady, isSafeImageUrl, uploadImage, checkImage } from '../../lib/cloudinary';
import { Spinner, confirmAction, toast } from '../../components/ui';
import { logActivity } from '../../lib/activity';

export default function GalleryAdmin() {
  const items = useGallery();
  const [src, setSrc] = useState('');
  const [alt, setAlt] = useState('');
  const [group, setGroup] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!db) return;
    if (!isSafeImageUrl(src)) return toast('Upload a photo or paste a Cloudinary link.', 'error');
    if (!alt.trim() || !group.trim()) return toast('Describe the photo and name the event.', 'error');
    setBusy(true);
    try {
      await addDoc(collection(db, 'gallery'), { src, alt: alt.trim(), group: group.trim(), year, order: Date.now() % 1_000_000 });
      await logActivity('Added gallery photo', group, alt);
      setSrc(''); setAlt('');
      toast('Photo added to the gallery.');
    } catch { toast('The photo could not be added.', 'error'); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <h2 className="display text-4xl">Gallery</h2>
      <form onSubmit={add} className="panel p-6 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
          <label className="btn btn-outline">
            {busy ? <Spinner /> : <Upload className="size-4" aria-hidden />} Upload photo
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={async (e) => {
              const f = e.target.files?.[0]; if (!f) return;
              const bad = checkImage(f); if (bad) return toast(bad, 'error');
              setBusy(true);
              try { setSrc(await uploadImage(f, 'gallery')); } catch (err) { toast((err as Error).message, 'error'); } finally { setBusy(false); }
            }} />
          </label>
          {!cloudinaryReady && <span className="field-help">Uploads switch on once Cloudinary is set up; paste a link until then.</span>}
        </div>
        <div className="sm:col-span-2"><label htmlFor="g-src" className="field-label">Photo link</label><input id="g-src" className="field" value={src} onChange={(e) => setSrc(e.target.value)} placeholder="https://res.cloudinary.com/…" /></div>
        <div><label htmlFor="g-group" className="field-label">Event</label><input id="g-group" className="field" value={group} onChange={(e) => setGroup(e.target.value)} placeholder="Spring Blow" /></div>
        <div><label htmlFor="g-year" className="field-label">Year</label><input id="g-year" type="number" className="field num" value={year} onChange={(e) => setYear(Math.round(Number(e.target.value)))} /></div>
        <div className="sm:col-span-2"><label htmlFor="g-alt" className="field-label">What is in the photo</label><input id="g-alt" className="field" value={alt} maxLength={200} onChange={(e) => setAlt(e.target.value)} placeholder="The crowd at the main stage at sunset" /></div>
        <button className="btn btn-primary sm:col-span-2 justify-self-start" disabled={busy}>Add to gallery</button>
      </form>
      <ul className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(items ?? []).map((g) => (
          <li key={g.id} className="relative">
            <img src={posterSrc(g.src, 'sm')} alt={g.alt} className="aspect-square w-full object-cover rounded-3xl bg-mist" loading="lazy" />
            <p className="mt-1 text-sm font-semibold line-clamp-1">{g.group} {g.year}</p>
            <button type="button" className="icon-btn absolute top-2 right-2 bg-white text-danger" aria-label={`Remove photo: ${g.alt}`} onClick={async () => {
              if (!db || !(await confirmAction({ title: 'Remove this photo?', message: 'It will no longer show in the gallery.', confirmLabel: 'Remove photo', tone: 'danger' }))) return;
              try { await deleteDoc(doc(db, 'gallery', g.id)); await logActivity('Removed gallery photo', g.group, g.alt); toast('Photo removed.'); } catch { toast('The photo could not be removed.', 'error'); }
            }}><Trash2 className="size-4" aria-hidden /></button>
          </li>
        ))}
      </ul>
    </div>
  );
}
