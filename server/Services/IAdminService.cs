using System.Collections.Generic;
using System.Threading.Tasks;
using CollectorsVault.Server.Contracts;

namespace CollectorsVault.Server.Services
{
    /// <summary>
    /// Provides admin-only operations: listing all users and deleting a user by ID.
    /// </summary>
    public interface IAdminService
    {
        /// <summary>
        /// Returns all users with their vault item counts.
        /// </summary>
        Task<IEnumerable<AdminUserResponse>> GetAllUsersAsync();

        /// <summary>
        /// Deletes a user and all their vault items.
        /// </summary>
        /// <param name="userId">The ID of the user to delete.</param>
        /// <returns><c>true</c> if the user was found and deleted; <c>false</c> if not found.</returns>
        Task<bool> DeleteUserAsync(long userId);
    }
}
