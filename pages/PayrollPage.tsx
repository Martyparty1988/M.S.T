import React, { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useI18n } from '../context/I18nContext';
import { Worker, WorkEntry, PanelingWorkEntry, CablesWorkEntry } from '../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';


interface WorkerStats {
    id: string;
    name: string;
    totalEarnings: number;
    totalHours: number;
    avgHourlyWage: number;
    hourly: {
        hours: number;
        earnings: number;
    };
    construction: {
        hours: number;
        earnings: number;
    };
    paneling: {
        panels: number;
        earnings: number;
    };
    cables: {
        tables: { small: number; medium: number; large: number; total: number; };
        earnings: number;
        hours: number;
        tablesPerHour: number;
        eurosPerTable: number;
        sharedTablesPercent: number;
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

const COLORS = ['#a855f7', '#fb923c', '#84cc16', '#ef4444', '#3b82f6'];

const WorkerPayrollCard: React.FC<{ data: WorkerStats }> = ({ data }) => {
    const { t } = useI18n();
    const [isExpanded, setIsExpanded] = useState(false);

    const pieData = [
        { name: t('payroll_hourly_work'), value: data.hourly.earnings + data.construction.earnings },
        { name: t('payroll_paneling_work'), value: data.paneling.earnings },
        { name: t('payroll_cables_work'), value: data.cables.earnings },
    ].filter(item => item.value > 0);

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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <h4 className="text-lg font-semibold text-white/90 mb-2">{t('payroll_details_title')}</h4>
                            <StatRow 
                                label={t('payroll_avg_hourly_wage')}
                                performance={`${data.totalHours.toFixed(2)} ${t('records_hours_unit')}`}
                                earnings={`€${data.avgHourlyWage.toFixed(2)}`}
                            />
                            <StatRow 
                                label={t('payroll_hourly_work')}
                                performance={`${data.hourly.hours.toFixed(2)} ${t('records_hours_unit')}`}
                                earnings={`€${data.hourly.earnings.toFixed(2)}`}
                            />
                             <StatRow 
                                label={t('work_task_construction')}
                                performance={`${data.construction.hours.toFixed(2)} ${t('records_hours_unit')}`}
                                earnings={`€${data.construction.earnings.toFixed(2)}`}
                            />
                             <StatRow 
                                label={t('payroll_paneling_work')}
                                performance={`${data.paneling.panels.toFixed(0)} ${t('records_modules_label')}`}
                                earnings={`€${data.paneling.earnings.toFixed(2)}`}
                            />
                             <StatRow 
                                label={t('payroll_cables_work')}
                                performance={`${data.cables.tables.total.toFixed(2)} ${t('payroll_total_tables')}`}
                                earnings={`€${data.cables.earnings.toFixed(2)}`}
                            />
                            <div className="pl-4 mt-2">
                                <p className="text-sm text-white/70">{t('payroll_tables_per_hour')}: <span className="font-semibold text-white">{data.cables.tablesPerHour.toFixed(2)}</span></p>
                                <p className="text-sm text-white/70">{t('payroll_euros_per_table')}: <span className="font-semibold text-white">€{data.cables.eurosPerTable.toFixed(2)}</span></p>
                                <p className="text-sm text-white/70">{t('payroll_shared_tables_percent')}: <span className="font-semibold text-white">{data.cables.sharedTablesPercent.toFixed(1)}%</span></p>
                                <p className="text-sm text-white/70">{t('payroll_tables_split')}: 
                                    <span className="font-semibold text-white"> S:</span> {data.cables.tables.small.toFixed(2)}
                                    <span className="font-semibold text-white"> M:</span> {data.cables.tables.medium.toFixed(2)}
                                    <span className="font-semibold text-white"> L:</span> {data.cables.tables.large.toFixed(2)}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-col items-center justify-center">
                            <h4 className="text-lg font-semibold text-white/90 mb-2">{t('payroll_earnings_breakdown_chart_title')}</h4>
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
                                        {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: 'rgba(20, 20, 40, 0.8)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px' }} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
};


const PayrollPage: React.FC = () => {
    const { workEntries, workers, projects } = useAppContext();
    const { t } = useI18n();

    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);

    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [dateRange, setDateRange] = useState({ start: startOfMonth, end: endOfMonth });
    const [selectedWorkerIds, setSelectedWorkerIds] = useState<Set<string>>(new Set());
    const [selectedWorkTypes, setSelectedWorkTypes] = useState<Set<string>>(new Set(['hourly', 'paneling', 'construction', 'cables']));

    const formInputStyle = "w-full bg-white/10 text-white p-3 rounded-xl border border-white/20 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)] transition text-base font-normal";

