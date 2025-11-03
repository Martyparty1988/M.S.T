import React, { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAppContext } from '../context/AppContext';
import { useI18n } from '../context/I18nContext';
import { useTheme } from '../context/ThemeContext';
import { WorkEntry } from '../types';

const StatCard: React.FC<{title: string; value: string | number; subValue?: string}> = ({title, value, subValue}) => (
    <div className="glassmorphism p-4 rounded-xl border border-white/20 text-center">
        <p className="text-white/70 text-sm font-medium">{title}</p>
        <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
        {subValue && <p className="text-xs text-white/50">{subValue}</p>}
    </div>
)

const StatsPage: React.FC = () => {
  const { workEntries, workers, projects } = useAppContext();
  const { t } = useI18n();
  const { theme } = useTheme();

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [chartColors, setChartColors] = useState<string[]>([]);
  const [gradientStart, setGradientStart] = useState('');
  const [gradientMiddle, setGradientMiddle] = useState('');
  const [accentColorLight, setAccentColorLight] = useState('');
  const [gradientEnd, setGradientEnd] = useState('');
  
  useEffect(() => {
      if (projects.length > 0) {
          setSelectedProjectId(projects[0].id);
      }
  }, [projects]);

  useEffect(() => {
    const styles = getComputedStyle(document.body);
    const gradientEndValue = styles.getPropertyValue('--gradient-end').trim();
    setChartColors([
      gradientEndValue,
      styles.getPropertyValue('--gradient-start').trim(),
      '#f97316', 
      '#14b8a6', 
      '#f59e0b'
    ]);
    setGradientStart(styles.getPropertyValue('--gradient-start').trim());
    setGradientMiddle(styles.getPropertyValue('--gradient-middle').trim());
    setGradientEnd(gradientEndValue);
    setAccentColorLight(styles.getPropertyValue('--accent-color-light').trim());
  }, [theme]);

  const projectEntries = useMemo(() => {
    return workEntries.filter(e => e.projectId === selectedProjectId);
  }, [workEntries, selectedProjectId]);

  const selectedProject = useMemo(() => {
      return projects.find(p => p.id === selectedProjectId);
  }, [projects, selectedProjectId]);
  
  const projectStats = useMemo(() => {
      if (!selectedProject) return null;

      const cableTasks = projectEntries.filter(e => e.type === 'task' && e.subType === 'cables');
      const completedTables = new Set(cableTasks.map(e => e.table));
      const totalTables = selectedProject.tables.length;
      
      const panelingTasks = projectEntries.filter(e => e.type === 'task' && e.subType === 'paneling');
      const totalModules = panelingTasks.reduce((sum, e) => sum + e.moduleCount, 0);
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
          topWorker: topWorker ? `${topWorker.name} (${workerCounts[topWorkerId]} ${t('stats_total_work_entries')})` : 'N/A'
      };
  }, [projectEntries, selectedProject, workers, t]);

  const workerEarnings = useMemo(() => {
    const earnings: { [key: string]: number } = {};
    workers.forEach(w => earnings[w.name] = 0);

    projectEntries.forEach(entry => {
      const workerRate = workers.find(w => w.id === entry.workerIds[0])?.rate || 0; // Simplified for now
      const amount = entry.duration * workerRate; // Simplified calculation for all entries
      
      entry.workerIds.forEach(id => {
          const workerName = workers.find(w => w.id === id)?.name;
          if (workerName) {
            // Distribute amount among workers
            earnings[workerName] += amount / entry.workerIds.length;
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
        <div className="glassmorphism p-3 rounded-lg text-sm border border-white/20">
          <p className="label font-bold text-white">{`${label}`}</p>
          <p className="intro" style={{color: accentColorLight}}>{`${t('stats_tooltip_total')} : €${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
  };
  
  const formInputStyle = "w-full bg-white/10 text-white p-3 rounded-lg border border-white/20 placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)] transition";

  return (
    <div className="h-full w-full p-4 overflow-y-auto space-y-4">
      <div className="glassmorphism p-4 rounded-xl border border-white/20 shadow-lg">
          <label className="block mb-2 text-sm font-medium text-white/70">{t('stats_select_project_label')}</label>
          <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} className={formInputStyle}>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
      </div>

      {projectStats && selectedProject && (
          <div className="glassmorphism p-4 rounded-xl border border-white/20 shadow-lg">
              <h2 className="text-xl font-bold mb-4 text-center text-white">{t('stats_project_overview')}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard title={t('stats_table_completion')} value={`${projectStats.completedTables} / ${projectStats.totalTables}`} subValue={`${projectStats.remainingTables} ${t('stats_remaining')}`} />
                  <StatCard title={t('stats_work_distribution')} value={projectStats.panelingCount} subValue={`${t('work_task_paneling')} / ${projectStats.hourlyCount} ${t('work_type_hourly')}`} />
                  <StatCard title={t('stats_paneling_performance')} value={projectStats.avgModulesPerHour} subValue={t('stats_avg_mods_per_hour')} />
                  <StatCard title={t('stats_top_worker')} value={projectStats.topWorker?.split('(')[0] || ''} subValue={projectStats.topWorker?.split('(')[1]?.replace(')','')} />
              </div>
          </div>
      )}

      <div className="glassmorphism p-4 rounded-xl border border-white/20 shadow-lg">
        <h2 className="text-xl font-bold mb-4 text-center text-white">{t('stats_earnings_by_worker_title')}</h2>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={workerEarnings} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <XAxis dataKey="name" stroke="rgba(255, 255, 255, 0.5)" fontSize={12} />
              <YAxis stroke="rgba(255, 255, 255, 0.5)" fontSize={12} />
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
