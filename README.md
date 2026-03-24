# Flowboard - Kanban Task Board

A Kanban board built with React + Supabase.

This project supports:
- anonymous guest auth
- strict per-user write ownership
- cross-user task assignment and collaboration visibility
- comments, activity log, labels, filters, and realtime refresh

## 1) Functionalities

Core board behavior:
- Four statuses: `todo`, `in_progress`, `in_review`, `done`
- Drag-and-drop status updates
- Task creation with title/description/priority/due date
- Persistent data in Supabase

Collaboration behavior:
- Every account has a `profiles` row (display name, color, avatar)
- Users can assign tasks to real users via `task_user_assignees`
- Assignees can see assigned tasks in their own board
- Assignees can comment and view activity for tasks they can access

Team behavior:
- Each user owns a private team roster (`team_members`)
- Team roster can include linked real users (`profile_user_id`)
- Users can see teams they belong to

## 2) Tech stack

- React 18 + TypeScript + Vite
- Supabase:
  - Auth (Anonymous sign-in)
  - Postgres
  - Row Level Security (RLS)
  - Realtime
- dnd-kit for drag-and-drop

## 3) Project structure

```text
src/
  App.tsx                      # App orchestration, queries, mutations, realtime subscriptions
  constants.ts                 # Status order/labels
  types.ts                     # Shared TypeScript types
  lib/
    supabase.ts                # Supabase client + guest session bootstrap
  components/
    Column.tsx                 # Single board column
    TaskCard.tsx               # Task card rendering
    TaskModal.tsx              # Create task modal
    TaskDetailPanel.tsx        # Task detail drawer (edit, labels, users, comments, activity)
    LabelPanel.tsx             # Label create/manage panel
    UserPanel.tsx              # Account rename + team/member management
supabase/
  schema.sql                   # Full schema, functions, RLS, grants, realtime publication
```

## 4) Runtime logic summary

- App boot:
  1. `ensureGuestSession()` creates/loads anonymous auth user.
  2. RPC `ensure_my_profile(...)` upserts profile row safely.
  3. `loadBoardData(currentUserId)` fetches all board data in batches.
  4. Realtime subscriptions refresh state when tracked tables change.

- Board loading:
  - fetch owned tasks
  - fetch task IDs where current user is assigned as real user
  - merge/deduplicate those tasks
  - fetch join data for merged task set: labels, assignees, comments, activities

- Status drag:
  - optimistic status update in local state
  - persist to `tasks.status`
  - write `task_activities` status event

- Assignment model:
  - Real-user assignment uses `task_user_assignees` (cross-user visibility)

## 5) Security model (RLS)

RLS is enabled on all app tables.

Key functions in [`supabase/schema.sql`](/Users/newuser/Downloads/task-manager/supabase/schema.sql):
- `is_task_owner(task_uuid)`
- `is_task_assignee(task_uuid)`
- `can_access_task(task_uuid)`
- `can_access_team(team_owner_id)`

High-level policy rules:
- `tasks`: owner can CRUD; assigned users can SELECT
- `task_user_assignees`: owner/assigner controls assignment rows; assignee can SELECT
- `comments`: user can insert own comment if `can_access_task(task_id)`
- `task_activities`: visible to users with task access
- `team_members`: visible if `can_access_team(user_id)`


## 6) Local setup

1. Install dependencies:

```bash
npm install
```

2. Create env file:

```bash
cp .env.example .env
```

3. Configure env vars:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

4. Run SQL in Supabase SQL editor:
- [supabase/schema.sql](/Users/newuser/Downloads/task-manager/supabase/schema.sql)

5. In Supabase Auth settings, enable:
- Anonymous sign-in

6. Run dev server:

```bash
npm run dev
```

7. Build production bundle:

```bash
npm run build
```

## 7) Deployment

Supported free hosting:
- Vercel


Use [SUBMISSION.md](/Users/newuser/Downloads/task-manager/SUBMISSION.md) to provide:
- live demo URL
- GitHub repository URL
- schema confirmation/screenshots
