namespace CollectorsVault.Server.Contracts
{
    /// <summary>
    /// A movie record returned from an external movie lookup service.
    /// </summary>
    public class MovieLookupResult
    {
        /// <summary>Movie title.</summary>
        public string Title { get; set; } = string.Empty;

        /// <summary>Director name(s).</summary>
        public string Director { get; set; } = string.Empty;

        /// <summary>Release year.</summary>
        public int ReleaseYear { get; set; }

        /// <summary>Comma-separated genre(s).</summary>
        public string Genre { get; set; } = string.Empty;

        /// <summary>Short plot description.</summary>
        public string Description { get; set; } = string.Empty;

        /// <summary>URL to the poster/cover image.</summary>
        public string CoverUrl { get; set; } = string.Empty;

        /// <summary>Content rating (e.g. PG-13, R).</summary>
        public string Rating { get; set; } = string.Empty;

        /// <summary>Runtime string (e.g. "148 min").</summary>
        public string Runtime { get; set; } = string.Empty;

        /// <summary>Comma-separated main cast members.</summary>
        public string Cast { get; set; } = string.Empty;

        /// <summary>IMDb ID, if available.</summary>
        public string ImdbId { get; set; } = string.Empty;
    }
}
