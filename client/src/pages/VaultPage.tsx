import React, { useState } from 'react';
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
            // include the type of item in the toast if we know it
            const itemType = modalType ? modalType.charAt(0).toUpperCase() + modalType.slice(1) : 'item';
            setPageToast(`The ${itemType} ${title} has successfully been created.`);
            setPageToastType('success');
        }
    };

    const handleModalConfirm = () => {
        // map modal type to its ref so we can submit generically
        const refMap: Record<'book' | 'movie' | 'game', React.RefObject<HTMLFormElement>> = {
            book: bookFormRef,
            movie: movieFormRef,
            game: gameFormRef,
        };

        if (modalType && modalType !== 'upc' && refMap[modalType]) {
            refMap[modalType].current?.requestSubmit();
        }
    };


    // convert pathname to a section enum, defaulting to home when unknown
    const sectionFromPath = (path: string): VaultSection => {
        // drop any query/hash data and trim slashes
        const clean = path.split(/[?#]/)[0];
        const trimmed = clean.replace(/^\/+|\/+$/g, '');
        if (trimmed === '' || !(['books','movies','games','admin'] as string[]).includes(trimmed)) {
            return 'home';
        }
        return trimmed as VaultSection;
    };

    const setSection = (section: VaultSection) => {
        history.push(section === 'home' ? '/' : `/${section}`);
    };

    const activeSection = sectionFromPath(location.pathname);


    // attempt scanning from UPC modal, with permission check to avoid flicker

            // helper used to render the floating "add" button for category pages
        const renderAddButton = () => {
            const singularMap: Record<string, 'book' | 'movie' | 'game'> = {
                books: 'book',
                movies: 'movie',
                games: 'game',
            };

            const formType = singularMap[activeSection];
            if (!formType) return null;

            const label = formType.charAt(0).toUpperCase() + formType.slice(1);
            // fixed position at bottom right of viewport so it sits beneath container
            return (
                <button
                    type="button"
                    className="btn btn-primary float-end bottom-0 end-0 m-3 rounded-circle position-fixed"
                    aria-label={`Add ${label}`}
                    onClick={() => handleModalOpen(formType)}
                >
                    <span className="fs-4">+</span>
                </button>
            );
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
            // container has white background and enforces two columns per row
            return (
                <>
                    <div data-testid="home-tile-container" className="card shadow-sm mb-3 p-3">
                        <div className="row row-cols-2 g-3 w-auto mx-auto justify-content-center">
                            {/* left/right columns are laid out explicitly for styling */}
                            {(
                                [
                                    { label: 'Scan Barcode', action: () => handleModalOpen('upc') },
                                    { label: 'Add Book', action: () => handleModalOpen('book') },
                                    { label: 'Add Movie', action: () => handleModalOpen('movie') },
                                    { label: 'Add Game', action: () => handleModalOpen('game') },
                                ] as const
                            ).map((tile, idx) => (
                                <div
                                    key={idx}
                                    className={idx % 2 === 0 ? 'col d-flex justify-content-end' : 'col d-flex justify-content-start'}
                                >
                                    <div
                                        className="home-tile d-flex justify-content-center align-items-center text-center h-100 p-3"
                                        onClick={tile.action}
                                    >
                                        <span>{tile.label}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            );
        }

        // books / movies / games use same structure; derive filter and title from section
        const singular: Record<string, 'book' | 'movie' | 'game'> = {
            books: 'book',
            movies: 'movie',
            games: 'game',
        };
        const cat = singular[activeSection];
        if (cat) {
            const title = cat.charAt(0).toUpperCase() + cat.slice(1) + 's';
            return (
                <>
                    <div className="card shadow-sm p-3 h-100 w-100">
                        <ItemList refreshKey={refreshKey} categoryFilter={cat} title={title} />
                    </div>
                </>
            );
        }

        return null;
    };

    return (
        <>
            {/* outer wrapper ensures the page is always full height and uses the
                same background regardless of which section is active. The
                .container inside limits content width while remaining
                transparent so the gradient shows through. */}
            <div className="vault-container d-flex flex-column min-vh-100">
                <div className="container py-4 flex-grow-1 d-flex flex-column">
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
                    {(
                        [
                            { section: 'home' as VaultSection, label: 'Home', adminOnly: false },
                            { section: 'books' as VaultSection, label: 'Books', adminOnly: false },
                            { section: 'movies' as VaultSection, label: 'Movies', adminOnly: false },
                            { section: 'games' as VaultSection, label: 'Games', adminOnly: false },
                            { section: 'admin' as VaultSection, label: 'Admin', adminOnly: true },
                        ] as const
                    ).map(({ section, label, adminOnly }) => {
                        if (adminOnly && !isAdmin) return null;
                        return (
                            <button
                                key={section}
                                type="button"
                                className={
                                    activeSection === section ? 'btn btn-primary' : 'btn btn-outline-secondary'
                                }
                                onClick={() => setSection(section)}
                            >
                                {label}
                            </button>
                        );
                    })}
                </nav>
            </div>

                    <div className="flex-grow-1 position-relative d-flex col">
                        {renderSectionContent()}
                    </div>
                    {renderAddButton()}
                    
                </div>
                {/* global modal shared across sections */}
                <Modal
                    show={modalType !== null}
                    title={
                        modalType
                            ? {
                                  book: 'Add a Book',
                                  movie: 'Add a Movie',
                                  game: 'Add a Game',
                                  upc: 'Scan Barcode',
                              }[modalType]
                            : ''
                    }
                    onClose={handleModalClose}
                    onConfirm={modalType === 'upc' ? undefined : handleModalConfirm}
                    confirmText="Create"
                >
                    {modalType === 'upc' ? (
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
                    ) : null}
                    {modalType && modalType !== 'upc' ? (
                        (() => {
                            const formMap: Record<
                                'book' | 'movie' | 'game',
                                {
                                    Component: React.FC<any>;
                                    ref: React.RefObject<HTMLFormElement>;
                                }
                            > = {
                                book: { Component: BookForm, ref: bookFormRef },
                                movie: { Component: MovieForm, ref: movieFormRef },
                                game: { Component: GameForm, ref: gameFormRef },
                            };
                            const { Component, ref } = formMap[modalType as 'book' | 'movie' | 'game'];
                            return (
                                <Component
                                    key={formKey}
                                    hideSubmit
                                    hideTitle
                                    formRef={ref}
                                    onItemAdded={handleItemAddedAndClose}
                                />
                            );
                        })()
                    ) : null}
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
