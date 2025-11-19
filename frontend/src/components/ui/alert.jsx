import React from 'react';

export const Alert = ({
  children,
  variant = 'default',
  className = ''
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'destructive':
        return 'bg-danger-50 border-danger-200 text-danger-800';
      case 'warning':
        return 'bg-warning-50 border-warning-200 text-warning-800';
      case 'default':
      default:
        return 'bg-primary-50 border-primary-200 text-primary-800';
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