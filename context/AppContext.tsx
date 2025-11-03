
import React, { createContext, useContext, useState, useCallback } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Project, Worker, WorkEntry, Page, Theme, AttendanceRecord } from '../types';
import { useI18n } from './I18nContext';
import { ZARASAI_STOLY, Locale } from '../translations';

const ZARASAI_PROJECT: Project = {
  id: 'zarasai_predefined',
  name: 'Zarasai',
  status: 'active',
  tables: ZARASAI_STOLY,
  workerIds: [],
};

interface AppState {
  projects: Project[];
  workers: Worker[];
  workEntries: WorkEntry[];
  attendanceRecords: AttendanceRecord[];
  page: Page;
  toast: string | null;
  loading: boolean;
}

interface AppContextType extends AppState {
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  setWorkers: React.Dispatch<React.SetStateAction<Worker[]>>;
  setWorkEntries: React.Dispatch<React.SetStateAction<WorkEntry[]>>;
  setPage: React.Dispatch<React.SetStateAction<Page>>;
  
  addProject: (project: Omit<Project, 'id' | 'workerIds'>) => void;
  deleteProject: (id: string) => void;
  updateProjectWorkers: (projectId: string, workerIds: string[]) => void;

  addWorker: (worker: Omit<Worker, 'id'>) => Worker;
  updateWorker: (worker: Worker) => void;
  deleteWorker: (id: string) => void;
  addWorkEntry: (entry: Omit<WorkEntry, 'id'>, suppressToast?: boolean) => void;
  addMultipleWorkEntries: (entries: Omit<WorkEntry, 'id'>[]) => void;
  updateWorkEntry: (entry: WorkEntry) => void;
  deleteWorkEntry: (id: string) => void;
  saveAttendance: (projectId: string, date: string, presentWorkerIds: string[]) => void;
  mergeImportedData: (data: any, setTheme: (theme: Theme) => void, setLocale: (locale: Locale) => void) => void;
  
  showToast: (message: string) => void;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [projects, setProjects] = useLocalStorage<Project[]>('projects', [ZARASAI_PROJECT]);
  const [workers, setWorkers] = useLocalStorage<Worker[]>('workers', []);
  const [workEntries, setWorkEntries] = useLocalStorage<WorkEntry[]>('workEntries', []);
  const [attendanceRecords, setAttendanceRecords] = useLocalStorage<AttendanceRecord[]>('attendanceRecords', []);

  const [page, setPage] = useState<Page>('plan');
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { t } = useI18n();

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const addProject = useCallback((project: Omit<Project, 'id' | 'workerIds'>) => {
    const newProject: Project = { ...project, id: Date.now().toString(), workerIds: [] };
    setProjects(prev => [...prev, newProject]);
    showToast(t('toast_project_added'));
  }, [setProjects, t]);

  const deleteProject = useCallback((id: string) => {
    if (id === ZARASAI_PROJECT.id) {
      showToast('Cannot delete the default Zarasai project.');
      return;
    }
    setProjects(prev => prev.filter(p => p.id !== id));
    setWorkEntries(prev => prev.filter(w => w.projectId !== id));
    setAttendanceRecords(prev => prev.filter(a => a.projectId !== id));
    showToast(t('toast_project_deleted'));
  }, [setProjects, setWorkEntries, setAttendanceRecords, t]);

