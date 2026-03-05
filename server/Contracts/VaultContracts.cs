using System;
using System.Collections.Generic;

namespace CollectorsVault.Server.Contracts
{
    public class BookRequest
    {
        public string Title { get; set; } = string.Empty;
        public List<string> Authors { get; set; } = new List<string>();
        public string? ISBN { get; set; }
        public int? Year { get; set; }
        public string? Genre { get; set; }
        public string? Publisher { get; set; }
        /// <summary>
        /// Publish date string as sent by the client or returned from the lookup provider
        /// (e.g. "September 21, 1937", "1997", "October 1, 1996").
        /// The server parses this to a UTC DateTime when storing the book.
        /// </summary>
        public string? PublishDate { get; set; }
        public int? PageCount { get; set; }
        public string? Description { get; set; }
        public List<string>? Subjects { get; set; }
        public string? CoverSmall { get; set; }
        public string? CoverMedium { get; set; }
        public string? CoverLarge { get; set; }
        public string? BookUrl { get; set; }
        /// <summary>
        /// Book format as a string (e.g. "Paperback", "Hardcover", "EBook").
        /// The server maps this to the <see cref="Models.BookFormat"/> enum.
        /// </summary>
        public string? BookFormat { get; set; }
        /// <summary>Indicates whether this copy needs to be replaced.</summary>
        public bool NeedsReplacement { get; set; }
        /// <summary>Name of the series this book belongs to, if any.</summary>
        public string? SeriesName { get; set; }
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
