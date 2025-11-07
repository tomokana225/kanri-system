import React from 'react';
import Modal from './Modal';
import { Booking } from '../types';

interface BookingDetailModalProps {
    booking: Booking | null;
    onClose: () => void;
}

const BookingDetailModal: React.FC<BookingDetailModalProps> = ({ booking, onClose }) => {
  if (!booking) return null;

  return (
    <Modal title="予約詳細" onClose={onClose}>
      <div className="space-y-2">
        <p><strong>コース:</strong> {booking.courseTitle}</p>
        <p><strong>生徒:</strong> {booking.studentName}</p>
        <p><strong>日時:</strong> {booking.startTime.toDate().toLocaleString('ja-JP')}</p>
        <p><strong>ステータス:</strong> {booking.status}</p>
      </div>
    </Modal>
  );
};

export default BookingDetailModal;
