using System.Collections.Generic;
using System.Threading.Tasks;
using CollectorsVault.Server.Contracts;

namespace CollectorsVault.Server.Services
{
    /// <summary>
    /// Provides movie metadata lookups from an external source.
    /// </summary>
    public interface IMovieLookupService
    {
        /// <summary>
        /// Looks up a movie by UPC barcode.
        /// </summary>
        /// <param name="upc">UPC-A or EAN-13 barcode string.</param>
        /// <returns>Movie metadata, or <c>null</c> if not found.</returns>
        Task<MovieLookupResult?> LookupByUpcAsync(string upc);

        /// <summary>
        /// Searches for movies by title.
        /// </summary>
        /// <param name="title">Partial or full movie title.</param>
        /// <returns>Zero or more matching movie records.</returns>
        Task<IEnumerable<MovieLookupResult>> SearchByTitleAsync(string title);
    }
}
