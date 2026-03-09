import React from 'react';

interface ModalProps {
    show: boolean;
    title: string;
    onClose: () => void;
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
    children?: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({
    show,
    title,
    onClose,
    onConfirm,
    confirmText = 'Create',
    cancelText = 'Cancel',
    children,
}) => {
    if (!show) {
        return null;
    }

    // simple backdrop click handler to close
    const handleBackdrop = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="modal fade show" style={{ display: 'block' }} onClick={handleBackdrop}>
            {/* using Bootstrap's scrollable dialog class and limiting height via CSS */}
            <div className="modal-dialog modal-dialog-scrollable" role="document">
                <div className="modal-content" role="dialog" aria-modal="true" style={{ maxHeight: '90vh' }}>
                    <div className="modal-header">
                        <h5 className="modal-title">{title}</h5>
                        <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
                    </div>
                    <div className="modal-body">{children}</div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>{cancelText}</button>
                        {onConfirm && (
                            <button type="button" className="btn btn-primary" onClick={onConfirm}>{confirmText}</button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Modal;
