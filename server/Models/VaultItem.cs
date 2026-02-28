using System;

namespace CollectorsVault.Server.Models
{
    public class VaultItem
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public DateTime DateAdded { get; set; }
        public int UserId { get; set; }
        public User? User { get; set; }
    }
}