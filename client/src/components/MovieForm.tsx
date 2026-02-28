import React, { useState } from 'react';
import { Movie } from '../types';
import { addMovie } from '../services/api';

interface MovieFormProps {
    onItemAdded?: () => void;
}

const MovieForm: React.FC<MovieFormProps> = ({ onItemAdded }) => {
    const [title, setTitle] = useState('');
    const [director, setDirector] = useState('');
    const [releaseYear, setReleaseYear] = useState('');
    const [genre, setGenre] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!title || !director || !releaseYear || !genre) {
            setError('All fields are required');
            return;
        }

        const newMovie: Movie = {
            title,
            director,
            releaseYear: parseInt(releaseYear),
            genre,
        };

        try {
            await addMovie(newMovie);
            setTitle('');
            setDirector('');
            setReleaseYear('');
            setGenre('');
            onItemAdded?.();
        } catch (err) {
            setError('Failed to add movie');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="form-section">
            <h2>Add a Movie</h2>
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
                <label>Director:</label>
                <input
                    type="text"
                    value={director}
                    onChange={(e) => setDirector(e.target.value)}
                    required
                />
            </div>
            <div className="form-row">
                <label>Release Year:</label>
                <input
                    type="number"
                    value={releaseYear}
                    onChange={(e) => setReleaseYear(e.target.value)}
                    required
                />
            </div>
            <div className="form-row">
                <label>Genre:</label>
                <input
                    type="text"
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    required
                />
            </div>
            <button className="primary-button" type="submit">Add Movie</button>
        </form>
    );
};

export default MovieForm;