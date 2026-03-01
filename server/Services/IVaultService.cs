using System.Collections.Generic;
using System.Threading.Tasks;
using CollectorsVault.Server.Contracts;
using CollectorsVault.Server.Models;

namespace CollectorsVault.Server.Services
{
    /// <summary>
    /// Provides CRUD operations for vault items, scoped to an individual user.
    /// </summary>
    public interface IVaultService
    {
        /// <summary>
        /// Returns all vault items (books, movies, games) owned by the specified user,
        /// ordered by creation date descending.
        /// </summary>
        /// <param name="userId">The ID of the authenticated user.</param>
        Task<IEnumerable<VaultItemResponse>> GetVaultItemsAsync(long userId);

        /// <summary>
        /// Adds a new book to the vault for the specified user.
        /// </summary>
        /// <param name="request">Book details.</param>
        /// <param name="userId">The ID of the authenticated user.</param>
        /// <returns>The newly created <see cref="Book"/>.</returns>
        Task<Book> AddBookAsync(BookRequest request, long userId);

        /// <summary>
        /// Adds a new movie to the vault for the specified user.
        /// </summary>
        /// <param name="request">Movie details.</param>
        /// <param name="userId">The ID of the authenticated user.</param>
        /// <returns>The newly created <see cref="Movie"/>.</returns>
        Task<Movie> AddMovieAsync(MovieRequest request, long userId);

        /// <summary>
        /// Adds a new game to the vault for the specified user.
        /// </summary>
        /// <param name="request">Game details.</param>
        /// <param name="userId">The ID of the authenticated user.</param>
        /// <returns>The newly created <see cref="Game"/>.</returns>
        Task<Game> AddGameAsync(GameRequest request, long userId);

        /// <summary>
        /// Deletes a vault item by ID, ensuring it belongs to the specified user.
        /// </summary>
        /// <param name="id">The vault item ID.</param>
        /// <param name="userId">The ID of the authenticated user.</param>
        /// <returns><c>true</c> if the item was found and deleted; <c>false</c> otherwise.</returns>
        Task<bool> DeleteVaultItemAsync(long id, long userId);
    }
}
