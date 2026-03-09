import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// re-use html5-qrcode mock pattern from other tests
const qrMockBehavior: { startShouldReject: boolean } = { startShouldReject: false };
vi.mock('html5-qrcode', () => ({
    Html5Qrcode: function () {
        return {
            start: () =>
                qrMockBehavior.startShouldReject
                    ? Promise.reject(new Error('camera failure'))
                    : Promise.resolve(),
            stop: () => Promise.resolve(),
        };
    },
    Html5QrcodeSupportedFormats: {
        EAN_13: 'EAN_13',
        EAN_8: 'EAN_8',
        UPC_A: 'UPC_A',
        UPC_E: 'UPC_E',
        CODE_128: 'CODE_128',
    },
}));

import BarcodeScanLookup from '../../components/BarcodeScanLookup';

describe('BarcodeScanLookup', () => {
    beforeEach(() => {
        qrMockBehavior.startShouldReject = false;
        // ensure no lingering permission stub
        delete (navigator as any).permissions;
    });

    it('renders label if provided and always shows placeholder', () => {
        render(
            <BarcodeScanLookup
                label="Test Label"
                placeholder="Enter value"
                onLookup={() => {}}
            />
        );
        expect(screen.getByText('Test Label')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter value')).toBeInTheDocument();
    });

    it('invokes onLookup with trimmed value when lookup button clicked', async () => {
        const onLookup = vi.fn();
        render(<BarcodeScanLookup placeholder="p" onLookup={onLookup} />);

        const input = screen.getByPlaceholderText('p');
        fireEvent.change(input, { target: { value: '  abc123  ' } });
        fireEvent.click(screen.getByRole('button', { name: 'Lookup' }));

        await waitFor(() => {
            expect(onLookup).toHaveBeenCalledWith('abc123');
        });
    });

    it('hides OR text and scan button when camera unavailable', () => {
        delete (navigator as any).mediaDevices;
        render(<BarcodeScanLookup placeholder="foo" onLookup={() => {}} />);
        expect(screen.queryByText('OR')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Scan Barcode/ })).not.toBeInTheDocument();
    });

    it('shows OR text and scan button when camera available', () => {
        Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: vi.fn() }, configurable: true });
        render(<BarcodeScanLookup placeholder="foo" onLookup={() => {}} />);
        expect(screen.getByText('OR')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Scan Barcode/ })).toBeInTheDocument();
    });

    it('opens scanner when Scan Barcode is clicked', () => {
        Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: vi.fn() }, configurable: true });
        render(<BarcodeScanLookup placeholder="foo" onLookup={() => {}} />);
        const scanBtn = screen.getByRole('button', { name: /Scan Barcode/ });
        fireEvent.click(scanBtn);
        expect(screen.getByText('Point the camera at a barcode')).toBeInTheDocument();
    });

    it('shows error text under field when scanner fails to start', async () => {
        qrMockBehavior.startShouldReject = true;
        Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: vi.fn() }, configurable: true });
        render(<BarcodeScanLookup placeholder="foo" onLookup={() => {}} />);
        const scanBtn = screen.getByRole('button', { name: /Scan Barcode/ });
        fireEvent.click(scanBtn);
        const msg = await screen.findByText(/Camera could not be opened/i);
        expect(msg).toBeInTheDocument();
        expect(msg).toHaveClass('form-text');
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('shows a toast when camera permission is denied via permissions API', async () => {
        Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: vi.fn() }, configurable: true });
        Object.defineProperty(navigator, 'permissions', {
            value: { query: () => Promise.resolve({ state: 'denied' }) },
            configurable: true,
        });

        render(<BarcodeScanLookup placeholder="foo" onLookup={() => {}} />);
        const scanBtn = screen.getByRole('button', { name: /Scan Barcode/ });
        fireEvent.click(scanBtn);
        expect(await screen.findByRole('alert')).toBeInTheDocument();
    });
});
