using System;

namespace CollectorsVault.Server.Models
{
    public abstract class VaultItem
    {
        public long Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public DateTime CreatedUtcDate { get; set; }
        public DateTime LastModifiedUtcDate { get; set; }
        public long UserId { get; set; }
        public User? User { get; set; }
    }
}