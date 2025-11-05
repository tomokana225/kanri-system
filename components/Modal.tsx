import React from 'react';

interface ModalProps {
  title: string;
  onClose: () => void;
  onConfirm: () => void;
  confirmText?: string;
  children: React.ReactNode;
  isConfirmDisabled?: boolean;
}

const Modal: React.FC<ModalProps> = ({ title, onClose, onConfirm, confirmText = '確定', children, isConfirmDisabled = false }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="relative w-full max-w-lg p-6 mx-4 bg-white rounded-xl shadow-xl transform transition-all">
        <div className="flex items-start justify-between">
          <h3 className="text-xl font-semibold leading-6 text-gray-900" id="modal-title">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <span className="sr-only">閉じる</span>
            <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="mt-4">
          {children}
        </div>
        <div className="flex justify-end gap-3 mt-8">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirmDisabled}
            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md shadow-sm bg-brand-primary hover:bg-brand-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-dark disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
