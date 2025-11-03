import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useI18n } from '../context/I18nContext';
import { Project, WorkEntry, PanelingWorkEntry, ConstructionWorkEntry, CablesWorkEntry, HourlyWorkEntry, TableSize, Worker, AttendanceRecord } from '../types';
import TableMap from '../components/TableMap';
import SkeletonCard from '../components/SkeletonCard';
import QuickLogTablesModal from '../components/QuickLogTablesModal';

type Step = 'type' | 'task_subtype' | 'form';
type WorkType = 'hourly' | 'task';
type TaskSubType = 'paneling' | 'construction' | 'cables';
type TableView = 'list' | 'map';

// #region Helper Components for Dashboard
const MetricItem: React.FC<{ icon: React.ReactNode, value: string, label: string }> = ({ icon, value, label }) => (
    <div className="flex items-center">
        <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 mr-4">
            {icon}
        </div>
        <div>
            <p className="text-xl font-bold text-white">{value}</p>
            <p className="text-xs text-white/60 uppercase tracking-wider">{label}</p>
        </div>
    </div>
);
// #endregion

// #region Work Log Form Component
const WorkLogForm: React.FC<{
    project: Project;
    onClose: () => void;
}> = ({ project, onClose }) => {
    const { workers, addWorkEntry, showToast, workEntries } = useAppContext();
    const { t } = useI18n();
    
    const [step, setStep] = useState<Step>('type');
    const [selectedWorkType, setSelectedWorkType] = useState<WorkType | null>(null);
    const [selectedTaskSubType, setSelectedTaskSubType] = useState<TaskSubType | null>(null);
    const [tableView, setTableView] = useState<TableView>('map');

    // Form state
    const [workerId1, setWorkerId1] = useState('');
    const [workerId2, setWorkerId2] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [description, setDescription] = useState('');
    const [moduleCount, setModuleCount] = useState('');
    const [table, setTable] = useState('');
    const [tableSize, setTableSize] = useState<TableSize>('medium');
    const [tableSearch, setTableSearch] = useState('');
    const [isTableListVisible, setIsTableListVisible] = useState(false);
    const tableDropdownRef = useRef<HTMLDivElement>(null);
    
    // #region Styles
    const formInputStyle = "w-full bg-white/10 text-white p-3 rounded-xl border border-white/20 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)] transition text-base font-normal";
    const formLabelStyle = "block mb-2 text-sm font-medium text-white/70";
    const cardButtonStyle = "floating-card p-5 text-center cursor-pointer hover:bg-white/20 transition duration-200 ease-in-out transform hover:scale-105 active:scale-100";
    const primaryButtonStyle = "w-full bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] hover:opacity-90 text-white font-bold py-3 px-4 rounded-xl transition duration-200 ease-in-out transform hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50 text-base";
    // #endregion

    const resetForm = useCallback(() => {
        setWorkerId1(''); setWorkerId2(''); setStartTime(''); setEndTime('');
        setDescription(''); setModuleCount(''); setTable(''); setTableSize('medium');
        setTableSearch(''); setIsTableListVisible(false);
    }, []);
    
    const handleBack = () => {
        if (step === 'form') {
            resetForm();
            setStep(selectedWorkType === 'task' ? 'task_subtype' : 'type');
        } else if (step === 'task_subtype') {
            setStep('type');
        } else if (step === 'type') {
            onClose();
        }
    };

    const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newStartTime = e.target.value;
        setStartTime(newStartTime);
        if (newStartTime && !endTime) {
            const start = new Date(newStartTime);
            start.setHours(start.getHours() + 9);
            const newEndTime = start.toISOString().slice(0, 16);
            setEndTime(newEndTime);
        }
    };
    
    const completedTables = useMemo(() => new Set(
        workEntries
            .filter(e => e.projectId === project.id && e.type === 'task' && e.subType === 'cables')
            .map(e => (e as CablesWorkEntry).table)
    ), [workEntries, project.id]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!project || !startTime || !endTime || !workerId1) return showToast(t('error_form_incomplete'));
        
        const start = new Date(startTime);
        const end = new Date(endTime);
        if (end <= start) return showToast(t('error_end_time_before_start'));

        const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        const workerIds = [workerId1];
        if (workerId2 && workerId1 !== workerId2) workerIds.push(workerId2);

        const baseEntryData = { projectId: project.id, workerIds, startTime: start.toISOString(), endTime: end.toISOString(), duration, date: start.toISOString() };

        let entry: Omit<WorkEntry, 'id'> | null = null;
        
        if (selectedWorkType === 'hourly') {
            entry = { ...baseEntryData, type: 'hourly', description } as Omit<HourlyWorkEntry, 'id'>;
        } else if (selectedWorkType === 'task') {
            switch(selectedTaskSubType) {
                case 'paneling':
                    const modules = parseInt(moduleCount);
                    if (isNaN(modules) || modules <= 0) return showToast(t('error_form_incomplete'));
                    entry = { ...baseEntryData, type: 'task', subType: 'paneling', moduleCount: modules, modulesPerHour: modules / duration } as Omit<PanelingWorkEntry, 'id'>;
                    break;
                case 'construction':
                    if (!description) return showToast(t('error_form_incomplete'));
                    entry = { ...baseEntryData, type: 'task', subType: 'construction', description } as Omit<ConstructionWorkEntry, 'id'>;
                    break;
                case 'cables':
                    if (!table) return showToast(t('error_select_table'));
                    entry = { ...baseEntryData, type: 'task', subType: 'cables', table, tableSize } as Omit<CablesWorkEntry, 'id'>;
                    break;
            }
        }
        
        if (entry) {
            addWorkEntry(entry);
            onClose();
        }
    };
    
    return (
      <div className="h-full w-full flex flex-col overflow-hidden bg-[var(--bg-color)]">
        <header className="flex items-center justify-between p-4" style={{ paddingTop: `calc(16px + var(--safe-area-inset-top))` }}>
            <button onClick={handleBack} className="p-2 rounded-full hover:bg-white/10 transition active:scale-95">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
             <h2 className="text-xl font-bold">{project.name}</h2>
             <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition active:scale-95">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </header>

        <div className="flex-grow overflow-y-auto p-4 space-y-6 scrolling-touch">
            {step === 'type' && (
                 <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-center text-white">{t('work_step2_title')}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div onClick={() => { setSelectedWorkType('hourly'); setStep('form'); }} className={cardButtonStyle}>
                            <h3 className="text-2xl font-bold text-white">{t('work_type_hourly')}</h3>
                        </div>
                         <div onClick={() => { setSelectedWorkType('task'); setStep('task_subtype'); }} className={cardButtonStyle}>
                            <h3 className="text-2xl font-bold text-white">{t('work_type_task')}</h3>
                        </div>
                    </div>
                </div>
            )}

            {step === 'task_subtype' && (
                <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-center text-white">{t('work_step3_title')}</h2>
                    <div className="grid grid-cols-1 gap-4">
                        <div onClick={() => { setSelectedTaskSubType('paneling'); setStep('form'); }} className={cardButtonStyle}><h3 className="text-xl font-bold text-white">{t('work_task_paneling')}</h3></div>
                        <div onClick={() => { setSelectedTaskSubType('construction'); setStep('form'); }} className={cardButtonStyle}><h3 className="text-xl font-bold text-white">{t('work_task_construction')}</h3></div>
                    </div>
                </div>
            )}
            
            {step === 'form' && (
                 <div className="p-1 space-y-4">
                    <h2 className="text-2xl font-bold text-center text-white">{selectedWorkType === 'hourly' ? t('work_form_title_hourly') : t(`work_form_title_${selectedTaskSubType}` as any)}</h2>
                    <form onSubmit={handleSubmit} className="space-y-5">
                       <>
                            <div>
                                <label className={formLabelStyle}>{t('work_worker1_label')}</label>
                                <select value={workerId1} onChange={e => setWorkerId1(e.target.value)} required className={formInputStyle}>
                                    <option value="">{t('work_select_worker')}</option>
                                    {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={formLabelStyle}>{t('work_worker2_label')}</label>
                                <select value={workerId2} onChange={e => setWorkerId2(e.target.value)} disabled={!workerId1} className={formInputStyle}>
                                    <option value="">{t('work_select_worker')}</option>
                                    {workers.filter(w => w.id !== workerId1).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={formLabelStyle}>{t('work_start_time_label')}</label>
                                <input type="datetime-local" value={startTime} onChange={handleStartTimeChange} required className={formInputStyle} />
                            </div>
                             <div>
                                <label className={formLabelStyle}>{t('work_end_time_label')}</label>
                                <input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} required className={formInputStyle} />
                            </div>
                        </>

                        {/* Specific fields */}
                        {selectedWorkType === 'hourly' && (<div><label className={formLabelStyle}>{t('work_description_label')}</label><input type="text" value={description} onChange={e => setDescription(e.target.value)} className={formInputStyle} /></div>)}
                        {selectedTaskSubType === 'paneling' && (<div><label className={formLabelStyle}>{t('work_module_count_label')}</label><input type="number" value={moduleCount} onChange={e => setModuleCount(e.target.value)} required className={formInputStyle} /></div>)}
                        {selectedTaskSubType === 'construction' && (<div><label className={formLabelStyle}>{t('work_construction_desc_label')}</label><input type="text" value={description} onChange={e => setDescription(e.target.value)} required className={formInputStyle} /></div>)}
                        {selectedTaskSubType === 'cables' && (
                            <>
                                <div className="flex justify-between items-center mb-2">
                                    <label className={formLabelStyle}>{t('work_table_number_label')}: <span className="font-semibold text-white text-base">{table || '...'}</span></label>
                                    <div className="bg-white/10 p-1 rounded-full flex items-center">
                                        <button type="button" onClick={() => setTableView('map')} className={`px-3 py-1 text-xs rounded-full transition active:scale-95 ${tableView === 'map' ? 'bg-[var(--accent-color)] text-white' : 'text-white/70'}`}>{t('work_view_map')}</button>
                                        <button type="button" onClick={() => setTableView('list')} className={`px-3 py-1 text-xs rounded-full transition active:scale-95 ${tableView === 'list' ? 'bg-[var(--accent-color)] text-white' : 'text-white/70'}`}>{t('work_view_list')}</button>
                                    </div>
                                </div>
                                {tableView === 'map' ? 
                                <div className="h-80 w-full">
                                    <TableMap tables={project?.tables || []} completedTables={completedTables} selectedTables={new Set(table ? [table] : [])} onTableSelect={setTable} />
                                </div>
                                : (
                                    <div className="relative" ref={tableDropdownRef}>
                                        <input onClick={() => setIsTableListVisible(!isTableListVisible)} onFocus={() => setIsTableListVisible(true)} type="text" placeholder={t('work_search_table_placeholder')} value={tableSearch} onChange={(e) => setTableSearch(e.target.value)} className={formInputStyle} />
                                        {isTableListVisible && (
                                            <ul className="absolute z-10 w-full mt-1 bg-gray-900/90 backdrop-blur-md border border-white/20 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                                {(project.tables || []).filter(t_val => t_val.toLowerCase().includes(tableSearch.toLowerCase())).map(t_val => (
                                                    <li key={t_val} onClick={() => { setTable(t_val); setIsTableListVisible(false); setTableSearch(''); }} className="px-4 py-2 hover:bg-white/10 cursor-pointer">{t_val} {completedTables.has(t_val) && '✅'}</li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                )}

                                <div>
                                    <label className={formLabelStyle}>{t('work_table_size_label')}</label>
                                    <select value={tableSize} onChange={e => setTableSize(e.target.value as TableSize)} required className={formInputStyle}>
                                        <option value="small">{t('work_table_size_small')}</option>
                                        <option value="medium">{t('work_table_size_medium')}</option>
                                        <option value="large">{t('work_table_size_large')}</option>
                                    </select>
                                </div>
                            </>
                        )}
                        <div className="pt-4"><button type="submit" className={primaryButtonStyle}>{t('work_save_button')}</button></div>
                    </form>
                 </div>
            )}
        </div>
      </div>
    );
};
// #endregion

const PlanPage: React.FC = () => {
    const { projects, workers, workEntries, attendanceRecords, setPage } = useAppContext();
    const { t } = useI18n();
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isQuickLogVisible, setIsQuickLogVisible] = useState(false);

    // Set default project on load
    useEffect(() => {
        if (projects.length > 0 && !selectedProjectId) {
            const activeProject = projects.find(p => p.status === 'active');
            setSelectedProjectId(activeProject ? activeProject.id : projects[0].id);
        }
    }, [projects, selectedProjectId]);

    const activeProject = useMemo(() => projects.find(p => p.id === selectedProjectId), [projects, selectedProjectId]);

    const projectWorkers = useMemo(() => {
        if (!activeProject) return [];
        return activeProject.workerIds.map(id => workers.find(w => w.id === id)).filter(Boolean) as Worker[];
    }, [activeProject, workers]);

    const todaysAttendance = useMemo(() => {
        const todayStr = new Date().toISOString().slice(0, 10);
        return attendanceRecords.find(r => r.projectId === selectedProjectId && r.date === todayStr);
    }, [attendanceRecords, selectedProjectId]);
    
    const calculateSummary = (entries: WorkEntry[]) => {
        let totalHours = 0;
        let totalEarnings = 0;
        const tables = new Set<string>();

        entries.forEach(entry => {
            const numWorkers = entry.workerIds.length;
            if (numWorkers === 0) return;

            totalHours += entry.duration;

            entry.workerIds.forEach(workerId => {
                const worker = workers.find(w => w.id === workerId);
                if (!worker) return;

                let earningsPart = 0;
                const durationPart = entry.duration / numWorkers;

                if (entry.type === 'hourly' || (entry.type === 'task' && entry.subType === 'construction')) {
                    earningsPart = durationPart * (worker.rate || 0);
                } else if (entry.type === 'task' && entry.subType === 'paneling') {
                    earningsPart = (entry.moduleCount / numWorkers) * (worker.panelRate || 0);
                } else if (entry.type === 'task' && entry.subType === 'cables') {
                    let tableRate = 0;
                    if (entry.tableSize === 'small') tableRate = worker.cableRateSmall || 0;
                    else if (entry.tableSize === 'medium') tableRate = worker.cableRateMedium || 0;
                    else if (entry.tableSize === 'large') tableRate = worker.cableRateLarge || 0;
                    earningsPart = tableRate / numWorkers;
                    tables.add(entry.table);
                }
                totalEarnings += earningsPart;
            });
        });
        return { totalHours, totalEarnings, tablesCompleted: tables.size };
    };

    const dailySummary = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todaysEntries = workEntries.filter(e => new Date(e.date) >= today && e.projectId === selectedProjectId);
        return calculateSummary(todaysEntries);
    }, [workEntries, workers, selectedProjectId]);

    const weeklySummary = useMemo(() => {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const recentEntries = workEntries.filter(e => new Date(e.date) > oneWeekAgo && e.projectId === selectedProjectId);
        
        const summary = calculateSummary(recentEntries);
        const workerEarnings: { [key: string]: number } = {};
        
        recentEntries.forEach(entry => {
             const numWorkers = entry.workerIds.length;
             if(numWorkers === 0) return;
             entry.workerIds.forEach(workerId => {
                const worker = workers.find(w => w.id === workerId);
                if (!worker) return;

                let earningsPart = 0;
                const durationPart = entry.duration / numWorkers;
                if (entry.type === 'hourly' || (entry.type === 'task' && entry.subType === 'construction')) {
                    earningsPart = durationPart * (worker.rate || 0);
                } else if (entry.type === 'task' && entry.subType === 'paneling') {
                    earningsPart = (entry.moduleCount / numWorkers) * (worker.panelRate || 0);
                } else if (entry.type === 'task' && entry.subType === 'cables') {
                    let tableRate = 0;
                    if (entry.tableSize === 'small') tableRate = worker.cableRateSmall || 0;
                    else if (entry.tableSize === 'medium') tableRate = worker.cableRateMedium || 0;
                    else if (entry.tableSize === 'large') tableRate = worker.cableRateLarge || 0;
                    earningsPart = tableRate / numWorkers;
                }
                workerEarnings[workerId] = (workerEarnings[workerId] || 0) + earningsPart;
             });
        });

        const topWorkerId = Object.keys(workerEarnings).sort((a,b) => workerEarnings[b] - workerEarnings[a])[0];
        let topWorker = topWorkerId ? { worker: workers.find(w => w.id === topWorkerId), earnings: workerEarnings[topWorkerId] } : null;

        return { ...summary, topWorker };
    }, [workEntries, workers, selectedProjectId]);


    const completedTablesCount = useMemo(() => {
        if (!activeProject || !activeProject.tables || activeProject.tables.length === 0) return 0;
        const completed = new Set(
            workEntries
            .filter(e => e.projectId === activeProject.id && e.type === 'task' && e.subType === 'cables')
            .map(e => (e as CablesWorkEntry).table)
        );
        return completed.size;
    }, [workEntries, activeProject]);

    const totalTables = activeProject?.tables?.length || 0;
    const progressPercent = totalTables > 0 ? (completedTablesCount / totalTables) * 100 : 0;
    
    const RecapCard: React.FC<{title: string, summary: { totalHours: number, totalEarnings: number, tablesCompleted: number }}> = ({ title, summary }) => (
        <div className="floating-card p-5 h-full">
            <h2 className="text-xl font-bold text-white mb-4">{title}</h2>
            <div className="space-y-4">
                <MetricItem icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} value={summary.totalHours.toFixed(1)} label={t('dashboard_total_hours')} />
                <MetricItem icon={<span className="text-2xl font-bold">€</span>} value={summary.totalEarnings.toFixed(0)} label={t('dashboard_total_earnings')} />
                <MetricItem icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 14a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 14a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>} value={String(summary.tablesCompleted)} label={t('dashboard_total_tables')} />
            </div>
        </div>
    );

    const renderDashboard = () => (
        <div className="h-full w-full p-4 overflow-y-auto scrolling-touch">
            <div className="space-y-6">
                {/* Project Selector */}
                <div className="floating-card p-4">
                    <label className="block mb-2 text-sm font-medium text-white/70">{t('dashboard_project_selector')}</label>
                    <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} className="w-full bg-white/10 text-white p-3 rounded-xl border border-white/20 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] transition">
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-6">
                        <RecapCard title={t('dashboard_daily_recap_title')} summary={dailySummary} />
                        {totalTables > 0 && (
                            <div className="floating-card p-5">
                                <h2 className="text-xl font-bold text-white mb-3">{t('dashboard_progress_title')}</h2>
                                <div className="relative w-full bg-white/10 rounded-full h-6">
                                    <div className="bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] h-6 rounded-full" style={{ width: `${progressPercent}%` }}></div>
                                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">{Math.round(progressPercent)}%</span>
                                </div>
                                <div className="flex justify-between items-center mt-2 text-sm text-white/80">
                                    <span>{completedTablesCount} / {totalTables}</span>
                                    <span>{totalTables - completedTablesCount} {t('dashboard_tables_remaining')}</span>
                                </div>
                                <button
                                    onClick={() => setIsQuickLogVisible(true)}
                                    className="mt-4 w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-4 rounded-xl transition duration-200 ease-in-out active:scale-95"
                                >
                                    {t('dashboard_quick_log_button')}
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="space-y-6">
                        <RecapCard title={t('dashboard_weekly_recap_title')} summary={weeklySummary} />
                         <div className="floating-card p-5">
                            <h2 className="text-xl font-bold text-white mb-4">{t('dashboard_workers_on_site')}</h2>
                            {projectWorkers.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {projectWorkers.map(w => (
                                        <div key={w.id} className="bg-white/10 px-3 py-1 rounded-full flex items-center space-x-2">
                                            <span className={`w-2 h-2 rounded-full ${todaysAttendance?.presentWorkerIds.includes(w.id) ? 'bg-green-400' : 'bg-red-400'}`}></span>
                                            <span className="text-sm font-medium text-white/90">{w.name}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                 <p className="text-white/50">{t('attendance_no_workers_in_project')}</p>
                            )}
                             {!todaysAttendance && projectWorkers.length > 0 && <p className="text-white/50 mt-3 text-sm">{t('dashboard_no_attendance')}</p>}
                        </div>
                    </div>
                    {weeklySummary.topWorker && weeklySummary.topWorker.worker && (
                        <div className="lg:col-span-2 floating-card p-6 flex flex-col items-center justify-center text-center bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] relative overflow-hidden">
                             <div className="absolute top-0 left-0 w-full h-full bg-no-repeat bg-cover opacity-10" style={{backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"0.4\"%3E%3Cpath d=\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')"}}></div>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-yellow-300 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                            </svg>
                            <h2 className="text-xl font-bold text-yellow-300 mt-2 drop-shadow">{t('dashboard_weekly_star')}</h2>
                            <p className="text-3xl font-bold text-white mt-2 drop-shadow-md">{weeklySummary.topWorker.worker.name}</p>
                            <p className="text-lg text-white/80">€{weeklySummary.topWorker.earnings.toFixed(2)}</p>
                            <p className="text-xs text-white/60">{t('dashboard_earned_this_week')}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
    
    if (!activeProject) {
        return (
            <div className="h-full w-full flex items-center justify-center p-4">
                <div className="floating-card p-8 text-center">
                    <p className="text-xl font-bold">{t('dashboard_no_project_selected')}</p>
                    <button onClick={() => setPage('settings')} className="mt-4 bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white font-bold py-2 px-4 rounded-lg">
                        {t('settings_project_management_title')}
                    </button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="h-full w-full flex flex-col relative">
            {renderDashboard()}

            <button
                onClick={() => setIsFormVisible(true)}
                className="absolute z-20 right-6 bottom-6 w-16 h-16 rounded-full bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white shadow-lg flex items-center justify-center transform hover:scale-110 active:scale-95 transition-transform"
                aria-label={t('dashboard_add_work_entry_button')}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </button>
            
            {isFormVisible && (
                <div className="absolute inset-0 z-30 slide-in-right">
                    <WorkLogForm project={activeProject} onClose={() => setIsFormVisible(false)} />
                </div>
            )}

            {activeProject && (
                <QuickLogTablesModal
                    isOpen={isQuickLogVisible}
                    onClose={() => setIsQuickLogVisible(false)}
                    project={activeProject}
                />
            )}
        </div>
    );
};

export default PlanPage;