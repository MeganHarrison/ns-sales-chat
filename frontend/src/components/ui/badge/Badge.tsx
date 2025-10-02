'use client';

import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'light' | 'solid';
  color?: 'primary' | 'success' | 'error' | 'warning' | 'info' | 'light' | 'dark';
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'light',
  color = 'primary',
  startIcon,
  endIcon,
  className = '',
}) => {
  const getColorClasses = () => {
    const baseClasses = 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium';

    if (variant === 'solid') {
      switch (color) {
        case 'primary':
          return `${baseClasses} bg-blue-600 text-white`;
        case 'success':
          return `${baseClasses} bg-green-600 text-white`;
        case 'error':
          return `${baseClasses} bg-red-600 text-white`;
        case 'warning':
          return `${baseClasses} bg-yellow-600 text-white`;
        case 'info':
          return `${baseClasses} bg-cyan-600 text-white`;
        case 'light':
          return `${baseClasses} bg-gray-200 text-gray-800`;
        case 'dark':
          return `${baseClasses} bg-gray-800 text-white`;
        default:
          return `${baseClasses} bg-blue-600 text-white`;
      }
    } else {
      switch (color) {
        case 'primary':
          return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`;
        case 'success':
          return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`;
        case 'error':
          return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`;
        case 'warning':
          return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`;
        case 'info':
          return `${baseClasses} bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200`;
        case 'light':
          return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200`;
        case 'dark':
          return `${baseClasses} bg-gray-800 text-gray-100 dark:bg-gray-600 dark:text-gray-100`;
        default:
          return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`;
      }
    }
  };

  return (
    <span className={`${getColorClasses()} ${className}`}>
      {startIcon && <span className="w-3 h-3">{startIcon}</span>}
      {children}
      {endIcon && <span className="w-3 h-3">{endIcon}</span>}
    </span>
  );
};

export default Badge;