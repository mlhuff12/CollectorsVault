import React, { useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import ItemList from '../components/ItemList';
import BookForm from '../components/BookForm';
import MovieForm from '../components/MovieForm';
import GameForm from '../components/GameForm';
import AdminTab from '../components/AdminTab';
import Modal from '../components/Modal';
import BarcodeScanner from '../components/BarcodeScanner';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext';

type VaultSection = 'home' | 'books' | 'movies' | 'games' | 'admin';

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
    const [refreshKey, setRefreshKey] = useState(0);

    // modal/tile state for home page
    const [modalType, setModalType] = useState<'book' | 'movie' | 'game' | 'upc' | null>(null);
    const [formKey, setFormKey] = useState(0);
    const bookFormRef = React.useRef<HTMLFormElement>(null);
    const movieFormRef = React.useRef<HTMLFormElement>(null);
    const gameFormRef = React.useRef<HTMLFormElement>(null);

    // UPC modal specific state
    const [canScan, setCanScan] = useState(false);
    const [upcCode, setUpcCode] = useState('');
    const [showScanner, setShowScanner] = useState(false);
    const [scanError, setScanError] = useState('');
    const [pageToast, setPageToast] = useState('');

    const handleItemAdded = () => {
        setRefreshKey((previous) => previous + 1);
    };

    const handleModalOpen = (type: 'book' | 'movie' | 'game' | 'upc') => {
        setFormKey((prev) => prev + 1); // reset any mounted form
        setModalType(type);
        if (type === 'upc') {
            setUpcCode('');
            setShowScanner(false);
            setScanError('');
        }
    };

    const handleModalClose = () => {
        setModalType(null);
        setFormKey((prev) => prev + 1);
        setShowScanner(false);
        setScanError('');
    };

    const handleItemAddedAndClose = () => {
        handleItemAdded();
        handleModalClose();
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

    // detect camera capability once
    useEffect(() => {
        let available = false;
        if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
            available = true;
        }
        setCanScan(available);

        if (available && navigator.permissions) {
            navigator.permissions
                .query({ name: 'camera' as PermissionName })
                .then(p => {
                    if (p.state === 'denied') {
                        setCanScan(false);
                    }
                })
                .catch(() => { /* ignore unsupported */ });
        }
    }, []);

    // attempt scanning from UPC modal, with permission check to avoid flicker
    const handleScanClick = () => {
        if (!canScan) {
            setPageToast('Camera not available or permission denied.');
            return;
        }
        if (navigator.permissions) {
            navigator.permissions
                .query({ name: 'camera' as PermissionName })
                .then(p => {
                    if (p.state === 'denied') {
                        setPageToast('Camera permission denied.');
                    } else {
                        setShowScanner(true);
                    }
                })
                .catch(() => {
                    // permission query failed; still try
                    setShowScanner(true);
                });
        } else {
            setShowScanner(true);
        }
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
            // tiles for primary actions
            return (
                <>
                    <div className="d-flex flex-wrap gap-3 justify-content-center mb-4">
                        <div className="home-tile" onClick={() => handleModalOpen('upc')}>
                            <span>Scan Barcode</span>
                        </div>
                        <div className="home-tile" onClick={() => handleModalOpen('book')}>
                            <span>Add Book</span>
                        </div>
                        <div className="home-tile" onClick={() => handleModalOpen('movie')}>
                            <span>Add Movie</span>
                        </div>
                        <div className="home-tile" onClick={() => handleModalOpen('game')}>
                            <span>Add Game</span>
                        </div>
                    </div>

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
                            <div className="d-flex flex-column align-items-center">
                                <div className="input-group mb-2">
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Enter UPC"
                                        maxLength={13}
                                        value={upcCode}
                                        onChange={(e) => setUpcCode(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        disabled={!upcCode.trim()}
                                        onClick={() => {
                                            alert(`Lookup: ${upcCode}`);
                                            handleModalClose();
                                        }}
                                    >
                                        Lookup
                                    </button>
                                    {canScan && (
                                        <>
                                            <div className="input-group-text">OR</div>
                                            <button
                                                type="button"
                                                className="btn btn-outline-secondary"
                                                onClick={handleScanClick}
                                            >
                                                Scan Barcode
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                            {scanError && (
                                <div className="form-text text-warning mb-2">{scanError}</div>
                            )}
                            {showScanner && (
                                <BarcodeScanner
                                    onScan={(code) => {
                                        alert(`Scanned: ${code}`);
                                        handleModalClose();
                                    }}
                                    onError={(msg) => {
                                        setScanError(msg);
                                        setShowScanner(false);
                                    }}
                                    onClose={() => setShowScanner(false)}
                                />
                            )}
                        </>
                    )}
                        {modalType === 'book' && (
                            <BookForm key={formKey} hideSubmit hideTitle formRef={bookFormRef} onItemAdded={handleItemAddedAndClose} />
                        )}
                        {modalType === 'movie' && (
                            <MovieForm key={formKey} hideSubmit hideTitle formRef={movieFormRef} onItemAdded={handleItemAddedAndClose} />
                        )}
                        {modalType === 'game' && (
                            <GameForm key={formKey} hideSubmit hideTitle formRef={gameFormRef} onItemAdded={handleItemAddedAndClose} />
                        )}
                    </Modal>
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
        <>
            <div className={`container py-4 ${activeSection === 'home' ? 'home-bg' : ''}`}>
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
            {pageToast && (
                <Toast message={pageToast} type="warning" onDismiss={() => setPageToast('')} />
            )}
        </>
    );
};

export default VaultPage;
