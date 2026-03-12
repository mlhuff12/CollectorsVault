import React, { useState, useCallback, useEffect } from 'react';
import { Movie } from '../models';
import { addMovie, lookupMovieByUpc } from '../services/api';
import BarcodeScanLookup from './BarcodeScanLookup';
import Toast from './Toast';
import {
    TextField,
    Button,
    Box,
    Typography,
} from '@mui/material';

/** Props accepted by {@link MovieForm}. */
interface MovieFormProps {
    /** Called after a movie is successfully added, allowing the parent to refresh its list. */
    onItemAdded?: () => void;
    /** when provided, the component renders the submit button only if false */
    hideSubmit?: boolean;
    hideTitle?: boolean;
    /** Notifies parent when any field has a value (used for reset button state). */
    onDirtyChange?: (dirty: boolean) => void;
}

/**
 * MovieForm renders a form for adding a new movie to the authenticated user's vault.
 * On submission it calls the API and notifies the parent via `onItemAdded`.
 * A "Scan Barcode" button opens the camera to scan a UPC barcode and auto-fills the form.
 */
export interface MovieFormHandle {
    requestSubmit: () => void;
    reset: () => void;
}

const MovieForm = React.forwardRef<MovieFormHandle, MovieFormProps>(({
    onItemAdded,
    hideSubmit = false,
    hideTitle = false,
    onDirtyChange
}, ref) => {
    const innerFormRef = React.useRef<HTMLFormElement>(null);
    const [title, setTitle] = useState('');
    const [director, setDirector] = useState('');
    const [releaseYear, setReleaseYear] = useState('');
    const [genre, setGenre] = useState('');
    const [description, setDescription] = useState('');
    const [coverUrl, setCoverUrl] = useState('');
    const [rating, setRating] = useState('');
    const [runtime, setRuntime] = useState('');
    const [cast, setCast] = useState('');
    const [error, setError] = useState('');
    // toast used for success messages (lookup errors handled by parent)
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error'>('success');

    // notify parent when form becomes non-empty
    const computeDirty = () => {
        return (
            !!title ||
            !!director ||
            !!releaseYear ||
            !!genre ||
            !!description ||
            !!coverUrl ||
            !!rating ||
            !!runtime ||
            !!cast
        );
    };

    useEffect(() => {
        onDirtyChange?.(computeDirty());
    }, [
        title,
        director,
        releaseYear,
        genre,
        description,
        coverUrl,
        rating,
        runtime,
        cast,
        onDirtyChange,
    ]);

    // lookup input is handled by BarcodeScanLookup; we don't need local state here

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!title || !director || !releaseYear || !genre) {
            setError('Title, director, release year, and genre are required');
            return;
        }

        const newMovie: Movie = {
            title,
            director,
            releaseYear: parseInt(releaseYear),
            genre,
            description: description || undefined,
            coverUrl: coverUrl || undefined,
            rating: rating || undefined,
            runtime: runtime || undefined,
            cast: cast || undefined,
        };

        try {
            await addMovie(newMovie);
            setTitle('');
            setDirector('');
            setReleaseYear('');
            setGenre('');
            setDescription('');
            setCoverUrl('');
            setRating('');
            setRuntime('');
            setCast('');
            setToastMessage('Movie added successfully!');
            setToastType('success');
            onItemAdded?.();
        } catch (_err) {
            setError('Failed to add movie');
        }
    };

    // lookup handler used by the reusable component
    const handleLookup = async (barcode: string) => {
        setError('');
        try {
            const result = await lookupMovieByUpc(barcode);
            setTitle(result.title || '');
            setDirector(result.director || '');
            if (result.releaseYear) setReleaseYear(String(result.releaseYear));
            setGenre(result.genre || '');
            setDescription(result.description || '');
            setCoverUrl(result.coverUrl || '');
            setRating(result.rating || '');
            setRuntime(result.runtime || '');
            setCast(result.cast || '');
        } catch {
            setError('Could not find movie for this barcode. Fill in manually.');
        }
    };

    React.useImperativeHandle(ref, () => ({
        requestSubmit: () => innerFormRef.current?.requestSubmit(),
        reset: () => {
            setTitle('');
            setDirector('');
            setReleaseYear('');
            setGenre('');
            setDescription('');
            setCoverUrl('');
            setRating('');
            setRuntime('');
            setCast('');
            setError('');
            setToastMessage('');
            setToastType('success');
        }
    }));

    return (
        <form onSubmit={handleSubmit} ref={innerFormRef}>
            {!hideTitle && (
                <Typography variant="h5" sx={{ mb: 3 }}>
                    Add a Movie
                </Typography>
            )}
            {error && <Typography color="error">{error}</Typography>}

            {/* manual UPC lookup with optional scan */}
            <BarcodeScanLookup
                label="Barcode"
                maxLength={13}
                onLookup={handleLookup}
            />

            <Box display="flex" flexDirection="column" gap={2}>
                <TextField
                    label="Title:"
                    fullWidth
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />

                <TextField
                    label="Director:"
                    fullWidth
                    required
                    value={director}
                    onChange={(e) => setDirector(e.target.value)}
                />

                <TextField
                    label="Release Year:"
                    fullWidth
                    required
                    type="number"
                    value={releaseYear}
                    onChange={(e) => setReleaseYear(e.target.value)}
                />

                <TextField
                    label="Genre:"
                    fullWidth
                    required
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                />

                <TextField
                    label="Rating (optional):"
                    fullWidth
                    value={rating}
                    onChange={(e) => setRating(e.target.value)}
                    placeholder="e.g. PG-13"
                />

                <TextField
                    label="Runtime (optional):"
                    fullWidth
                    value={runtime}
                    onChange={(e) => setRuntime(e.target.value)}
                    placeholder="e.g. 148 min"
                />

                <TextField
                    label="Cast (optional):"
                    fullWidth
                    value={cast}
                    onChange={(e) => setCast(e.target.value)}
                    placeholder="Actor One, Actor Two"
                />

                <TextField
                    label="Description (optional):"
                    fullWidth
                    multiline
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />

                {!hideSubmit && <Button variant="contained" color="primary" type="submit">Add Movie</Button>}
            </Box>

            <Toast
                message={toastMessage}
                type={toastType}
                onDismiss={() => setToastMessage('')}
            />
        </form>
    );
});

export default MovieForm;