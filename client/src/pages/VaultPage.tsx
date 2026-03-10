import React, { useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import ItemList from '../components/ItemList';
import BookForm from '../components/BookForm';
import MovieForm from '../components/MovieForm';
import GameForm from '../components/GameForm';
import AdminTab from '../components/AdminTab';
import Modal from '../components/Modal';
import BarcodeScanLookup from '../components/BarcodeScanLookup';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext';

type VaultSection = 'home' | 'books' | 'movies' | 'games' | 'admin';

/**
 * VaultPage is the main authenticated view of the Collector's Vault application.
 *
 * It provides:
 * - Navigation between Home, Books, Movies, and Games sections.
 * - A list of existing items for the current user, with delete support.
 *   (Add forms have been moved to the home modal; category tabs only show
 *    item lists.)
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
    const [refreshKey, setRefreshKey] = useState(0);

    // modal/tile state for home page
    const [modalType, setModalType] = useState<'book' | 'movie' | 'game' | 'upc' | null>(null);
    const [formKey, setFormKey] = useState(0);
    const bookFormRef = React.useRef<HTMLFormElement>(null);
    const movieFormRef = React.useRef<HTMLFormElement>(null);
    const gameFormRef = React.useRef<HTMLFormElement>(null);

    // temporary toast messages shown in various places
    const [pageToast, setPageToast] = useState('');
    const [pageToastType, setPageToastType] = useState<'success' | 'error' | 'info' | 'warning'>('warning');

    const handleItemAdded = () => {
        setRefreshKey((previous) => previous + 1);
    };

    const handleModalOpen = (type: 'book' | 'movie' | 'game' | 'upc') => {
        setFormKey((prev) => prev + 1); // reset any mounted form
        setModalType(type);
    };

    const handleModalClose = () => {
        setModalType(null);
        setFormKey((prev) => prev + 1);
    };

    const handleItemAddedAndClose = (title?: string) => {
        handleItemAdded();
        handleModalClose();
        if (title) {
            setPageToast(`The book ${title} has successfully been created.`);
            setPageToastType('success');
        }
    };

    const handleModalConfirm = () => {
        if (modalType === 'book') {
            bookFormRef.current?.requestSubmit();
            return;
        }
        if (modalType === 'movie') {
            movieFormRef.current?.requestSubmit();
            return;
        }
        if (modalType === 'game') {
            gameFormRef.current?.requestSubmit();
            return;
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


    // attempt scanning from UPC modal, with permission check to avoid flicker


    const renderSectionContent = () => {
        // helper used to render the floating "add" button for category pages
        const renderAddButton = () => {
            if (activeSection === 'home' || activeSection === 'admin') {
                return null;
            }
            // convert plural section to singular form used by modal
            let formType: 'book' | 'movie' | 'game' | undefined;
            if (activeSection === 'books') formType = 'book';
            else if (activeSection === 'movies') formType = 'movie';
            else if (activeSection === 'games') formType = 'game';
            if (!formType) return null;
            const label = formType.charAt(0).toUpperCase() + formType.slice(1);
            // fixed position at bottom right of viewport so it sits beneath container
            return (
                <button
                    type="button"
                    className="btn btn-primary float-end bottom-0 end-0 m-3 rounded-circle"
                    aria-label={`Add ${label}`}
                    onClick={() => handleModalOpen(formType)}
                >
                    <span className="fs-4">+</span>
                </button>
            );
        };

        if (activeSection === 'admin') {
            return (
                <div className="card shadow-sm mb-3 p-3">
                    <AdminTab />
                </div>
            );
        }

        if (activeSection === 'home') {
            // tiles for primary actions
            // container has white background and enforces two columns per row
            return (
                <>
                    <div data-testid="home-tile-container" className="card shadow-sm mb-3 p-3">
                        <div className="row row-cols-2 g-3 w-auto mx-auto justify-content-center">
                            
                            {/* Left Column 1: Right-aligned toward center */}
                            <div className="col d-flex justify-content-end">
                                <div className="home-tile d-flex justify-content-center align-items-center text-center h-100 p-3" onClick={() => handleModalOpen('upc')}>
                                    <span>Scan Barcode</span>
                                </div>
                            </div>

                            {/* Right Column 1: Left-aligned toward center */}
                            <div className="col d-flex justify-content-start">
                                <div className="home-tile d-flex justify-content-center align-items-center text-center h-100 p-3" onClick={() => handleModalOpen('book')}>
                                    <span>Add Book</span>
                                </div>
                            </div>

                            {/* Left Column 2: Right-aligned toward center */}
                            <div className="col d-flex justify-content-end">
                                <div className="home-tile d-flex justify-content-center align-items-center text-center h-100 p-3" onClick={() => handleModalOpen('movie')}>
                                    <span>Add Movie</span>
                                </div>
                            </div>

                            {/* Right Column 2: Left-aligned toward center */}
                            <div className="col d-flex justify-content-start">
                                <div className="home-tile d-flex justify-content-center align-items-center text-center h-100 p-3" onClick={() => handleModalOpen('game')}>
                                    <span>Add Game</span>
                                </div>
                            </div>

                        </div>
                    </div>
                </>
            );
        }

        if (activeSection === 'books') {
            // only show the list of books; floating add button appears below
            return (
                <>
                    <div className="card shadow-sm mb-3 p-3 position-relative min-vh-75">
                        <ItemList refreshKey={refreshKey} categoryFilter="book" title="Books" />
                    </div>
                    {renderAddButton()}
                </>
            );
        }

        if (activeSection === 'movies') {
            return (
                <>
                    <div className="card shadow-sm mb-3 p-3 position-relative min-vh-75">
                        <ItemList refreshKey={refreshKey} categoryFilter="movie" title="Movies" />
                    </div>
                    {renderAddButton()}
                </>
            );
        }

        // games section
        return (
            <>
                <div className="card shadow-sm mb-3 p-3 position-relative min-vh-75">
                    <ItemList refreshKey={refreshKey} categoryFilter="game" title="Games" />
                </div>
                {renderAddButton()}
            </>
        );
    };

    return (
        <>
            {/* outer wrapper ensures the page is always full height and uses the
                same background regardless of which section is active. The
                .container inside limits content width while remaining
                transparent so the gradient shows through. */}
            <div className="vault-container">
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

            {/* nav is kept in a fluid container so the category buttons sit on the
                same background color across the entire screen rather than being
                constrained by the fixed-width container */}
            <div className="container-fluid">
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
            </div>

                    <div>
                        {renderSectionContent()}
                    </div>
                </div>
                {/* global modal shared across sections */}
                <Modal
                    show={modalType !== null}
                    title={
                        modalType === 'book'
                            ? 'Add a Book'
                            : modalType === 'movie'
                            ? 'Add a Movie'
                            : modalType === 'game'
                            ? 'Add a Game'
                            : modalType === 'upc'
                            ? 'Scan Barcode'
                            : ''
                    }
                    onClose={handleModalClose}
                    onConfirm={modalType === 'upc' ? undefined : handleModalConfirm}
                    confirmText="Create"
                >
                    {modalType === 'upc' && (
                    <>
                        {/* always display manual entry; scanner appears below when active */}
                        <BarcodeScanLookup
                            placeholder="Enter UPC"
                            onLookup={(code: string) => {
                                alert(`Lookup: ${code}`);
                                handleModalClose();
                            }}
                        />
                    </>
                )}
                    {modalType === 'book' && (
                        <BookForm
                            key={formKey}
                            hideSubmit
                            hideTitle
                            formRef={bookFormRef}
                            onItemAdded={(title) => handleItemAddedAndClose(title)}
                        />
                    )}
                    {modalType === 'movie' && (
                        <MovieForm key={formKey} hideSubmit hideTitle formRef={movieFormRef} onItemAdded={handleItemAddedAndClose} />
                    )}
                    {modalType === 'game' && (
                        <GameForm key={formKey} hideSubmit hideTitle formRef={gameFormRef} onItemAdded={handleItemAddedAndClose} />
                    )}
                </Modal>
                {pageToast && (
                    <Toast
                        message={pageToast}
                        type={pageToastType}
                        onDismiss={() => setPageToast('')}
                    />
                )}
            </div>
        </>
    );
};

export default VaultPage;
