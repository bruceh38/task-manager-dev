import { DndContext, DragEndEvent, DragStartEvent, PointerSensor, closestCorners, useSensor, useSensors } from '@dnd-kit/core';
import { isPast, isToday, parseISO } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import { Column } from './components/Column';
import { LabelPanel } from './components/LabelPanel';
import { TaskDetailPanel } from './components/TaskDetailPanel';
import { TaskModal } from './components/TaskModal';
import { UserPanel } from './components/UserPanel';
import { STATUS_ORDER, STATUS_LABELS } from './constants';
import { ensureGuestSession, supabase } from './lib/supabase';
import type {
  Comment,
  Label,
  Priority,
  Task,
  TaskActivity,
  TaskAssignee,
  TaskLabel,
  TaskStatus,
  TaskUserAssignee,
  TeamMember,
  UserProfile,
} from './types';

interface ActivityInput {
  task_id: string;
  event_type: TaskActivity['event_type'];
  message: string;
  metadata?: Record<string, string | null> | null;
}

function resolveDropStatus(overId: string, tasks: Task[]): TaskStatus | null {
  if (STATUS_ORDER.includes(overId as TaskStatus)) {
    return overId as TaskStatus;
  }

  const targetTask = tasks.find((task) => task.id === overId);
  return targetTask?.status ?? null;
}

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  const date = parseISO(dueDate);
  return isPast(date) && !isToday(date);
}

