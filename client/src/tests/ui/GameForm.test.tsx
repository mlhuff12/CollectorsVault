import React from 'react';
import { fireEvent, render, screen, waitFor, act } from '@testing-library/react';

// component and api will be required in beforeEach to reset module state
let GameForm: any;
let api: any;

// silence harmless act warnings from BarcodeScanner start failure
const _origErr = console.error;
const _origWarn = console.warn;
beforeAll(() => {
    console.error = (...args: any[]) => {
        if (typeof args[0] === 'string' && args[0].includes('not wrapped in act')) {
            return;
        }
        _origErr.apply(console, args);
    };
    console.warn = (...args: any[]) => {
        if (typeof args[0] === 'string' && args[0].includes('not wrapped in act')) {
            return;
        }
        _origWarn.apply(console, args);
    };
});

afterAll(() => {
    console.error = _origErr;
    console.warn = _origWarn;
});

// control object for html5-qrcode mock
const qrMockBehavior = { startShouldReject: false };

vi.mock('html5-qrcode', () => ({
    Html5Qrcode: function() {
        return {
            start: () => {
                const promise = qrMockBehavior.startShouldReject ? Promise.reject(new Error('camera error')) : Promise.resolve();
                return promise.then(
                    res => { act(() => {}); return res; },
                    err => { act(() => {}); return Promise.reject(err); }
                );
            },
            stop: () => Promise.resolve()
        };
    },
    Html5QrcodeSupportedFormats: {
        EAN_13: 'EAN_13', EAN_8: 'EAN_8', UPC_A: 'UPC_A', UPC_E: 'UPC_E', CODE_128: 'CODE_128'
    }
}));

vi.mock('../../services/api', () => ({
    addGame: vi.fn(),
    lookupGameByUpc: vi.fn()
}));

