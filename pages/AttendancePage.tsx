import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { useI18n } from '../context/I18nContext';
import { Worker } from '../types';

const AttendancePage: React.FC = () => {
    const { projects, workers, attendanceRecords, saveAttendance } = useAppContext();
    const { t } = useI18n();

    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
    const [presentWorkerIds, setPresentWorkerIds] = useState<Set<string>>(new Set());

    const formInputStyle = "w-full bg-white/10 text-white p-3 rounded-xl border border-white/20 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)] transition text-base font-normal";
    const primaryButtonStyle = "w-full bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] hover:opacity-90 text-white font-bold py-3 px-4 rounded-xl transition duration-200 ease-in-out transform hover:scale-105 active:scale-95 shadow-lg";

    useEffect(() => {
        if (projects.length > 0 && !selectedProjectId) {
            setSelectedProjectId(projects[0].id);
        }
    }, [projects, selectedProjectId]);

    const projectWorkers = useMemo(() => {
        const project = projects.find(p => p.id === selectedProjectId);
        if (!project) return [];
        return project.workerIds.map(id => workers.find(w => w.id === id)).filter(Boolean) as Worker[];
    }, [selectedProjectId, projects, workers]);

    useEffect(() => {
        const record = attendanceRecords.find(r => r.projectId === selectedProjectId && r.date === selectedDate);
        if (record) {
            setPresentWorkerIds(new Set(record.presentWorkerIds));
        } else {
            // Default all workers to present for a new day
            const allProjectWorkerIds = projects.find(p => p.id === selectedProjectId)?.workerIds || [];
            setPresentWorkerIds(new Set(allProjectWorkerIds));
        }
    }, [selectedProjectId, selectedDate, attendanceRecords, projects]);

    const handleToggleWorker = (workerId: string) => {
        setPresentWorkerIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(workerId)) {
                newSet.delete(workerId);
            } else {
                newSet.add(workerId);
            }
            return newSet;
        });
    };

    const handleSave = () => {
        if (!selectedProjectId) return;
        saveAttendance(selectedProjectId, selectedDate, Array.from(presentWorkerIds));
    };

    return (
        <div className="h-full w-full flex flex-col p-4 space-y-6 overflow-hidden">
            <div className="floating-card p-5 space-y-4">
                <h2 className="text-xl font-bold text-white">{t('attendance_page_title')}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block mb-2 text-sm font-medium text-white/70">{t('stats_select_project_label')}</label>
                        <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} className={formInputStyle}>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block mb-2 text-sm font-medium text-white/70">{t('attendance_select_date')}</label>
                        <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className={formInputStyle} />
                    </div>
                </div>
            </div>

            <div className="flex-grow overflow-y-auto space-y-3 scrolling-touch">
                {projectWorkers.length > 0 ? (
                    projectWorkers.map(worker => (
                        <div
                            key={worker.id}
                            onClick={() => handleToggleWorker(worker.id)}
                            className={`floating-card p-4 flex justify-between items-center cursor-pointer transition-all duration-200 ease-in-out ${presentWorkerIds.has(worker.id) ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/20' : 'border-transparent'}`}
                        >
                            <span className="font-semibold text-lg text-white">{worker.name}</span>
                            <div className="flex items-center space-x-2">
                                <span className={`text-sm font-medium ${presentWorkerIds.has(worker.id) ? 'text-[var(--accent-color-light)]' : 'text-white/50'}`}>{t('attendance_present')}</span>
                                <div className={`w-12 h-6 rounded-full p-1 flex items-center transition-colors ${presentWorkerIds.has(worker.id) ? 'bg-[var(--accent-color)]' : 'bg-white/10'}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${presentWorkerIds.has(worker.id) ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="floating-card p-5 text-center text-white/70">
                        {t('attendance_no_workers_in_project')}
                    </div>
                )}
            </div>

            <div className="pt-2">
                <button onClick={handleSave} className={primaryButtonStyle} disabled={projectWorkers.length === 0}>{t('attendance_save_button')}</button>
            </div>
        </div>
    );
};

export default AttendancePage;
