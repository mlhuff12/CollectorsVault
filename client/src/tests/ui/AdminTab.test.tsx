import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminTab from '../../components/AdminTab';
import * as api from '../../services/api';

vi.mock('../../services/api', () => ({
    fetchAllUsers: vi.fn(),
    deleteUserById: vi.fn()
}));

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({ username: 'adminuser' })
}));

describe('AdminTab', () => {
    const mockFetchAllUsers = api.fetchAllUsers as jest.MockedFunction<typeof api.fetchAllUsers>;
    const mockDeleteUserById = api.deleteUserById as jest.MockedFunction<typeof api.deleteUserById>;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        mockFetchAllUsers.mockResolvedValue([
            { id: 1, username: 'adminuser', isAdmin: true, bookCount: 2, movieCount: 1, gameCount: 0 },
            { id: 2, username: 'regularuser', isAdmin: false, bookCount: 0, movieCount: 3, gameCount: 5 }
        ]);
        mockDeleteUserById.mockResolvedValue();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('loads and displays all users with counts', async () => {
        render(<AdminTab />);

        expect(screen.getByText(/loading/i)).toBeInTheDocument();

        expect(await screen.findByText('adminuser')).toBeInTheDocument();
        expect(screen.getByText('regularuser')).toBeInTheDocument();
        expect(mockFetchAllUsers).toHaveBeenCalledTimes(1);
    });

    it('shows admin badge for admin users', async () => {
        render(<AdminTab />);

        await screen.findByText('adminuser');

        expect(screen.getByText('admin')).toBeInTheDocument();
    });

    it('displays correct item counts for each user', async () => {
        render(<AdminTab />);

        await screen.findByText('adminuser');

        const rows = screen.getAllByRole('row');
        // rows[0] is the header, rows[1] is adminuser, rows[2] is regularuser
        expect(rows[1]).toHaveTextContent('2'); // bookCount for adminuser
        expect(rows[1]).toHaveTextContent('1'); // movieCount for adminuser
        expect(rows[2]).toHaveTextContent('3'); // movieCount for regularuser
        expect(rows[2]).toHaveTextContent('5'); // gameCount for regularuser
    });

    it('disables delete button for own user account', async () => {
        render(<AdminTab />);

        await screen.findByText('adminuser');

        const selfDeleteButton = screen.getByLabelText('Cannot delete adminuser');
        expect(selfDeleteButton).toBeDisabled();
    });

    it('enables delete button for other users', async () => {
        render(<AdminTab />);

        await screen.findByText('regularuser');

        const otherDeleteButton = screen.getByLabelText('Delete regularuser');
        expect(otherDeleteButton).not.toBeDisabled();
    });

    it('deletes a user when confirmed', async () => {
        render(<AdminTab />);

        await screen.findByText('regularuser');

        const deleteButton = screen.getByLabelText('Delete regularuser');
        fireEvent.click(deleteButton);

        await waitFor(() => {
            expect(mockDeleteUserById).toHaveBeenCalledWith(2);
        });

        await waitFor(() => {
            expect(screen.queryByText('regularuser')).not.toBeInTheDocument();
        });

        expect(window.confirm).toHaveBeenCalled();
    });

    it('does not delete when confirm is cancelled', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(false);

        render(<AdminTab />);

        await screen.findByText('regularuser');

        const deleteButton = screen.getByLabelText('Delete regularuser');
        fireEvent.click(deleteButton);

        expect(mockDeleteUserById).not.toHaveBeenCalled();
        expect(screen.getByText('regularuser')).toBeInTheDocument();
    });

    it('shows error state when loading fails', async () => {
        mockFetchAllUsers.mockRejectedValue(new Error('request failed'));

        render(<AdminTab />);

        expect(await screen.findByText('Error: request failed')).toBeInTheDocument();
    });

    it('shows empty message when no users found', async () => {
        mockFetchAllUsers.mockResolvedValue([]);

        render(<AdminTab />);

        expect(await screen.findByText('No users found.')).toBeInTheDocument();
    });
});
