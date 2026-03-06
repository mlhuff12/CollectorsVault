using System.Collections.Generic;
using System.Threading.Tasks;
using CollectorsVault.Server.Contracts;
using CollectorsVault.Server.Controllers;
using CollectorsVault.Server.Services;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace CollectorsVault.Api.Tests
{
    [Trait("Category", "Unit")]
    public class MovieLookupControllerTests
    {
        private static MovieLookupController CreateController(IMovieLookupService service)
            => new MovieLookupController(service);

        [Fact]
        public async Task GetByUpc_ReturnsOk_WhenMovieFound()
        {
            var expected = new MovieLookupResult
            {
                Title = "The Dark Knight",
                Director = "Christopher Nolan",
                ReleaseYear = 2008,
                Genre = "Action, Crime, Drama",
                Rating = "PG-13",
                ImdbId = "tt0468569"
            };

            var mock = new Mock<IMovieLookupService>();
            mock.Setup(s => s.LookupByUpcAsync("025192179822")).ReturnsAsync(expected);

            var result = await CreateController(mock.Object).GetByUpc("025192179822");

            var ok = Assert.IsType<OkObjectResult>(result.Result);
            var payload = Assert.IsType<MovieLookupResult>(ok.Value);
            Assert.Equal("The Dark Knight", payload.Title);
            Assert.Equal("Christopher Nolan", payload.Director);
            Assert.Equal(2008, payload.ReleaseYear);
        }

        [Fact]
        public async Task GetByUpc_ReturnsNotFound_WhenMovieMissing()
        {
            var mock = new Mock<IMovieLookupService>();
            mock.Setup(s => s.LookupByUpcAsync("000000000000")).ReturnsAsync((MovieLookupResult?)null);

            var result = await CreateController(mock.Object).GetByUpc("000000000000");

            Assert.IsType<NotFoundResult>(result.Result);
        }

        [Fact]
        public async Task SearchByTitle_ReturnsOk_WithResults()
        {
            var expected = new List<MovieLookupResult>
            {
                new MovieLookupResult { Title = "The Dark Knight", ReleaseYear = 2008 },
                new MovieLookupResult { Title = "The Dark Knight Rises", ReleaseYear = 2012 }
            };

            var mock = new Mock<IMovieLookupService>();
            mock.Setup(s => s.SearchByTitleAsync("Dark Knight")).ReturnsAsync(expected);

            var result = await CreateController(mock.Object).SearchByTitle("Dark Knight");

            var ok = Assert.IsType<OkObjectResult>(result.Result);
            var payload = Assert.IsAssignableFrom<IEnumerable<MovieLookupResult>>(ok.Value);
            Assert.Equal(2, System.Linq.Enumerable.Count(payload));
        }

        [Fact]
        public async Task SearchByTitle_ReturnsOk_WithEmptyList_WhenNoneFound()
        {
            var mock = new Mock<IMovieLookupService>();
            mock.Setup(s => s.SearchByTitleAsync("xyzzy")).ReturnsAsync(new List<MovieLookupResult>());

            var result = await CreateController(mock.Object).SearchByTitle("xyzzy");

            var ok = Assert.IsType<OkObjectResult>(result.Result);
            var payload = Assert.IsAssignableFrom<IEnumerable<MovieLookupResult>>(ok.Value);
            Assert.Empty(payload);
        }
    }
}
