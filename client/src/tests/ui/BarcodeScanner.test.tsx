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

    it('positions itself full screen when opened', async () => {
        const onScan = vi.fn();
        const onClose = vi.fn();
        const { container, unmount } = render(<BarcodeScanner onScan={onScan} onClose={onClose} />);

        await waitForScannerToSettle();

        const wrapper = container.firstChild as HTMLElement;
        expect(wrapper).toBeTruthy();
        // inline style ensures the element is fixed to viewport
        expect(wrapper).toHaveStyle('position: fixed');
        expect(wrapper).toHaveStyle('top: 0');
        expect(wrapper).toHaveStyle('left: 0');

        const videoEl = container.querySelector('#cv-barcode-scanner') as HTMLElement;
        expect(videoEl).toHaveStyle('width: 100%');
        expect(videoEl).toHaveStyle('height: 100%');

        // background scroll should be disabled while scanner is active
        expect(document.body.style.overflow).toBe('hidden');

        // simulate parent closing the scanner by unmounting
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        unmount();
        expect(document.body.style.overflow).toBe('');
    });

    it('calls onError and hides all UI when camera fails to start', async () => {
        mockBehavior.startShouldReject = true;
        const onScan = vi.fn();
        const onClose = vi.fn();
        const onError = vi.fn();
        render(<BarcodeScanner onScan={onScan} onClose={onClose} onError={onError} />);

        await waitFor(() => {
            expect(onError).toHaveBeenCalledWith(
                'Camera could not be opened. Make sure the camera permission is granted, or manually enter UPC.'
            );
        });

        // component should render nothing after error
        expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
        expect(screen.queryByText('Point the camera at a barcode')).not.toBeInTheDocument();
    });

});
