/**
 * API client for Netlify backend (Google Sheets).
 * All credentials stay on the server; this only calls /api/*.
 */

const BASE = '';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const raw = await res.text();
  let data: unknown = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    // non-JSON response
  }
  const errMsg = (data as { error?: string }).error || res.statusText || `Request failed (${res.status})`;
  if (!res.ok) throw new Error(errMsg);
  return data as T;
}

export interface Task {
  id: string;
  text: string;
  color: string;
  bucket: string;
  done: boolean;
  points: number;
  createdAt: number;
  due: string | null;
  notes: string;
  subtasks: { id: string; text: string; done: boolean }[];
  recur: string;
  completedAt: number | null;
  snoozedUntil: number | null;
  starred: boolean;
}

export interface ColorTag {
  id: string;
  label: string;
  bg: string;
  border: string;
  dot: string;
}

export interface ApiData {
  tasks: Task[];
  colors: ColorTag[];
  scoreHistory: Record<string, number>;
}

export async function fetchData(): Promise<ApiData> {
  return request<ApiData>('/api/data');
}

export async function createTask(task: Task): Promise<void> {
  return request<void>('/api/tasks', { method: 'POST', body: JSON.stringify({ task }) });
}

export async function updateTask(id: string, patch: Partial<Task>): Promise<void> {
  return request<void>('/api/tasks/update', { method: 'POST', body: JSON.stringify({ id, patch }) });
}

export async function deleteTask(id: string): Promise<void> {
  return request<void>('/api/tasks/delete', { method: 'POST', body: JSON.stringify({ id }) });
}

export async function replaceTasks(tasks: Task[]): Promise<void> {
  return request<void>('/api/tasks/replace', { method: 'POST', body: JSON.stringify({ tasks }) });
}

export async function saveColors(colors: ColorTag[]): Promise<void> {
  return request<void>('/api/colors', { method: 'POST', body: JSON.stringify({ colors }) });
}

export async function saveScoreHistory(scoreHistory: Record<string, number>): Promise<void> {
  return request<void>('/api/score-history', { method: 'POST', body: JSON.stringify({ scoreHistory }) });
}
