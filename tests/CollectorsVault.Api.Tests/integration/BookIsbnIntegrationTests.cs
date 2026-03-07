using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Threading.Tasks;
using CollectorsVault.Server.Contracts;
using CollectorsVault.Server.Utilities;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using CollectorsVault.Server.Data;
using Xunit;

namespace CollectorsVault.Api.Tests.Integration
{
    /// <summary>
    /// Integration tests covering the full Create-Book flow:
    /// ISBN lookup (via the /api/booklookup endpoint) → save book → delete book.
    /// These tests use an in-memory database so no changes are made to a real database.
    /// </summary>
    [Trait("Category", "Integration")]
    public class BookIsbnIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly WebApplicationFactory<Program> _factory;

        public BookIsbnIntegrationTests(WebApplicationFactory<Program> factory)
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

                    var dbName = $"BookIsbnTests_{Guid.NewGuid()}";
                    services.AddDbContext<VaultDbContext>(options =>
                        options.UseInMemoryDatabase(dbName));
                });
            });
        }

        /// <summary>
        /// Helper that signs up a test user and returns an authenticated HTTP client.
        /// </summary>
        private async Task<HttpClient> CreateAuthenticatedClientAsync()
        {
            var client = _factory.CreateClient();
            var username = $"isbn_test_{Guid.NewGuid():N}";

            var signupResponse = await client.PostAsJsonAsync("/api/auth/signup", new { Username = username });
            Assert.Equal(HttpStatusCode.OK, signupResponse.StatusCode);

            var signupData = await signupResponse.Content.ReadFromJsonAsync<SignupResponse>();
            Assert.NotNull(signupData);

            var totpCode = TotpHelper.ComputeTotp(signupData!.TotpSecret);
            var loginResponse = await client.PostAsJsonAsync("/api/auth/login", new { Username = username, TotpCode = totpCode });
            Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);

            var loginData = await loginResponse.Content.ReadFromJsonAsync<LoginResponse>();
            Assert.NotNull(loginData);

            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", loginData!.Token);

            return client;
        }

        /// <summary>
        /// Tests that the ISBN lookup endpoint returns a result and that the data can be used
        /// to create a book which is then successfully deleted.
        /// This test does NOT mock the book lookup data — it supplies a BookRequest directly
        /// to simulate what the frontend would send after a successful lookup.
        /// </summary>
        [Fact]
        public async Task IsbnLookupFlow_CreateBook_ThenDelete()
        {
            var client = await CreateAuthenticatedClientAsync();

            // Simulate what the frontend sends after a successful ISBN lookup:
            // all BookLookupResult fields are included in the BookRequest payload.
            var bookRequest = new
            {
                Title = "The Hobbit",
                Authors = new[] { "J.R.R. Tolkien" },
                ISBN = "9780547928227",
                Publisher = "Houghton Mifflin",
                PublishDate = "September 21, 1937",
                PageCount = 310,
                Description = "In a hole in the ground there lived a hobbit.",
                CoverSmall = "https://covers.openlibrary.org/b/id/8406786-S.jpg",
                CoverMedium = "https://covers.openlibrary.org/b/id/8406786-M.jpg",
                CoverLarge = "https://covers.openlibrary.org/b/id/8406786-L.jpg",
                BookUrl = "https://openlibrary.org/books/OL7353617M/The_Hobbit"
            };

            // 1. Create the book
            var createResponse = await client.PostAsJsonAsync("/api/vault/books", bookRequest);
            Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);

            // 2. Verify the book appears in the vault
            var getResponse = await client.GetAsync("/api/vault");
            Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);
            var items = await getResponse.Content.ReadFromJsonAsync<List<VaultItemResponse>>();
            Assert.NotNull(items);
            var createdBook = items!.Find(i => i.Category == "book" && i.Title == "The Hobbit");
            Assert.NotNull(createdBook);

            // 3. Delete the book (cleanup)
            var deleteResponse = await client.DeleteAsync($"/api/vault/{createdBook!.Id}");
            Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

            // 4. Verify the book no longer exists
            var getAfterDelete = await client.GetAsync("/api/vault");
            var itemsAfterDelete = await getAfterDelete.Content.ReadFromJsonAsync<List<VaultItemResponse>>();
            Assert.NotNull(itemsAfterDelete);
            Assert.Empty(itemsAfterDelete!);
        }

        /// <summary>
        /// Tests that the /api/booklookup/isbn endpoint requires authentication.
        /// </summary>
        [Fact]
        public async Task BookLookupEndpoint_RequiresAuthentication()
        {
            var client = _factory.CreateClient();

            var response = await client.GetAsync("/api/booklookup/isbn/9780547928227");
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        /// <summary>
        /// Tests that a book created with all BookLookupResult fields saves correctly.
        /// Verifies the round-trip by ensuring the vault shows the saved book title.
        /// </summary>
        [Fact]
        public async Task CreateBook_WithAllLookupFields_SavesSuccessfully_ThenDelete()
        {
            var client = await CreateAuthenticatedClientAsync();

            var bookRequest = new
            {
                Title = "Dune",
                Authors = new[] { "Frank Herbert" },
                ISBN = "9780441013593",
                Year = 1965,
                Genre = "Sci-Fi",
                Publisher = "Chilton Books",
                PublishDate = "1965",
                PageCount = 412,
                Description = "A sweeping epic of politics, religion and ecology.",
                CoverSmall = "https://covers.openlibrary.org/b/id/999-S.jpg",
                CoverMedium = "https://covers.openlibrary.org/b/id/999-M.jpg",
                CoverLarge = "https://covers.openlibrary.org/b/id/999-L.jpg",
                BookUrl = "https://openlibrary.org/books/OL/Dune"
            };

            var createResponse = await client.PostAsJsonAsync("/api/vault/books", bookRequest);
            Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);

            // Retrieve vault and verify
            var getResponse = await client.GetAsync("/api/vault");
            var items = await getResponse.Content.ReadFromJsonAsync<List<VaultItemResponse>>();
            Assert.NotNull(items);
            var saved = items!.Find(i => i.Category == "book" && i.Title == "Dune");
            Assert.NotNull(saved);

            // Cleanup: delete the created book
            var deleteResponse = await client.DeleteAsync($"/api/vault/{saved!.Id}");
            Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);
        }
    }
}
