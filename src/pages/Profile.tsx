import { useState } from 'react';
import { LogOut, Save } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Avatar } from '@/components/ui/Misc';
import { ROLE_LABELS } from '@/types';
import { formatDate } from '@/lib/utils';

export function Profile() {
  const { profile, signOut, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!profile) return null;

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const { error } = await supabase.from('users').update({ name: name.trim() }).eq('id', profile!.id);
    if (error) {
      setMessage(error.message);
    } else {
      await refreshProfile();
      setMessage('Profile updated.');
    }
    setSaving(false);
  }

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <h1 className="text-2xl font-bold text-navy-800">Profile</h1>

      <div className="card p-6">
        <div className="mb-6 flex items-center gap-4">
          <Avatar name={profile.name} size={56} />
          <div>
            <p className="text-lg font-bold text-navy-800">{profile.name}</p>
            <span className="inline-flex rounded-full bg-gold-100 px-2.5 py-0.5 text-xs font-semibold text-gold-700">
              {ROLE_LABELS[profile.role]}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="name">
              Display Name
            </label>
            <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input bg-navy-50" value={profile.email} disabled />
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="label">Role</p>
              <p className="text-navy-600">{ROLE_LABELS[profile.role]}</p>
            </div>
            <div>
              <p className="label">Designation</p>
              <p className="text-navy-600">{profile.designation}</p>
            </div>
            <div>
              <p className="label">Member since</p>
              <p className="text-navy-600">{formatDate(profile.created_at)}</p>
            </div>
          </div>

          {message && <p className="rounded-lg bg-navy-50 px-3 py-2 text-sm text-navy-600">{message}</p>}

          <div className="flex items-center justify-between pt-2">
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={saving || !name.trim() || name.trim() === profile.name}
            >
              <Save size={16} /> Save
            </button>
            <button className="btn-ghost text-red-600 hover:bg-red-50" onClick={signOut}>
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