  const updateProjectWorkers = useCallback((projectId: string, workerIds: string[]) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, workerIds } : p));
    showToast(t('toast_team_updated'));
  }, [setProjects, t]);

  const addWorker = useCallback((worker: Omit<Worker, 'id'>): Worker => {
    const newWorker: Worker = {
        ...worker,
        id: Date.now().toString(),
        panelRate: worker.panelRate || 0,
        cableRateSmall: worker.cableRateSmall || 0,
        cableRateMedium: worker.cableRateMedium || 0,
        cableRateLarge: worker.cableRateLarge || 0,
    };
    setWorkers(prev => [...prev, newWorker]);
    showToast(t('toast_worker_added'));
    return newWorker;
  }, [setWorkers, t]);

  const updateWorker = useCallback((updatedWorker: Worker) => {
    setWorkers(prev => prev.map(w => w.id === updatedWorker.id ? updatedWorker : w));
    showToast(t('toast_worker_updated'));
  }, [setWorkers, t]);

  const deleteWorker = useCallback((id: string) => {
    setWorkers(prev => prev.filter(w => w.id !== id));
    
    setWorkEntries(prev => prev.map(entry => ({
      ...entry,
      workerIds: entry.workerIds.filter(workerId => workerId !== id)
    })).filter(entry => entry.workerIds.length > 0)); 
    
    setProjects(prev => prev.map(p => ({
      ...p,
      workerIds: p.workerIds.filter(workerId => workerId !== id)
    })));

    setAttendanceRecords(prev => prev.map(ar => ({
        ...ar,
        presentWorkerIds: ar.presentWorkerIds.filter(workerId => workerId !== id)
    })));

    showToast(t('toast_worker_deleted'));
  }, [setWorkers, setWorkEntries, setProjects, setAttendanceRecords, t]);
  
  const addWorkEntry = useCallback((entry: Omit<WorkEntry, 'id'>, suppressToast = false) => {
    const newEntry = {
      ...entry,
      id: Date.now().toString(),
    } as WorkEntry;
    setWorkEntries(prev => [newEntry, ...prev]);
    if (!suppressToast) {
        showToast(t('toast_entry_added'));
    }
  }, [setWorkEntries, t]);

  const addMultipleWorkEntries = useCallback((entries: Omit<WorkEntry, 'id'>[]) => {
    const newEntries = entries.map((entry, index) => ({
        ...entry,
        id: `${Date.now()}-${index}`,
    })) as WorkEntry[];

    setWorkEntries(prev => [...newEntries, ...prev]);
    showToast(t('toast_tables_logged', newEntries.length));
  }, [setWorkEntries, t]);

  const updateWorkEntry = useCallback((updatedEntry: WorkEntry) => {
    setWorkEntries(prev => prev.map(e => e.id === updatedEntry.id ? updatedEntry : e));
    showToast(t('toast_entry_updated'));
  }, [setWorkEntries, t]);

  const deleteWorkEntry = useCallback((id: string) => {
    setWorkEntries(prev => prev.filter(e => e.id !== id));
    showToast(t('toast_entry_deleted'));
  }, [setWorkEntries, t]);
  
  const saveAttendance = useCallback((projectId: string, date: string, presentWorkerIds: string[]) => {
      const id = `${projectId}_${date}`;
      setAttendanceRecords(prev => {
          const existingRecordIndex = prev.findIndex(r => r.id === id);
          const newRecord: AttendanceRecord = { id, projectId, date, presentWorkerIds };
          if (existingRecordIndex > -1) {
              const updatedRecords = [...prev];
              updatedRecords[existingRecordIndex] = newRecord;
              return updatedRecords;
          } else {
              return [newRecord, ...prev];
          }
      });
      showToast(t('toast_attendance_saved'));
  }, [setAttendanceRecords, t]);
  
  const mergeImportedData = useCallback((data: any, setTheme: (theme: Theme) => void, setLocale: (locale: Locale) => void) => {
    const localProjects = new Map(projects.map(p => [p.id, p]));
    if (data.projects) {
        data.projects.forEach((p: Project) => {
            if (p.id === ZARASAI_PROJECT.id) return;
            const projectWithDefaults = {...{workerIds: []}, ...p};
            localProjects.set(p.id, projectWithDefaults);
        });
    }
    if (!localProjects.has(ZARASAI_PROJECT.id)) {
        localProjects.set(ZARASAI_PROJECT.id, ZARASAI_PROJECT);
    }
    setProjects(Array.from(localProjects.values()));

    const localWorkers = new Map(workers.map(w => [w.id, w]));
    if (data.workers) {
        data.workers.forEach((w: Worker) => {
            localWorkers.set(w.id, w);
        });
    }
    setWorkers(Array.from(localWorkers.values()));

    const localWorkEntries = new Map(workEntries.map(e => [e.id, e]));
    if (data.workEntries) {
        data.workEntries.forEach((e: WorkEntry) => {
            localWorkEntries.set(e.id, e);
        });
    }
    setWorkEntries(Array.from(localWorkEntries.values()));
    
    const localAttendance = new Map(attendanceRecords.map(a => [a.id, a]));
    if (data.attendanceRecords) {
        data.attendanceRecords.forEach((a: AttendanceRecord) => {
            localAttendance.set(a.id, a);
        });
    }
    setAttendanceRecords(Array.from(localAttendance.values()));

    if (data.theme) setTheme(data.theme);
    if (data.locale) setLocale(data.locale);

    showToast(t('toast_data_merged'));
    setTimeout(() => window.location.reload(), 1000);
  }, [projects, workers, workEntries, attendanceRecords, setProjects, setWorkers, setWorkEntries, setAttendanceRecords, showToast, t]);


  const value = {
    projects, setProjects,
    workers, setWorkers,
    workEntries, setWorkEntries,
    attendanceRecords,
    page, setPage,
    toast, showToast,
    loading, setLoading,
    addProject, deleteProject, updateProjectWorkers,
    addWorker, updateWorker, deleteWorker,
    addWorkEntry, addMultipleWorkEntries, updateWorkEntry, deleteWorkEntry,
    saveAttendance,
    mergeImportedData
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
