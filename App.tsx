import React, { useState, useRef, useEffect } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { I18nProvider, useI18n } from './context/I18nContext';
import { ThemeProvider } from './context/ThemeContext';
import PlanPage from './pages/PlanPage';
import AttendancePage from './pages/AttendancePage';
import RecordsPage from './pages/RecordsPage';
import PayrollPage from './pages/PayrollPage';
import StatsPage from './pages/StatsPage';
import SettingsPage from './pages/SettingsPage';
import BottomNav from './components/BottomNav';
import Loader from './components/Loader';
import Toast from './components/Toast';
import { Page } from './types';

const pageOrder: Page[] = ['plan', 'attendance', 'records', 'payroll', 'stats', 'settings'];

const AppContent: React.FC = () => {
  const { page, loading, toast } = useAppContext();
  const { t } = useI18n();
  const [animationClass, setAnimationClass] = useState('');
  const prevPageIndexRef = useRef(pageOrder.indexOf(page));

  useEffect(() => {
    const currentPageIndex = pageOrder.indexOf(page);
    const prevPageIndex = prevPageIndexRef.current;

    if (currentPageIndex !== prevPageIndex) {
      if (currentPageIndex > prevPageIndex) {
        setAnimationClass('slide-in-right');
      } else {
        setAnimationClass('slide-in-left');
      }
    }
    prevPageIndexRef.current = currentPageIndex;
  }, [page]);


  const renderPage = () => {
    switch (page) {
      case 'plan':
        return <PlanPage />;
      case 'attendance':
        return <AttendancePage />;
      case 'records':
        return <RecordsPage />;
      case 'payroll':
        return <PayrollPage />;
      case 'stats':
        return <StatsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <PlanPage />;
    }
  };

  return (
    <div className="h-full w-full flex flex-col antialiased font-sans text-white">
      <header 
        className="text-center z-10 p-5 floating-card mx-4 mt-4"
        style={{ paddingTop: `calc(20px + var(--safe-area-inset-top))`, borderRadius: 'var(--card-border-radius)' }}
      >
        <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)]">
          {t('app_title')}
        </h1>
      </header>

      <main className="flex-grow relative overflow-hidden">
        <div className={`absolute inset-0 ${animationClass}`}>
          {renderPage()}
        </div>
      </main>
      
      <BottomNav />
      {loading && <Loader />}
      {toast && <Toast message={toast} />}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <I18nProvider>
      <ThemeProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </ThemeProvider>
    </I18nProvider>
  );
};

export default App;