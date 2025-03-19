import React from 'react';

const Input = ({
  label,
  id,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  error,
  helperText,
  className = '',
  icon,
  disabled = false
}) => {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1">
          {label}{required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {icon}
          </div>
        )}
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`
            w-full px-4 py-2 
            border ${error ? 'border-red-500' : 'border-dark-600'} 
            rounded-lg 
            focus:ring-primary-500 focus:border-primary-500 
            bg-dark-700/70 
            text-white
            backdrop-blur-sm
            transition-all duration-200
            ${icon ? 'pl-10' : ''}
            ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:border-dark-500'}
            ${className}
          `}
        />
      </div>
      {helperText && (
        <p className="mt-1 text-xs text-gray-400">{helperText}</p>
      )}
      {error && (
        <p className="mt-1 text-xs text-red-400">{error}</p>
      )}
    </div>
  );
};

export default Input;