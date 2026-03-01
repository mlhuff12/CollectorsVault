import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import MovieForm from '../../components/MovieForm';
import * as api from '../../services/api';

jest.mock('../../services/api', () => ({
    addMovie: jest.fn(),
    lookupMovieByUpc: jest.fn()
}));

describe('MovieForm', () => {
    const mockAddMovie = api.addMovie as jest.MockedFunction<typeof api.addMovie>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('submits movie and calls onItemAdded on success', async () => {
        const onItemAdded = jest.fn();
        mockAddMovie.mockResolvedValue({
            id: 1,
            title: 'Inception',
            director: 'Christopher Nolan',
            releaseYear: 2010,
            genre: 'Sci-fi',
            category: 'movie'
        });

        const { container } = render(<MovieForm onItemAdded={onItemAdded} />);
        const inputs = container.querySelectorAll('input');

        fireEvent.change(inputs[0], { target: { value: 'Inception' } });
        fireEvent.change(inputs[1], { target: { value: 'Christopher Nolan' } });
        fireEvent.change(inputs[2], { target: { value: '2010' } });
        fireEvent.change(inputs[3], { target: { value: 'Sci-fi' } });

        fireEvent.click(screen.getByRole('button', { name: 'Add Movie' }));

        await waitFor(() => {
            expect(mockAddMovie).toHaveBeenCalledWith({
                title: 'Inception',
                director: 'Christopher Nolan',
                releaseYear: 2010,
                genre: 'Sci-fi'
            });
        });

        expect(onItemAdded).toHaveBeenCalledTimes(1);
    });

    it('shows API error message when add fails', async () => {
        mockAddMovie.mockRejectedValue(new Error('boom'));

        const { container } = render(<MovieForm />);
        const inputs = container.querySelectorAll('input');

        fireEvent.change(inputs[0], { target: { value: 'Inception' } });
        fireEvent.change(inputs[1], { target: { value: 'Christopher Nolan' } });
        fireEvent.change(inputs[2], { target: { value: '2010' } });
        fireEvent.change(inputs[3], { target: { value: 'Sci-fi' } });

        fireEvent.click(screen.getByRole('button', { name: 'Add Movie' }));

        expect(await screen.findByText('Failed to add movie')).toBeInTheDocument();
    });
});
