using System.Collections.Generic;
using System.Threading.Tasks;
using CollectorsVault.Server.Contracts;
using CollectorsVault.Server.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CollectorsVault.Server.Controllers
{
    /// <summary>
    /// Read-only endpoints for looking up movie metadata from an external source (OMDb).
    /// Results are returned directly and are not persisted to the database.
    /// </summary>
    [Route("api/movielookup")]
    [ApiController]
    [Authorize]
    public class MovieLookupController : ControllerBase
    {
        private readonly IMovieLookupService _lookupService;

        public MovieLookupController(IMovieLookupService lookupService)
        {
            _lookupService = lookupService;
        }

        /// <summary>
        /// Returns metadata for a single movie identified by UPC barcode.
        /// </summary>
        /// <param name="upc">UPC-A or EAN-13 barcode value.</param>
        /// <returns>Movie metadata, or 404 if not found.</returns>
        /// <response code="200">Movie found and metadata returned.</response>
        /// <response code="401">User is not authenticated.</response>
        /// <response code="404">No movie found for the given UPC.</response>
        [HttpGet("upc/{upc}")]
        [ProducesResponseType(typeof(MovieLookupResult), 200)]
        [ProducesResponseType(401)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<MovieLookupResult>> GetByUpc(string upc)
        {
            var result = await _lookupService.LookupByUpcAsync(upc);
            if (result == null)
            {
                return NotFound();
            }

            return Ok(result);
        }

        /// <summary>
        /// Returns movies whose title matches the provided query.
        /// </summary>
        /// <param name="title">Partial or full movie title.</param>
        /// <returns>Zero or more matching movie records.</returns>
        /// <response code="200">Search completed; result may be empty.</response>
        /// <response code="401">User is not authenticated.</response>
        [HttpGet("title/{title}")]
        [ProducesResponseType(typeof(IEnumerable<MovieLookupResult>), 200)]
        [ProducesResponseType(401)]
        public async Task<ActionResult<IEnumerable<MovieLookupResult>>> SearchByTitle(string title)
        {
            var results = await _lookupService.SearchByTitleAsync(title);
            return Ok(results);
        }
    }
}
