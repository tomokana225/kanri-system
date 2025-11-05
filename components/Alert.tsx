import React, { useState, useEffect } from 'react';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon } from './icons';

interface AlertProps {
  type: 'success' | 'error' | 'info';
  message: string;
  onClose: () => void;
}

const Alert: React.FC<AlertProps> = ({ type, message, onClose }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
        handleClose();
    }, 5000); // Auto-dismiss after 5 seconds

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300); // allow for fade out animation
  }

  const alertStyles = {
    success: {
      bg: 'bg-green-100',
      border: 'border-green-400',
      text: 'text-green-800',
      icon: <CheckCircleIcon className="w-5 h-5" />,
    },
    error: {
      bg: 'bg-red-100',
      border: 'border-red-400',
      text: 'text-red-800',
      icon: <XCircleIcon className="w-5 h-5" />,
    },
    info: {
      bg: 'bg-blue-100',
      border: 'border-blue-400',
      text: 'text-blue-800',
      icon: <InformationCircleIcon className="w-5 h-5" />,
    },
  };

  const styles = alertStyles[type];

  return (
    <div className={`fixed top-20 right-5 z-50 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
        <div className={`${styles.bg} border-l-4 ${styles.border} ${styles.text} p-4 rounded-md shadow-lg flex items-start`} role="alert">
            <div className="flex items-center">
                {styles.icon}
                <p className="ml-3 text-sm font-medium">{message}</p>
            </div>
            <button onClick={handleClose} className="ml-4 -mt-1 -mr-1 p-1 rounded-md hover:bg-opacity-50 focus:outline-none">
                <span className="sr-only">閉じる</span>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
            </button>
        </div>
    </div>
  );
};

export default Alert;
