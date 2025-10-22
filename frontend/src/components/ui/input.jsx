import React from 'react';

export const Input = ({ 
  type = 'text', 
  placeholder = '', 
  value = '', 
  onChange = () => {}, 
  onKeyPress = () => {},
  className = '',
  disabled = false,
  ...props 
}) => {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onKeyPress={onKeyPress}
      disabled={disabled}
      className={`
        w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
        placeholder-gray-400 focus:outline-none focus:ring-blue-500 
        focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500
        ${className}
      `}
      {...props}
    />
  );
};