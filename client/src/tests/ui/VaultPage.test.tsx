import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VaultPage from '../../pages/VaultPage';
import * as api from '../../services/api';

// control object for simulating camera start success/failure
const qrMockBehavior = { startShouldReject: false };
vi.mock('html5-qrcode', () => ({
    Html5Qrcode: function() {
        return {
            start: () => qrMockBehavior.startShouldReject ? Promise.reject(new Error('camera error')) : Promise.resolve(),
            stop: () => Promise.resolve()
        };
    },
    Html5QrcodeSupportedFormats: {
        EAN_13: 'EAN_13', EAN_8: 'EAN_8', UPC_A: 'UPC_A', UPC_E: 'UPC_E', CODE_128: 'CODE_128'
    }
}));

vi.mock('../../services/api', () => ({
    fetchItems: vi.fn(),
    addBook: vi.fn(),
    addMovie: vi.fn(),
    addGame: vi.fn(),
    fetchAllUsers: vi.fn(),
    lookupBookByIsbn: vi.fn(),
    lookupMovieByUpc: vi.fn(),
    lookupGameByUpc: vi.fn()
}));

let mockIsAdmin = false;

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({ username: 'testuser', logout: vi.fn(), isAdmin: mockIsAdmin })
}));

describe('VaultPage', () => {
    const mockFetchItems = api.fetchItems as jest.MockedFunction<typeof api.fetchItems>;
    const mockFetchAllUsers = api.fetchAllUsers as jest.MockedFunction<typeof api.fetchAllUsers>;

    beforeEach(() => {
        mockIsAdmin = false;
        vi.clearAllMocks();
        mockFetchItems.mockResolvedValue([
            { id: 1, title: 'Dune', description: 'Sci-fi classic', category: 'book' },
            { id: 2, title: 'Inception', description: 'Mind-bending thriller', category: 'movie' },
            { id: 3, title: 'Halo Infinite', description: 'FPS campaign', category: 'game' }
        ]);
        vi.spyOn(window, 'confirm').mockReturnValue(true);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    const renderVaultPage = (route = '/') => {
        return render(
            <MemoryRouter initialEntries={[route]}>
                <VaultPage />
            </MemoryRouter>
        );
    };

    it('renders home tiles and does not fetch any items', async () => {
        renderVaultPage('/');

        // expect our four tiles to be visible
        expect(await screen.findByText('Scan Barcode')).toBeInTheDocument();
        expect(screen.getByText('Add Book')).toBeInTheDocument();
        expect(screen.getByText('Add Movie')).toBeInTheDocument();
        expect(screen.getByText('Add Game')).toBeInTheDocument();
        expect(mockFetchItems).not.toHaveBeenCalled();
    });

    it('opens and closes a modal when a tile is clicked', async () => {
        renderVaultPage('/');

        fireEvent.click(await screen.findByText('Add Book'));
        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();
        // header should display full sentence
        expect(within(dialog).getByText('Add a Book')).toBeInTheDocument();
        // form title inside should be removed
        expect(within(dialog).queryByText('Add a New Book')).not.toBeInTheDocument();

        // modal should use scrollable dialog class and limit height
        const dialogNode = dialog.closest('.modal-dialog');
        expect(dialogNode).toHaveClass('modal-dialog-scrollable');
        const content = dialogNode?.querySelector('.modal-content');
        expect(content).toHaveStyle({ maxHeight: '90vh' });

        // close using close button
        fireEvent.click(screen.getByLabelText('Close'));
        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
    });

    it('opens book modal and can submit the form via the modal confirm', async () => {
        renderVaultPage('/');
        fireEvent.click(await screen.findByText('Add Book'));
        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();

        // fill the basic required fields
        fireEvent.change(screen.getByLabelText('Title:'), { target: { value: 'Test Title' } });
        fireEvent.change(screen.getByLabelText('Authors (comma-separated):'), { target: { value: 'Tester' } });

        // clicking the header button triggers requestSubmit; jsdom doesn’t implement
        // requestSubmit reliably, so also submit the form element directly to ensure
        // the BookForm handler runs and the API spy is invoked.
        fireEvent.click(screen.getByRole('button', { name: 'Create' }));
        const formElement = dialog.querySelector('form');
        if (formElement) {
            fireEvent.submit(formElement);
        }

        // the underlying BookForm tests already verify api.addBook, but we keep a
        // sanity check here rather than drive the entire behaviour through the
        // modal.
        await waitFor(() => {
            expect(api.addBook).toHaveBeenCalled();
        });

        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
    });

    it('shows manual UPC entry and scan button when camera is available, and keeping input visible after opening scanner', async () => {
        // ensure mediaDevices is present before rendering
        Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: vi.fn() }, configurable: true });
        renderVaultPage('/');
        fireEvent.click(await screen.findByText('Scan Barcode'));

        const input = screen.getByPlaceholderText('Enter UPC');
        expect(input).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Lookup' })).toBeInTheDocument();
        expect(screen.getByText('OR')).toBeInTheDocument();
        const scanBtn = screen.getByRole('button', { name: /Scan Barcode/ });
        expect(scanBtn).toBeInTheDocument();

        // open the scanner, input should remain present
        fireEvent.click(scanBtn);
        expect(screen.getByPlaceholderText('Enter UPC')).toBeInTheDocument();
    });

    it('calls lookup callback and closes modal when Lookup pressed', async () => {
        Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: vi.fn() }, configurable: true });
        // intercept window.alert to track it
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

        renderVaultPage('/');
        fireEvent.click(await screen.findByText('Scan Barcode'));
        fireEvent.change(screen.getByPlaceholderText('Enter UPC'), { target: { value: '555' } });
        fireEvent.click(screen.getByRole('button', { name: 'Lookup' }));

        await waitFor(() => {
            expect(alertSpy).toHaveBeenCalledWith('Lookup: 555');
        });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        alertSpy.mockRestore();
    });

    it('displays error message under UPC input when scanner fails to start', async () => {
        qrMockBehavior.startShouldReject = true;
        Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: vi.fn() }, configurable: true });
        renderVaultPage('/');
        fireEvent.click(await screen.findByText('Scan Barcode'));

        const scanBtn = screen.getByRole('button', { name: /Scan Barcode/ });
        fireEvent.click(scanBtn);

        expect(await screen.findByText(/Camera could not be opened/i)).toBeInTheDocument();
    });

    it('clears prior scan error when the UPC modal is reopened', async () => {
        qrMockBehavior.startShouldReject = true;
        Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: vi.fn() }, configurable: true });
        renderVaultPage('/');
        fireEvent.click(await screen.findByText('Scan Barcode'));
        fireEvent.click(screen.getByRole('button', { name: /Scan Barcode/ }));
        await screen.findByText(/Camera could not be opened/i);

        // close and open again with scanner allowed
        fireEvent.click(screen.getByLabelText('Close'));
        qrMockBehavior.startShouldReject = false;
        fireEvent.click(screen.getByText(/Scan Barcode/));
        expect(screen.queryByText(/Camera could not be opened/i)).not.toBeInTheDocument();
    });

    it('hides OR and scan button when camera is unavailable', async () => {
        delete (navigator as any).mediaDevices;
        renderVaultPage('/');
        fireEvent.click(await screen.findByText('Scan Barcode'));

        expect(screen.getByPlaceholderText('Enter UPC')).toBeInTheDocument();
        expect(screen.queryByText('OR')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Scan Barcode/ })).not.toBeInTheDocument();
    });

    it('shows only books on the books route', async () => {
        renderVaultPage('/books');

        expect(await screen.findByRole('heading', { name: 'Books' })).toBeInTheDocument();
        expect(screen.getByText('Dune')).toBeInTheDocument();
        expect(screen.queryByText('Inception')).not.toBeInTheDocument();
        expect(screen.queryByText('Halo Infinite')).not.toBeInTheDocument();
    });

    // deletion functionality removed from this page; no test required


    it('does not show admin tab for non-admin users', async () => {
        mockIsAdmin = false;
        renderVaultPage('/');

        // ensure the page header renders (text updated in UI)
        await screen.findByRole('heading', { name: "Collector's Vault" });

        expect(screen.queryByRole('button', { name: 'Admin' })).not.toBeInTheDocument();
    });

    it('shows admin tab for admin users', async () => {
        mockIsAdmin = true;
        mockFetchAllUsers.mockResolvedValue([]);
        renderVaultPage('/');

        // header adjusted to match updated UI
        await screen.findByRole('heading', { name: "Collector's Vault" });

        expect(screen.getByRole('button', { name: 'Admin' })).toBeInTheDocument();
    });

    it('book page shows UPC/ISBN lookup field', async () => {
        renderVaultPage('/books');
        expect(await screen.findByPlaceholderText('Enter UPC or ISBN')).toBeInTheDocument();
    });

    it('movie page shows UPC lookup field', async () => {
        Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: vi.fn() }, configurable: true });
        renderVaultPage('/movies');
        expect(await screen.findByPlaceholderText('Enter UPC')).toBeInTheDocument();
    });

    it('game page shows UPC lookup field', async () => {
        renderVaultPage('/games');
        expect(await screen.findByPlaceholderText('Enter UPC')).toBeInTheDocument();
    });

    it('renders admin section on /admin route for admin users', async () => {
        mockIsAdmin = true;
        mockFetchAllUsers.mockResolvedValue([
            { id: 1, username: 'adminuser', isAdmin: true, bookCount: 0, movieCount: 0, gameCount: 0 }
        ]);
        renderVaultPage('/admin');

        expect(await screen.findByRole('heading', { name: 'All Users' })).toBeInTheDocument();
    });
});
