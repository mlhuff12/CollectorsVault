using System.Collections.Generic;
using System.Threading.Tasks;
using CollectorsVault.Server.Contracts;
using CollectorsVault.Server.Controllers;
using CollectorsVault.Server.Services;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace CollectorsVault.Api.Tests.Unit
{
    [Trait("Category", "Unit")]
    public class BookLookupControllerTests
    {
        private static BookLookupController CreateController(IBookLookupService service)
            => new BookLookupController(service);

        // -- GetByIsbn ---------------------------------------------------------

        [Fact]
        public async Task GetByIsbn_WhenBookFound_ReturnsOk()
        {
            // Arrange
            var expected = new BookLookupResult
            {
                Title = "The Hobbit",
                Isbn = "9780547928227",
                Authors = new List<string> { "J.R.R. Tolkien" },
                Description = "In a hole in the ground there lived a hobbit.",
                CoverLarge = "https://covers.openlibrary.org/b/isbn/9780547928227-L.jpg"
            };

            var mock = new Mock<IBookLookupService>(MockBehavior.Strict);
            mock.Setup(s => s.LookupByIsbnAsync("9780547928227")).ReturnsAsync(expected);

            // Act
            var result = await CreateController(mock.Object).GetByIsbn("9780547928227");

            var ok = Assert.IsType<OkObjectResult>(result.Result);
            var payload = Assert.IsType<BookLookupResult>(ok.Value);

            // Assert
            Assert.Equal("The Hobbit", payload.Title);
            Assert.Equal("In a hole in the ground there lived a hobbit.", payload.Description);
            Assert.Equal("https://covers.openlibrary.org/b/isbn/9780547928227-L.jpg", payload.CoverLarge);
        }

        [Fact]
        public async Task GetByIsbn_WhenBookMissing_ReturnsOkWithEmptyResult()
        {
            // Arrange
            var mock = new Mock<IBookLookupService>(MockBehavior.Strict);
            var notFoundResult = new BookLookupResult
            {
                Isbn = "0000000000",
                Title = string.Empty
            };
            mock.Setup(s => s.LookupByIsbnAsync("0000000000")).ReturnsAsync(notFoundResult);

            // Act
            var result = await CreateController(mock.Object).GetByIsbn("0000000000");

            var ok = Assert.IsType<OkObjectResult>(result.Result);
            var payload = Assert.IsType<BookLookupResult>(ok.Value);

            // Assert
            Assert.Equal(string.Empty, payload.Title);
        }

        // -- SearchByTitle ----------------------------------------------------

        [Fact]
        public async Task SearchByTitle_WhenCalled_ReturnsOk_WithResults()
        {
            // Arrange
            var expected = new List<BookLookupResult>
            {
                new BookLookupResult { Title = "The Hobbit", Isbn = "9780547928227" },
                new BookLookupResult { Title = "The Hobbit: An Unexpected Journey", Isbn = "9780007488940" }
            };

            var mock = new Mock<IBookLookupService>(MockBehavior.Strict);
            mock.Setup(s => s.SearchByTitleAsync("Hobbit")).ReturnsAsync(expected);

            // Act
            var result = await CreateController(mock.Object).SearchByTitle("Hobbit");

            var ok = Assert.IsType<OkObjectResult>(result.Result);
            var payload = Assert.IsAssignableFrom<IEnumerable<BookLookupResult>>(ok.Value);

            // Assert
            Assert.Equal(2, System.Linq.Enumerable.Count(payload));
        }

        [Fact]
        public async Task SearchByTitle_WhenNoneFound_ReturnsOk_WithEmptyList()
        {
            // Arrange
            var mock = new Mock<IBookLookupService>(MockBehavior.Strict);
            mock.Setup(s => s.SearchByTitleAsync("xyzzy")).ReturnsAsync(new List<BookLookupResult>());

            // Act
            var result = await CreateController(mock.Object).SearchByTitle("xyzzy");

            var ok = Assert.IsType<OkObjectResult>(result.Result);
            var payload = Assert.IsAssignableFrom<IEnumerable<BookLookupResult>>(ok.Value);

            // Assert
            Assert.Empty(payload);
        }

        // -- SearchByAuthor ---------------------------------------------------

        [Fact]
        public async Task SearchByAuthor_WhenCalled_ReturnsOk_WithResults()
        {
            // Arrange
            var expected = new List<BookLookupResult>
            {
                new BookLookupResult { Title = "The Hobbit", Authors = new List<string> { "J.R.R. Tolkien" } },
                new BookLookupResult { Title = "The Fellowship of the Ring", Authors = new List<string> { "J.R.R. Tolkien" } }
            };

            var mock = new Mock<IBookLookupService>(MockBehavior.Strict);
            mock.Setup(s => s.SearchByAuthorAsync("Tolkien")).ReturnsAsync(expected);

            // Act
            var result = await CreateController(mock.Object).SearchByAuthor("Tolkien");

            var ok = Assert.IsType<OkObjectResult>(result.Result);
            var payload = Assert.IsAssignableFrom<IEnumerable<BookLookupResult>>(ok.Value);

            // Assert
            Assert.Equal(2, System.Linq.Enumerable.Count(payload));
        }

        [Fact]
        public async Task SearchByAuthor_WhenNoneFound_ReturnsOk_WithEmptyList()
        {
            // Arrange
            var mock = new Mock<IBookLookupService>(MockBehavior.Strict);
            mock.Setup(s => s.SearchByAuthorAsync("nobody")).ReturnsAsync(new List<BookLookupResult>());

            // Act
            var result = await CreateController(mock.Object).SearchByAuthor("nobody");

            var ok = Assert.IsType<OkObjectResult>(result.Result);
            var payload = Assert.IsAssignableFrom<IEnumerable<BookLookupResult>>(ok.Value);

            // Assert
            Assert.Empty(payload);
        }
    }
}


