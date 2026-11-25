const cloud = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;
const preset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined;

export const cloudinaryReady = Boolean(cloud && preset);
export const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_BYTES = 8 * 1024 * 1024;

export function checkImage(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return 'Use a JPG, PNG or WebP image.';
  if (file.size > MAX_BYTES) return 'Images must be smaller than 8 MB.';
  return null;
}

/** Uploads to an unsigned preset that is limited (in the Cloudinary console) to images in one folder. */
export async function uploadImage(file: File, folder: 'posters' | 'gallery' | 'lineup'): Promise<string> {
  const problem = checkImage(file);
  if (problem) throw new Error(problem);
  if (!cloudinaryReady) throw new Error('Image uploads are not set up yet. Paste an image link instead.');
  const body = new FormData();
  body.append('file', file);
  body.append('upload_preset', preset!);
  body.append('folder', `msb/${folder}`);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: 'POST', body });
  if (!res.ok) throw new Error('The upload failed. Try a smaller image.');
  const json = (await res.json()) as { secure_url?: string };
  if (!json.secure_url?.startsWith('https://res.cloudinary.com/')) throw new Error('The upload failed.');
  return json.secure_url;
}

export function isSafeImageUrl(url: string): boolean {
  return /^https:\/\/res\.cloudinary\.com\//.test(url) || /^\/(posters|photos)\/[a-z0-9-]+$/.test(url);
}