    const handleWorkerSelection = (workerId: string) => {
        setSelectedWorkerIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(workerId)) newSet.delete(workerId);
            else newSet.add(workerId);
            return newSet;
        });
    };

    const handleWorkTypeSelection = (workType: string) => {
        setSelectedWorkTypes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(workType)) newSet.delete(workType);
            else newSet.add(workType);
            return newSet;
        });
    };

    const stats = useMemo(() => {
        const stats: { [key: string]: any } = {};
        
        const workerRates: {[key: string]: Worker} = workers.reduce((acc, w) => ({...acc, [w.id]: w}), {});

        workers.forEach(worker => {
            stats[worker.id] = {
                id: worker.id,
                name: worker.name,
                totalEarnings: 0, totalHours: 0,
                hourly: { hours: 0, earnings: 0 },
                construction: { hours: 0, earnings: 0 },
                paneling: { panels: 0, earnings: 0 },
                cables: { tables: { small: 0, medium: 0, large: 0, total: 0 }, earnings: 0, hours: 0, sharedEntryCount: 0, totalEntryCount: 0 },
            };
        });

        const filteredEntries = workEntries.filter(entry => {
            const entryDate = new Date(entry.date);
            const startDate = new Date(dateRange.start);
            const endDate = new Date(dateRange.end);
            endDate.setHours(23, 59, 59, 999); // Include full end day

            const isProjectMatch = !selectedProjectId || entry.projectId === selectedProjectId;
            const isDateMatch = entryDate >= startDate && entryDate <= endDate;
            const isWorkerMatch = selectedWorkerIds.size === 0 || entry.workerIds.some(id => selectedWorkerIds.has(id));
            const entryType = entry.type === 'task' ? entry.subType : 'hourly';
            const isWorkTypeMatch = selectedWorkTypes.size === 0 || selectedWorkTypes.has(entryType);

            return isProjectMatch && isDateMatch && isWorkerMatch && isWorkTypeMatch;
        });
        
        filteredEntries.forEach(entry => {
            const numWorkers = entry.workerIds.length;
            if (numWorkers === 0) return;

            entry.workerIds.forEach(workerId => {
                const worker = workerRates[workerId];
                if (!worker || !stats[workerId]) return;
                
                if (selectedWorkerIds.size > 0 && !selectedWorkerIds.has(workerId)) return;

                let earnings = 0;
                const durationPart = entry.duration / numWorkers;
                stats[workerId].totalHours += durationPart;
                
                if (entry.type === 'hourly') {
                    earnings = durationPart * (worker.rate || 0);
                    stats[workerId].hourly.hours += durationPart;
                    stats[workerId].hourly.earnings += earnings;
                } else if (entry.type === 'task' && entry.subType === 'construction') {
                    earnings = durationPart * (worker.rate || 0);
                    stats[workerId].construction.hours += durationPart;
                    stats[workerId].construction.earnings += earnings;
                } else if (entry.type === 'task' && entry.subType === 'paneling') {
                    const panelsPart = entry.moduleCount / numWorkers;
                    earnings = panelsPart * (worker.panelRate || 0);
                    stats[workerId].paneling.panels += panelsPart;
                    stats[workerId].paneling.earnings += earnings;
                } else if (entry.type === 'task' && entry.subType === 'cables') {
                    let tableRate = 0;
                    if(entry.tableSize === 'small') tableRate = worker.cableRateSmall || 0;
                    else if(entry.tableSize === 'medium') tableRate = worker.cableRateMedium || 0;
                    else if(entry.tableSize === 'large') tableRate = worker.cableRateLarge || 0;
                    
                    earnings = tableRate / numWorkers;
                    
                    if(entry.tableSize) stats[workerId].cables.tables[entry.tableSize] += 1 / numWorkers;
                    stats[workerId].cables.tables.total += 1 / numWorkers;
                    stats[workerId].cables.earnings += earnings;
                    stats[workerId].cables.hours += durationPart;
                    stats[workerId].cables.totalEntryCount++;
                    if (numWorkers > 1) stats[workerId].cables.sharedEntryCount++;
                }
                stats[workerId].totalEarnings += earnings;
            });
        });
        
        const allStatsWithCalcs = Object.values(stats)
            .map((s: any) => ({
                ...s,
                avgHourlyWage: s.totalHours > 0 ? s.totalEarnings / s.totalHours : 0,
                cables: {
                    ...s.cables,
                    tablesPerHour: s.cables.hours > 0 ? s.cables.tables.total / s.cables.hours : 0,
                    eurosPerTable: s.cables.tables.total > 0 ? s.cables.earnings / s.cables.tables.total : 0,
                    sharedTablesPercent: s.cables.totalEntryCount > 0 ? (s.cables.sharedEntryCount / s.cables.totalEntryCount) * 100 : 0,
                }
            }));
        
        const finalStats = selectedWorkerIds.size > 0
            ? allStatsWithCalcs.filter(s => selectedWorkerIds.has(s.id))
            : allStatsWithCalcs.filter(s => s.totalEarnings > 0);

        return finalStats.sort((a,b) => b.totalEarnings - a.totalEarnings) as WorkerStats[];

    }, [workEntries, workers, selectedProjectId, dateRange, selectedWorkerIds, selectedWorkTypes]);

    const exportToCsv = () => {
        const headers = ["Worker", "Total Earnings (€)", "Avg Wage (€/h)", "Total Hours", "Hourly Hours", "Construction Hours", "Panels", "Total Tables", "Small Tables", "Medium Tables", "Large Tables", "Cable Hours", "Tables/Hour", "€/Table", "% Shared Tables"];
        const rows = stats.map(s => [
            s.name,
            s.totalEarnings.toFixed(2),
            s.avgHourlyWage.toFixed(2),
            s.totalHours.toFixed(2),
            s.hourly.hours.toFixed(2),
            s.construction.hours.toFixed(2),
            s.paneling.panels.toFixed(2),
            s.cables.tables.total.toFixed(2),
            s.cables.tables.small.toFixed(2),
            s.cables.tables.medium.toFixed(2),
            s.cables.tables.large.toFixed(2),
            s.cables.hours.toFixed(2),
            s.cables.tablesPerHour.toFixed(2),
            s.cables.eurosPerTable.toFixed(2),
            s.cables.sharedTablesPercent.toFixed(1)
        ].join(','));

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `payroll_stats_${dateRange.start}_to_${dateRange.end}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const workTypeOptions = ['hourly', 'paneling', 'construction', 'cables'];

    const chartData = stats.map(s => ({ name: s.name.split(' ')[0], earnings: s.totalEarnings }));

    return (
        <div className="h-full w-full p-4 flex flex-col overflow-hidden">
            <div className="floating-card p-5 mb-6 space-y-4">
                 <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">{t('payroll_filters_title')}</h2>
                    <button onClick={exportToCsv} className="bg-white/10 hover:bg-white/20 text-white font-bold py-2 px-3 rounded-xl transition text-sm active:scale-95">{t('payroll_export_csv_button')}</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block mb-2 text-sm font-medium text-white/70">{t('payroll_project_label')}</label>
                        <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} className={formInputStyle}>
                            <option value="">{t('payroll_all_projects')}</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block mb-2 text-sm font-medium text-white/70">{t('payroll_start_date_label')}</label>
                        <input type="date" value={dateRange.start} onChange={e => setDateRange(prev => ({...prev, start: e.target.value}))} className={formInputStyle} />
                    </div>
                     <div>
                        <label className="block mb-2 text-sm font-medium text-white/70">{t('payroll_end_date_label')}</label>
                        <input type="date" value={dateRange.end} onChange={e => setDateRange(prev => ({...prev, end: e.target.value}))} className={formInputStyle} />
                    </div>
                </div>
                <div>
                    <label className="block mb-2 text-sm font-medium text-white/70">{t('payroll_workers_label')}</label>
                    <div className="max-h-24 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-2 bg-black/20 rounded-lg">
                        {workers.map(w => (
                            <label key={w.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-white/10 cursor-pointer">
                                <input type="checkbox" checked={selectedWorkerIds.has(w.id)} onChange={() => handleWorkerSelection(w.id)} className="form-checkbox h-4 w-4 rounded bg-white/20 border-white/30 text-[var(--accent-color)] focus:ring-[var(--accent-color)]"/>
                                <span className="text-sm">{w.name}</span>
                            </label>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="block mb-2 text-sm font-medium text-white/70">{t('payroll_work_types_label')}</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {workTypeOptions.map(wt => (
                             <label key={wt} className="flex items-center space-x-2 p-2 rounded-md hover:bg-white/10 cursor-pointer">
                                <input type="checkbox" checked={selectedWorkTypes.has(wt)} onChange={() => handleWorkTypeSelection(wt)} className="form-checkbox h-4 w-4 rounded bg-white/20 border-white/30 text-[var(--accent-color)] focus:ring-[var(--accent-color)]"/>
                                <span className="text-sm capitalize">{t(`work_task_${wt}` as any) || t(`work_type_${wt}` as any)}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            {stats.length > 0 ? (
                <div className="flex-grow overflow-y-auto space-y-4 scrolling-touch pb-4">
                    <div className="floating-card p-5">
                         <h2 className="text-xl font-bold text-white mb-4">{t('payroll_earnings_comparison_chart_title')}</h2>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <XAxis dataKey="name" stroke="rgba(255,255,255,0.7)" fontSize={12} />
                                <YAxis stroke="rgba(255,255,255,0.7)" fontSize={12} />
                                <Tooltip 
                                    cursor={{fill: 'rgba(255,255,255,0.1)'}}
                                    contentStyle={{ backgroundColor: 'rgba(20, 20, 40, 0.8)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px' }}
                                />
                                <Bar dataKey="earnings" fill="url(#colorUv)" />
                                <defs>
                                    <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--gradient-start)" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="var(--gradient-end)" stopOpacity={0.8}/>
                                    </linearGradient>
                                </defs>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {stats.map(workerStat => (
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