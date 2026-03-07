using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Threading.Tasks;
using CollectorsVault.Server.Contracts;
using CollectorsVault.Server.Data;
using CollectorsVault.Server.Models;
using CollectorsVault.Server.Utilities;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace CollectorsVault.Api.Tests.Integration
{
    [Trait("Category", "Integration")]
    public class AdminIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly WebApplicationFactory<Program> _factory;

        public AdminIntegrationTests(WebApplicationFactory<Program> factory)
        {
            _factory = factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureServices(services =>
                {
                    var descriptor = services.SingleOrDefaultDescriptor<DbContextOptions<VaultDbContext>>();
                    if (descriptor != null)
                    {
                        services.Remove(descriptor);
                    }

                    var dbName = $"AdminTestDb_{Guid.NewGuid()}";
                    services.AddDbContext<VaultDbContext>(options =>
                        options.UseInMemoryDatabase(dbName));
                });
            });
        }

        private async Task<(HttpClient client, string token)> SignupAndLoginAsync(string username, bool makeAdmin = false)
        {
            var client = _factory.CreateClient();

            var signupResponse = await client.PostAsJsonAsync("/api/auth/signup", new { Username = username });
            signupResponse.EnsureSuccessStatusCode();
            var signupData = await signupResponse.Content.ReadFromJsonAsync<SignupResponse>();

            if (makeAdmin)
            {
                using var scope = _factory.Services.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<VaultDbContext>();
                var user = await db.Users.FirstOrDefaultAsync(u => u.Username == username);
                if (user != null)
                {
                    user.AdminInd = true;
                    await db.SaveChangesAsync();
                }
            }

            var totpCode = TotpHelper.ComputeTotp(signupData!.TotpSecret);
            var loginResponse = await client.PostAsJsonAsync("/api/auth/login", new { Username = username, TotpCode = totpCode });
            loginResponse.EnsureSuccessStatusCode();
            var loginData = await loginResponse.Content.ReadFromJsonAsync<LoginResponse>();

            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", loginData!.Token);
            return (client, loginData.Token);
        }

        [Fact]
        public async Task GetAllUsers_WhenCalled_ReturnsForbidden_ForNonAdminUser()
        {
            // Arrange
            var (client, _) = await SignupAndLoginAsync($"regular_{Guid.NewGuid():N}");

            // Act
            var response = await client.GetAsync("/api/admin/users");

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task GetAllUsers_WhenCalled_ReturnsOk_ForAdminUser()
        {
            // Arrange
            var (client, _) = await SignupAndLoginAsync($"admin_{Guid.NewGuid():N}", makeAdmin: true);

            // Act
            var response = await client.GetAsync("/api/admin/users");

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var users = await response.Content.ReadFromJsonAsync<List<AdminUserResponse>>();
            Assert.NotNull(users);
            Assert.NotEmpty(users!);
        }

        [Fact]
        public async Task GetAllUsers_WhenCalled_ReturnsCorrectItemCounts()
        {
            // Arrange
            var username = $"admin_{Guid.NewGuid():N}";
            var (client, _) = await SignupAndLoginAsync(username, makeAdmin: true);

            // Add some items
            await client.PostAsJsonAsync("/api/vault/books", new { Title = "Test Book", Authors = new[] { "Author" }, ISBN = "", PublishDateString = "2024" });
            await client.PostAsJsonAsync("/api/vault/movies", new { Title = "Test Movie", Director = "Director", ReleaseYear = 2024, Genre = "Test" });

            // Act
            var response = await client.GetAsync("/api/admin/users");
            var users = await response.Content.ReadFromJsonAsync<List<AdminUserResponse>>();

            // Assert
            Assert.NotNull(users);
            var adminUser = users!.Find(u => u.Username == username);
            Assert.NotNull(adminUser);
            Assert.Equal(1, adminUser!.BookCount);
            Assert.Equal(1, adminUser.MovieCount);
            Assert.Equal(0, adminUser.GameCount);
        }

        [Fact]
        public async Task DeleteUser_WhenCalled_ReturnsForbidden_ForNonAdminUser()
        {
            // Arrange
            var (client, _) = await SignupAndLoginAsync($"regular_{Guid.NewGuid():N}");

            // Act
            var response = await client.DeleteAsync("/api/admin/user/999");

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task DeleteUser_WhenAdminDeletesSelf_ReturnsForbidden()
        {
            // Arrange
            var adminUsername = $"admin_{Guid.NewGuid():N}";
            var (client, _) = await SignupAndLoginAsync(adminUsername, makeAdmin: true);

            // Get own user ID

            // Act
            var usersResponse = await client.GetAsync("/api/admin/users");
            var users = await usersResponse.Content.ReadFromJsonAsync<List<AdminUserResponse>>();
            var self = users!.Find(u => u.Username == adminUsername);

            // Assert
            Assert.NotNull(self);

            var response = await client.DeleteAsync($"/api/admin/user/{self!.Id}");

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task DeleteUser_WhenUserDoesNotExist_ReturnsNotFound()
        {
            // Arrange
            var (client, _) = await SignupAndLoginAsync($"admin_{Guid.NewGuid():N}", makeAdmin: true);

            // Act
            var response = await client.DeleteAsync("/api/admin/user/99999");

            // Assert
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async Task DeleteUser_WhenUserIsDeleted_ReturnsNoContent()
        {
            // Arrange
            var adminUsername = $"admin_{Guid.NewGuid():N}";
            var targetUsername = $"target_{Guid.NewGuid():N}";

            var (adminClient, _) = await SignupAndLoginAsync(adminUsername, makeAdmin: true);

            // Act
            await SignupAndLoginAsync(targetUsername);

            var usersResponse = await adminClient.GetAsync("/api/admin/users");
            var users = await usersResponse.Content.ReadFromJsonAsync<List<AdminUserResponse>>();
            var target = users!.Find(u => u.Username == targetUsername);

            // Assert
            Assert.NotNull(target);

            var deleteResponse = await adminClient.DeleteAsync($"/api/admin/user/{target!.Id}");

            Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

            // Verify user is gone
            var usersAfterResponse = await adminClient.GetAsync("/api/admin/users");
            var usersAfter = await usersAfterResponse.Content.ReadFromJsonAsync<List<AdminUserResponse>>();
            Assert.DoesNotContain(usersAfter!, u => u.Username == targetUsername);
        }

        [Fact]
        public async Task GetAllUsers_WhenCalled_RequiresAuthentication()
        {
            // Arrange
            // Act
            var client = _factory.CreateClient();
            var response = await client.GetAsync("/api/admin/users");

            // Assert
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task DeleteUser_WhenCalled_RequiresAuthentication()
        {
            // Arrange
            // Act
            var client = _factory.CreateClient();
            var response = await client.DeleteAsync("/api/admin/user/1");

            // Assert
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task Login_WhenUserIsAdmin_IncludesIsAdminInResponse()
        {
            // Arrange
            var username = $"admin_{Guid.NewGuid():N}";

            // Act
            var plainClient = _factory.CreateClient();
            var signupResponse = await plainClient.PostAsJsonAsync("/api/auth/signup", new { Username = username });
            var signupData = await signupResponse.Content.ReadFromJsonAsync<SignupResponse>();

            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<VaultDbContext>();
            var user = await db.Users.FirstOrDefaultAsync(u => u.Username == username);
            user!.AdminInd = true;
            await db.SaveChangesAsync();

            var totpCode = TotpHelper.ComputeTotp(signupData!.TotpSecret);
            var loginResponse = await plainClient.PostAsJsonAsync("/api/auth/login", new { Username = username, TotpCode = totpCode });
            var loginData = await loginResponse.Content.ReadFromJsonAsync<LoginResponse>();

            // Assert
            Assert.NotNull(loginData);
            Assert.True(loginData!.IsAdmin);
        }

        [Fact]
        public async Task Login_WhenUserIsNotAdmin_IncludesIsAdminFalse()
        {
            // Arrange
            var username = $"regular_{Guid.NewGuid():N}";

            // Act
            var plainClient = _factory.CreateClient();
            var signupResponse = await plainClient.PostAsJsonAsync("/api/auth/signup", new { Username = username });
            var signupData = await signupResponse.Content.ReadFromJsonAsync<SignupResponse>();

            var totpCode = TotpHelper.ComputeTotp(signupData!.TotpSecret);
            var loginResponse = await plainClient.PostAsJsonAsync("/api/auth/login", new { Username = username, TotpCode = totpCode });
            var loginData = await loginResponse.Content.ReadFromJsonAsync<LoginResponse>();

            // Assert
            Assert.NotNull(loginData);
            Assert.False(loginData!.IsAdmin);
        }
    }
}


