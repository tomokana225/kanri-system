import React from 'react';
import Modal from './Modal';

interface AdminAvailabilityModalProps {
    onClose: () => void;
}

const AdminAvailabilityModal: React.FC<AdminAvailabilityModalProps> = ({ onClose }) => {
  return (
    <Modal title="管理者用 空き時間設定" onClose={onClose}>
      <p className="text-gray-500">この機能は現在開発中です。</p>
    </Modal>
  );
};

export default AdminAvailabilityModal;
