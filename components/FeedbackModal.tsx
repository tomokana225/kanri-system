import React, { useState } from 'react';
import { Booking } from '../types';
import Modal from './Modal';
import { submitFeedback } from '../services/firebase';
import Alert from './Alert';

interface FeedbackModalProps {
  booking: Booking;
  userRole: 'student' | 'teacher';
  onClose: () => void;
  onFeedbackSubmit: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ booking, userRole, onClose, onFeedbackSubmit }) => {
  const [rating, setRating] = useState(booking.feedback?.rating || 0);
  const [comment, setComment] = useState(booking.feedback?.comment || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isViewOnly = userRole === 'student';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewOnly) return;
    
    // Fix: Add validation to ensure a rating is selected before submitting.
    if (rating === 0) {
      setError('評価を星で選択してください（1〜5）。');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await submitFeedback(booking.id, { rating, comment });
      onFeedbackSubmit();
      onClose();
    } catch (err: any) {
      // Fix: Improve error message to be more informative.
      const code = err.code ? ` (コード: ${err.code})` : '';
      setError(`フィードバックの送信に失敗しました。${code}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="クラスのフィードバック" onClose={onClose}>
      <div className="space-y-4">
        <div className="p-4 bg-gray-50 rounded-md">
          <p><strong>コース:</strong> {booking.courseTitle}</p>
          <p><strong>{userRole === 'student' ? '教師' : '生徒'}:</strong> {userRole === 'student' ? 'N/A' : booking.studentName}</p>
          <p><strong>日時:</strong> {booking.startTime.toDate().toLocaleDateString('ja-JP')}</p>
        </div>
        
        {error && <Alert message={error} type="error" />}

        {!booking.feedback && isViewOnly ? (
          <p className="text-center text-gray-500 py-4">教師からのフィードバックはまだありません。</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">評価 (1-5)</label>
              {isViewOnly ? (
                <p className="mt-1 text-lg font-bold text-yellow-500">{'★'.repeat(rating)}{'☆'.repeat(5 - rating)}</p>
              ) : (
                <div className="flex space-x-1 mt-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`text-3xl ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="comment" className="block text-sm font-medium text-gray-700">コメント</label>
              {isViewOnly ? (
                <p className="mt-1 p-2 bg-gray-100 rounded-md min-h-[100px]">{comment}</p>
              ) : (
                <textarea
                  id="comment"
                  rows={4}
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="具体的なフィードバックを記入してください..."
                />
              )}
            </div>
            
            {!isViewOnly && (
              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  // Fix: Disable button if no rating is selected.
                  disabled={loading || rating === 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? '送信中...' : 'フィードバックを送信'}
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </Modal>
  );
};

export default FeedbackModal;