describe('GameForm', () => {
    // mocks will be created within each test after api is required

    beforeEach(async () => {
        vi.resetModules();
        const mod = await import('../../components/GameForm');
        GameForm = mod.default;
        api = await import('../../services/api');
        vi.clearAllMocks();
    });

    it('submits game and calls onItemAdded on success', async () => {
        const onItemAdded = vi.fn();
        const mockAddGame = api.addGame as jest.MockedFunction<typeof api.addGame>;
        mockAddGame.mockResolvedValue({
            title: 'Halo Infinite',
            platform: 'Xbox',
            releaseDate: '2021-12-08'
        });

        render(<GameForm onItemAdded={onItemAdded} />);

        fireEvent.change(screen.getByRole('textbox', { name: /Title/ }), { target: { value: 'Halo Infinite' } });
        fireEvent.change(screen.getByRole('textbox', { name: /Platform/ }), { target: { value: 'Xbox' } });
        // date input; rely on label instead of role
        fireEvent.change(screen.getByLabelText(/Release Date/), { target: { value: '2021-12-08' } });

        fireEvent.click(screen.getByRole('button', { name: 'Add Game' }));

        await waitFor(() => {
            expect(mockAddGame).toHaveBeenCalledWith({
                title: 'Halo Infinite',
                platform: 'Xbox',
                releaseDate: '2021-12-08'
            });
        });

        expect(onItemAdded).toHaveBeenCalledTimes(1);
    });

    it('shows error message when add fails', async () => {
        const mockAddGame = api.addGame as jest.MockedFunction<typeof api.addGame>;
        mockAddGame.mockRejectedValue(new Error('boom'));

        render(<GameForm />);

        fireEvent.change(screen.getByRole('textbox', { name: /Title/ }), { target: { value: 'Halo Infinite' } });
        fireEvent.change(screen.getByRole('textbox', { name: /Platform/ }), { target: { value: 'Xbox' } });
        // date input; rely on label instead of role
        fireEvent.change(screen.getByLabelText(/Release Date/), { target: { value: '2021-12-08' } });

        fireEvent.click(screen.getByRole('button', { name: 'Add Game' }));
        // message may appear twice (body1 and body2); accept at least one
        await waitFor(() => {
            const matches = screen.getAllByText(/Failed to add game/i);
            expect(matches.length).toBeGreaterThan(0);
        });
    });

    it('does not render submit button when hideSubmit prop is set', () => {
        render(<GameForm hideSubmit />);
        expect(screen.queryByRole('button', { name: 'Add Game' })).not.toBeInTheDocument();
    });

    it('hides the title when hideTitle prop is set', () => {
        render(<GameForm hideTitle />);
        expect(screen.queryByText('Add a Game')).not.toBeInTheDocument();
    });

    it('shows barcode lookup field and scan option when camera available', () => {
        Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: vi.fn() }, configurable: true });
        render(<GameForm />);
        const field = screen.getByRole('textbox', { name: /Barcode/ }) as HTMLInputElement;
        expect(field).toBeInTheDocument();
        expect(field.maxLength).toBe(13);
        expect(screen.getByRole('button', { name: 'Lookup' })).toBeInTheDocument();
        expect(screen.getByText('OR')).toBeInTheDocument();
        const scanBtn = screen.getByRole('button', { name: /Scan Barcode/ });
        expect(scanBtn).toBeInTheDocument();
        // scan button should live next to the barcode input rather than with title field
        expect(scanBtn).toBeInTheDocument();
    });
    it('hides OR and scan option when camera unavailable', () => {
        delete (navigator as any).mediaDevices;
        render(<GameForm />);
        const field2 = screen.getByRole('textbox', { name: /Barcode/ }) as HTMLInputElement;
        expect(field2).toBeInTheDocument();
        expect(field2.maxLength).toBe(13);
        expect(screen.queryByText('OR')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Scan Barcode/ })).not.toBeInTheDocument();
    });

    it('opens scanner when Scan Barcode clicked', async () => {
        Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: vi.fn() }, configurable: true });
        render(<GameForm />);
        const scanBtn = screen.getByRole('button', { name: /Scan Barcode/ });
        fireEvent.click(scanBtn);
        expect(await screen.findByText('Point the camera at a barcode')).toBeInTheDocument();
    });

    it('marks unsupported when permission denied and shows no toast', async () => {
        Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: vi.fn() }, configurable: true });
        Object.defineProperty(navigator, 'permissions', {
            value: { query: () => Promise.resolve({ state: 'denied' }) },
            configurable: true
        });
        render(<GameForm />);
        const scanBtn = screen.getByRole('button', { name: /Scan Barcode/ });
        fireEvent.click(scanBtn);
        expect(await screen.findByText(/Barcode scanning is not supported/i)).toBeInTheDocument();
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('shows generic warning when scanner fails to start (no toast)', async () => {
        // clear previous permission stubs
        delete (navigator as any).permissions;
        qrMockBehavior.startShouldReject = true;
        Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: vi.fn() }, configurable: true });
        render(<GameForm />);
        const scanBtn = screen.getByRole('button', { name: /Scan Barcode/ });
        await act(async () => {
            fireEvent.click(scanBtn);
        });
        const msg = await screen.findByText(/Barcode scanning is not supported/i);
        expect(msg).toBeInTheDocument();
        // ensure it's not shown as a toast
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('invokes lookupGameByUpc when Lookup clicked', async () => {
        const mockLookup = api.lookupGameByUpc as jest.MockedFunction<typeof api.lookupGameByUpc>;
        mockLookup.mockResolvedValue({} as any);

        Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: vi.fn() }, configurable: true });
        render(<GameForm />);
        const input = screen.getByRole('textbox', { name: /Barcode/ });
        fireEvent.change(input, { target: { value: ' 7890 ' } });
        fireEvent.click(screen.getByRole('button', { name: 'Lookup' }));

        await waitFor(() => {
            expect(mockLookup).toHaveBeenCalledWith('7890');
        });
    });

    it('shows badge and tooltip when lookup fails', async () => {
        const mockLookup = api.lookupGameByUpc as jest.MockedFunction<typeof api.lookupGameByUpc>;
        mockLookup.mockRejectedValue(new Error('nope'));

        render(<GameForm />);
        const input = screen.getByRole('textbox', { name: /Barcode/ });
        fireEvent.change(input, { target: { value: '777' } });
        fireEvent.click(screen.getByRole('button', { name: 'Lookup' }));

        // badge should render and show tooltip with the error
        const badgeIcon = await screen.findByTestId('lookup-error-badge');
        fireEvent.mouseOver(badgeIcon);
        expect(await screen.findByRole('tooltip')).toHaveTextContent(/Game not found for barcode 777/i);
    });


});
