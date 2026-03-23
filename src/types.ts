export const TASK_STATUSES = ['todo', 'in_progress', 'in_review', 'done'] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export type Priority = 'low' | 'normal' | 'high';

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

export interface TaskInsert {
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority?: Priority;
  due_date?: string | null;
  user_id: string;
}

export interface TeamMember {
  id: string;
  name: string;
  avatar_url: string | null;
  color: string;
  user_id: string;
  created_at: string;
}

export interface TaskAssignee {
  task_id: string;
  member_id: string;
  user_id: string;
  created_at: string;
}

export interface Comment {
  id: string;
  task_id: string;
  body: string;
  user_id: string;
  created_at: string;
}

export interface TaskActivity {
  id: string;
  task_id: string;
  event_type: 'created' | 'status_changed' | 'edited' | 'assignment_added' | 'assignment_removed';
  message: string;
  metadata: Record<string, string | null> | null;
  user_id: string;
  created_at: string;
}

export interface Label {
  id: string;
  name: string;
  color: string;
  user_id: string;
  created_at: string;
}

export interface TaskLabel {
  task_id: string;
  label_id: string;
  user_id: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  color: string;
  created_at: string;
}

export interface TaskUserAssignee {
  task_id: string;
  assignee_user_id: string;
  assigned_by_user_id: string;
  created_at: string;
}
