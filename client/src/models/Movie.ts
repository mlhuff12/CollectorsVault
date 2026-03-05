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
