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