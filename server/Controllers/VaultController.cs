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
    public class VaultController : ControllerBase
    {
        private readonly IVaultService _vaultService;

        public VaultController(IVaultService vaultService)
        {
            _vaultService = vaultService;
        }

        /// <summary>
        /// Gets all vault items across all categories.
        /// </summary>
        /// <returns>Collection of vault items.</returns>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<VaultItemResponse>>> GetVaultItems()
        {
            var items = await _vaultService.GetVaultItemsAsync();
            return Ok(items);
        }

        /// <summary>
        /// Adds a generic vault item.
        /// </summary>
        /// <param name="item">Vault item payload.</param>
        /// <returns>Created vault item.</returns>
        [HttpPost]
        public async Task<ActionResult<VaultItem>> AddVaultItem(VaultItem item)
        {
            var createdItem = await _vaultService.AddVaultItemAsync(item);

            return CreatedAtAction(nameof(GetVaultItems), new { id = createdItem.Id }, createdItem);
        }

        /// <summary>
        /// Adds a book entry.
        /// </summary>
        /// <param name="request">Book payload.</param>
        /// <returns>Created book.</returns>
        [HttpPost("books")]
        public async Task<ActionResult<Book>> AddBook(BookRequest request)
        {
            var book = await _vaultService.AddBookAsync(request);

            return CreatedAtAction(nameof(GetVaultItems), new { id = book.Id }, book);
        }

        /// <summary>
        /// Adds a movie entry.
        /// </summary>
        /// <param name="request">Movie payload.</param>
        /// <returns>Created movie.</returns>
        [HttpPost("movies")]
        public async Task<ActionResult<Movie>> AddMovie(MovieRequest request)
        {
            var movie = await _vaultService.AddMovieAsync(request);

            return CreatedAtAction(nameof(GetVaultItems), new { id = movie.Id }, movie);
        }

        /// <summary>
        /// Adds a game entry.
        /// </summary>
        /// <param name="request">Game payload.</param>
        /// <returns>Created game.</returns>
        [HttpPost("games")]
        public async Task<ActionResult<Game>> AddGame(GameRequest request)
        {
            var game = await _vaultService.AddGameAsync(request);

            return CreatedAtAction(nameof(GetVaultItems), new { id = game.Id }, game);
        }

        /// <summary>
        /// Deletes a vault item by identifier.
        /// </summary>
        /// <param name="id">Item identifier.</param>
        /// <returns>No content on success, or not found if item does not exist.</returns>
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteVaultItem(int id)
        {
            var deleted = await _vaultService.DeleteVaultItemAsync(id);
            if (!deleted)
            {
                return NotFound();
            }

            return NoContent();
        }
    }
}