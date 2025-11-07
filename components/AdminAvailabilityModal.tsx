import React from 'react';
import Modal from './Modal';

interface AdminAvailabilityModalProps {
    onClose: () => void;
}

const AdminAvailabilityModal: React.FC<AdminAvailabilityModalProps> = ({onClose}) => {
    return (
        <Modal title="Admin Availability" onClose={onClose}>
            <p>This is a placeholder for the admin availability modal.</p>
        </Modal>
    );
};

export default AdminAvailabilityModal;
