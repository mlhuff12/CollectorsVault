import React, { useState, useCallback, useEffect } from 'react';
import { addGame, lookupGameByUpc } from '../services/api';
import { Game } from '../models';
import BarcodeScanner from './BarcodeScanner';
import Toast from './Toast';

/** Props accepted by {@link GameForm}. */
interface GameFormProps {
    /** Called after a game is successfully added, allowing the parent to refresh its list. */
    onItemAdded?: () => void;
    hideSubmit?: boolean;
    formRef?: React.Ref<HTMLFormElement>;
    hideTitle?: boolean;
}

/**
 * GameForm renders a form for adding a new game to the authenticated user's vault.
 * On submission it calls the API and notifies the parent via `onItemAdded`.
 * A "Scan Barcode" button opens the camera to scan a UPC barcode and auto-fills the form.
 */
const GameForm: React.FC<GameFormProps> = ({ onItemAdded, hideSubmit = false, formRef, hideTitle = false }) => {
    const [title, setTitle] = useState('');
    const [platform, setPlatform] = useState('');
    const [releaseDate, setReleaseDate] = useState('');
    const [genre, setGenre] = useState('');
    const [description, setDescription] = useState('');
    const [coverUrl, setCoverUrl] = useState('');
    const [developer, setDeveloper] = useState('');
    const [publisher, setPublisher] = useState('');
    const [error, setError] = useState('');
    const [scanError, setScanError] = useState('');
    const [showScanner, setShowScanner] = useState(false);
    const [scanLoading, setScanLoading] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error'>('success');

    // lookup state
    const [upcInput, setUpcInput] = useState('');
    const [canScan, setCanScan] = useState(false);

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
        } catch (_err) {
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

    const attemptScan = () => {
        if (!canScan) {
            setToastMessage('Camera could not be opened, make sure camera permission is granted, or enter the barcode manually.');
            setToastType('error');
            return;
        }
        if (navigator.permissions) {
            navigator.permissions.query({ name: 'camera' as PermissionName })
                .then(p => {
                    if (p.state === 'denied') {
                        setToastMessage('Camera could not be opened, make sure camera permission is granted, or enter the barcode manually.');
                        setToastType('error');
                    } else {
                        setShowScanner(prev => !prev);
                    }
                })
                .catch(() => {
                    setShowScanner(prev => !prev);
                });
        } else {
            setShowScanner(prev => !prev);
        }
    };


    useEffect(() => {
        if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
            setCanScan(true);
        } else {
            setCanScan(false);
        }
    }, []);

    return (
        <form onSubmit={handleSubmit} ref={formRef}>
            {!hideTitle && <h2 className="h5 mb-3">Add a Game</h2>}
            {error && <p className="text-danger">{error}</p>}
            {/* UPC lookup / scan section */}
            <div className="mb-3">
                <div className="input-group">
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Enter UPC"
                        maxLength={13}
                        value={upcInput}
                        onChange={(e) => {
                            setUpcInput(e.target.value);
                            setScanError('');
                        }}
                    />
                    <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={!upcInput.trim()}
                        onClick={async () => {
                            setScanError('');
                            try {
                                const result = await lookupGameByUpc(upcInput.trim());
                                setTitle(result.title || '');
                                setPlatform(result.platform || '');
                                if (result.releaseYear) setReleaseDate(`${result.releaseYear}-01-01`);
                                setGenre(result.genre || '');
                                setDescription(result.description || '');
                                setCoverUrl(result.coverUrl || '');
                                setDeveloper(result.developer || '');
                                setPublisher(result.publisher || '');
                            } catch {
                                setError('Game not found for that UPC.');
                            }
                        }}
                    >
                        Lookup
                    </button>
                    {canScan && (
                        <>
                            <div className="input-group-text">OR</div>
                            <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm"
                                onClick={() => {
                                    setScanError('');
                                    attemptScan();
                                }}
                                disabled={scanLoading}
                            >
                                {scanLoading ? 'Looking up…' : '📷 Scan Barcode'}
                            </button>
                        </>
                    )}
                </div>
            </div>
            {scanError && <div className="form-text text-warning mb-2">{scanError}</div>}
            {showScanner && (
                <BarcodeScanner
                    onScan={handleBarcodeScan}
                    onError={(msg) => {
                        setScanError(msg);
                        setShowScanner(false);
                    }}
                    onClose={() => setShowScanner(false)}
                />
            )}
            <div className="mb-3">
                <label htmlFor="game-title" className="form-label">Title:</label>
                <input
                    id="game-title"
                    type="text"
                    className="form-control"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                />
            </div>
            <div className="mb-3">
                <label htmlFor="game-platform" className="form-label">Platform:</label>
                <input
                    id="game-platform"
                    type="text"
                    className="form-control"
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    required
                />
            </div>
            <div className="mb-3">
                <label htmlFor="game-release-date" className="form-label">Release Date:</label>
                <input
                    id="game-release-date"
                    type="date"
                    className="form-control"
                    value={releaseDate}
                    onChange={(e) => setReleaseDate(e.target.value)}
                    required
                />
            </div>
            <div className="mb-3">
                <label htmlFor="game-genre" className="form-label">Genre (optional):</label>
                <input
                    id="game-genre"
                    type="text"
                    className="form-control"
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                />
            </div>
            <div className="mb-3">
                <label htmlFor="game-developer" className="form-label">Developer (optional):</label>
                <input
                    id="game-developer"
                    type="text"
                    className="form-control"
                    value={developer}
                    onChange={(e) => setDeveloper(e.target.value)}
                />
            </div>
            <div className="mb-3">
                <label htmlFor="game-publisher" className="form-label">Publisher (optional):</label>
                <input
                    id="game-publisher"
                    type="text"
                    className="form-control"
                    value={publisher}
                    onChange={(e) => setPublisher(e.target.value)}
                />
            </div>
            <div className="mb-3">
                <label htmlFor="game-description" className="form-label">Description (optional):</label>
                <textarea
                    id="game-description"
                    className="form-control"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                />
            </div>
            {!hideSubmit && <button className="btn btn-primary" type="submit">Add Game</button>}
            <Toast
                message={toastMessage}
                type={toastType}
                onDismiss={() => setToastMessage('')}
            />
        </form>
    );
};

export default GameForm;