export interface VaultItem {
    id: number;
    title: string;
    description: string;
    dateAdded?: string;
    category: 'book' | 'movie' | 'game';
}

export interface Book {
    title: string;
    authors: string[];
    isbn?: string;
    year?: number;
    genre?: string;
}

export interface Movie {
    title: string;
    director: string;
    releaseYear: number;
    genre: string;
}

export interface Game {
    title: string;
    platform: string; // e.g., PC, Xbox, PlayStation
    releaseDate: string;
}

export interface AuthState {
    token: string | null;
    username: string | null;
    isAuthenticated: boolean;
}

export interface SignupResponse {
    username: string;
    totpUri: string;
    totpSecret: string;
}

export interface LoginResponse {
    token: string;
    username: string;
    isAdmin: boolean;
}

export interface AdminUser {
    id: number;
    username: string;
    isAdmin: boolean;
    bookCount: number;
    movieCount: number;
    gameCount: number;
}
