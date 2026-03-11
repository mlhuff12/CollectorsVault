import React, { useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { login } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../utils/errorUtils';
import { Box, Button, Card, CardContent, Typography, TextField, Alert } from '@mui/material';

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
            setAuth(data.token, data.username, data.isAdmin);
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
                        Sign In
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
                        <TextField
                            id="totpCode"
                            label="Authenticator Code"
                            value={totpCode}
                            onChange={(e) => setTotpCode(e.target.value)}
                            placeholder="6-digit code"
                            inputProps={{ maxLength: 6 }}
                            required
                            autoComplete="one-time-code"
                            fullWidth
                            margin="normal"
                        />
                        {error && (
                            <Alert severity="error" sx={{ my: 1 }}>
                                {error}
                            </Alert>
                        )}
                        <Button type="submit" fullWidth variant="contained" disabled={loading} sx={{ mt: 1 }}>
                            {loading ? 'Signing in...' : 'Sign In'}
                        </Button>
                    </Box>
                    <Typography variant="body2" color="textSecondary" align="center" mt={3}>
                        Don&apos;t have an account?{' '}
                        <Button variant="text" size="small" onClick={() => history.push('/signup')}>
                            Sign up
                        </Button>
                    </Typography>
                </CardContent>
            </Card>
        </Box>
    );
};

export default LoginPage;
