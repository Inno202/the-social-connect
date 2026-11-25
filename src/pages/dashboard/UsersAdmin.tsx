import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { Search } from 'lucide-react';
import { db } from '../../lib/firebase';
import { useAuth } from '../../lib/auth';
import { ROLES, ROLE_LABEL, type Role, type UserProfile } from '../../lib/types';
import { Skeleton, confirmAction, toast } from '../../components/ui';
import { logActivity } from '../../lib/activity';

export default function UsersAdmin() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[] | null>(null);
  const [q, setQ] = useState('');
  useEffect(() => {
    if (!db) return;
    return onSnapshot(collection(db, 'users'), (s) => setUsers(s.docs.map((d) => ({ ...(d.data() as UserProfile), uid: d.id }))), () => setUsers([]));
  }, []);

  async function change(u: UserProfile, patch: Partial<Pick<UserProfile, 'role' | 'active'>>) {
    if (!db) return;
    const what = patch.role ? `make ${u.name} ${ROLE_LABEL[patch.role]}` : patch.active ? `reactivate ${u.name}` : `deactivate ${u.name}`;
    if (!(await confirmAction({ title: `Change access?`, message: `This will ${what}. It takes effect at once.`, confirmLabel: 'Change access', tone: patch.active === false ? 'danger' : 'normal' }))) return;
    try {
      await updateDoc(doc(db, 'users', u.uid), patch);
      await logActivity('Changed access', u.email, JSON.stringify(patch));
      toast('Access changed.');
    } catch {
      toast('Access could not be changed. Changing roles needs a sign-in within the last 8 hours: sign out and in again, then retry.', 'error');
    }
  }

  const list = (users ?? []).filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <h2 className="t-section">Users and roles</h2>
        <div className="w-full sm:w-72">
          <label htmlFor="uq" className="field-label">Search</label>
          <div className="relative">
            <Search className="size-5 absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none" aria-hidden />
            <input id="uq" type="search" className="field field-icon-l" placeholder="Name or email" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
      </div>
      {!users && <Skeleton className="h-40" />}
      <ul className="space-y-2">
        {list.map((u) => (
          <li key={u.uid} className="panel p-4 grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-bold">{u.name}{u.uid === user?.uid && ' (you)'}</p>
              <p className="text-sm text-ink-soft break-any">{u.email}</p>
            </div>
            <label className="sr-only" htmlFor={`role-${u.uid}`}>Role for {u.name}</label>
            <select id={`role-${u.uid}`} className="field" value={u.role} disabled={u.uid === user?.uid} onChange={(e) => change(u, { role: e.target.value as Role })}>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
            <button type="button" className={`btn ${u.active ? 'btn-danger' : 'btn-outline'}`} disabled={u.uid === user?.uid} onClick={() => change(u, { active: !u.active })}>
              {u.active ? 'Deactivate' : 'Reactivate'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
