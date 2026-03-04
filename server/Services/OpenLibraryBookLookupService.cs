using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using CollectorsVault.Server.Contracts;

namespace CollectorsVault.Server.Services
{
    /// <summary>
    /// <see cref="IBookLookupService"/> implementation backed by the Open Library API.
    /// <list type="bullet">
    ///   <item>ISBN lookup uses <c>/api/books?jscmd=data</c> for rich metadata (covers, publishers, subjects, etc.).</item>
    ///   <item>Series information is resolved via a two-step fallback strategy:
    ///     <list type="number">
    ///       <item>Edition level: <c>/isbn/{isbn}.json</c> — the most direct source; a <c>series</c> array is
    ///       commonly populated at the edition level for series books (e.g. <c>["Animorphs #1"]</c>).</item>
    ///       <item>Work level: <c>/works/{key}.json</c> — fetched anyway for the description; also checked for
    ///       <c>series</c> when the edition record has none.</item>
    ///     </list>
    ///   If neither source resolves the series and the description is still needed, the work is still fetched.
    ///   If the book has no series data at all, <see cref="BookLookupResult.SeriesNotFound"/> is <see langword="false"/>
    ///   and both series fields are left empty.
    ///   </item>
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
            {
                var result = ParseFromDataResponse(prop.Value, isbn);

                var workKey = ExtractFirstWorkKey(prop.Value);

                // ── Step 1: check the edition itself for series ──────────────────
                // The /isbn/{isbn}.json endpoint (recommended by Open Library) commonly
                // exposes a "series" array at the edition level. This is the most direct
                // and reliable source of series data — check it first.
                var editionSeries = await FetchEditionSeriesAsync(isbn);
                if (editionSeries.HasValue)
                {
                    result.SeriesName = editionSeries.Value.Name;
                    result.SeriesNumber = editionSeries.Value.Number;
                }

                // ── Step 2: fetch the work for description + series fallback ─────
                if (!string.IsNullOrEmpty(workKey))
                {
                    var workData = await FetchWorkDataAsync(workKey);

                    // Prefer the Work-level description (more authoritative).
                    if (!string.IsNullOrEmpty(workData.Description))
                        result.Description = workData.Description;

                    // Only use the work's series if the edition had none.
                    if (string.IsNullOrEmpty(result.SeriesName) && !string.IsNullOrEmpty(workData.SeriesName))
                    {
                        result.SeriesName = workData.SeriesName;
                        result.SeriesNumber = workData.SeriesNumber;
                    }
                }

                return result;
            }

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

            // Some editions include their own description; the Work description (fetched separately)
            // takes precedence when available.
            if (el.TryGetProperty("description", out var desc))
            {
                if (desc.ValueKind == JsonValueKind.String)
                    result.Description = desc.GetString() ?? string.Empty;
                else if (desc.ValueKind == JsonValueKind.Object && desc.TryGetProperty("value", out var descVal))
                    result.Description = descVal.GetString() ?? string.Empty;
            }

