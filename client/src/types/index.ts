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
    description?: string;
    coverUrl?: string;
    rating?: string;
    runtime?: string;
    cast?: string;
}

export interface Game {
    title: string;
    platform: string;
    releaseDate: string;
    genre?: string;
    description?: string;
    coverUrl?: string;
    developer?: string;
    publisher?: string;
}

export interface BookLookupResult {
    title: string;
    authors: string[];
    isbn: string;
    publisher: string;
    publishDate: string;
    pageCount?: number;
    description: string;
    subjects: string[];
    coverSmall: string;
    coverMedium: string;
    coverLarge: string;
    providerUrl: string;
}

export interface MovieLookupResult {
    title: string;
    director: string;
    releaseYear: number;
    genre: string;
    description: string;
    coverUrl: string;
    rating: string;
    runtime: string;
    cast: string;
    imdbId: string;
}

export interface GameLookupResult {
    title: string;
    platform: string;
    releaseYear: number;
    genre: string;
    description: string;
    coverUrl: string;
    developer: string;
    publisher: string;
    igdbId?: number;
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
