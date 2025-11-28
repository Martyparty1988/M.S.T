import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useI18n } from '../context/I18nContext';
import { Project, WorkEntry, CablesWorkEntry, PanelingWorkEntry, Worker } from '../types';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, BarChart, Bar, CartesianGrid } from 'recharts';

const StatCard: React.FC<{title: string, children: React.ReactNode, className?: string}> = ({title, children, className}) => (
    <div className={`floating-card p-5 ${className}`}>
        <h2 className="text-xl font-bold mb-4 text-white">{title}</h2>
        {children}
    </div>
);

const MetricItem: React.FC<{ icon: React.ReactNode, value: string, label: string, valueClassName?: string }> = ({ icon, value, label, valueClassName = '' }) => (
    <div className="flex items-center">
        <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 mr-4">
            {icon}
        </div>
        <div>
            <p className={`text-xl font-bold text-white ${valueClassName}`}>{value}</p>
            <p className="text-xs text-white/60 uppercase tracking-wider">{label}</p>
        </div>
    </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="floating-card p-3 text-sm">
          <p className="label text-white/80">{`${label}`}</p>
          <p className="intro text-[var(--accent-color-light)] font-semibold">{`Completed: ${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
  };

const StatsPage: React.FC = () => {
    const { projects, workEntries, workers } = useAppContext();
    const { t, locale } = useI18n();

    const [selectedProjectId, setSelectedProjectId] = useState<string>('');

    useEffect(() => {
        if (projects.length > 0 && !selectedProjectId) {
            const activeProject = projects.find(p => p.status === 'active');
            setSelectedProjectId(activeProject ? activeProject.id : projects[0].id);
        }
    }, [projects, selectedProjectId]);

    const activeProject = useMemo(() => projects.find(p => p.id === selectedProjectId), [projects, selectedProjectId]);

    const stats = useMemo(() => {
        if (!activeProject || !activeProject.tables || activeProject.tables.length === 0) {
            return { notEnoughData: true };
        }
        
        const projectEntries = workEntries.filter(e => e.projectId === activeProject.id);
        const cableEntries = projectEntries.filter(e => e.type === 'task' && e.subType === 'cables') as CablesWorkEntry[];

        if (cableEntries.length < 1) {
             return { notEnoughData: true };
        }

        const completedTables = new Set(cableEntries.map(e => e.table));
        const totalTables = activeProject.tables.length;
        
        const firstDay = new Date(cableEntries.reduce((min, p) => p.date < min ? p.date : min, cableEntries[0].date));
        const today = new Date();
        const daysSinceStart = Math.max(1, Math.ceil((today.getTime() - firstDay.getTime()) / (1000 * 3600 * 24)));
        const averageVelocity = completedTables.size / daysSinceStart;

        const totalManHoursSoFar = projectEntries.reduce((sum, e) => sum + e.duration, 0);

        let totalCostSoFar = 0;
        projectEntries.forEach(entry => {
            const numWorkers = entry.workerIds.length;
            if (numWorkers === 0) return;
            entry.workerIds.forEach(workerId => {
                const worker = workers.find(w => w.id === workerId);
                if (!worker) return;
                
                let earningsPart = 0;
                if (entry.type === 'hourly' || (entry.type === 'task' && entry.subType === 'construction')) {
                    earningsPart = (entry.duration / numWorkers) * worker.rate;
                } else if (entry.type === 'task' && entry.subType === 'paneling') {
                    earningsPart = ((entry as PanelingWorkEntry).moduleCount / numWorkers) * (worker.panelRate || 0);
                } else if (entry.type === 'task' && entry.subType === 'cables') {
                    let tableRate = 0;
                    if ((entry as CablesWorkEntry).tableSize === 'small') tableRate = worker.cableRateSmall || 0;
                    else if ((entry as CablesWorkEntry).tableSize === 'medium') tableRate = worker.cableRateMedium || 0;
                    else if ((entry as CablesWorkEntry).tableSize === 'large') tableRate = worker.cableRateLarge || 0;
                    earningsPart = tableRate / numWorkers;
                }
                totalCostSoFar += earningsPart;
            });
        });
        
        const tablesByDay = cableEntries.reduce<Record<string, Set<string>>>((acc, entry) => {
            const date = new Date(entry.date).toISOString().slice(0, 10);
            if (!acc[date]) acc[date] = new Set();
            acc[date].add(entry.table);
            return acc;
        }, {});

        let cumulativeCount = 0;
        const velocityChartData = Object.keys(tablesByDay).sort().map(date => {
            cumulativeCount += tablesByDay[date].size;
            return { date: new Date(date).toLocaleDateString(locale, { month: 'short', day: 'numeric'}), completed: cumulativeCount };
        });

        const projectWorkers = workers.filter(w => activeProject.workerIds.includes(w.id));
        const workerPerformanceData = projectWorkers.map(worker => {
            const workerEntries = projectEntries.filter(e => e.workerIds.includes(worker.id));
            const totalHours = workerEntries.reduce((sum, e) => sum + (e.duration / e.workerIds.length), 0);
            
            const totalEarnings = workerEntries.reduce((sum, e) => {
                 const numWorkers = e.workerIds.length;
                 let earningsPart = 0;
                 if (e.type === 'hourly' || (e.type === 'task' && e.subType === 'construction')) {
                    earningsPart = (e.duration / numWorkers) * worker.rate;
                } else if (e.type === 'task' && e.subType === 'paneling') {
                    earningsPart = ((e as PanelingWorkEntry).moduleCount / numWorkers) * (worker.panelRate || 0);
                } else if (e.type === 'task' && e.subType === 'cables') {
                    let tableRate = 0;
                    if ((e as CablesWorkEntry).tableSize === 'small') tableRate = worker.cableRateSmall || 0;
                    else if ((e as CablesWorkEntry).tableSize === 'medium') tableRate = worker.cableRateMedium || 0;
                    else if ((e as CablesWorkEntry).tableSize === 'large') tableRate = worker.cableRateLarge || 0;
                    earningsPart = tableRate / numWorkers;
                }
                return sum + earningsPart;
            }, 0);

            // Calculate tables per hour (specific to cable tasks)
            const cableEntries = workerEntries.filter(e => e.type === 'task' && e.subType === 'cables');
            const hoursOnCables = cableEntries.reduce((sum, e) => sum + (e.duration / e.workerIds.length), 0);
            const tablesInstalled = cableEntries.reduce((sum, e) => sum + (1 / e.workerIds.length), 0);
            const tablesPerHour = hoursOnCables > 0 ? tablesInstalled / hoursOnCables : 0;

            return {
                name: worker.name.split(' ')[0],
                avgEarning: totalHours > 0 ? totalEarnings / totalHours : 0,
                tablesPerHour
            };
        });

        const sortedByEarnings = [...workerPerformanceData].sort((a,b) => b.avgEarning - a.avgEarning);
        const sortedByEfficiency = [...workerPerformanceData].sort((a,b) => b.tablesPerHour - a.tablesPerHour);


        return {
            notEnoughData: false,
            totalTablesCompleted: completedTables.size,
            totalTables: totalTables,
            totalManHours: totalManHoursSoFar,
            totalCost: totalCostSoFar,
            averageVelocity: averageVelocity.toFixed(1),
            velocityChartData,
            sortedByEarnings,
            sortedByEfficiency
        };

    }, [selectedProjectId, workEntries, workers, projects, t, locale]);

    const renderContent = () => {
        if (!activeProject) {
            return (
                <div className="floating-card p-8 text-center">
                    <p className="text-xl font-bold">{t('dashboard_no_project_selected')}</p>
                </div>
            )
        }
        if (stats.notEnoughData) {
            return (
                <div className="floating-card p-8 text-center">
                    <p className="text-white/70">{t('stats_not_enough_data')}</p>
                </div>
            );
        }

        return (
            <div className="space-y-6">
                <StatCard title={t('stats_project_summary')}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                        <MetricItem 
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 14a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 14a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>}
                            value={`${stats.totalTablesCompleted} / ${stats.totalTables}`}
                            label={t('stats_total_tables_completed')}
                        />
                        <MetricItem 
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                            value={`${stats.totalManHours.toFixed(0)} h`}
                            label={t('stats_total_man_hours')}
                        />
                        <MetricItem 
                            icon={<span className="text-2xl font-bold">€</span>}
                            value={`€${Number(stats.totalCost).toLocaleString(locale)}`}
                            label={t('stats_total_cost')}
                        />
                         <MetricItem 
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
                            value={stats.averageVelocity}
                            label={t('stats_tables_per_day')}
                        />
                    </div>
                </StatCard>
                <StatCard title={t('stats_project_velocity')}>
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={stats.velocityChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="date" stroke="rgba(255,255,255,0.7)" fontSize={12} />
                            <YAxis stroke="rgba(255,255,255,0.7)" fontSize={12} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend formatter={() => t('stats_tables_completed_over_time')} />
                            <Line type="monotone" dataKey="completed" stroke="var(--accent-color-light)" strokeWidth={2} dot={{r: 4}} activeDot={{ r: 8 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </StatCard>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <StatCard title={t('stats_worker_performance')}>
                         <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={stats.sortedByEarnings} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="name" stroke="rgba(255,255,255,0.7)" fontSize={12} />
                                <YAxis stroke="rgba(255,255,255,0.7)" fontSize={12} />
                                <Tooltip 
                                    cursor={{fill: 'rgba(255,255,255,0.1)'}}
                                    contentStyle={{ backgroundColor: 'rgba(20, 20, 40, 0.8)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px' }}
                                />
                                <Legend formatter={() => t('stats_avg_earnings_per_hour')} />
                                <Bar dataKey="avgEarning" name="Avg €/h" fill="url(#colorUv)" />
                                 <defs>
                                    <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--gradient-start)" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="var(--gradient-end)" stopOpacity={0.8}/>
                                    </linearGradient>
                                </defs>
                            </BarChart>
                        </ResponsiveContainer>
                    </StatCard>
                    <StatCard title={t('stats_installation_efficiency')}>
                         <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={stats.sortedByEfficiency} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="name" stroke="rgba(255,255,255,0.7)" fontSize={12} />
                                <YAxis stroke="rgba(255,255,255,0.7)" fontSize={12} />
                                <Tooltip 
                                    cursor={{fill: 'rgba(255,255,255,0.1)'}}
                                    contentStyle={{ backgroundColor: 'rgba(20, 20, 40, 0.8)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px' }}
                                />
                                <Legend formatter={() => t('stats_tables_per_hour_chart')} />
                                <Bar dataKey="tablesPerHour" name="Tables/h" fill="url(#colorEf)" />
                                 <defs>
                                    <linearGradient id="colorEf" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.8}/>
                                    </linearGradient>
                                </defs>
                            </BarChart>
                        </ResponsiveContainer>
                    </StatCard>
                </div>
            </div>
        );
    }


    return (
        <div className="h-full w-full p-4 overflow-y-auto scrolling-touch space-y-6">
            <StatCard title={t('stats_page_title')}>
                <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} className="w-full bg-white/10 text-white p-3 rounded-xl border border-white/20 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] transition">
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
            </StatCard>
            {renderContent()}
        </div>
    );
};

export default StatsPage;