import React, { useState, useCallback } from 'react';
import { addGame, lookupGameByUpc } from '../services/api';
import { Game } from '../models';
import BarcodeScanner from './BarcodeScanner';
import Toast from './Toast';

/** Props accepted by {@link GameForm}. */
interface GameFormProps {
    /** Called after a game is successfully added, allowing the parent to refresh its list. */
    onItemAdded?: () => void;
}

/**
 * GameForm renders a form for adding a new game to the authenticated user's vault.
 * On submission it calls the API and notifies the parent via `onItemAdded`.
 * A "Scan Barcode" button opens the camera to scan a UPC barcode and auto-fills the form.
 */
const GameForm: React.FC<GameFormProps> = ({ onItemAdded }) => {
    const [title, setTitle] = useState('');
    const [platform, setPlatform] = useState('');
    const [releaseDate, setReleaseDate] = useState('');
    const [genre, setGenre] = useState('');
    const [description, setDescription] = useState('');
    const [coverUrl, setCoverUrl] = useState('');
    const [developer, setDeveloper] = useState('');
    const [publisher, setPublisher] = useState('');
    const [error, setError] = useState('');
    const [showScanner, setShowScanner] = useState(false);
    const [scanLoading, setScanLoading] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error'>('success');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const newGame: Game = {
            title,
            platform,
            releaseDate,
            genre: genre || undefined,
            description: description || undefined,
            coverUrl: coverUrl || undefined,
            developer: developer || undefined,
            publisher: publisher || undefined,
        };

        try {
            await addGame(newGame);
            setTitle('');
            setPlatform('');
            setReleaseDate('');
            setGenre('');
            setDescription('');
            setCoverUrl('');
            setDeveloper('');
            setPublisher('');
            setToastMessage('Game added successfully!');
            setToastType('success');
            onItemAdded?.();
        } catch (err) {
            setError('Failed to add game. Please try again.');
        }
    };

    const handleBarcodeScan = useCallback(async (barcode: string) => {
        setShowScanner(false);
        setScanLoading(true);
        setError('');
        try {
            const result = await lookupGameByUpc(barcode);
            setTitle(result.title || '');
            setPlatform(result.platform || '');
            if (result.releaseYear) setReleaseDate(`${result.releaseYear}-01-01`);
            setGenre(result.genre || '');
            setDescription(result.description || '');
            setCoverUrl(result.coverUrl || '');
            setDeveloper(result.developer || '');
            setPublisher(result.publisher || '');
        } catch {
            setError('Could not find game for this barcode. Fill in manually.');
        } finally {
            setScanLoading(false);
        }
    }, []);

    return (
        <form onSubmit={handleSubmit}>
            <h2 className="h5 mb-3">Add a Game</h2>
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
                <label className="form-label">Platform:</label>
                <input
                    type="text"
                    className="form-control"
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    required
                />
            </div>
            <div className="mb-3">
                <label className="form-label">Release Date:</label>
                <input
                    type="date"
                    className="form-control"
                    value={releaseDate}
                    onChange={(e) => setReleaseDate(e.target.value)}
                    required
                />
            </div>
            <div className="mb-3">
                <label className="form-label">Genre (optional):</label>
                <input
                    type="text"
                    className="form-control"
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                />
            </div>
            <div className="mb-3">
                <label className="form-label">Developer (optional):</label>
                <input
                    type="text"
                    className="form-control"
                    value={developer}
                    onChange={(e) => setDeveloper(e.target.value)}
                />
            </div>
            <div className="mb-3">
                <label className="form-label">Publisher (optional):</label>
                <input
                    type="text"
                    className="form-control"
                    value={publisher}
                    onChange={(e) => setPublisher(e.target.value)}
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
            <button className="btn btn-primary" type="submit">Add Game</button>
            <Toast
                message={toastMessage}
                type={toastType}
                onDismiss={() => setToastMessage('')}
            />
        </form>
    );
};

export default GameForm;