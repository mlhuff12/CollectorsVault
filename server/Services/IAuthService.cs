using System.Threading.Tasks;
using CollectorsVault.Server.Contracts;

namespace CollectorsVault.Server.Services
{
    public interface IAuthService
    {
        Task<SignupResponse> SignupAsync(string username);
        Task<LoginResponse?> LoginAsync(string username, string totpCode);
        Task<bool> DeleteUserAsync(int userId);
    }
}
