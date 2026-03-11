import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

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
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

    return (
        <Dialog open={show} onClose={onClose} fullWidth maxWidth="sm" fullScreen={fullScreen}>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent dividers>{children}</DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{cancelText}</Button>
                {onConfirm && (
                    <Button onClick={onConfirm} variant="contained" color="primary">
                        {confirmText}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default Modal;
