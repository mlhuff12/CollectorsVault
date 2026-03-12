import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// re-use html5-qrcode mock pattern from other tests
const qrMockBehavior: { startShouldReject: boolean } = { startShouldReject: false };
vi.mock('html5-qrcode', () => ({
    Html5Qrcode: function () {
        return {
            start: () => {
                const promise = qrMockBehavior.startShouldReject
                    ? Promise.reject(new Error('camera failure'))
                    : Promise.resolve();
                // wrap resolution/rejection in act so React doesn't warn
                return promise.then(
                    res => { act(() => {}); return res; },
                    err => { act(() => {}); return Promise.reject(err); }
                );
            },
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

let BarcodeScanLookup: any;

// suppress known act() warning emitted by BarcodeScanner when start() rejects
const originalError = console.error;
const originalWarn = console.warn;
beforeAll(() => {
    console.error = (...args: any[]) => {
        if (typeof args[0] === 'string' && args[0].includes('not wrapped in act')) {
            return;
        }
        originalError.apply(console, args);
    };
    console.warn = (...args: any[]) => {
        if (typeof args[0] === 'string' && args[0].includes('not wrapped in act')) {
            return;
        }
        originalWarn.apply(console, args);
    };
});

afterAll(() => {
    console.error = originalError;
    console.warn = originalWarn;
});

describe('BarcodeScanLookup', () => {
    beforeEach(async () => {
        // reload module state so module-level flags (scanUnsupportedPermanently)
        // reset between tests
        vi.resetModules();
        const mod = await import('../../components/BarcodeScanLookup');
        BarcodeScanLookup = mod.default;
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
        const onLookup = vi.fn().mockResolvedValue(undefined);
        // make scanner available so scan button renders
        Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: vi.fn() }, configurable: true });
        render(<BarcodeScanLookup placeholder="p" onLookup={onLookup} />);

        const input = screen.getByPlaceholderText('p');
        const lookupBtn = screen.getByRole('button', { name: 'Lookup' });
        // initially shows text
        expect(lookupBtn).toHaveTextContent('Lookup');

        fireEvent.change(input, { target: { value: '  abc123  ' } });
        fireEvent.click(lookupBtn);

        // text should disappear once loading begins
        expect(lookupBtn).toHaveTextContent('');

        // scan button should also be disabled while loading
        const scanBtn = screen.getByRole('button', { name: 'Scan Barcode' });
        expect(scanBtn).toBeDisabled();

        // lookup button should show spinner while loading
        expect(lookupBtn).toContainElement(screen.getByRole('progressbar'));

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

    it('opens scanner when Scan Barcode is clicked', async () => {
        Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: vi.fn() }, configurable: true });
        render(<BarcodeScanLookup placeholder="foo" onLookup={() => {}} />);
        const scanBtn = screen.getByRole('button', { name: /Scan Barcode/ });
        fireEvent.click(scanBtn);
        expect(await screen.findByText('Point the camera at a barcode')).toBeInTheDocument();
    });

    it('shows only the generic warning when scanner fails to start', async () => {
        qrMockBehavior.startShouldReject = true;
        Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: vi.fn() }, configurable: true });
        render(<BarcodeScanLookup placeholder="foo" onLookup={() => {}} />);
        const scanBtn = screen.getByRole('button', { name: /Scan Barcode/ });
        await act(async () => {
            fireEvent.click(scanBtn);
        });
        // The detailed camera error should *not* be rendered; instead the permanent
        // unsupported warning appears.
        expect(await screen.findByText(/Barcode scanning is not supported/i)).toBeInTheDocument();
        expect(screen.queryByText(/Camera could not be opened/i)).not.toBeInTheDocument();
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('marks scanning unsupported when permissions API denies camera and shows no toast', async () => {
        Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: vi.fn() }, configurable: true });
        Object.defineProperty(navigator, 'permissions', {
            value: { query: () => Promise.resolve({ state: 'denied' }) },
            configurable: true,
        });

        render(<BarcodeScanLookup placeholder="foo" onLookup={() => {}} />);
        const scanBtn = screen.getByRole('button', { name: /Scan Barcode/ });
        fireEvent.click(scanBtn);
        expect(await screen.findByText(/Barcode scanning is not supported/i)).toBeInTheDocument();
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('skips toast on later scan attempts once unsupported', async () => {
        qrMockBehavior.startShouldReject = true;
        Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: vi.fn() }, configurable: true });
        render(<BarcodeScanLookup placeholder="foo" onLookup={() => {}} />);
        const scanBtn = screen.getByRole('button', { name: /Scan Barcode/ });
        await act(async () => {
            fireEvent.click(scanBtn);
        });
        await screen.findByText(/Barcode scanning is not supported/i);
        // second click should not show any toast alert
        await act(async () => {
            fireEvent.click(scanBtn);
        });
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
});