            return result;
        }

        /// <summary>
        /// Parses a book from a single doc element in the <c>/search.json</c> response.
        /// Cover image URLs are derived from the <c>cover_i</c> field.
        /// Description is not populated here to avoid per-result extra requests.
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

        /// <summary>
        /// Extracts the first work key (e.g. <c>/works/OL262059W</c>) from a <c>/api/books?jscmd=data</c> element.
        /// </summary>
        private static string? ExtractFirstWorkKey(JsonElement el)
        {
            if (!el.TryGetProperty("works", out var works))
                return null;
            foreach (var work in works.EnumerateArray())
            {
                if (work.TryGetProperty("key", out var key))
                    return key.GetString();
            }
            return null;
        }

        /// <summary>
        /// Fetches the <c>series</c> field from the edition record at <c>/isbn/{isbn}.json</c>.
        /// This is the recommended primary source for series data: Open Library commonly populates
        /// the <c>series</c> array at the edition level (e.g. <c>["Animorphs #1"]</c>,
        /// <c>["Harry Potter ; 3"]</c>) making it the most direct and reliable lookup.
        /// Returns <see langword="null"/> when the field is absent or the request fails.
        /// </summary>
        private async Task<(string Name, int? Number)?> FetchEditionSeriesAsync(string isbn)
        {
            var response = await _httpClient.GetAsync($"/isbn/{Uri.EscapeDataString(isbn)}.json");
            if (!response.IsSuccessStatusCode)
                return null;

            var json = await response.Content.ReadAsStringAsync();
            try
            {
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;

                if (!root.TryGetProperty("series", out var seriesArr) || seriesArr.ValueKind != JsonValueKind.Array)
                    return null;

                foreach (var seriesEl in seriesArr.EnumerateArray())
                {
                    if (seriesEl.ValueKind != JsonValueKind.String) continue;
                    var seriesStr = seriesEl.GetString() ?? string.Empty;
                    if (string.IsNullOrWhiteSpace(seriesStr)) continue;

                    var (name, number) = ParseSeriesString(seriesStr);
                    if (!string.IsNullOrEmpty(name))
                        return (name, number);
                }
            }
            catch (JsonException)
            {
                // Malformed JSON — treat as no series
            }

            return null;
        }

        /// <summary>
        /// Fetches both description and series information for a work from <c>/works/{key}.json</c>.
        /// The description field may be a plain string or an object with a <c>value</c> property.
        /// The series field is an array of strings such as <c>["Animorphs #1"]</c>.
        /// Returns empty strings / null when fields are absent or the request fails.
        /// </summary>
        private async Task<WorkData> FetchWorkDataAsync(string workKey)
        {
            var response = await _httpClient.GetAsync($"{workKey}.json");
            if (!response.IsSuccessStatusCode)
                return new WorkData(string.Empty, string.Empty, null);

            var json = await response.Content.ReadAsStringAsync();
            try
            {
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;

                // Description
                var description = string.Empty;
                if (root.TryGetProperty("description", out var desc))
                {
                    if (desc.ValueKind == JsonValueKind.String)
                        description = desc.GetString() ?? string.Empty;
                    else if (desc.ValueKind == JsonValueKind.Object && desc.TryGetProperty("value", out var value))
                        description = value.GetString() ?? string.Empty;
                }

                // Series
                var seriesName = string.Empty;
                int? seriesNumber = null;
                if (root.TryGetProperty("series", out var seriesArr) && seriesArr.ValueKind == JsonValueKind.Array)
                {
                    foreach (var seriesEl in seriesArr.EnumerateArray())
                    {
                        if (seriesEl.ValueKind != JsonValueKind.String) continue;
                        var seriesStr = seriesEl.GetString() ?? string.Empty;
                        if (string.IsNullOrEmpty(seriesStr)) continue;
                        (seriesName, seriesNumber) = ParseSeriesString(seriesStr);
                        if (!string.IsNullOrEmpty(seriesName)) break;
                    }
                }

                return new WorkData(description, seriesName, seriesNumber);
            }
            catch (JsonException)
            {
                return new WorkData(string.Empty, string.Empty, null);
            }
        }

        /// <summary>
        /// Parses a series string into a name and optional series number.
        /// <para>
        /// Handles the following formats documented in Open Library data:
        /// <list type="bullet">
        ///   <item><c>"Animorphs #1"</c> — hash prefix (<c>#N</c>)</item>
        ///   <item><c>"Harry Potter ; 3"</c> — semicolon separator (<c>; N</c>)</item>
        ///   <item><c>"Narnia ; bk. 1"</c> — semicolon + book abbreviation (<c>; bk. N</c>)</item>
        ///   <item><c>"His Dark Materials, Book 1"</c> — comma + book word (<c>, Book N</c>)</item>
        ///   <item><c>"Animorphs, 1"</c> — comma + bare number (<c>, N</c>)</item>
        ///   <item><c>"Animorphs"</c> — name only, no number</item>
        /// </list>
        /// </para>
        /// </summary>
        public static (string Name, int? Number) ParseSeriesString(string series)
        {
            // Handles:
            //   "Name #N"                 (hash)
            //   "Name ; N"                (semicolon + space + number)
            //   "Name ; bk. N"            (semicolon + book abbreviation)
            //   "Name, Book N"            (comma + Book word)
            //   "Name, N"                 (comma + bare number)
            var match = Regex.Match(
                series.Trim(),
                @"^(.+?)(?:\s*(?:[;,#])\s*(?:[Bb]k\.?\s+|[Bb]ook\s+)?(\d+))?$");

            if (match.Success)
            {
                var name = match.Groups[1].Value.Trim();
                // Strip a trailing semicolon left over when the semicolon is the separator
                // and no number was captured (e.g. "Name ;" with nothing after).
                name = name.TrimEnd(';', ',', ' ');
                var number = match.Groups[2].Success ? (int?)int.Parse(match.Groups[2].Value) : null;
                return (name, number);
            }

            return (series.Trim(), null);
        }

        private record WorkData(string Description, string SeriesName, int? SeriesNumber);
    }
}
