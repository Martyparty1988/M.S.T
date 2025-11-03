export type Page = 'plan' | 'attendance' | 'records' | 'payroll' | 'settings';
export type Theme = 'dusk' | 'slate' | 'forest' | 'crimson';

export interface Worker {
  id: string;
  name: string;
  rate: number; // hourly
  panelRate?: number; // per panel
  cableRateSmall?: number; // per small table
  cableRateMedium?: number; // per medium table
  cableRateLarge?: number; // per large table
}

export type ProjectStatus = 'active' | 'completed' | 'paused';

export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  tables: string[];
  workerIds: string[];
}

export interface AttendanceRecord {
  id: string; // Composite key, e.g., `${projectId}_${date}`
  projectId: string;
  date: string; // YYYY-MM-DD
  presentWorkerIds: string[];
}

interface BaseWorkEntry {
  id: string;
  projectId: string;
  workerIds: string[];
  startTime: string; // ISO
  endTime: string; // ISO
  duration: number; // hours
  date: string; // ISO - should be the date of the start time for grouping
}

export interface HourlyWorkEntry extends BaseWorkEntry {
  type: 'hourly';
  description?: string;
}

export interface PanelingWorkEntry extends BaseWorkEntry {
  type: 'task';
  subType: 'paneling';
  moduleCount: number;
  modulesPerHour: number;
}

export interface ConstructionWorkEntry extends BaseWorkEntry {
  type: 'task';
  subType: 'construction';
  description: string;
}

export type TableSize = 'small' | 'medium' | 'large';

export interface CablesWorkEntry extends BaseWorkEntry {
  type: 'task';
  subType: 'cables';
  table: string;
  tableSize: TableSize;
}

export type WorkEntry = HourlyWorkEntry | PanelingWorkEntry | ConstructionWorkEntry | CablesWorkEntry;
