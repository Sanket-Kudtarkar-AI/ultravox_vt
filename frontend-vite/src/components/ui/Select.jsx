import React from 'react';
import { ChevronDown } from 'lucide-react';

const Select = ({
  label,
  id,
  name,
  value,
  onChange,
  options = [],
  required = false,
  error,
  helperText,
  className = '',
  placeholder = 'Select an option',
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
        <select
          id={id}
          name={name}
          value={value}
          onChange={onChange}
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
            appearance-none
            transition-all duration-200
            ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:border-dark-500'}
            ${className}
          `}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              className="bg-dark-700"
            >
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <ChevronDown size={18} className="text-gray-400" />
        </div>
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

export default Select;