// In components/ui/PageLayout.jsx
import React from 'react';
import { ChevronLeft } from 'lucide-react';

const PageLayout = ({
  title,
  subtitle,
  onBack,
  actions,
  children,
  fullWidth = false,
  className = ''
}) => {
  return (
    <div className={`p-6 text-gray-300 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 -ml-2 mr-2 text-gray-400 hover:text-white hover:bg-dark-700/50 rounded-full transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <div>
            <h1 className="text-3xl font-bold text-white">{title}</h1>
            {subtitle && <p className="text-gray-400 mt-1">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center space-x-3">{actions}</div>}
      </div>

      {/* Content */}
      <div className={fullWidth ? 'w-full' : 'max-w-6xl'}>
        {children}
      </div>
    </div>
  );
};

export default PageLayout;