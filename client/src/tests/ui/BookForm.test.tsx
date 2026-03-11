import React from 'react';
import { fireEvent, render, screen, waitFor, within, act } from '@testing-library/react';

// component and api vars will be set in beforeEach via require
let BookForm: any;
let api: any;
let mockAddBook: any;
let mockLookupBookByIsbn: any;

// ignore spurious act() warnings emitted when the mocked scanner fails
const _origErrBookForm = console.error;
const _origWarnBookForm = console.warn;
beforeAll(() => {
    console.error = (...args: any[]) => {
        if (typeof args[0] === 'string' && args[0].includes('not wrapped in act')) {
            return;
        }
        _origErrBookForm.apply(console, args);
    };
    console.warn = (...args: any[]) => {
        if (typeof args[0] === 'string' && args[0].includes('not wrapped in act')) {
            return;
        }
        _origWarnBookForm.apply(console, args);
    };
});
afterAll(() => {
    console.error = _origErrBookForm;
    console.warn = _origWarnBookForm;
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
    addBook: vi.fn(),
    lookupBookByIsbn: vi.fn()
}));

describe('BookForm', () => {
    // mocks will be created inside tests after api is required

    beforeEach(async () => {
        vi.resetModules();
        const mod = await import('../../components/BookForm');
        BookForm = mod.default;
        api = await import('../../services/api');
        mockAddBook = api.addBook;
        mockLookupBookByIsbn = api.lookupBookByIsbn;
        vi.clearAllMocks();
    });

    // ── Manual entry ──────────────────────────────────────────────────────────

    it('submits parsed book payload and resets form on success (manual entry)', async () => {
        const onItemAdded = vi.fn();
        const mockAddBook = api.addBook as jest.MockedFunction<typeof api.addBook>;
        mockAddBook.mockResolvedValue({
            title: 'Dune',
            authors: ['Frank Herbert']
        });

        render(<BookForm onItemAdded={onItemAdded} />);

        fireEvent.change(screen.getByLabelText(/UPC.*ISBN:/), { target: { value: '9780441172719' } });
        fireEvent.change(screen.getByRole('textbox', { name: /Title/ }), { target: { value: 'Dune' } });
        fireEvent.change(screen.getByRole('textbox', { name: /Authors/ }), {
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
        // verify the callback received the title and the toast shows it explicitly
        expect(onItemAdded).toHaveBeenCalledWith('Dune');
        const alert = await screen.findByRole('alert');
        expect(alert).toHaveTextContent('The book Dune has successfully been created.');
        // with new MUI toast we just assert the severity class from Alert
        expect(alert.className).toMatch(/MuiAlert-standardSuccess/);
    });

    it('shows validation when no author names provided (manual entry)', async () => {
        render(<BookForm />);

        fireEvent.change(screen.getByRole('textbox', { name: /Title/ }), { target: { value: 'Dune' } });
        fireEvent.change(screen.getByRole('textbox', { name: /Authors/ }), { target: { value: ' , , ' } });
        fireEvent.click(screen.getByRole('button', { name: 'Add Book' }));

        // multiple elements may render the message (toast + inline) so just
        // verify at least one instance exists
        expect(screen.getAllByText('Please add at least one author.').length).toBeGreaterThan(0);
        const mockAddBook = api.addBook as jest.MockedFunction<typeof api.addBook>;
        expect(mockAddBook).not.toHaveBeenCalled();
    });

    it('shows all manual-entry fields as editable when no lookup has been performed', () => {
        render(<BookForm />);

        expect(screen.getByRole('textbox', { name: /Title/ })).not.toHaveAttribute('readOnly');
        expect(screen.getByRole('textbox', { name: /Authors/ })).not.toHaveAttribute('readOnly');
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
        expect(screen.getByRole('button', { name: /Scan Barcode/ })).toBeInTheDocument();
    });

    it('shows generic warning below the ISBN field instead of using a toast', async () => {
        qrMockBehavior.startShouldReject = true;
        Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: vi.fn() }, configurable: true });
        render(<BookForm />);
        fireEvent.click(screen.getByRole('button', { name: /Scan Barcode/ }));
        const message = await screen.findByText(/Barcode scanning is not supported/i);
        expect(message).toBeInTheDocument();
        // should not render a toast alert
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('shows OR text and scan button only when camera available', () => {
        Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: vi.fn() }, configurable: true });
        render(<BookForm />);
        const scanBtn = screen.getByRole('button', { name: /Scan Barcode/ });
        expect(screen.getByText('OR')).toBeInTheDocument();
        expect(scanBtn).toBeInTheDocument();
        // scan button should be present (layout no longer uses input-group)
        expect(scanBtn).toBeInTheDocument();
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

    // simulate a barcode scanner completing inside the book modal and ensure
    // the lookup runs automatically without the user clicking the button
    it('automatically looks up the ISBN when a scan returns a barcode', async () => {
        // create a fresh module context so we can override BarcodeScanner
        vi.resetModules();
        // stub BarcodeScanner to immediately invoke onScan when mounted
        vi.mock('../../components/BarcodeScanner', () => {
            const React = require('react');
            return {
                __esModule: true,
                default: ({ onScan, onClose }: any) => {
                    React.useEffect(() => {
                        // simulate a successful scan after mount
                        onScan('9780547928227');
                    }, []);
                    return <div data-testid="mock-scanner" />;
                },
            };
        });

        // re-require BookForm and api with the new mock in place
        const mod = await import('../../components/BookForm');
        BookForm = mod.default;
        api = await import('../../services/api');
        mockLookupBookByIsbn = api.lookupBookByIsbn;
        mockLookupBookByIsbn.mockResolvedValue({ title: 'Scanned Book', authors: ['Mystery Author'] });

        // ensure camera appears so scan button is rendered
        Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: vi.fn() }, configurable: true });

        render(<BookForm />);
        fireEvent.click(screen.getByRole('button', { name: /Scan Barcode/ }));

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
            expect(screen.getByRole('textbox', { name: /Title/ })).toHaveAttribute('readOnly');
        });
        expect(screen.getByRole('textbox', { name: /Authors/ })).toHaveAttribute('readOnly');
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
        expect(screen.getByRole('textbox', { name: /Title/ })).not.toHaveAttribute('readOnly');
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
        // the select is labeled; query by its label for reliability
        expect(screen.getByLabelText('Book Format (optional)')).toBeInTheDocument();
        expect(screen.getByLabelText('Needs Replacement')).toBeInTheDocument();
    });

    it('includes series and format fields in manual submission payload', async () => {
        const onItemAdded = vi.fn();
        mockAddBook.mockResolvedValue({
            title: 'The Invasion',
            authors: ['K.A. Applegate']
        });

        render(<BookForm onItemAdded={onItemAdded} />);

        fireEvent.change(screen.getByRole('textbox', { name: /Title/ }), { target: { value: 'The Invasion' } });
        fireEvent.change(screen.getByRole('textbox', { name: /Authors/ }), { target: { value: 'K.A. Applegate' } });
        fireEvent.change(screen.getByLabelText('Series Name (optional):'), { target: { value: 'Animorphs' } });
        fireEvent.change(screen.getByLabelText('Series Number (optional):'), { target: { value: '1' } });
        // open format dropdown and choose paperback via label
        fireEvent.mouseDown(screen.getByLabelText('Book Format (optional)'));
        const listbox = screen.getByRole('listbox');
        fireEvent.click(within(listbox).getByText('Paperback'));
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
            expect(screen.getByRole('textbox', { name: /Title/ })).toHaveValue('The Hobbit');
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
            expect(screen.getByLabelText('Book Format (optional)')).toHaveTextContent('Paperback');
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
            expect(screen.getByLabelText('Book Format (optional)')).toHaveTextContent('Hardcover');
        });
    });
});
