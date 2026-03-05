using System.Collections.Generic;
using System.Threading.Tasks;
using CollectorsVault.Server.Contracts;
using CollectorsVault.Server.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CollectorsVault.Server.Controllers
{
    /// <summary>
    /// Read-only endpoints for looking up game metadata from an external source (IGDB).
    /// Results are returned directly and are not persisted to the database.
    /// </summary>
    [Route("api/gamelookup")]
    [ApiController]
    [Authorize]
    public class GameLookupController : ControllerBase
    {
        private readonly IGameLookupService _lookupService;

        public GameLookupController(IGameLookupService lookupService)
        {
            _lookupService = lookupService;
        }

        /// <summary>
        /// Returns metadata for a single game identified by UPC barcode.
        /// </summary>
        /// <param name="upc">UPC-A or EAN-13 barcode value.</param>
        /// <returns>Game metadata, or 404 if not found.</returns>
        /// <response code="200">Game found and metadata returned.</response>
        /// <response code="401">User is not authenticated.</response>
        /// <response code="404">No game found for the given UPC.</response>
        [HttpGet("upc/{upc}")]
        [ProducesResponseType(typeof(GameLookupResult), 200)]
        [ProducesResponseType(401)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<GameLookupResult>> GetByUpc(string upc)
        {
            var result = await _lookupService.LookupByUpcAsync(upc);
            if (result == null)
            {
                return NotFound();
            }

            return Ok(result);
        }

        /// <summary>
        /// Returns games whose title matches the provided query.
        /// </summary>
        /// <param name="title">Partial or full game title.</param>
        /// <returns>Zero or more matching game records.</returns>
        /// <response code="200">Search completed; result may be empty.</response>
        /// <response code="401">User is not authenticated.</response>
        [HttpGet("title/{title}")]
        [ProducesResponseType(typeof(IEnumerable<GameLookupResult>), 200)]
        [ProducesResponseType(401)]
        public async Task<ActionResult<IEnumerable<GameLookupResult>>> SearchByTitle(string title)
        {
            var results = await _lookupService.SearchByTitleAsync(title);
            return Ok(results);
        }
    }
}
