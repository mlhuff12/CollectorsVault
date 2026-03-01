import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import LoginPage from '../../pages/LoginPage';
import SignupPage from '../../pages/SignupPage';
import * as api from '../../services/api';
import QRCode from 'qrcode';

const mockSetAuth = jest.fn();

jest.mock('../../services/api', () => ({
    login: jest.fn(),
    signup: jest.fn()
}));

jest.mock('../../context/AuthContext', () => ({
    useAuth: () => ({
        setAuth: mockSetAuth
    })
}));

jest.mock('qrcode', () => ({
    toDataURL: jest.fn()
}));

describe('Auth UI flow', () => {
    const mockLogin = api.login as jest.MockedFunction<typeof api.login>;
    const mockSignup = api.signup as jest.MockedFunction<typeof api.signup>;
    const mockToDataURL = QRCode.toDataURL as unknown as jest.MockedFunction<
        (text: string, options?: unknown) => Promise<string>
    >;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('logs in with mocked API call and redirects to home', async () => {
        mockLogin.mockResolvedValue({ token: 'fake-token', username: 'michelle', isAdmin: false });

        const history = createMemoryHistory({ initialEntries: ['/login'] });

        render(
            <Router history={history}>
                <LoginPage />
            </Router>
        );

        fireEvent.change(screen.getByLabelText('Username'), {
            target: { value: '  michelle  ' }
        });

        fireEvent.change(screen.getByLabelText('Authenticator Code'), {
            target: { value: ' 123456 ' }
        });

        fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

        await waitFor(() => {
            expect(mockLogin).toHaveBeenCalledWith('michelle', '123456');
        });

        expect(mockSetAuth).toHaveBeenCalledWith('fake-token', 'michelle', false);
        expect(history.location.pathname).toBe('/');
    });

    it('shows login error from mocked API response', async () => {
        mockLogin.mockRejectedValue({ response: { data: 'Invalid username or authenticator code.' } });

        const history = createMemoryHistory({ initialEntries: ['/login'] });

        render(
            <Router history={history}>
                <LoginPage />
            </Router>
        );

        fireEvent.change(screen.getByLabelText('Username'), {
            target: { value: 'michelle' }
        });

        fireEvent.change(screen.getByLabelText('Authenticator Code'), {
            target: { value: '000000' }
        });

        fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

        expect(await screen.findByText('Invalid username or authenticator code.')).toBeInTheDocument();
        expect(mockSetAuth).not.toHaveBeenCalled();
    });

    it('shows QR code image after successful signup using mocked calls', async () => {
        mockSignup.mockResolvedValue({
            username: 'michelle',
            totpUri: 'otpauth://totp/CollectorsVault:michelle?secret=ABC123&issuer=CollectorsVault',
            totpSecret: 'ABC123'
        });

        mockToDataURL.mockResolvedValue('data:image/png;base64,mocked-qrcode');

        const history = createMemoryHistory({ initialEntries: ['/signup'] });

        render(
            <Router history={history}>
                <SignupPage />
            </Router>
        );

        fireEvent.change(screen.getByLabelText('Username'), {
            target: { value: ' michelle ' }
        });

        fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

        await waitFor(() => {
            expect(mockSignup).toHaveBeenCalledWith('michelle');
        });

        await waitFor(() => {
            expect(mockToDataURL).toHaveBeenCalledWith(
                'otpauth://totp/CollectorsVault:michelle?secret=ABC123&issuer=CollectorsVault',
                expect.objectContaining({ width: 220, margin: 2 })
            );
        });

        const qrImage = await screen.findByRole('img', { name: 'TOTP QR Code' });
        expect(qrImage).toHaveAttribute('src', 'data:image/png;base64,mocked-qrcode');
        expect(screen.getByText('ABC123')).toBeInTheDocument();
    });
});
