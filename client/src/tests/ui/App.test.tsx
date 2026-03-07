import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';

let mockIsAuthenticated = false;

vi.mock('../../pages/LoginPage', () => ({
    default: () => <div>Login Page Mock</div>
}));
vi.mock('../../pages/SignupPage', () => ({
    default: () => <div>Signup Page Mock</div>
}));
vi.mock('../../pages/VaultPage', () => ({
    default: () => <div>Vault Page Mock</div>
}));

vi.mock('../../context/AuthContext', () => ({
    AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
    useAuth: () => ({ isAuthenticated: mockIsAuthenticated })
}));

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
