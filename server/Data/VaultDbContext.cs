using Microsoft.EntityFrameworkCore;
using CollectorsVault.Server.Models;

namespace CollectorsVault.Server.Data
{
    public class VaultDbContext : DbContext
    {
        public VaultDbContext(DbContextOptions<VaultDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<Book> Books { get; set; }
        public DbSet<Movie> Movies { get; set; }
        public DbSet<Game> Games { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<User>()
                .ToTable("User")
                .HasIndex(u => u.Username)
                .IsUnique();

            modelBuilder.Entity<VaultItem>()
                .UseTpcMappingStrategy()
                .HasOne(v => v.User)
                .WithMany(u => u.VaultItems)
                .HasForeignKey(v => v.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Book>().ToTable("Book");
            modelBuilder.Entity<Movie>().ToTable("Movie");
            modelBuilder.Entity<Game>().ToTable("Game");
        }
    }
}