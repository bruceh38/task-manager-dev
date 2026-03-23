import type { TaskStatus } from './types';

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
};

export const STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'in_review', 'done'];

export const PRIORITY_STYLES = {
  low: { label: 'Low' },
  normal: { label: 'Normal' },
  high: { label: 'High' },
};
