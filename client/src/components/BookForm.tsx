import React, { useState } from 'react';
import { addBook } from '../services/api';
import { Book } from '../types';

/** Props accepted by {@link BookForm}. */
interface BookFormProps {
    /** Called after a book is successfully added, allowing the parent to refresh its list. */
    onItemAdded?: () => void;
}

/**
 * BookForm renders a form for adding a new book to the authenticated user's vault.
 * On submission it calls the API and notifies the parent via `onItemAdded`.
 */
const BookForm: React.FC<BookFormProps> = ({ onItemAdded }) => {
    const [title, setTitle] = useState('');
    const [authors, setAuthors] = useState('');
    const [isbn, setIsbn] = useState('');
    const [year, setYear] = useState('');
    const [genre, setGenre] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const parsedAuthors = authors
            .split(',')
            .map((authorName) => authorName.trim())
            .filter((authorName) => authorName.length > 0);

        if (parsedAuthors.length === 0) {
            setMessage('Please add at least one author.');
            return;
        }

        const newBook: Book = {
            title,
            authors: parsedAuthors,
            isbn: isbn.trim() || undefined,
            year: year.trim() ? parseInt(year, 10) : undefined,
            genre: genre.trim() || undefined
        };

        try {
            await addBook(newBook);
            setMessage('Book added successfully!');
            setTitle('');
            setAuthors('');
            setIsbn('');
            setYear('');
            setGenre('');
            onItemAdded?.();
        } catch (error) {
            setMessage('Failed to add book. Please try again.');
        }
    };

    return (
        <div className="form-section">
            <h2>Add a New Book</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-row">
                    <label>Title:</label>
                    <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div className="form-row">
                    <label>Authors (comma-separated):</label>
                    <input
                        type="text"
                        value={authors}
                        onChange={(e) => setAuthors(e.target.value)}
                        placeholder="Author One, Author Two"
                        required
                    />
                </div>
                <div className="form-row">
                    <label>ISBN (optional):</label>
                    <input type="text" value={isbn} onChange={(e) => setIsbn(e.target.value)} />
                </div>
                <div className="form-row">
                    <label>Year (optional):</label>
                    <input type="number" value={year} onChange={(e) => setYear(e.target.value)} />
                </div>
                <div className="form-row">
                    <label>Genre (optional):</label>
                    <input type="text" value={genre} onChange={(e) => setGenre(e.target.value)} />
                </div>
                <button className="primary-button" type="submit">Add Book</button>
            </form>
            {message && <p className="form-message">{message}</p>}
        </div>
    );
};

export default BookForm;