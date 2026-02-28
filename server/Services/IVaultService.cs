using System.Collections.Generic;
using System.Threading.Tasks;
using CollectorsVault.Server.Contracts;
using CollectorsVault.Server.Models;

namespace CollectorsVault.Server.Services
{
    public interface IVaultService
    {
        Task<IEnumerable<VaultItemResponse>> GetVaultItemsAsync();
        Task<VaultItem> AddVaultItemAsync(VaultItem item);
        Task<Book> AddBookAsync(BookRequest request);
        Task<Movie> AddMovieAsync(MovieRequest request);
        Task<Game> AddGameAsync(GameRequest request);
        Task<bool> DeleteVaultItemAsync(int id);
    }
}
