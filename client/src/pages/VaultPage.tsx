import React, { useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import ItemList from '../components/ItemList';
import BookForm, { BookFormHandle } from '../components/BookForm';
import MovieForm, { MovieFormHandle } from '../components/MovieForm';
import GameForm, { GameFormHandle } from '../components/GameForm';
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
    SpeedDial,
    SpeedDialAction,
    SpeedDialIcon,
    Button,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BookIcon from '@mui/icons-material/Book';
import MovieIcon from '@mui/icons-material/Movie';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import BarcodeIcon from 'mdi-material-ui/Barcode';

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
    const bookFormRef = React.useRef<BookFormHandle>(null);
    const movieFormRef = React.useRef<MovieFormHandle>(null);
    const gameFormRef = React.useRef<GameFormHandle>(null);

    // track whether each form currently contains any value so the Reset button
    // can be enabled/disabled.  the child forms notify us via onDirtyChange.
    const [bookDirty, setBookDirty] = useState(false);
    const [movieDirty, setMovieDirty] = useState(false);
    const [gameDirty, setGameDirty] = useState(false);

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
        // map modal type to its ref so we can submit generically. the
        // individual form handles all expose requestSubmit(), so we don't need
        // the full HTMLFormElement type here.
        type SubmitHandle = {
            requestSubmit(): void;
        };

        const refMap: Record<'book' | 'movie' | 'game', React.RefObject<SubmitHandle>> = {
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
            // use MUI Fab for floating add button (category pages)
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

        // floating action menu on home page offering multiple quick actions
        const renderHomeFab = () => {
            if (activeSection !== 'home') return null;
            const actions = [
                { icon: <BarcodeIcon />, name: 'Scan Barcode', handler: () => handleModalOpen('upc') },
                { icon: <BookIcon />, name: 'Add Book', handler: () => handleModalOpen('book') },
                { icon: <MovieIcon />, name: 'Add Movie', handler: () => handleModalOpen('movie') },
                { icon: <SportsEsportsIcon />, name: 'Add Game', handler: () => handleModalOpen('game') },
            ];
            return (
                <SpeedDial
                    ariaLabel="Home actions"
                    sx={{ position: 'fixed', bottom: 16, right: 16 }}
                    icon={<SpeedDialIcon openIcon={<AddIcon />} />}
                >
                    {actions.map((action) => (
                        <SpeedDialAction
                            key={action.name}
                            icon={action.icon}
                            tooltipTitle={action.name}
                            aria-label={action.name}
                            onClick={action.handler}
                        />
                    ))}
                </SpeedDial>
            );
        };

    const renderSectionContent = () => {
        if (activeSection === 'admin') {
            // match the container style used for books/movies/games
            return (
                <Paper sx={{ shadow: 1, mb: 3, p: 3, height: '100%', width: '100%' }}>
                    <AdminTab />
                </Paper>
            );
        }

        if (activeSection === 'home') {
            // simply render the same empty paper container used on category pages
            return (
                <Paper data-testid="home-tile-container" sx={{ mb: 3, p: 3, height: '100%', width: '100%' }} />
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
                    {renderHomeFab()}
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
                    leftActions={
                        modalType && modalType !== 'upc' ? (
                            <Button
                                onClick={() => {
                                    // invoke the reset method exposed by the form via ref;
                                    // this clears every field (including errors) without
                                    // unmounting the component, avoiding visual flicker.
                                    switch (modalType) {
                                        case 'book':
                                            bookFormRef.current?.reset();
                                            break;
                                        case 'movie':
                                            movieFormRef.current?.reset();
                                            break;
                                        case 'game':
                                            gameFormRef.current?.reset();
                                            break;
                                    }
                                    // clear all dirty flags so button disables immediately
                                    setBookDirty(false);
                                    setMovieDirty(false);
                                    setGameDirty(false);
                                }}
                                disabled={
                                    !(modalType === 'book'
                                        ? bookDirty
                                        : modalType === 'movie'
                                        ? movieDirty
                                        : modalType === 'game'
                                        ? gameDirty
                                        : false)
                                }
                            >
                                Reset
                            </Button>
                        ) : undefined
                    }
                >
                    {modalType === 'upc' ? (
                        <>
                            {/* always display manual entry; scanner appears below when active */}
                            <BarcodeScanLookup
                                label="Barcode"
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
                                    ref: React.RefObject<BookFormHandle | MovieFormHandle | GameFormHandle>;
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
                                    ref={ref}
                                    onItemAdded={handleItemAddedAndClose}
                                    onDirtyChange={
                                        modalType === 'book'
                                            ? setBookDirty
                                            : modalType === 'movie'
                                            ? setMovieDirty
                                            : setGameDirty
                                    }
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
