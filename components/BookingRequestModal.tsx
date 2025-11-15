import React from 'react';
import { BookingRequest } from '../types';
import Modal from './Modal';

interface BookingRequestModalProps {
  request: BookingRequest;
  onClose: () => void;
  onAction: (bookingId: string, action: 'confirm' | 'decline') => void;
}

const BookingRequestModal: React.FC<BookingRequestModalProps> = ({ request, onClose, onAction }) => {
  return (
    <Modal title="予約リクエストの確認" onClose={onClose}>
      <div className="space-y-4">
        <p><strong>コース:</strong> {request.courseTitle}</p>
        <p><strong>生徒:</strong> {request.studentName}</p>
        <p><strong>希望日時:</strong> {request.startTime.toDate().toLocaleString('ja-JP')}</p>
        <div className="flex justify-end space-x-2 pt-4">
          <button
            onClick={() => onAction(request.id, 'decline')}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
          >
            拒否する
          </button>
          <button
            onClick={() => onAction(request.id, 'confirm')}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
          >
            承認する
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default BookingRequestModal;