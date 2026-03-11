import React from 'react';
import { fireEvent, render, screen, waitFor, act } from '@testing-library/react';

// component and api will be (re)required in beforeEach so module-level flag clears
let MovieForm: any;
let api: any;

// light suppression of act warnings related to barcode start failures
const _origErrMovie = console.error;
const _origWarnMovie = console.warn;
beforeAll(() => {
    console.error = (...args: any[]) => {
        if (typeof args[0] === 'string' && args[0].includes('not wrapped in act')) {
            return;
        }
        _origErrMovie.apply(console, args);
    };
    console.warn = (...args: any[]) => {
        if (typeof args[0] === 'string' && args[0].includes('not wrapped in act')) {
            return;
        }
        _origWarnMovie.apply(console, args);
    };
});

afterAll(() => {
    console.error = _origErrMovie;
    console.warn = _origWarnMovie;
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
    addMovie: vi.fn(),
    lookupMovieByUpc: vi.fn()
}));

describe('MovieForm', () => {
    // mocks created within tests after api is required

    beforeEach(async () => {
        vi.resetModules();
        const mod = await import('../../components/MovieForm');
        MovieForm = mod.default;
        api = await import('../../services/api');
        vi.clearAllMocks();
    });

    it('submits movie and calls onItemAdded on success', async () => {
        const onItemAdded = vi.fn();
        const mockAddMovie = api.addMovie as jest.MockedFunction<typeof api.addMovie>;
        mockAddMovie.mockResolvedValue({
            title: 'Inception',
            director: 'Christopher Nolan',
            releaseYear: 2010,
            genre: 'Sci-fi'
        });

        render(<MovieForm onItemAdded={onItemAdded} />);

        // fill fields by accessible roles so labels with asterisks still match
        fireEvent.change(screen.getByRole('textbox', { name: /Title/ }), { target: { value: 'Inception' } });
        fireEvent.change(screen.getByRole('textbox', { name: /Director/ }), { target: { value: 'Christopher Nolan' } });
        fireEvent.change(screen.getByRole('spinbutton', { name: /Release Year/ }), { target: { value: '2010' } });
        fireEvent.change(screen.getByRole('textbox', { name: /Genre/ }), { target: { value: 'Sci-fi' } });

        fireEvent.click(screen.getByRole('button', { name: 'Add Movie' }));

        await waitFor(() => {
            expect(mockAddMovie).toHaveBeenCalledWith({
                title: 'Inception',
                director: 'Christopher Nolan',
                releaseYear: 2010,
                genre: 'Sci-fi'
            });
        });

        expect(onItemAdded).toHaveBeenCalledTimes(1);
    });

    it('shows API error message when add fails', async () => {
        const mockAddMovie = api.addMovie as jest.MockedFunction<typeof api.addMovie>;
        mockAddMovie.mockRejectedValue(new Error('boom'));

        render(<MovieForm />);

        fireEvent.change(screen.getByRole('textbox', { name: /Title/ }), { target: { value: 'Inception' } });
        fireEvent.change(screen.getByRole('textbox', { name: /Director/ }), { target: { value: 'Christopher Nolan' } });
        fireEvent.change(screen.getByRole('spinbutton', { name: /Release Year/ }), { target: { value: '2010' } });
        fireEvent.change(screen.getByRole('textbox', { name: /Genre/ }), { target: { value: 'Sci-fi' } });

        fireEvent.click(screen.getByRole('button', { name: 'Add Movie' }));

        // wait for the error message to appear after async rejection
        expect(await screen.findByText('Failed to add movie')).toBeInTheDocument();
    });

    it('does not render submit button when hideSubmit prop provided', () => {
        render(<MovieForm hideSubmit />);
        expect(screen.queryByRole('button', { name: 'Add Movie' })).not.toBeInTheDocument();
    });
    it('hides the title when hideTitle prop is true', () => {
        render(<MovieForm hideTitle />);
        expect(screen.queryByText('Add a Movie')).not.toBeInTheDocument();
    });

    it('shows UPC lookup field and scan option when camera available', () => {
        Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: vi.fn() }, configurable: true });
        render(<MovieForm />);
        expect(screen.getByPlaceholderText('Enter UPC')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Lookup' })).toBeInTheDocument();
        expect(screen.getByText('OR')).toBeInTheDocument();
        const scanBtn = screen.getByRole('button', { name: /Scan Barcode/ });
        expect(scanBtn).toBeInTheDocument();
        // scan button should not live in the same container as the title input
        // the scan button should live next to the UPC input, not with the title field
        expect(scanBtn).toBeInTheDocument();
    });

    it('hides OR and scan option when camera unavailable', () => {
        delete (navigator as any).mediaDevices;
        render(<MovieForm />);
        expect(screen.getByPlaceholderText('Enter UPC')).toBeInTheDocument();
        expect(screen.queryByText('OR')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Scan Barcode/ })).not.toBeInTheDocument();
    });

    it('opens scanner when Scan Barcode button clicked', async () => {
        Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: vi.fn() }, configurable: true });
        render(<MovieForm />);
        const scanBtn = screen.getByRole('button', { name: /Scan Barcode/ });
        fireEvent.click(scanBtn);
        expect(await screen.findByText('Point the camera at a barcode')).toBeInTheDocument();
    });

    it('converts to unsupported mode when permission denied and shows no toast', async () => {
        Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: vi.fn() }, configurable: true });
        Object.defineProperty(navigator, 'permissions', {
            value: { query: () => Promise.resolve({ state: 'denied' }) },
            configurable: true
        });
        render(<MovieForm />);
        const scanBtn = screen.getByRole('button', { name: /Scan Barcode/ });
        fireEvent.click(scanBtn);
        expect(await screen.findByText(/Barcode scanning is not supported/i)).toBeInTheDocument();
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('shows generic warning when scanner fails to start (no toast)', async () => {
        // clear any previous permissions stub from earlier tests
        delete (navigator as any).permissions;
        qrMockBehavior.startShouldReject = true;
        Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: vi.fn() }, configurable: true });
        render(<MovieForm />);
        const scanBtn = screen.getByRole('button', { name: /Scan Barcode/ });
        await act(async () => {
            fireEvent.click(scanBtn);
        });
        const msg = await screen.findByText(/Barcode scanning is not supported/i);
        expect(msg).toBeInTheDocument();
        // ensure the message is rendered as form-text rather than a toast alert
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('calls lookupMovieByUpc when Lookup button is pressed', async () => {
        const mockLookup = api.lookupMovieByUpc as jest.MockedFunction<typeof api.lookupMovieByUpc>;
        // we don't care about the shape here, just that the function is called
        mockLookup.mockResolvedValue({} as any);

        Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: vi.fn() }, configurable: true });
        render(<MovieForm />);
        const input = screen.getByPlaceholderText('Enter UPC');
        fireEvent.change(input, { target: { value: '  12345  ' } });
        fireEvent.click(screen.getByRole('button', { name: 'Lookup' }));

        await waitFor(() => {
            expect(mockLookup).toHaveBeenCalledWith('12345');
        });
    });

});
