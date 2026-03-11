import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QRCode from 'qrcode';
import { signup } from '../services/api';
import { getApiErrorMessage } from '../utils/errorUtils';
import { Box, Button, Card, CardContent, Typography, TextField, Alert } from '@mui/material';

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
            <Box
                sx={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'background.default',
                    py: 4,
                }}
            >
                <Card sx={{ width: '100%', maxWidth: 420, p: 2 }}>
                    <CardContent>
                        <Box display="flex" alignItems="center" gap={1} mb={2}>
                            <Box className="brand-logo" aria-hidden="true">
                                CV
                            </Box>
                            <Typography variant="h6" component="h1">
                                Collector&apos;s Vault
                            </Typography>
                        </Box>
                        <Typography variant="h6" component="h2" gutterBottom>
                            Set Up Authenticator
                        </Typography>
                        <Typography variant="body2" color="textSecondary" gutterBottom>
                            Scan this QR code with your authenticator app (e.g. Google Authenticator):
                        </Typography>
                        <Box display="flex" justifyContent="center" my={2}>
                            {qrCodeDataUrl ? (
                                <img
                                    src={qrCodeDataUrl}
                                    alt="TOTP QR Code"
                                    className="totp-qr-image"
                                    style={{ borderRadius: 4, maxWidth: '100%' }}
                                />
                            ) : (
                                <Alert severity="error">
                                    {qrCodeError ?? 'Generating QR code...'}
                                </Alert>
                            )}
                        </Box>
                        <Typography variant="body2" color="textSecondary">
                            Or enter this secret manually:
                        </Typography>
                        <Box
                            component="code"
                            display="block"
                            bgcolor="background.paper"
                            p={1}
                            mt={1}
                            mb={2}
                            borderRadius={1}
                            fontSize="0.875rem"
                            sx={{ wordBreak: 'break-all' }}
                        >
                            {totpSecret}
                        </Box>
                        <Typography variant="body2" color="textSecondary" fontSize="0.75rem" mb={2}>
                            Once scanned, you can sign in with your username and the code from the app.
                        </Typography>
                        <Button fullWidth variant="contained" onClick={() => history.push('/login')}>
                            Go to Sign In
                        </Button>
                    </CardContent>
                </Card>
            </Box>
        );
    }

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'background.default',
                py: 4,
            }}
        >
            <Card sx={{ width: '100%', maxWidth: 420, p: 2 }}>
                <CardContent>
                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                        <Box className="brand-logo" aria-hidden="true">
                            CV
                        </Box>
                        <Box>
                            <Typography variant="h6" component="h1">
                                Collector&apos;s Vault
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                                Track your favorite books, movies, and games.
                            </Typography>
                        </Box>
                    </Box>
                    <Typography variant="h6" component="h2" gutterBottom>
                        Create Account
                    </Typography>
                    <Box component="form" onSubmit={handleSubmit}>
                        <TextField
                            id="username"
                            label="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            autoComplete="username"
                            fullWidth
                            margin="normal"
                        />
                        {error && (
                            <Alert severity="error" sx={{ my: 1 }}>
                                {error}
                            </Alert>
                        )}
                        <Button type="submit" fullWidth variant="contained" disabled={loading} sx={{ mt: 1 }}>
                            {loading ? 'Creating account...' : 'Create Account'}
                        </Button>
                    </Box>
                    <Typography variant="body2" color="textSecondary" align="center" mt={3}>
                        Already have an account?{' '}
                        <Button
                            variant="text"
                            size="small"
                            onClick={() => history.push('/login')}
                        >
                            Sign in
                        </Button>
                    </Typography>
                </CardContent>
            </Card>
        </Box>
    );
};

export default SignupPage;
