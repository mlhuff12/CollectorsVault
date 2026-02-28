using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using CollectorsVault.Server.Contracts;
using CollectorsVault.Server.Data;
using CollectorsVault.Server.Models;
using CollectorsVault.Server.Utilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace CollectorsVault.Server.Services
{
    public class AuthService : IAuthService
    {
        private readonly VaultDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthService(VaultDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        public async Task<SignupResponse> SignupAsync(string username)
        {
            var exists = await _context.Users.AnyAsync(u => u.Username == username);
            if (exists)
            {
                throw new Microsoft.EntityFrameworkCore.DbUpdateException("Username already exists.", new Exception("UNIQUE constraint failed"));
            }

            var base32Secret = TotpHelper.GenerateSecret();

            var user = new User
            {
                Username = username,
                TotpSecret = base32Secret,
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var issuer = "CollectorsVault";
            var totpUri = $"otpauth://totp/{Uri.EscapeDataString(issuer)}:{Uri.EscapeDataString(username)}?secret={base32Secret}&issuer={Uri.EscapeDataString(issuer)}&algorithm=SHA1&digits=6&period=30";

            return new SignupResponse
            {
                Username = username,
                TotpUri = totpUri,
                TotpSecret = base32Secret
            };
        }

        public async Task<LoginResponse?> LoginAsync(string username, string totpCode)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (user == null)
            {
                return null;
            }

            if (!TotpHelper.VerifyTotp(user.TotpSecret, totpCode))
            {
                return null;
            }

            var token = GenerateJwtToken(user);
            return new LoginResponse
            {
                Token = token,
                Username = user.Username
            };
        }

        public async Task<bool> DeleteUserAsync(int userId)
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

        private string GenerateJwtToken(User user)
        {
            var jwtKey = _configuration["Jwt:Key"] ?? "CollectorsVaultSuperSecretKeyForJWT2024!!";
            var jwtIssuer = _configuration["Jwt:Issuer"] ?? "CollectorsVault";

            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.UniqueName, user.Username),
                new Claim("userId", user.Id.ToString())
            };

            var token = new JwtSecurityToken(
                issuer: jwtIssuer,
                audience: jwtIssuer,
                claims: claims,
                expires: DateTime.UtcNow.AddDays(7),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
