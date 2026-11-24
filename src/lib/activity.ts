import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

/** Staff actions are written to an append-only log that only the super admin can read. */
export async function logActivity(action: string, target: string, detail = ''): Promise<void> {
  if (!db || !auth?.currentUser) return;
  try {
    await addDoc(collection(db, 'activity'), {
      actor: auth.currentUser.uid,
      actorName: auth.currentUser.displayName ?? auth.currentUser.email ?? '',
      action: action.slice(0, 60),
      target: target.slice(0, 120),
      detail: detail.slice(0, 300),
      at: serverTimestamp(),
    });
  } catch {
    /* logging never blocks the action itself */
  }
}
