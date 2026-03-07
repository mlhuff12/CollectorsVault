using System.Collections.Generic;

namespace CollectorsVault.Server.Models
{
    public class Book : VaultItem
    {
        /// <summary>List of author names.</summary>
        public List<string> Authors { get; set; } = new List<string>();
        public string? ISBN { get; set; }
        public string? Publisher { get; set; }
        /// <summary>Publish date text as returned/provided (e.g. "September 21, 1937", "1997").</summary>
        public string? PublishDateString { get; set; }
        public int? PageCount { get; set; }
        public string? CoverSmall { get; set; }
        public string? CoverMedium { get; set; }
        public string? CoverLarge { get; set; }
        public string? BookUrl { get; set; }
        /// <summary>Subject / genre tags from the lookup provider.</summary>
        public List<string>? Subjects { get; set; }
        /// <summary>Physical or digital format of the book.</summary>
        public BookFormat? BookFormat { get; set; }
        /// <summary>Indicates whether this copy needs to be replaced.</summary>
        public bool NeedsReplacement { get; set; }
        /// <summary>Name of the series this book belongs to, if any.</summary>
        public string? SeriesName { get; set; }
        /// <summary>Position of this book within its series, if known.</summary>
        public int? SeriesNumber { get; set; }
    }
}