using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CollectorsVault.Server.Contracts;
using CollectorsVault.Server.Data;
using CollectorsVault.Server.Models;
using CollectorsVault.Server.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace CollectorsVault.Api.Tests
{
    /// <summary>
    /// Unit tests for <see cref="VaultService.AddBookAsync"/> using an in-memory database.
    /// No changes are persisted to an external database.
    /// </summary>
    public class VaultServiceTests
    {
        private static VaultDbContext CreateInMemoryContext()
        {
            var options = new DbContextOptionsBuilder<VaultDbContext>()
                .UseInMemoryDatabase($"VaultServiceTests_{Guid.NewGuid()}")
                .Options;
            return new VaultDbContext(options);
        }

        [Fact]
        public async Task AddBookAsync_PersistsAllBasicFields()
        {
            using var context = CreateInMemoryContext();
            var service = new VaultService(context);

            var request = new BookRequest
            {
                Title = "Dune",
                Authors = new List<string> { "Frank Herbert" },
                ISBN = "9780441172719",
                Year = 1965,
                Genre = "Sci-Fi"
            };

            var book = await service.AddBookAsync(request, userId: 1L);

            Assert.Equal("Dune", book.Title);
            Assert.Equal("Frank Herbert", book.Author);
            Assert.Equal("9780441172719", book.ISBN);
            Assert.Equal(1965, book.PublicationYear);
            Assert.Equal("Sci-Fi", book.Genre);
            Assert.Equal(1L, book.UserId);
        }

        [Fact]
        public async Task AddBookAsync_PersistsLookupFields()
        {
            using var context = CreateInMemoryContext();
            var service = new VaultService(context);

            var request = new BookRequest
            {
                Title = "The Hobbit",
                Authors = new List<string> { "J.R.R. Tolkien" },
                ISBN = "9780547928227",
                Publisher = "Houghton Mifflin",
                PublishDate = "September 21, 1937",
                PageCount = 310,
                Description = "A fantasy novel about a hobbit.",
                CoverSmall = "https://covers.openlibrary.org/b/id/123-S.jpg",
                CoverMedium = "https://covers.openlibrary.org/b/id/123-M.jpg",
                CoverLarge = "https://covers.openlibrary.org/b/id/123-L.jpg",
                BookUrl = "https://openlibrary.org/books/OL123"
            };

            var book = await service.AddBookAsync(request, userId: 2L);

            Assert.Equal("The Hobbit", book.Title);
            Assert.Equal("J.R.R. Tolkien", book.Author);
            Assert.Equal("9780547928227", book.ISBN);
            Assert.Equal("Houghton Mifflin", book.Publisher);
            Assert.Equal("September 21, 1937", book.PublishDate);
            Assert.Equal(310, book.PageCount);
            Assert.Equal("A fantasy novel about a hobbit.", book.Description);
            Assert.Equal("https://covers.openlibrary.org/b/id/123-S.jpg", book.CoverSmall);
            Assert.Equal("https://covers.openlibrary.org/b/id/123-M.jpg", book.CoverMedium);
            Assert.Equal("https://covers.openlibrary.org/b/id/123-L.jpg", book.CoverLarge);
            Assert.Equal("https://openlibrary.org/books/OL123", book.BookUrl);
        }

        [Fact]
        public async Task AddBookAsync_JoinsMultipleAuthors()
        {
            using var context = CreateInMemoryContext();
            var service = new VaultService(context);

            var request = new BookRequest
            {
                Title = "Good Omens",
                Authors = new List<string> { "Terry Pratchett", "Neil Gaiman" }
            };

            var book = await service.AddBookAsync(request, userId: 1L);

            Assert.Equal("Terry Pratchett, Neil Gaiman", book.Author);
        }

        [Fact]
        public async Task AddBookAsync_IgnoresBlankAuthors()
        {
            using var context = CreateInMemoryContext();
            var service = new VaultService(context);

            var request = new BookRequest
            {
                Title = "Some Book",
                Authors = new List<string> { "  ", "Valid Author", "" }
            };

            var book = await service.AddBookAsync(request, userId: 1L);

            Assert.Equal("Valid Author", book.Author);
        }

        [Fact]
        public async Task AddBookAsync_SetsTimestamps()
        {
            using var context = CreateInMemoryContext();
            var service = new VaultService(context);

            var before = DateTime.UtcNow;

            var book = await service.AddBookAsync(new BookRequest
            {
                Title = "Timestamp Test",
                Authors = new List<string> { "Author" }
            }, userId: 1L);

            var after = DateTime.UtcNow;

            Assert.InRange(book.CreatedUtcDate, before, after);
            Assert.InRange(book.LastModifiedUtcDate, before, after);
        }
    }
}
