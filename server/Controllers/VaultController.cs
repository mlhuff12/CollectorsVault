using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;
using CollectorsVault.Server.Contracts;
using CollectorsVault.Server.Models;
using CollectorsVault.Server.Services;

namespace CollectorsVault.Server.Controllers
{
    /// <summary>
    /// API endpoints for managing vault items.
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class VaultController : ControllerBase
    {
        private readonly IVaultService _vaultService;
        private readonly IUserService _userService;

        public VaultController(IVaultService vaultService, IUserService userService)
        {
            _vaultService = vaultService;
            _userService = userService;
        }

        /// <summary>
        /// Gets all vault items for the authenticated user.
        /// </summary>
        /// <returns>Collection of vault items.</returns>
        /// <response code="200">Returns the collection of vault items.</response>
        /// <response code="401">User is not authenticated.</response>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<VaultItemResponse>), 200)]
        [ProducesResponseType(401)]
        public async Task<ActionResult<IEnumerable<VaultItemResponse>>> GetVaultItems()
        {
            var items = await _vaultService.GetVaultItemsAsync(_userService.GetCurrentUserId());
            return Ok(items);
        }

        /// <summary>
        /// Adds a book entry.
        /// </summary>
        /// <param name="request">Book payload.</param>
        /// <returns>Created book.</returns>
        /// <response code="201">Book created successfully.</response>
        /// <response code="401">User is not authenticated.</response>
        [HttpPost("books")]
        [ProducesResponseType(typeof(Book), 201)]
        [ProducesResponseType(401)]
        public async Task<ActionResult<Book>> AddBook(BookRequest request)
        {
            var book = await _vaultService.AddBookAsync(request, _userService.GetCurrentUserId());
            return CreatedAtAction(nameof(GetVaultItems), new { id = book.Id }, book);
        }

        /// <summary>
        /// Adds a movie entry.
        /// </summary>
        /// <param name="request">Movie payload.</param>
        /// <returns>Created movie.</returns>
        /// <response code="201">Movie created successfully.</response>
        /// <response code="401">User is not authenticated.</response>
        [HttpPost("movies")]
        [ProducesResponseType(typeof(Movie), 201)]
        [ProducesResponseType(401)]
        public async Task<ActionResult<Movie>> AddMovie(MovieRequest request)
        {
            var movie = await _vaultService.AddMovieAsync(request, _userService.GetCurrentUserId());
            return CreatedAtAction(nameof(GetVaultItems), new { id = movie.Id }, movie);
        }

        /// <summary>
        /// Adds a game entry.
        /// </summary>
        /// <param name="request">Game payload.</param>
        /// <returns>Created game.</returns>
        /// <response code="201">Game created successfully.</response>
        /// <response code="401">User is not authenticated.</response>
        [HttpPost("games")]
        [ProducesResponseType(typeof(Game), 201)]
        [ProducesResponseType(401)]
        public async Task<ActionResult<Game>> AddGame(GameRequest request)
        {
            var game = await _vaultService.AddGameAsync(request, _userService.GetCurrentUserId());
            return CreatedAtAction(nameof(GetVaultItems), new { id = game.Id }, game);
        }

        /// <summary>
        /// Deletes a vault item by identifier. Only deletes items owned by the authenticated user.
        /// </summary>
        /// <param name="id">Item identifier.</param>
        /// <returns>No content on success, or not found if item does not exist or is not owned by user.</returns>
        /// <response code="204">Item deleted successfully.</response>
        /// <response code="401">User is not authenticated.</response>
        /// <response code="404">Item not found or not owned by the authenticated user.</response>
        [HttpDelete("{id:long}")]
        [ProducesResponseType(204)]
        [ProducesResponseType(401)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> DeleteVaultItem(long id)
        {
            var deleted = await _vaultService.DeleteVaultItemAsync(id, _userService.GetCurrentUserId());
            if (!deleted)
            {
                return NotFound();
            }
            return NoContent();
        }
    }
}