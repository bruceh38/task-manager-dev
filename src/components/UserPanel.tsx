import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { UserProfile } from '../types';

interface UserPanelProps {
  users: UserProfile[];
  currentUserId: string | null;
  onRenameSelf: (displayName: string) => Promise<void>;
}

export function UserPanel({ users, currentUserId, onRenameSelf }: UserPanelProps) {
  const visibleUsers = users.filter((user) => user.id !== currentUserId);
  const currentUser = useMemo(() => users.find((user) => user.id === currentUserId) ?? null, [users, currentUserId]);
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(currentUser?.display_name ?? '');
  }, [currentUser]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!displayName.trim()) {
      setError('Name is required.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await onRenameSelf(displayName.trim());
    } catch (renameError) {
      setError(renameError instanceof Error ? renameError.message : 'Could not rename account.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="label-panel">
      <header>
        <h2>Users</h2>
        <p>{visibleUsers.length} available</p>
      </header>

      <form className="team-form" onSubmit={handleSubmit}>
        <h3>My account name</h3>
        <label>
          Display name
          <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Your name" />
        </label>
        {error ? <div className="form-error">{error}</div> : null}
        <button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save name'}
        </button>
      </form>

      <div className="team-member-list">
        {visibleUsers.length === 0 ? <p className="team-empty">No other users found yet.</p> : null}
        {visibleUsers.map((user) => (
          <article key={user.id} className="team-member">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.display_name} className="avatar" />
            ) : (
              <span className="avatar avatar-fallback" style={{ background: user.color }}>
                {user.display_name.slice(0, 1).toUpperCase()}
              </span>
            )}
            <strong>{user.display_name}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}
