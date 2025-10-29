import React from 'react';
import { useAppContext } from '../context/AppContext';
import { useI18n } from '../context/I18nContext';
import { Page } from '../types';

const NavItem: React.FC<{ page: Page; label: string; icon: React.ReactNode }> = ({ page, label, icon }) => {
  const { page: currentPage, setPage } = useAppContext();
  const isActive = currentPage === page;

  return (
    <button
      onClick={() => setPage(page)}
      className={`relative flex flex-col items-center justify-center w-full pt-2 transition-colors duration-300 ${isActive ? 'text-brand-electric' : 'text-brand-silver hover:text-brand-ghost'}`}
      style={{ paddingBottom: `calc(0.25rem + var(--safe-area-inset-bottom))`}}
    >
      {isActive && <div className="absolute top-0 h-1 w-8 bg-brand-electric rounded-full glow-effect"></div>}
      {icon}
      <span className="text-xs mt-1 font-medium tracking-wide">{label}</span>
      <style>{`.glow-effect { filter: drop-shadow(0 0 5px theme('colors.brand-electric')); }`}</style>
    </button>
  );
};

const BottomNav: React.FC = () => {
  const { t } = useI18n();

  const PlanIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 16.382V5.618a1 1 0 00-1.447-.894L15 7m-6 10V7m0 0l6-3m-6 3L3 4m6 3l6-3m0 0l6 3" />
    </svg>
  );
  const RecordsIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  );
  const StatsIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
  const SettingsIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );

  return (
    <nav className="w-full flex justify-around items-center glassmorphism z-10 border-t border-white/10">
      <NavItem page="plan" label={t('nav_plan')} icon={PlanIcon} />
      <NavItem page="records" label={t('nav_records')} icon={RecordsIcon} />
      <NavItem page="stats" label={t('nav_stats')} icon={StatsIcon} />
      <NavItem page="settings" label={t('nav_settings')} icon={SettingsIcon} />
    </nav>
  );
};

export default BottomNav;
