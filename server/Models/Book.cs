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
    }
}