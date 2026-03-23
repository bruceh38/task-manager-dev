# Internship Assessment Submission

## Live Demo URL

- Replace with deployed URL: `https://...`

## GitHub Repository URL

- Replace with repository URL: `https://github.com/...`

## Tech Used

- React + TypeScript + Vite
- Supabase (Auth anonymous, Postgres, RLS, Realtime)
- dnd-kit

## Required Behavior Checklist

- [x] Kanban board with default columns: To Do / In Progress / In Review / Done
- [x] Drag and drop tasks across columns
- [x] Tasks persisted in Supabase
- [x] Guest account auto-created via anonymous auth
- [x] Row Level Security restricts each user to their own tasks
- [x] New task creation with title (+ optional description, priority, due date)
- [x] Loading / error / empty states

## Advanced Features Included

- [x] Team members and assignees
- [x] Task comments (detail panel + chronological timeline)
- [x] Task activity log (status changes, edits, assignment changes)
- [x] Labels/tags (custom labels, multi-label assignment, label filtering)
- [x] Real-user assignment (user directory + cross-user assignees)
- [x] Search and filtering (priority)
- [x] Due date urgency indicators (overdue and due soon)
- [x] Board summary stats (total, completed, overdue)

## SQL Schema (Supabase)

Run the SQL in [`supabase/schema.sql`](/Users/newuser/Downloads/task-manager/supabase/schema.sql).

It includes:
- `tasks` table
- `team_members` table
- `labels` table
- `profiles` table
- `task_assignees` join table (many-to-many)
- `task_labels` join table (many-to-many)
- `task_user_assignees` join table (many-to-many)
- `comments` table
- `task_activities` table
- RLS policies for all nine tables
- Realtime publication setup (idempotent)

## Optional Screenshot Notes

- Add Supabase table structure screenshot
- Add board UI screenshot
