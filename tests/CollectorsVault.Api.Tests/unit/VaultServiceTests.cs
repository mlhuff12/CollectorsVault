using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CollectorsVault.Server.Contracts;
using CollectorsVault.Server.Data;
using CollectorsVault.Server.Models;
using CollectorsVault.Server.Services;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace CollectorsVault.Api.Tests.Unit
{
    /// <summary>
    /// Unit tests for <see cref="VaultService.AddBookAsync"/> using Moq-backed collaborators.
    /// </summary>
    [Trait("Category", "Unit")]
    public class VaultServiceTests
    {
        private static (VaultService service, Func<Book?> getCapturedBook) CreateService()
        {
            var options = new DbContextOptionsBuilder<VaultDbContext>()
                .Options;

            var contextMock = new Mock<VaultDbContext>(options) { CallBase = true };
            // MockBehavior.Strict is intentionally omitted: CallBase = true delegates un-setup
            // calls to the real DbContext implementation, making strict mode impractical here.
            var booksSetMock = new Mock<DbSet<Book>>();

            Book? capturedBook = null;

            booksSetMock
                .Setup(set => set.Add(It.IsAny<Book>()))
                .Callback<Book>(book => capturedBook = book);

            contextMock.Object.Books = booksSetMock.Object;
            contextMock
                .Setup(context => context.SaveChangesAsync(It.IsAny<System.Threading.CancellationToken>()))
                .ReturnsAsync(1);

            var service = new VaultService(contextMock.Object);
            return (service, () => capturedBook);
        }

        [Fact]
        public async Task AddBookAsync_WhenCalled_PersistsAllBasicFields()
        {
            // Arrange
            var (service, getCapturedBook) = CreateService();

            var request = new BookRequest
            {
                Title = "Dune",
                Authors = new List<string> { "Frank Herbert" },
                ISBN = "9780441172719"
            };

            // Act
            await service.AddBookAsync(request, userId: 1L);

            var book = Assert.IsType<Book>(getCapturedBook());

            // Assert
            Assert.Equal("Dune", book.Title);
            Assert.Equal(new List<string> { "Frank Herbert" }, book.Authors);
            Assert.Equal("9780441172719", book.ISBN);
            Assert.Equal(1L, book.UserId);
        }

        [Fact]
        public async Task AddBookAsync_WhenCalled_PersistsLookupFields()
        {
            // Arrange
            var (service, getCapturedBook) = CreateService();

            var request = new BookRequest
            {
                Title = "The Hobbit",
                Authors = new List<string> { "J.R.R. Tolkien" },
                ISBN = "9780547928227",
                Publisher = "Houghton Mifflin",
                PublishDateString = "September 21, 1937",
                PageCount = 310,
                Description = "A fantasy novel about a hobbit.",
                Subjects = new List<string> { "Fantasy", "Adventure" },
                CoverSmall = "https://covers.openlibrary.org/b/id/123-S.jpg",
                CoverMedium = "https://covers.openlibrary.org/b/id/123-M.jpg",
                CoverLarge = "https://covers.openlibrary.org/b/id/123-L.jpg",
                BookUrl = "https://openlibrary.org/books/OL123"
            };

            // Act
            await service.AddBookAsync(request, userId: 2L);

            var book = Assert.IsType<Book>(getCapturedBook());

            // Assert
            Assert.Equal("The Hobbit", book.Title);
            Assert.Equal(new List<string> { "J.R.R. Tolkien" }, book.Authors);
            Assert.Equal("9780547928227", book.ISBN);
            Assert.Equal("Houghton Mifflin", book.Publisher);
            Assert.Equal("September 21, 1937", book.PublishDateString);
            Assert.Equal(310, book.PageCount);
            Assert.Equal("A fantasy novel about a hobbit.", book.Description);
            Assert.Equal(new List<string> { "Fantasy", "Adventure" }, book.Subjects);
            Assert.Equal("https://covers.openlibrary.org/b/id/123-S.jpg", book.CoverSmall);
            Assert.Equal("https://covers.openlibrary.org/b/id/123-M.jpg", book.CoverMedium);
            Assert.Equal("https://covers.openlibrary.org/b/id/123-L.jpg", book.CoverLarge);
            Assert.Equal("https://openlibrary.org/books/OL123", book.BookUrl);
        }

        [Fact]
        public async Task AddBookAsync_WhenCalled_StoresMultipleAuthors()
        {
            // Arrange
            var (service, getCapturedBook) = CreateService();

            var request = new BookRequest
            {
                Title = "Good Omens",
                Authors = new List<string> { "Terry Pratchett", "Neil Gaiman" }
            };

            // Act
            await service.AddBookAsync(request, userId: 1L);

            var book = Assert.IsType<Book>(getCapturedBook());

            // Assert
            Assert.Equal(new List<string> { "Terry Pratchett", "Neil Gaiman" }, book.Authors);
        }

        [Fact]
        public async Task AddBookAsync_WhenCalled_IgnoresBlankAuthors()
        {
            // Arrange
            var (service, getCapturedBook) = CreateService();

            var request = new BookRequest
            {
                Title = "Some Book",
                Authors = new List<string> { "  ", "Valid Author", "" }
            };

            // Act
            await service.AddBookAsync(request, userId: 1L);

            var book = Assert.IsType<Book>(getCapturedBook());

            // Assert
            Assert.Equal(new List<string> { "Valid Author" }, book.Authors);
        }

        [Fact]
        public async Task AddBookAsync_WhenCalled_SetsTimestamps()
        {
            // Arrange
            var (service, getCapturedBook) = CreateService();

            // Act
            var before = DateTime.UtcNow;

            await service.AddBookAsync(new BookRequest
            {
                Title = "Timestamp Test",
                Authors = new List<string> { "Author" }
            }, userId: 1L);

            var book = Assert.IsType<Book>(getCapturedBook());

            var after = DateTime.UtcNow;

            // Assert
            Assert.InRange(book.CreatedUtcDate, before, after);
            Assert.InRange(book.LastModifiedUtcDate, before, after);
        }

        [Fact]
        public async Task AddBookAsync_WhenCalled_PersistsSeriesAndFormatFields()
        {
            // Arrange
            var (service, getCapturedBook) = CreateService();

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

            // Act
            await service.AddBookAsync(request, userId: 1L);

            var book = Assert.IsType<Book>(getCapturedBook());

            // Assert
            Assert.Equal("Animorphs", book.SeriesName);
            Assert.Equal(1, book.SeriesNumber);
            Assert.Equal(BookFormat.Paperback, book.BookFormat);
            Assert.True(book.NeedsReplacement);
        }

        [Fact]
        public async Task AddBookAsync_WhenCalled_NullableFieldsAreNullWhenNotProvided()
        {
            // Arrange
            var (service, getCapturedBook) = CreateService();

            // Act
            await service.AddBookAsync(new BookRequest
            {
                Title = "Minimal Book",
                Authors = new List<string> { "Author" }
            }, userId: 1L);

            var book = Assert.IsType<Book>(getCapturedBook());

            // Assert
            Assert.Null(book.ISBN);
            Assert.Null(book.Publisher);
            Assert.Null(book.PublishDateString);
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
        public async Task AddBookAsync_WhenCalled_ParsesBookFormatVariants()
        {
            // Arrange
            var (service, _) = CreateService();

            // Act
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

            // Assert
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

