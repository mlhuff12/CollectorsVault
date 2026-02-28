import React, { createContext, useCallback, useContext, useState } from 'react';

interface AuthContextType {
    isAuthenticated: boolean;
    username: string | null;
    token: string | null;
    setAuth: (token: string, username: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
    isAuthenticated: false,
    username: null,
    token: null,
    setAuth: () => {},
    logout: () => {}
});

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

export const useAuth = () => useContext(AuthContext);
