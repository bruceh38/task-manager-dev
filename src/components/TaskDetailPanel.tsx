import { FormEvent, useEffect, useMemo, useState } from 'react';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { STATUS_LABELS } from '../constants';
import type { Comment, Label, Priority, Task, TaskActivity, TeamMember, UserProfile } from '../types';

interface TaskDetailPanelProps {
  open: boolean;
  task: Task | null;
  comments: Comment[];
  activities: TaskActivity[];
  assignees: TeamMember[];
  userAssignees: UserProfile[];
  members: TeamMember[];
  labels: Label[];
  taskLabels: Label[];
  users: UserProfile[];
  currentUserId: string | null;
  onClose: () => void;
  onAddComment: (taskId: string, body: string) => Promise<void>;
  onUpdateTask: (taskId: string, input: { title: string; description: string; priority: Priority; dueDate: string | null }) => Promise<void>;
  onUpdateAssignments: (taskId: string, memberIds: string[]) => Promise<void>;
  onUpdateLabels: (taskId: string, labelIds: string[]) => Promise<void>;
  onUpdateUserAssignments: (taskId: string, userIds: string[]) => Promise<void>;
}

export function TaskDetailPanel({
  open,
  task,
  comments,
  activities,
  assignees,
  userAssignees,
  members,
  labels,
  taskLabels,
  users,
  currentUserId,
  onClose,
  onAddComment,
  onUpdateTask,
  onUpdateAssignments,
  onUpdateLabels,
  onUpdateUserAssignments,
}: TaskDetailPanelProps) {
  const [body, setBody] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('normal');
  const [dueDate, setDueDate] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [savingAssignments, setSavingAssignments] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const orderedComments = useMemo(
    () => [...comments].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [comments],
  );

  const orderedActivities = useMemo(
    () => [...activities].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [activities],
  );

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description ?? '');
    setPriority(task.priority);
    setDueDate(task.due_date ?? '');
  }, [task]);

  useEffect(() => {
    setSelectedMemberIds(assignees.map((member) => member.id));
  }, [assignees]);

  useEffect(() => {
    setSelectedLabelIds(taskLabels.map((label) => label.id));
  }, [taskLabels]);

  useEffect(() => {
    setSelectedUserIds(userAssignees.map((user) => user.id));
  }, [userAssignees]);

  if (!open || !task) return null;
  const currentTask = task;

  function toggleMember(memberId: string) {
    setSelectedMemberIds((current) =>
      current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId],
    );
  }

  function toggleLabel(labelId: string) {
    setSelectedLabelIds((current) => (current.includes(labelId) ? current.filter((id) => id !== labelId) : [...current, labelId]));
  }

  function toggleUser(userId: string) {
    setSelectedUserIds((current) => (current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]));
  }

  async function handleCommentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim()) {
      setError('Comment cannot be empty.');
      return;
    }

    try {
      setCommentSubmitting(true);
      setError(null);
      await onAddComment(currentTask.id, body.trim());
      setBody('');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not add comment.');
    } finally {
      setCommentSubmitting(false);
    }
  }

  async function handleTaskSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    try {
      setSavingTask(true);
      setError(null);
      await onUpdateTask(currentTask.id, {
        title: title.trim(),
        description: description.trim(),
        priority,
        dueDate: dueDate || null,
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not update task.');
    } finally {
      setSavingTask(false);
    }
  }

  async function handleAssignmentsSave() {
    try {
      setSavingAssignments(true);
      setError(null);
      await onUpdateAssignments(currentTask.id, selectedMemberIds);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not update assignments.');
    } finally {
      setSavingAssignments(false);
    }
  }

  async function handleLabelsSave() {
    try {
      setSavingAssignments(true);
      setError(null);
      await onUpdateLabels(currentTask.id, selectedLabelIds);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not update labels.');
    } finally {
      setSavingAssignments(false);
    }
  }

  async function handleUsersSave() {
    try {
      setSavingAssignments(true);
      setError(null);
      await onUpdateUserAssignments(currentTask.id, selectedUserIds);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not update user assignees.');
    } finally {
      setSavingAssignments(false);
    }
  }

  return (
    <div className="detail-backdrop" role="presentation" onClick={onClose}>
      <aside className="detail-panel" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <header>
          <h2>{currentTask.title}</h2>
          <button type="button" onClick={onClose} aria-label="Close details">
            x
          </button>
        </header>

        <section className="detail-meta">
          <div>
            <span>Status</span>
            <strong>{STATUS_LABELS[currentTask.status]}</strong>
          </div>
          <div>
            <span>Priority</span>
            <strong>{currentTask.priority}</strong>
          </div>
          <div>
            <span>Due date</span>
            <strong>{currentTask.due_date ? format(new Date(currentTask.due_date), 'MMM d, yyyy') : 'None'}</strong>
          </div>
        </section>

        <section className="detail-edit">
          <h3>Edit Task</h3>
          <form onSubmit={handleTaskSave} className="detail-edit-form">
            <label>
              Title
              <input value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label>
              Description
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} />
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
            <button type="submit" disabled={savingTask}>
              {savingTask ? 'Saving...' : 'Save task changes'}
            </button>
          </form>
        </section>

        <section className="detail-assignees">
          <h3>Assignees</h3>
          <div className="assignee-options">
            {members.length === 0 ? <p className="assignee-empty">No team members yet.</p> : null}
            {members.map((member) => {
              const selected = selectedMemberIds.includes(member.id);
              return (
                <label key={member.id} className={`assignee-option ${selected ? 'selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleMember(member.id)}
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
          <button type="button" onClick={handleAssignmentsSave} disabled={savingAssignments}>
            {savingAssignments ? 'Saving...' : 'Save assignees'}
          </button>
        </section>

        <section className="detail-assignees">
          <h3>Labels</h3>
          <div className="assignee-options">
            {labels.length === 0 ? <p className="assignee-empty">No labels yet.</p> : null}
            {labels.map((label) => {
              const selected = selectedLabelIds.includes(label.id);
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
          <button type="button" onClick={handleLabelsSave} disabled={savingAssignments}>
            {savingAssignments ? 'Saving...' : 'Save labels'}
          </button>
        </section>

        <section className="detail-assignees">
          <h3>Real Users</h3>
          <div className="assignee-options">
            {users.filter((user) => user.id !== currentUserId).length === 0 ? <p className="assignee-empty">No other users yet.</p> : null}
            {users
              .filter((user) => user.id !== currentUserId)
              .map((user) => {
                const selected = selectedUserIds.includes(user.id);
                return (
                  <label key={user.id} className={`assignee-option ${selected ? 'selected' : ''}`}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleUser(user.id)}
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
          <button type="button" onClick={handleUsersSave} disabled={savingAssignments}>
            {savingAssignments ? 'Saving...' : 'Save real-user assignees'}
          </button>
        </section>

        <section className="detail-comments">
          <h3>Comments</h3>
          {orderedComments.length === 0 ? <p className="comment-empty">No comments yet.</p> : null}
          <div className="comment-list">
            {orderedComments.map((comment) => (
              <article key={comment.id} className="comment-item">
                <p>{comment.body}</p>
                <time>{format(new Date(comment.created_at), 'MMM d, yyyy h:mm a')}</time>
              </article>
            ))}
          </div>

          <form onSubmit={handleCommentSubmit} className="comment-form">
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={3}
              placeholder="Write a comment..."
            />
            <button type="submit" disabled={commentSubmitting}>
              {commentSubmitting ? 'Posting...' : 'Post comment'}
            </button>
          </form>
        </section>

        <section className="activity-log">
          <h3>Activity</h3>
          {orderedActivities.length === 0 ? <p className="comment-empty">No activity yet.</p> : null}
          <div className="activity-list">
            {orderedActivities.map((activity) => (
              <article key={activity.id} className="activity-item">
                <p>{activity.message}</p>
                <time>{formatDistanceToNowStrict(new Date(activity.created_at), { addSuffix: true })}</time>
              </article>
            ))}
          </div>
        </section>

        {error ? <div className="form-error">{error}</div> : null}
      </aside>
    </div>
  );
}
