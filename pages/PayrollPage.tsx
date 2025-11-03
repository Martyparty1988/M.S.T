import React, { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useI18n } from '../context/I18nContext';
import { Worker, WorkEntry, PanelingWorkEntry, CablesWorkEntry } from '../types';

interface WorkerStats {
    id: string;
    name: string;
    totalEarnings: number;
    hourly: {
        hours: number;
        earnings: number;
    };
    paneling: {
        panels: number;
        earnings: number;
    };
    cables: {
        tables: number;
        earnings: number;
    };
}

const StatRow: React.FC<{ label: string, performance: string, earnings: string }> = ({ label, performance, earnings }) => (
    <div className="flex justify-between items-center py-2 border-b border-white/10 last:border-b-0">
        <div>
            <p className="font-semibold text-white">{label}</p>
            <p className="text-sm text-white/70">{performance}</p>
        </div>
        <p className="text-lg font-bold text-[var(--accent-color-light)]">{earnings}</p>
    </div>
);


const WorkerPayrollCard: React.FC<{ data: WorkerStats }> = ({ data }) => {
    const { t } = useI18n();
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div 
            className="floating-card p-5 cursor-pointer transition-all duration-300 ease-in-out"
            onClick={() => setIsExpanded(!isExpanded)}
        >
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">{data.name}</h3>
                <div className="text-right">
                    <p className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)]">
                        €{data.totalEarnings.toFixed(2)}
                    </p>
                    <p className="text-xs text-white/50 -mt-1">{t('payroll_total_earnings')}</p>
                </div>
            </div>
            {isExpanded && (
                <div className="mt-4 pt-4 border-t border-white/20 space-y-2">
                    <h4 className="text-lg font-semibold text-white/90 mb-2">{t('payroll_details_title')}</h4>
                    <StatRow 
                        label={t('payroll_hourly_work')}
                        performance={`${data.hourly.hours.toFixed(2)} ${t('records_hours_unit')}`}
                        earnings={`€${data.hourly.earnings.toFixed(2)}`}
                    />
                     <StatRow 
                        label={t('payroll_paneling_work')}
                        performance={`${data.paneling.panels.toFixed(2)} ${t('records_modules_label')}`}
                        earnings={`€${data.paneling.earnings.toFixed(2)}`}
                    />
                     <StatRow 
                        label={t('payroll_cables_work')}
                        performance={`${data.cables.tables.toFixed(2)} ${t('payroll_total_tables')}`}
                        earnings={`€${data.cables.earnings.toFixed(2)}`}
                    />
                </div>
            )}
        </div>
    )
};


const PayrollPage: React.FC = () => {
    const { workEntries, workers } = useAppContext();
    const { t } = useI18n();

    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

    const formInputStyle = "w-full bg-white/10 text-white p-3 rounded-xl border border-white/20 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)] transition text-base font-normal";

    const monthlyStats = useMemo(() => {
        const stats: { [key: string]: WorkerStats } = {};

        workers.forEach(worker => {
            stats[worker.id] = {
                id: worker.id,
                name: worker.name,
                totalEarnings: 0,
                hourly: { hours: 0, earnings: 0 },
                paneling: { panels: 0, earnings: 0 },
                cables: { tables: 0, earnings: 0 },
            };
        });

        const filteredEntries = workEntries.filter(entry => entry.date.startsWith(selectedMonth));
        
        filteredEntries.forEach(entry => {
            const numWorkers = entry.workerIds.length;
            if (numWorkers === 0) return;

            entry.workerIds.forEach(workerId => {
                const worker = workers.find(w => w.id === workerId);
                if (!worker || !stats[workerId]) return;

                let earnings = 0;
                
                if (entry.type === 'hourly' || (entry.type === 'task' && entry.subType === 'construction')) {
                    const hourlyRate = worker.rate || 0;
                    earnings = (entry.duration * hourlyRate) / numWorkers;
                    stats[workerId].hourly.hours += entry.duration / numWorkers;
                    stats[workerId].hourly.earnings += earnings;
                } else if (entry.type === 'task' && entry.subType === 'paneling') {
                    const panelRate = worker.panelRate || 0;
                    const panels = (entry as PanelingWorkEntry).moduleCount;
                    earnings = (panels * panelRate) / numWorkers;
                    stats[workerId].paneling.panels += panels / numWorkers;
                    stats[workerId].paneling.earnings += earnings;
                } else if (entry.type === 'task' && entry.subType === 'cables') {
                    const cableEntry = entry as CablesWorkEntry;
                    let tableRate = 0;
                    switch (cableEntry.tableSize) {
                        case 'small': tableRate = worker.cableRateSmall || 0; break;
                        case 'medium': tableRate = worker.cableRateMedium || 0; break;
                        case 'large': tableRate = worker.cableRateLarge || 0; break;
                    }
                    earnings = tableRate / numWorkers;
                    stats[workerId].cables.tables += 1 / numWorkers;
                    stats[workerId].cables.earnings += earnings;
                }
                stats[workerId].totalEarnings += earnings;
            });
        });
        
        return Object.values(stats)
            .filter(s => s.totalEarnings > 0)
            .sort((a,b) => b.totalEarnings - a.totalEarnings);

    }, [workEntries, workers, selectedMonth]);


    return (
        <div className="h-full w-full p-4 flex flex-col overflow-hidden">
            <div className="floating-card p-5 mb-6">
                <label className="block mb-2 text-sm font-medium text-white/70">{t('payroll_select_month')}</label>
                <input
                    type="month"
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(e.target.value)}
                    className={formInputStyle}
                />
            </div>
            {monthlyStats.length > 0 ? (
                 <div className="flex-grow overflow-y-auto space-y-4 scrolling-touch">
                    {monthlyStats.map(workerStat => (
                        <WorkerPayrollCard key={workerStat.id} data={workerStat} />
                    ))}
                 </div>
            ) : (
                <div className="flex-grow flex items-center justify-center">
                    <div className="floating-card p-8 text-center">
                        <p className="text-white/70">{t('payroll_no_data')}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PayrollPage;