using System;
using System.Collections.Generic;

namespace CollectorsVault.Server.Models
{
    public class User
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string TotpSecret { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public ICollection<VaultItem> VaultItems { get; set; } = new List<VaultItem>();
    }
}
