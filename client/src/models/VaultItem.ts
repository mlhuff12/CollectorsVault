export interface VaultItem {
    id: number;
    title: string;
    description: string;
    dateAdded?: string;
    category: 'book' | 'movie' | 'game';
}
