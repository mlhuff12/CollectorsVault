using System.Collections.Generic;

namespace CollectorsVault.Server.Contracts
{
    /// <summary>
    /// A game record returned from an external game lookup service.
    /// </summary>
    public class GameLookupResult
    {
        /// <summary>Game title.</summary>
        public string Title { get; set; } = string.Empty;

        /// <summary>Platform(s) the game is available on.</summary>
        public string Platform { get; set; } = string.Empty;

        /// <summary>Release year.</summary>
        public int ReleaseYear { get; set; }

        /// <summary>Comma-separated genre(s).</summary>
        public string Genre { get; set; } = string.Empty;

        /// <summary>Short summary or description.</summary>
        public string Description { get; set; } = string.Empty;

        /// <summary>URL to the cover image.</summary>
        public string CoverUrl { get; set; } = string.Empty;

        /// <summary>Developer studio name.</summary>
        public string Developer { get; set; } = string.Empty;

        /// <summary>Publisher name.</summary>
        public string Publisher { get; set; } = string.Empty;

        /// <summary>IGDB game ID, if available.</summary>
        public long? IgdbId { get; set; }
    }
}
