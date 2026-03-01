import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QRCode from 'qrcode';
import { signup } from '../services/api';
import { getApiErrorMessage } from '../utils/errorUtils';

/**
 * SignupPage allows a new user to create an account.
 *
 * Flow:
 * 1. User enters a username and submits the form.
 * 2. The server returns a TOTP URI and Base32 secret.
 * 3. A QR code is rendered so the user can scan it with an authenticator app
 *    (e.g. Google Authenticator, Authy).
 * 4. The user is directed to the login page once setup is complete.
 */
const SignupPage: React.FC = () => {
    const history = useHistory();
    const [username, setUsername] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [totpUri, setTotpUri] = useState<string | null>(null);
    const [totpSecret, setTotpSecret] = useState<string | null>(null);
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
    const [qrCodeError, setQrCodeError] = useState<string | null>(null);

    useEffect(() => {
        let isCancelled = false;

        const generateQrCode = async () => {
            if (!totpUri) {
                setQrCodeDataUrl(null);
                setQrCodeError(null);
                return;
            }

            try {
                const dataUrl = await QRCode.toDataURL(totpUri, {
                    width: 220,
                    margin: 2
                });

                if (!isCancelled) {
                    setQrCodeDataUrl(dataUrl);
                    setQrCodeError(null);
                }
            } catch {
                if (!isCancelled) {
                    setQrCodeDataUrl(null);
                    setQrCodeError('Unable to generate QR code. Please use the manual secret below.');
                }
            }
        };

        generateQrCode();

        return () => {
            isCancelled = true;
        };
    }, [totpUri]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setQrCodeError(null);
        setLoading(true);
        try {
            const data = await signup(username.trim());
            setTotpUri(data.totpUri);
            setTotpSecret(data.totpSecret);
        } catch (err) {
            setError(getApiErrorMessage(err, 'Signup failed. Username may already exist.'));
        } finally {
            setLoading(false);
        }
    };

    if (totpUri && totpSecret) {
        return (
            <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light py-4">
                <div className="card shadow p-4 auth-card-width">
                    <div className="d-flex align-items-center gap-3 mb-3">
                        <div className="brand-logo" aria-hidden="true">CV</div>
                        <div>
                            <h1 className="h4 mb-0">Collector&apos;s Vault</h1>
                        </div>
                    </div>
                    <h2 className="h5 mb-3">Set Up Authenticator</h2>
                    <p className="text-muted">Scan this QR code with your authenticator app (e.g. Google Authenticator):</p>
                    <div className="d-flex justify-content-center my-3">
                        {qrCodeDataUrl ? (
                            <img src={qrCodeDataUrl} alt="TOTP QR Code" className="totp-qr-image border rounded" />
                        ) : (
                            <div className="alert alert-danger" role="alert">
                                {qrCodeError ?? 'Generating QR code...'}
                            </div>
                        )}
                    </div>
                    <p className="text-muted">Or enter this secret manually:</p>
                    <code className="d-block bg-light rounded p-2 small text-break mb-3">{totpSecret}</code>
                    <p className="text-muted small">Once scanned, you can sign in with your username and the code from the app.</p>
                    <button
                        type="button"
                        className="btn btn-primary w-100"
                        onClick={() => history.push('/login')}
                    >
                        Go to Sign In
                    </button>
                </div>
            </div>
        );
    }

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
                <h2 className="h5 mb-3">Create Account</h2>
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
                    {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}
                    <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>
                </form>
                <p className="text-center text-muted mt-3 mb-0 small">
                    Already have an account?{' '}
                    <button type="button" className="btn btn-link p-0 small" onClick={() => history.push('/login')}>
                        Sign in
                    </button>
                </p>
            </div>
        </div>
    );
};

export default SignupPage;
