using System.Security.Claims;
using CollectorsVault.Server.Services;
using Microsoft.AspNetCore.Http;
using Moq;
using Xunit;

namespace CollectorsVault.Api.Tests.Unit
{
    [Trait("Category", "Unit")]
    public class UserServiceTests
    {
        private static UserService CreateService(string? userIdClaimValue)
        {
            var claims = userIdClaimValue != null
                ? new[] { new Claim("userId", userIdClaimValue) }
                : System.Array.Empty<Claim>();

            var identity = new ClaimsIdentity(claims, "TestAuth");
            var principal = new ClaimsPrincipal(identity);

            var httpContext = new DefaultHttpContext { User = principal };
            var httpContextAccessorMock = new Mock<IHttpContextAccessor>();
            httpContextAccessorMock.Setup(a => a.HttpContext).Returns(httpContext);

            return new UserService(httpContextAccessorMock.Object);
        }

        [Fact]
        public void GetCurrentUserId_WhenClaimIsValid_ReturnsId()
        {
            // Arrange
            // Act
            var service = CreateService("42");

            // Assert
            Assert.Equal(42L, service.GetCurrentUserId());
        }

        [Fact]
        public void GetCurrentUserId_WhenClaimIsMissing_ThrowsUnauthorized()
        {
            // Arrange
            var service = CreateService(null);

            // Act
            var ex = Assert.Throws<System.UnauthorizedAccessException>(() => service.GetCurrentUserId());

            // Assert
            Assert.Contains("missing", ex.Message, System.StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public void GetCurrentUserId_WhenClaimIsNotANumber_ThrowsUnauthorized()
        {
            // Arrange
            var service = CreateService("not-a-number");

            // Act
            var ex = Assert.Throws<System.UnauthorizedAccessException>(() => service.GetCurrentUserId());

            // Assert
            Assert.Contains("valid number", ex.Message, System.StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public void GetCurrentUserId_WhenIdIsZero_ThrowsUnauthorized()
        {
            // Arrange
            var service = CreateService("0");

            // Act
            var ex = Assert.Throws<System.UnauthorizedAccessException>(() => service.GetCurrentUserId());

            // Assert
            Assert.Contains("greater than zero", ex.Message, System.StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public void GetCurrentUserId_WhenIdIsNegative_ThrowsUnauthorized()
        {
            // Arrange
            var service = CreateService("-1");

            // Act
            var ex = Assert.Throws<System.UnauthorizedAccessException>(() => service.GetCurrentUserId());

            // Assert
            Assert.Contains("greater than zero", ex.Message, System.StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public void GetCurrentUserIsAdmin_WhenClaimIsTrue_ReturnsTrue()
        {
            // Arrange
            // Act
            var claims = new[] { new Claim("userId", "1"), new Claim("isAdmin", "true") };
            var identity = new ClaimsIdentity(claims, "TestAuth");
            var principal = new ClaimsPrincipal(identity);
            var httpContext = new DefaultHttpContext { User = principal };
            var httpContextAccessorMock = new Mock<IHttpContextAccessor>();
            httpContextAccessorMock.Setup(a => a.HttpContext).Returns(httpContext);
            var service = new UserService(httpContextAccessorMock.Object);

            // Assert
            Assert.True(service.GetCurrentUserIsAdmin());
        }

        [Fact]
        public void GetCurrentUserIsAdmin_WhenClaimIsFalse_ReturnsFalse()
        {
            // Arrange
            // Act
            var claims = new[] { new Claim("userId", "1"), new Claim("isAdmin", "false") };
            var identity = new ClaimsIdentity(claims, "TestAuth");
            var principal = new ClaimsPrincipal(identity);
            var httpContext = new DefaultHttpContext { User = principal };
            var httpContextAccessorMock = new Mock<IHttpContextAccessor>();
            httpContextAccessorMock.Setup(a => a.HttpContext).Returns(httpContext);
            var service = new UserService(httpContextAccessorMock.Object);

            // Assert
            Assert.False(service.GetCurrentUserIsAdmin());
        }

        [Fact]
        public void GetCurrentUserIsAdmin_WhenClaimIsMissing_ReturnsFalse()
        {
            // Arrange
            // Only userId claim, no isAdmin claim

            // Act
            var service = CreateService("1");

            // Assert
            Assert.False(service.GetCurrentUserIsAdmin());
        }
    }
}


