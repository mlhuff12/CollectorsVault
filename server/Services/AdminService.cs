using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CollectorsVault.Server.Contracts;
using CollectorsVault.Server.Data;
using Microsoft.EntityFrameworkCore;

namespace CollectorsVault.Server.Services
{
    /// <inheritdoc />
    public class AdminService : IAdminService
    {
        private readonly VaultDbContext _context;

        public AdminService(VaultDbContext context)
        {
            _context = context;
        }

        /// <inheritdoc />
        public async Task<IEnumerable<AdminUserResponse>> GetAllUsersAsync()
        {
            var users = await _context.Users.ToListAsync();

            var bookCounts = await _context.Books
                .GroupBy(b => b.UserId)
                .Select(g => new { UserId = g.Key, Count = g.Count() })
                .ToListAsync();

            var movieCounts = await _context.Movies
                .GroupBy(m => m.UserId)
                .Select(g => new { UserId = g.Key, Count = g.Count() })
                .ToListAsync();

            var gameCounts = await _context.Games
                .GroupBy(g => g.UserId)
                .Select(g => new { UserId = g.Key, Count = g.Count() })
                .ToListAsync();

            var bookCountDict = bookCounts.ToDictionary(x => x.UserId, x => x.Count);
            var movieCountDict = movieCounts.ToDictionary(x => x.UserId, x => x.Count);
            var gameCountDict = gameCounts.ToDictionary(x => x.UserId, x => x.Count);

            return users.Select(u => new AdminUserResponse
            {
                Id = u.Id,
                Username = u.Username,
                IsAdmin = u.AdminInd,
                BookCount = bookCountDict.TryGetValue(u.Id, out var bc) ? bc : 0,
                MovieCount = movieCountDict.TryGetValue(u.Id, out var mc) ? mc : 0,
                GameCount = gameCountDict.TryGetValue(u.Id, out var gc) ? gc : 0
            });
        }

        /// <inheritdoc />
        public async Task<bool> DeleteUserAsync(long userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return false;
            }

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
