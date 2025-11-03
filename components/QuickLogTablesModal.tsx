import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { useI18n } from '../context/I18nContext';
import { Project, Worker, TableSize, CablesWorkEntry } from '../types';
import TableMap from './TableMap';
import Modal from './Modal';

interface QuickLogTablesModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
}

const QuickLogTablesModal: React.FC<QuickLogTablesModalProps> = ({ isOpen, onClose, project }) => {
    const { workers, addMultipleWorkEntries, workEntries, showToast } = useAppContext();
    const { t } = useI18n();

    const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());
    const [tableSizes, setTableSizes] = useState<Map<string, TableSize>>(new Map());
    const [selectedWorkerIds, setSelectedWorkerIds] = useState<Set<string>>(new Set());
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');

    const projectWorkers = useMemo(() => {
        return project.workerIds.map(id => workers.find(w => w.id === id)).filter(Boolean) as Worker[];
    }, [project, workers]);

    const completedTables = useMemo(() => new Set(
        workEntries
            .filter(e => e.projectId === project.id && e.type === 'task' && e.subType === 'cables')
            .map(e => (e as CablesWorkEntry).table)
    ), [workEntries, project.id]);

    useEffect(() => {
        if (isOpen) {
            setSelectedWorkerIds(new Set());
            setSelectedTables(new Set());
            setTableSizes(new Map());
            setStartTime('');
            setEndTime('');
        }
    }, [isOpen]);

    const handleToggleTable = useCallback((table: string) => {
        if (completedTables.has(table)) return; // Don't allow selecting completed tables
        
        setSelectedTables(prev => {
            const newSet = new Set(prev);
            if (newSet.has(table)) {
                newSet.delete(table);
            } else {
                newSet.add(table);
            }
            return newSet;
        });

        setTableSizes(prev => {
            const newMap = new Map(prev);
            if (newMap.has(table)) {
                newMap.delete(table);
            } else {
                newMap.set(table, 'medium'); // Default to medium
            }
            return newMap;
        });
    }, [completedTables]);
    
    const handleSetTableSize = (table: string, size: TableSize) => {
        setTableSizes(prev => new Map(prev).set(table, size));
    };

    const handleToggleWorker = (workerId: string) => {
        setSelectedWorkerIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(workerId)) {
                newSet.delete(workerId);
            } else {
                if (newSet.size < 2) {
                    newSet.add(workerId);
                } else {
                    showToast(t('error_max_two_workers'));
                }
            }
            return newSet;
        });
    };
    
    const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newStartTime = e.target.value;
        setStartTime(newStartTime);
        if (newStartTime && !endTime) {
            const start = new Date(newStartTime);
            start.setHours(start.getHours() + 1);
            const newEndTime = start.toISOString().slice(0, 16);
            setEndTime(newEndTime);
        }
    };

    const handleLogTables = () => {
        if (selectedTables.size === 0 || selectedWorkerIds.size === 0 || !startTime || !endTime) {
            showToast(t('error_form_incomplete'));
            return;
        }
        
        const start = new Date(startTime);
        const end = new Date(endTime);
        if (end <= start) {
            showToast(t('error_end_time_before_start'));
            return;
        }

        const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        const workerIds = [...selectedWorkerIds];
        
        const newEntries = [...selectedTables].map(table => ({
            projectId: project.id,
            workerIds,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            duration,
            date: start.toISOString(),
            type: 'task' as 'task',
            subType: 'cables' as 'cables',
            table,
            tableSize: tableSizes.get(table) || 'medium',
        }));

        if (newEntries.length > 0) {
            addMultipleWorkEntries(newEntries);
        }

        onClose();
    };

    const formInputStyle = "w-full bg-white/10 text-white p-3 rounded-xl border border-white/20 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)] transition text-base font-normal";
    const formLabelStyle = "block mb-2 text-sm font-medium text-white/70";
    const primaryButtonStyle = "w-full bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] hover:opacity-90 text-white font-bold py-3 px-4 rounded-xl transition duration-200 ease-in-out transform hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50 text-base";
    
    const footerContent = selectedTables.size > 0 ? (
        <button onClick={handleLogTables} disabled={selectedWorkerIds.size === 0 || !startTime || !endTime} className={primaryButtonStyle}>
            {t('quick_log_save_button', selectedTables.size)}
        </button>
    ) : null;

    return (
        <Modal
          isOpen={isOpen}
          onClose={onClose}
          title={t('dashboard_quick_log_button')}
          closeOnOverlayClick={false}
          maxWidthClass="max-w-4xl"
          footer={footerContent}
        >
          <div className="space-y-4">
            <div className="h-96 w-full">
                <TableMap 
                    tables={project.tables || []} 
                    completedTables={completedTables} 
                    selectedTables={selectedTables} 
                    onTableSelect={handleToggleTable} 
                />
            </div>

            {selectedTables.size > 0 && (
                <div className="space-y-4 pt-4 border-t border-white/20">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={formLabelStyle}>{t('payroll_workers_label')}</label>
                            <div className="flex flex-wrap gap-2 min-h-[34px] items-center">
                                {projectWorkers.length > 0 ? (
                                    projectWorkers.map(w => (
                                        <button key={w.id} onClick={() => handleToggleWorker(w.id)} className={`px-3 py-1 text-sm rounded-full transition active:scale-95 ${selectedWorkerIds.has(w.id) ? 'bg-[var(--accent-color)] text-white' : 'bg-white/10 text-white/80'}`}>
                                            {w.name}
                                        </button>
                                    ))
                                ) : (
                                    <p className="text-sm text-white/50 px-1">{t('attendance_no_workers_in_project')}</p>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className={formLabelStyle}>{t('quick_log_table_sizes_label')}</label>
                            <div className="max-h-24 overflow-y-auto space-y-2 pr-2 bg-black/20 p-2 rounded-lg">
                                {[...selectedTables].sort((a, b) => parseFloat(a) - parseFloat(b)).map(table => (
                                    <div key={table} className="flex items-center justify-between bg-white/5 p-2 rounded-md">
                                        <span className="font-semibold text-white">Stůl {table}</span>
                                        <div className="flex items-center space-x-1">
                                            {(['small', 'medium', 'large'] as TableSize[]).map(size => (
                                                <button
                                                    type="button"
                                                    key={size}
                                                    onClick={() => handleSetTableSize(table, size)}
                                                    className={`w-8 h-8 text-xs rounded-md transition-all duration-200 ${tableSizes.get(table) === size ? 'bg-[var(--accent-color)] text-white scale-110 shadow-lg' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
                                                >
                                                    {t(`work_table_size_${size}`)[0].toUpperCase()}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div>
                            <label className={formLabelStyle}>{t('work_start_time_label')}</label>
                            <input type="datetime-local" value={startTime} onChange={handleStartTimeChange} required className={formInputStyle} />
                        </div>
                        <div>
                            <label className={formLabelStyle}>{t('work_end_time_label')}</label>
                            <input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} required className={formInputStyle} />
                        </div>
                    </div>
                </div>
            )}
            </div>
        </Modal>
    );
};

export default QuickLogTablesModal;
