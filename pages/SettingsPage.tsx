
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useI18n } from '../context/I18nContext';
import { WorkEntryType } from '../types';
// FIX: The 'Locale' type is imported from '../translations' instead of '../types' because it is defined and exported from 'translations.ts'.
import type { Locale } from '../translations';

const SettingsPage: React.FC = () => {
  const { 
    projects, addProject, deleteProject, 
    workers, addWorker, deleteWorker, 
    workEntries, showToast,
    smallTableRate, setSmallTableRate,
    mediumTableRate, setMediumTableRate,
    largeTableRate, setLargeTableRate
  } = useAppContext();
  const { t, locale, setLocale } = useI18n();
  
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const formInputStyle = "w-full bg-brand-gunmetal/80 text-brand-ghost p-3 rounded-lg border border-brand-shale focus:outline-none focus:ring-2 focus:ring-brand-electric focus:border-brand-electric transition";
  const formLabelStyle = "block mb-2 text-sm font-medium text-brand-silver";
  const primaryButtonStyle = "w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200 transform hover:scale-105 shadow-lg";

  const handleAddProject = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('projectName') as string;
    const file = (formData.get('planPDF') as File);

    if (name && file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          addProject(name, event.target.result as string);
          (e.target as HTMLFormElement).reset();
          setSelectedFileName(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddWorker = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('workerName') as string;
    const rate = parseFloat(formData.get('workerRate') as string);
    if (name && !isNaN(rate)) {
      addWorker({ name, rate });
      (e.target as HTMLFormElement).reset();
    }
  };
  
  const generateDailyReport = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaysEntries = workEntries.filter(e => new Date(e.date) >= today);
    if (todaysEntries.length === 0) {
        showToast(t("toast_no_entries_today"));
        return;
    }
    
    let report = `${t('report_title')} ${today.toLocaleDateString()}:\n\n`;
    const workerTotals: { [key: string]: { tasks: number, taskValue: number, hours: number, hourValue: number } } = {};

    todaysEntries.forEach(entry => {
        const worker = workers.find(w => w.id === entry.workerId);
        if (!worker) return;
        if (!workerTotals[worker.name]) {
            workerTotals[worker.name] = { tasks: 0, taskValue: 0, hours: 0, hourValue: 0 };
        }

        if (entry.type === WorkEntryType.Task) {
            workerTotals[worker.name].tasks++;
            workerTotals[worker.name].taskValue += entry.reward;
        } else {
            workerTotals[worker.name].hours += entry.duration;
            workerTotals[worker.name].hourValue += entry.duration * worker.rate;
        }
    });

    Object.entries(workerTotals).forEach(([name, totals]) => {
        report += `${name}:\n`;
        if (totals.tasks > 0) {
            report += `  - ${t('report_tasks')}: ${totals.tasks} ${t('report_tables')} €${totals.taskValue.toFixed(2)}\n`;
        }
        if (totals.hours > 0) {
            report += `  - ${t('report_hourly')}: ${totals.hours.toFixed(2)} ${t('report_hours')} €${totals.hourValue.toFixed(2)}\n`;
        }
        const totalPay = totals.taskValue + totals.hourValue;
        report += `  - ${t('report_total_today')}: €${totalPay.toFixed(2)}\n\n`;
    });
    
    navigator.clipboard.writeText(report).then(() => {
        showToast(t("toast_report_copied"));
    }, () => {
        showToast(t("toast_report_copy_failed"));
    });
  };

  return (
    <div className="h-full w-full p-4 overflow-y-auto space-y-6">
      <div className="glassmorphism p-4 rounded-xl">
        <h2 className="text-xl font-bold mb-3 text-white">{t('settings_language_title')}</h2>
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value as Locale)}
          className={formInputStyle}
        >
          <option value="cs">Čeština</option>
          <option value="en">English</option>
        </select>
      </div>

      <div className="glassmorphism p-4 rounded-xl">
        <h2 className="text-xl font-bold mb-3 text-white">{t('settings_task_rates_title')}</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="smallTableRate" className={formLabelStyle}>{t('settings_small_table_rate')}</label>
            <input type="number" step="0.01" id="smallTableRate" value={smallTableRate} onChange={e => setSmallTableRate(parseFloat(e.target.value) || 0)} className={formInputStyle} />
          </div>
          <div>
            <label htmlFor="mediumTableRate" className={formLabelStyle}>{t('settings_medium_table_rate')}</label>
            <input type="number" step="0.01" id="mediumTableRate" value={mediumTableRate} onChange={e => setMediumTableRate(parseFloat(e.target.value) || 0)} className={formInputStyle} />
          </div>
          <div>
            <label htmlFor="largeTableRate" className={formLabelStyle}>{t('settings_large_table_rate')}</label>
            <input type="number" step="0.01" id="largeTableRate" value={largeTableRate} onChange={e => setLargeTableRate(parseFloat(e.target.value) || 0)} className={formInputStyle} />
          </div>
        </div>
      </div>

      <div className="glassmorphism p-4 rounded-xl">
        <h2 className="text-xl font-bold mb-3 text-white">{t('settings_project_management_title')}</h2>
        <form onSubmit={handleAddProject} className="space-y-4 mb-4">
          <input type="text" name="projectName" placeholder={t('settings_project_name_placeholder')} required className={formInputStyle} />
          <div>
            <input 
              type="file" 
              name="planPDF" 
              accept="application/pdf" 
              required 
              className="w-full text-sm text-brand-silver file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-shale file:text-brand-ghost hover:file:bg-brand-silver"
              onChange={(e) => setSelectedFileName(e.target.files && e.target.files.length > 0 ? e.target.files[0].name : null)}
            />
            {selectedFileName && <p className="text-sm text-brand-silver mt-2 italic">{t('settings_selected_file')}: {selectedFileName}</p>}
          </div>
          <button type="submit" className={primaryButtonStyle}>{t('settings_add_project_button')}</button>
        </form>
        <div className="space-y-2">
            {projects.map(p => (
                <div key={p.id} className="bg-brand-gunmetal/50 p-3 rounded-lg flex justify-between items-center">
                    <span className="font-medium">{p.name}</span>
                    <button onClick={() => deleteProject(p.id)} className="text-brand-shale hover:text-red-500 font-bold text-xl px-2">&times;</button>
                </div>
            ))}
        </div>
      </div>

      <div className="glassmorphism p-4 rounded-xl">
        <h2 className="text-xl font-bold mb-3 text-white">{t('settings_worker_management_title')}</h2>
        <form onSubmit={handleAddWorker} className="space-y-4 mb-4">
          <input type="text" name="workerName" placeholder={t('settings_worker_name_placeholder')} required className={formInputStyle} />
          <input type="number" step="0.01" name="workerRate" placeholder={t('settings_worker_rate_placeholder')} required className={formInputStyle} />
          <button type="submit" className={primaryButtonStyle}>{t('settings_add_worker_button')}</button>
        </form>
        <div className="space-y-2">
            {workers.map(w => (
                <div key={w.id} className="bg-brand-gunmetal/50 p-3 rounded-lg flex justify-between items-center">
                    <span className="font-medium">{w.name} (€{w.rate}/hr)</span>
                    <button onClick={() => deleteWorker(w.id)} className="text-brand-shale hover:text-red-500 font-bold text-xl px-2">&times;</button>
                </div>
            ))}
        </div>
      </div>

      <div className="glassmorphism p-4 rounded-xl">
        <h2 className="text-xl font-bold mb-3 text-white">{t('settings_actions_title')}</h2>
        <button onClick={generateDailyReport} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition transform hover:scale-105 shadow-lg">{t('settings_generate_report_button')}</button>
      </div>
    </div>
  );
};

export default SettingsPage;
