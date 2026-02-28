import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { login } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../utils/errorUtils';

const LoginPage: React.FC = () => {
    const history = useHistory();
    const { setAuth } = useAuth();
    const [username, setUsername] = useState('');
    const [totpCode, setTotpCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const data = await login(username.trim(), totpCode.trim());
            setAuth(data.token, data.username);
            history.push('/');
        } catch (err) {
            setError(getApiErrorMessage(err, 'Invalid username or TOTP code.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="brand-row">
                    <div className="brand-logo" aria-hidden="true">CV</div>
                    <div>
                        <h1>Collector&apos;s Vault</h1>
                        <p>Track your favorite books, movies, and games.</p>
                    </div>
                </div>
                <h2>Sign In</h2>
                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            id="username"
                            type="text"
                            className="form-input"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            autoComplete="username"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="totpCode">Authenticator Code</label>
                        <input
                            id="totpCode"
                            type="text"
                            className="form-input"
                            value={totpCode}
                            onChange={(e) => setTotpCode(e.target.value)}
                            placeholder="6-digit code"
                            maxLength={6}
                            required
                            autoComplete="one-time-code"
                        />
                    </div>
                    {error && <div className="auth-error">{error}</div>}
                    <button type="submit" className="primary-button" disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>
                <p className="auth-link">
                    Don&apos;t have an account?{' '}
                    <button type="button" className="link-button" onClick={() => history.push('/signup')}>
                        Sign up
                    </button>
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
