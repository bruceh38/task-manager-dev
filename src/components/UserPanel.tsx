import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { TeamMember, UserProfile } from '../types';

interface UserPanelProps {
  users: UserProfile[];
  members: TeamMember[];
  teamMemberships: Array<{
    ownerId: string;
    ownerName: string;
    members: TeamMember[];
  }>;
  currentUserId: string | null;
  onRenameSelf: (displayName: string) => Promise<void>;
  onAddMemberFromUser: (userId: string) => Promise<void>;
}

export function UserPanel({ users, members, teamMemberships, currentUserId, onRenameSelf, onAddMemberFromUser }: UserPanelProps) {
  const visibleUsers = users.filter((user) => user.id !== currentUserId);
  const currentUser = useMemo(() => users.find((user) => user.id === currentUserId) ?? null, [users, currentUserId]);
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);

  const memberProfileIdSet = useMemo(
    () => new Set(members.map((member) => member.profile_user_id).filter((id): id is string => Boolean(id))),
    [members],
  );

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

  async function handleAddMember(userId: string) {
    try {
      setAddingUserId(userId);
      await onAddMemberFromUser(userId);
    } finally {
      setAddingUserId(null);
    }
  }

  return (
    <section className="label-panel">
      <header>
        <h2>Team</h2>
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

      <section className="detail-assignees">
        <h3>Members</h3>
        <div className="team-member-list">
          {members.length === 0 ? <p className="team-empty">No team members yet.</p> : null}
          {members.map((member) => (
            <article key={member.id} className="team-member">
              {member.avatar_url ? (
                <img src={member.avatar_url} alt={member.name} className="avatar" />
              ) : (
                <span className="avatar avatar-fallback" style={{ background: member.color }}>
                  {member.name.slice(0, 1).toUpperCase()}
                </span>
              )}
              <strong>{member.name}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="detail-assignees">
        <h3>Teams I'm in</h3>
        {teamMemberships.length === 0 ? <p className="team-empty">You are not in another team yet.</p> : null}
        <div className="team-member-list">
          {teamMemberships.map((team) => (
            <article key={team.ownerId} className="team-membership-card">
              <strong>{team.ownerName}'s team</strong>
              <div className="team-membership-list">
                {team.members.map((member) => (
                  <span key={member.id} className="detail-assignee-chip">
                    {member.name}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

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
            <button
              type="button"
              className="secondary"
              disabled={addingUserId === user.id || memberProfileIdSet.has(user.id)}
              onClick={() => handleAddMember(user.id)}
            >
              {memberProfileIdSet.has(user.id) ? 'Added' : addingUserId === user.id ? 'Adding...' : 'Add member'}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
