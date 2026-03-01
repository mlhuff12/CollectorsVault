import React from 'react';
import { render, screen } from '@testing-library/react';

let mockIsAuthenticated = false;

jest.mock('../../pages/LoginPage', () => () => <div>Login Page Mock</div>);
jest.mock('../../pages/SignupPage', () => () => <div>Signup Page Mock</div>);
jest.mock('../../pages/VaultPage', () => () => <div>Vault Page Mock</div>);

jest.mock('../../context/AuthContext', () => {
    const React = require('react');
    return {
        AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
        useAuth: () => ({ isAuthenticated: mockIsAuthenticated })
    };
});

import App from '../../App';

describe('App routing', () => {
    beforeEach(() => {
        mockIsAuthenticated = false;
        window.history.pushState({}, '', '/');
    });

    it('redirects protected route to login when unauthenticated', () => {
        window.history.pushState({}, '', '/books');

        render(<App />);

        expect(screen.getByText('Login Page Mock')).toBeInTheDocument();
    });

    it('renders vault page on protected route when authenticated', () => {
        mockIsAuthenticated = true;
        window.history.pushState({}, '', '/movies');

        render(<App />);

        expect(screen.getByText('Vault Page Mock')).toBeInTheDocument();
    });

    it('renders signup page on signup route', () => {
        window.history.pushState({}, '', '/signup');

        render(<App />);

        expect(screen.getByText('Signup Page Mock')).toBeInTheDocument();
    });
});
