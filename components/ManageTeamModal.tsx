import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useI18n } from '../context/I18nContext';
import { Project, Worker } from '../types';
import Modal from './Modal';

interface ManageTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
}

const ManageTeamModal: React.FC<ManageTeamModalProps> = ({ isOpen, onClose, project }) => {
  const { workers, updateProjectWorkers, addWorker } = useAppContext();
  const { t } = useI18n();

  const [selectedWorkerIds, setSelectedWorkerIds] = useState<Set<string>>(new Set());
  const [showAddWorkerForm, setShowAddWorkerForm] = useState(false);
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerRate, setNewWorkerRate] = useState('');

  useEffect(() => {
    if (project) {
      setSelectedWorkerIds(new Set(project.workerIds));
    }
    // Reset add worker form when modal opens for a new project or closes
    if (!isOpen) {
        setShowAddWorkerForm(false);
        setNewWorkerName('');
        setNewWorkerRate('');
    }
  }, [project, isOpen]);

  const handleToggleWorker = (workerId: string) => {
    setSelectedWorkerIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(workerId)) {
        newSet.delete(workerId);
      } else {
        newSet.add(workerId);
      }
      return newSet;
    });
  };
  
  const handleSave = () => {
    updateProjectWorkers(project.id, Array.from(selectedWorkerIds));
    onClose();
  };

  const handleAddNewWorker = (e: React.FormEvent) => {
    e.preventDefault();
    const rate = parseFloat(newWorkerRate);
    if (newWorkerName) {
      const newWorker = addWorker({ name: newWorkerName, rate: isNaN(rate) ? 0 : rate });
      // Auto-select the new worker
      setSelectedWorkerIds(prev => {
        const newSet = new Set(prev);
        newSet.add(newWorker.id);
        return newSet;
      });
      // Reset form
      setNewWorkerName('');
      setNewWorkerRate('');
      setShowAddWorkerForm(false);
    }
  };
  
  const formInputStyle = "w-full bg-white/10 text-white p-3 rounded-xl border border-white/20 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)] transition text-base font-normal";
  const primaryButtonStyle = "w-full bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] hover:opacity-90 text-white font-bold py-3 px-4 rounded-xl transition duration-200 ease-in-out transform hover:scale-105 active:scale-95 shadow-lg";
  const secondaryButtonStyle = "w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-4 rounded-xl transition duration-200 ease-in-out active:scale-95";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${t('manage_team_modal_title')} ${project?.name}`}>
        <div className="flex flex-col gap-4">
            {!showAddWorkerForm ? (
                <>
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                        {workers.map(worker => (
                            <div 
                                key={worker.id} 
                                className={`p-3 rounded-lg flex items-center justify-between cursor-pointer transition-colors duration-200 ${selectedWorkerIds.has(worker.id) ? 'bg-[var(--accent-color)]/20' : 'bg-white/5 hover:bg-white/10'}`}
                                onClick={() => handleToggleWorker(worker.id)}
                            >
                                <span className="font-medium text-white">{worker.name}</span>
                                <div className={`w-5 h-5 border-2 rounded-md flex items-center justify-center transition-all ${selectedWorkerIds.has(worker.id) ? 'bg-[var(--accent-color)] border-[var(--accent-color)]' : 'border-white/30'}`}>
                                    {selectedWorkerIds.has(worker.id) && (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                     <div className="space-y-3 pt-2">
                        <button 
                            onClick={() => setShowAddWorkerForm(true)}
                            className={secondaryButtonStyle}
                        >
                            {t('settings_add_worker_button')}
                        </button>
                        <button 
                            onClick={handleSave} 
                            className={primaryButtonStyle}
                        >
                            {t('edit_modal_save_button')}
                        </button>
                    </div>
                </>
            ) : (
                <form onSubmit={handleAddNewWorker} className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">{t('settings_add_worker_button')}</h3>
                    <input 
                        type="text" 
                        value={newWorkerName}
                        onChange={e => setNewWorkerName(e.target.value)}
                        placeholder={t('settings_worker_name_placeholder')} 
                        required 
                        className={formInputStyle}
                        autoFocus
                    />
                    <input 
                        type="number" 
                        step="0.01" 
                        value={newWorkerRate}
                        onChange={e => setNewWorkerRate(e.target.value)}
                        placeholder={t('settings_worker_rate_placeholder')} 
                        className={formInputStyle} 
                    />
                    <div className="flex gap-4 pt-2">
                        <button type="button" onClick={() => setShowAddWorkerForm(false)} className={secondaryButtonStyle}>
                            {t('cancel_button')}
                        </button>
                        <button type="submit" className={primaryButtonStyle}>
                            {t('settings_add_worker_button')}
                        </button>
                    </div>
                </form>
            )}
        </div>
    </Modal>
  );
};

export default ManageTeamModal;