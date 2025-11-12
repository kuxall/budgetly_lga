import React from 'react';

export const Badge = ({
  children,
  variant = 'default',
  className = ''
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'destructive':
        return 'bg-danger-100 text-danger-800 border-danger-200';
      case 'warning':
        return 'bg-warning-100 text-warning-800 border-warning-200';
      case 'success':
        return 'bg-success-100 text-success-800 border-success-200';
      case 'secondary':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'outline':
        return 'bg-white text-gray-700 border-gray-300';
      case 'default':
      default:
        return 'bg-primary-100 text-primary-800 border-primary-200';
    }
  };

  return (
    <span className={`
      inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
      border ${getVariantClasses()} ${className}
    `}>
      {children}
    </span>
  );
};