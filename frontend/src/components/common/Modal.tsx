import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'lg',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-surface-950/70 backdrop-blur-md transition-opacity animate-fadeIn"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="flex min-h-full items-center justify-center p-4 text-center">
        <div
          className={`relative w-full ${widthClasses[maxWidth]} transform overflow-hidden rounded-3xl bg-white/95 backdrop-blur-xl p-6 sm:p-7 text-left shadow-luxury transition-all border border-surface-200/80 animate-scaleUp`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-surface-100">
            <div>
              {title && <h3 className="text-base sm:text-lg font-black text-surface-900 tracking-tight">{title}</h3>}
              {subtitle && <p className="text-xs text-surface-500 mt-0.5 font-medium">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-surface-400 hover:bg-surface-100 hover:text-surface-700 transition-colors border border-transparent hover:border-surface-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="mt-4">{children}</div>
        </div>
      </div>
    </div>
  );
};
