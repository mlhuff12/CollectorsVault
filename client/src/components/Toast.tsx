import React, { useEffect, useState } from 'react';
import { Snackbar, Alert } from '@mui/material';

/** Severity level of the toast notification. */
export type ToastType = 'success' | 'error' | 'info' | 'warning';

/** Props accepted by {@link Toast}. */
interface ToastProps {
    /** Message to display. Pass an empty string or undefined to hide the toast. */
    message: string;
    /** Visual style of the toast. Defaults to 'success'. */
    type?: ToastType;
    /** Duration in milliseconds before the toast auto-dismisses. Defaults to 5000. */
    duration?: number;
    /** Called when the toast is dismissed (by timer or close button). */
    onDismiss: () => void;
}

/**
 * Toast displays a brief, auto-dismissing notification using MUI Snackbar/Alert.
 * It keeps its own open state tied to the `message` prop and forwards dismiss
 * events via the onDismiss callback.
 */
const Toast: React.FC<ToastProps> = ({ message, type = 'success', duration = 5000, onDismiss }) => {
    const [open, setOpen] = useState(!!message);

    useEffect(() => {
        setOpen(!!message);
    }, [message]);

    const handleClose = (_event?: React.SyntheticEvent, reason?: string) => {
        if (reason === 'clickaway') {
            return;
        }
        setOpen(false);
        onDismiss();
    };

    return (
        <Snackbar
            open={open}
            autoHideDuration={duration}
            onClose={handleClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
            <Alert onClose={handleClose} severity={type} sx={{ width: '100%' }}>
                {message}
            </Alert>
        </Snackbar>
    );
};

export default Toast;
