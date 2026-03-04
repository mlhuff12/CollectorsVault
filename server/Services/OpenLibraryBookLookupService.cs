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
    ///   <item>ISBN lookup uses <c>/api/books?jscmd=data</c> for rich metadata (covers, publishers, subjects, etc.).
    ///   If the edition record itself includes a <c>description</c> field that is used as the initial value;
    ///   then the linked Work record (<c>/works/{key}.json</c>) is fetched and its description (when present)
    ///   takes precedence — two HTTP requests total.</item>
    ///   <item>Series information is extracted from the Work's <c>series</c> field. When the Work has no
    ///   series data but a <c>collectionID</c> subject is present, the collection endpoint is queried to
    ///   find the matching work's <c>lending_edition</c>, which is then fetched for series info.</item>
    ///   <item>Title / author search uses <c>/search.json</c> and derives cover image URLs from the <c>cover_i</c> field.
    ///   Descriptions are not fetched for search results to avoid per-result extra requests.</item>
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
                if (!string.IsNullOrEmpty(workKey))
                {
                    var workData = await FetchWorkDataAsync(workKey);

                    // Prefer the Work-level description (more authoritative); if the Work has none,
                    // keep any description already parsed from the edition record.
                    if (!string.IsNullOrEmpty(workData.Description))
                        result.Description = workData.Description;

                    // Use series info from the work if available.
                    if (!string.IsNullOrEmpty(workData.SeriesName))
                    {
                        result.SeriesName = workData.SeriesName;
                        result.SeriesNumber = workData.SeriesNumber;
                    }
                }

                // If no series found yet, try the collectionID subject path.
                if (string.IsNullOrEmpty(result.SeriesName))
                {
                    var collectionSubject = ExtractCollectionIdSubject(prop.Value);
                    if (collectionSubject.HasValue)
                    {
                        var (collectionSeriesName, collectionPath) = collectionSubject.Value;
                        if (!string.IsNullOrEmpty(collectionPath))
                        {
                            var (seriesName, seriesNumber) = await FetchSeriesFromCollectionAsync(collectionPath, workKey);
                            if (!string.IsNullOrEmpty(seriesName))
                            {
                                result.SeriesName = seriesName;
                                result.SeriesNumber = seriesNumber;
                            }
                            else
                            {
                                // Series identified via collectionID but number not determinable — prompt user.
                                result.SeriesName = collectionSeriesName;
                                result.SeriesNotFound = true;
                            }
                        }
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
        /// Extracts a <c>collectionID</c> subject from the edition element, if present.
        /// Returns the series name (e.g. "Animorphs") and the relative URL path to the
        /// collection subject endpoint (e.g. "/subjects/collectionid:animorphs").
        /// </summary>
        private static (string SeriesName, string SubjectPath)? ExtractCollectionIdSubject(JsonElement el)
        {
            if (!el.TryGetProperty("subjects", out var subjects))
                return null;

            foreach (var subject in subjects.EnumerateArray())
            {
                if (!subject.TryGetProperty("name", out var nameProp)) continue;
                var nameStr = nameProp.GetString() ?? string.Empty;
                if (!nameStr.StartsWith("collectionID:", StringComparison.OrdinalIgnoreCase)) continue;

                var seriesName = nameStr.Substring("collectionID:".Length).Trim();

                var subjectPath = string.Empty;
                if (subject.TryGetProperty("url", out var urlProp))
                {
                    var urlStr = urlProp.GetString() ?? string.Empty;
                    if (Uri.TryCreate(urlStr, UriKind.Absolute, out var uri))
                        subjectPath = uri.AbsolutePath;
                }

                return (seriesName, subjectPath);
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
        /// Follows the collectionID subject path to find series information for the book
        /// identified by <paramref name="workKey"/>.
        /// Fetches the collection subject JSON, finds the matching work entry (by work key),
        /// then fetches the <c>lending_edition</c> work for that entry to extract series data.
        /// </summary>
        private async Task<(string SeriesName, int? SeriesNumber)> FetchSeriesFromCollectionAsync(
            string collectionPath, string? workKey)
        {
            var response = await _httpClient.GetAsync($"{collectionPath}.json");
            if (!response.IsSuccessStatusCode)
                return (string.Empty, null);

            var json = await response.Content.ReadAsStringAsync();
            try
            {
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;

                if (!root.TryGetProperty("works", out var works))
                    return (string.Empty, null);

                foreach (var work in works.EnumerateArray())
                {
                    // Match this collection entry against our book's work key.
                    if (!string.IsNullOrEmpty(workKey))
                    {
                        if (!work.TryGetProperty("key", out var keyProp)) continue;
                        var keyStr = keyProp.GetString() ?? string.Empty;
                        if (!string.Equals(keyStr, workKey, StringComparison.OrdinalIgnoreCase)) continue;
                    }

                    // Get the lending_edition key for this work and look up its series data.
                    if (!work.TryGetProperty("lending_edition", out var lendingEditionProp)) continue;
                    var editionKey = lendingEditionProp.GetString();
                    if (string.IsNullOrEmpty(editionKey)) continue;

                    var workData = await FetchWorkDataAsync($"/works/{editionKey}");
                    if (!string.IsNullOrEmpty(workData.SeriesName))
                        return (workData.SeriesName, workData.SeriesNumber);
                }
            }
            catch (JsonException)
            {
                // Malformed JSON — treat as no series found
            }

            return (string.Empty, null);
        }

        /// <summary>
        /// Parses a series string such as <c>"Animorphs #1"</c> into a name and optional number.
        /// Handles patterns like <c>"Series Name #N"</c>, <c>"Series Name, Book N"</c>,
        /// and <c>"Series Name, N"</c>.
        /// </summary>
        public static (string Name, int? Number) ParseSeriesString(string series)
        {
            // Match: "Some Name #N", "Some Name, Book N", or "Some Name, N"
            var match = Regex.Match(
                series,
                @"^(.+?)(?:\s*[,#]\s*(?:[Bb]ook\s+)?(\d+))?$");

            if (match.Success)
            {
                var name = match.Groups[1].Value.Trim();
                var number = match.Groups[2].Success ? (int?)int.Parse(match.Groups[2].Value) : null;
                return (name, number);
            }

            return (series.Trim(), null);
        }

        private record WorkData(string Description, string SeriesName, int? SeriesNumber);
    }
}