async function loadBoardData(currentUserId: string) {
  const [ownedTaskRes, assignedTaskIdsRes, memberRes, labelRes, profilesRes] = await Promise.all([
    supabase.from('tasks').select('*').eq('user_id', currentUserId).order('created_at', { ascending: false }),
    supabase.from('task_user_assignees').select('task_id').eq('assignee_user_id', currentUserId),
    supabase.from('team_members').select('*').order('created_at', { ascending: true }),
    supabase.from('labels').select('*').eq('user_id', currentUserId).order('created_at', { ascending: true }),
    supabase.from('profiles').select('*').order('created_at', { ascending: true }),
  ]);

  if (ownedTaskRes.error) throw ownedTaskRes.error;
  if (assignedTaskIdsRes.error) throw assignedTaskIdsRes.error;
  if (memberRes.error) throw memberRes.error;
  if (labelRes.error) throw labelRes.error;
  if (profilesRes.error) throw profilesRes.error;

  const ownedTasks = (ownedTaskRes.data as Task[]) ?? [];
  const assignedTaskIds = [...new Set(((assignedTaskIdsRes.data as Array<{ task_id: string }>) ?? []).map((row) => row.task_id))];

  let assignedTasks: Task[] = [];
  if (assignedTaskIds.length > 0) {
    const { data, error } = await supabase.from('tasks').select('*').in('id', assignedTaskIds).order('created_at', { ascending: false });
    if (error) throw error;
    assignedTasks = (data as Task[]) ?? [];
  }

  const tasksById = new Map<string, Task>();
  for (const task of ownedTasks) tasksById.set(task.id, task);
  for (const task of assignedTasks) tasksById.set(task.id, task);
  const tasks = Array.from(tasksById.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const taskIds = tasks.map((task) => task.id);

  if (taskIds.length === 0) {
    return {
      tasks,
      members: ((memberRes.data as TeamMember[]) ?? []).filter((member) => member.user_id === currentUserId),
      visibleTeamMembers: (memberRes.data as TeamMember[]) ?? [],
      labels: (labelRes.data as Label[]) ?? [],
      userProfiles: (profilesRes.data as UserProfile[]) ?? [],
      taskAssignees: [] as TaskAssignee[],
      taskLabels: [] as TaskLabel[],
      taskUserAssignees: [] as TaskUserAssignee[],
      comments: [] as Comment[],
      activities: [] as TaskActivity[],
    };
  }

  const [assignmentRes, taskLabelRes, taskUserAssigneeRes, commentRes, activityRes] = await Promise.all([
    supabase.from('task_assignees').select('*').in('task_id', taskIds),
    supabase.from('task_labels').select('*').in('task_id', taskIds),
    supabase.from('task_user_assignees').select('*').in('task_id', taskIds),
    supabase.from('comments').select('*').in('task_id', taskIds).order('created_at', { ascending: true }),
    supabase.from('task_activities').select('*').in('task_id', taskIds).order('created_at', { ascending: false }),
  ]);

  if (assignmentRes.error) throw assignmentRes.error;
  if (taskLabelRes.error) throw taskLabelRes.error;
  if (taskUserAssigneeRes.error) throw taskUserAssigneeRes.error;
  if (commentRes.error) throw commentRes.error;
  if (activityRes.error) throw activityRes.error;

  return {
    tasks,
    members: ((memberRes.data as TeamMember[]) ?? []).filter((member) => member.user_id === currentUserId),
    visibleTeamMembers: (memberRes.data as TeamMember[]) ?? [],
    labels: (labelRes.data as Label[]) ?? [],
    userProfiles: (profilesRes.data as UserProfile[]) ?? [],
    taskAssignees: (assignmentRes.data as TaskAssignee[]) ?? [],
    taskLabels: (taskLabelRes.data as TaskLabel[]) ?? [],
    taskUserAssignees: (taskUserAssigneeRes.data as TaskUserAssignee[]) ?? [],
    comments: (commentRes.data as Comment[]) ?? [],
    activities: (activityRes.data as TaskActivity[]) ?? [],
  };
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [visibleTeamMembers, setVisibleTeamMembers] = useState<TeamMember[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [taskAssignees, setTaskAssignees] = useState<TaskAssignee[]>([]);
  const [taskLabels, setTaskLabels] = useState<TaskLabel[]>([]);
  const [taskUserAssignees, setTaskUserAssignees] = useState<TaskUserAssignee[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activities, setActivities] = useState<TaskActivity[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | Priority>('all');
  const [labelFilter, setLabelFilter] = useState<'all' | string>('all');
  const [activeColumn, setActiveColumn] = useState<TaskStatus | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    let alive = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function refresh(currentUserId: string) {
      const refreshed = await loadBoardData(currentUserId);
      if (!alive) return;
      setTasks(refreshed.tasks);
      setMembers(refreshed.members);
      setVisibleTeamMembers(refreshed.visibleTeamMembers);
      setLabels(refreshed.labels);
      setUserProfiles(refreshed.userProfiles);
      setTaskAssignees(refreshed.taskAssignees);
      setTaskLabels(refreshed.taskLabels);
      setTaskUserAssignees(refreshed.taskUserAssignees);
      setComments(refreshed.comments);
      setActivities(refreshed.activities);
    }

    async function bootstrap() {
      try {
        setLoading(true);
        setError(null);
        const user = await ensureGuestSession();
        if (!alive) return;
        setUserId(user.id);

        const defaultName = user.user_metadata?.name || `User-${user.id.slice(0, 6)}`;
        const { error: ensureProfileError } = await supabase.rpc('ensure_my_profile', {
          p_display_name: defaultName,
          p_avatar_url: user.user_metadata?.avatar_url ?? null,
          p_color: '#db2777',
        });
        if (ensureProfileError) {
          throw ensureProfileError;
        }

        await refresh(user.id);

        channel = supabase
          .channel(`board-${user.id}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, async () => {
            if (!alive) return;
            await refresh(user.id);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, async () => {
            if (!alive) return;
            await refresh(user.id);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'labels' }, async () => {
            if (!alive) return;
            await refresh(user.id);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, async () => {
            if (!alive) return;
            await refresh(user.id);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'task_assignees' }, async () => {
            if (!alive) return;
            await refresh(user.id);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'task_labels' }, async () => {
            if (!alive) return;
            await refresh(user.id);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'task_user_assignees' }, async () => {
            if (!alive) return;
            await refresh(user.id);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, async () => {
            if (!alive) return;
            await refresh(user.id);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'task_activities' }, async () => {
            if (!alive) return;
            await refresh(user.id);
          })
          .subscribe();
      } catch (bootstrapError) {
        if (alive) {
          setError(bootstrapError instanceof Error ? bootstrapError.message : 'Unable to initialize app.');
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    void bootstrap();

    return () => {
      alive = false;
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, []);

  const taskLabelIdSetByTaskId = useMemo(() => {
    const mapping: Record<string, Set<string>> = {};
    for (const taskLabel of taskLabels) {
      if (!mapping[taskLabel.task_id]) {
        mapping[taskLabel.task_id] = new Set();
      }
      mapping[taskLabel.task_id].add(taskLabel.label_id);
    }
    return mapping;
  }, [taskLabels]);

  const visibleTasks = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesSearch =
        searchTerm.length === 0 ||
        task.title.toLowerCase().includes(searchTerm) ||
        (task.description ?? '').toLowerCase().includes(searchTerm);
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
      const taskLabelIds = taskLabelIdSetByTaskId[task.id] ?? new Set<string>();
      const matchesLabel = labelFilter === 'all' || taskLabelIds.has(labelFilter);
      return matchesSearch && matchesPriority && matchesLabel;
    });
  }, [tasks, search, priorityFilter, labelFilter, taskLabelIdSetByTaskId]);

  const groupedTasks = useMemo(() => {
    return STATUS_ORDER.reduce<Record<TaskStatus, Task[]>>(
      (acc, status) => {
        acc[status] = visibleTasks.filter((task) => task.status === status);
        return acc;
      },
      {
        todo: [],
        in_progress: [],
        in_review: [],
        done: [],
      },
    );
  }, [visibleTasks]);

  const taskAssigneesByTaskId = useMemo(() => {
    const memberById = new Map(members.map((member) => [member.id, member]));
    const mapping: Record<string, TeamMember[]> = {};

    for (const assignment of taskAssignees) {
      const member = memberById.get(assignment.member_id);
      if (!member) continue;
      if (!mapping[assignment.task_id]) {
        mapping[assignment.task_id] = [];
      }
      mapping[assignment.task_id].push(member);
    }

    return mapping;
  }, [members, taskAssignees]);

  const taskUserAssigneesByTaskId = useMemo(() => {
    const profileById = new Map(userProfiles.map((profile) => [profile.id, profile]));
    const mapping: Record<string, UserProfile[]> = {};

    for (const assignment of taskUserAssignees) {
      const profile = profileById.get(assignment.assignee_user_id);
      if (!profile) continue;
      if (!mapping[assignment.task_id]) {
        mapping[assignment.task_id] = [];
      }
      mapping[assignment.task_id].push(profile);
    }

    return mapping;
  }, [userProfiles, taskUserAssignees]);

  const taskLabelsByTaskId = useMemo(() => {
    const labelById = new Map(labels.map((label) => [label.id, label]));
    const mapping: Record<string, Label[]> = {};

    for (const taskLabel of taskLabels) {
      const label = labelById.get(taskLabel.label_id);
      if (!label) continue;
      if (!mapping[taskLabel.task_id]) {
        mapping[taskLabel.task_id] = [];
      }
      mapping[taskLabel.task_id].push(label);
    }

    return mapping;
  }, [labels, taskLabels]);

  const commentsByTaskId = useMemo(() => {
    const mapping: Record<string, Comment[]> = {};
    for (const comment of comments) {
      if (!mapping[comment.task_id]) {
        mapping[comment.task_id] = [];
      }
      mapping[comment.task_id].push(comment);
    }
    return mapping;
  }, [comments]);

  const activitiesByTaskId = useMemo(() => {
    const mapping: Record<string, TaskActivity[]> = {};
    for (const activity of activities) {
      if (!mapping[activity.task_id]) {
        mapping[activity.task_id] = [];
      }
      mapping[activity.task_id].push(activity);
    }
    return mapping;
  }, [activities]);

  const teamMemberships = useMemo(() => {
    const grouped: Record<string, TeamMember[]> = {};
    for (const member of visibleTeamMembers) {
      if (!grouped[member.user_id]) {
        grouped[member.user_id] = [];
      }
      grouped[member.user_id].push(member);
    }

    const profileById = new Map(userProfiles.map((profile) => [profile.id, profile]));

    return Object.entries(grouped)
      .filter(([ownerId, teamMembers]) => ownerId !== userId && teamMembers.some((member) => member.profile_user_id === userId))
      .map(([ownerId, teamMembers]) => ({
        ownerId,
        ownerName: profileById.get(ownerId)?.display_name ?? `User-${ownerId.slice(0, 6)}`,
        members: teamMembers,
      }));
  }, [visibleTeamMembers, userProfiles, userId]);

  const selectedTask = useMemo(() => tasks.find((task) => task.id === selectedTaskId) ?? null, [tasks, selectedTaskId]);

  const summary = useMemo(() => {
    const total = tasks.length;
    const complete = tasks.filter((task) => task.status === 'done').length;
    const overdue = tasks.filter((task) => isOverdue(task.due_date)).length;
    return { total, complete, overdue };
  }, [tasks]);

  async function createActivities(items: ActivityInput[]) {
    if (!userId || items.length === 0) return;

    const payload = items.map((item) => ({
      ...item,
      metadata: item.metadata ?? null,
      user_id: userId,
    }));

    const { error: activityError } = await supabase.from('task_activities').insert(payload);
    if (activityError) {
      throw activityError;
    }
  }

  async function createMember(input: { name: string; color: string; avatarUrl: string | null; profileUserId?: string | null }) {
    if (!userId) throw new Error('Guest session not ready.');
    if (input.profileUserId) {
      const { error: insertError } = await supabase
        .from('team_members')
        .upsert(
          {
            name: input.name,
            color: input.color,
            avatar_url: input.avatarUrl,
            profile_user_id: input.profileUserId,
            user_id: userId,
          },
          { onConflict: 'user_id,profile_user_id', ignoreDuplicates: true },
        );
      if (insertError) throw insertError;
      return;
    }

    const { error: insertError } = await supabase.from('team_members').insert({
      name: input.name,
      color: input.color,
      avatar_url: input.avatarUrl,
      profile_user_id: null,
      user_id: userId,
    });
    if (insertError) throw insertError;
  }

  async function createLabel(input: { name: string; color: string }) {
    if (!userId) throw new Error('Guest session not ready.');
    const { error: insertError } = await supabase.from('labels').insert({
      name: input.name,
      color: input.color,
      user_id: userId,
    });
    if (insertError) throw insertError;
  }

  async function renameSelf(displayName: string) {
    if (!userId) throw new Error('Guest session not ready.');
    const { error: updateError } = await supabase.from('profiles').update({ display_name: displayName }).eq('id', userId);
    if (updateError) throw updateError;
    setUserProfiles((current) => current.map((profile) => (profile.id === userId ? { ...profile, display_name: displayName } : profile)));
  }

  async function addMemberFromRealUser(profileUserId: string) {
    const profile = userProfiles.find((user) => user.id === profileUserId);
    if (!profile) {
      throw new Error('User not found.');
    }
    await createMember({
      name: profile.display_name,
      avatarUrl: profile.avatar_url,
      color: profile.color,
      profileUserId: profile.id,
    });
  }

  async function createTask(input: {
    title: string;
    description: string;
    priority: Priority;
    dueDate: string | null;
    assigneeIds: string[];
    labelIds: string[];
    userAssigneeIds: string[];
  }) {
    if (!userId) throw new Error('Guest session not ready.');

    const { data: insertedTask, error: insertError } = await supabase
      .from('tasks')
      .insert({
        title: input.title,
        description: input.description || null,
        status: 'todo',
        priority: input.priority,
        due_date: input.dueDate,
        user_id: userId,
      })
      .select('id')
      .single();
    if (insertError) throw insertError;

    const activityItems: ActivityInput[] = [{ task_id: insertedTask.id, event_type: 'created', message: 'Task created' }];

    if (input.assigneeIds.length > 0) {
      const assignmentPayload = input.assigneeIds.map((memberId) => ({ task_id: insertedTask.id, member_id: memberId, user_id: userId }));
      const { error: assignmentError } = await supabase.from('task_assignees').insert(assignmentPayload);
      if (assignmentError) throw assignmentError;
    }

    if (input.labelIds.length > 0) {
      const labelPayload = input.labelIds.map((labelId) => ({ task_id: insertedTask.id, label_id: labelId, user_id: userId }));
      const { error: labelError } = await supabase.from('task_labels').insert(labelPayload);
      if (labelError) throw labelError;
    }

    if (input.userAssigneeIds.length > 0) {
      const userPayload = input.userAssigneeIds.map((assigneeUserId) => ({
        task_id: insertedTask.id,
        assignee_user_id: assigneeUserId,
        assigned_by_user_id: userId,
      }));
      const { error: userAssignError } = await supabase.from('task_user_assignees').insert(userPayload);
      if (userAssignError) throw userAssignError;

      for (const assigneeUserId of input.userAssigneeIds) {
        const user = userProfiles.find((candidate) => candidate.id === assigneeUserId);
        if (user) {
          activityItems.push({ task_id: insertedTask.id, event_type: 'assignment_added', message: `Assigned real user ${user.display_name}` });
        }
      }
    }

    await createActivities(activityItems);
  }

  async function addComment(taskId: string, body: string) {
    if (!userId) throw new Error('Guest session not ready.');
    const { error: insertError } = await supabase.from('comments').insert({ task_id: taskId, body, user_id: userId });
    if (insertError) throw insertError;
  }

  async function updateTaskDetails(taskId: string, input: { title: string; description: string; priority: Priority; dueDate: string | null }) {
    const existing = tasks.find((task) => task.id === taskId);
    if (!existing) return;

    const nextDescription = input.description || null;
    const nextDueDate = input.dueDate;
    const hasChanges =
      existing.title !== input.title ||
      existing.description !== nextDescription ||
      existing.priority !== input.priority ||
      existing.due_date !== nextDueDate;
    if (!hasChanges) return;

    const { error: updateError } = await supabase
      .from('tasks')
      .update({ title: input.title, description: nextDescription, priority: input.priority, due_date: nextDueDate })
      .eq('id', taskId)
      .eq('user_id', existing.user_id);
    if (updateError) throw updateError;

    const items: ActivityInput[] = [];
    if (existing.title !== input.title) items.push({ task_id: taskId, event_type: 'edited', message: `Updated title to "${input.title}"` });
    if (existing.description !== nextDescription) items.push({ task_id: taskId, event_type: 'edited', message: 'Updated description' });
    if (existing.priority !== input.priority)
      items.push({ task_id: taskId, event_type: 'edited', message: `Changed priority from ${existing.priority} to ${input.priority}` });
    if (existing.due_date !== nextDueDate) items.push({ task_id: taskId, event_type: 'edited', message: `Updated due date to ${nextDueDate ?? 'none'}` });
    await createActivities(items);
  }

  async function updateTaskUserAssignments(taskId: string, userIds: string[]) {
    if (!userId) throw new Error('Guest session not ready.');

    const currentUserIds = taskUserAssignees.filter((item) => item.task_id === taskId).map((item) => item.assignee_user_id);
    const existingSet = new Set(currentUserIds);
    const nextSet = new Set(userIds);
    const added = userIds.filter((id) => !existingSet.has(id));
    const removed = currentUserIds.filter((id) => !nextSet.has(id));
    if (added.length === 0 && removed.length === 0) return;

    if (removed.length > 0) {
      const { error: deleteError } = await supabase
        .from('task_user_assignees')
        .delete()
        .eq('task_id', taskId)
        .eq('assigned_by_user_id', userId)
        .in('assignee_user_id', removed);
      if (deleteError) throw deleteError;
    }

    if (added.length > 0) {
      const payload = added.map((assigneeUserId) => ({
        task_id: taskId,
        assignee_user_id: assigneeUserId,
        assigned_by_user_id: userId,
      }));
      const { error: insertError } = await supabase.from('task_user_assignees').insert(payload);
      if (insertError) throw insertError;
    }

    const items: ActivityInput[] = [];
    for (const assigneeUserId of added) {
      const profile = userProfiles.find((candidate) => candidate.id === assigneeUserId);
      if (profile) items.push({ task_id: taskId, event_type: 'assignment_added', message: `Assigned real user ${profile.display_name}` });
    }
    for (const assigneeUserId of removed) {
      const profile = userProfiles.find((candidate) => candidate.id === assigneeUserId);
      if (profile) items.push({ task_id: taskId, event_type: 'assignment_removed', message: `Unassigned real user ${profile.display_name}` });
    }

    await createActivities(items);
  }

  async function updateTaskLabels(taskId: string, labelIds: string[]) {
    if (!userId) throw new Error('Guest session not ready.');

    const currentLabelIds = taskLabels.filter((item) => item.task_id === taskId).map((item) => item.label_id);
    const existingSet = new Set(currentLabelIds);
    const nextSet = new Set(labelIds);
    const added = labelIds.filter((id) => !existingSet.has(id));
    const removed = currentLabelIds.filter((id) => !nextSet.has(id));
    if (added.length === 0 && removed.length === 0) return;

    if (removed.length > 0) {
      const { error: deleteError } = await supabase
        .from('task_labels')
        .delete()
        .eq('task_id', taskId)
        .eq('user_id', userId)
        .in('label_id', removed);
      if (deleteError) throw deleteError;
    }
    if (added.length > 0) {
      const payload = added.map((labelId) => ({ task_id: taskId, label_id: labelId, user_id: userId }));
      const { error: insertError } = await supabase.from('task_labels').insert(payload);
      if (insertError) throw insertError;
    }

    const items: ActivityInput[] = [];
    for (const labelId of added) {
      const label = labels.find((candidate) => candidate.id === labelId);
      if (label) items.push({ task_id: taskId, event_type: 'edited', message: `Added label ${label.name}` });
    }
    for (const labelId of removed) {
      const label = labels.find((candidate) => candidate.id === labelId);
      if (label) items.push({ task_id: taskId, event_type: 'edited', message: `Removed label ${label.name}` });
    }
    await createActivities(items);
  }

  async function updateTaskStatus(taskId: string, status: TaskStatus) {
    const existing = tasks.find((task) => task.id === taskId);
    if (!existing || existing.status === status) return;

    setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, status } : task)));
    const { error: updateError } = await supabase.from('tasks').update({ status }).eq('id', taskId).eq('user_id', existing.user_id);

    if (updateError) {
      setTasks((current) => current.map((task) => (task.id === taskId ? existing : task)));
      setError(updateError.message);
      return;
    }

    try {
      await createActivities([
        {
          task_id: taskId,
          event_type: 'status_changed',
          message: `Moved from ${STATUS_LABELS[existing.status]} to ${STATUS_LABELS[status]}`,
          metadata: { from_status: existing.status, to_status: status },
        },
      ]);
    } catch (activityError) {
      setError(activityError instanceof Error ? activityError.message : 'Could not save activity log.');
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const status = event.active.data.current?.status;
    if (status && STATUS_ORDER.includes(status)) setActiveColumn(status as TaskStatus);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveColumn(null);
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;
    if (!overId) return;
    const status = resolveDropStatus(overId, tasks);
    if (!status) return;
    await updateTaskStatus(activeId, status);
  }

  if (loading) {
    return (
      <div className="app-shell centered">
        <div className="state-card">Loading your board...</div>
      </div>
    );
  }

  if (error && tasks.length === 0) {
    return (
      <div className="app-shell centered">
        <div className="state-card error">Could not load board: {error}</div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          {/* <p className="eyebrow">Flowboard</p> */}
          <h1>Lightweight Task Board</h1>
        </div>

        <div className="summary-pills">
          <span>
            <strong>{summary.total}</strong> Total
          </span>
          <span>
            <strong>{summary.complete}</strong> Done
          </span>
          <span className={summary.overdue > 0 ? 'danger' : ''}>
            <strong>{summary.overdue}</strong> Overdue
          </span>
        </div>

        <button className="primary" onClick={() => setShowModal(true)}>
          + New Task
        </button>
      </header>

      <section className="controls">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search tasks by title or description"
          aria-label="Search tasks"
        />
        <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as 'all' | Priority)}>
          <option value="all">All priorities</option>
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
        </select>
        <select value={labelFilter} onChange={(event) => setLabelFilter(event.target.value as 'all' | string)}>
          <option value="all">All labels</option>
          {labels.map((label) => (
            <option key={label.id} value={label.id}>
              {label.name}
            </option>
          ))}
        </select>
      </section>

      {error ? <div className="banner-error">{error}</div> : null}

      <section className="board-layout">
        <aside className="left-sidebar">
          <LabelPanel labels={labels} onCreateLabel={createLabel} />
          <UserPanel
            users={userProfiles}
            members={members}
            teamMemberships={teamMemberships}
            currentUserId={userId}
            onRenameSelf={renameSelf}
            onAddMemberFromUser={addMemberFromRealUser}
          />
        </aside>

        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <main className="board-grid">
            {STATUS_ORDER.map((status) => (
              <Column
                key={status}
                status={status}
                tasks={groupedTasks[status]}
                activeColumn={activeColumn}
                taskAssigneesByTaskId={taskAssigneesByTaskId}
                taskUserAssigneesByTaskId={taskUserAssigneesByTaskId}
                taskLabelsByTaskId={taskLabelsByTaskId}
                onOpenTaskDetails={setSelectedTaskId}
              />
            ))}
          </main>
        </DndContext>
      </section>

      {visibleTasks.length === 0 ? (
        <div className="empty-state">
          <h3>No matching tasks</h3>
          <p>Try adjusting search or filters, or create a new task in {STATUS_LABELS.todo}.</p>
        </div>
      ) : null}

      <TaskModal
        open={showModal}
        members={members}
        labels={labels}
        users={userProfiles}
        currentUserId={userId}
        onClose={() => setShowModal(false)}
        onCreate={createTask}
      />
      <TaskDetailPanel
        open={selectedTask !== null}
        task={selectedTask}
        comments={selectedTask ? commentsByTaskId[selectedTask.id] ?? [] : []}
        activities={selectedTask ? activitiesByTaskId[selectedTask.id] ?? [] : []}
        userAssignees={selectedTask ? taskUserAssigneesByTaskId[selectedTask.id] ?? [] : []}
        labels={labels}
        taskLabels={selectedTask ? taskLabelsByTaskId[selectedTask.id] ?? [] : []}
        users={userProfiles}
        currentUserId={userId}
        onClose={() => setSelectedTaskId(null)}
        onAddComment={addComment}
        onUpdateTask={updateTaskDetails}
        onUpdateLabels={updateTaskLabels}
        onUpdateUserAssignments={updateTaskUserAssignments}
      />
    </div>
  );
}
