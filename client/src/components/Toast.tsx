import React, { useEffect } from 'react';

/** Severity level of the toast notification. */
export type ToastType = 'success' | 'error' | 'info';

/** Props accepted by {@link Toast}. */
interface ToastProps {
    /** Message to display. Pass an empty string or undefined to hide the toast. */
    message: string;
    /** Visual style of the toast. Defaults to 'success'. */
    type?: ToastType;
    /** Duration in milliseconds before the toast auto-dismisses. Defaults to 3000. */
    duration?: number;
    /** Called when the toast is dismissed (by timer or close button). */
    onDismiss: () => void;
}

/**
 * Toast displays a brief, auto-dismissing notification at the bottom of the viewport.
 * It automatically calls `onDismiss` after `duration` milliseconds.
 */
const Toast: React.FC<ToastProps> = ({ message, type = 'success', duration = 3000, onDismiss }) => {
    useEffect(() => {
        if (!message) return;
        const timer = setTimeout(onDismiss, duration);
        return () => clearTimeout(timer);
    }, [message, duration, onDismiss]);

    if (!message) return null;

    const bgClass = type === 'success' ? 'bg-success' : type === 'error' ? 'bg-danger' : 'bg-info';

    return (
        <div
            role="alert"
            aria-live="assertive"
            style={{
                position: 'fixed',
                bottom: '1.5rem',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 9999,
                minWidth: '240px',
                maxWidth: '90vw'
            }}
        >
            <div className={`toast show text-white ${bgClass} border-0 shadow`}>
                <div className="d-flex align-items-center px-3 py-2">
                    <span className="me-auto">{message}</span>
                    <button
                        type="button"
                        className="btn-close btn-close-white ms-2"
                        aria-label="Close"
                        onClick={onDismiss}
                    />
                </div>
            </div>
        </div>
    );
};

export default Toast;
