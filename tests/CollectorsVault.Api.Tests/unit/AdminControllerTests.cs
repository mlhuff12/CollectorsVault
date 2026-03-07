using System.Collections.Generic;
using System.Linq;
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
    public class AdminControllerTests
    {
        private static AdminController CreateController(
            IAdminService adminService,
            long userId = 1,
            bool isAdmin = true)
        {
            var userServiceMock = new Mock<IUserService>(MockBehavior.Strict);
            userServiceMock.Setup(s => s.GetCurrentUserId()).Returns(userId);
            userServiceMock.Setup(s => s.GetCurrentUserIsAdmin()).Returns(isAdmin);
            return new AdminController(adminService, userServiceMock.Object);
        }

        [Fact]
        public async Task GetAllUsers_WhenNotAdmin_ReturnsForbid()
        {
            // Arrange
            var serviceMock = new Mock<IAdminService>(MockBehavior.Strict);
            var controller = CreateController(serviceMock.Object, isAdmin: false);

            // Act
            var result = await controller.GetAllUsers();

            // Assert
            Assert.IsType<ForbidResult>(result.Result);
        }

        [Fact]
        public async Task GetAllUsers_WhenAdmin_ReturnsOk_WithUserList()
        {
            // Arrange
            var users = new List<AdminUserResponse>
            {
                new AdminUserResponse { Id = 1L, Username = "admin", IsAdmin = true, BookCount = 2, MovieCount = 1, GameCount = 0 },
                new AdminUserResponse { Id = 2L, Username = "user2", IsAdmin = false, BookCount = 0, MovieCount = 0, GameCount = 3 }
            };

            var serviceMock = new Mock<IAdminService>(MockBehavior.Strict);
            serviceMock.Setup(s => s.GetAllUsersAsync()).ReturnsAsync(users);

            var controller = CreateController(serviceMock.Object, isAdmin: true);

            // Act
            var result = await controller.GetAllUsers();

            var okResult = Assert.IsType<OkObjectResult>(result.Result);
            var payload = Assert.IsAssignableFrom<IEnumerable<AdminUserResponse>>(okResult.Value);

            // Assert
            Assert.Equal(2, payload.Count());
        }

        [Fact]
        public async Task DeleteUser_WhenNotAdmin_ReturnsForbid()
        {
            // Arrange
            var serviceMock = new Mock<IAdminService>(MockBehavior.Strict);
            var controller = CreateController(serviceMock.Object, userId: 1, isAdmin: false);

            // Act
            var result = await controller.DeleteUser(2L);

            // Assert
            Assert.IsType<ForbidResult>(result);
        }

        [Fact]
        public async Task DeleteUser_WhenAdminDeletesSelf_ReturnsForbid()
        {
            // Arrange
            var serviceMock = new Mock<IAdminService>(MockBehavior.Strict);
            var controller = CreateController(serviceMock.Object, userId: 1, isAdmin: true);

            // Act
            var result = await controller.DeleteUser(1L);

            // Assert
            Assert.IsType<ForbidResult>(result);
        }

        [Fact]
        public async Task DeleteUser_WhenUserDoesNotExist_ReturnsNotFound()
        {
            // Arrange
            var serviceMock = new Mock<IAdminService>(MockBehavior.Strict);
            serviceMock.Setup(s => s.DeleteUserAsync(99L)).ReturnsAsync(false);

            var controller = CreateController(serviceMock.Object, userId: 1, isAdmin: true);

            // Act
            var result = await controller.DeleteUser(99L);

            // Assert
            Assert.IsType<NotFoundResult>(result);
        }

        [Fact]
        public async Task DeleteUser_WhenUserDeleted_ReturnsNoContent()
        {
            // Arrange
            var serviceMock = new Mock<IAdminService>(MockBehavior.Strict);
            serviceMock.Setup(s => s.DeleteUserAsync(2L)).ReturnsAsync(true);

            var controller = CreateController(serviceMock.Object, userId: 1, isAdmin: true);

            // Act
            var result = await controller.DeleteUser(2L);

            // Assert
            Assert.IsType<NoContentResult>(result);
        }
    }
}


