import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAppContext } from '../context/AppContext';
import { useI18n } from '../context/I18nContext';
import { WorkEntry, WorkEntryType } from '../types';

const COLORS = ['#00BFFF', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const StatsPage: React.FC = () => {
  const { workEntries, workers } = useAppContext();
  const { t } = useI18n();

  const workerEarnings = useMemo(() => {
    const earnings: { [key: string]: number } = {};
    workers.forEach(w => earnings[w.name] = 0);

    workEntries.forEach(entry => {
      const workerName = workers.find(w => w.id === entry.workerId)?.name;
      if (!workerName) return;
      
      let amount = 0;
      if (entry.type === WorkEntryType.Task) {
        amount = entry.reward;
      } else {
        const workerRate = workers.find(w => w.id === entry.workerId)?.rate || 0;
        amount = entry.duration * workerRate;
      }
      earnings[workerName] += amount;
    });

    return Object.entries(earnings).map(([name, total]) => ({ name, total: parseFloat(total.toFixed(2)) })).sort((a,b) => b.total - a.total);
  }, [workEntries, workers]);

  const earningsByType = useMemo(() => {
      let taskTotal = 0;
      let hourlyTotal = 0;

      workEntries.forEach(entry => {
          if (entry.type === WorkEntryType.Task) {
              taskTotal += entry.reward;
          } else {
              const workerRate = workers.find(w => w.id === entry.workerId)?.rate || 0;
              hourlyTotal += entry.duration * workerRate;
          }
      });
      return [
          { name: t('stats_task_based'), value: parseFloat(taskTotal.toFixed(2)) },
          { name: t('stats_hourly_based'), value: parseFloat(hourlyTotal.toFixed(2)) },
      ];
  }, [workEntries, workers, t]);
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glassmorphism p-3 rounded-lg text-sm">
          <p className="label font-bold text-white">{`${label}`}</p>
          <p className="intro text-cyan-300">{`${t('stats_tooltip_total')} : €${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-full w-full p-4 overflow-y-auto space-y-4">
      <div className="glassmorphism p-4 rounded-xl">
        <h2 className="text-xl font-bold mb-4 text-center text-white">{t('stats_earnings_by_worker_title')}</h2>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={workerEarnings} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <XAxis dataKey="name" stroke="#778DA9" fontSize={12} />
              <YAxis stroke="#778DA9" fontSize={12} />
              <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(119, 141, 169, 0.2)'}} />
              <Legend wrapperStyle={{fontSize: "14px"}}/>
              <Bar dataKey="total" name={t('stats_tooltip_total')} fill="url(#colorTotal)" />
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00BFFF" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#00BFFF" stopOpacity={0.2}/>
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="glassmorphism p-4 rounded-xl">
        <h2 className="text-xl font-bold mb-4 text-center text-white">{t('stats_earnings_by_type_title')}</h2>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={earningsByType}
                cx="50%"
                cy="50%"
                labelLine={false}
                // FIX: The 'percent' property can be undefined. Default to 0 to prevent a runtime error when performing multiplication.
                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                stroke="#1B263B"
                style={{ fill: '#E0E1DD', fontSize: 14 }}
              >
                {earningsByType.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{fontSize: "14px"}}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default StatsPage;