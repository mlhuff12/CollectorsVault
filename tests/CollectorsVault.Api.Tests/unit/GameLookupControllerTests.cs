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
    public class GameLookupControllerTests
    {
        private static GameLookupController CreateController(IGameLookupService service)
            => new GameLookupController(service);

        [Fact]
        public async Task GetByUpc_WhenGameFound_ReturnsOk()
        {
            // Arrange
            var expected = new GameLookupResult
            {
                Title = "Halo Infinite",
                Platform = "Xbox Series X",
                ReleaseYear = 2021,
                Genre = "Shooter",
                Developer = "343 Industries",
                Publisher = "Xbox Game Studios",
                IgdbId = 12345L
            };

            var mock = new Mock<IGameLookupService>(MockBehavior.Strict);
            mock.Setup(s => s.LookupByUpcAsync("093155176577")).ReturnsAsync(expected);

            // Act
            var result = await CreateController(mock.Object).GetByUpc("093155176577");

            var ok = Assert.IsType<OkObjectResult>(result.Result);
            var payload = Assert.IsType<GameLookupResult>(ok.Value);

            // Assert
            Assert.Equal("Halo Infinite", payload.Title);
            Assert.Equal("343 Industries", payload.Developer);
            Assert.Equal(2021, payload.ReleaseYear);
        }

        [Fact]
        public async Task GetByUpc_WhenGameMissing_ReturnsNotFound()
        {
            // Arrange
            var mock = new Mock<IGameLookupService>(MockBehavior.Strict);
            mock.Setup(s => s.LookupByUpcAsync("000000000000")).ReturnsAsync((GameLookupResult?)null);

            // Act
            var result = await CreateController(mock.Object).GetByUpc("000000000000");

            // Assert
            Assert.IsType<NotFoundResult>(result.Result);
        }

        [Fact]
        public async Task SearchByTitle_WhenCalled_ReturnsOk_WithResults()
        {
            // Arrange
            var expected = new List<GameLookupResult>
            {
                new GameLookupResult { Title = "Halo Infinite", ReleaseYear = 2021 },
                new GameLookupResult { Title = "Halo 5: Guardians", ReleaseYear = 2015 }
            };

            var mock = new Mock<IGameLookupService>(MockBehavior.Strict);
            mock.Setup(s => s.SearchByTitleAsync("Halo")).ReturnsAsync(expected);

            // Act
            var result = await CreateController(mock.Object).SearchByTitle("Halo");

            var ok = Assert.IsType<OkObjectResult>(result.Result);
            var payload = Assert.IsAssignableFrom<IEnumerable<GameLookupResult>>(ok.Value);

            // Assert
            Assert.Equal(2, System.Linq.Enumerable.Count(payload));
        }

        [Fact]
        public async Task SearchByTitle_WhenNoneFound_ReturnsOk_WithEmptyList()
        {
            // Arrange
            var mock = new Mock<IGameLookupService>(MockBehavior.Strict);
            mock.Setup(s => s.SearchByTitleAsync("xyzzy")).ReturnsAsync(new List<GameLookupResult>());

            // Act
            var result = await CreateController(mock.Object).SearchByTitle("xyzzy");

            var ok = Assert.IsType<OkObjectResult>(result.Result);
            var payload = Assert.IsAssignableFrom<IEnumerable<GameLookupResult>>(ok.Value);

            // Assert
            Assert.Empty(payload);
        }
    }
}


