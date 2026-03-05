import axios from 'axios';
import { AdminUser, Book, BookLookupResult, Game, GameLookupResult, Movie, MovieLookupResult, VaultItem } from '../models';

const readViteEnv = (key: string): string | undefined => {
    try {
        // Keep CRA/Jest compatibility by reading import.meta via runtime evaluation.
        const metaEnv = Function('return (import.meta && import.meta.env) ? import.meta.env : undefined;')() as Record<string, unknown> | undefined;
        const value = metaEnv?.[key];
        return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
    } catch {
        return undefined;
    }
};

const readCraEnv = (key: string): string | undefined => {
    if (typeof process === 'undefined' || typeof process.env === 'undefined') {
        return undefined;
    }

    const value = process.env[key];
    return value && value.trim().length > 0 ? value : undefined;
};

const envBaseUrl = readViteEnv('VITE_API_BASE_URL') ?? readCraEnv('REACT_APP_API_BASE_URL');

const resolveBaseUrl = (): string => {
    const browserHostname = typeof window !== 'undefined' ? window.location.hostname : undefined;

    if (envBaseUrl) {
        if (browserHostname && browserHostname !== 'localhost' && browserHostname !== '127.0.0.1') {
            try {
                const parsed = new URL(envBaseUrl);
                if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
                    parsed.hostname = browserHostname;
                    return parsed.origin;
                }
            } catch {
                return envBaseUrl;
            }
        }

        return envBaseUrl;
    }

    if (browserHostname) {
        const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
        return `${protocol}//${browserHostname}:5000`;
    }

    return 'https://localhost:5000';
};

const BASE_URL = resolveBaseUrl();
const API_URL = `${BASE_URL}/api/vault`;
const AUTH_URL = `${BASE_URL}/api/auth`;
const BOOK_LOOKUP_URL = `${BASE_URL}/api/booklookup`;

const getAuthHeader = () => {
    const token = localStorage.getItem('cv_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const fetchItems = async (): Promise<VaultItem[]> => {
    const response = await axios.get(API_URL, { headers: getAuthHeader() });
    return response.data;
};

export const addBook = async (book: Book): Promise<Book> => {
    const response = await axios.post(`${API_URL}/books`, book, { headers: getAuthHeader() });
    return response.data;
};

export const lookupBookByIsbn = async (isbn: string): Promise<BookLookupResult> => {
    const response = await axios.get(`${BOOK_LOOKUP_URL}/isbn/${encodeURIComponent(isbn)}`, { headers: getAuthHeader() });
    return response.data;
};

export const addMovie = async (movie: Movie): Promise<Movie> => {
    const response = await axios.post(`${API_URL}/movies`, movie, { headers: getAuthHeader() });
    return response.data;
};

export const addGame = async (game: Game): Promise<Game> => {
    const response = await axios.post(`${API_URL}/games`, game, { headers: getAuthHeader() });
    return response.data;
};

export const deleteItem = async (id: number): Promise<void> => {
    await axios.delete(`${API_URL}/${id}`, { headers: getAuthHeader() });
};

export const lookupMovieByUpc = async (upc: string): Promise<MovieLookupResult> => {
    const response = await axios.get(`${BASE_URL}/api/movielookup/upc/${encodeURIComponent(upc)}`, { headers: getAuthHeader() });
    return response.data;
};

export const lookupGameByUpc = async (upc: string): Promise<GameLookupResult> => {
    const response = await axios.get(`${BASE_URL}/api/gamelookup/upc/${encodeURIComponent(upc)}`, { headers: getAuthHeader() });
    return response.data;
};

export const signup = async (username: string): Promise<{ username: string; totpUri: string; totpSecret: string }> => {
    const response = await axios.post(`${AUTH_URL}/signup`, { username });
    return response.data;
};

export const login = async (username: string, totpCode: string): Promise<{ token: string; username: string; isAdmin: boolean }> => {
    const response = await axios.post(`${AUTH_URL}/login`, { username, totpCode });
    return response.data;
};

export const fetchAllUsers = async (): Promise<AdminUser[]> => {
    const response = await axios.get(`${BASE_URL}/api/admin/users`, { headers: getAuthHeader() });
    return response.data;
};

export const deleteUserById = async (userId: number): Promise<void> => {
    await axios.delete(`${BASE_URL}/api/admin/user/${userId}`, { headers: getAuthHeader() });
};
