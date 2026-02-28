using System.Collections.Generic;
using System.Threading.Tasks;
using CollectorsVault.Server.Contracts;
using CollectorsVault.Server.Models;

namespace CollectorsVault.Server.Services
{
    public interface IVaultService
    {
        Task<IEnumerable<VaultItemResponse>> GetVaultItemsAsync(int userId);
        Task<Book> AddBookAsync(BookRequest request, int userId);
        Task<Movie> AddMovieAsync(MovieRequest request, int userId);
        Task<Game> AddGameAsync(GameRequest request, int userId);
        Task<bool> DeleteVaultItemAsync(int id, int userId);
    }
}
