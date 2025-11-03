import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { useI18n } from '../context/I18nContext';
import { Project, Worker, WorkEntry, PanelingWorkEntry, ConstructionWorkEntry, CablesWorkEntry, HourlyWorkEntry, TableSize } from '../types';

type Step = 'project' | 'type' | 'task_subtype' | 'form';
type WorkType = 'hourly' | 'task';
type TaskSubType = 'paneling' | 'construction' | 'cables';

const PlanPage: React.FC = () => {
    const { projects, workers, addWorkEntry, showToast } = useAppContext();
    const { t } = useI18n();

    const [step, setStep] = useState<Step>('project');
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [selectedWorkType, setSelectedWorkType] = useState<WorkType | null>(null);
    const [selectedTaskSubType, setSelectedTaskSubType] = useState<TaskSubType | null>(null);

    // Form state
    const [workerId1, setWorkerId1] = useState('');
    const [workerId2, setWorkerId2] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [description, setDescription] = useState('');
    const [moduleCount, setModuleCount] = useState('');
    const [table, setTable] = useState('');
    const [tableSize, setTableSize] = useState<TableSize>('medium');

    const formInputStyle = "w-full bg-white/10 text-white p-3 rounded-lg border border-white/20 placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)] transition";
    const formLabelStyle = "block mb-2 text-sm font-medium text-white/70";
    const cardButtonStyle = "glassmorphism p-6 rounded-xl border border-white/20 shadow-lg text-center cursor-pointer hover:bg-white/20 hover:border-[var(--accent-color)] transition duration-300 transform hover:scale-105";
    const primaryButtonStyle = "w-full bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] hover:opacity-90 text-white font-bold py-3 px-4 rounded-lg transition duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50";
    const secondaryButtonStyle = "w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-4 rounded-lg transition duration-200";

    const resetForm = () => {
        setWorkerId1('');
        setWorkerId2('');
        setStartTime('');
        setEndTime('');
        setDescription('');
        setModuleCount('');
        setTable('');
        setTableSize('medium');
    };
    
    const handleBack = () => {
        if (step === 'form') {
            if (selectedWorkType === 'task') {
                setStep('task_subtype');
            } else {
                setStep('type');
            }
            resetForm();
        } else if (step === 'task_subtype') {
            setStep('type');
        } else if (step === 'type') {
            setStep('project');
            setSelectedProject(null);
        }
    };

    const handleProjectSelect = (project: Project) => {
        setSelectedProject(project);
        setStep('type');
    };

    const handleWorkTypeSelect = (type: WorkType) => {
        setSelectedWorkType(type);
        if (type === 'hourly') {
            setStep('form');
        } else {
            setStep('task_subtype');
        }
    };

    const handleTaskSubTypeSelect = (subType: TaskSubType) => {
        if (subType === 'cables' && (!selectedProject?.tables || selectedProject.tables.length === 0)) {
            showToast(t('error_no_tables_in_project'));
            return;
        }
        setSelectedTaskSubType(subType);
        setStep('form');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProject || !startTime || !endTime || !workerId1) {
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
        const workerIds = [workerId1];
        if (workerId2) workerIds.push(workerId2);

        const baseEntryData = {
            projectId: selectedProject.id,
            workerIds,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            duration,
            date: start.toISOString(),
        };

        let entry: Omit<WorkEntry, 'id'> | null = null;
        
        if (selectedWorkType === 'hourly') {
            entry = {
                ...baseEntryData,
                type: 'hourly',
                description,
            } as Omit<HourlyWorkEntry, 'id'>;
        } else if (selectedWorkType === 'task') {
            switch(selectedTaskSubType) {
                case 'paneling':
                    const modules = parseInt(moduleCount);
                    if (isNaN(modules) || modules <= 0) {
                        showToast(t('error_form_incomplete'));
                        return;
                    }
                    entry = {
                        ...baseEntryData,
                        type: 'task',
                        subType: 'paneling',
                        moduleCount: modules,
                        modulesPerHour: modules / duration,
                    } as Omit<PanelingWorkEntry, 'id'>;
                    break;
                case 'construction':
                    if (!description) {
                         showToast(t('error_form_incomplete'));
                         return;
                    }
                    entry = {
                        ...baseEntryData,
                        type: 'task',
                        subType: 'construction',
                        description,
                    } as Omit<ConstructionWorkEntry, 'id'>;
                    break;
                case 'cables':
                    if (!table) {
                        showToast(t('error_select_table'));
                        return;
                    }
                    entry = {
                        ...baseEntryData,
                        type: 'task',
                        subType: 'cables',
                        table,
                        tableSize,
                    } as Omit<CablesWorkEntry, 'id'>;
                    break;
            }
        }
        
        if (entry) {
            addWorkEntry(entry);
            // Reset flow
            setStep('project');
            setSelectedProject(null);
            setSelectedWorkType(null);
            setSelectedTaskSubType(null);
            resetForm();
        }
    };
    
    const availableWorkersForSecondSelect = useMemo(() => {
        return workers.filter(w => w.id !== workerId1);
    }, [workers, workerId1]);
    
    const renderForm = () => {
        let title = '';
        if (selectedWorkType === 'hourly') title = t('work_form_title_hourly');
        else if (selectedTaskSubType === 'paneling') title = t('work_form_title_paneling');
        else if (selectedTaskSubType === 'construction') title = t('work_form_title_construction');
        else if (selectedTaskSubType === 'cables') title = t('work_form_title_cables');
        
        const showTimeAndWorkerFields = selectedWorkType === 'hourly' || selectedWorkType === 'task';

        return (
            <div className="p-4 space-y-4">
                <h2 className="text-xl font-bold text-center text-white">{title}</h2>
                <h3 className="text-center text-white/70 -mt-2 mb-4">{t('stats_select_project_label')} <span className="font-semibold text-white">{selectedProject?.name}</span></h3>
                <form onSubmit={handleSubmit} className="space-y-5">
                    {showTimeAndWorkerFields && (
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
                                    {availableWorkersForSecondSelect.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={formLabelStyle}>{t('work_start_time_label')}</label>
                                <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} required className={formInputStyle} />
                            </div>
                             <div>
                                <label className={formLabelStyle}>{t('work_end_time_label')}</label>
                                <input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} required className={formInputStyle} />
                            </div>
                        </>
                    )}
                    {selectedWorkType === 'hourly' && (
                        <div>
                            <label className={formLabelStyle}>{t('work_description_label')}</label>
                            <input type="text" value={description} onChange={e => setDescription(e.target.value)} className={formInputStyle} />
                        </div>
                    )}
                    {selectedTaskSubType === 'paneling' && (
                        <div>
                            <label className={formLabelStyle}>{t('work_module_count_label')}</label>
                            <input type="number" value={moduleCount} onChange={e => setModuleCount(e.target.value)} required className={formInputStyle} />
                        </div>
                    )}
                    {selectedTaskSubType === 'construction' && (
                        <div>
                            <label className={formLabelStyle}>{t('work_construction_desc_label')}</label>
                            <input type="text" value={description} onChange={e => setDescription(e.target.value)} required className={formInputStyle} />
                        </div>
                    )}
                    {selectedTaskSubType === 'cables' && (
                        <>
                            <div>
                                <label className={formLabelStyle}>{t('work_table_number_label')}</label>
                                <select value={table} onChange={e => setTable(e.target.value)} required className={formInputStyle}>
                                    <option value="">{t('work_select_table')}</option>
                                    {selectedProject?.tables.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
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
                    <div className="pt-2 space-y-3">
                        <button type="submit" className={primaryButtonStyle}>{t('work_save_button')}</button>
                        <button type="button" onClick={handleBack} className={secondaryButtonStyle}>{t('work_back_button')}</button>
                    </div>
                </form>
            </div>
        );
    }
    
    return (
        <div className="h-full w-full flex flex-col overflow-y-auto">
            {step === 'project' && (
                <div className="p-4 space-y-4">
                    <h2 className="text-xl font-bold text-center text-white">{t('work_step1_title')}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {projects.map(p => (
                            <div key={p.id} onClick={() => handleProjectSelect(p)} className={cardButtonStyle}>
                                <h3 className="text-2xl font-bold text-white">{p.name}</h3>
                                <p className="text-white/60 capitalize">{p.status}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {step === 'type' && (
                 <div className="p-4 space-y-4">
                    <h2 className="text-xl font-bold text-center text-white">{t('work_step2_title')}</h2>
                    <h3 className="text-center text-white/70 -mt-2 mb-4">{t('stats_select_project_label')} <span className="font-semibold text-white">{selectedProject?.name}</span></h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div onClick={() => handleWorkTypeSelect('hourly')} className={cardButtonStyle}>
                            <h3 className="text-2xl font-bold text-white">{t('work_type_hourly')}</h3>
                        </div>
                         <div onClick={() => handleWorkTypeSelect('task')} className={cardButtonStyle}>
                            <h3 className="text-2xl font-bold text-white">{t('work_type_task')}</h3>
                        </div>
                    </div>
                    <button onClick={handleBack} className={`${secondaryButtonStyle} mt-4`}>{t('work_back_button')}</button>
                </div>
            )}
            
            {step === 'task_subtype' && (
                <div className="p-4 space-y-4">
                    <h2 className="text-xl font-bold text-center text-white">{t('work_step3_title')}</h2>
                    <h3 className="text-center text-white/70 -mt-2 mb-4">{t('stats_select_project_label')} <span className="font-semibold text-white">{selectedProject?.name}</span></h3>
                    <div className="grid grid-cols-1 gap-4">
                        <div onClick={() => handleTaskSubTypeSelect('paneling')} className={cardButtonStyle}>
                            <h3 className="text-2xl font-bold text-white">{t('work_task_paneling')}</h3>
                        </div>
                        <div onClick={() => handleTaskSubTypeSelect('construction')} className={cardButtonStyle}>
                            <h3 className="text-2xl font-bold text-white">{t('work_task_construction')}</h3>
                        </div>
                         <div onClick={() => handleTaskSubTypeSelect('cables')} className={`${cardButtonStyle} ${(!selectedProject?.tables || selectedProject.tables.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <h3 className="text-2xl font-bold text-white">{t('work_task_cables')}</h3>
                        </div>
                    </div>
                     <button onClick={handleBack} className={`${secondaryButtonStyle} mt-4`}>{t('work_back_button')}</button>
                </div>
            )}
            
            {step === 'form' && renderForm()}
        </div>
    );
};

export default PlanPage;
