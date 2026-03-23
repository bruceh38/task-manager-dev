import { FormEvent, useState } from 'react';
import type { Label, Priority, TeamMember, UserProfile } from '../types';

interface TaskModalProps {
  open: boolean;
  members: TeamMember[];
  labels: Label[];
  users: UserProfile[];
  currentUserId: string | null;
  onClose: () => void;
  onCreate: (input: {
    title: string;
    description: string;
    priority: Priority;
    dueDate: string | null;
    assigneeIds: string[];
    labelIds: string[];
    userAssigneeIds: string[];
  }) => Promise<void>;
}

export function TaskModal({ open, members, labels, users, currentUserId, onClose, onCreate }: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('normal');
  const [dueDate, setDueDate] = useState('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [userAssigneeIds, setUserAssigneeIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function toggleAssignee(memberId: string) {
    setAssigneeIds((current) =>
      current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId],
    );
  }

  function toggleLabel(labelId: string) {
    setLabelIds((current) => (current.includes(labelId) ? current.filter((id) => id !== labelId) : [...current, labelId]));
  }

  function toggleUserAssignee(userAssigneeId: string) {
    setUserAssigneeIds((current) =>
      current.includes(userAssigneeId) ? current.filter((id) => id !== userAssigneeId) : [...current, userAssigneeId],
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onCreate({
        title: title.trim(),
        description: description.trim(),
        priority,
        dueDate: dueDate || null,
        assigneeIds,
        labelIds,
        userAssigneeIds,
      });
      setTitle('');
      setDescription('');
      setPriority('normal');
      setDueDate('');
      setAssigneeIds([]);
      setLabelIds([]);
      setUserAssigneeIds([]);
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not create task.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal-panel" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <header>
          <h2>New Task</h2>
          <button type="button" onClick={onClose} aria-label="Close">
            x
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <label>
            Title
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Improve onboarding flow" />
          </label>
          <label>
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What needs to happen for this to be done?"
              rows={3}
            />
          </label>
          <div className="form-grid">
            <label>
              Priority
              <select value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </label>
            <label>
              Due date
              <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            </label>
          </div>

          <fieldset className="assignee-fieldset">
            <legend>Assignees</legend>
            {members.length === 0 ? <p className="assignee-empty">Add team members first.</p> : null}
            <div className="assignee-options">
              {members.map((member) => {
                const selected = assigneeIds.includes(member.id);
                return (
                  <label key={member.id} className={`assignee-option ${selected ? 'selected' : ''}`}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleAssignee(member.id)}
                      aria-label={`Assign ${member.name}`}
                    />
                    <span className="avatar avatar-fallback" style={{ background: member.color }}>
                      {member.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span>{member.name}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="assignee-fieldset">
            <legend>Labels</legend>
            {labels.length === 0 ? <p className="assignee-empty">Create labels first.</p> : null}
            <div className="assignee-options">
              {labels.map((label) => {
                const selected = labelIds.includes(label.id);
                return (
                  <label key={label.id} className={`assignee-option ${selected ? 'selected' : ''}`}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleLabel(label.id)}
                      aria-label={`Add label ${label.name}`}
                    />
                    <span className="label-chip" style={{ borderColor: label.color, color: label.color }}>
                      {label.name}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="assignee-fieldset">
            <legend>Real users</legend>
            {users.filter((user) => user.id !== currentUserId).length === 0 ? (
              <p className="assignee-empty">No other users available.</p>
            ) : null}
            <div className="assignee-options">
              {users
                .filter((user) => user.id !== currentUserId)
                .map((user) => {
                  const selected = userAssigneeIds.includes(user.id);
                  return (
                    <label key={user.id} className={`assignee-option ${selected ? 'selected' : ''}`}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleUserAssignee(user.id)}
                        aria-label={`Assign ${user.display_name}`}
                      />
                      <span className="avatar avatar-fallback" style={{ background: user.color }}>
                        {user.display_name.slice(0, 1).toUpperCase()}
                      </span>
                      <span>{user.display_name}</span>
                    </label>
                  );
                })}
            </div>
          </fieldset>

          {error ? <div className="form-error">{error}</div> : null}

          <footer>
            <button type="button" className="secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create task'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
