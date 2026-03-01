using System.Security.Claims;
using CollectorsVault.Server.Services;
using Microsoft.AspNetCore.Http;
using Moq;
using Xunit;

namespace CollectorsVault.Api.Tests
{
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
        public void GetCurrentUserId_ReturnsId_WhenClaimIsValid()
        {
            var service = CreateService("42");
            Assert.Equal(42L, service.GetCurrentUserId());
        }

        [Fact]
        public void GetCurrentUserId_ThrowsUnauthorized_WhenClaimIsMissing()
        {
            var service = CreateService(null);
            var ex = Assert.Throws<System.UnauthorizedAccessException>(() => service.GetCurrentUserId());
            Assert.Contains("missing", ex.Message, System.StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public void GetCurrentUserId_ThrowsUnauthorized_WhenClaimIsNotANumber()
        {
            var service = CreateService("not-a-number");
            var ex = Assert.Throws<System.UnauthorizedAccessException>(() => service.GetCurrentUserId());
            Assert.Contains("valid number", ex.Message, System.StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public void GetCurrentUserId_ThrowsUnauthorized_WhenIdIsZero()
        {
            var service = CreateService("0");
            var ex = Assert.Throws<System.UnauthorizedAccessException>(() => service.GetCurrentUserId());
            Assert.Contains("greater than zero", ex.Message, System.StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public void GetCurrentUserId_ThrowsUnauthorized_WhenIdIsNegative()
        {
            var service = CreateService("-1");
            var ex = Assert.Throws<System.UnauthorizedAccessException>(() => service.GetCurrentUserId());
            Assert.Contains("greater than zero", ex.Message, System.StringComparison.OrdinalIgnoreCase);
        }
    }
}
