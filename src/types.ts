/**
 * Shared TypeScript domain model.
 *
 * These interfaces mirror Supabase table structures and are reused across:
 * - fetch results
 * - component props
 * - mutation payload logic
 *
 * Practical benefit:
 * TypeScript warns early when frontend expectations diverge from DB schema.
 */

/** Allowed status values used in the board and persisted in `tasks.status`. */
export const TASK_STATUSES = ['todo', 'in_progress', 'in_review', 'done'] as const;

/** Union type derived from TASK_STATUSES literal tuple. */
export type TaskStatus = (typeof TASK_STATUSES)[number];

/** Allowed priority values used in `tasks.priority`. */
export type Priority = 'low' | 'normal' | 'high';

/** Row shape for `public.tasks`. */
export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  due_date: string | null;
  user_id: string;
  created_at: string;
}

/** Insert shape for creating tasks (used for intent clarity, not enforced everywhere). */
export interface TaskInsert {
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority?: Priority;
  due_date?: string | null;
  user_id: string;
}

/** Row shape for `public.team_members`. */
export interface TeamMember {
  id: string;
  name: string;
  avatar_url: string | null;
  color: string;
  // Links team entry to a real user profile when this member represents a real account.
  profile_user_id: string | null;
  user_id: string;
  created_at: string;
}

/** Join row for `public.task_assignees` (task <-> team member). */
export interface TaskAssignee {
  task_id: string;
  member_id: string;
  user_id: string;
  created_at: string;
}

/** Row shape for `public.comments`. */
export interface Comment {
  id: string;
  task_id: string;
  body: string;
  user_id: string;
  created_at: string;
}

/** Row shape for `public.task_activities`. */
export interface TaskActivity {
  id: string;
  task_id: string;
  event_type: 'created' | 'status_changed' | 'edited' | 'assignment_added' | 'assignment_removed';
  message: string;
  metadata: Record<string, string | null> | null;
  user_id: string;
  created_at: string;
}

/** Row shape for `public.labels`. */
export interface Label {
  id: string;
  name: string;
  color: string;
  user_id: string;
  created_at: string;
}

/** Join row for `public.task_labels` (task <-> label). */
export interface TaskLabel {
  task_id: string;
  label_id: string;
  user_id: string;
  created_at: string;
}

/** Row shape for `public.profiles`. */
export interface UserProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  color: string;
  created_at: string;
}

/** Join row for `public.task_user_assignees` (task <-> real user). */
export interface TaskUserAssignee {
  task_id: string;
  assignee_user_id: string;
  assigned_by_user_id: string;
  created_at: string;
}
