using System;
using System.Collections.Generic;

namespace CollectorsVault.Server.Contracts
{
    public class BookRequest
    {
        public string Title { get; set; } = string.Empty;
        public List<string> Authors { get; set; } = new List<string>();
        public string ISBN { get; set; } = string.Empty;
        public int? Year { get; set; }
        public string Genre { get; set; } = string.Empty;
        public string Publisher { get; set; } = string.Empty;
        public string PublishDate { get; set; } = string.Empty;
        public int? PageCount { get; set; }
        public string Description { get; set; } = string.Empty;
        public List<string> Subjects { get; set; } = new List<string>();
        public string CoverSmall { get; set; } = string.Empty;
        public string CoverMedium { get; set; } = string.Empty;
        public string CoverLarge { get; set; } = string.Empty;
        public string BookUrl { get; set; } = string.Empty;
        /// <summary>Physical or digital format of the book (e.g. Hardcover, Paperback, eBook).</summary>
        public string BookFormat { get; set; } = string.Empty;
        /// <summary>Indicates whether this copy needs to be replaced.</summary>
        public bool NeedsReplacement { get; set; }
        /// <summary>Name of the series this book belongs to, if any.</summary>
        public string SeriesName { get; set; } = string.Empty;
        /// <summary>Position of this book within its series, if known.</summary>
        public int? SeriesNumber { get; set; }
    }

    public class MovieRequest
    {
        public string Title { get; set; } = string.Empty;
        public string Director { get; set; } = string.Empty;
        public int ReleaseYear { get; set; }
        public string Genre { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string CoverUrl { get; set; } = string.Empty;
        public string Rating { get; set; } = string.Empty;
        public string Runtime { get; set; } = string.Empty;
        public string Cast { get; set; } = string.Empty;
    }

    public class GameRequest
    {
        public string Title { get; set; } = string.Empty;
        public string Platform { get; set; } = string.Empty;
        public string ReleaseDate { get; set; } = string.Empty;
        public string Genre { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string CoverUrl { get; set; } = string.Empty;
        public string Developer { get; set; } = string.Empty;
        public string Publisher { get; set; } = string.Empty;
    }

    public class VaultItemResponse
    {
        public long Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public DateTime CreatedUtcDate { get; set; }
        public string Category { get; set; } = string.Empty;
    }
}
