using System.Threading.Tasks;
using CollectorsVault.Server.Contracts;

namespace CollectorsVault.Server.Services
{
    /// <summary>
    /// Provides authentication operations: signup, login, and account deletion.
    /// </summary>
    public interface IAuthService
    {
        /// <summary>
        /// Creates a new user account and returns the TOTP configuration.
        /// </summary>
        /// <param name="username">The desired username (must be unique).</param>
        /// <returns>A <see cref="SignupResponse"/> containing the TOTP URI and secret.</returns>
        /// <exception cref="Microsoft.EntityFrameworkCore.DbUpdateException">
        /// Thrown when the username is already taken.
        /// </exception>
        Task<SignupResponse> SignupAsync(string username);

        /// <summary>
        /// Authenticates a user by verifying their TOTP code and returns a JWT token.
        /// </summary>
        /// <param name="username">The user's registered username.</param>
        /// <param name="totpCode">The current 6-digit TOTP code from the user's authenticator app.</param>
        /// <returns>
        /// A <see cref="LoginResponse"/> with a JWT token, or <c>null</c> if credentials are invalid.
        /// </returns>
        Task<LoginResponse?> LoginAsync(string username, string totpCode);

        /// <summary>
        /// Deletes a user account and cascade-deletes all their vault items.
        /// </summary>
        /// <param name="userId">The ID of the user to delete.</param>
        /// <returns><c>true</c> if the user was found and deleted; <c>false</c> otherwise.</returns>
        Task<bool> DeleteUserAsync(long userId);
    }
}
