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
  const { workers, updateProjectWorkers } = useAppContext();
  const { t } = useI18n();

  const [selectedWorkerIds, setSelectedWorkerIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (project) {
      setSelectedWorkerIds(new Set(project.workerIds));
    }
  }, [project]);

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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${t('manage_team_modal_title')} ${project?.name}`}>
        <div className="flex flex-col gap-4">
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
            <button 
                onClick={handleSave} 
                className="w-full bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] hover:opacity-90 text-white font-bold py-3 px-4 rounded-xl transition duration-200 ease-in-out transform hover:scale-105 active:scale-95 shadow-lg"
            >
                {t('edit_modal_save_button')}
            </button>
        </div>
    </Modal>
  );
};

export default ManageTeamModal;