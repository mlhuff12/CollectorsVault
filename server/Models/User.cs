using System;
using System.Collections.Generic;

namespace CollectorsVault.Server.Models
{
    public class User
    {
        public long Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string TotpSecret { get; set; } = string.Empty;
        public DateTime CreatedUtcDate { get; set; }
        public DateTime LastModifiedUtcDate { get; set; }
        public ICollection<VaultItem> VaultItems { get; set; } = new List<VaultItem>();
    }
}
