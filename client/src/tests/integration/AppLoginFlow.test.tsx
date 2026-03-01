import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../../App';
import * as api from '../../services/api';

jest.mock('../../services/api', () => ({
    fetchItems: jest.fn(),
    addBook: jest.fn(),
    addMovie: jest.fn(),
    addGame: jest.fn(),
    deleteItem: jest.fn(),
    signup: jest.fn(),
    login: jest.fn()
}));

describe('App login integration flow', () => {
    const mockLogin = api.login as jest.MockedFunction<typeof api.login>;
    const mockFetchItems = api.fetchItems as jest.MockedFunction<typeof api.fetchItems>;

    beforeEach(() => {
        localStorage.clear();
        jest.clearAllMocks();
        mockFetchItems.mockResolvedValue([]);
        window.history.pushState({}, '', '/login');
    });

    it('logs in from login page and renders vault home without API server', async () => {
        mockLogin.mockResolvedValue({ token: 'token-123', username: 'michelle' });

        render(<App />);

        fireEvent.change(screen.getByLabelText('Username'), {
            target: { value: 'michelle' }
        });
        fireEvent.change(screen.getByLabelText('Authenticator Code'), {
            target: { value: '123456' }
        });

        fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

        await waitFor(() => {
            expect(mockLogin).toHaveBeenCalledWith('michelle', '123456');
        });

        expect(await screen.findByRole('heading', { name: "Collector's Vault Items" })).toBeInTheDocument();
        expect(screen.getByText('michelle')).toBeInTheDocument();
        expect(mockFetchItems).toHaveBeenCalled();
        expect(localStorage.getItem('cv_token')).toBe('token-123');
        expect(localStorage.getItem('cv_username')).toBe('michelle');
    });
});
