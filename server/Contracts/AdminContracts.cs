namespace CollectorsVault.Server.Contracts
{
    /// <summary>
    /// Response returned for a user entry in the admin user list.
    /// </summary>
    public class AdminUserResponse
    {
        /// <summary>The user's unique identifier.</summary>
        public long Id { get; set; }

        /// <summary>The user's username.</summary>
        public string Username { get; set; } = string.Empty;

        /// <summary>Whether the user has admin privileges.</summary>
        public bool IsAdmin { get; set; }

        /// <summary>Number of books in the user's vault.</summary>
        public int BookCount { get; set; }

        /// <summary>Number of movies in the user's vault.</summary>
        public int MovieCount { get; set; }

        /// <summary>Number of games in the user's vault.</summary>
        public int GameCount { get; set; }
    }
}
