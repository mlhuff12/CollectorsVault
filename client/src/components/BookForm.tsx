import React, { useState, useCallback } from 'react';
import { addBook, lookupBookByIsbn } from '../services/api';
import { Book, BookFormat, BookLookupResult } from '../models';
import BarcodeScanner from './BarcodeScanner';
import Toast from './Toast';

/** Props accepted by {@link BookForm}. */
interface BookFormProps {
    /** Called after a book is successfully added, allowing the parent to refresh its list. */
    onItemAdded?: () => void;
}

const bookFormatByEnumValue: Record<number, BookFormat> = {
    0: 'Unknown',
    1: 'Hardcover',
    2: 'Paperback',
    3: 'MassMarketPaperback',
    4: 'TradePaperback',
    5: 'BoardBook',
    6: 'LibraryBinding',
    7: 'SpiralBound',
    8: 'EBook',
    9: 'Audiobook',
    10: 'Other'
};

const bookFormatEnumValues = Object.keys(bookFormatByEnumValue)
    .map((key) => Number(key))
    .filter((key) => Number.isInteger(key));
const minBookFormatEnumValue = Math.min(...bookFormatEnumValues);
const maxBookFormatEnumValue = Math.max(...bookFormatEnumValues);

const toBookFormat = (value: unknown): BookFormat | '' => {
    if (typeof value === 'number') {
        if (!Number.isInteger(value) || value < minBookFormatEnumValue || value > maxBookFormatEnumValue) {
            return '';
        }

        return bookFormatByEnumValue[value] ?? '';
    }

    if (typeof value !== 'string') {
        return '';
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return '';
    }

    if (/^\d+$/.test(trimmed)) {
        const numericValue = Number(trimmed);
        if (!Number.isInteger(numericValue) || numericValue < minBookFormatEnumValue || numericValue > maxBookFormatEnumValue) {
            return '';
        }

        return bookFormatByEnumValue[numericValue] ?? '';
    }

    switch (trimmed) {
        case 'Unknown':
        case 'Hardcover':
        case 'Paperback':
        case 'MassMarketPaperback':
        case 'TradePaperback':
        case 'BoardBook':
        case 'LibraryBinding':
        case 'SpiralBound':
        case 'EBook':
        case 'Audiobook':
        case 'Other':
            return trimmed;
        default:
            return '';
    }
};

/**
 * BookForm renders a form for adding a new book to the authenticated user's vault.
 *
 * The user may either:
 * 1. Enter an ISBN and click "Lookup" (or scan a barcode with 📷) to auto-populate all
 *    fields from an external book metadata service. After a successful lookup the fields
 *    become read-only and the medium cover image is displayed.
 * 2. Fill in all fields manually (no lookup), in which case every field is editable.
 *
 * On submission the form calls the API and notifies the parent via `onItemAdded`.
 */
