using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CollectorsVault.Server.Contracts;
using CollectorsVault.Server.Controllers;
using CollectorsVault.Server.Models;
using CollectorsVault.Server.Services;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace CollectorsVault.Api.Tests
{
    public class VaultControllerTests
    {
        private static VaultController CreateControllerWithUser(IVaultService service, long userId = 1)
        {
            var userServiceMock = new Mock<IUserService>();
            userServiceMock.Setup(s => s.GetCurrentUserId()).Returns(userId);
            var controller = new VaultController(service, userServiceMock.Object);
            return controller;
        }

        [Fact]
        public async Task GetVaultItems_ReturnsOkResult_WithItems()
        {
            var expected = new List<VaultItemResponse>
            {
                new VaultItemResponse { Id = 1L, Title = "Dune", Category = "book" },
                new VaultItemResponse { Id = 2L, Title = "Inception", Category = "movie" }
            };

            var serviceMock = new Mock<IVaultService>();
            serviceMock.Setup(service => service.GetVaultItemsAsync(1L))
                .ReturnsAsync(expected);

            var controller = CreateControllerWithUser(serviceMock.Object, 1L);

            var result = await controller.GetVaultItems();

            var okResult = Assert.IsType<OkObjectResult>(result.Result);
            var payload = Assert.IsAssignableFrom<IEnumerable<VaultItemResponse>>(okResult.Value);
            Assert.Equal(2, payload.Count());
        }

        [Fact]
        public async Task AddBook_ReturnsCreatedAtAction_WithBook()
        {
            var request = new BookRequest
            {
                Title = "The Hobbit",
                Authors = new List<string> { "J.R.R. Tolkien" },
                ISBN = "978-0547928227",
                Year = 1937,
                Genre = "Fantasy"
            };

            var created = new Book
            {
                Id = 10L,
                Title = "The Hobbit",
                Authors = new System.Collections.Generic.List<string> { "J.R.R. Tolkien" },
                ISBN = "978-0547928227",
                PublicationYear = 1937,
                Genre = "Fantasy"
            };

            var serviceMock = new Mock<IVaultService>();
            serviceMock.Setup(service => service.AddBookAsync(request, 1L))
                .ReturnsAsync(created);

            var controller = CreateControllerWithUser(serviceMock.Object, 1L);

            var result = await controller.AddBook(request);

            var createdResult = Assert.IsType<CreatedAtActionResult>(result.Result);
            Assert.Equal(nameof(VaultController.GetVaultItems), createdResult.ActionName);
            var payload = Assert.IsType<Book>(createdResult.Value);
            Assert.Equal(10L, payload.Id);
        }

        [Fact]
        public async Task DeleteVaultItem_ReturnsNotFound_WhenItemDoesNotExist()
        {
            var serviceMock = new Mock<IVaultService>();
            serviceMock.Setup(service => service.DeleteVaultItemAsync(99L, 1L))
                .ReturnsAsync(false);

            var controller = CreateControllerWithUser(serviceMock.Object, 1L);

            var result = await controller.DeleteVaultItem(99L);

            Assert.IsType<NotFoundResult>(result);
        }

        [Fact]
        public async Task DeleteVaultItem_ReturnsNoContent_WhenItemExists()
        {
            var serviceMock = new Mock<IVaultService>();
            serviceMock.Setup(service => service.DeleteVaultItemAsync(2L, 1L))
                .ReturnsAsync(true);

            var controller = CreateControllerWithUser(serviceMock.Object, 1L);

            var result = await controller.DeleteVaultItem(2L);

            Assert.IsType<NoContentResult>(result);
        }
    }
}
