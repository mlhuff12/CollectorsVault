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

            var normalizedSubjects = (request.Subjects ?? new List<string>())
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Select(s => s.Trim())
                .ToList();

            var book = new Book
            {
                Title = request.Title,
                Authors = normalizedAuthors,
                ISBN = string.IsNullOrWhiteSpace(request.ISBN) ? null : request.ISBN.Trim(),
                PublicationYear = request.Year,
                Genre = request.Genre?.Trim() ?? string.Empty,
                Publisher = string.IsNullOrWhiteSpace(request.Publisher) ? null : request.Publisher.Trim(),
                PublishUtcDate = DateTime.TryParse(request.PublishDate, out var parsedDate) ? parsedDate.ToUniversalTime() : (DateTime?)null,
                PageCount = request.PageCount,
                Description = request.Description?.Trim() ?? string.Empty,
                Subjects = normalizedSubjects.Count > 0 ? normalizedSubjects : null,
                CoverSmall = string.IsNullOrWhiteSpace(request.CoverSmall) ? null : request.CoverSmall.Trim(),
                CoverMedium = string.IsNullOrWhiteSpace(request.CoverMedium) ? null : request.CoverMedium.Trim(),
                CoverLarge = string.IsNullOrWhiteSpace(request.CoverLarge) ? null : request.CoverLarge.Trim(),
                BookUrl = string.IsNullOrWhiteSpace(request.BookUrl) ? null : request.BookUrl.Trim(),
                BookFormat = ParseBookFormat(request.BookFormat),
                NeedsReplacement = request.NeedsReplacement,
                SeriesName = string.IsNullOrWhiteSpace(request.SeriesName) ? null : request.SeriesName.Trim(),
                SeriesNumber = request.SeriesNumber,
                CreatedUtcDate = DateTime.UtcNow,
                LastModifiedUtcDate = DateTime.UtcNow,
                UserId = userId
            };

            _context.Books.Add(book);
            await _context.SaveChangesAsync();
            return book;
        }

        /// <summary>
        /// Parses a book format string (e.g. "Paperback", "Mass Market Paperback") to the
        /// <see cref="BookFormat"/> enum. Returns <see langword="null"/> when the value is
        /// unrecognised or empty.
        /// </summary>
        private static BookFormat? ParseBookFormat(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return null;
            }

            // Direct enum name match (case-insensitive).
            if (Enum.TryParse<BookFormat>(value.Trim(), ignoreCase: true, out var result))
            {
                return result;
            }

            // Normalised string comparisons for common Open Library physical_format values.
            return value.Trim().ToLowerInvariant() switch
            {
                "hardcover" or "hardback" => BookFormat.Hardcover,
                "paperback" or "softcover" or "softback" => BookFormat.Paperback,
                "mass market paperback" or "mass market" => BookFormat.MassMarketPaperback,
                "trade paperback" => BookFormat.TradePaperback,
                "board book" or "board books" => BookFormat.BoardBook,
                "library binding" or "library bound" => BookFormat.LibraryBinding,
                "spiral-bound" or "spiral bound" or "ring-bound" or "ring bound" => BookFormat.SpiralBound,
                "ebook" or "e-book" or "e book" or "digital" => BookFormat.EBook,
                "audiobook" or "audio book" or "audio cd" => BookFormat.Audiobook,
                _ => BookFormat.Other
            };
        }

        public async Task<Movie> AddMovieAsync(MovieRequest request, long userId)
        {
            var movie = new Movie
            {
                Title = request.Title,
                Director = request.Director?.Trim() ?? string.Empty,
                ReleaseYear = request.ReleaseYear,
                Genre = request.Genre?.Trim() ?? string.Empty,
                Description = request.Description?.Trim() ?? string.Empty,
                CoverUrl = request.CoverUrl?.Trim() ?? string.Empty,
                Rating = request.Rating?.Trim() ?? string.Empty,
                Runtime = request.Runtime?.Trim() ?? string.Empty,
                Cast = request.Cast?.Trim() ?? string.Empty,
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
                Platform = request.Platform?.Trim() ?? string.Empty,
                ReleaseYear = parsedDate == default ? 0 : parsedDate.Year,
                Genre = request.Genre?.Trim() ?? string.Empty,
                Description = request.Description?.Trim() ?? string.Empty,
                CoverUrl = request.CoverUrl?.Trim() ?? string.Empty,
                Developer = request.Developer?.Trim() ?? string.Empty,
                Publisher = request.Publisher?.Trim() ?? string.Empty,
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
