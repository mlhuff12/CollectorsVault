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
            <div className="auth-page">
                <div className="auth-card">
                    <div className="brand-row">
                        <div className="brand-logo" aria-hidden="true">CV</div>
                        <div>
                            <h1>Collector&apos;s Vault</h1>
                        </div>
                    </div>
                    <h2>Set Up Authenticator</h2>
                    <p>Scan this QR code with your authenticator app (e.g. Google Authenticator):</p>
                    <div className="totp-qr">
                        {qrCodeDataUrl ? (
                            <img src={qrCodeDataUrl} alt="TOTP QR Code" className="totp-qr-image" />
                        ) : (
                            <div className="auth-error" role="alert">
                                {qrCodeError ?? 'Generating QR code...'}
                            </div>
                        )}
                    </div>
                    <p>Or enter this secret manually:</p>
                    <code className="totp-secret">{totpSecret}</code>
                    <p>Once scanned, you can sign in with your username and the code from the app.</p>
                    <button
                        type="button"
                        className="primary-button"
                        onClick={() => history.push('/login')}
                    >
                        Go to Sign In
                    </button>
                </div>
            </div>
        );
    }

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
                <h2>Create Account</h2>
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
                    {error && <div className="auth-error">{error}</div>}
                    <button type="submit" className="primary-button" disabled={loading}>
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>
                </form>
                <p className="auth-link">
                    Already have an account?{' '}
                    <button type="button" className="link-button" onClick={() => history.push('/login')}>
                        Sign in
                    </button>
                </p>
            </div>
        </div>
    );
};

export default SignupPage;
