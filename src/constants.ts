/**
 * Central UI constants.
 *
 * Keeping these in one file prevents duplicated literals across components,
 * which reduces bugs (for example, mismatched status labels or ordering).
 */
import type { TaskStatus } from './types';

/**
 * Maps persisted status keys to human-readable text shown in UI.
 */
export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
};

/**
 * Canonical column order for the Kanban board.
 *
 * Important: this order controls both render order and drag/drop target semantics.
 */
export const STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'in_review', 'done'];

/**
 * Presentation metadata for priorities.
 *
 * We currently only expose label text, but this object can later hold icon/color/etc.
 */
export const PRIORITY_STYLES = {
  low: { label: 'Low' },
  normal: { label: 'Normal' },
  high: { label: 'High' },
};
