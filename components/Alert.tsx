import React from 'react';

interface AlertProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

const Alert: React.FC<AlertProps> = ({ message, type }) => {
  const baseClasses = 'p-4 mb-4 text-sm rounded-lg';
  const typeClasses = {
    success: 'bg-green-100 text-green-800',
    error: 'bg-red-100 text-red-800',
    warning: 'bg-yellow-100 text-yellow-800',
    info: 'bg-blue-100 text-blue-800',
  };

  return (
    <div className={`${baseClasses} ${typeClasses[type]}`} role="alert">
      <span className="font-medium">{type.charAt(0).toUpperCase() + type.slice(1)}:</span> {message}
    </div>
  );
};

export default Alert;
