// In components/ui/Card.jsx
import React from 'react';

const Card = ({ children, className = '', gradient = false }) => {
  return (
    <div
      className={`
        bg-dark-800 rounded-xl border border-dark-700
        ${gradient ? 'bg-gradient-to-br from-dark-800 to-dark-900' : ''}
        shadow-lg shadow-dark-950/50
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default Card;