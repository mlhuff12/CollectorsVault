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
            var userServiceMock = new Mock<IUserService>();
            userServiceMock.Setup(s => s.GetCurrentUserId()).Returns(userId);
            userServiceMock.Setup(s => s.GetCurrentUserIsAdmin()).Returns(isAdmin);
            return new AdminController(adminService, userServiceMock.Object);
        }

        [Fact]
        public async Task GetAllUsers_ReturnsForbid_WhenNotAdmin()
        {
            var serviceMock = new Mock<IAdminService>();
            var controller = CreateController(serviceMock.Object, isAdmin: false);

            var result = await controller.GetAllUsers();

            Assert.IsType<ForbidResult>(result.Result);
        }

        [Fact]
        public async Task GetAllUsers_ReturnsOk_WithUserList_WhenAdmin()
        {
            var users = new List<AdminUserResponse>
            {
                new AdminUserResponse { Id = 1L, Username = "admin", IsAdmin = true, BookCount = 2, MovieCount = 1, GameCount = 0 },
                new AdminUserResponse { Id = 2L, Username = "user2", IsAdmin = false, BookCount = 0, MovieCount = 0, GameCount = 3 }
            };

            var serviceMock = new Mock<IAdminService>();
            serviceMock.Setup(s => s.GetAllUsersAsync()).ReturnsAsync(users);

            var controller = CreateController(serviceMock.Object, isAdmin: true);

            var result = await controller.GetAllUsers();

            var okResult = Assert.IsType<OkObjectResult>(result.Result);
            var payload = Assert.IsAssignableFrom<IEnumerable<AdminUserResponse>>(okResult.Value);
            Assert.Equal(2, payload.Count());
        }

        [Fact]
        public async Task DeleteUser_ReturnsForbid_WhenNotAdmin()
        {
            var serviceMock = new Mock<IAdminService>();
            var controller = CreateController(serviceMock.Object, userId: 1, isAdmin: false);

            var result = await controller.DeleteUser(2L);

            Assert.IsType<ForbidResult>(result);
        }

        [Fact]
        public async Task DeleteUser_ReturnsForbid_WhenAdminDeletesSelf()
        {
            var serviceMock = new Mock<IAdminService>();
            var controller = CreateController(serviceMock.Object, userId: 1, isAdmin: true);

            var result = await controller.DeleteUser(1L);

            Assert.IsType<ForbidResult>(result);
        }

        [Fact]
        public async Task DeleteUser_ReturnsNotFound_WhenUserDoesNotExist()
        {
            var serviceMock = new Mock<IAdminService>();
            serviceMock.Setup(s => s.DeleteUserAsync(99L)).ReturnsAsync(false);

            var controller = CreateController(serviceMock.Object, userId: 1, isAdmin: true);

            var result = await controller.DeleteUser(99L);

            Assert.IsType<NotFoundResult>(result);
        }

        [Fact]
        public async Task DeleteUser_ReturnsNoContent_WhenUserDeleted()
        {
            var serviceMock = new Mock<IAdminService>();
            serviceMock.Setup(s => s.DeleteUserAsync(2L)).ReturnsAsync(true);

            var controller = CreateController(serviceMock.Object, userId: 1, isAdmin: true);

            var result = await controller.DeleteUser(2L);

            Assert.IsType<NoContentResult>(result);
        }
    }
}
