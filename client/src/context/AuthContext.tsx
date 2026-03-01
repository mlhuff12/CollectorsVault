import React, { createContext, useCallback, useContext, useState } from 'react';

/** Shape of the authentication context available throughout the app. */
interface AuthContextType {
    /** Whether a valid JWT token is present in localStorage. */
    isAuthenticated: boolean;
    /** The logged-in user's username, or null when unauthenticated. */
    username: string | null;
    /** The raw JWT bearer token, or null when unauthenticated. */
    token: string | null;
    /**
     * Persists the JWT token and username to localStorage and updates
     * the in-memory auth state.
     */
    setAuth: (token: string, username: string) => void;
    /**
     * Clears the JWT token and username from localStorage and resets
     * the in-memory auth state, effectively logging the user out.
     */
    logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
    isAuthenticated: false,
    username: null,
    token: null,
    setAuth: () => {},
    logout: () => {}
});

/**
 * AuthProvider wraps the application and exposes the authentication state
 * (token, username, isAuthenticated) and helpers (setAuth, logout) via React
 * context.
 *
 * The token and username are initialised from localStorage on mount so that
 * a page refresh does not log the user out.
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [token, setToken] = useState<string | null>(() => localStorage.getItem('cv_token'));
    const [username, setUsername] = useState<string | null>(() => localStorage.getItem('cv_username'));

    const setAuth = useCallback((newToken: string, newUsername: string) => {
        localStorage.setItem('cv_token', newToken);
        localStorage.setItem('cv_username', newUsername);
        setToken(newToken);
        setUsername(newUsername);
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('cv_token');
        localStorage.removeItem('cv_username');
        setToken(null);
        setUsername(null);
    }, []);

    return (
        <AuthContext.Provider value={{ isAuthenticated: !!token, username, token, setAuth, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

/** Convenience hook that returns the current {@link AuthContextType} value. */
export const useAuth = () => useContext(AuthContext);
