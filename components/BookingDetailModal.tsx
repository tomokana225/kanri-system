import React from 'react';
import Modal from './Modal';

interface BookingDetailModalProps {
    onClose: () => void;
}

const BookingDetailModal: React.FC<BookingDetailModalProps> = ({onClose}) => {
    return (
        <Modal title="Booking Details" onClose={onClose}>
            <p>This is a placeholder for the booking detail modal.</p>
        </Modal>
    );
};

export default BookingDetailModal;
