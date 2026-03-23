import type { UserProfile } from '../types';

interface UserPanelProps {
  users: UserProfile[];
  currentUserId: string | null;
}

export function UserPanel({ users, currentUserId }: UserPanelProps) {
  const visibleUsers = users.filter((user) => user.id !== currentUserId);

  return (
    <section className="label-panel">
      <header>
        <h2>Users</h2>
        <p>{visibleUsers.length} available</p>
      </header>

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
