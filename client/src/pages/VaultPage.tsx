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
        if (activeSection === 'home') {
            return (
                <>
                    <section className="vault-card">
                        <div className="home-form-controls">
                            <label htmlFor="itemType">Select collectible type</label>
                            <select
                                id="itemType"
                                className="form-select"
                                value={homeFormType}
                                onChange={(event) => handleHomeTypeChange(event.target.value)}
                            >
                                <option value="book">Book</option>
                                <option value="movie">Movie</option>
                                <option value="game">Game</option>
                            </select>
                        </div>
                        {renderHomeForm()}
                    </section>

                    <section className="vault-card">
                        <ItemList refreshKey={refreshKey} title="Collector's Vault Items" />
                    </section>
                </>
            );
        }

        if (activeSection === 'books') {
            return (
                <section className="vault-card">
                    <ItemList refreshKey={refreshKey} categoryFilter="book" title="Books" />
                </section>
            );
        }

        if (activeSection === 'movies') {
            return (
                <section className="vault-card">
                    <ItemList refreshKey={refreshKey} categoryFilter="movie" title="Movies" />
                </section>
            );
        }

        return (
            <section className="vault-card">
                <ItemList refreshKey={refreshKey} categoryFilter="game" title="Games" />
            </section>
        );
    };

    const renderAdminSection = () => (
        <section className="vault-card">
            <AdminTab />
        </section>
    );

    return (
        <div className="vault-page">
            <header className="vault-header">
                <div className="brand-row">
                    <div className="brand-logo" aria-hidden="true">CV</div>
                    <div>
                        <h1>Collector&apos;s Vault</h1>
                        <p>Track your favorite books, movies, and games.</p>
                    </div>
                    <div className="header-actions">
                        {username && <span className="header-username">{username}</span>}
                        <button type="button" className="logout-button" onClick={logout}>
                            Sign Out
                        </button>
                    </div>
                </div>
            </header>

            <nav className="vault-nav" aria-label="Vault categories">
                <button
                    type="button"
                    className={activeSection === 'home' ? 'vault-nav-button active' : 'vault-nav-button'}
                    onClick={() => setSection('home')}
                >
                    Home
                </button>
                <button
                    type="button"
                    className={activeSection === 'books' ? 'vault-nav-button active' : 'vault-nav-button'}
                    onClick={() => setSection('books')}
                >
                    Books
                </button>
                <button
                    type="button"
                    className={activeSection === 'movies' ? 'vault-nav-button active' : 'vault-nav-button'}
                    onClick={() => setSection('movies')}
                >
                    Movies
                </button>
                <button
                    type="button"
                    className={activeSection === 'games' ? 'vault-nav-button active' : 'vault-nav-button'}
                    onClick={() => setSection('games')}
                >
                    Games
                </button>
                {isAdmin && (
                    <button
                        type="button"
                        className={activeSection === 'admin' ? 'vault-nav-button active' : 'vault-nav-button'}
                        onClick={() => setSection('admin')}
                    >
                        Admin
                    </button>
                )}
            </nav>

            {activeSection === 'admin' ? renderAdminSection() : renderSectionContent()}
        </div>
    );
};

export default VaultPage;