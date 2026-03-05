import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import GameForm from '../../components/GameForm';
import * as api from '../../services/api';

vi.mock('../../services/api', () => ({
    addGame: vi.fn(),
    lookupGameByUpc: vi.fn()
}));

describe('GameForm', () => {
    const mockAddGame = api.addGame as jest.MockedFunction<typeof api.addGame>;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('submits game and calls onItemAdded on success', async () => {
        const onItemAdded = vi.fn();
        mockAddGame.mockResolvedValue({
            title: 'Halo Infinite',
            platform: 'Xbox',
            releaseDate: '2021-12-08'
        });

        const { container } = render(<GameForm onItemAdded={onItemAdded} />);
        const inputs = container.querySelectorAll('input');

        fireEvent.change(inputs[0], { target: { value: 'Halo Infinite' } });
        fireEvent.change(inputs[1], { target: { value: 'Xbox' } });
        fireEvent.change(inputs[2], { target: { value: '2021-12-08' } });

        fireEvent.click(screen.getByRole('button', { name: 'Add Game' }));

        await waitFor(() => {
            expect(mockAddGame).toHaveBeenCalledWith({
                title: 'Halo Infinite',
                platform: 'Xbox',
                releaseDate: '2021-12-08'
            });
        });

        expect(onItemAdded).toHaveBeenCalledTimes(1);
    });

    it('shows error message when add fails', async () => {
        mockAddGame.mockRejectedValue(new Error('boom'));

        const { container } = render(<GameForm />);
        const inputs = container.querySelectorAll('input');

        fireEvent.change(inputs[0], { target: { value: 'Halo Infinite' } });
        fireEvent.change(inputs[1], { target: { value: 'Xbox' } });
        fireEvent.change(inputs[2], { target: { value: '2021-12-08' } });

        fireEvent.click(screen.getByRole('button', { name: 'Add Game' }));

        expect(await screen.findByText('Failed to add game. Please try again.')).toBeInTheDocument();
    });
});
