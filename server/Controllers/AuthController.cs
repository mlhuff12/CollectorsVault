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
        private readonly IUserService _userService;

        public AuthController(IAuthService authService, IUserService userService)
        {
            _authService = authService;
            _userService = userService;
        }

        /// <summary>
        /// Creates a new user account and returns TOTP setup URI and secret.
        /// </summary>
        /// <param name="request">Signup request containing the desired username.</param>
        /// <returns>TOTP URI and secret for configuring an authenticator app.</returns>
        /// <response code="200">Account created. Returns TOTP URI and secret.</response>
        /// <response code="400">Username is missing or empty.</response>
        /// <response code="409">Username is already taken.</response>
        [HttpPost("signup")]
        [ProducesResponseType(typeof(SignupResponse), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(409)]
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
        /// Authenticates a user with their username and current TOTP code.
        /// </summary>
        /// <param name="request">Login request containing username and 6-digit TOTP code.</param>
        /// <returns>JWT bearer token and username on success.</returns>
        /// <response code="200">Authentication successful. Returns JWT token.</response>
        /// <response code="400">Username or TOTP code is missing.</response>
        /// <response code="401">Invalid username or TOTP code.</response>
        [HttpPost("login")]
        [ProducesResponseType(typeof(LoginResponse), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
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
        /// Deletes the authenticated user and all their associated vault items.
        /// </summary>
        /// <returns>No content on success.</returns>
        /// <response code="204">User and all associated items deleted successfully.</response>
        /// <response code="401">User is not authenticated.</response>
        /// <response code="404">User not found.</response>
        [HttpDelete("user")]
        [Authorize]
        [ProducesResponseType(204)]
        [ProducesResponseType(401)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> DeleteUser()
        {
            var deleted = await _authService.DeleteUserAsync(_userService.GetCurrentUserId());
            if (!deleted)
            {
                return NotFound();
            }

            return NoContent();
        }
    }
}
