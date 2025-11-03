import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeOnOverlayClick?: boolean;
  maxWidthClass?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, closeOnOverlayClick = true, maxWidthClass = 'max-w-lg' }) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
        document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-40 backdrop-blur-sm" 
      onClick={closeOnOverlayClick ? onClose : undefined}
    >
      <div
        className={`floating-card w-11/12 text-white ${maxWidthClass} flex flex-col max-h-[90vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 p-5 flex justify-between items-center border-b border-white/10">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-white/70 hover:text-white text-3xl font-light active:scale-95 transition-transform">&times;</button>
        </div>
        <div className="flex-grow overflow-y-auto p-5">{children}</div>
        {footer && (
            <div
                className="flex-shrink-0 px-5 pt-4"
                style={{ paddingBottom: `calc(1.25rem + var(--safe-area-inset-bottom))` }}
            >
                {footer}
            </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
