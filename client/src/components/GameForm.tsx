import React, { useState } from 'react';
import { addGame } from '../services/api';
import { Game } from '../types';

interface GameFormProps {
    onItemAdded?: () => void;
}

const GameForm: React.FC<GameFormProps> = ({ onItemAdded }) => {
    const [title, setTitle] = useState('');
    const [platform, setPlatform] = useState('');
    const [releaseDate, setReleaseDate] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const newGame: Game = {
            title,
            platform,
            releaseDate,
        };

        try {
            await addGame(newGame);
            setTitle('');
            setPlatform('');
            setReleaseDate('');
            onItemAdded?.();
        } catch (err) {
            setError('Failed to add game. Please try again.');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="form-section">
            <h2>Add a Game</h2>
            {error && <p className="form-error">{error}</p>}
            <div className="form-row">
                <label>Title:</label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                />
            </div>
            <div className="form-row">
                <label>Platform:</label>
                <input
                    type="text"
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    required
                />
            </div>
            <div className="form-row">
                <label>Release Date:</label>
                <input
                    type="date"
                    value={releaseDate}
                    onChange={(e) => setReleaseDate(e.target.value)}
                    required
                />
            </div>
            <button className="primary-button" type="submit">Add Game</button>
        </form>
    );
};

export default GameForm;