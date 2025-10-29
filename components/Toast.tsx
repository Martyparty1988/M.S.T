
import React, { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
}

const Toast: React.FC<ToastProps> = ({ message }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 2800);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div
      className={`fixed left-1/2 -translate-x-1/2 px-6 py-3 rounded-full text-white shadow-lg transition-all duration-300 z-50 glassmorphism ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
      style={{ bottom: `calc(6rem + var(--safe-area-inset-bottom))` }}
    >
      {message}
    </div>
  );
};

export default Toast;
