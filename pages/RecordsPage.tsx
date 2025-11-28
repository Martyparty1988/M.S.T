

import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { useI18n } from '../context/I18nContext';
import { WorkEntry, HourlyWorkEntry, PanelingWorkEntry, ConstructionWorkEntry, CablesWorkEntry, TableSize } from '../types';
import Modal from '../components/Modal';
import SkeletonCard from '../components/SkeletonCard';

interface EditWorkEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: WorkEntry | null;
}

const EditWorkEntryModal: React.FC<EditWorkEntryModalProps> = ({ isOpen, onClose, entry }) => {
  const { workers, updateWorkEntry, showToast } = useAppContext();
  const { t } = useI18n();
  const [formData, setFormData] = useState<WorkEntry | null>(null);

  useEffect(() => {
    if (entry) {
        const entryCopy = { ...entry };
        
        // Correctly format UTC ISO string to Local ISO string for datetime-local input
        const toLocalISOString = (isoString: string) => {
            if (!isoString) return '';
            const date = new Date(isoString);
            const offset = date.getTimezoneOffset() * 60000;
            const localDate = new Date(date.getTime() - offset);
            return localDate.toISOString().slice(0, 16);
        };

        entryCopy.startTime = toLocalISOString(entry.startTime);
        entryCopy.endTime = toLocalISOString(entry.endTime);
        setFormData(entryCopy);
    }
  }, [entry]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => prev ? { ...prev, [name]: value } : null);
  };
  
  const handleWorkerChange = (index: number, workerId: string) => {
      setFormData(prev => {
          if (!prev) return null;
          const newWorkerIds = [...prev.workerIds];
          newWorkerIds[index] = workerId;
          return {...prev, workerIds: newWorkerIds};
      })
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;
    
    const start = new Date(formData.startTime);
    const end = new Date(formData.endTime);

    if (end <= start) {
        showToast(t('error_end_time_before_start'));
        return;
    }

    const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    let entryToSave: WorkEntry = {
        ...formData,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        duration,
    };

    if (entryToSave.type === 'task' && entryToSave.subType === 'paneling') {
        const modules = Number(entryToSave.moduleCount);
        entryToSave.modulesPerHour = modules / duration;
    }

    updateWorkEntry(entryToSave);
    onClose();
  };
  
  const formInputStyle = "w-full bg-white/10 text-white p-3 rounded-xl border border-white/20 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)] transition text-base font-normal";
  const formLabelStyle = "block mb-2 text-sm font-medium text-white/70";

  const renderFormContent = () => {
    if (!formData) return null;
    return (
        <>
            <div>
                <label htmlFor="workerId1" className={formLabelStyle}>{t('work_worker1_label')}</label>
                <select name="workerId1" id="workerId1" value={formData.workerIds[0] || ''} onChange={(e) => handleWorkerChange(0, e.target.value)} required className={formInputStyle}>
                    {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="workerId2" className={formLabelStyle}>{t('work_worker2_label')}</label>
                <select name="workerId2" id="workerId2" value={formData.workerIds[1] || ''} onChange={(e) => handleWorkerChange(1, e.target.value)} className={formInputStyle}>
                    <option value="">--</option>
                    {workers.filter(w => w.id !== formData.workerIds[0]).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="startTime" className={formLabelStyle}>{t('work_start_time_label')}</label>
                <input type="datetime-local" name="startTime" id="startTime" value={formData.startTime} onChange={handleChange} required className={formInputStyle} />
            </div>
            <div>
                <label htmlFor="endTime" className={formLabelStyle}>{t('work_end_time_label')}</label>
                <input type="datetime-local" name="endTime" id="endTime" value={formData.endTime} onChange={handleChange} required className={formInputStyle} />
            </div>

            {formData.type === 'hourly' && (
                 <div>
                    <label htmlFor="description" className={formLabelStyle}>{t('work_description_label')}</label>
                    <input type="text" name="description" id="description" value={(formData as HourlyWorkEntry).description || ''} onChange={handleChange} className={formInputStyle} />
                </div>
            )}
            {formData.type === 'task' && formData.subType === 'paneling' && (
                 <div>
                    <label htmlFor="moduleCount" className={formLabelStyle}>{t('work_module_count_label')}</label>
                    <input type="number" name="moduleCount" id="moduleCount" value={(formData as PanelingWorkEntry).moduleCount} onChange={handleChange} required className={formInputStyle} />
                </div>
            )}
            {formData.type === 'task' && formData.subType === 'construction' && (
                 <div>
                    <label htmlFor="description" className={formLabelStyle}>{t('work_construction_desc_label')}</label>
                    <input type="text" name="description" id="description" value={(formData as ConstructionWorkEntry).description} onChange={handleChange} required className={formInputStyle} />
                </div>
            )}
             {formData.type === 'task' && formData.subType === 'cables' && (
                <>
                    <div>
                        <label className={formLabelStyle}>{t('work_table_number_label')}</label>
                        <input 
                            type="text" 
                            value={(formData as CablesWorkEntry).table} 
                            readOnly 
                            disabled
                            className={`${formInputStyle} opacity-50 cursor-not-allowed bg-white/5`} 
                        />
                    </div>
                    <div>
                        <label htmlFor="tableSize" className={formLabelStyle}>{t('work_table_size_label')}</label>
                        <select name="tableSize" id="tableSize" value={(formData as CablesWorkEntry).tableSize || 'medium'} onChange={handleChange} required className={formInputStyle}>
                            <option value="small">{t('work_table_size_small')}</option>
                            <option value="medium">{t('work_table_size_medium')}</option>
                            <option value="large">{t('work_table_size_large')}</option>
                        </select>
                    </div>
                </>
            )}
        </>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('records_edit_entry_title')}>
      <form onSubmit={handleSave} className="flex flex-col gap-5">
        {renderFormContent()}
        <button type="submit" className="w-full bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] hover:opacity-90 text-white font-bold py-3 px-4 rounded-xl transition duration-200 ease-in-out transform hover:scale-105 active:scale-95 shadow-lg">
            {t('edit_modal_save_button')}
        </button>
      </form>
    </Modal>
  );
};

const RecordsPage: React.FC = () => {
  const { workEntries, workers, projects, deleteWorkEntry } = useAppContext();
  const { t, locale } = useI18n();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WorkEntry | null>(null);
  const [selectedWorkerFilterId, setSelectedWorkerFilterId] = useState<string>('');
  const [selectedTableSizeFilter, setSelectedTableSizeFilter] = useState<TableSize | ''>('');
  const [tableSearchQuery, setTableSearchQuery] = useState('');
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());
  
  const formInputStyle = "w-full bg-white/10 text-white p-3 rounded-xl border border-white/20 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)] transition text-base font-normal";
  
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleEdit = (entry: WorkEntry) => {
    setEditingEntry(entry);
    setIsEditModalOpen(true);
  };
  
  const toggleDay = (date: string) => {
    setCollapsedDays(prev => {
        const newSet = new Set(prev);
        if (newSet.has(date)) {
            newSet.delete(date);
        } else {
            newSet.add(date);
        }
        return newSet;
    });
  };

  const getWorkerNames = (ids: string[]) => ids.map(id => workers.find(w => w.id === id)?.name || t('records_unknown_worker')).join(', ');
  const getProjectName = (id: string) => projects.find(p => p.id === id)?.name || t('records_unknown_project');
  
  const groupedAndFilteredEntries = useMemo((): Record<string, WorkEntry[]> => {
    let filtered = [...workEntries];

    if (selectedWorkerFilterId) {
        filtered = filtered.filter(entry => entry.workerIds.includes(selectedWorkerFilterId));
    }

    if (selectedTableSizeFilter) {
        filtered = filtered.filter(entry => 
            entry.type === 'task' && 
            entry.subType === 'cables' && 
            (entry as CablesWorkEntry).tableSize === selectedTableSizeFilter
        );
    }

    if (tableSearchQuery.trim()) {
        const searchTerms = tableSearchQuery.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
        const searchConditions: ((table: string) => boolean)[] = [];

        searchTerms.forEach(term => {
            if (term.includes('-')) {
                const [start, end] = term.split('-').map(parseFloat);
                if (!isNaN(start) && !isNaN(end)) {
                    searchConditions.push(table => {
                        const tableNum = parseFloat(table);
                        return !isNaN(tableNum) && tableNum >= start && tableNum <= end;
                    });
                }
            } else {
                searchConditions.push(table => table.toLowerCase() === term);
            }
        });

        if (searchConditions.length > 0) {
            filtered = filtered.filter(entry => {
                if (entry.type === 'task' && entry.subType === 'cables') {
                    return searchConditions.some(cond => cond(entry.table));
                }
                return false; 
            });
        }
    }
    
    const sorted = filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return sorted.reduce<Record<string, WorkEntry[]>>((acc, entry) => {
        const dateKey = new Date(entry.date).toISOString().split('T')[0];
        if (!acc[dateKey]) {
            acc[dateKey] = [];
        }
        acc[dateKey].push(entry);
        return acc;
    }, {});

  }, [workEntries, selectedWorkerFilterId, tableSearchQuery, selectedTableSizeFilter]);
  
  useEffect(() => {
    // Collapse all but the first day by default
    const dateKeys = Object.keys(groupedAndFilteredEntries);
    if (dateKeys.length > 1) {
        setCollapsedDays(new Set(dateKeys.slice(1)));
    }
  }, [groupedAndFilteredEntries]);

  const renderEntryDetails = (entry: WorkEntry) => {
    const textStyle = "text-sm text-white/70 font-normal";
    const valueStyle = "font-semibold text-white";
    
    switch (entry.type) {
        case 'hourly':
            return <p className={textStyle}>{t('records_entry_type_hourly')}: {entry.description}</p>;
        case 'task':
            switch (entry.subType) {
                case 'paneling':
                    return <>
                        <p className={textStyle}>{t('records_entry_type_paneling')}</p>
                        <p className={textStyle}>{t('records_modules_label')}: <span className={valueStyle}>{entry.moduleCount}</span> | {t('records_performance_label')}: <span className={valueStyle}>{entry.modulesPerHour.toFixed(1)} {t('records_mods_per_hour')}</span></p>
                    </>;
                case 'construction':
                    return <>
                        <p className={textStyle}>{t('records_entry_type_construction')}</p>
                        <p className={textStyle}>{entry.description}</p>
                    </>;
                case 'cables':
                    return <p className={textStyle}>{t('records_entry_type_cables')}: <span className={valueStyle}>{t('records_table_label')} {entry.table}
                        {entry.tableSize ? 
                          ` (${t('work_table_size_' + entry.tableSize)})` :
                          <span className="text-yellow-400 font-bold ml-2">({t('records_size_missing_warning')})</span>
                        }
                    </span></p>;
            }
    }
  }

  return (
    <div className="h-full w-full flex flex-col p-4 space-y-6 overflow-hidden">
      <div className="floating-card p-5">
        <h2 className="text-xl font-bold mb-3 text-white">{t('records_all_entries_title')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input
                type="text"
                placeholder={t('records_search_by_table')}
                value={tableSearchQuery}
                onChange={(e) => setTableSearchQuery(e.target.value)}
                className={formInputStyle}
            />
            <select
                id="workerFilter"
                value={selectedWorkerFilterId}
                onChange={(e) => setSelectedWorkerFilterId(e.target.value)}
                className={formInputStyle}
            >
                <option value="">{t('records_all_workers')}</option>
                {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            <select
                id="sizeFilter"
                value={selectedTableSizeFilter}
                onChange={(e) => setSelectedTableSizeFilter(e.target.value as TableSize | '')}
                className={formInputStyle}
            >
                <option value="">{t('records_all_sizes')}</option>
                <option value="small">{t('work_table_size_small')}</option>
                <option value="medium">{t('work_table_size_medium')}</option>
                <option value="large">{t('work_table_size_large')}</option>
            </select>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto space-y-4 scrolling-touch">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => <SkeletonCard key={index} />)
          ) : (
            Object.entries(groupedAndFilteredEntries).map(([date, entries]) => (
                <div key={date}>
                    <button 
                        onClick={() => toggleDay(date)}
                        className="w-full flex justify-between items-center bg-white/5 p-3 rounded-lg text-left mb-2 sticky top-0 backdrop-blur-sm"
                        aria-label={t('records_toggle_day_visibility')}
                    >
                        <h3 className="font-bold text-lg text-white">
                            {new Date(date).toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </h3>
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-white transition-transform ${collapsedDays.has(date) ? 'rotate-0' : 'rotate-180'}`} fill="none" viewBox="0 0 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    {!collapsedDays.has(date) && (
                        <div className="space-y-4">
                        {(entries as WorkEntry[]).map((entry: WorkEntry) => (
                            <div key={entry.id} className="floating-card p-5 flex justify-between items-center transition duration-200 ease-in-out hover:bg-white/20">
                                <div className="flex-grow">
                                    <div className="flex justify-between items-start">
                                        <p className="font-semibold text-white text-base">{getWorkerNames(entry.workerIds)}</p>
                                        <p className="text-sm text-white/70">{entry.duration.toFixed(2)} {t('records_hours_unit')}</p>
                                    </div>
                                    <p className="text-xs text-[var(--accent-color-light)] font-medium">{getProjectName(entry.projectId)}</p>
                                    <div className="mt-1">
                                        {renderEntryDetails(entry)}
                                    </div>
                                    <p className="text-xs text-white/40 pt-1">{new Date(entry.date).toLocaleString()}</p>
                                </div>
                                <div className="flex items-center self-start">
                                <button onClick={() => handleEdit(entry)} className="text-white/40 hover:text-[var(--accent-color)] p-2 transition duration-200 ease-in-out active:scale-95">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L14.732 3.732z" />
                                    </svg>
                                </button>
                                <button onClick={() => deleteWorkEntry(entry.id)} className="text-white/40 hover:text-red-500 p-2 ml-1 transition duration-200 ease-in-out active:scale-95">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                                </div>
                            </div>
                        ))}
                        </div>
                    )}
                </div>
            ))
          )}
      </div>
      <EditWorkEntryModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        entry={editingEntry}
      />
    </div>
  );
};

export default RecordsPage;
