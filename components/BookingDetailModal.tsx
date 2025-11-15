import React from 'react';
import Modal from './Modal';
import { Booking } from '../types';

// Fix: Add userMap to props to resolve type error from AdminPortal
interface BookingDetailModalProps {
    booking: Booking | null;
    onClose: () => void;
    userMap: Map<string, string>;
}

const BookingDetailModal: React.FC<BookingDetailModalProps> = ({ booking, onClose, userMap }) => {
  if (!booking) return null;

  return (
    <Modal title="予約詳細" onClose={onClose}>
      <div className="space-y-2">
        <p><strong>コース:</strong> {booking.courseTitle}</p>
        <p><strong>生徒:</strong> {booking.studentName || userMap.get(booking.studentId) || '不明'}</p>
        {/* Fix: Display teacher name using the passed userMap */}
        <p><strong>教師:</strong> {userMap.get(booking.teacherId) || '不明'}</p>
        <p><strong>日時:</strong> {booking.startTime.toDate().toLocaleString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' })}</p>
        <p><strong>ステータス:</strong> {booking.status}</p>
      </div>
    </Modal>
  );
};

export default BookingDetailModal;