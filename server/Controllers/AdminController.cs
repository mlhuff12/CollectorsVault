using System.Collections.Generic;
using System.Threading.Tasks;
using CollectorsVault.Server.Contracts;
using CollectorsVault.Server.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CollectorsVault.Server.Controllers
{
    /// <summary>
    /// Admin-only endpoints for user management.
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class AdminController : ControllerBase
    {
        private readonly IAdminService _adminService;
        private readonly IUserService _userService;

        public AdminController(IAdminService adminService, IUserService userService)
        {
            _adminService = adminService;
            _userService = userService;
        }

        /// <summary>
        /// Gets all users with their vault item counts. Admin only.
        /// </summary>
        /// <returns>List of all users with book, movie, and game counts.</returns>
        /// <response code="200">Returns the list of all users.</response>
        /// <response code="401">User is not authenticated.</response>
        /// <response code="403">User is not an admin.</response>
        [HttpGet("users")]
        [ProducesResponseType(typeof(IEnumerable<AdminUserResponse>), 200)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        public async Task<ActionResult<IEnumerable<AdminUserResponse>>> GetAllUsers()
        {
            if (!_userService.GetCurrentUserIsAdmin())
            {
                return Forbid();
            }

            var users = await _adminService.GetAllUsersAsync();
            return Ok(users);
        }

        /// <summary>
        /// Deletes a user account and all their vault items. Admin only.
        /// </summary>
        /// <param name="userId">The ID of the user to delete.</param>
        /// <returns>No content on success.</returns>
        /// <response code="204">User and all associated items deleted successfully.</response>
        /// <response code="401">User is not authenticated.</response>
        /// <response code="403">User is not an admin, or admin attempted to delete themselves.</response>
        /// <response code="404">User not found.</response>
        [HttpDelete("user/{userId:long}")]
        [ProducesResponseType(204)]
        [ProducesResponseType(401)]
        [ProducesResponseType(403)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> DeleteUser(long userId)
        {
            if (!_userService.GetCurrentUserIsAdmin())
            {
                return Forbid();
            }

            if (userId == _userService.GetCurrentUserId())
            {
                return Forbid();
            }

            var deleted = await _adminService.DeleteUserAsync(userId);
            if (!deleted)
            {
                return NotFound();
            }

            return NoContent();
        }
    }
}
