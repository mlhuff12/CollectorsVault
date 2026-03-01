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
    }

    public class MovieRequest
    {
        public string Title { get; set; } = string.Empty;
        public string Director { get; set; } = string.Empty;
        public int ReleaseYear { get; set; }
        public string Genre { get; set; } = string.Empty;
    }

    public class GameRequest
    {
        public string Title { get; set; } = string.Empty;
        public string Platform { get; set; } = string.Empty;
        public string ReleaseDate { get; set; } = string.Empty;
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
