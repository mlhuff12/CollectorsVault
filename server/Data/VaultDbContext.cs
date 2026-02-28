using Microsoft.EntityFrameworkCore;
using CollectorsVault.Server.Models;

namespace CollectorsVault.Server.Data
{
    public class VaultDbContext : DbContext
    {
        public VaultDbContext(DbContextOptions<VaultDbContext> options) : base(options) { }

        public DbSet<VaultItem> VaultItems { get; set; }
        public DbSet<Book> Books { get; set; }
        public DbSet<Movie> Movies { get; set; }
        public DbSet<Game> Games { get; set; }
    }
}