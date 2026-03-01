import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import BookForm from '../../components/BookForm';
import * as api from '../../services/api';

jest.mock('../../services/api', () => ({
    addBook: jest.fn(),
    lookupBookByIsbn: jest.fn()
}));

describe('BookForm', () => {
    const mockAddBook = api.addBook as jest.MockedFunction<typeof api.addBook>;
    const mockLookupBookByIsbn = api.lookupBookByIsbn as jest.MockedFunction<typeof api.lookupBookByIsbn>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ── Manual entry ──────────────────────────────────────────────────────────

    it('submits parsed book payload and resets form on success (manual entry)', async () => {
        const onItemAdded = jest.fn();
        mockAddBook.mockResolvedValue({
            id: 1,
            title: 'Dune',
            authors: ['Frank Herbert'],
            category: 'book'
        });

        render(<BookForm onItemAdded={onItemAdded} />);

        fireEvent.change(screen.getByLabelText('ISBN:'), { target: { value: '9780441172719' } });
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
        expect(screen.getByText('Book added successfully!')).toBeInTheDocument();
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
        expect(screen.getByLabelText('Year (optional):')).not.toHaveAttribute('readOnly');
        expect(screen.getByLabelText('Genre (optional):')).not.toHaveAttribute('readOnly');
    });

    // ── Lookup button ─────────────────────────────────────────────────────────

    it('renders the Lookup button next to the ISBN field', () => {
        render(<BookForm />);
        expect(screen.getByRole('button', { name: 'Lookup' })).toBeInTheDocument();
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
            providerUrl: 'https://openlibrary.org/books/OL123'
        };
        mockLookupBookByIsbn.mockResolvedValue(lookupData);

        render(<BookForm />);

        fireEvent.change(screen.getByLabelText('ISBN:'), { target: { value: '9780547928227' } });
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
            providerUrl: 'https://openlibrary.org/books/OL123'
        };
        mockLookupBookByIsbn.mockResolvedValue(lookupData);

        render(<BookForm />);
        fireEvent.change(screen.getByLabelText('ISBN:'), { target: { value: '9780547928227' } });
        fireEvent.click(screen.getByRole('button', { name: 'Lookup' }));

        await waitFor(() => {
            expect(screen.getByLabelText('Title:')).toHaveValue('The Hobbit');
        });

        expect(screen.getByLabelText('Authors (comma-separated):')).toHaveValue('J.R.R. Tolkien');
        expect(screen.getByLabelText('Publisher:')).toHaveValue('Houghton Mifflin');
        expect(screen.getByLabelText('Publish Date:')).toHaveValue('1937');
        expect(screen.getByLabelText('Page Count:')).toHaveValue(310);
        expect(screen.getByLabelText('Description:')).toHaveValue('A fantasy novel.');
        expect(screen.getByLabelText('Book URL:')).toHaveValue('https://openlibrary.org/books/OL123');

        // Medium cover image should be displayed
        const img = screen.getByRole('img', { name: /Cover for The Hobbit/i });
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', 'https://covers.openlibrary.org/b/id/123-M.jpg');
    });

    // ── After lookup: fields are not editable ────────────────────────────────

    it('marks fields as read-only after a successful ISBN lookup', async () => {
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
            providerUrl: ''
        };
        mockLookupBookByIsbn.mockResolvedValue(lookupData);

        render(<BookForm />);
        fireEvent.change(screen.getByLabelText('ISBN:'), { target: { value: '9780547928227' } });
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
        fireEvent.change(screen.getByLabelText('ISBN'), { target: { value: '0000000000' } });
        fireEvent.click(screen.getByRole('button', { name: 'Lookup' }));

        expect(await screen.findByText(/Book not found for the given ISBN/i)).toBeInTheDocument();
        // Fields should remain editable after a failed lookup
        expect(screen.getByLabelText('Title:')).not.toHaveAttribute('readOnly');
    });
});
