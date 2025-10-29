
import React, { createContext, useContext, useState, useCallback } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Project, Worker, WorkEntry, Page, WorkEntryType } from '../types';
import { useI18n } from './I18nContext';
import { savePdf, deletePdf } from '../utils/db';

interface AppState {
  projects: Project[];
  workers: Worker[];
  workEntries: WorkEntry[];
  activeProjectId: string | null;
  page: Page;
  toast: string | null;
  loading: boolean;
  smallTableRate: number;
  mediumTableRate: number;
  largeTableRate: number;
}

interface AppContextType extends AppState {
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  setWorkers: React.Dispatch<React.SetStateAction<Worker[]>>;
  setWorkEntries: React.Dispatch<React.SetStateAction<WorkEntry[]>>;
  setActiveProjectId: React.Dispatch<React.SetStateAction<string | null>>;
  setPage: React.Dispatch<React.SetStateAction<Page>>;
  
  addProject: (name: string, pdfDataUrl: string) => void;
  deleteProject: (id: string) => void;
  addWorker: (worker: Omit<Worker, 'id'>) => void;
  deleteWorker: (id: string) => void;
  addWorkEntry: (entry: Omit<WorkEntry, 'id' | 'date'>) => void;
  updateWorkEntry: (entry: WorkEntry) => void;
  deleteWorkEntry: (id: string) => void;

  showToast: (message: string) => void;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setSmallTableRate: React.Dispatch<React.SetStateAction<number>>;
  setMediumTableRate: React.Dispatch<React.SetStateAction<number>>;
  setLargeTableRate: React.Dispatch<React.SetStateAction<number>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [projects, setProjects] = useLocalStorage<Project[]>('projects', []);
  const [workers, setWorkers] = useLocalStorage<Worker[]>('workers', []);
  const [workEntries, setWorkEntries] = useLocalStorage<WorkEntry[]>('workEntries', []);
  const [activeProjectId, setActiveProjectId] = useLocalStorage<string | null>('activeProjectId', null);
  const [page, setPage] = useState<Page>('plan');
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { t } = useI18n();

  const [smallTableRate, setSmallTableRate] = useLocalStorage<number>('smallTableRate', 10);
  const [mediumTableRate, setMediumTableRate] = useLocalStorage<number>('mediumTableRate', 15);
  const [largeTableRate, setLargeTableRate] = useLocalStorage<number>('largeTableRate', 20);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const addProject = useCallback(async (name: string, pdfDataUrl: string) => {
    const newProject = { name, id: Date.now().toString() };
    try {
      await savePdf(newProject.id, pdfDataUrl);
      setProjects(prev => [...prev, newProject]);
      showToast(t('toast_project_added'));
    } catch (error) {
      console.error("Failed to save project:", error);
      showToast(t('toast_pdf_save_error'));
    }
  }, [setProjects, t]);

  const deleteProject = useCallback(async (id: string) => {
    try {
      await deletePdf(id);
      setProjects(prev => prev.filter(p => p.id !== id));
      setWorkEntries(prev => prev.filter(w => w.projectId !== id));
      if (activeProjectId === id) {
        setActiveProjectId(null);
      }
      showToast(t('toast_project_deleted'));
    } catch (error) {
      console.error("Failed to delete project PDF:", error);
      showToast(t('toast_pdf_delete_error'));
    }
  }, [setProjects, setWorkEntries, activeProjectId, setActiveProjectId, t]);

  const addWorker = useCallback((worker: Omit<Worker, 'id'>) => {
    setWorkers(prev => [...prev, { ...worker, id: Date.now().toString() }]);
    showToast(t('toast_worker_added'));
  }, [setWorkers, t]);

  const deleteWorker = useCallback((id: string) => {
    setWorkers(prev => prev.filter(w => w.id !== id));
    setWorkEntries(prev => prev.filter(w => w.workerId !== id));
    showToast(t('toast_worker_deleted'));
  }, [setWorkers, setWorkEntries, t]);
  
  const addWorkEntry = useCallback((entry: Omit<WorkEntry, 'id' | 'date'>) => {
    const newEntry = {
      ...entry,
      id: Date.now().toString(),
      date: new Date().toISOString(),
    } as WorkEntry;
    setWorkEntries(prev => [newEntry, ...prev]);
    showToast(entry.type === WorkEntryType.Task ? t('toast_task_added') : t('toast_shift_recorded'));
  }, [setWorkEntries, t]);

  const updateWorkEntry = useCallback((updatedEntry: WorkEntry) => {
    setWorkEntries(prev => prev.map(e => e.id === updatedEntry.id ? updatedEntry : e));
    showToast(t('toast_entry_updated'));
  }, [setWorkEntries, t]);

  const deleteWorkEntry = useCallback((id: string) => {
    setWorkEntries(prev => prev.filter(e => e.id !== id));
    showToast(t('toast_entry_deleted'));
  }, [setWorkEntries, t]);

  const value = {
    projects, setProjects,
    workers, setWorkers,
    workEntries, setWorkEntries,
    activeProjectId, setActiveProjectId,
    page, setPage,
    toast, showToast,
    loading, setLoading,
    smallTableRate, setSmallTableRate,
    mediumTableRate, setMediumTableRate,
    largeTableRate, setLargeTableRate,
    addProject, deleteProject,
    addWorker, deleteWorker,
    addWorkEntry, updateWorkEntry, deleteWorkEntry
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
