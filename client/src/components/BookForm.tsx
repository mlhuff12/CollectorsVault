import React, { useState, useCallback } from 'react';
import { addBook, lookupBookByIsbn } from '../services/api';
import { Book } from '../types';
import BarcodeScanner from './BarcodeScanner';
import Toast from './Toast';

/** Props accepted by {@link BookForm}. */
interface BookFormProps {
    /** Called after a book is successfully added, allowing the parent to refresh its list. */
    onItemAdded?: () => void;
}

/**
 * BookForm renders a form for adding a new book to the authenticated user's vault.
 * On submission it calls the API and notifies the parent via `onItemAdded`.
 * A "Scan Barcode" button opens the camera to scan an ISBN barcode and auto-fills the form.
 */
const BookForm: React.FC<BookFormProps> = ({ onItemAdded }) => {
    const [title, setTitle] = useState('');
    const [authors, setAuthors] = useState('');
    const [isbn, setIsbn] = useState('');
    const [year, setYear] = useState('');
    const [genre, setGenre] = useState('');
    const [message, setMessage] = useState('');
    const [showScanner, setShowScanner] = useState(false);
    const [scanLoading, setScanLoading] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error'>('success');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const parsedAuthors = authors
            .split(',')
            .map((authorName) => authorName.trim())
            .filter((authorName) => authorName.length > 0);

        if (parsedAuthors.length === 0) {
            setMessage('Please add at least one author.');
            return;
        }

        const newBook: Book = {
            title,
            authors: parsedAuthors,
            isbn: isbn.trim() || undefined,
            year: year.trim() ? parseInt(year, 10) : undefined,
            genre: genre.trim() || undefined
        };

        try {
            await addBook(newBook);
            setMessage('');
            setTitle('');
            setAuthors('');
            setIsbn('');
            setYear('');
            setGenre('');
            setToastMessage('Book added successfully!');
            setToastType('success');
            onItemAdded?.();
        } catch (error) {
            setMessage('Failed to add book. Please try again.');
        }
    };

    const handleBarcodeScan = useCallback(async (barcode: string) => {
        setShowScanner(false);
        setScanLoading(true);
        setMessage('');
        try {
            const result = await lookupBookByIsbn(barcode);
            setTitle(result.title || '');
            setAuthors((result.authors ?? []).join(', '));
            setIsbn(result.isbn || barcode);
            if (result.publishDate) {
                const yearNum = parseInt(result.publishDate, 10);
                if (!isNaN(yearNum)) setYear(String(yearNum));
            }
            if (result.subjects && result.subjects.length > 0) {
                setGenre(result.subjects[0]);
            }
        } catch {
            setMessage('Could not find book for this barcode. Fill in manually.');
            setIsbn(barcode);
        } finally {
            setScanLoading(false);
        }
    }, []);

    return (
        <div>
            <h2 className="h5 mb-3">Add a New Book</h2>
            <form onSubmit={handleSubmit}>
                <div className="mb-3">
                    <label className="form-label">Title:</label>
                    <input type="text" className="form-control" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div className="mb-3">
                    <label className="form-label">Authors (comma-separated):</label>
                    <input
                        type="text"
                        className="form-control"
                        value={authors}
                        onChange={(e) => setAuthors(e.target.value)}
                        placeholder="Author One, Author Two"
                        required
                    />
                </div>
                <div className="mb-3">
                    <label className="form-label">ISBN (optional):</label>
                    <div className="d-flex gap-2 align-items-center">
                        <input
                            type="text"
                            className="form-control"
                            value={isbn}
                            onChange={(e) => setIsbn(e.target.value)}
                        />
                        <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm text-nowrap"
                            onClick={() => setShowScanner((prev) => !prev)}
                            disabled={scanLoading}
                        >
                            {scanLoading ? 'Looking up…' : '📷 Scan Barcode'}
                        </button>
                    </div>
                    {showScanner && (
                        <BarcodeScanner
                            onScan={handleBarcodeScan}
                            onClose={() => setShowScanner(false)}
                        />
                    )}
                </div>
                <div className="mb-3">
                    <label className="form-label">Year (optional):</label>
                    <input type="number" className="form-control" value={year} onChange={(e) => setYear(e.target.value)} />
                </div>
                <div className="mb-3">
                    <label className="form-label">Genre (optional):</label>
                    <input type="text" className="form-control" value={genre} onChange={(e) => setGenre(e.target.value)} />
                </div>
                <button className="btn btn-primary" type="submit">Add Book</button>
            </form>
            {message && <p className="mt-2 text-success">{message}</p>}
            <Toast
                message={toastMessage}
                type={toastType}
                onDismiss={() => setToastMessage('')}
            />
        </div>
    );
};

export default BookForm;