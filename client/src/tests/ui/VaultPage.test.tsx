import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VaultPage from '../../pages/VaultPage';
import * as api from '../../services/api';

jest.mock('html5-qrcode', () => ({
    Html5Qrcode: function() {
        return {
            start: () => Promise.resolve(),
            stop: () => Promise.resolve()
        };
    },
    Html5QrcodeSupportedFormats: {
        EAN_13: 'EAN_13', EAN_8: 'EAN_8', UPC_A: 'UPC_A', UPC_E: 'UPC_E', CODE_128: 'CODE_128'
    }
}));

jest.mock('../../services/api', () => ({
    fetchItems: jest.fn(),
    addBook: jest.fn(),
    addMovie: jest.fn(),
    addGame: jest.fn(),
    deleteItem: jest.fn(),
    fetchAllUsers: jest.fn(),
    lookupBookByIsbn: jest.fn(),
    lookupMovieByUpc: jest.fn(),
    lookupGameByUpc: jest.fn()
}));

let mockIsAdmin = false;

jest.mock('../../context/AuthContext', () => ({
    useAuth: () => ({ username: 'testuser', logout: jest.fn(), isAdmin: mockIsAdmin })
}));

describe('VaultPage', () => {
    const mockFetchItems = api.fetchItems as jest.MockedFunction<typeof api.fetchItems>;
    const mockDeleteItem = api.deleteItem as jest.MockedFunction<typeof api.deleteItem>;
    const mockFetchAllUsers = api.fetchAllUsers as jest.MockedFunction<typeof api.fetchAllUsers>;

    beforeEach(() => {
        mockIsAdmin = false;
        jest.clearAllMocks();
        mockFetchItems.mockResolvedValue([
            { id: 1, title: 'Dune', description: 'Sci-fi classic', category: 'book' },
            { id: 2, title: 'Inception', description: 'Mind-bending thriller', category: 'movie' },
            { id: 3, title: 'Halo Infinite', description: 'FPS campaign', category: 'game' }
        ]);
        mockDeleteItem.mockResolvedValue();
        jest.spyOn(window, 'confirm').mockReturnValue(true);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    const renderVaultPage = (route = '/') => {
        return render(
            <MemoryRouter initialEntries={[route]}>
                <VaultPage />
            </MemoryRouter>
        );
    };

    it('renders home view and loads items from mocked endpoint service', async () => {
        renderVaultPage('/');

        expect(await screen.findByRole('heading', { name: "Collector's Vault Items" })).toBeInTheDocument();
        expect(screen.getByText('Dune')).toBeInTheDocument();
        expect(screen.getByText('Inception')).toBeInTheDocument();
        expect(screen.getByText('Halo Infinite')).toBeInTheDocument();
        expect(mockFetchItems).toHaveBeenCalledTimes(1);
    });

    it('switches home form based on collectible type dropdown', async () => {
        renderVaultPage('/');

        expect(await screen.findByRole('heading', { name: 'Add a New Book' })).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('Select collectible type'), {
            target: { value: 'movie' }
        });

        expect(screen.getByRole('heading', { name: 'Add a Movie' })).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('Select collectible type'), {
            target: { value: 'game' }
        });

        expect(screen.getByRole('heading', { name: 'Add a Game' })).toBeInTheDocument();
    });

    it('shows only books on the books route', async () => {
        renderVaultPage('/books');

        expect(await screen.findByRole('heading', { name: 'Books' })).toBeInTheDocument();
        expect(screen.getByText('Dune')).toBeInTheDocument();
        expect(screen.queryByText('Inception')).not.toBeInTheDocument();
        expect(screen.queryByText('Halo Infinite')).not.toBeInTheDocument();
    });

    it('deletes an item using mocked delete endpoint service', async () => {
        renderVaultPage('/');

        const deleteButton = await screen.findByLabelText('Delete Dune');
        fireEvent.click(deleteButton);

        await waitFor(() => {
            expect(mockDeleteItem).toHaveBeenCalledWith(1);
        });

        await waitFor(() => {
            expect(screen.queryByText('Dune')).not.toBeInTheDocument();
        });

        expect(window.confirm).toHaveBeenCalled();
    });

    it('does not show admin tab for non-admin users', async () => {
        mockIsAdmin = false;
        renderVaultPage('/');

        await screen.findByRole('heading', { name: "Collector's Vault Items" });

        expect(screen.queryByRole('button', { name: 'Admin' })).not.toBeInTheDocument();
    });

    it('shows admin tab for admin users', async () => {
        mockIsAdmin = true;
        mockFetchAllUsers.mockResolvedValue([]);
        renderVaultPage('/');

        await screen.findByRole('heading', { name: "Collector's Vault Items" });

        expect(screen.getByRole('button', { name: 'Admin' })).toBeInTheDocument();
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
