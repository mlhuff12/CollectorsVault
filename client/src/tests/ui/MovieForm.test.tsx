import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import MovieForm from '../../components/MovieForm';
import * as api from '../../services/api';

// control object for html5-qrcode mock
const qrMockBehavior = { startShouldReject: false };

vi.mock('html5-qrcode', () => ({
    Html5Qrcode: function() {
        return {
            start: () => qrMockBehavior.startShouldReject ? Promise.reject(new Error('camera error')) : Promise.resolve(),
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
    const mockAddMovie = api.addMovie as jest.MockedFunction<typeof api.addMovie>;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('submits movie and calls onItemAdded on success', async () => {
        const onItemAdded = vi.fn();
        mockAddMovie.mockResolvedValue({
            title: 'Inception',
            director: 'Christopher Nolan',
            releaseYear: 2010,
            genre: 'Sci-fi'
        });

        render(<MovieForm onItemAdded={onItemAdded} />);

        // fill fields by label to avoid order dependency
        fireEvent.change(screen.getByLabelText('Title:'), { target: { value: 'Inception' } });
        fireEvent.change(screen.getByLabelText('Director:'), { target: { value: 'Christopher Nolan' } });
        fireEvent.change(screen.getByLabelText('Release Year:'), { target: { value: '2010' } });
        fireEvent.change(screen.getByLabelText('Genre:'), { target: { value: 'Sci-fi' } });

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
        mockAddMovie.mockRejectedValue(new Error('boom'));

        render(<MovieForm />);

        fireEvent.change(screen.getByLabelText('Title:'), { target: { value: 'Inception' } });
        fireEvent.change(screen.getByLabelText('Director:'), { target: { value: 'Christopher Nolan' } });
        fireEvent.change(screen.getByLabelText('Release Year:'), { target: { value: '2010' } });
        fireEvent.change(screen.getByLabelText('Genre:'), { target: { value: 'Sci-fi' } });

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
        expect(scanBtn.closest('.input-group')).not.toBeNull();
    });

    it('hides OR and scan option when camera unavailable', () => {
        delete (navigator as any).mediaDevices;
        render(<MovieForm />);
        expect(screen.getByPlaceholderText('Enter UPC')).toBeInTheDocument();
        expect(screen.queryByText('OR')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Scan Barcode/ })).not.toBeInTheDocument();
    });

    it('opens scanner when Scan Barcode button clicked', () => {
        Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: vi.fn() }, configurable: true });
        render(<MovieForm />);
        const scanBtn = screen.getByRole('button', { name: /Scan Barcode/ });
        fireEvent.click(scanBtn);
        expect(screen.getByText('Point the camera at a barcode')).toBeInTheDocument();
    });

    it('shows toast when permission denied', async () => {
        Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: vi.fn() }, configurable: true });
        Object.defineProperty(navigator, 'permissions', {
            value: { query: () => Promise.resolve({ state: 'denied' }) },
            configurable: true
        });
        render(<MovieForm />);
        const scanBtn = screen.getByRole('button', { name: /Scan Barcode/ });
        fireEvent.click(scanBtn);
        expect(await screen.findByText(/Camera could not be opened/)).toBeInTheDocument();
    });

    it('shows error under UPC field when scanner fails to start (no toast)', async () => {
        // clear any previous permissions stub from earlier tests
        delete (navigator as any).permissions;
        qrMockBehavior.startShouldReject = true;
        Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: vi.fn() }, configurable: true });
        render(<MovieForm />);
        const scanBtn = screen.getByRole('button', { name: /Scan Barcode/ });
        fireEvent.click(scanBtn);
        const msg = await screen.findByText(/Camera could not be opened/);
        expect(msg).toBeInTheDocument();
        // ensure the message is rendered as form-text rather than a toast alert
        expect(msg).toHaveClass('form-text');
        // message appears somewhere on form; already verified above by class
    });

});
