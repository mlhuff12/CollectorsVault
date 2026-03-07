import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ItemList from '../../components/ItemList';
import type { VaultItem } from '../../models';
import * as api from '../../services/api';

vi.mock('../../services/api', () => ({
    fetchItems: vi.fn(),
    deleteItem: vi.fn()
}));

describe('ItemList', () => {
    const mockFetchItems = api.fetchItems as jest.MockedFunction<typeof api.fetchItems>;
    const mockDeleteItem = api.deleteItem as jest.MockedFunction<typeof api.deleteItem>;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(window, 'confirm').mockReturnValue(true);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('loads and renders items from mocked service', async () => {
        mockFetchItems.mockResolvedValue([
            { id: 1, title: 'Dune', category: 'book' },
            { id: 2, title: 'Inception', category: 'movie' }
        ] as VaultItem[]);

        render(<ItemList />);

        expect(screen.getByText('Loading...')).toBeInTheDocument();
        expect(await screen.findByText('Dune')).toBeInTheDocument();
        expect(screen.getByText('Inception')).toBeInTheDocument();
    });

    it('applies category filter', async () => {
        mockFetchItems.mockResolvedValue([
            { id: 1, title: 'Dune', category: 'book' },
            { id: 2, title: 'Inception', category: 'movie' }
        ] as VaultItem[]);

        render(<ItemList categoryFilter="book" title="Books" />);

        expect(await screen.findByRole('heading', { name: 'Books' })).toBeInTheDocument();
        expect(screen.getByText('Dune')).toBeInTheDocument();
        expect(screen.queryByText('Inception')).not.toBeInTheDocument();
    });

    it('deletes item when confirmed', async () => {
        mockFetchItems.mockResolvedValue([
            { id: 1, title: 'Dune', category: 'book' }
        ] as VaultItem[]);
        mockDeleteItem.mockResolvedValue();

        render(<ItemList />);

        const button = await screen.findByLabelText('Delete Dune');
        fireEvent.click(button);

        await waitFor(() => {
            expect(mockDeleteItem).toHaveBeenCalledWith(1);
        });

        await waitFor(() => {
            expect(screen.queryByText('Dune')).not.toBeInTheDocument();
        });
    });

    it('shows error state when loading fails', async () => {
        mockFetchItems.mockRejectedValue(new Error('request failed'));

        render(<ItemList />);

        expect(await screen.findByText('Error: request failed')).toBeInTheDocument();
    });
});
