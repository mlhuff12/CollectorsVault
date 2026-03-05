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
