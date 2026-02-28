using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CollectorsVault.Server.Contracts;
using CollectorsVault.Server.Data;
using CollectorsVault.Server.Models;
using Microsoft.EntityFrameworkCore;

namespace CollectorsVault.Server.Services
{
    public class VaultService : IVaultService
    {
        private readonly VaultDbContext _context;

        public VaultService(VaultDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<VaultItemResponse>> GetVaultItemsAsync()
        {
            var books = await _context.Books
                .Select(book => new VaultItemResponse
                {
                    Id = book.Id,
                    Title = book.Title,
                    Description = book.Description,
                    DateAdded = book.DateAdded,
                    Category = "book"
                })
                .ToListAsync();

            var movies = await _context.Movies
                .Select(movie => new VaultItemResponse
                {
                    Id = movie.Id,
                    Title = movie.Title,
                    Description = movie.Description,
                    DateAdded = movie.DateAdded,
                    Category = "movie"
                })
                .ToListAsync();

            var games = await _context.Games
                .Select(game => new VaultItemResponse
                {
                    Id = game.Id,
                    Title = game.Title,
                    Description = game.Description,
                    DateAdded = game.DateAdded,
                    Category = "game"
                })
                .ToListAsync();

            return books
                .Concat(movies)
                .Concat(games)
                .OrderByDescending(item => item.DateAdded)
                .ToList();
        }

        public async Task<VaultItem> AddVaultItemAsync(VaultItem item)
        {
            item.DateAdded = DateTime.UtcNow;
            _context.VaultItems.Add(item);
            await _context.SaveChangesAsync();
            return item;
        }

        public async Task<Book> AddBookAsync(BookRequest request)
        {
            var normalizedAuthors = (request.Authors ?? new List<string>())
                .Where(author => !string.IsNullOrWhiteSpace(author))
                .Select(author => author.Trim())
                .ToList();

            var book = new Book
            {
                Title = request.Title,
                Author = string.Join(", ", normalizedAuthors),
                ISBN = request.ISBN?.Trim() ?? string.Empty,
                PublicationYear = request.Year ?? 0,
                Genre = request.Genre?.Trim() ?? string.Empty,
                Description = string.Empty,
                DateAdded = DateTime.UtcNow
            };

            _context.Books.Add(book);
            await _context.SaveChangesAsync();
            return book;
        }

        public async Task<Movie> AddMovieAsync(MovieRequest request)
        {
            var movie = new Movie
            {
                Title = request.Title,
                Director = request.Director,
                ReleaseYear = request.ReleaseYear,
                Genre = request.Genre,
                Description = string.Empty,
                DateAdded = DateTime.UtcNow
            };

            _context.Movies.Add(movie);
            await _context.SaveChangesAsync();
            return movie;
        }

        public async Task<Game> AddGameAsync(GameRequest request)
        {
            DateTime.TryParse(request.ReleaseDate, out var parsedDate);

            var game = new Game
            {
                Title = request.Title,
                Platform = request.Platform,
                ReleaseYear = parsedDate == default ? 0 : parsedDate.Year,
                Genre = string.Empty,
                Description = string.Empty,
                DateAdded = DateTime.UtcNow
            };

            _context.Games.Add(game);
            await _context.SaveChangesAsync();
            return game;
        }

        public async Task<bool> DeleteVaultItemAsync(int id)
        {
            var item = await _context.VaultItems.FirstOrDefaultAsync(entry => entry.Id == id);
            if (item == null)
            {
                return false;
            }

            _context.VaultItems.Remove(item);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
