import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock html5-qrcode using plain functions (jest.fn() is not hoistable inside mock factories)
jest.mock('html5-qrcode', () => ({
    Html5Qrcode: function() {
        return {
            start: () => Promise.resolve(),
            stop: () => Promise.resolve()
        };
    },
    Html5QrcodeSupportedFormats: {
        EAN_13: 'EAN_13',
        EAN_8: 'EAN_8',
        UPC_A: 'UPC_A',
        UPC_E: 'UPC_E',
        CODE_128: 'CODE_128'
    }
}));

import BarcodeScanner from '../../components/BarcodeScanner';

describe('BarcodeScanner', () => {
    it('renders cancel button and instruction text', () => {
        const onScan = jest.fn();
        const onClose = jest.fn();
        render(<BarcodeScanner onScan={onScan} onClose={onClose} />);

        expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
        expect(screen.getByText('Point the camera at a barcode')).toBeInTheDocument();
    });

    it('calls onClose when Cancel button is clicked', async () => {
        const onScan = jest.fn();
        const onClose = jest.fn();
        render(<BarcodeScanner onScan={onScan} onClose={onClose} />);

        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

        // handleClose is async (awaits stopScanner), so wait for it
        await screen.findByRole('button', { name: 'Cancel' }).catch(() => {
            // element may be removed; ignore
        });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('renders the scanner container element', () => {
        const onScan = jest.fn();
        const onClose = jest.fn();
        const { container } = render(<BarcodeScanner onScan={onScan} onClose={onClose} />);

        expect(container.querySelector('#cv-barcode-scanner')).toBeInTheDocument();
    });
});
