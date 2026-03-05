using System.Collections.Generic;
using System.Threading.Tasks;
using CollectorsVault.Server.Contracts;
using CollectorsVault.Server.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CollectorsVault.Server.Controllers
{
    /// <summary>
    /// Read-only endpoints for looking up book metadata from an external source.
    /// Results are returned directly and are not persisted to the database.
    /// </summary>
    [Route("api/booklookup")]
    [ApiController]
    [Authorize]
    public class BookLookupController : ControllerBase
    {
        private readonly IBookLookupService _lookupService;

        public BookLookupController(IBookLookupService lookupService)
        {
            _lookupService = lookupService;
        }

        /// <summary>
        /// Returns metadata for a single book identified by ISBN.
        /// </summary>
        /// <param name="isbn">ISBN-10 or ISBN-13 (hyphens allowed).</param>
        /// <returns>Book metadata, or 404 if not found.</returns>
        /// <response code="200">Book found and metadata returned.</response>
        /// <response code="401">User is not authenticated.</response>
        /// <response code="404">No book found for the given ISBN.</response>
        [HttpGet("isbn/{isbn}")]
        [ProducesResponseType(typeof(BookLookupResult), 200)]
        [ProducesResponseType(401)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<BookLookupResult>> GetByIsbn(string isbn)
        {
            var result = await _lookupService.LookupByIsbnAsync(isbn);
            if (result == null)
            {
                return NotFound();
            }

            return Ok(result);
        }

        /// <summary>
        /// Returns books whose title matches the provided query.
        /// </summary>
        /// <param name="title">Partial or full book title.</param>
        /// <returns>Zero or more matching book records.</returns>
        /// <response code="200">Search completed; result may be empty.</response>
        /// <response code="401">User is not authenticated.</response>
        [HttpGet("title/{title}")]
        [ProducesResponseType(typeof(IEnumerable<BookLookupResult>), 200)]
        [ProducesResponseType(401)]
        public async Task<ActionResult<IEnumerable<BookLookupResult>>> SearchByTitle(string title)
        {
            var results = await _lookupService.SearchByTitleAsync(title);
            return Ok(results);
        }

        /// <summary>
        /// Returns books by the specified author.
        /// </summary>
        /// <param name="author">Partial or full author name.</param>
        /// <returns>Zero or more matching book records.</returns>
        /// <response code="200">Search completed; result may be empty.</response>
        /// <response code="401">User is not authenticated.</response>
        [HttpGet("author/{author}")]
        [ProducesResponseType(typeof(IEnumerable<BookLookupResult>), 200)]
        [ProducesResponseType(401)]
        public async Task<ActionResult<IEnumerable<BookLookupResult>>> SearchByAuthor(string author)
        {
            var results = await _lookupService.SearchByAuthorAsync(author);
            return Ok(results);
        }
    }
}
