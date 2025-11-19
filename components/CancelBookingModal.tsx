import React, { useState } from 'react';
import Modal from './Modal';
import { Booking } from '../types';

interface CancelBookingModalProps {
  booking: Booking;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

const CancelBookingModal: React.FC<CancelBookingModalProps> = ({ booking, onClose, onConfirm }) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(reason);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="予約キャンセル" onClose={onClose}>
      <div className="space-y-4">
        <div className="p-4 bg-red-50 rounded-md text-red-800 border border-red-100">
          <p className="font-bold">この予約をキャンセルしますか？</p>
          <div className="text-sm mt-2 space-y-1 text-red-700">
            <p>コース: {booking.courseTitle}</p>
            <p>生徒: {booking.studentName}</p>
            <p>日時: {booking.startTime.toDate().toLocaleString('ja-JP')}</p>
          </div>
        </div>
        
        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
            キャンセル理由 (任意)
          </label>
          <textarea
            id="reason"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
            placeholder="体調不良のため、等。生徒に通知されます。"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <div className="flex justify-end space-x-2 pt-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            閉じる
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? '処理中...' : 'キャンセル実行'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CancelBookingModal;