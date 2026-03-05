import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mutable control object – plain object references work inside jest.mock factories
// even though vi.fn() calls do not (hoisting limitation).
const mockBehavior = { startShouldReject: false };

// Mock html5-qrcode using plain functions (vi.fn() is not hoistable inside mock factories)
vi.mock('html5-qrcode', () => ({
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

const waitForScannerToSettle = async () => {
    await waitFor(() => {
        expect(screen.queryByLabelText('starting camera')).not.toBeInTheDocument();
    });
};

let consoleErrorSpy: jest.SpyInstance;

beforeEach(() => {
    mockBehavior.startShouldReject = false;
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        // Suppress expected camera-start errors in tests.
    });
});

afterEach(() => {
    consoleErrorSpy.mockRestore();
});

describe('BarcodeScanner', () => {
    it('renders cancel button and instruction text', async () => {
        const onScan = vi.fn();
        const onClose = vi.fn();
        render(<BarcodeScanner onScan={onScan} onClose={onClose} />);

        expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
        expect(screen.getByText('Point the camera at a barcode')).toBeInTheDocument();
        await waitForScannerToSettle();
    });

    it('calls onClose when Cancel button is clicked', async () => {
        const onScan = vi.fn();
        const onClose = vi.fn();
        render(<BarcodeScanner onScan={onScan} onClose={onClose} />);

        await waitForScannerToSettle();

        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

        await waitFor(() => {
            expect(onClose).toHaveBeenCalledTimes(1);
        });
    });

    it('renders the scanner container element', async () => {
        const onScan = vi.fn();
        const onClose = vi.fn();
        const { container } = render(<BarcodeScanner onScan={onScan} onClose={onClose} />);

        expect(container.querySelector('#cv-barcode-scanner')).toBeInTheDocument();
        await waitForScannerToSettle();
    });

    it('shows manual barcode input when the camera fails to start', async () => {
        mockBehavior.startShouldReject = true;
        const onScan = vi.fn();
        const onClose = vi.fn();
        render(<BarcodeScanner onScan={onScan} onClose={onClose} />);

        // Error message and manual input should appear once start() rejects
        await screen.findByText(/Camera could not be opened/i);
        expect(screen.getByPlaceholderText('Enter barcode number')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Use' })).toBeInTheDocument();
    });

    it('calls onScan and onClose when a barcode is submitted manually', async () => {
        mockBehavior.startShouldReject = true;
        const onScan = vi.fn();
        const onClose = vi.fn();
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
