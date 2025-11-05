import React from 'react';
import Modal from './Modal';

interface EmailConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
}

const EmailConfirmationModal: React.FC<EmailConfirmationModalProps> = ({ isOpen, onClose, email }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <Modal
      title="メールアドレスの確認"
      onClose={onClose}
      onConfirm={onClose}
      confirmText="閉じる"
    >
      <p className="text-sm text-gray-700">
        確認メールを <strong>{email}</strong> に送信しました。
        メール内のリンクをクリックして、アカウントの登録を完了してください。
      </p>
    </Modal>
  );
};

export default EmailConfirmationModal;
