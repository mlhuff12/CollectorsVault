import React, { useState } from 'react';
import { Movie } from '../types';
import { addMovie } from '../services/api';

/** Props accepted by {@link MovieForm}. */
interface MovieFormProps {
    /** Called after a movie is successfully added, allowing the parent to refresh its list. */
    onItemAdded?: () => void;
}

/**
 * MovieForm renders a form for adding a new movie to the authenticated user's vault.
 * On submission it calls the API and notifies the parent via `onItemAdded`.
 */
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
        <form onSubmit={handleSubmit}>
            <h2 className="h5 mb-3">Add a Movie</h2>
            {error && <p className="text-danger">{error}</p>}
            <div className="mb-3">
                <label className="form-label">Title:</label>
                <input
                    type="text"
                    className="form-control"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                />
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
            <button className="btn btn-primary" type="submit">Add Movie</button>
        </form>
    );
};

export default MovieForm;