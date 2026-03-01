using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using CollectorsVault.Server.Contracts;

namespace CollectorsVault.Server.Services
{
    /// <summary>
    /// <see cref="IBookLookupService"/> implementation backed by the Open Library API.
    /// <list type="bullet">
    ///   <item>ISBN lookup uses <c>/api/books?jscmd=data</c> to return rich metadata including cover images.</item>
    ///   <item>Title / author search uses <c>/search.json</c> and derives cover image URLs from the <c>cover_i</c> field.</item>
    /// </list>
    /// To switch to a different provider, implement <see cref="IBookLookupService"/> and update the DI registration in <c>Program.cs</c>.
    /// </summary>
    public class OpenLibraryBookLookupService : IBookLookupService
    {
        private readonly HttpClient _httpClient;
        private const string CoversBase = "https://covers.openlibrary.org/b/id";

        public OpenLibraryBookLookupService(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }

        /// <inheritdoc/>
        public async Task<BookLookupResult?> LookupByIsbnAsync(string isbn)
        {
            // /api/books with jscmd=data returns rich data (covers, publishers, subjects, etc.)
            var url = $"/api/books?bibkeys=ISBN:{Uri.EscapeDataString(isbn)}&format=json&jscmd=data";
            var response = await _httpClient.GetAsync(url);
            if (!response.IsSuccessStatusCode)
                return null;

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            if (root.ValueKind != JsonValueKind.Object)
                return null;

            // Response is a dict keyed by "ISBN:xxx" — grab the first (only) entry.
            foreach (var prop in root.EnumerateObject())
                return ParseFromDataResponse(prop.Value, isbn);

            return null;
        }

        /// <inheritdoc/>
        public async Task<IEnumerable<BookLookupResult>> SearchByTitleAsync(string title)
        {
            return await SearchAsync($"/search.json?title={Uri.EscapeDataString(title)}&limit=10");
        }

        /// <inheritdoc/>
        public async Task<IEnumerable<BookLookupResult>> SearchByAuthorAsync(string author)
        {
            return await SearchAsync($"/search.json?author={Uri.EscapeDataString(author)}&limit=10");
        }

        // ── private helpers ────────────────────────────────────────────────────

        private async Task<IEnumerable<BookLookupResult>> SearchAsync(string url)
        {
            var response = await _httpClient.GetAsync(url);
            if (!response.IsSuccessStatusCode)
                return Enumerable.Empty<BookLookupResult>();

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            if (!root.TryGetProperty("docs", out var docs))
                return Enumerable.Empty<BookLookupResult>();

            var results = new List<BookLookupResult>();
            foreach (var item in docs.EnumerateArray())
                results.Add(ParseFromSearchDoc(item));

            return results;
        }

        /// <summary>
        /// Parses a book from the <c>/api/books?jscmd=data</c> response element.
        /// </summary>
        private static BookLookupResult ParseFromDataResponse(JsonElement el, string isbn)
        {
            var result = new BookLookupResult { Isbn = isbn };

            if (el.TryGetProperty("title", out var title))
                result.Title = title.GetString() ?? string.Empty;

            if (el.TryGetProperty("authors", out var authors))
                result.Authors = authors.EnumerateArray()
                    .Where(a => a.TryGetProperty("name", out _))
                    .Select(a => a.GetProperty("name").GetString() ?? string.Empty)
                    .ToList();

            if (el.TryGetProperty("number_of_pages", out var pages) && pages.ValueKind == JsonValueKind.Number)
                result.PageCount = pages.GetInt32();

            if (el.TryGetProperty("publish_date", out var pd))
                result.PublishDate = pd.GetString() ?? string.Empty;

            if (el.TryGetProperty("publishers", out var publishers))
                result.Publisher = publishers.EnumerateArray()
                    .Where(p => p.TryGetProperty("name", out _))
                    .Select(p => p.GetProperty("name").GetString() ?? string.Empty)
                    .FirstOrDefault() ?? string.Empty;

            if (el.TryGetProperty("subjects", out var subjects))
                result.Subjects = subjects.EnumerateArray()
                    .Where(s => s.TryGetProperty("name", out _))
                    .Select(s => s.GetProperty("name").GetString() ?? string.Empty)
                    .ToList();

            if (el.TryGetProperty("cover", out var cover))
            {
                if (cover.TryGetProperty("small", out var small))
                    result.CoverSmall = small.GetString() ?? string.Empty;
                if (cover.TryGetProperty("medium", out var medium))
                    result.CoverMedium = medium.GetString() ?? string.Empty;
                if (cover.TryGetProperty("large", out var large))
                    result.CoverLarge = large.GetString() ?? string.Empty;
            }

            if (el.TryGetProperty("url", out var url))
                result.ProviderUrl = url.GetString() ?? string.Empty;

            return result;
        }

        /// <summary>
        /// Parses a book from a single doc element in the <c>/search.json</c> response.
        /// Cover image URLs are derived from the <c>cover_i</c> field.
        /// </summary>
        private static BookLookupResult ParseFromSearchDoc(JsonElement el)
        {
            var result = new BookLookupResult();

            if (el.TryGetProperty("title", out var title))
                result.Title = title.GetString() ?? string.Empty;

            if (el.TryGetProperty("author_name", out var authors))
                result.Authors = authors.EnumerateArray()
                    .Select(a => a.GetString() ?? string.Empty)
                    .ToList();

            if (el.TryGetProperty("isbn", out var isbns))
                result.Isbn = isbns.EnumerateArray()
                    .Select(i => i.GetString() ?? string.Empty)
                    .FirstOrDefault() ?? string.Empty;

            if (el.TryGetProperty("publisher", out var publishers))
                result.Publisher = publishers.EnumerateArray()
                    .Select(p => p.GetString() ?? string.Empty)
                    .FirstOrDefault() ?? string.Empty;

            if (el.TryGetProperty("first_publish_year", out var year) && year.ValueKind == JsonValueKind.Number)
                result.PublishDate = year.GetInt32().ToString();

            if (el.TryGetProperty("number_of_pages_median", out var pages) && pages.ValueKind == JsonValueKind.Number)
                result.PageCount = pages.GetInt32();

            if (el.TryGetProperty("subject", out var subjects))
                result.Subjects = subjects.EnumerateArray()
                    .Select(s => s.GetString() ?? string.Empty)
                    .ToList();

            if (el.TryGetProperty("cover_i", out var coverId) && coverId.ValueKind == JsonValueKind.Number)
            {
                var id = coverId.GetInt64();
                result.CoverSmall = $"{CoversBase}/{id}-S.jpg";
                result.CoverMedium = $"{CoversBase}/{id}-M.jpg";
                result.CoverLarge = $"{CoversBase}/{id}-L.jpg";
            }

            return result;
        }
    }
}
