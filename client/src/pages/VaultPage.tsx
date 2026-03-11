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
import {
    Box,
    Container,
    Grid,
    Paper,
    Typography,
    Fab,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

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

    // listen for global scan event from header button
    React.useEffect(() => {
        const handler = () => handleModalOpen('upc');
        window.addEventListener('open-scan-modal', handler);
        return () => window.removeEventListener('open-scan-modal', handler);
    }, []);

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
            // use MUI Fab for floating add button
            return (
                <Fab
                    color="primary"
                    aria-label={`Add ${label}`}
                    sx={{ position: 'fixed', bottom: 16, right: 16 }}
                    onClick={() => handleModalOpen(formType)}
                >
                    <AddIcon />
                </Fab>
            );
        };

    const renderSectionContent = () => {
        if (activeSection === 'admin') {
            return (
                <Paper sx={{ mb: 3, p: 3 }}>
                    <AdminTab />
                </Paper>
            );
        }

        if (activeSection === 'home') {
            // tiles for primary actions - use grid layout
            const tiles = [
                { label: 'Scan Barcode', action: () => handleModalOpen('upc') },
                { label: 'Add Book', action: () => handleModalOpen('book') },
                { label: 'Add Movie', action: () => handleModalOpen('movie') },
                { label: 'Add Game', action: () => handleModalOpen('game') },
            ] as const;

            return (
                <Paper data-testid="home-tile-container" sx={{ mb: 3, p: 3 }}>
                    <Grid container spacing={3} justifyContent="center">
                        {tiles.map((tile, idx) => (
                            <Grid
                                key={idx}
                                sx={{
                                    flexBasis: '50%',
                                    display: 'flex',
                                    justifyContent: idx % 2 === 0 ? 'flex-end' : 'flex-start',
                                }}
                            >
                                <Box
                                    className="home-tile"
                                    sx={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        textAlign: 'center',
                                        height: '100%',
                                        p: 3,
                                        cursor: 'pointer',
                                    }}
                                    onClick={tile.action}
                                >
                                    <Typography>{tile.label}</Typography>
                                </Box>
                            </Grid>
                        ))}
                    </Grid>
                </Paper>
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
                <Paper sx={{ shadow: 1, p: 3, height: '100%', width: '100%' }}>
                    <ItemList refreshKey={refreshKey} categoryFilter={cat} title={title} />
                </Paper>
            );
        }

        return null;
    };

    return (
        <>
            {/* outer wrapper uses MUI Box/Container for full-height flex layout */}
            <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                <Container sx={{ py: 4, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ flexGrow: 1, position: 'relative', display: 'flex' }}>
                        {renderSectionContent()}
                    </Box>
                    {renderAddButton()}
                </Container>
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
            </Box>
        </>
    );
};

export default VaultPage;
