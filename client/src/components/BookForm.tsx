import React, { useState, useCallback, useEffect } from 'react';
import { addBook, lookupBookByIsbn } from '../services/api';
import { Book, BookFormat, BookLookupResult } from '../models';
import BarcodeScanLookup from './BarcodeScanLookup';
import Toast from './Toast';
import {
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Typography,
} from '@mui/material';

/** Props accepted by {@link BookForm}. */
interface BookFormProps {
    /**
     * Called after a book is successfully added, allowing the parent to refresh
     * its list.  If the caller cares about the title of the new book (for
     * example to show a page‑level toast) it may accept a single string
     * argument containing the title; the argument will be undefined when the
     * caller doesn’t declare a parameter.
     */
    onItemAdded?: (title?: string) => void;
    hideSubmit?: boolean;
    hideTitle?: boolean;
    /**
     * Called whenever the set of non-empty fields changes.  Used by the parent
     * to enable/disable a modal-level reset button.
     */
    onDirtyChange?: (dirty: boolean) => void;
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
// a handle exposed to parent components via ref
export interface BookFormHandle {
    requestSubmit: () => void;
    reset: () => void;
}

const BookForm = React.forwardRef<BookFormHandle, BookFormProps>(({
    onItemAdded,
    hideSubmit = false,
    hideTitle = false,
    onDirtyChange,
}, ref) => {
    const innerFormRef = React.useRef<HTMLFormElement>(null);
    const [isbn, setIsbn] = useState('');
    const [lookupResult, setLookupResult] = useState<BookLookupResult | null>(null);
    const [lookupError, setLookupError] = useState('');
    const [isLooking, setIsLooking] = useState(false);

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
    const [toastType, setToastType] = useState<'success' | 'error'>('success');

    /** True when fields should be locked because data came from an ISBN lookup. */
    const isFromLookup = lookupResult !== null;

    // keep parent informed of whether any values exist in the form; this
    // is deliberately computed from all state fields so that lookup results
    // count as dirty as well. the parent uses it to control the modal reset
    // button.
    const computeDirty = () => {
        // any truthy field or lookup result indicates dirty
        return (
            !!isbn ||
            isFromLookup ||
            !!title ||
            !!authors ||
            !!publisher ||
            !!publishDateString ||
            !!pageCount ||
            !!description ||
            !!bookUrl ||
            !!seriesName ||
            !!seriesNumber ||
            bookFormat !== '' ||
            needsReplacement
        );
    };

    React.useImperativeHandle(ref, () => ({
        requestSubmit: () => innerFormRef.current?.requestSubmit(),
        reset: () => {
            // clear all state fields
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
            setErrorMessage('');
            setToastMessage('');
            setToastType('success');
        }
    }));
    useEffect(() => {
        onDirtyChange?.(computeDirty());
    }, [
        isbn,
        isFromLookup,
        title,
        authors,
        publisher,
        publishDateString,
        pageCount,
        description,
        bookUrl,
        seriesName,
        seriesNumber,
        bookFormat,
        needsReplacement,
        onDirtyChange,
    ]);

    // lookup either the current isbn state or a value provided by the caller
    const handleLookup = async (barcode?: string) => {
        const trimmedIsbn = (barcode ?? isbn).trim();
        if (!trimmedIsbn) return;

        setIsLooking(true);
        setLookupError('');
        setLookupResult(null);
        setSeriesName('');
        setSeriesNumber('');

        // some barcodes are 12‑digit UPC-A codes that really represent an
        // ISBN-13 with a leading zero. the OpenLibrary service expects the
        // 13‑digit form, so normalize before hitting the API. we still trim the
        // input above so whitespace can't sneak in.
        let queryIsbn = trimmedIsbn;
        try {
            if (/^\d{12}$/.test(queryIsbn)) {
                queryIsbn = `0${queryIsbn}`;
            }

            const result = await lookupBookByIsbn(queryIsbn);
            // the backend returns a non-null object even when nothing can be found.
            // treat an empty title as a failed lookup by logging and showing the
            // regular "not found" message instead of throwing.
            if (!result || !result.title?.trim()) {
                console.log('ISBN lookup returned no title, treating as miss', result);
                setLookupError(
                    `Book not found for ISBN ${queryIsbn}. You may enter details manually.`
                );
                return;
            }

            setLookupResult(result);
            if (result.seriesName) setSeriesName(result.seriesName);
            if (result.seriesNumber != null) setSeriesNumber(result.seriesNumber.toString());
            setBookFormat(toBookFormat(result.bookFormat));
        } catch {
            setLookupError(
                `Book not found for ISBN ${queryIsbn}. You may enter details manually.`
            );
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
            // include the actual title in the toast so that callers (especially the
            // modal case) can show a more descriptive message.  The toast type is
            // always `success` which yields the green background the design
            // requires.
            const toastText = `The book ${displayTitle} has successfully been created.`;
            setToastMessage(toastText);
            onItemAdded?.(displayTitle);
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
            {!hideTitle && (
                <Typography variant="h5" sx={{ mb: 3 }}>
                    Add a New Book
                </Typography>
            )}
            <form onSubmit={handleSubmit} ref={innerFormRef}>
                <Box display="flex" flexDirection="column" gap={2}>
                    {/* ISBN + Lookup + Scan (reuse existing component) */}
                    <BarcodeScanLookup
                        label="Barcode / ISBN:"
                        maxLength={13}
                        value={isbn}
                        onChange={(v: string) => {
                            setIsbn(v);
                            if (isFromLookup) handleClearLookup();
                        }}
                        onLookup={handleLookup}
                        error={lookupError}
                    />


                    {lookupResult?.coverMedium && (
                        <Box mb={2}>
                            <img
                                src={lookupResult.coverMedium}
                                alt={`Cover for ${lookupResult.title}`}
                                style={{ maxHeight: '200px' }}
                            />
                        </Box>
                    )}

                    <TextField
                        label="Title:"
                        fullWidth
                        required
                        value={displayTitle}
                        onChange={(e) => { if (!isFromLookup) setTitle(e.target.value); }}
                        InputProps={{ readOnly: isFromLookup }}
                    />

                    <TextField
                        label="Authors (comma-separated):"
                        fullWidth
                        required={!isFromLookup}
                        value={displayAuthors}
                        onChange={(e) => { if (!isFromLookup) setAuthors(e.target.value); }}
                        InputProps={{ readOnly: isFromLookup }}
                    />

                    <TextField
                        label="Publisher:"
                        fullWidth
                        value={displayPublisher}
                        onChange={(e) => { if (!isFromLookup) setPublisher(e.target.value); }}
                        InputProps={{ readOnly: isFromLookup }}
                    />

                    <TextField
                        label="Publish Date:"
                        fullWidth
                        value={displayPublishDate}
                        onChange={(e) => { if (!isFromLookup) setPublishDateString(e.target.value); }}
                        InputProps={{ readOnly: isFromLookup }}
                    />

                    <TextField
                        label="Page Count:"
                        type="number"
                        fullWidth
                        value={displayPageCount}
                        onChange={(e) => { if (!isFromLookup) setPageCount(e.target.value); }}
                        InputProps={{ readOnly: isFromLookup }}
                    />

                    <TextField
                        label="Description:"
                        fullWidth
                        multiline
                        rows={3}
                        value={displayDescription}
                        onChange={(e) => { if (!isFromLookup) setDescription(e.target.value); }}
                        InputProps={{ readOnly: isFromLookup }}
                    />

                    <TextField
                        label="Book URL:"
                        fullWidth
                        value={displayBookUrl}
                        onChange={(e) => { if (!isFromLookup) setBookUrl(e.target.value); }}
                        InputProps={{ readOnly: isFromLookup }}
                    />

                    {lookupResult?.seriesNotFound && (
                        <Typography color="warning.main" variant="body2">
                            This book appears to be part of a series, but we couldn't determine some of the series details. Please enter the missing series information.
                        </Typography>
                    )}

                    <TextField
                        label="Series Name (optional):"
                        fullWidth
                        value={seriesName}
                        onChange={(e) => setSeriesName(e.target.value)}
                    />

                    <TextField
                        label="Series Number (optional):"
                        fullWidth
                        type="number"
                        value={seriesNumber}
                        onChange={(e) => setSeriesNumber(e.target.value)}
                        inputProps={{ min: 1 }}
                    />

                    <FormControl fullWidth>
                        <InputLabel id="book-format-label">Book Format (optional)</InputLabel>
                        <Select
                            labelId="book-format-label"
                            label="Book Format (optional)"
                            value={bookFormat}
                            onChange={(e) => {
                                const nextValue = e.target.value;
                                setBookFormat(toBookFormat(nextValue));
                            }}
                        >
                            <MenuItem value=""><em>— Select format —</em></MenuItem>
                            <MenuItem value="Hardcover">Hardcover</MenuItem>
                            <MenuItem value="Paperback">Paperback</MenuItem>
                            <MenuItem value="MassMarketPaperback">Mass Market Paperback</MenuItem>
                            <MenuItem value="TradePaperback">Trade Paperback</MenuItem>
                            <MenuItem value="BoardBook">Board Book</MenuItem>
                            <MenuItem value="LibraryBinding">Library Binding</MenuItem>
                            <MenuItem value="SpiralBound">Spiral-Bound</MenuItem>
                            <MenuItem value="EBook">eBook</MenuItem>
                            <MenuItem value="Audiobook">Audiobook</MenuItem>
                            <MenuItem value="Other">Other</MenuItem>
                        </Select>
                    </FormControl>

                    <FormControlLabel
                        control={<Checkbox checked={needsReplacement} onChange={(e) => setNeedsReplacement(e.target.checked)} />}
                        label="Needs Replacement"
                    />

                    {!hideSubmit && <Button variant="contained" color="primary" type="submit">Add Book</Button>}

                    {errorMessage && <Typography color="error">{errorMessage}</Typography>}
                </Box>
            </form>
            <Toast
                message={toastMessage}
                type="success"
                onDismiss={() => setToastMessage('')}
            />
        </div>
    );
});

export default BookForm;
