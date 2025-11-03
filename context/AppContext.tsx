
import React, { createContext, useContext, useState, useCallback } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Project, Worker, WorkEntry, Page, Theme } from '../types';
import { useI18n } from './I18nContext';
import { ZARASAI_STOLY, Locale } from '../translations';

const ZARASAI_PROJECT: Project = {
  id: 'zarasai_predefined',
  name: 'Zarasai',
  status: 'active',
  tables: ZARASAI_STOLY,
};

interface AppState {
  projects: Project[];
  workers: Worker[];
  workEntries: WorkEntry[];
  page: Page;
  toast: string | null;
  loading: boolean;
}

interface AppContextType extends AppState {
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  setWorkers: React.Dispatch<React.SetStateAction<Worker[]>>;
  setWorkEntries: React.Dispatch<React.SetStateAction<WorkEntry[]>>;
  setPage: React.Dispatch<React.SetStateAction<Page>>;
  
  addProject: (project: Omit<Project, 'id'>) => void;
  deleteProject: (id: string) => void;
  addWorker: (worker: Omit<Worker, 'id'>) => void;
  deleteWorker: (id: string) => void;
  addWorkEntry: (entry: Omit<WorkEntry, 'id'>) => void;
  updateWorkEntry: (entry: WorkEntry) => void;
  deleteWorkEntry: (id: string) => void;
  mergeImportedData: (data: any, setTheme: (theme: Theme) => void, setLocale: (locale: Locale) => void) => void;

  showToast: (message: string) => void;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [projects, setProjects] = useLocalStorage<Project[]>('projects', [ZARASAI_PROJECT]);
  const [workers, setWorkers] = useLocalStorage<Worker[]>('workers', []);
  const [workEntries, setWorkEntries] = useLocalStorage<WorkEntry[]>('workEntries', []);
  const [page, setPage] = useState<Page>('plan');
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { t } = useI18n();

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const addProject = useCallback((project: Omit<Project, 'id'>) => {
    const newProject = { ...project, id: Date.now().toString() };
    setProjects(prev => [...prev, newProject]);
    showToast(t('toast_project_added'));
  }, [setProjects, t]);

  const deleteProject = useCallback((id: string) => {
    if (id === ZARASAI_PROJECT.id) {
      // Potentially show a toast that the default project cannot be deleted
      return;
    }
    setProjects(prev => prev.filter(p => p.id !== id));
    setWorkEntries(prev => prev.filter(w => w.projectId !== id));
    showToast(t('toast_project_deleted'));
  }, [setProjects, setWorkEntries, t]);

  const addWorker = useCallback((worker: Omit<Worker, 'id'>) => {
    setWorkers(prev => [...prev, { ...worker, id: Date.now().toString() }]);
    showToast(t('toast_worker_added'));
  }, [setWorkers, t]);

  const deleteWorker = useCallback((id: string) => {
    setWorkers(prev => prev.filter(w => w.id !== id));
    // Also remove the worker from any work entries
    setWorkEntries(prev => prev.map(entry => ({
      ...entry,
      workerIds: entry.workerIds.filter(workerId => workerId !== id)
    })).filter(entry => entry.workerIds.length > 0)); // Remove entries if no workers are left
    showToast(t('toast_worker_deleted'));
  }, [setWorkers, setWorkEntries, t]);
  
  const addWorkEntry = useCallback((entry: Omit<WorkEntry, 'id'>) => {
    const newEntry = {
      ...entry,
      id: Date.now().toString(),
    } as WorkEntry;
    setWorkEntries(prev => [newEntry, ...prev]);
    showToast(t('toast_entry_added'));
  }, [setWorkEntries, t]);

  const updateWorkEntry = useCallback((updatedEntry: WorkEntry) => {
    setWorkEntries(prev => prev.map(e => e.id === updatedEntry.id ? updatedEntry : e));
    showToast(t('toast_entry_updated'));
  }, [setWorkEntries, t]);

  const deleteWorkEntry = useCallback((id: string) => {
    setWorkEntries(prev => prev.filter(e => e.id !== id));
    showToast(t('toast_entry_deleted'));
  }, [setWorkEntries, t]);

  const mergeImportedData = useCallback((data: any, setTheme: (theme: Theme) => void, setLocale: (locale: Locale) => void) => {
    // 1. Merge Projects
    const localProjects = new Map(projects.map(p => [p.id, p]));
    if (data.projects) {
        data.projects.forEach((p: Project) => {
            if (p.id === ZARASAI_PROJECT.id) return; // Never overwrite predefined project
            localProjects.set(p.id, p);
        });
    }
    if (!localProjects.has(ZARASAI_PROJECT.id)) {
        localProjects.set(ZARASAI_PROJECT.id, ZARASAI_PROJECT);
    }
    setProjects(Array.from(localProjects.values()));

    // 2. Merge Workers
    const localWorkers = new Map(workers.map(w => [w.id, w]));
    if (data.workers) {
        data.workers.forEach((w: Worker) => {
            localWorkers.set(w.id, w);
        });
    }
    setWorkers(Array.from(localWorkers.values()));

    // 3. Merge Work Entries (with conflict resolution)
    const localWorkEntries = new Map(workEntries.map(e => [e.id, e]));
    if (data.workEntries) {
        data.workEntries.forEach((e: WorkEntry) => {
            const existingEntry = localWorkEntries.get(e.id);
            if (existingEntry) {
                // Conflict: keep the one with the later endTime
                if (new Date(e.endTime) > new Date(existingEntry.endTime)) {
                    localWorkEntries.set(e.id, e);
                }
            } else {
                // No conflict, just add it
                localWorkEntries.set(e.id, e);
            }
        });
    }
    setWorkEntries(Array.from(localWorkEntries.values()));

    // 4. Merge Settings
    if (data.theme) setTheme(data.theme);
    if (data.locale) setLocale(data.locale);

    showToast(t('toast_data_merged'));
    setTimeout(() => window.location.reload(), 1000);
  }, [projects, workers, workEntries, setProjects, setWorkers, setWorkEntries, showToast, t]);


  const value = {
    projects, setProjects,
    workers, setWorkers,
    workEntries, setWorkEntries,
    page, setPage,
    toast, showToast,
    loading, setLoading,
    addProject, deleteProject,
    addWorker, deleteWorker,
    addWorkEntry, updateWorkEntry, deleteWorkEntry,
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
