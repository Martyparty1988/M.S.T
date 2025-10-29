
import React from 'react';

const Loader: React.FC = () => {
  const SunIcon = (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      className="h-24 w-24 text-yellow-300 animate-spin-slow" 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor"
      style={{ animation: 'spin 3s linear infinite, pulse 2s infinite ease-in-out' }}
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={1.5} 
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" 
      />
       <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
      `}</style>
    </svg>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 backdrop-blur-sm">
      {/* FIX: 'SunIcon' is a JSX element, not a component. It should be rendered directly using curly braces. */}
      {SunIcon}
    </div>
  );
};

export default Loader;