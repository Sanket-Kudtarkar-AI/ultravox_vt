// In components/ui/Modal.jsx
import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  actions,
  size = 'md',
  closeOnEsc = true,
  closeOnOutsideClick = true
}) => {
  // Handle escape key press
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && closeOnEsc) onClose();
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }

    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose, closeOnEsc]);

  if (!isOpen) return null;

  // Define size classes
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-full mx-4'
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center animate-fade-in"
      onClick={closeOnOutsideClick ? onClose : undefined}
    >
      <div
        className={`bg-gradient-to-b from-dark-800 to-dark-900 rounded-xl shadow-xl w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col border border-dark-700 animate-slide-in-up`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {title && (
          <div className="flex justify-between items-center border-b border-dark-700 p-4">
            <h2 className="text-xl font-semibold text-white">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-dark-700 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>

        {/* Footer with actions */}
        {actions && (
          <div className="border-t border-dark-700 p-4 flex justify-end space-x-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;