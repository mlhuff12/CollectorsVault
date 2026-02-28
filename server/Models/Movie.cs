namespace CollectorsVault.Server.Models
{
    public class Movie : VaultItem
    {
        public string Director { get; set; } = string.Empty;
        public int ReleaseYear { get; set; }
        public string Genre { get; set; } = string.Empty;
    }
}