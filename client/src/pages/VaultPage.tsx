import React, { useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import ItemList from '../components/ItemList';
import BookForm from '../components/BookForm';
import MovieForm from '../components/MovieForm';
import GameForm from '../components/GameForm';

type VaultSection = 'home' | 'books' | 'movies' | 'games';
type HomeFormType = 'book' | 'movie' | 'game';

const VaultPage: React.FC = () => {
    const history = useHistory();
    const location = useLocation();
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

    return (
        <div className="vault-page">
            <header className="vault-header">
                <div className="brand-row">
                    <div className="brand-logo" aria-hidden="true">CV</div>
                    <div>
                        <h1>Collector&apos;s Vault</h1>
                        <p>Track your favorite books, movies, and games.</p>
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
            </nav>

            {renderSectionContent()}
        </div>
    );
};

export default VaultPage;