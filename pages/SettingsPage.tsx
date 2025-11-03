import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useI18n } from '../context/I18nContext';
import { useTheme } from '../context/ThemeContext';
import { Theme, ProjectStatus, Project } from '../types';
import type { Locale } from '../translations';
import { ZARASAI_STOLY } from '../translations';

const SettingsPage: React.FC = () => {
  const { 
    projects, addProject, deleteProject, 
    workers, addWorker, deleteWorker, 
    workEntries, showToast
  } = useAppContext();
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();

  const formInputStyle = "w-full bg-white/10 text-white p-3 rounded-lg border border-white/20 placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)] transition";
  const formLabelStyle = "block mb-2 text-sm font-medium text-white/70";
  const primaryButtonStyle = "w-full bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] hover:opacity-90 text-white font-bold py-3 px-4 rounded-lg transition duration-200 transform hover:scale-105 shadow-lg";
  
  const themes: { id: Theme, name: string, colors: [string, string] }[] = [
      { id: 'default', name: t('settings_theme_default'), colors: ['#FF61A6', '#a855f7'] },
      { id: 'oceanic', name: t('settings_theme_oceanic'), colors: ['#00C9FF', '#0ea5e9'] },
      { id: 'sunset', name: t('settings_theme_sunset'), colors: ['#f97316', '#f59e0b'] },
      { id: 'forest', name: t('settings_theme_forest'), colors: ['#4ade80', '#16a34a'] }
  ];

  const handleAddProject = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('projectName') as string;
    const status = formData.get('projectStatus') as ProjectStatus;
    const tablesRaw = formData.get('projectTables') as string;
    
    const tables = tablesRaw.split(/[\n,]/).map(s => s.trim()).filter(Boolean);

    if (name && status) {
        const newProject: Omit<Project, 'id'> = { name, status, tables };
        addProject(newProject);
        (e.target as HTMLFormElement).reset();
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
    // Simplified report for now
    todaysEntries.forEach(entry => {
        const workerNames = entry.workerIds.map(id => workers.find(w=>w.id === id)?.name).join(', ');
        const projectName = projects.find(p => p.id === entry.projectId)?.name;
        report += `Project: ${projectName}, Workers: ${workerNames}, Duration: ${entry.duration.toFixed(2)}h\n`;
    });
    
    navigator.clipboard.writeText(report).then(() => {
        showToast(t("toast_report_copied"));
    }, () => {
        showToast(t("toast_report_copy_failed"));
    });
  };

  const handleExportData = () => {
    const dataToExport: { [key: string]: any } = {};
    const keysToExport = [ 'projects', 'workers', 'workEntries', 'activeProjectId', 'locale', 'theme' ];
    
    keysToExport.forEach(key => {
        const item = localStorage.getItem(key);
        if (item) {
            dataToExport[key] = JSON.parse(item);
        }
    });

    const dataStr = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const date = new Date().toISOString().slice(0, 10);
    link.download = `solar_work_count_backup_${date}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(t('toast_data_exported'));
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm(t('import_confirm_message'))) {
        e.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target?.result as string);
            // Ensure Zarasai project is preserved or correctly merged
            if (data.projects && !data.projects.find((p: Project) => p.id === 'zarasai_predefined')) {
                data.projects.push({ id: 'zarasai_predefined', name: 'Zarasai', status: 'active', tables: ZARASAI_STOLY });
            }

            Object.keys(data).forEach(key => {
                localStorage.setItem(key, JSON.stringify(data[key]));
            });
            showToast(t('toast_data_imported'));
            setTimeout(() => window.location.reload(), 1000);
        } catch (error) {
            console.error("Import failed:", error);
            showToast(t('toast_import_error'));
        } finally {
            e.target.value = '';
        }
    };
    reader.readAsText(file);
  };

  return (
    <div className="h-full w-full p-4 overflow-y-auto space-y-6">
      <div className="glassmorphism p-4 rounded-xl border border-white/20 shadow-lg">
        <h2 className="text-xl font-bold mb-3 text-white">{t('settings_theme_title')}</h2>
        <div className="grid grid-cols-2 gap-4">
            {themes.map(item => (
                <button
                    key={item.id}
                    onClick={() => setTheme(item.id)}
                    className={`p-2 rounded-lg border-2 transition-all ${theme === item.id ? 'border-[var(--accent-color)] shadow-lg' : 'border-transparent hover:border-white/20'}`}
                >
                    <div className="w-full h-10 rounded-md" style={{ background: `linear-gradient(to right, ${item.colors[0]}, ${item.colors[1]})` }}></div>
                    <p className="mt-2 text-center text-sm font-medium">{item.name}</p>
                </button>
            ))}
        </div>
      </div>

      <div className="glassmorphism p-4 rounded-xl border border-white/20 shadow-lg">
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
      
      <div className="glassmorphism p-4 rounded-xl border border-white/20 shadow-lg">
        <h2 className="text-xl font-bold mb-3 text-white">{t('settings_project_management_title')}</h2>
        <form onSubmit={handleAddProject} className="space-y-4 mb-4">
          <input type="text" name="projectName" placeholder={t('settings_project_name_placeholder')} required className={formInputStyle} />
          <div>
            <label className={formLabelStyle}>{t('settings_project_status_label')}</label>
            <select name="projectStatus" defaultValue="active" required className={formInputStyle}>
                <option value="active">{t('settings_project_status_active')}</option>
                <option value="completed">{t('settings_project_status_completed')}</option>
                <option value="paused">{t('settings_project_status_paused')}</option>
            </select>
          </div>
           <div>
            <label className={formLabelStyle}>{t('settings_project_tables_label')}</label>
            <textarea name="projectTables" rows={4} className={formInputStyle}></textarea>
          </div>
          <button type="submit" className={primaryButtonStyle}>{t('settings_add_project_button')}</button>
        </form>
        <div className="space-y-2">
            {projects.map(p => (
                <div key={p.id} className="bg-white/5 p-3 rounded-lg flex justify-between items-center">
                    <div>
                        <span className="font-medium">{p.name}</span>
                        <span className="ml-2 text-xs bg-white/10 text-white/70 px-2 py-1 rounded-full capitalize">{p.status}</span>
                    </div>
                    {p.id !== 'zarasai_predefined' && (
                        <button onClick={() => deleteProject(p.id)} className="text-white/50 hover:text-red-500 font-bold text-xl px-2">&times;</button>
                    )}
                </div>
            ))}
        </div>
      </div>

      <div className="glassmorphism p-4 rounded-xl border border-white/20 shadow-lg">
        <h2 className="text-xl font-bold mb-3 text-white">{t('settings_worker_management_title')}</h2>
        <form onSubmit={handleAddWorker} className="space-y-4 mb-4">
          <input type="text" name="workerName" placeholder={t('settings_worker_name_placeholder')} required className={formInputStyle} />
          <input type="number" step="0.01" name="workerRate" placeholder={t('settings_worker_rate_placeholder')} required className={formInputStyle} />
          <button type="submit" className={primaryButtonStyle}>{t('settings_add_worker_button')}</button>
        </form>
        <div className="space-y-2">
            {workers.map(w => (
                <div key={w.id} className="bg-white/5 p-3 rounded-lg flex justify-between items-center">
                    <span className="font-medium">{w.name} (€{w.rate}/hr)</span>
                    <button onClick={() => deleteWorker(w.id)} className="text-white/50 hover:text-red-500 font-bold text-xl px-2">&times;</button>
                </div>
            ))}
        </div>
      </div>
      
      <div className="glassmorphism p-4 rounded-xl border border-white/20 shadow-lg">
        <h2 className="text-xl font-bold mb-3 text-white">{t('settings_data_management_title')}</h2>
        <div className="space-y-4">
            <button onClick={handleExportData} className="w-full bg-gradient-to-r from-sky-500 to-indigo-500 hover:opacity-90 text-white font-bold py-3 px-4 rounded-lg transition transform hover:scale-105 shadow-lg">
                {t('settings_export_data_button')}
            </button>
            <div>
              <input type="file" id="importFile" accept="application/json" className="hidden" onChange={handleImportData} />
              <label htmlFor="importFile" className="w-full block text-center bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-white font-bold py-3 px-4 rounded-lg transition transform hover:scale-105 shadow-lg cursor-pointer">
                  {t('settings_import_data_button')}
              </label>
            </div>
        </div>
      </div>

      <div className="glassmorphism p-4 rounded-xl border border-white/20 shadow-lg">
        <h2 className="text-xl font-bold mb-3 text-white">{t('settings_actions_title')}</h2>
        <button onClick={generateDailyReport} className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white font-bold py-3 px-4 rounded-lg transition transform hover:scale-105 shadow-lg">{t('settings_generate_report_button')}</button>
      </div>
    </div>
  );
};

export default SettingsPage;
