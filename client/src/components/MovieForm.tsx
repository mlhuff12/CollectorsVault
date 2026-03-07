import React, { useState, useCallback } from 'react';
import { Movie } from '../models';
import { addMovie, lookupMovieByUpc } from '../services/api';
import BarcodeScanner from './BarcodeScanner';
import Toast from './Toast';

/** Props accepted by {@link MovieForm}. */
interface MovieFormProps {
    /** Called after a movie is successfully added, allowing the parent to refresh its list. */
    onItemAdded?: () => void;
}

/**
 * MovieForm renders a form for adding a new movie to the authenticated user's vault.
 * On submission it calls the API and notifies the parent via `onItemAdded`.
 * A "Scan Barcode" button opens the camera to scan a UPC barcode and auto-fills the form.
 */
const MovieForm: React.FC<MovieFormProps> = ({ onItemAdded }) => {
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
    const [showScanner, setShowScanner] = useState(false);
    const [scanLoading, setScanLoading] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error'>('success');

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

    const handleBarcodeScan = useCallback(async (barcode: string) => {
        setShowScanner(false);
        setScanLoading(true);
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
        } finally {
            setScanLoading(false);
        }
    }, []);

    return (
        <form onSubmit={handleSubmit}>
            <h2 className="h5 mb-3">Add a Movie</h2>
            {error && <p className="text-danger">{error}</p>}
            <div className="mb-3">
                <label className="form-label">Title:</label>
                <div className="d-flex gap-2 align-items-center">
                    <input
                        type="text"
                        className="form-control"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
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
                <label className="form-label">Director:</label>
                <input
                    type="text"
                    className="form-control"
                    value={director}
                    onChange={(e) => setDirector(e.target.value)}
                    required
                />
            </div>
            <div className="mb-3">
                <label className="form-label">Release Year:</label>
                <input
                    type="number"
                    className="form-control"
                    value={releaseYear}
                    onChange={(e) => setReleaseYear(e.target.value)}
                    required
                />
            </div>
            <div className="mb-3">
                <label className="form-label">Genre:</label>
                <input
                    type="text"
                    className="form-control"
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    required
                />
            </div>
            <div className="mb-3">
                <label className="form-label">Rating (optional):</label>
                <input
                    type="text"
                    className="form-control"
                    value={rating}
                    onChange={(e) => setRating(e.target.value)}
                    placeholder="e.g. PG-13"
                />
            </div>
            <div className="mb-3">
                <label className="form-label">Runtime (optional):</label>
                <input
                    type="text"
                    className="form-control"
                    value={runtime}
                    onChange={(e) => setRuntime(e.target.value)}
                    placeholder="e.g. 148 min"
                />
            </div>
            <div className="mb-3">
                <label className="form-label">Cast (optional):</label>
                <input
                    type="text"
                    className="form-control"
                    value={cast}
                    onChange={(e) => setCast(e.target.value)}
                    placeholder="Actor One, Actor Two"
                />
            </div>
            <div className="mb-3">
                <label className="form-label">Description (optional):</label>
                <textarea
                    className="form-control"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                />
            </div>
            <button className="btn btn-primary" type="submit">Add Movie</button>
            <Toast
                message={toastMessage}
                type={toastType}
                onDismiss={() => setToastMessage('')}
            />
        </form>
    );
};

export default MovieForm;