namespace CollectorsVault.Server.Models
{
    public class Game : VaultItem
    {
        public string Platform { get; set; } = string.Empty;
        public string Genre { get; set; } = string.Empty;
        public int ReleaseYear { get; set; }
    }
}