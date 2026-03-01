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
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;

namespace CollectorsVault.Server.Services
{
    /// <summary>
    /// Implements authentication operations using TOTP verification and JWT token generation.
    /// </summary>
    public class AuthService : IAuthService
    {
        private readonly VaultDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AuthService> _logger;

        public AuthService(VaultDbContext context, IConfiguration configuration, ILogger<AuthService> logger)
        {
            _context = context;
            _configuration = configuration;
            _logger = logger;
        }

        /// <inheritdoc />
        public async Task<SignupResponse> SignupAsync(string username)
        {
            var exists = await _context.Users.AnyAsync(u => u.Username == username);
            if (exists)
            {
                throw new Microsoft.EntityFrameworkCore.DbUpdateException("Username already exists.", new Exception("UNIQUE constraint failed"));
            }

            var base32Secret = TotpHelper.GenerateSecret();
            var now = DateTime.UtcNow;

            var user = new User
            {
                Username = username,
                Secret = base32Secret,
                CreatedUtcDate = now,
                LastModifiedUtcDate = now
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

        /// <inheritdoc />
        public async Task<LoginResponse?> LoginAsync(string username, string totpCode)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (user == null)
            {
                return null;
            }

            if (!TotpHelper.VerifyTotp(user.Secret, totpCode))
            {
                return null;
            }

            var token = GenerateJwtToken(user);
            return new LoginResponse
            {
                Token = token,
                Username = user.Username,
                IsAdmin = user.AdminInd
            };
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

        /// <summary>
        /// Generates a signed JWT bearer token for the given user, valid for 7 days.
        /// </summary>
        private string GenerateJwtToken(User user)
        {
            var jwtKey = _configuration["Jwt:Key"];
            if (string.IsNullOrWhiteSpace(jwtKey))
            {
                jwtKey = "CollectorsVaultSuperSecretKeyForJWT2024!!";
                _logger.LogWarning("Jwt:Key is not configured. Using insecure fallback key. Set Jwt:Key via dotnet user-secrets or environment variables before deploying to production.");
            }
            var jwtIssuer = _configuration["Jwt:Issuer"] ?? "CollectorsVault";

            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.UniqueName, user.Username),
                new Claim("userId", user.Id.ToString()),
                new Claim("isAdmin", user.AdminInd.ToString().ToLower())
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
