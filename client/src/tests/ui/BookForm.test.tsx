import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import BookForm from '../../components/BookForm';
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
    addBook: vi.fn(),
    lookupBookByIsbn: vi.fn()
}));

describe('BookForm', () => {
    const mockAddBook = api.addBook as jest.MockedFunction<typeof api.addBook>;
    const mockLookupBookByIsbn = api.lookupBookByIsbn as jest.MockedFunction<typeof api.lookupBookByIsbn>;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ── Manual entry ──────────────────────────────────────────────────────────

    it('submits parsed book payload and resets form on success (manual entry)', async () => {
        const onItemAdded = vi.fn();
        mockAddBook.mockResolvedValue({
            title: 'Dune',
            authors: ['Frank Herbert']
        });

        render(<BookForm onItemAdded={onItemAdded} />);

        fireEvent.change(screen.getByLabelText(/UPC.*ISBN:/), { target: { value: '9780441172719' } });
        fireEvent.change(screen.getByLabelText('Title:'), { target: { value: 'Dune' } });
        fireEvent.change(screen.getByLabelText('Authors (comma-separated):'), {
            target: { value: ' Frank Herbert,  Brian Herbert ' }
        });

        fireEvent.click(screen.getByRole('button', { name: 'Add Book' }));

        await waitFor(() => {
            expect(mockAddBook).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Dune',
                    authors: ['Frank Herbert', 'Brian Herbert'],
                    isbn: '9780441172719'
                })
            );
        });

        expect(onItemAdded).toHaveBeenCalledTimes(1);
        expect(await screen.findByText('Book added successfully!')).toBeInTheDocument();
    });

    it('shows validation when no author names provided (manual entry)', async () => {
        render(<BookForm />);

        fireEvent.change(screen.getByLabelText('Title:'), { target: { value: 'Dune' } });
        fireEvent.change(screen.getByLabelText('Authors (comma-separated):'), { target: { value: ' , , ' } });
        fireEvent.click(screen.getByRole('button', { name: 'Add Book' }));

        expect(screen.getByText('Please add at least one author.')).toBeInTheDocument();
        expect(mockAddBook).not.toHaveBeenCalled();
    });

    it('shows all manual-entry fields as editable when no lookup has been performed', () => {
        render(<BookForm />);

        expect(screen.getByLabelText('Title:')).not.toHaveAttribute('readOnly');
        expect(screen.getByLabelText('Authors (comma-separated):')).not.toHaveAttribute('readOnly');
        expect(screen.getByLabelText('Publisher:')).not.toHaveAttribute('readOnly');
        expect(screen.getByLabelText('Publish Date:')).not.toHaveAttribute('readOnly');
        expect(screen.getByLabelText('Page Count:')).not.toHaveAttribute('readOnly');
        expect(screen.getByLabelText('Description:')).not.toHaveAttribute('readOnly');
        expect(screen.getByLabelText('Book URL:')).not.toHaveAttribute('readOnly');
    });

    // ── Lookup button ─────────────────────────────────────────────────────────

    it('renders the Lookup button next to the UPC/ISBN field and limits length', () => {
        render(<BookForm />);
        const field = screen.getByPlaceholderText('Enter UPC or ISBN') as HTMLInputElement;
        expect(field).toBeInTheDocument();
        expect(field.maxLength).toBe(13);
        expect(screen.getByRole('button', { name: 'Lookup' })).toBeInTheDocument();
        expect(screen.getByLabelText('UPC / ISBN:')).toBeInTheDocument();
    });

    it('renders the Scan Barcode button next to the UPC/ISBN field', () => {
        Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: vi.fn() }, configurable: true });
        render(<BookForm />);
        expect(screen.getByRole('button', { name: 'Scan Barcode' })).toBeInTheDocument();
    });

    it('shows scanner errors below the ISBN field instead of using a toast', async () => {
        qrMockBehavior.startShouldReject = true;
        Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: vi.fn() }, configurable: true });
        render(<BookForm />);
        fireEvent.click(screen.getByRole('button', { name: /Scan Barcode/ }));
        const message = await screen.findByText(/Camera could not be opened/i);
        expect(message).toBeInTheDocument();
        // should not render a toast alert
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        // ensure the error is rendered as form-text on the page
        expect(message).toHaveClass('form-text');
    });

    it('shows OR text and scan button only when camera available', () => {
        Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: vi.fn() }, configurable: true });
        render(<BookForm />);
        const scanBtn = screen.getByRole('button', { name: /Scan Barcode/ });
        expect(screen.getByText('OR')).toBeInTheDocument();
        expect(scanBtn).toBeInTheDocument();
        // ensure scan button is inside input-group row
        expect(scanBtn.closest('.input-group')).not.toBeNull();
    });

    it('does not show OR or scan button when camera unavailable', () => {
        delete (navigator as any).mediaDevices;
        render(<BookForm />);
        expect(screen.queryByText('OR')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Scan Barcode/ })).not.toBeInTheDocument();
    });

    it('hides the submit button when hideSubmit prop is true', () => {
        render(<BookForm hideSubmit />);
        expect(screen.queryByRole('button', { name: 'Add Book' })).not.toBeInTheDocument();
    });

    it('hides the title when hideTitle prop is true', () => {
        render(<BookForm hideTitle />);
        expect(screen.queryByText('Add a New Book')).not.toBeInTheDocument();
    });

    it('calls lookupBookByIsbn (not mocked for DB changes) when Lookup button is clicked', async () => {
        const lookupData = {
            title: 'The Hobbit',
            authors: ['J.R.R. Tolkien'],
            isbn: '9780547928227',
            publisher: 'Houghton Mifflin',
            publishDate: '1937',
            pageCount: 310,
            description: 'A fantasy novel.',
            subjects: ['Fantasy'],
            coverSmall: 'https://covers.openlibrary.org/b/id/123-S.jpg',
            coverMedium: 'https://covers.openlibrary.org/b/id/123-M.jpg',
            coverLarge: 'https://covers.openlibrary.org/b/id/123-L.jpg',
            providerUrl: 'https://openlibrary.org/books/OL123',
            seriesName: '',
            seriesNotFound: false
        };
        mockLookupBookByIsbn.mockResolvedValue(lookupData);

        render(<BookForm />);

        fireEvent.change(screen.getByLabelText(/UPC.*ISBN:/), { target: { value: '9780547928227' } });
        fireEvent.click(screen.getByRole('button', { name: 'Lookup' }));

        await waitFor(() => {
            expect(mockLookupBookByIsbn).toHaveBeenCalledWith('9780547928227');
        });
    });

    // ── After lookup: fields are populated ───────────────────────────────────

    it('populates fields and displays medium image after a successful ISBN lookup', async () => {
        const lookupData = {
            title: 'The Hobbit',
            authors: ['J.R.R. Tolkien'],
            isbn: '9780547928227',
            publisher: 'Houghton Mifflin',
            publishDate: '1937',
            pageCount: 310,
            description: 'A fantasy novel.',
            subjects: ['Fantasy'],
            coverSmall: 'https://covers.openlibrary.org/b/id/123-S.jpg',
            coverMedium: 'https://covers.openlibrary.org/b/id/123-M.jpg',
            coverLarge: 'https://covers.openlibrary.org/b/id/123-L.jpg',
            providerUrl: 'https://openlibrary.org/books/OL123',
            seriesName: '',
            seriesNotFound: false
        };
        mockLookupBookByIsbn.mockResolvedValue(lookupData);

        render(<BookForm />);
        fireEvent.change(screen.getByLabelText(/UPC.*ISBN:/), { target: { value: '9780547928227' } });
        // end of initial lookup-populated fields assertions
    });

    it('marks fields as read-only after a successful ISBN lookup', async () => {
        const lookupData2 = {
            title: 'The Hobbit',
            authors: ['J.R.R. Tolkien'],
            isbn: '9780547928227',
            publisher: 'Houghton Mifflin',
            publishDate: '1937',
            pageCount: 310,
            description: 'A fantasy novel.',
            subjects: [],
            coverSmall: '',
            coverMedium: '',
            coverLarge: '',
            providerUrl: '',
            seriesName: '',
            seriesNotFound: false
        };
        mockLookupBookByIsbn.mockResolvedValue(lookupData2);

        render(<BookForm />);
        fireEvent.change(screen.getByLabelText(/UPC.*ISBN:/), { target: { value: '9780547928227' } });
        fireEvent.click(screen.getByRole('button', { name: 'Lookup' }));

        await waitFor(() => {
            expect(screen.getByLabelText('Title:')).toHaveAttribute('readOnly');
        });
        expect(screen.getByLabelText('Authors (comma-separated):')).toHaveAttribute('readOnly');
        expect(screen.getByLabelText('Publisher:')).toHaveAttribute('readOnly');
        expect(screen.getByLabelText('Publish Date:')).toHaveAttribute('readOnly');
        expect(screen.getByLabelText('Page Count:')).toHaveAttribute('readOnly');
        expect(screen.getByLabelText('Description:')).toHaveAttribute('readOnly');
        expect(screen.getByLabelText('Book URL:')).toHaveAttribute('readOnly');
    });

    // ── Lookup error ──────────────────────────────────────────────────────────

    it('shows an error message when ISBN lookup fails', async () => {
        mockLookupBookByIsbn.mockRejectedValue(new Error('Not found'));

        render(<BookForm />);
        fireEvent.change(screen.getByLabelText(/UPC.*ISBN:/), { target: { value: '0000000000' } });
        fireEvent.click(screen.getByRole('button', { name: 'Lookup' }));

        expect(await screen.findByText(/Book not found for the given ISBN/i)).toBeInTheDocument();
        // Fields should remain editable after a failed lookup
        expect(screen.getByLabelText('Title:')).not.toHaveAttribute('readOnly');
    });

    // ── Series fields ─────────────────────────────────────────────────────────

    it('renders Series Name and Series Number fields', () => {
        render(<BookForm />);
        expect(screen.getByLabelText('Series Name (optional):')).toBeInTheDocument();
        expect(screen.getByLabelText('Series Number (optional):')).toBeInTheDocument();
    });

    it('pre-populates series fields from lookup result', async () => {
        const lookupData = {
            title: 'The Invasion',
            authors: ['K.A. Applegate'],
            isbn: '0590629778',
            publisher: 'Scholastic',
            publishDate: '1996',
            pageCount: 192,
            description: 'Shape-shifting adventure.',
            subjects: [],
            coverSmall: '',
            coverMedium: '',
            coverLarge: '',
            providerUrl: '',
            seriesName: 'Animorphs',
            seriesNumber: 1,
            seriesNotFound: false
        };
        mockLookupBookByIsbn.mockResolvedValue(lookupData);

        render(<BookForm />);
        fireEvent.change(screen.getByLabelText(/UPC.*ISBN:/), { target: { value: '0590629778' } });
        fireEvent.click(screen.getByRole('button', { name: 'Lookup' }));

        await waitFor(() => {
            expect(screen.getByLabelText('Series Name (optional):')).toHaveValue('Animorphs');
        });
        expect(screen.getByLabelText('Series Number (optional):')).toHaveValue(1);
    });

    it('shows series-not-found warning when seriesNotFound is true', async () => {
        const lookupData = {
            title: 'The Invasion',
            authors: ['K.A. Applegate'],
            isbn: '0590629778',
            publisher: 'Scholastic',
            publishDate: '1996',
            pageCount: 192,
            description: 'Shape-shifting adventure.',
            subjects: [],
            coverSmall: '',
            coverMedium: '',
            coverLarge: '',
            providerUrl: '',
            seriesName: 'Animorphs',
            seriesNumber: undefined,
            seriesNotFound: true
        };
        mockLookupBookByIsbn.mockResolvedValue(lookupData);

        render(<BookForm />);
        fireEvent.change(screen.getByLabelText(/UPC.*ISBN:/), { target: { value: '0590629778' } });
        fireEvent.click(screen.getByRole('button', { name: 'Lookup' }));

        await waitFor(() => {
            expect(screen.getByText(/couldn't determine some of the series details/i)).toBeInTheDocument();
        });
        // Series name pre-filled but series number empty for user to fill
        expect(screen.getByLabelText('Series Name (optional):')).toHaveValue('Animorphs');
        expect(screen.getByLabelText('Series Number (optional):')).toHaveValue(null);
    });

    // ── Book Format and Needs Replacement fields ──────────────────────────────

    it('renders Book Format dropdown and Needs Replacement checkbox', () => {
        render(<BookForm />);
        expect(screen.getByLabelText('Book Format (optional):')).toBeInTheDocument();
        expect(screen.getByLabelText('Needs Replacement')).toBeInTheDocument();
    });

    it('includes series and format fields in manual submission payload', async () => {
        const onItemAdded = vi.fn();
        mockAddBook.mockResolvedValue({
            title: 'The Invasion',
            authors: ['K.A. Applegate']
        });

        render(<BookForm onItemAdded={onItemAdded} />);

        fireEvent.change(screen.getByLabelText('Title:'), { target: { value: 'The Invasion' } });
        fireEvent.change(screen.getByLabelText('Authors (comma-separated):'), { target: { value: 'K.A. Applegate' } });
        fireEvent.change(screen.getByLabelText('Series Name (optional):'), { target: { value: 'Animorphs' } });
        fireEvent.change(screen.getByLabelText('Series Number (optional):'), { target: { value: '1' } });
        fireEvent.change(screen.getByLabelText('Book Format (optional):'), { target: { value: 'Paperback' } });
        fireEvent.click(screen.getByLabelText('Needs Replacement'));

        fireEvent.click(screen.getByRole('button', { name: 'Add Book' }));

        await waitFor(() => {
            expect(mockAddBook).toHaveBeenCalledWith(
                expect.objectContaining({
                    seriesName: 'Animorphs',
                    seriesNumber: 1,
                    bookFormat: 'Paperback',
                    needsReplacement: true
                })
            );
        });
    });

    it('clears ISBN field when Clear and enter manually is clicked', async () => {
        const lookupData = {
            title: 'The Hobbit',
            authors: ['J.R.R. Tolkien'],
            isbn: '9780547928227',
            publisher: 'Houghton Mifflin',
            publishDate: '1937',
            pageCount: 310,
            description: 'A fantasy novel.',
            subjects: [],
            coverSmall: '',
            coverMedium: '',
            coverLarge: '',
            providerUrl: '',
            seriesName: '',
            seriesNotFound: false
        };
        mockLookupBookByIsbn.mockResolvedValue(lookupData);

        render(<BookForm />);
        fireEvent.change(screen.getByLabelText(/UPC.*ISBN:/), { target: { value: '9780547928227' } });
        fireEvent.click(screen.getByRole('button', { name: 'Lookup' }));

        await waitFor(() => {
            expect(screen.getByLabelText('Title:')).toHaveValue('The Hobbit');
        });

        fireEvent.click(screen.getByRole('button', { name: 'Clear and enter manually' }));

        expect(screen.getByLabelText(/UPC.*ISBN:/)).toHaveValue('');
    });

    it('pre-populates book format from lookup result', async () => {
        const lookupData = {
            title: 'The Hobbit',
            authors: ['J.R.R. Tolkien'],
            isbn: '9780547928227',
            publisher: 'Houghton Mifflin',
            publishDate: '1937',
            pageCount: 310,
            description: 'A fantasy novel.',
            subjects: [],
            coverSmall: '',
            coverMedium: '',
            coverLarge: '',
            providerUrl: '',
            seriesName: '',
            seriesNotFound: false,
            bookFormat: 'Paperback' as const
        };
        mockLookupBookByIsbn.mockResolvedValue(lookupData);

        render(<BookForm />);
        fireEvent.change(screen.getByLabelText(/UPC.*ISBN:/), { target: { value: '9780547928227' } });
        fireEvent.click(screen.getByRole('button', { name: 'Lookup' }));

        await waitFor(() => {
            expect(screen.getByLabelText('Book Format (optional):')).toHaveValue('Paperback');
        });
    });

    it('maps numeric lookup book format enum values to dropdown options', async () => {
        const lookupData = {
            title: 'The Hobbit',
            authors: ['J.R.R. Tolkien'],
            isbn: '9780547928227',
            publisher: 'Houghton Mifflin',
            publishDate: '1937',
            pageCount: 310,
            description: 'A fantasy novel.',
            subjects: [],
            coverSmall: '',
            coverMedium: '',
            coverLarge: '',
            providerUrl: '',
            seriesName: '',
            seriesNotFound: false,
            bookFormat: 1
        };
        mockLookupBookByIsbn.mockResolvedValue(lookupData as never);

        render(<BookForm />);
        fireEvent.change(screen.getByLabelText(/UPC.*ISBN:/), { target: { value: '9780547928227' } });
        fireEvent.click(screen.getByRole('button', { name: 'Lookup' }));

        await waitFor(() => {
            expect(screen.getByLabelText('Book Format (optional):')).toHaveValue('Hardcover');
        });
    });
});
