export type BookFormat =
    | 'Unknown'
    | 'Hardcover'
    | 'Paperback'
    | 'MassMarketPaperback'
    | 'TradePaperback'
    | 'BoardBook'
    | 'LibraryBinding'
    | 'SpiralBound'
    | 'EBook'
    | 'Audiobook'
    | 'Other';

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
    seriesName: string;
    seriesNumber?: number;
    seriesNotFound: boolean;
}

export interface Book {
    title: string;
    authors: string[];
    isbn?: string;
    year?: number;
    genre?: string;
    publisher?: string;
    publishDate?: string;
    pageCount?: number;
    description?: string;
    subjects?: string[];
    coverSmall?: string;
    coverMedium?: string;
    coverLarge?: string;
    bookUrl?: string;
    bookFormat?: BookFormat;
    needsReplacement?: boolean;
    seriesName?: string;
    seriesNumber?: number;
}
