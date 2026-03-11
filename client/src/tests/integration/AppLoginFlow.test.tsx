import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../../App';
import * as api from '../../services/api';

vi.mock('../../services/api', () => ({
    fetchItems: vi.fn(),
    addBook: vi.fn(),
    addMovie: vi.fn(),
    addGame: vi.fn(),
    deleteItem: vi.fn(),
    signup: vi.fn(),
    login: vi.fn()
}));

describe('App login integration flow', () => {
    const mockLogin = api.login as jest.MockedFunction<typeof api.login>;
    const mockFetchItems = api.fetchItems as jest.MockedFunction<typeof api.fetchItems>;

    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
        mockFetchItems.mockResolvedValue([]);
        window.history.pushState({}, '', '/login');
    });

    it('logs in from login page and renders vault home without API server', async () => {
        mockLogin.mockResolvedValue({ token: 'token-123', username: 'michelle', isAdmin: false });

        render(<App />);

        fireEvent.change(screen.getByLabelText(/username/i), {
            target: { value: 'michelle' }
        });
        fireEvent.change(screen.getByLabelText(/authenticator code/i), {
            target: { value: '123456' }
        });

        fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

        await waitFor(() => {
            expect(mockLogin).toHaveBeenCalledWith('michelle', '123456');
        });

        // after login we should land on the home tiles rather than an item list
        expect(await screen.findByText('Scan Barcode')).toBeInTheDocument();
        expect(mockFetchItems).not.toHaveBeenCalled();
        expect(localStorage.getItem('cv_token')).toBe('token-123');
        expect(localStorage.getItem('cv_username')).toBe('michelle');
    });
});
