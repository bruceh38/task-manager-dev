# Flowboard - Kanban Task Manager

Flowboard is a polished Kanban board built for the internship assessment challenge. It uses Supabase Auth anonymous guest sessions and Row Level Security (RLS) so each guest user only sees and edits their own tasks.

## Stack

- React + TypeScript + Vite
- Supabase (Postgres + Auth + Realtime)
- `@dnd-kit/core` for drag and drop

## Features

- Four required columns: `To Do`, `In Progress`, `In Review`, `Done`
- Drag tasks between columns to update status
- Automatic guest sign-in on first launch
- Per-user data isolation using Supabase RLS
- Create task modal (`title`, `description`, `priority`, `due date`)
- Team members panel (add member with name + avatar URL + color)
- Assign one or more team members to tasks
- Assignee avatars shown on task cards
- Task detail drawer with comments timeline
- Add comments with timestamps (chronological order)
- Task activity timeline (status moves, edits, assignee changes)
- Custom labels and multi-label task tagging
- Label-based board filtering
- Shared user directory (other real users)
- Assign tasks to real users across accounts
- Search and priority filters
- Overdue due-date indicators on task cards
- Board summary (`total`, `done`, `overdue`)
- Loading, empty, and error states
- Responsive board layout

## Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create env file:
   ```bash
   cp .env.example .env
   ```
3. Add your Supabase values to `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. In Supabase SQL editor, run:
   - [`supabase/schema.sql`](/Users/newuser/Downloads/task-manager/supabase/schema.sql)
5. In Supabase Auth settings, enable Anonymous sign-in.
6. Run locally:
   ```bash
   npm run dev
   ```

## Deploy (Vercel / Netlify / Cloudflare Pages)

- Build command: `npm run build`
- Output directory: `dist`
- Add env vars in hosting platform settings:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

## Security Notes

- Do not commit `.env`
- Do not expose the Supabase service role key
- Use only the public anon key in frontend env vars

## Assessment Deliverables

Use [`SUBMISSION.md`](/Users/newuser/Downloads/task-manager/SUBMISSION.md) to fill in:
- Live demo URL
- GitHub repository URL
- SQL schema
- Notes/screenshots
