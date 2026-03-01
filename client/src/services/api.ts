import axios from 'axios';
import { AdminUser, Book, BookLookupResult, Game, Movie, VaultItem } from '../types';

const BASE_URL = process.env.REACT_APP_API_BASE_URL ?? 'http://localhost:5000';
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
