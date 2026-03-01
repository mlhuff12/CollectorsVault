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

        public async Task<IEnumerable<VaultItemResponse>> GetVaultItemsAsync(long userId)
        {
            var books = await _context.Books
                .Where(book => book.UserId == userId)
                .Select(book => new VaultItemResponse
                {
                    Id = book.Id,
                    Title = book.Title,
                    Description = book.Description,
                    CreatedUtcDate = book.CreatedUtcDate,
                    Category = "book"
                })
                .ToListAsync();

            var movies = await _context.Movies
                .Where(movie => movie.UserId == userId)
                .Select(movie => new VaultItemResponse
                {
                    Id = movie.Id,
                    Title = movie.Title,
                    Description = movie.Description,
                    CreatedUtcDate = movie.CreatedUtcDate,
                    Category = "movie"
                })
                .ToListAsync();

            var games = await _context.Games
                .Where(game => game.UserId == userId)
                .Select(game => new VaultItemResponse
                {
                    Id = game.Id,
                    Title = game.Title,
                    Description = game.Description,
                    CreatedUtcDate = game.CreatedUtcDate,
                    Category = "game"
                })
                .ToListAsync();

            return books
                .Concat(movies)
                .Concat(games)
                .OrderByDescending(item => item.CreatedUtcDate)
                .ToList();
        }

        public async Task<Book> AddBookAsync(BookRequest request, long userId)
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
                Publisher = request.Publisher?.Trim() ?? string.Empty,
                PublishDate = request.PublishDate?.Trim() ?? string.Empty,
                PageCount = request.PageCount,
                Description = request.Description?.Trim() ?? string.Empty,
                CoverSmall = request.CoverSmall?.Trim() ?? string.Empty,
                CoverMedium = request.CoverMedium?.Trim() ?? string.Empty,
                CoverLarge = request.CoverLarge?.Trim() ?? string.Empty,
                BookUrl = request.BookUrl?.Trim() ?? string.Empty,
                CreatedUtcDate = DateTime.UtcNow,
                LastModifiedUtcDate = DateTime.UtcNow,
                UserId = userId
            };

            _context.Books.Add(book);
            await _context.SaveChangesAsync();
            return book;
        }

        public async Task<Movie> AddMovieAsync(MovieRequest request, long userId)
        {
            var movie = new Movie
            {
                Title = request.Title,
                Director = request.Director,
                ReleaseYear = request.ReleaseYear,
                Genre = request.Genre,
                Description = string.Empty,
                CreatedUtcDate = DateTime.UtcNow,
                LastModifiedUtcDate = DateTime.UtcNow,
                UserId = userId
            };

            _context.Movies.Add(movie);
            await _context.SaveChangesAsync();
            return movie;
        }

        public async Task<Game> AddGameAsync(GameRequest request, long userId)
        {
            DateTime.TryParse(request.ReleaseDate, out var parsedDate);

            var game = new Game
            {
                Title = request.Title,
                Platform = request.Platform,
                ReleaseYear = parsedDate == default ? 0 : parsedDate.Year,
                Genre = string.Empty,
                Description = string.Empty,
                CreatedUtcDate = DateTime.UtcNow,
                LastModifiedUtcDate = DateTime.UtcNow,
                UserId = userId
            };

            _context.Games.Add(game);
            await _context.SaveChangesAsync();
            return game;
        }

        public async Task<bool> DeleteVaultItemAsync(long id, long userId)
        {
            var book = await _context.Books.FirstOrDefaultAsync(b => b.Id == id && b.UserId == userId);
            if (book != null)
            {
                _context.Books.Remove(book);
                await _context.SaveChangesAsync();
                return true;
            }

            var movie = await _context.Movies.FirstOrDefaultAsync(m => m.Id == id && m.UserId == userId);
            if (movie != null)
            {
                _context.Movies.Remove(movie);
                await _context.SaveChangesAsync();
                return true;
            }

            var game = await _context.Games.FirstOrDefaultAsync(g => g.Id == id && g.UserId == userId);
            if (game != null)
            {
                _context.Games.Remove(game);
                await _context.SaveChangesAsync();
                return true;
            }

            return false;
        }
    }
}
