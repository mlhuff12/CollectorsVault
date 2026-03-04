using System.Collections.Generic;

namespace CollectorsVault.Server.Models
{
    public class Book : VaultItem
    {
        public string Author { get; set; } = string.Empty;
        public string ISBN { get; set; } = string.Empty;
        public int PublicationYear { get; set; }
        public string Genre { get; set; } = string.Empty;
        public string Publisher { get; set; } = string.Empty;
        public string PublishDate { get; set; } = string.Empty;
        public int? PageCount { get; set; }
        public string CoverSmall { get; set; } = string.Empty;
        public string CoverMedium { get; set; } = string.Empty;
        public string CoverLarge { get; set; } = string.Empty;
        public string BookUrl { get; set; } = string.Empty;
        /// <summary>Comma-separated list of subject / genre tags from the lookup provider.</summary>
        public string Subjects { get; set; } = string.Empty;
        /// <summary>Physical or digital format of the book (e.g. Hardcover, Paperback, eBook).</summary>
        public string BookFormat { get; set; } = string.Empty;
        /// <summary>Indicates whether this copy needs to be replaced.</summary>
        public bool NeedsReplacement { get; set; }
        /// <summary>Name of the series this book belongs to, if any.</summary>
        public string SeriesName { get; set; } = string.Empty;
        /// <summary>Position of this book within its series, if known.</summary>
        public int? SeriesNumber { get; set; }
    }
}