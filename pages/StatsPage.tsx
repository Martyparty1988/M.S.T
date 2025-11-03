import React, { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAppContext } from '../context/AppContext';
import { useI18n } from '../context/I18nContext';
import { useTheme } from '../context/ThemeContext';
import { WorkEntry, CablesWorkEntry } from '../types';

const StatCard: React.FC<{title: string; value: string | number; subValue?: string, className?: string}> = ({title, value, subValue, className}) => (
    <div className={`floating-card p-5 text-center ${className}`}>
        <p className="text-white/70 text-sm font-normal">{title}</p>
        <p className="text-2xl font-bold text-white tracking-tight mt-1">{value}</p>
        {subValue && <p className="text-xs text-white/40">{subValue}</p>}
    </div>
)

const StatsPage: React.FC = () => {
  const { workEntries, workers, projects } = useAppContext();
  const { t, locale } = useI18n();
  const { theme } = useTheme();

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [accentColorLight, setAccentColorLight] = useState('');
  const [gradientEnd, setGradientEnd] = useState('');
  const [gradientMiddle, setGradientMiddle] = useState('');
  
  useEffect(() => {
      if (projects.length > 0 && !selectedProjectId) {
          setSelectedProjectId(projects[0].id);
      }
  }, [projects, selectedProjectId]);

  useEffect(() => {
    const styles = getComputedStyle(document.body);
    const gradientEndValue = styles.getPropertyValue('--gradient-end').trim();
    setGradientEnd(gradientEndValue);
    setGradientMiddle(styles.getPropertyValue('--gradient-middle').trim());
    setAccentColorLight(styles.getPropertyValue('--accent-color-light').trim());
  }, [theme]);

  const projectEntries = useMemo(() => {
    if (!selectedProjectId) return [];
    return workEntries.filter(e => e.projectId === selectedProjectId);
  }, [workEntries, selectedProjectId]);

  const selectedProject = useMemo(() => {
      return projects.find(p => p.id === selectedProjectId);
  }, [projects, selectedProjectId]);
  
  const projectStats = useMemo(() => {
      if (!selectedProject) return null;

      const cableTasks = projectEntries.filter(e => e.type === 'task' && e.subType === 'cables');
      const completedTables = new Set(cableTasks.map(e => (e as CablesWorkEntry).table));
      const totalTables = selectedProject.tables.length;
      
      const panelingTasks = projectEntries.filter(e => e.type === 'task' && e.subType === 'paneling');
      const totalModules = panelingTasks.reduce((sum, e) => sum + (e as any).moduleCount, 0);
      const totalPanelingHours = panelingTasks.reduce((sum, e) => sum + e.duration, 0);

      const workerCounts: {[id: string]: number} = {};
      projectEntries.forEach(e => {
          e.workerIds.forEach(id => {
              workerCounts[id] = (workerCounts[id] || 0) + 1;
          });
      });
      const topWorkerId = Object.keys(workerCounts).sort((a,b) => workerCounts[b] - workerCounts[a])[0];
      const topWorker = workers.find(w => w.id === topWorkerId);

      return {
          totalTables,
          completedTables: completedTables.size,
          remainingTables: totalTables - completedTables.size,
          hourlyCount: projectEntries.filter(e => e.type === 'hourly').length,
          panelingCount: panelingTasks.length,
          avgModulesPerHour: totalPanelingHours > 0 ? (totalModules / totalPanelingHours).toFixed(1) : 0,
          topWorkerName: topWorker ? topWorker.name : 'N/A',
          topWorkerCount: topWorker ? `${workerCounts[topWorkerId]} ${t('stats_total_work_entries')}` : ''
      };
  }, [projectEntries, selectedProject, workers, t]);

  const projectForecast = useMemo(() => {
      if (!projectStats || projectStats.totalTables === 0) return null;
      
      const cableTasks = projectEntries.filter(e => e.type === 'task' && e.subType === 'cables') as CablesWorkEntry[];
      if (cableTasks.length === 0) return { tablesPerDay: 0, remainingDays: Infinity, completionDate: null };

      const firstDay = new Date(Math.min(...cableTasks.map(e => new Date(e.date).getTime())));
      const today = new Date();
      const uniqueDaysWorked = new Set(cableTasks.map(e => new Date(e.date).setHours(0,0,0,0))).size;
      
      if (uniqueDaysWorked === 0) return { tablesPerDay: 0, remainingDays: Infinity, completionDate: null };
      
      const tablesPerDay = projectStats.completedTables / uniqueDaysWorked;
      if (tablesPerDay === 0) return { tablesPerDay: 0, remainingDays: Infinity, completionDate: null };

      const remainingDays = Math.ceil(projectStats.remainingTables / tablesPerDay);
      const completionDate = new Date(today.setDate(today.getDate() + remainingDays));
      
      return {
          tablesPerDay: parseFloat(tablesPerDay.toFixed(1)),
          remainingDays,
          completionDate: remainingDays === Infinity ? null : completionDate
      };
  }, [projectEntries, projectStats]);

  const workerEarnings = useMemo(() => {
    const earnings: { [key: string]: number } = {};
    workers.forEach(w => earnings[w.name] = 0);

    projectEntries.forEach(entry => {
      
      entry.workerIds.forEach(id => {
          const worker = workers.find(w => w.id === id);
          if (worker) {
            const amount = entry.duration * worker.rate;
            earnings[worker.name] += amount / entry.workerIds.length;
          }
      });
    });

    return Object.entries(earnings)
      .map(([name, total]) => ({ name, total: parseFloat(total.toFixed(2)) }))
      .filter(item => item.total > 0)
      .sort((a,b) => b.total - a.total);
  }, [projectEntries, workers]);
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="floating-card p-3 text-sm border border-white/20">
          <p className="label font-semibold text-white">{`${label}`}</p>
          <p className="intro" style={{color: accentColorLight}}>{`${t('stats_tooltip_total')} : €${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
  };
  
  const formInputStyle = "w-full bg-white/10 text-white p-3 rounded-xl border border-white/20 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)] transition text-base font-normal";

  return (
    <div className="h-full w-full p-4 overflow-y-auto space-y-6">
      <div className="floating-card p-5">
          <label className="block mb-2 text-sm font-medium text-white/70">{t('stats_select_project_label')}</label>
          <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} className={formInputStyle}>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
      </div>

      {projectForecast && projectForecast.completionDate && (
          <div className="floating-card p-5 text-center">
            <h2 className="text-base font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] uppercase tracking-wider mb-2">{t('stats_forecast_title')}</h2>
            <p className="text-white/70 text-sm font-normal">{t('stats_forecast_completion_date')}</p>
            <p className="text-3xl font-bold text-white my-1">{projectForecast.completionDate.toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric'})}</p>
            <div className="flex justify-center items-center gap-6 mt-3 text-white">
                <div>
                    <span className="font-semibold text-xl">{projectForecast.remainingDays}</span>
                    <span className="text-sm ml-1 text-white/70 font-normal">{t('stats_forecast_remaining_days')}</span>
                </div>
                 <div>
                    <span className="font-semibold text-xl">{projectForecast.tablesPerDay}</span>
                    <span className="text-sm ml-1 text-white/70 font-normal">{t('stats_forecast_rate')}</span>
                </div>
            </div>
          </div>
      )}

      {projectStats && selectedProject && (
          <div className="grid grid-cols-2 gap-4">
              <StatCard title={t('stats_table_completion')} value={`${projectStats.completedTables} / ${projectStats.totalTables}`} subValue={`${projectStats.remainingTables} ${t('stats_remaining')}`} />
              <StatCard title={t('stats_work_distribution')} value={projectStats.panelingCount} subValue={`${t('work_task_paneling')} / ${projectStats.hourlyCount} ${t('work_type_hourly')}`} />
              <StatCard title={t('stats_paneling_performance')} value={projectStats.avgModulesPerHour} subValue={t('stats_avg_mods_per_hour')} />
              <StatCard title={t('stats_top_worker')} value={projectStats.topWorkerName} subValue={projectStats.topWorkerCount} />
          </div>
      )}

      <div className="floating-card p-5">
        <h2 className="text-xl font-bold mb-4 text-center text-white">{t('stats_earnings_by_worker_title')}</h2>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={workerEarnings} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <XAxis dataKey="name" stroke="rgba(255, 255, 255, 0.4)" fontSize={12} />
              <YAxis stroke="rgba(255, 255, 255, 0.4)" fontSize={12} />
              <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255, 255, 255, 0.1)'}} />
              <Bar dataKey="total" name={t('stats_tooltip_total')} fill="url(#colorTotal)" />
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={gradientEnd} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={gradientMiddle} stopOpacity={0.2}/>
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default StatsPage;