const BookForm: React.FC<BookFormProps> = ({ onItemAdded }) => {
    const [isbn, setIsbn] = useState('');
    const [lookupResult, setLookupResult] = useState<BookLookupResult | null>(null);
    const [lookupError, setLookupError] = useState('');
    const [isLooking, setIsLooking] = useState(false);
    const [showScanner, setShowScanner] = useState(false);

    // Manual-entry fields (used only when no lookup result is present)
    const [title, setTitle] = useState('');
    const [authors, setAuthors] = useState('');
    const [publisher, setPublisher] = useState('');
    const [publishDateString, setPublishDateString] = useState('');
    const [pageCount, setPageCount] = useState('');
    const [description, setDescription] = useState('');
    const [bookUrl, setBookUrl] = useState('');

    // Series fields (always editable; pre-populated from lookup when available)
    const [seriesName, setSeriesName] = useState('');
    const [seriesNumber, setSeriesNumber] = useState('');

    // Collector-managed fields (always editable; not from lookup)
    const [bookFormat, setBookFormat] = useState<BookFormat | ''>('');
    const [needsReplacement, setNeedsReplacement] = useState(false);

    const [errorMessage, setErrorMessage] = useState('');
    const [toastMessage, setToastMessage] = useState('');

    /** True when fields should be locked because data came from an ISBN lookup. */
    const isFromLookup = lookupResult !== null;

    const handleLookup = async () => {
        const trimmedIsbn = isbn.trim();
        if (!trimmedIsbn) return;

        setIsLooking(true);
        setLookupError('');
        setLookupResult(null);
        setSeriesName('');
        setSeriesNumber('');

        try {
            const result = await lookupBookByIsbn(trimmedIsbn);
            setLookupResult(result);
            if (result.seriesName) setSeriesName(result.seriesName);
            if (result.seriesNumber != null) setSeriesNumber(result.seriesNumber.toString());
            setBookFormat(toBookFormat(result.bookFormat));
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
        setIsbn('');
        setSeriesName('');
        setSeriesNumber('');
    };

    /** Called when the barcode scanner successfully decodes a barcode. */
    const handleBarcodeScan = useCallback(async (barcode: string) => {
        setShowScanner(false);
        setIsbn(barcode);
        setIsLooking(true);
        setLookupError('');
        setLookupResult(null);
        setSeriesName('');
        setSeriesNumber('');

        try {
            const result = await lookupBookByIsbn(barcode);
            setLookupResult(result);
            if (result.seriesName) setSeriesName(result.seriesName);
            if (result.seriesNumber != null) setSeriesNumber(result.seriesNumber.toString());
            setBookFormat(toBookFormat(result.bookFormat));
        } catch {
            setLookupError('Book not found for this barcode. You may enter details manually.');
        } finally {
            setIsLooking(false);
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage('');

        let newBook: Book;
        if (lookupResult) {
            newBook = {
                title: lookupResult.title,
                authors: lookupResult.authors,
                isbn: lookupResult.isbn || isbn.trim() || undefined,
                publisher: lookupResult.publisher || undefined,
                publishDateString: lookupResult.publishDate || undefined,
                pageCount: lookupResult.pageCount,
                description: lookupResult.description || undefined,
                subjects: lookupResult.subjects.length > 0 ? lookupResult.subjects.map(s => s.key) : undefined,
                coverSmall: lookupResult.coverSmall || undefined,
                coverMedium: lookupResult.coverMedium || undefined,
                coverLarge: lookupResult.coverLarge || undefined,
                bookUrl: lookupResult.providerUrl || undefined,
                seriesName: seriesName.trim() || undefined,
                seriesNumber: seriesNumber.trim() ? parseInt(seriesNumber, 10) : undefined,
                bookFormat: bookFormat || undefined,
                needsReplacement: needsReplacement
            };
        } else {
            const parsedAuthors = authors
                .split(',')
                .map((a) => a.trim())
                .filter((a) => a.length > 0);

            if (parsedAuthors.length === 0) {
                setErrorMessage('Please add at least one author.');
                return;
            }

            newBook = {
                title,
                authors: parsedAuthors,
                isbn: isbn.trim() || undefined,
                publisher: publisher.trim() || undefined,
                publishDateString: publishDateString.trim() || undefined,
                pageCount: pageCount.trim() ? parseInt(pageCount, 10) : undefined,
                description: description.trim() || undefined,
                bookUrl: bookUrl.trim() || undefined,
                seriesName: seriesName.trim() || undefined,
                seriesNumber: seriesNumber.trim() ? parseInt(seriesNumber, 10) : undefined,
                bookFormat: bookFormat || undefined,
                needsReplacement: needsReplacement
            };
        }

        try {
            await addBook(newBook);
            setIsbn('');
            setLookupResult(null);
            setLookupError('');
            setTitle('');
            setAuthors('');
            setPublisher('');
            setPublishDateString('');
            setPageCount('');
            setDescription('');
            setBookUrl('');
            setSeriesName('');
            setSeriesNumber('');
            setBookFormat('');
            setNeedsReplacement(false);
            setToastMessage('Book added successfully!');
            onItemAdded?.();
        } catch {
            setErrorMessage('Failed to add book. Please try again.');
        }
    };

    // Resolved display values (from lookup or manual entry)
    const displayTitle = lookupResult ? lookupResult.title : title;
    const displayAuthors = lookupResult ? lookupResult.authors.join(', ') : authors;
    const displayPublisher = lookupResult ? lookupResult.publisher : publisher;
    const displayPublishDate = lookupResult ? lookupResult.publishDate : publishDateString;
    const displayPageCount = lookupResult ? (lookupResult.pageCount?.toString() ?? '') : pageCount;
    const displayDescription = lookupResult ? lookupResult.description : description;
    const displayBookUrl = lookupResult ? lookupResult.providerUrl : bookUrl;

    return (
        <div>
            <h2 className="h5 mb-3">Add a New Book</h2>
            <form onSubmit={handleSubmit}>
                {/* ISBN + Lookup + Scan */}
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
                        <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => setShowScanner((prev) => !prev)}
                            disabled={isLooking}
                            aria-label="Scan Barcode"
                        >
                            {isLooking ? 'Looking up…' : '📷 Scan Barcode'}
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
                    {showScanner && (
                        <BarcodeScanner
                            onScan={handleBarcodeScan}
                            onClose={() => setShowScanner(false)}
                        />
                    )}
                </div>

                {/* Medium cover image (shown after successful lookup) */}
                {lookupResult?.coverMedium && (
                    <div className="mb-3">
                        <img
                            src={lookupResult.coverMedium}
                            alt={`Cover for ${lookupResult.title}`}
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
                        onChange={(e) => { if (!isFromLookup) setPublishDateString(e.target.value); }}
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

                {/* Series Name */}
                <div className="mb-3">
                    <label htmlFor="book-series-name" className="form-label">Series Name (optional):</label>
                    {lookupResult?.seriesNotFound && (
                        <div className="form-text text-warning mb-1">
                            This book appears to be part of a series, but we couldn't determine some of the series details. Please enter the missing series information.
                        </div>
                    )}
                    <input
                        id="book-series-name"
                        type="text"
                        className="form-control"
                        value={seriesName}
                        onChange={(e) => setSeriesName(e.target.value)}
                        placeholder="e.g. Animorphs"
                        autoComplete="off"
                    />
                </div>

                {/* Series Number */}
                <div className="mb-3">
                    <label htmlFor="book-series-number" className="form-label">Series Number (optional):</label>
                    <input
                        id="book-series-number"
                        type="number"
                        className="form-control"
                        value={seriesNumber}
                        onChange={(e) => setSeriesNumber(e.target.value)}
                        placeholder="e.g. 1"
                        min={1}
                        autoComplete="off"
                    />
                </div>

                {/* Book Format */}
                <div className="mb-3">
                    <label htmlFor="book-format" className="form-label">Book Format (optional):</label>
                    <select
                        id="book-format"
                        className="form-select"
                        value={bookFormat}
                        onChange={(e) => {
                            const nextValue = e.target.value;
                            setBookFormat(toBookFormat(nextValue));
                        }}
                    >
                        <option value="">— Select format —</option>
                        <option value="Hardcover">Hardcover</option>
                        <option value="Paperback">Paperback</option>
                        <option value="MassMarketPaperback">Mass Market Paperback</option>
                        <option value="TradePaperback">Trade Paperback</option>
                        <option value="BoardBook">Board Book</option>
                        <option value="LibraryBinding">Library Binding</option>
                        <option value="SpiralBound">Spiral-Bound</option>
                        <option value="EBook">eBook</option>
                        <option value="Audiobook">Audiobook</option>
                        <option value="Other">Other</option>
                    </select>
                </div>

                {/* Needs Replacement */}
                <div className="mb-3 form-check">
                    <input
                        id="book-needs-replacement"
                        type="checkbox"
                        className="form-check-input"
                        checked={needsReplacement}
                        onChange={(e) => setNeedsReplacement(e.target.checked)}
                    />
                    <label htmlFor="book-needs-replacement" className="form-check-label">Needs Replacement</label>
                </div>

                <button className="btn btn-primary" type="submit">Add Book</button>
            </form>
            {errorMessage && <p className="mt-2 text-danger">{errorMessage}</p>}
            <Toast
                message={toastMessage}
                type="success"
                onDismiss={() => setToastMessage('')}
            />
        </div>
    );
};

export default BookForm;
