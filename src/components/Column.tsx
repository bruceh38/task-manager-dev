import { useDroppable } from '@dnd-kit/core';
import clsx from 'clsx';
import { STATUS_LABELS } from '../constants';
import type { Label, Task, TaskStatus, TeamMember, UserProfile } from '../types';
import { TaskCard } from './TaskCard';

interface ColumnProps {
  status: TaskStatus;
  tasks: Task[];
  activeColumn: TaskStatus | null;
  taskAssigneesByTaskId: Record<string, TeamMember[]>;
  taskUserAssigneesByTaskId: Record<string, UserProfile[]>;
  taskLabelsByTaskId: Record<string, Label[]>;
  onOpenTaskDetails: (taskId: string) => void;
}

export function Column({
  status,
  tasks,
  activeColumn,
  taskAssigneesByTaskId,
  taskUserAssigneesByTaskId,
  taskLabelsByTaskId,
  onOpenTaskDetails,
}: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: {
      status,
    },
  });

  return (
    <section ref={setNodeRef} className={clsx('board-column', isOver && 'is-over', activeColumn === status && 'is-active')}>
      <header className="column-header">
        <h3>{STATUS_LABELS[status]}</h3>
        <span>{tasks.length}</span>
      </header>

      <div className="column-task-list">
        {tasks.length === 0 ? <div className="empty-column">No tasks here</div> : null}
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            assignees={taskAssigneesByTaskId[task.id] ?? []}
            userAssignees={taskUserAssigneesByTaskId[task.id] ?? []}
            labels={taskLabelsByTaskId[task.id] ?? []}
            onOpenDetails={onOpenTaskDetails}
          />
        ))}
      </div>
    </section>
  );
}
