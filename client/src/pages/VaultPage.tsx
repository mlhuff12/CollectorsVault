import React, { useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import ItemList from '../components/ItemList';
import BookForm from '../components/BookForm';
import MovieForm from '../components/MovieForm';
import GameForm from '../components/GameForm';
import AdminTab from '../components/AdminTab';
import { useAuth } from '../context/AuthContext';

type VaultSection = 'home' | 'books' | 'movies' | 'games' | 'admin';
type HomeFormType = 'book' | 'movie' | 'game';

/**
 * VaultPage is the main authenticated view of the Collector's Vault application.
 *
 * It provides:
 * - Navigation between Home, Books, Movies, and Games sections.
 * - Forms for adding new collectible items (books, movies, games).
 * - A list of existing items for the current user, with delete support.
 * - A header showing the logged-in username and a Sign Out button.
 * - An Admin tab (visible only to admin users) for user management.
 *
 * Access to this page is gated by {@link ProtectedRoute}; unauthenticated users
 * are redirected to /login.
 */
const VaultPage: React.FC = () => {
    const history = useHistory();
    const location = useLocation();
    const { username, logout, isAdmin } = useAuth();
    const [homeFormType, setHomeFormType] = useState<HomeFormType>('book');
    const [refreshKey, setRefreshKey] = useState(0);

    const handleItemAdded = () => {
        setRefreshKey((previous) => previous + 1);
    };

    const handleHomeTypeChange = (value: string) => {
        if (value === 'book' || value === 'movie' || value === 'game') {
            setHomeFormType(value);
        }
    };

    const getSectionFromPath = (): VaultSection => {
        if (location.pathname === '/books') {
            return 'books';
        }

        if (location.pathname === '/movies') {
            return 'movies';
        }

        if (location.pathname === '/games') {
            return 'games';
        }

        if (location.pathname === '/admin') {
            return 'admin';
        }

        return 'home';
    };

    const setSection = (section: VaultSection) => {
        if (section === 'home') {
            history.push('/');
            return;
        }

        history.push(`/${section}`);
    };

    const activeSection = getSectionFromPath();

    const renderHomeForm = () => {
        if (homeFormType === 'book') {
            return <BookForm onItemAdded={handleItemAdded} />;
        }

        if (homeFormType === 'movie') {
            return <MovieForm onItemAdded={handleItemAdded} />;
        }

        return <GameForm onItemAdded={handleItemAdded} />;
    };

    const renderSectionContent = () => {
        if (activeSection === 'admin') {
            return (
                <div className="card shadow-sm mb-3 p-3">
                    <AdminTab />
                </div>
            );
        }

        if (activeSection === 'home') {
            return (
                <>
                    <div className="card shadow-sm mb-3 p-3">
                        <div className="mb-3">
                            <label htmlFor="itemType" className="form-label">Select collectible type</label>
                            <select
                                id="itemType"
                                className="form-select"
                                value={homeFormType}
                                onChange={(event) => handleHomeTypeChange(event.target.value)}
                                style={{ maxWidth: '240px' }}
                            >
                                <option value="book">Book</option>
                                <option value="movie">Movie</option>
                                <option value="game">Game</option>
                            </select>
                        </div>
                        {renderHomeForm()}
                    </div>

                    <div className="card shadow-sm mb-3 p-3">
                        <ItemList refreshKey={refreshKey} title="Collector's Vault Items" />
                    </div>
                </>
            );
        }

        if (activeSection === 'books') {
            return (
                <div className="card shadow-sm mb-3 p-3">
                    <BookForm onItemAdded={handleItemAdded} />
                    <hr />
                    <ItemList refreshKey={refreshKey} categoryFilter="book" title="Books" />
                </div>
            );
        }

        if (activeSection === 'movies') {
            return (
                <div className="card shadow-sm mb-3 p-3">
                    <MovieForm onItemAdded={handleItemAdded} />
                    <hr />
                    <ItemList refreshKey={refreshKey} categoryFilter="movie" title="Movies" />
                </div>
            );
        }

        return (
            <div className="card shadow-sm mb-3 p-3">
                <GameForm onItemAdded={handleItemAdded} />
                <hr />
                <ItemList refreshKey={refreshKey} categoryFilter="game" title="Games" />
            </div>
        );
    };

    return (
        <div className="container py-4">
            <header className="mb-3">
                <div className="d-flex align-items-center gap-3">
                    <div className="brand-logo" aria-hidden="true">CV</div>
                    <div>
                        <h1 className="h3 mb-0">Collector&apos;s Vault</h1>
                        <p className="text-muted mb-0 small">Track your favorite books, movies, and games.</p>
                    </div>
                    <div className="ms-auto d-flex align-items-center gap-3">
                        {username && <span className="text-muted small fw-medium">{username}</span>}
                        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={logout}>
                            Sign Out
                        </button>
                    </div>
                </div>
            </header>

            <nav className="d-flex flex-wrap gap-2 mb-3" aria-label="Vault categories">
                <button
                    type="button"
                    className={activeSection === 'home' ? 'btn btn-primary' : 'btn btn-outline-secondary'}
                    onClick={() => setSection('home')}
                >
                    Home
                </button>
                <button
                    type="button"
                    className={activeSection === 'books' ? 'btn btn-primary' : 'btn btn-outline-secondary'}
                    onClick={() => setSection('books')}
                >
                    Books
                </button>
                <button
                    type="button"
                    className={activeSection === 'movies' ? 'btn btn-primary' : 'btn btn-outline-secondary'}
                    onClick={() => setSection('movies')}
                >
                    Movies
                </button>
                <button
                    type="button"
                    className={activeSection === 'games' ? 'btn btn-primary' : 'btn btn-outline-secondary'}
                    onClick={() => setSection('games')}
                >
                    Games
                </button>
                {isAdmin && (
                    <button
                        type="button"
                        className={activeSection === 'admin' ? 'btn btn-primary' : 'btn btn-outline-secondary'}
                        onClick={() => setSection('admin')}
                    >
                        Admin
                    </button>
                )}
            </nav>

            {renderSectionContent()}
        </div>
    );
};

export default VaultPage;
