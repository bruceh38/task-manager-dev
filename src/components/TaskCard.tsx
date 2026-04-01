/**
 * Visual card for one task.
 *
 * Responsibilities:
 * - Register as draggable item.
 * - Display summary information (title, description, priority, labels, assignees, due state).
 * - Provide entry point to open task detail panel.
 */
import { CSS } from '@dnd-kit/utilities';
import { formatDistanceToNowStrict, isPast, isToday, parseISO } from 'date-fns';
import { useDraggable } from '@dnd-kit/core';
import clsx from 'clsx';
import { PRIORITY_STYLES } from '../constants';
import type { Label, Task, TeamMember, UserProfile } from '../types';

interface TaskCardProps {
  task: Task;
  // Team-member assignees (owner-local roster assignments).
  assignees: TeamMember[];
  // Real user assignees (cross-user assignments).
  userAssignees: UserProfile[];
  labels: Label[];
  onOpenDetails: (taskId: string) => void;
}

/**
 * Derive due-date state for badge tone.
 */
function dueTone(dateValue: string | null) {
  if (!dateValue) return 'none';
  const date = parseISO(dateValue);
  if (isPast(date) && !isToday(date)) return 'overdue';
  if (isToday(date)) return 'soon';
  return 'future';
}

export function TaskCard({ task, assignees, userAssignees, labels, onOpenDetails }: TaskCardProps) {
  // Register this card as draggable.
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: {
      taskId: task.id,
      status: task.status,
    },
  });

  // dnd-kit gives translation values while dragging; convert them to CSS transform string.
  const style = {
    transform: CSS.Translate.toString(transform),
  };

  const priority = PRIORITY_STYLES[task.priority];
  const dueState = dueTone(task.due_date);

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={clsx('task-card', `priority-${task.priority}`, isDragging && 'dragging')}
      {...listeners}
      {...attributes}
    >
      <header className="task-card-header">
        <span className={clsx('priority-pill', `priority-${task.priority}`)}>{priority.label}</span>
      </header>
      <h4>{task.title}</h4>
      {task.description ? <p>{task.description}</p> : null}

      {/* Team-member avatars */}
      {assignees.length > 0 ? (
        <div className="task-assignees" aria-label="Assignees">
          {assignees.slice(0, 4).map((member) =>
            member.avatar_url ? (
              <img key={member.id} src={member.avatar_url} alt={member.name} className="avatar stacked" title={member.name} />
            ) : (
              <span key={member.id} className="avatar avatar-fallback stacked" style={{ background: member.color }} title={member.name}>
                {member.name.slice(0, 1).toUpperCase()}
              </span>
            ),
          )}
          {assignees.length > 4 ? <span className="assignee-overflow">+{assignees.length - 4}</span> : null}
        </div>
      ) : null}

      {/* Real-user avatars */}
      {userAssignees.length > 0 ? (
        <div className="task-assignees" aria-label="Assigned users">
          {userAssignees.slice(0, 4).map((user) =>
            user.avatar_url ? (
              <img key={user.id} src={user.avatar_url} alt={user.display_name} className="avatar stacked" title={user.display_name} />
            ) : (
              <span key={user.id} className="avatar avatar-fallback stacked" style={{ background: user.color }} title={user.display_name}>
                {user.display_name.slice(0, 1).toUpperCase()}
              </span>
            ),
          )}
          {userAssignees.length > 4 ? <span className="assignee-overflow">+{userAssignees.length - 4}</span> : null}
        </div>
      ) : null}

      {labels.length > 0 ? (
        <div className="task-label-list">
          {labels.map((label) => (
            <span key={label.id} className="label-chip" style={{ borderColor: label.color, color: label.color }}>
              {label.name}
            </span>
          ))}
        </div>
      ) : null}

      {task.due_date ? (
        <footer className={clsx('due-chip', `due-${dueState}`)}>
          Due {formatDistanceToNowStrict(parseISO(task.due_date), { addSuffix: true })}
        </footer>
      ) : null}

      {/*
        Important drag behavior note:
        `onPointerDown={stopPropagation}` prevents this button from starting a card drag
        when the user's intention is to click "Details".
      */}
      <button
        type="button"
        className="details-trigger"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          onOpenDetails(task.id);
        }}
      >
        Details
      </button>
    </article>
  );
}
