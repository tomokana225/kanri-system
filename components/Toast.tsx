import React, { useState, useEffect } from 'react';
import { CloseIcon, BellIcon } from './icons';

interface ToastProps {
  message: string;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      // Start exit animation, then call onClose after it finishes
      setIsExiting(true);
      setTimeout(onClose, 300); 
    }, 5000); // Auto-dismiss after 5 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300); // Wait for fade-out animation
  };

  return (
    <div
      className={`fixed bottom-5 right-5 z-50 w-full max-w-sm p-4 bg-white rounded-lg shadow-lg flex items-start ${isExiting ? 'toast-exit' : 'toast-enter'}`}
      role="alert"
    >
      <div className="flex-shrink-0 text-blue-500">
        <BellIcon className="w-6 h-6" />
      </div>
      <div className="ml-3 flex-1">
        <p className="text-sm font-medium text-gray-900">新しい通知</p>
        <p className="mt-1 text-sm text-gray-600">{message}</p>
      </div>
      <div className="ml-4 flex-shrink-0">
        <button
          onClick={handleClose}
          className="inline-flex rounded-md bg-white p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <span className="sr-only">閉じる</span>
          <CloseIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default Toast;
