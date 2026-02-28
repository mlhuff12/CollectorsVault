using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CollectorsVault.Server.Data;
using CollectorsVault.Server.Models;
using Microsoft.EntityFrameworkCore;

namespace CollectorsVault.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class VaultController : ControllerBase
    {
        private readonly VaultDbContext _context;

        public VaultController(VaultDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<VaultItemResponse>>> GetVaultItems()
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

            var result = books
                .Concat(movies)
                .Concat(games)
                .OrderByDescending(item => item.DateAdded)
                .ToList();

            return result;
        }

        [HttpPost]
        public async Task<ActionResult<VaultItem>> AddVaultItem(VaultItem item)
        {
            item.DateAdded = DateTime.UtcNow;
            _context.VaultItems.Add(item);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetVaultItems), new { id = item.Id }, item);
        }

        [HttpPost("books")]
        public async Task<ActionResult<Book>> AddBook(BookRequest request)
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

            return CreatedAtAction(nameof(GetVaultItems), new { id = book.Id }, book);
        }

        [HttpPost("movies")]
        public async Task<ActionResult<Movie>> AddMovie(MovieRequest request)
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

            return CreatedAtAction(nameof(GetVaultItems), new { id = movie.Id }, movie);
        }

        [HttpPost("games")]
        public async Task<ActionResult<Game>> AddGame(GameRequest request)
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

            return CreatedAtAction(nameof(GetVaultItems), new { id = game.Id }, game);
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteVaultItem(int id)
        {
            var item = await _context.VaultItems.FirstOrDefaultAsync(entry => entry.Id == id);

            if (item == null)
            {
                return NotFound();
            }

            _context.VaultItems.Remove(item);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        public class BookRequest
        {
            public string Title { get; set; } = string.Empty;
            public List<string> Authors { get; set; } = new List<string>();
            public string ISBN { get; set; } = string.Empty;
            public int? Year { get; set; }
            public string Genre { get; set; } = string.Empty;
        }

        public class MovieRequest
        {
            public string Title { get; set; } = string.Empty;
            public string Director { get; set; } = string.Empty;
            public int ReleaseYear { get; set; }
            public string Genre { get; set; } = string.Empty;
        }

        public class GameRequest
        {
            public string Title { get; set; } = string.Empty;
            public string Platform { get; set; } = string.Empty;
            public string ReleaseDate { get; set; } = string.Empty;
        }

        public class VaultItemResponse
        {
            public int Id { get; set; }
            public string Title { get; set; } = string.Empty;
            public string Description { get; set; } = string.Empty;
            public DateTime DateAdded { get; set; }
            public string Category { get; set; } = string.Empty;
        }
    }
}