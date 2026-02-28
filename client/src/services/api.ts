import axios from 'axios';
import { Book, Game, Movie, VaultItem } from '../types';

const API_URL = 'http://localhost:5000/api/vault'; // Adjust the URL as needed

export const fetchItems = async (): Promise<VaultItem[]> => {
    const response = await axios.get(API_URL);
    return response.data;
};

export const addBook = async (book: Book): Promise<Book> => {
    const response = await axios.post(`${API_URL}/books`, book);
    return response.data;
};

export const addMovie = async (movie: Movie): Promise<Movie> => {
    const response = await axios.post(`${API_URL}/movies`, movie);
    return response.data;
};

export const addGame = async (game: Game): Promise<Game> => {
    const response = await axios.post(`${API_URL}/games`, game);
    return response.data;
};

export const deleteItem = async (id: number): Promise<void> => {
    await axios.delete(`${API_URL}/${id}`);
};