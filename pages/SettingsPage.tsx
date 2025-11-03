import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useI18n } from '../context/I18nContext';
import { useTheme } from '../context/ThemeContext';
import { Theme, ProjectStatus, Project, Worker, CablesWorkEntry, PanelingWorkEntry, HourlyWorkEntry } from '../types';
import type { Locale } from '../translations';
import ManageTeamModal from '../components/ManageTeamModal';
import EditWorkerModal from '../components/EditWorkerModal';

const SettingsCard: React.FC<{title: string, children: React.ReactNode}> = ({title, children}) => (
    <div className="floating-card p-5">
        <h2 className="text-xl font-bold mb-4 text-white">{title}</h2>
        {children}
    </div>
);

const SettingsPage: React.FC = () => {
  const { 
    projects, addProject, deleteProject, 
    workers, addWorker, deleteWorker, 
    workEntries, showToast, mergeImportedData,
  } = useAppContext();
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();

  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [projectToManage, setProjectToManage] = useState<Project | null>(null);

  const [isEditWorkerModalOpen, setIsEditWorkerModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  
  const formInputStyle = "w-full bg-white/10 text-white p-3 rounded-xl border border-white/20 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)] transition text-base font-normal";
  const formLabelStyle = "block mb-2 text-sm font-medium text-white/70";
  const primaryButtonStyle = "w-full bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] hover:opacity-90 text-white font-bold py-3 px-4 rounded-xl transition duration-200 ease-in-out transform hover:scale-105 active:scale-95 shadow-lg";
  
  const themes: { id: Theme, name: string, colors: [string, string] }[] = [
      { id: 'dusk', name: t('settings_theme_dusk'), colors: ['#d946ef', '#6366f1'] },
      { id: 'slate', name: t('settings_theme_slate'), colors: ['#f59e0b', '#facc15'] },
      { id: 'forest', name: t('settings_theme_forest'), colors: ['#4ade80', '#16a34a'] },
      { id: 'crimson', name: t('settings_theme_crimson'), colors: ['#f97316', '#dc2626'] }
  ];

  const handleOpenTeamModal = (project: Project) => {
    setProjectToManage(project);
    setIsTeamModalOpen(true);
  };

  const handleOpenEditWorkerModal = (worker: Worker) => {
    setEditingWorker(worker);
    setIsEditWorkerModalOpen(true);
  }

  const handleAddProject = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('projectName') as string;
    const status = formData.get('projectStatus') as ProjectStatus;
    const tablesRaw = formData.get('projectTables') as string;
    
    const tables = tablesRaw.split(/[\n,]/).map(s => s.trim()).filter(Boolean);

    if (name && status) {
        const newProject: Omit<Project, 'id' | 'workerIds'> = { name, status, tables };
        addProject(newProject);
        (e.target as HTMLFormElement).reset();
    }
  };

  const handleAddWorker = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('workerName') as string;
    const rate = parseFloat(formData.get('workerRate') as string);
    const panelRate = parseFloat(formData.get('panelRate') as string);
    const cableRateSmall = parseFloat(formData.get('cableRateSmall') as string);
    const cableRateMedium = parseFloat(formData.get('cableRateMedium') as string);
    const cableRateLarge = parseFloat(formData.get('cableRateLarge') as string);

    if (name) {
      addWorker({
          name,
          rate: isNaN(rate) ? 0 : rate,
          panelRate: isNaN(panelRate) ? 0 : panelRate,
          cableRateSmall: isNaN(cableRateSmall) ? 0 : cableRateSmall,
          cableRateMedium: isNaN(cableRateMedium) ? 0 : cableRateMedium,
          cableRateLarge: isNaN(cableRateLarge) ? 0 : cableRateLarge,
      });
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
    
    let totalStrings = 0;
    const cableEntries = todaysEntries.filter(
        (e): e is CablesWorkEntry => e.type === 'task' && e.subType === 'cables'
    );

    cableEntries.forEach(entry => {
        switch (entry.tableSize) {
            case 'small':
                totalStrings += 1;
                break;
            case 'medium':
                totalStrings += 1.5;
                break;
            case 'large':
                totalStrings += 2;
                break;
        }
    });

    const summaryMessage = `Today we have made ${totalStrings} strings.`;
    
    let report = `${t('report_title')} ${today.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric'})}:\n\n`;

    todaysEntries.forEach(entry => {
        const workerNames = entry.workerIds.map(id => workers.find(w=>w.id === id)?.name || t('records_unknown_worker')).join(', ');
        const projectName = projects.find(p => p.id === entry.projectId)?.name || t('records_unknown_project');
        
        let detail = '';
        switch(entry.type) {
            case 'hourly':
                detail = `${t('records_entry_type_hourly')} - ${(entry as HourlyWorkEntry).description || ''}`;
                break;
            case 'task':
                switch(entry.subType) {
                    case 'paneling':
                        detail = `${t('records_entry_type_paneling')} - ${(entry as PanelingWorkEntry).moduleCount} ${t('records_modules_label')}`;
                        break;
                    case 'construction':
                        detail = `${t('records_entry_type_construction')} - ${entry.description}`;
                        break;
                    case 'cables':
                        detail = `${t('records_entry_type_cables')} - ${t('records_table_label')} ${entry.table}`;
                        break;
                }
                break;
        }
        report += `[${projectName}] ${workerNames}: ${detail} (${entry.duration.toFixed(2)}h)\n`;
    });

    const finalReport = `${summaryMessage}\n\n${report}`;
    
    navigator.clipboard.writeText(finalReport).then(() => {
        showToast(t("toast_report_copied"));
    }, () => {
        showToast(t("toast_report_copy_failed"));
    });
  };

  const handleExportData = () => {
    const dataToExport: { [key: string]: any } = {};
    const keysToExport = [ 'projects', 'workers', 'workEntries', 'attendanceRecords', 'locale', 'theme' ];
    
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
            mergeImportedData(data, setTheme, setLocale);
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
    <>
      <div className="h-full w-full p-4 overflow-y-auto space-y-6 scrolling-touch">
        <SettingsCard title={t('settings_theme_title')}>
          <div className="grid grid-cols-2 gap-4">
              {themes.map(item => (
                  <button
                      key={item.id}
                      onClick={() => setTheme(item.id)}
                      className={`p-2 rounded-xl border-2 transition-all duration-200 ease-in-out active:scale-95 ${theme === item.id ? 'border-[var(--accent-color)] shadow-lg' : 'border-transparent hover:border-white/20'}`}
                  >
                      <div className="w-full h-10 rounded-lg" style={{ background: `linear-gradient(to right, ${item.colors[0]}, ${item.colors[1]})` }}></div>
                      <p className="mt-2 text-center text-sm font-medium">{item.name}</p>
                  </button>
              ))}
          </div>
        </SettingsCard>

        <SettingsCard title={t('settings_language_title')}>
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
            className={formInputStyle}
          >
            <option value="cs">Čeština</option>
            <option value="en">English</option>
            <option value="lt">Lietuvių</option>
          </select>
        </SettingsCard>
        
        <SettingsCard title={t('settings_project_management_title')}>
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
              <textarea name="projectTables" placeholder='1, 2, 3.1, 4...' rows={4} className={formInputStyle}></textarea>
            </div>
            <button type="submit" className={primaryButtonStyle}>{t('settings_add_project_button')}</button>
          </form>
          <div className="space-y-2 max-h-48 overflow-y-auto">
              {projects.map(p => (
                  <div key={p.id} className="bg-white/5 p-3 rounded-lg flex justify-between items-center">
                      <div className="flex-1">
                          <span className="font-semibold text-base">{p.name}</span>
                          <span className="ml-2 text-xs bg-white/10 text-white/70 px-2 py-1 rounded-full capitalize">{p.status}</span>
                      </div>
                      <div className="flex items-center">
                          <button onClick={() => handleOpenTeamModal(p)} className="text-sm bg-white/10 hover:bg-white/20 text-white/80 font-semibold px-3 py-1 rounded-lg transition active:scale-95 mr-2">{t('settings_manage_team_button')}</button>
                          {p.id !== 'zarasai_predefined' && (
                              <button onClick={() => deleteProject(p.id)} className="text-white/40 hover:text-red-500 font-bold text-xl px-2 transition active:scale-90">&times;</button>
                          )}
                      </div>
                  </div>
              ))}
          </div>
        </SettingsCard>

        <SettingsCard title={t('settings_worker_management_title')}>
          <form onSubmit={handleAddWorker} className="space-y-4 mb-4">
            <input type="text" name="workerName" placeholder={t('settings_worker_name_placeholder')} required className={formInputStyle} />
            <input type="number" step="0.01" name="workerRate" placeholder={t('settings_worker_rate_placeholder')} className={formInputStyle} />
            <input type="number" step="0.01" name="panelRate" placeholder={t('settings_worker_panel_rate_placeholder')} className={formInputStyle} />
            <label className={formLabelStyle}>{t('settings_worker_cable_rates_label')}</label>
            <div className="grid grid-cols-3 gap-2">
                <input type="number" step="0.01" name="cableRateSmall" placeholder={t('work_table_size_small')} className={formInputStyle} />
                <input type="number" step="0.01" name="cableRateMedium" placeholder={t('work_table_size_medium')} className={formInputStyle} />
                <input type="number" step="0.01" name="cableRateLarge" placeholder={t('work_table_size_large')} className={formInputStyle} />
            </div>
            <button type="submit" className={primaryButtonStyle}>{t('settings_add_worker_button')}</button>
          </form>
          <div className="space-y-2 max-h-48 overflow-y-auto">
              {workers.map(w => (
                  <div key={w.id} className="bg-white/5 p-3 rounded-lg flex justify-between items-center">
                      <div>
                        <span className="font-semibold text-base">{w.name}</span>
                        <span className="text-xs text-white/50 ml-2">(€{w.rate}/hr)</span>
                      </div>
                      <div className="flex items-center">
                        <button onClick={() => handleOpenEditWorkerModal(w)} className="text-white/40 hover:text-[var(--accent-color)] p-2 transition duration-200 ease-in-out active:scale-95">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L14.732 3.732z" /></svg>
                        </button>
                        <button onClick={() => deleteWorker(w.id)} className="text-white/40 hover:text-red-500 p-2 ml-1 transition duration-200 ease-in-out active:scale-95">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                  </div>
              ))}
          </div>
        </SettingsCard>
        
        <SettingsCard title={t('settings_data_management_title')}>
          <div className="space-y-4">
              <button onClick={handleExportData} className="w-full bg-gradient-to-r from-sky-500 to-indigo-500 hover:opacity-90 text-white font-bold py-3 px-4 rounded-xl transition transform hover:scale-105 active:scale-95 shadow-lg">
                  {t('settings_export_data_button')}
              </button>
              <div>
                <input type="file" id="importFile" accept="application/json" className="hidden" onChange={handleImportData} />
                <label htmlFor="importFile" className="w-full block text-center bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-white font-bold py-3 px-4 rounded-xl transition transform hover:scale-105 active:scale-95 shadow-lg cursor-pointer">
                    {t('settings_import_data_button')}
                </label>
              </div>
          </div>
        </SettingsCard>

        <SettingsCard title={t('settings_actions_title')}>
          <button onClick={generateDailyReport} className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:opacity-90 text-white font-bold py-3 px-4 rounded-xl transition transform hover:scale-105 active:scale-95 shadow-lg">{t('settings_generate_report_button')}</button>
        </SettingsCard>
      </div>
      {projectToManage && (
          <ManageTeamModal 
            isOpen={isTeamModalOpen}
            onClose={() => setIsTeamModalOpen(false)}
            project={projectToManage}
          />
      )}
      {editingWorker && (
        <EditWorkerModal
          isOpen={isEditWorkerModalOpen}
          onClose={() => setIsEditWorkerModalOpen(false)}
          worker={editingWorker}
        />
      )}
    </>
  );
};

export default SettingsPage;