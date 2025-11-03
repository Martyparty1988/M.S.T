import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useI18n } from '../context/I18nContext';
import { Worker } from '../types';
import Modal from './Modal';

interface EditWorkerModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker: Worker;
}

const EditWorkerModal: React.FC<EditWorkerModalProps> = ({ isOpen, onClose, worker }) => {
    const { updateWorker } = useAppContext();
    const { t } = useI18n();

    const [formData, setFormData] = useState<Worker>(worker);

    useEffect(() => {
        setFormData(worker);
    }, [worker]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        
        const workerToUpdate: Worker = {
            ...formData,
            rate: parseFloat(String(formData.rate)) || 0,
            panelRate: parseFloat(String(formData.panelRate)) || 0,
            cableRateSmall: parseFloat(String(formData.cableRateSmall)) || 0,
            cableRateMedium: parseFloat(String(formData.cableRateMedium)) || 0,
            cableRateLarge: parseFloat(String(formData.cableRateLarge)) || 0,
        };

        updateWorker(workerToUpdate);
        onClose();
    };

    const formInputStyle = "w-full bg-white/10 text-white p-3 rounded-xl border border-white/20 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)] transition text-base font-normal";
    const formLabelStyle = "block mb-2 text-sm font-medium text-white/70";
    const primaryButtonStyle = "w-full bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] hover:opacity-90 text-white font-bold py-3 px-4 rounded-xl transition duration-200 ease-in-out transform hover:scale-105 active:scale-95 shadow-lg";

    if (!worker) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('edit_worker_modal_title')}>
            <form onSubmit={handleSave} className="space-y-4">
                <div>
                    <label className={formLabelStyle}>{t('settings_worker_name_placeholder')}</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} required className={formInputStyle} />
                </div>
                <div>
                    <label className={formLabelStyle}>{t('settings_worker_rate_placeholder')}</label>
                    <input type="number" step="0.01" name="rate" value={formData.rate || ''} onChange={handleChange} className={formInputStyle} />
                </div>
                 <div>
                    <label className={formLabelStyle}>{t('settings_worker_panel_rate_placeholder')}</label>
                    <input type="number" step="0.01" name="panelRate" value={formData.panelRate || ''} onChange={handleChange} className={formInputStyle} />
                </div>
                <div>
                    <label className={formLabelStyle}>{t('settings_worker_cable_rates_label')}</label>
                    <div className="grid grid-cols-3 gap-2">
                        <input type="number" step="0.01" name="cableRateSmall" value={formData.cableRateSmall || ''} onChange={handleChange} placeholder={t('work_table_size_small')} className={formInputStyle} />
                        <input type="number" step="0.01" name="cableRateMedium" value={formData.cableRateMedium || ''} onChange={handleChange} placeholder={t('work_table_size_medium')} className={formInputStyle} />
                        <input type="number" step="0.01" name="cableRateLarge" value={formData.cableRateLarge || ''} onChange={handleChange} placeholder={t('work_table_size_large')} className={formInputStyle} />
                    </div>
                </div>
                <div className="pt-2">
                    <button type="submit" className={primaryButtonStyle}>
                        {t('edit_modal_save_button')}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default EditWorkerModal;
