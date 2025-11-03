import React from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { I18nProvider, useI18n } from './context/I18nContext';
import { ThemeProvider } from './context/ThemeContext';
import PlanPage from './pages/PlanPage';
import RecordsPage from './pages/RecordsPage';
import StatsPage from './pages/StatsPage';
import SettingsPage from './pages/SettingsPage';
import BottomNav from './components/BottomNav';
import Loader from './components/Loader';
import Toast from './components/Toast';

const AppContent: React.FC = () => {
  const { page, loading, toast } = useAppContext();
  const { t } = useI18n();

  const renderPage = () => {
    switch (page) {
      case 'plan':
        return <PlanPage />;
      case 'records':
        return <RecordsPage />;
      case 'stats':
        return <StatsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <PlanPage />;
    }
  };

  return (
    <div className="h-full w-full flex flex-col antialiased font-sans text-gray-100">
      <header 
        className="text-center z-10 p-3 floating-card mx-4 mt-4"
        style={{ paddingTop: `calc(0.75rem + var(--safe-area-inset-top))` }}
      >
        <h1 className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)]">
          {t('app_title')}
        </h1>
      </header>

      <main className="flex-grow overflow-hidden relative">
        {renderPage()}
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