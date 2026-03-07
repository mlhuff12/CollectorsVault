using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CollectorsVault.Server.Contracts;
using CollectorsVault.Server.Data;
using CollectorsVault.Server.Models;
using CollectorsVault.Server.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace CollectorsVault.Api.Tests.Unit
{
    /// <summary>
    /// Unit tests for <see cref="VaultService.AddBookAsync"/> using an in-memory database.
    /// No changes are persisted to an external database.
    /// </summary>
    [Trait("Category", "Unit")]
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
            Assert.Equal(new List<string> { "Frank Herbert" }, book.Authors);
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
                Subjects = new List<string> { "Fantasy", "Adventure" },
                CoverSmall = "https://covers.openlibrary.org/b/id/123-S.jpg",
                CoverMedium = "https://covers.openlibrary.org/b/id/123-M.jpg",
                CoverLarge = "https://covers.openlibrary.org/b/id/123-L.jpg",
                BookUrl = "https://openlibrary.org/books/OL123"
            };

            var book = await service.AddBookAsync(request, userId: 2L);

            Assert.Equal("The Hobbit", book.Title);
            Assert.Equal(new List<string> { "J.R.R. Tolkien" }, book.Authors);
            Assert.Equal("9780547928227", book.ISBN);
            Assert.Equal("Houghton Mifflin", book.Publisher);
            // "September 21, 1937" parses successfully to a DateTime
            Assert.NotNull(book.PublishUtcDate);
            Assert.Equal(1937, book.PublishUtcDate!.Value.Year);
            Assert.Equal(9, book.PublishUtcDate.Value.Month);
            Assert.Equal(21, book.PublishUtcDate.Value.Day);
            Assert.Equal(310, book.PageCount);
            Assert.Equal("A fantasy novel about a hobbit.", book.Description);
            Assert.Equal(new List<string> { "Fantasy", "Adventure" }, book.Subjects);
            Assert.Equal("https://covers.openlibrary.org/b/id/123-S.jpg", book.CoverSmall);
            Assert.Equal("https://covers.openlibrary.org/b/id/123-M.jpg", book.CoverMedium);
            Assert.Equal("https://covers.openlibrary.org/b/id/123-L.jpg", book.CoverLarge);
            Assert.Equal("https://openlibrary.org/books/OL123", book.BookUrl);
        }

        [Fact]
        public async Task AddBookAsync_StoresMultipleAuthors()
        {
            using var context = CreateInMemoryContext();
            var service = new VaultService(context);

            var request = new BookRequest
            {
                Title = "Good Omens",
                Authors = new List<string> { "Terry Pratchett", "Neil Gaiman" }
            };

            var book = await service.AddBookAsync(request, userId: 1L);

            Assert.Equal(new List<string> { "Terry Pratchett", "Neil Gaiman" }, book.Authors);
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

            Assert.Equal(new List<string> { "Valid Author" }, book.Authors);
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

        [Fact]
        public async Task AddBookAsync_PersistsSeriesAndFormatFields()
        {
            using var context = CreateInMemoryContext();
            var service = new VaultService(context);

            var request = new BookRequest
            {
                Title = "The Invasion",
                Authors = new List<string> { "K.A. Applegate" },
                ISBN = "0590629778",
                SeriesName = "Animorphs",
                SeriesNumber = 1,
                BookFormat = "Paperback",
                NeedsReplacement = true
            };

            var book = await service.AddBookAsync(request, userId: 1L);

            Assert.Equal("Animorphs", book.SeriesName);
            Assert.Equal(1, book.SeriesNumber);
            Assert.Equal(BookFormat.Paperback, book.BookFormat);
            Assert.True(book.NeedsReplacement);
        }

        [Fact]
        public async Task AddBookAsync_NullableFieldsAreNullWhenNotProvided()
        {
            using var context = CreateInMemoryContext();
            var service = new VaultService(context);

            var book = await service.AddBookAsync(new BookRequest
            {
                Title = "Minimal Book",
                Authors = new List<string> { "Author" }
            }, userId: 1L);

            Assert.Null(book.ISBN);
            Assert.Null(book.PublicationYear);
            Assert.Null(book.Publisher);
            Assert.Null(book.PublishUtcDate);
            Assert.Null(book.CoverSmall);
            Assert.Null(book.CoverMedium);
            Assert.Null(book.CoverLarge);
            Assert.Null(book.BookUrl);
            Assert.Null(book.Subjects);
            Assert.Null(book.BookFormat);
            Assert.Null(book.SeriesName);
            Assert.Null(book.SeriesNumber);
        }

        [Fact]
        public async Task AddBookAsync_ParsesBookFormatVariants()
        {
            using var context = CreateInMemoryContext();
            var service = new VaultService(context);

            async Task<BookFormat?> GetFormat(string input)
            {
                var book = await service.AddBookAsync(new BookRequest
                {
                    Title = "Format Test",
                    Authors = new List<string> { "Author" },
                    BookFormat = input
                }, userId: 1L);
                return book.BookFormat;
            }

            Assert.Equal(BookFormat.Hardcover, await GetFormat("Hardcover"));
            Assert.Equal(BookFormat.Paperback, await GetFormat("paperback"));
            Assert.Equal(BookFormat.MassMarketPaperback, await GetFormat("Mass Market Paperback"));
            Assert.Equal(BookFormat.EBook, await GetFormat("ebook"));
            Assert.Equal(BookFormat.Audiobook, await GetFormat("Audio Book"));
            Assert.Equal(BookFormat.Audiobook, await GetFormat("audio cd"));
            Assert.Equal(BookFormat.Other, await GetFormat("Pamphlet"));
        }
    }
}
