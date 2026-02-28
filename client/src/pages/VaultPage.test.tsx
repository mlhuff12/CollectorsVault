import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VaultPage from './VaultPage';
import * as api from '../services/api';

jest.mock('../services/api', () => ({
    fetchItems: jest.fn(),
    addBook: jest.fn(),
    addMovie: jest.fn(),
    addGame: jest.fn(),
    deleteItem: jest.fn()
}));

describe('VaultPage', () => {
    const mockFetchItems = api.fetchItems as jest.MockedFunction<typeof api.fetchItems>;
    const mockDeleteItem = api.deleteItem as jest.MockedFunction<typeof api.deleteItem>;

    beforeEach(() => {
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
});
