import React from 'react';
import { useAppContext } from '../context/AppContext';
import { useI18n } from '../context/I18nContext';
import { Page } from '../types';

interface NavItemProps {
  page: Page;
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ page, label, icon, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`flex-1 relative flex flex-col items-center justify-center h-full z-10 transition-colors duration-200 ease-in-out active:scale-95 ${isActive ? 'text-white' : 'text-white/70 hover:text-white'}`}
    >
      {icon}
      <span className={`mt-1 font-medium tracking-wide transition-opacity duration-300`} style={{ fontSize: '11px' }}>{label}</span>
    </button>
  );
};

const BottomNav: React.FC = () => {
  const { t } = useI18n();
  const { page: currentPage, setPage } = useAppContext();
  const pages: Page[] = ['plan', 'attendance', 'records', 'payroll', 'stats', 'settings'];
  const activeIndex = pages.indexOf(currentPage);
  
  const navItems = [
    { page: 'plan' as Page, label: t('nav_plan'), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
    { page: 'attendance' as Page, label: t('nav_attendance'), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m8-10a4 4 0 100-8 4 4 0 000 8zM17 8a4 4 0 100-8 4 4 0 000 8z" /></svg> },
    { page: 'records' as Page, label: t('nav_records'), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg> },
    { page: 'payroll' as Page, label: t('nav_payroll'), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
    { page: 'stats' as Page, label: t('nav_stats'), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg> },
    { page: 'settings' as Page, label: t('nav_settings'), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
  ];

  return (
    <nav 
      className="floating-card mx-4 mb-4"
      style={{ paddingBottom: `var(--safe-area-inset-bottom)`}}
    >
      <div className="relative w-full flex items-stretch h-[72px]">
        <div 
            className="absolute top-0 left-0 bottom-0 p-2 transition-transform duration-300 ease-in-out"
            style={{ 
              width: `${100 / pages.length}%`, 
              transform: `translateX(${activeIndex * 100}%)`
            }}
        >
          <div className="w-full h-full bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] rounded-full"></div>
        </div>
        {navItems.map(item => (
          <NavItem
            key={item.page}
            {...item}
            isActive={currentPage === item.page}
            onClick={() => setPage(item.page)}
          />
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;