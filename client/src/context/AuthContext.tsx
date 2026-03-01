import React, { createContext, useCallback, useContext, useState } from 'react';

/** Shape of the authentication context available throughout the app. */
interface AuthContextType {
    /** Whether a valid JWT token is present in localStorage. */
    isAuthenticated: boolean;
    /** The logged-in user's username, or null when unauthenticated. */
    username: string | null;
    /** The raw JWT bearer token, or null when unauthenticated. */
    token: string | null;
    /** Whether the logged-in user has admin privileges. */
    isAdmin: boolean;
    /**
     * Persists the JWT token, username, and admin flag to localStorage and updates
     * the in-memory auth state.
     */
    setAuth: (token: string, username: string, isAdmin: boolean) => void;
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
    isAdmin: false,
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
    const [isAdmin, setIsAdmin] = useState<boolean>(() => localStorage.getItem('cv_isAdmin') === 'true');

    const setAuth = useCallback((newToken: string, newUsername: string, newIsAdmin: boolean) => {
        localStorage.setItem('cv_token', newToken);
        localStorage.setItem('cv_username', newUsername);
        localStorage.setItem('cv_isAdmin', String(newIsAdmin));
        setToken(newToken);
        setUsername(newUsername);
        setIsAdmin(newIsAdmin);
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('cv_token');
        localStorage.removeItem('cv_username');
        localStorage.removeItem('cv_isAdmin');
        setToken(null);
        setUsername(null);
        setIsAdmin(false);
    }, []);

    return (
        <AuthContext.Provider value={{ isAuthenticated: !!token, username, token, isAdmin, setAuth, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

/** Convenience hook that returns the current {@link AuthContextType} value. */
export const useAuth = () => useContext(AuthContext);
