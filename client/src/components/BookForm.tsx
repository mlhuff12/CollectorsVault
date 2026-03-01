import React, { useState, useCallback } from 'react';
import { addBook, lookupBookByIsbn } from '../services/api';
import BarcodeScanner from './BarcodeScanner';
import Toast from './Toast';
import { Book, BookLookupResult } from '../types';

/** Props accepted by {@link BookForm}. */
interface BookFormProps {
    /** Called after a book is successfully added, allowing the parent to refresh its list. */
    onItemAdded?: () => void;
}

/**
 * BookForm renders a form for adding a new book to the authenticated user's vault.
 * On submission it calls the API and notifies the parent via `onItemAdded`.
 * A "Scan Barcode" button opens the camera to scan an ISBN barcode and auto-fills the form.
 *
 * The user may either:
 * 1. Enter an ISBN and click "Lookup" to auto-populate all fields from an external
 *    book metadata service. After a successful lookup the fields become read-only and
 *    the medium cover image is displayed.
 * 2. Fill in all fields manually (no lookup), in which case every field is editable.
 *
 * On submission the form calls the API and notifies the parent via `onItemAdded`.
 */
const BookForm: React.FC<BookFormProps> = ({ onItemAdded }) => {
    const [isbn, setIsbn] = useState('');
    const [lookupResult, setLookupResult] = useState<BookLookupResult | null>(null);
    const [lookupError, setLookupError] = useState('');
    const [isLooking, setIsLooking] = useState(false);

    // Manual-entry fields (used only when no lookup result is present)
    const [title, setTitle] = useState('');
    const [authors, setAuthors] = useState('');
    const [publisher, setPublisher] = useState('');
    const [publishDate, setPublishDate] = useState('');
    const [pageCount, setPageCount] = useState('');
    const [description, setDescription] = useState('');
    const [bookUrl, setBookUrl] = useState('');
    const [genre, setGenre] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [showScanner, setShowScanner] = useState(false);
    const [scanLoading, setScanLoading] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error'>('success');
    const [year, setYear] = useState('');

    const [message, setMessage] = useState('');

    /** True when fields should be locked because data came from an ISBN lookup. */
    const isFromLookup = lookupResult !== null;

    const handleLookup = async () => {
        const trimmedIsbn = isbn.trim();
        if (!trimmedIsbn) return;

        setIsLooking(true);
        setLookupError('');
        setLookupResult(null);

        try {
            const result = await lookupBookByIsbn(trimmedIsbn);
            setLookupResult(result);
        } catch {
            setLookupError('Book not found for the given ISBN. You may enter details manually.');
        } finally {
            setIsLooking(false);
        }
    };

    const handleIsbnKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleLookup();
        }
    };

    const handleClearLookup = () => {
        setLookupResult(null);
        setLookupError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const parsedAuthors = authors
            .split(',')
            .map((authorName) => authorName.trim())
            .filter((authorName) => authorName.length > 0);

        if (parsedAuthors.length === 0) {
            setErrorMessage('Please add at least one author.');
            return;
        }

        let newBook: Book;

        if (isFromLookup) {
            newBook = {
                title: lookupResult!.title,
                authors: lookupResult!.authors,
                isbn: lookupResult!.isbn || isbn.trim() || undefined,
                publisher: lookupResult!.publisher || undefined,
                publishDate: lookupResult!.publishDate || undefined,
                pageCount: lookupResult!.pageCount,
                description: lookupResult!.description || undefined,
                subjects: lookupResult!.subjects.length > 0 ? lookupResult!.subjects : undefined,
                coverSmall: lookupResult!.coverSmall || undefined,
                coverMedium: lookupResult!.coverMedium || undefined,
                coverLarge: lookupResult!.coverLarge || undefined,
                bookUrl: lookupResult!.providerUrl || undefined
            };
        } else {
            const parsedAuthors = authors
                .split(',')
                .map((a) => a.trim())
                .filter((a) => a.length > 0);

            if (parsedAuthors.length === 0) {
                setMessage('Please add at least one author.');
                return;
            }

            newBook = {
                title,
                authors: parsedAuthors,
                isbn: isbn.trim() || undefined,
                year: year.trim() ? parseInt(year, 10) : undefined,
                genre: genre.trim() || undefined,
                publisher: publisher.trim() || undefined,
                publishDate: publishDate.trim() || undefined,
                pageCount: pageCount.trim() ? parseInt(pageCount, 10) : undefined,
                description: description.trim() || undefined,
                bookUrl: bookUrl.trim() || undefined
            };
        }

        try {
            await addBook(newBook);
            setErrorMessage('');
            setMessage('Book added successfully!');
            setIsbn('');
            setLookupResult(null);
            setLookupError('');
            setTitle('');
            setAuthors('');
            setPublisher('');
            setPublishDate('');
            setPageCount('');
            setDescription('');
            setBookUrl('');
            setGenre('');
            setToastMessage('Book added successfully!');
            setToastType('success');
            onItemAdded?.();
        } catch (error) {
            setErrorMessage('Failed to add book. Please try again.');
        }
    };

    const handleBarcodeScan = useCallback(async (barcode: string) => {
        setShowScanner(false);
        setScanLoading(true);
        setErrorMessage('');
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
            setErrorMessage('Could not find book for this barcode. Fill in manually.');
            setIsbn(barcode);
        } finally {
            setScanLoading(false);
        }
    }, []);
            setYear('');
            onItemAdded?.();
        } catch {
            setMessage('Failed to add book. Please try again.');
        }
    };

    // Resolved display values (from lookup or manual entry)
    const displayTitle = isFromLookup ? lookupResult!.title : title;
    const displayAuthors = isFromLookup ? lookupResult!.authors.join(', ') : authors;
    const displayPublisher = isFromLookup ? lookupResult!.publisher : publisher;
    const displayPublishDate = isFromLookup ? lookupResult!.publishDate : publishDate;
    const displayPageCount = isFromLookup ? (lookupResult!.pageCount?.toString() ?? '') : pageCount;
    const displayDescription = isFromLookup ? lookupResult!.description : description;
    const displayBookUrl = isFromLookup ? lookupResult!.providerUrl : bookUrl;

    return (
        <div>
            <h2 className="h5 mb-3">Add a New Book</h2>
            <form onSubmit={handleSubmit}>
                {/* ISBN + Lookup */}
                <div className="mb-3">
                    <label htmlFor="book-isbn" className="form-label">ISBN:</label>
                    <div className="input-group">
                        <input
                            id="book-isbn"
                            type="text"
                            className="form-control"
                            value={isbn}
                            onChange={(e) => { setIsbn(e.target.value); if (isFromLookup) handleClearLookup(); }}
                            onKeyDown={handleIsbnKeyDown}
                            placeholder="Enter ISBN-10 or ISBN-13"
                            aria-label="ISBN"
                        />
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={handleLookup}
                            disabled={isLooking || !isbn.trim()}
                            aria-label="Lookup"
                        >
                            {isLooking ? 'Looking up…' : 'Lookup'}
                        </button>
                    </div>
                    {lookupError && <div className="form-text text-warning">{lookupError}</div>}
                    {isFromLookup && (
                        <div className="form-text text-success">
                            Book found! Fields auto-populated.{' '}
                            <button type="button" className="btn btn-link btn-sm p-0" onClick={handleClearLookup}>
                                Clear and enter manually
                            </button>
                        </div>
                    )}
                </div>

                {/* Medium cover image (shown after successful lookup) */}
                {isFromLookup && lookupResult!.coverMedium && (
                    <div className="mb-3">
                        <img
                            src={lookupResult!.coverMedium}
                            alt={`Cover for ${lookupResult!.title}`}
                            style={{ maxHeight: '200px' }}
                        />
                    </div>
                )}

                {/* Title */}
                <div className="mb-3">
                    <label htmlFor="book-title" className="form-label">Title:</label>
                    <input
                        id="book-title"
                        type="text"
                        className="form-control"
                        value={displayTitle}
                        onChange={(e) => { if (!isFromLookup) setTitle(e.target.value); }}
                        readOnly={isFromLookup}
                        required
                    />
                </div>

                {/* Authors */}
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
                    <label htmlFor="book-authors" className="form-label">Authors (comma-separated):</label>
                    <input
                        id="book-authors"
                        type="text"
                        className="form-control"
                        value={displayAuthors}
                        onChange={(e) => { if (!isFromLookup) setAuthors(e.target.value); }}
                        readOnly={isFromLookup}
                        placeholder="Author One, Author Two"
                        required={!isFromLookup}
                    />
                </div>

                {/* Publisher */}
                <div className="mb-3">
                    <label htmlFor="book-publisher" className="form-label">Publisher:</label>
                    <input
                        id="book-publisher"
                        type="text"
                        className="form-control"
                        value={displayPublisher}
                        onChange={(e) => { if (!isFromLookup) setPublisher(e.target.value); }}
                        readOnly={isFromLookup}
                    />
                </div>

                {/* Publish Date */}
                <div className="mb-3">
                    <label htmlFor="book-publish-date" className="form-label">Publish Date:</label>
                    <input
                        id="book-publish-date"
                        type="text"
                        className="form-control"
                        value={displayPublishDate}
                        onChange={(e) => { if (!isFromLookup) setPublishDate(e.target.value); }}
                        readOnly={isFromLookup}
                    />
                </div>

                {/* Page Count */}
                <div className="mb-3">
                    <label htmlFor="book-page-count" className="form-label">Page Count:</label>
                    <input
                        id="book-page-count"
                        type="number"
                        className="form-control"
                        value={displayPageCount}
                        onChange={(e) => { if (!isFromLookup) setPageCount(e.target.value); }}
                        readOnly={isFromLookup}
                    />
                </div>

                {/* Description */}
                <div className="mb-3">
                    <label htmlFor="book-description" className="form-label">Description:</label>
                    <textarea
                        id="book-description"
                        className="form-control"
                        value={displayDescription}
                        onChange={(e) => { if (!isFromLookup) setDescription(e.target.value); }}
                        readOnly={isFromLookup}
                        rows={3}
                    />
                </div>

                {/* Book URL */}
                <div className="mb-3">
                    <label htmlFor="book-url" className="form-label">Book URL:</label>
                    <input
                        id="book-url"
                        type="text"
                        className="form-control"
                        value={displayBookUrl}
                        onChange={(e) => { if (!isFromLookup) setBookUrl(e.target.value); }}
                        readOnly={isFromLookup}
                    />
                </div>

                {/* Manual-only fields (year and genre are not returned by lookup) */}
                {!isFromLookup && (
                    <>
                        <div className="mb-3">
                            <label htmlFor="book-year" className="form-label">Year (optional):</label>
                            <input
                                id="book-year"
                                type="number"
                                className="form-control"
                                value={year}
                                onChange={(e) => setYear(e.target.value)}
                            />
                        </div>
                        <div className="mb-3">
                            <label htmlFor="book-genre" className="form-label">Genre (optional):</label>
                            <input
                                id="book-genre"
                                type="text"
                                className="form-control"
                                value={genre}
                                onChange={(e) => setGenre(e.target.value)}
                            />
                        </div>
                    </>
                )}

                <button className="btn btn-primary" type="submit">Add Book</button>
            </form>
            {errorMessage && <p className="mt-2 text-danger">{errorMessage}</p>}
            <Toast
                message={toastMessage}
                type={toastType}
                onDismiss={() => setToastMessage('')}
            />
        </div>
    );
};

export default BookForm;