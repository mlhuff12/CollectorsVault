import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import BookForm from '../../components/BookForm';
import * as api from '../../services/api';

jest.mock('../../services/api', () => ({
    addBook: jest.fn(),
    lookupBookByIsbn: jest.fn()
}));

describe('BookForm', () => {
    const mockAddBook = api.addBook as jest.MockedFunction<typeof api.addBook>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('submits parsed book payload and resets form on success', async () => {
        const onItemAdded = jest.fn();
        mockAddBook.mockResolvedValue({
            id: 1,
            title: 'Dune',
            authors: ['Frank Herbert'],
            category: 'book'
        });

        const { container } = render(<BookForm onItemAdded={onItemAdded} />);
        const inputs = container.querySelectorAll('input');

        fireEvent.change(inputs[0], { target: { value: 'Dune' } });
        fireEvent.change(inputs[1], {
            target: { value: ' Frank Herbert,  Brian Herbert ' }
        });
        fireEvent.change(inputs[2], { target: { value: ' 9780441172719 ' } });
        fireEvent.change(inputs[3], { target: { value: '1965' } });
        fireEvent.change(inputs[4], { target: { value: ' Sci-Fi ' } });

        fireEvent.click(screen.getByRole('button', { name: 'Add Book' }));

        await waitFor(() => {
            expect(mockAddBook).toHaveBeenCalledWith({
                title: 'Dune',
                authors: ['Frank Herbert', 'Brian Herbert'],
                isbn: '9780441172719',
                year: 1965,
                genre: 'Sci-Fi'
            });
        });

        expect(onItemAdded).toHaveBeenCalledTimes(1);
        expect(screen.getByText('Book added successfully!')).toBeInTheDocument();
    });

    it('shows validation when no author names provided', async () => {
        const { container } = render(<BookForm />);
        const inputs = container.querySelectorAll('input');

        fireEvent.change(inputs[0], { target: { value: 'Dune' } });
        fireEvent.change(inputs[1], { target: { value: ' , , ' } });
        fireEvent.click(screen.getByRole('button', { name: 'Add Book' }));

        expect(screen.getByText('Please add at least one author.')).toBeInTheDocument();
        expect(mockAddBook).not.toHaveBeenCalled();
    });
});
