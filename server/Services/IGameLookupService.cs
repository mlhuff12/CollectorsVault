using System.Collections.Generic;
using System.Threading.Tasks;
using CollectorsVault.Server.Contracts;

namespace CollectorsVault.Server.Services
{
    /// <summary>
    /// Provides game metadata lookups from an external source.
    /// </summary>
    public interface IGameLookupService
    {
        /// <summary>
        /// Looks up a game by UPC barcode.
        /// </summary>
        /// <param name="upc">UPC-A or EAN-13 barcode string.</param>
        /// <returns>Game metadata, or <c>null</c> if not found.</returns>
        Task<GameLookupResult?> LookupByUpcAsync(string upc);

        /// <summary>
        /// Searches for games by title.
        /// </summary>
        /// <param name="title">Partial or full game title.</param>
        /// <returns>Zero or more matching game records.</returns>
        Task<IEnumerable<GameLookupResult>> SearchByTitleAsync(string title);
    }
}
