using System.Collections.Generic;
using System.Threading.Tasks;
using CollectorsVault.Server.Contracts;

namespace CollectorsVault.Server.Services
{
    /// <summary>
    /// Provides external book metadata lookups by ISBN, title, or author.
    /// Implement this interface to swap in a different book data provider with minimal effort.
    /// </summary>
    public interface IBookLookupService
    {
        /// <summary>
        /// Looks up a single book by its ISBN using the richest available data
        /// (including cover images).
        /// </summary>
        /// <param name="isbn">ISBN-10 or ISBN-13 string.</param>
        /// <returns>A <see cref="BookLookupResult"/> or <c>null</c> if not found.</returns>
        Task<BookLookupResult?> LookupByIsbnAsync(string isbn);

        /// <summary>
        /// Searches for books matching the given title.
        /// </summary>
        /// <param name="title">Partial or full book title.</param>
        /// <returns>Zero or more matching <see cref="BookLookupResult"/> records.</returns>
        Task<IEnumerable<BookLookupResult>> SearchByTitleAsync(string title);

        /// <summary>
        /// Searches for books by the given author name.
        /// </summary>
        /// <param name="author">Partial or full author name.</param>
        /// <returns>Zero or more matching <see cref="BookLookupResult"/> records.</returns>
        Task<IEnumerable<BookLookupResult>> SearchByAuthorAsync(string author);
    }
}
