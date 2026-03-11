import React, { useState, useCallback, useEffect } from 'react';
import { addGame, lookupGameByUpc } from '../services/api';
import { Game } from '../models';
import BarcodeScanLookup from './BarcodeScanLookup';
import Toast from './Toast';
import {
    TextField,
    Button,
    Box,
    Typography,
} from '@mui/material';

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
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error'>('success');

    // lookup state is handled by the child component

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

    const handleLookup = async (barcode: string) => {
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
        }
    };

    return (
        <form onSubmit={handleSubmit} ref={formRef}>
            {!hideTitle && (
                <Typography variant="h5" sx={{ mb: 3 }}>
                    Add a Game
                </Typography>
            )}
            {error && <Typography color="error">{error}</Typography>}
            {/* UPC lookup / scan section */}
            <BarcodeScanLookup
                placeholder="Enter UPC"
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
                    label="Platform:"
                    fullWidth
                    required
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                />

                <TextField
                    label="Release Date:"
                    fullWidth
                    required
                    type="date"
                    value={releaseDate}
                    onChange={(e) => setReleaseDate(e.target.value)}
                />

                <TextField
                    label="Genre (optional):"
                    fullWidth
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                />

                <TextField
                    label="Developer (optional):"
                    fullWidth
                    value={developer}
                    onChange={(e) => setDeveloper(e.target.value)}
                />

                <TextField
                    label="Publisher (optional):"
                    fullWidth
                    value={publisher}
                    onChange={(e) => setPublisher(e.target.value)}
                />

                <TextField
                    label="Description (optional):"
                    fullWidth
                    multiline
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />

                {!hideSubmit && <Button variant="contained" color="primary" type="submit">Add Game</Button>}
            </Box>

            <Toast
                message={toastMessage}
                type={toastType}
                onDismiss={() => setToastMessage('')}
            />
        </form>
    );
};

export default GameForm;