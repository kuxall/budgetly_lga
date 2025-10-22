import React from 'react';

export const Alert = ({ 
  children, 
  variant = 'default', 
  className = '' 
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'destructive':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'default':
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  return (
    <div className={`
      rounded-lg border p-4 ${getVariantClasses()} ${className}
    `}>
      {children}
    </div>
  );
};

export const AlertDescription = ({ children, className = '' }) => {
  return (
    <div className={`text-sm ${className}`}>
      {children}
    </div>
  );
};