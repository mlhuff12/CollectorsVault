import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mutable control object – plain object references work inside jest.mock factories
// even though jest.fn() calls do not (hoisting limitation).
const mockBehavior = { startShouldReject: false };

// Mock html5-qrcode using plain functions (jest.fn() is not hoistable inside mock factories)
jest.mock('html5-qrcode', () => ({
    Html5Qrcode: function() {
        return {
            start: () => mockBehavior.startShouldReject
                ? Promise.reject(new Error('NotAllowedError: camera permission denied'))
                : Promise.resolve(),
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

beforeEach(() => {
    mockBehavior.startShouldReject = false;
});

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

    it('shows manual barcode input when the camera fails to start', async () => {
        mockBehavior.startShouldReject = true;
        const onScan = jest.fn();
        const onClose = jest.fn();
        render(<BarcodeScanner onScan={onScan} onClose={onClose} />);

        // Error message and manual input should appear once start() rejects
        await screen.findByText(/Camera could not be opened/i);
        expect(screen.getByPlaceholderText('Enter barcode number')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Use' })).toBeInTheDocument();
    });

    it('calls onScan and onClose when a barcode is submitted manually', async () => {
        mockBehavior.startShouldReject = true;
        const onScan = jest.fn();
        const onClose = jest.fn();
        render(<BarcodeScanner onScan={onScan} onClose={onClose} />);

        await screen.findByPlaceholderText('Enter barcode number');
        fireEvent.change(screen.getByPlaceholderText('Enter barcode number'), {
            target: { value: '9780134190440' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Use' }));

        expect(onScan).toHaveBeenCalledWith('9780134190440');
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
