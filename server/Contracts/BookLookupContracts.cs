using System.Collections.Generic;

namespace CollectorsVault.Server.Contracts
{
    /// <summary>
    /// A book record returned from an external book lookup service.
    /// </summary>
    public class BookLookupResult
    {
        /// <summary>Book title.</summary>
        public string Title { get; set; } = string.Empty;

        /// <summary>List of author names.</summary>
        public List<string> Authors { get; set; } = new List<string>();

        /// <summary>ISBN (10 or 13 digit).</summary>
        public string Isbn { get; set; } = string.Empty;

        /// <summary>Primary publisher name.</summary>
        public string Publisher { get; set; } = string.Empty;

        /// <summary>Publish date or year string as returned by the provider.</summary>
        public string PublishDate { get; set; } = string.Empty;

        /// <summary>Total page count, if available.</summary>
        public int? PageCount { get; set; }

        /// <summary>Short description or synopsis of the book.</summary>
        public string Description { get; set; } = string.Empty;

        /// <summary>Subject / genre tags.</summary>
        public List<string> Subjects { get; set; } = new List<string>();

        /// <summary>URL to the small cover image.</summary>
        public string CoverSmall { get; set; } = string.Empty;

        /// <summary>URL to the medium cover image.</summary>
        public string CoverMedium { get; set; } = string.Empty;

        /// <summary>URL to the large cover image.</summary>
        public string CoverLarge { get; set; } = string.Empty;

        /// <summary>Link to the book's page on the provider's website.</summary>
        public string ProviderUrl { get; set; } = string.Empty;

        /// <summary>Name of the series this book belongs to, if available from the lookup provider.</summary>
        public string SeriesName { get; set; } = string.Empty;

        /// <summary>Position of this book within its series, if available from the lookup provider.</summary>
        public int? SeriesNumber { get; set; }

        /// <summary>
        /// True when the book is identified as part of a series (via a collectionID subject)
        /// but the series number could not be determined. The UI should prompt the user to enter it.
        /// </summary>
        public bool SeriesNotFound { get; set; }
    }
}
