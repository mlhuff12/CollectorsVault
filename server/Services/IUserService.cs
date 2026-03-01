namespace CollectorsVault.Server.Services
{
    /// <summary>
    /// Provides access to the currently authenticated user's identity.
    /// </summary>
    public interface IUserService
    {
        /// <summary>
        /// Returns the user ID extracted from the current JWT claims.
        /// </summary>
        /// <returns>The authenticated user's ID.</returns>
        /// <exception cref="System.UnauthorizedAccessException">
        /// Thrown when the userId claim is missing or invalid.
        /// </exception>
        long GetCurrentUserId();

        /// <summary>
        /// Returns whether the currently authenticated user has admin privileges.
        /// </summary>
        /// <returns><c>true</c> if the user is an admin; <c>false</c> otherwise.</returns>
        bool GetCurrentUserIsAdmin();
    }
}
