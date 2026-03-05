using Microsoft.AspNetCore.Http;

namespace CollectorsVault.Server.Services
{
    /// <inheritdoc />
    public class UserService : IUserService
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        public UserService(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        /// <inheritdoc />
        public long GetCurrentUserId()
        {
            var claim = _httpContextAccessor.HttpContext?.User?.FindFirst("userId")?.Value;
            if (claim == null)
            {
                throw new System.UnauthorizedAccessException("User ID claim is missing.");
            }
            if (!long.TryParse(claim, out var id))
            {
                throw new System.UnauthorizedAccessException("User ID claim is not a valid number.");
            }
            if (id <= 0)
            {
                throw new System.UnauthorizedAccessException("User ID must be greater than zero.");
            }
            return id;
        }

        /// <inheritdoc />
        public bool GetCurrentUserIsAdmin()
        {
            var claim = _httpContextAccessor.HttpContext?.User?.FindFirst("isAdmin")?.Value;
            return claim == "true";
        }
    }
}
