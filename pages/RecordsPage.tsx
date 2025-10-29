import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { useI18n } from '../context/I18nContext';
import { WorkEntry, WorkEntryType, Worker, HourlyWorkEntry } from '../types';

const Timer: React.FC = () => {
    const { workers, addWorkEntry } = useAppContext();
    const { t } = useI18n();
    const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
    const [isTiming, setIsTiming] = useState(false);
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [elapsedTime, setElapsedTime] = useState(0);

    useEffect(() => {
        let interval: number;
        if (isTiming && startTime) {
            interval = window.setInterval(() => {
                setElapsedTime(Date.now() - startTime.getTime());
            }, 1000);
        }
        return () => window.clearInterval(interval);
    }, [isTiming, startTime]);

    const handleStart = () => {
        if (!selectedWorkerId) {
            alert(t('records_select_worker_alert'));
            return;
        }
        setStartTime(new Date());
        setIsTiming(true);
    };

    const handleStop = () => {
        if (!startTime) return;
        const endTime = new Date();
        const durationMs = endTime.getTime() - startTime.getTime();
        const durationHours = durationMs / (1000 * 60 * 60);

        const newEntry: Omit<HourlyWorkEntry, 'id' | 'date'> = {
            projectId: null,
            workerId: selectedWorkerId,
            type: WorkEntryType.Hourly,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            duration: durationHours,
        };
        addWorkEntry(newEntry);

        setIsTiming(false);
        setStartTime(null);
        setElapsedTime(0);
    };

    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
        const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
        const seconds = String(totalSeconds % 60).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    };
    
    const formInputStyle = "w-full bg-brand-gunmetal/80 text-brand-ghost p-3 rounded-lg border border-brand-shale focus:outline-none focus:ring-2 focus:ring-brand-electric focus:border-brand-electric transition";

    return (
        <div className="glassmorphism p-4 rounded-xl mb-4">
            <h2 className="text-xl font-bold mb-3 text-white">{t('records_timer_title')}</h2>
            <div className="space-y-4">
                 <select 
                    value={selectedWorkerId} 
                    onChange={e => setSelectedWorkerId(e.target.value)}
                    className={formInputStyle}
                    disabled={isTiming}
                >
                    <option value="">{t('records_select_worker')}</option>
                    {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
                <div className="text-5xl font-mono text-center bg-black/20 py-4 rounded-lg">{formatTime(elapsedTime)}</div>
                {!isTiming ? (
                    <button onClick={handleStart} disabled={!selectedWorkerId} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition transform hover:scale-105 shadow-lg">
                        {t('records_start_shift_button')}
                    </button>
                ) : (
                    <button onClick={handleStop} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition transform hover:scale-105 shadow-lg">
                        {t('records_end_shift_button')}
                    </button>
                )}
            </div>
        </div>
    );
};

const RecordsPage: React.FC = () => {
  const { workEntries, workers, projects, deleteWorkEntry } = useAppContext();
  const { t } = useI18n();

  const getWorkerName = (id: string) => workers.find(w => w.id === id)?.name || t('records_unknown_worker');
  const getProjectName = (id: string | null) => id ? (projects.find(p => p.id === id)?.name || t('records_unknown_project')) : t('records_general_project');

  const sortedEntries = useMemo(() => {
    return [...workEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [workEntries]);

  return (
    <div className="h-full w-full flex flex-col p-4 overflow-y-auto">
      <Timer />
      <div className="glassmorphism p-4 rounded-xl flex-grow">
        <h2 className="text-xl font-bold mb-3 text-white">{t('records_all_entries_title')}</h2>
        <div className="space-y-3">
          {sortedEntries.map(entry => {
            const worker = workers.find(w => w.id === entry.workerId);
            const pay = entry.type === WorkEntryType.Task ? entry.reward : (worker?.rate || 0) * entry.duration;
            return (
              <div key={entry.id} className="bg-brand-gunmetal/50 p-3 rounded-lg flex justify-between items-center transition hover:bg-brand-gunmetal">
                <div className="flex-grow">
                    <div className="flex justify-between items-start">
                        <p className="font-bold text-white text-lg">{getWorkerName(entry.workerId)}</p>
                        <p className="text-lg font-semibold text-green-400">€{pay.toFixed(2)}</p>
                    </div>
                  
                    {entry.type === WorkEntryType.Task ? (
                        <p className="text-sm text-brand-silver">
                        {t('records_task_label')}: <span className="font-medium text-brand-ghost">{entry.description}</span> on <span className="font-medium text-brand-ghost">{getProjectName(entry.projectId)}</span>
                        </p>
                    ) : (
                        <p className="text-sm text-brand-silver">
                        {t('records_shift_label')}: <span className="font-medium text-brand-ghost">{entry.duration.toFixed(2)} {t('records_hours_unit')}</span>
                        </p>
                    )}
                  <p className="text-xs text-brand-shale pt-1">{new Date(entry.date).toLocaleString()}</p>
                </div>
                <button onClick={() => deleteWorkEntry(entry.id)} className="text-brand-shale hover:text-red-500 p-2 ml-2 transition">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
};

export default RecordsPage;
