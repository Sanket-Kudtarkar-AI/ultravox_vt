import React from 'react';

/**
 * Badge - Component for displaying status, counts, or labels
 *
 * @param {Object} props - Component props
 * @param {ReactNode} props.children - Badge text or content
 * @param {string} props.variant - Badge style variant (success, warning, error, info, default)
 * @param {boolean} props.pill - Whether the badge has fully rounded corners
 * @param {boolean} props.glow - Whether the badge has a subtle glow effect
 * @param {boolean} props.dot - Whether to show a dot indicator instead of content
 * @param {string} props.className - Additional CSS classes
 */
const Badge = ({
  children,
  variant = 'default',
  pill = false,
  glow = false,
  dot = false,
  className = '',
  ...props
}) => {
  // Define style variants
  const variants = {
    default: 'bg-slate-700 text-slate-200',
    success: 'bg-emerald-900/30 text-emerald-400 border border-emerald-700/50',
    warning: 'bg-amber-900/30 text-amber-400 border border-amber-700/50',
    error: 'bg-red-900/30 text-red-400 border border-red-700/50',
    info: 'bg-blue-900/30 text-blue-400 border border-blue-700/50',
    purple: 'bg-purple-900/30 text-purple-400 border border-purple-700/50',
  };

  // Define dot colors
  const dotColors = {
    default: 'bg-slate-400',
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    error: 'bg-red-400',
    info: 'bg-blue-400',
    purple: 'bg-purple-400',
  };

  // If dot is true, render just a colored dot
  if (dot) {
    return (
      <span className="relative inline-flex">
        <span className={`
          flex h-3 w-3 rounded-full ${dotColors[variant]}
          ${glow ? `animate-pulse shadow-lg shadow-${variant}-500/50` : ''}
        `}/>
      </span>
    );
  }

  return (
    <span
      className={`
        inline-flex items-center justify-center
        px-2.5 py-0.5
        text-xs font-medium
        ${pill ? 'rounded-full' : 'rounded'}
        ${variants[variant]}
        ${glow ? 'shadow-lg' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </span>
  );
};

export default Badge;