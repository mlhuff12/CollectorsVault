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
        [Fact]
        public async Task GetVaultItems_ReturnsOkResult_WithItems()
        {
            var expected = new List<VaultItemResponse>
            {
                new VaultItemResponse { Id = 1, Title = "Dune", Category = "book" },
                new VaultItemResponse { Id = 2, Title = "Inception", Category = "movie" }
            };

            var serviceMock = new Mock<IVaultService>();
            serviceMock.Setup(service => service.GetVaultItemsAsync())
                .ReturnsAsync(expected);

            var controller = new VaultController(serviceMock.Object);

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
                Id = 10,
                Title = "The Hobbit",
                Author = "J.R.R. Tolkien",
                ISBN = "978-0547928227",
                PublicationYear = 1937,
                Genre = "Fantasy"
            };

            var serviceMock = new Mock<IVaultService>();
            serviceMock.Setup(service => service.AddBookAsync(request))
                .ReturnsAsync(created);

            var controller = new VaultController(serviceMock.Object);

            var result = await controller.AddBook(request);

            var createdResult = Assert.IsType<CreatedAtActionResult>(result.Result);
            Assert.Equal(nameof(VaultController.GetVaultItems), createdResult.ActionName);
            var payload = Assert.IsType<Book>(createdResult.Value);
            Assert.Equal(10, payload.Id);
        }

        [Fact]
        public async Task DeleteVaultItem_ReturnsNotFound_WhenItemDoesNotExist()
        {
            var serviceMock = new Mock<IVaultService>();
            serviceMock.Setup(service => service.DeleteVaultItemAsync(99))
                .ReturnsAsync(false);

            var controller = new VaultController(serviceMock.Object);

            var result = await controller.DeleteVaultItem(99);

            Assert.IsType<NotFoundResult>(result);
        }

        [Fact]
        public async Task DeleteVaultItem_ReturnsNoContent_WhenItemExists()
        {
            var serviceMock = new Mock<IVaultService>();
            serviceMock.Setup(service => service.DeleteVaultItemAsync(2))
                .ReturnsAsync(true);

            var controller = new VaultController(serviceMock.Object);

            var result = await controller.DeleteVaultItem(2);

            Assert.IsType<NoContentResult>(result);
        }
    }
}
