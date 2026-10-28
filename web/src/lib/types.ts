export type ProjectStatus = 'active' | 'paused' | 'idea' | 'done';
export type TaskStatus = 'backlog' | 'todo' | 'doing' | 'done';
export type PostStatus = 'idea' | 'draft' | 'scheduled' | 'published';
export type Platform = 'linkedin' | 'instagram' | 'x' | 'tiktok' | 'youtube' | 'threads' | 'blog' | 'newsletter';
export type CellKind = 'task' | 'routine';
export type Priority = 0 | 1 | 2 | 3;

interface Row {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface Project extends Row {
  name: string;
  description: string;
  color: string;
  status: ProjectStatus;
  url: string;
  repo: string;
  notes: string;
  position: number;
  archived: boolean;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Task extends Row {
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  due_date: string | null;
  project_id: string | null;
  cell_id: string | null;
  position: number;
  focus: boolean;
  checklist: ChecklistItem[];
  completed_at: string | null;
}

export interface Post extends Row {
  title: string;
  body: string;
  platforms: Platform[];
  format: string;
  status: PostStatus;
  scheduled_date: string | null;
  scheduled_time: string | null;
  project_id: string | null;
  link: string;
  published_url: string;
  notes: string;
  position: number;
}

export interface Goal extends Row {
  title: string;
  why: string;
  values_text: string;
  deadline: string | null;
  successes: string;
  obstacles: string;
  solutions: string;
  project_id: string | null;
  position: number;
  archived: boolean;
}

/** A square of the 64 chart. slot -1 is the pillar itself, 0..7 its actions. */
export interface Cell extends Row {
  goal_id: string;
  pillar: number;
  slot: number;
  title: string;
  kind: CellKind;
  done: boolean;
  start_date: string | null;
  notes: string;
}

export interface RoutineLog {
  cell_id: string;
  date: string;
}

export interface JournalEntry {
  date: string;
  plan: string;
  reflection: string;
  updated_at: string;
}

export interface Collections {
  projects: Project;
  tasks: Task;
  posts: Post;
  goals: Goal;
  cells: Cell;
}
export type CollectionName = keyof Collections;

export interface Snapshot {
  projects: Project[];
  tasks: Task[];
  posts: Post[];
  goals: Goal[];
  cells: Cell[];
  routine_logs: RoutineLog[];
  journal: JournalEntry[];
}
