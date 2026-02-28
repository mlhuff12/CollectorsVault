namespace CollectorsVault.Server.Models
{
    public class Book : VaultItem
    {
        public string Author { get; set; } = string.Empty;
        public string ISBN { get; set; } = string.Empty;
        public int PublicationYear { get; set; }
        public string Genre { get; set; } = string.Empty;
    }
}