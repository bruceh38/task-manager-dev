import { FormEvent, useState } from 'react';
import type { TeamMember } from '../types';

interface TeamPanelProps {
  members: TeamMember[];
  onCreateMember: (input: { name: string; color: string; avatarUrl: string | null }) => Promise<void>;
}

export function TeamPanel({ members, onCreateMember }: TeamPanelProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#ec4899');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setError('Member name is required.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onCreateMember({
        name: name.trim(),
        color,
        avatarUrl: avatarUrl.trim() || null,
      });
      setName('');
      setAvatarUrl('');
      setColor('#ec4899');
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Could not add team member.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="team-panel">
      <header>
        <h2>Team</h2>
        <p>{members.length} member{members.length === 1 ? '' : 's'}</p>
      </header>

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
            <div>
              <strong>{member.name}</strong>
            </div>
          </article>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="team-form">
        <h3>Add member</h3>
        <label>
          Name
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Bruce Huang" />
        </label>
        <div className="team-form-row">
          <label>
            Color
            <input type="color" value={color} onChange={(event) => setColor(event.target.value)} />
          </label>
          {/* <label>
            Avatar URL (optional)
            <input value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="https://..." />
          </label> */}
        </div>
        {error ? <div className="form-error">{error}</div> : null}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Adding...' : 'Add member'}
        </button>
      </form>
    </section>
  );
}
