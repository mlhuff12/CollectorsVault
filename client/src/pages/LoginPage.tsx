import React, { useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { login } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../utils/errorUtils';

/**
 * LoginPage handles user authentication via username and a 6-digit TOTP code.
 *
 * On successful login the JWT token and username are persisted to localStorage
 * via {@link useAuth}, and the user is redirected to the main vault page.
 */
const LoginPage: React.FC = () => {
    const history = useHistory();
    const { setAuth } = useAuth();
    const isMountedRef = useRef(true);
    const [username, setUsername] = useState('');
    const [totpCode, setTotpCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const data = await login(username.trim(), totpCode.trim());
            setAuth(data.token, data.username);
            history.push('/');
        } catch (err) {
            if (isMountedRef.current) {
                setError(getApiErrorMessage(err, 'Invalid username or authenticator code.'));
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    };

    return (
        <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light py-4">
            <div className="card shadow p-4 auth-card-width">
                <div className="d-flex align-items-center gap-3 mb-3">
                    <div className="brand-logo" aria-hidden="true">CV</div>
                    <div>
                        <h1 className="h4 mb-0">Collector&apos;s Vault</h1>
                        <p className="text-muted mb-0 small">Track your favorite books, movies, and games.</p>
                    </div>
                </div>
                <h2 className="h5 mb-3">Sign In</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label htmlFor="username" className="form-label">Username</label>
                        <input
                            id="username"
                            type="text"
                            className="form-control"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            autoComplete="username"
                        />
                    </div>
                    <div className="mb-3">
                        <label htmlFor="totpCode" className="form-label">Authenticator Code</label>
                        <input
                            id="totpCode"
                            type="text"
                            className="form-control"
                            value={totpCode}
                            onChange={(e) => setTotpCode(e.target.value)}
                            placeholder="6-digit code"
                            maxLength={6}
                            required
                            autoComplete="one-time-code"
                        />
                    </div>
                    {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}
                    <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>
                <p className="text-center text-muted mt-3 mb-0 small">
                    Don&apos;t have an account?{' '}
                    <button type="button" className="btn btn-link p-0 small" onClick={() => history.push('/signup')}>
                        Sign up
                    </button>
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
