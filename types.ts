
export interface Project {
  id: string;
  name: string;
}

export interface Worker {
  id: string;
  name:string;
  rate: number;
}

export enum WorkEntryType {
  Task = 'task',
  Hourly = 'hourly',
}

export interface BaseWorkEntry {
  id: string;
  projectId: string | null;
  workerId: string;
  date: string; // ISO string
}

export interface TaskWorkEntry extends BaseWorkEntry {
  type: WorkEntryType.Task;
  description: string; // Table/String number
  reward: number;
  x: number;
  y: number;
}

export interface HourlyWorkEntry extends BaseWorkEntry {
  type: WorkEntryType.Hourly;
  startTime: string; // ISO string
  endTime: string; // ISO string
  duration: number; // in hours
}

export type WorkEntry = TaskWorkEntry | HourlyWorkEntry;

export type Page = 'plan' | 'records' | 'stats' | 'settings';