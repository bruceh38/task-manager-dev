# Architecture and Logic Guide

This document explains how the app is structured and why data/access logic works.

## 1. Component boundaries

- `App.tsx`
  - single orchestration layer for:
    - auth bootstrap
    - all Supabase reads/writes
    - realtime subscriptions
    - derived maps/selectors
  - passes ready-to-render props + handlers to presentational components

- `TaskModal.tsx`
  - create-task form
  - supports labels, team assignees, real-user assignees
  - real users are selected through dropdown + add/remove chips

- `TaskDetailPanel.tsx`
  - task edit form
  - label assignment
  - real-user assignment
  - comments timeline + create
  - activity timeline

- `UserPanel.tsx`
  - rename current profile display name
  - show owned team members
  - show teams current user belongs to
  - add real users into own team via dropdown

- `LabelPanel.tsx`, `Column.tsx`, `TaskCard.tsx`
  - isolated UI concerns for filtering labels and board rendering

## 2. Data model

Main tables:
- `profiles`: one row per auth user
- `tasks`: task owner and core task fields
- `task_user_assignees`: cross-user assignment join table
- `comments`: task comments
- `task_activities`: audit/event timeline
- `labels`, `task_labels`: labels and many-to-many task links
- `team_members`, `task_assignees`: owner-local team roster and assignment links

Important constraints:
- `task_user_assignees` primary key `(task_id, assignee_user_id)`
- `team_members` unique index `(user_id, profile_user_id)`
  - prevents duplicate linked real users per owner team

## 3. Auth/profile bootstrap flow

1. Client calls `ensureGuestSession()`.
2. If no session exists, anonymous auth user is created.
3. Client calls `rpc('ensure_my_profile', ...)`.
4. RPC upserts `profiles(id=auth.uid())`.

Why this matters:
- avoids race conditions and 409 conflicts from repeated profile inserts
- guarantees each session has a profile row before UI loads

## 4. Board read flow

`loadBoardData(currentUserId)`:
1. Fetch owned tasks (`tasks.user_id = currentUserId`).
2. Fetch assigned task IDs from `task_user_assignees` where `assignee_user_id = currentUserId`.
3. Fetch those tasks by ID and merge with owned tasks.
4. Fetch join data for merged set:
   - `task_assignees`
   - `task_labels`
   - `task_user_assignees`
   - `comments`
   - `task_activities`
5. Fetch supporting entities:
   - visible `team_members`
   - own `labels`
   - all `profiles`

Derived maps in-memory:
- assignees by task
- real-user assignees by task
- labels by task
- comments by task
- activities by task

## 5. Write flows

### Create task
- Insert into `tasks`
- Optional inserts:
  - `task_assignees`
  - `task_labels`
  - `task_user_assignees`
- Insert `task_activities` entries

### Drag status
- Optimistically update local state
- Persist `tasks.status`
- Insert `task_activities` status event

### Update labels
- Compute set diff (added/removed)
- Insert new rows into `task_labels`
- Delete removed rows from `task_labels`
- Insert activity messages

### Update real-user assignees
- Compute set diff
- Insert added rows into `task_user_assignees`
- Delete removed rows from `task_user_assignees` (scoped to assigner/owner rules)
- Insert activity messages

### Add comment
- Insert into `comments` with `user_id = auth.uid()`
- RLS allows only if user can access the task

## 6. Realtime refresh model

`App.tsx` subscribes to postgres changes on:
- `tasks`
- `team_members`
- `labels`
- `profiles`
- `task_assignees`
- `task_labels`
- `task_user_assignees`
- `comments`
- `task_activities`

On any change event:
- trigger full `refresh(user.id)`

Tradeoff:
- simple and robust consistency
- higher query volume than fine-grained state patching

## 7. Access control model

### Helper functions
- `is_task_owner(task_uuid)`: true if current user owns task
- `is_task_assignee(task_uuid)`: true if current user appears in `task_user_assignees`
- `can_access_task(task_uuid)`: owner OR real-user assignee
- `can_access_team(team_owner_id)`: owner OR member of owner team

### Policy intent
- Owner-only writes to owner resources (`tasks`, `labels`, `team_members`)
- Read access widened where collaboration is needed:
  - assigned users can read tasks
  - task collaborators can read comments/activity
  - team members can view teams they belong to

## 8. Known pitfalls and safeguards

- Profile 409 conflicts:
  - safeguarded by `ensure_my_profile` upsert RPC
- Team member duplicate by renamed user:
  - safeguarded by identity key `profile_user_id` + unique index
- ON CONFLICT errors on team upsert:
  - requires matching unique index exactly
- Publication duplication errors:
  - realtime publication adds are wrapped in `DO $$ ... if not exists ... $$`

## 9. UI/UX behavior notes

- Real-user selectors now use dropdown pattern in:
  - create-task modal
  - task detail panel
  - sidebar member-add section
- This avoids rendering large user lists and keeps controls compact.
- Selected users are represented as removable chips.

## 10. How to reason about a bug

1. Confirm data row exists in expected table.
2. Confirm current user identity (`auth.uid`) and ownership fields align.
3. Confirm matching RLS policy allows that operation.
4. Confirm helper functions return expected boolean for that row.
5. Confirm client query scope includes the row after filters.
