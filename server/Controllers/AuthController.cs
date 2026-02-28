using System.Threading.Tasks;
using CollectorsVault.Server.Contracts;
using CollectorsVault.Server.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CollectorsVault.Server.Controllers
{
    /// <summary>
    /// Handles user authentication (signup, login).
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        /// <summary>
        /// Creates a new user account and returns TOTP setup URI.
        /// </summary>
        [HttpPost("signup")]
        public async Task<ActionResult<SignupResponse>> Signup([FromBody] SignupRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Username))
            {
                return BadRequest("Username is required.");
            }

            try
            {
                var response = await _authService.SignupAsync(request.Username.Trim());
                return Ok(response);
            }
            catch (Microsoft.EntityFrameworkCore.DbUpdateException)
            {
                return Conflict("Username already exists.");
            }
        }

        /// <summary>
        /// Authenticates a user with username and TOTP code.
        /// </summary>
        [HttpPost("login")]
        public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.TotpCode))
            {
                return BadRequest("Username and TOTP code are required.");
            }

            var response = await _authService.LoginAsync(request.Username.Trim(), request.TotpCode.Trim());
            if (response == null)
            {
                return Unauthorized("Invalid username or TOTP code.");
            }

            return Ok(response);
        }

        /// <summary>
        /// Deletes the authenticated user and all their items.
        /// </summary>
        [HttpDelete("user")]
        [Authorize]
        public async Task<IActionResult> DeleteUser()
        {
            var userIdClaim = User.FindFirst("userId")?.Value;
            if (userIdClaim == null || !int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized();
            }

            var deleted = await _authService.DeleteUserAsync(userId);
            if (!deleted)
            {
                return NotFound();
            }

            return NoContent();
        }
    }
}
