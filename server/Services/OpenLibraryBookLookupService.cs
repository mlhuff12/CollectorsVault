using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using CollectorsVault.Server.Contracts;
using CollectorsVault.Server.Models;
using CollectorsVault.Server.Utils;

namespace CollectorsVault.Server.Services
{
    /// <summary>
    /// <see cref="IBookLookupService"/> implementation backed by the Open Library API.
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
            var url = $"/api/books?bibkeys=ISBN:{Uri.EscapeDataString(isbn)}&format=json&jscmd=data";
            var response = await _httpClient.GetAsync(url);

            using var doc = await JsonDocumentUtils.ParseResponseAsync(response);
            if (doc == null)
            {
                return null;
            }

            var root = doc.RootElement;
            if (root.ValueKind != JsonValueKind.Object)
            {
                return null;
            }

            foreach (var prop in root.EnumerateObject())
            {
                var result = ParseFromDataResponse(prop.Value, isbn);
                var workKey = ExtractFirstWorkKey(prop.Value);

                var editionSeries = await FetchEditionSeriesAsync(isbn);
                if (editionSeries.HasValue)
                {
                    result.SeriesName = editionSeries.Value.Name;
                    result.SeriesNumber = editionSeries.Value.Number;
                }

                if (!string.IsNullOrEmpty(workKey))
                {
                    var workData = await FetchWorkDataAsync(workKey);

                    if (!string.IsNullOrEmpty(workData.Description))
                    {
                        result.Description = workData.Description;
                    }

                    if (string.IsNullOrEmpty(result.SeriesName) && !string.IsNullOrEmpty(workData.SeriesName))
                    {
                        result.SeriesName = workData.SeriesName;
                        result.SeriesNumber = workData.SeriesNumber;
                    }
                }

                // Last-resort: if still no series, look for a "series:{name}" subject tag.
                if (string.IsNullOrEmpty(result.SeriesName) && result.Subjects != null)
                {
                    foreach (var subject in result.Subjects)
                    {
                        const string prefix = "series:";
                        if (subject.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                        {
                            var nameFromSubject = subject[prefix.Length..].Trim();
                            if (!string.IsNullOrEmpty(nameFromSubject))
                            {
                                result.SeriesName = nameFromSubject;
                                result.SeriesNotFound = true;
                                break;
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

        private async Task<IEnumerable<BookLookupResult>> SearchAsync(string url)
        {
            var response = await _httpClient.GetAsync(url);

            using var doc = await JsonDocumentUtils.ParseResponseAsync(response);
            if (doc == null)
            {
                return Enumerable.Empty<BookLookupResult>();
            }

            var root = doc.RootElement;
            if (!root.TryGetProperty("docs", out var docs))
            {
                return Enumerable.Empty<BookLookupResult>();
            }

            var results = new List<BookLookupResult>();
            foreach (var item in docs.EnumerateArray())
            {
                results.Add(ParseFromSearchDoc(item));
            }

            return results;
        }

        private static BookLookupResult ParseFromDataResponse(JsonElement el, string isbn)
        {
            var result = new BookLookupResult { Isbn = isbn };

            if (el.TryGetProperty("title", out var title))
            {
                result.Title = title.GetString() ?? string.Empty;
            }

            if (el.TryGetProperty("authors", out var authors))
            {
                result.Authors = authors.EnumerateArray()
                    .Where(a => a.TryGetProperty("name", out _))
                    .Select(a => a.GetProperty("name").GetString() ?? string.Empty)
                    .ToList();
            }

            if (el.TryGetProperty("number_of_pages", out var pages) && pages.ValueKind == JsonValueKind.Number)
            {
                result.PageCount = pages.GetInt32();
            }

            if (el.TryGetProperty("publish_date", out var pd))
            {
                result.PublishDate = pd.GetString() ?? string.Empty;
            }

            if (el.TryGetProperty("publishers", out var publishers))
            {
                result.Publisher = publishers.EnumerateArray()
                    .Where(p => p.TryGetProperty("name", out _))
                    .Select(p => p.GetProperty("name").GetString() ?? string.Empty)
                    .FirstOrDefault() ?? string.Empty;
            }

            if (el.TryGetProperty("subjects", out var subjects))
            {
                result.Subjects = subjects.EnumerateArray()
                    .Where(s => s.TryGetProperty("name", out _))
                    .Select(s => s.GetProperty("name").GetString() ?? string.Empty)
                    .ToList();
            }

            if (el.TryGetProperty("cover", out var cover))
            {
                if (cover.TryGetProperty("small", out var small))
                {
                    result.CoverSmall = small.GetString() ?? string.Empty;
                }
                if (cover.TryGetProperty("medium", out var medium))
                {
                    result.CoverMedium = medium.GetString() ?? string.Empty;
                }
                if (cover.TryGetProperty("large", out var large))
                {
                    result.CoverLarge = large.GetString() ?? string.Empty;
                }
            }

            if (el.TryGetProperty("url", out var url))
            {
                result.ProviderUrl = url.GetString() ?? string.Empty;
            }

            if (el.TryGetProperty("physical_format", out var physicalFormat))
            {
                result.BookFormat = VaultService.ParseBookFormat(physicalFormat.GetString());
            }

            if (el.TryGetProperty("description", out var desc))
            {
                if (desc.ValueKind == JsonValueKind.String)
                {
                    result.Description = desc.GetString() ?? string.Empty;
                }
                else if (desc.ValueKind == JsonValueKind.Object && desc.TryGetProperty("value", out var descVal))
                {
                    result.Description = descVal.GetString() ?? string.Empty;
                }
            }

            return result;
        }

        private static BookLookupResult ParseFromSearchDoc(JsonElement el)
        {
            var result = new BookLookupResult();

            if (el.TryGetProperty("title", out var title))
            {
                result.Title = title.GetString() ?? string.Empty;
            }

            if (el.TryGetProperty("author_name", out var authors))
            {
                result.Authors = authors.EnumerateArray()
                    .Select(a => a.GetString() ?? string.Empty)
                    .ToList();
            }

            if (el.TryGetProperty("isbn", out var isbns))
            {
                result.Isbn = isbns.EnumerateArray()
                    .Select(i => i.GetString() ?? string.Empty)
                    .FirstOrDefault() ?? string.Empty;
            }

            if (el.TryGetProperty("publisher", out var publishers))
            {
                result.Publisher = publishers.EnumerateArray()
                    .Select(p => p.GetString() ?? string.Empty)
                    .FirstOrDefault() ?? string.Empty;
            }

            if (el.TryGetProperty("first_publish_year", out var year) && year.ValueKind == JsonValueKind.Number)
            {
                result.PublishDate = year.GetInt32().ToString();
            }

            if (el.TryGetProperty("number_of_pages_median", out var pages) && pages.ValueKind == JsonValueKind.Number)
            {
                result.PageCount = pages.GetInt32();
            }

            if (el.TryGetProperty("subject", out var subjects))
            {
                result.Subjects = subjects.EnumerateArray()
                    .Select(s => s.GetString() ?? string.Empty)
                    .ToList();
            }

            if (el.TryGetProperty("cover_i", out var coverId) && coverId.ValueKind == JsonValueKind.Number)
            {
                var id = coverId.GetInt64();
                result.CoverSmall = $"{CoversBase}/{id}-S.jpg";
                result.CoverMedium = $"{CoversBase}/{id}-M.jpg";
                result.CoverLarge = $"{CoversBase}/{id}-L.jpg";
            }

            return result;
        }

        private static string? ExtractFirstWorkKey(JsonElement el)
        {
            if (!el.TryGetProperty("works", out var works))
            {
                return null;
            }

            foreach (var work in works.EnumerateArray())
            {
                if (work.TryGetProperty("key", out var key))
                {
                    return key.GetString();
                }
            }

            return null;
        }

        private async Task<(string Name, int? Number)?> FetchEditionSeriesAsync(string isbn)
        {
            var response = await _httpClient.GetAsync($"/isbn/{Uri.EscapeDataString(isbn)}.json");

            using var doc = await JsonDocumentUtils.ParseResponseAsync(response);
            if (doc == null)
            {
                return null;
            }

            var root = doc.RootElement;
            if (!root.TryGetProperty("series", out var seriesArr) || seriesArr.ValueKind != JsonValueKind.Array)
            {
                return null;
            }

            foreach (var seriesEl in seriesArr.EnumerateArray())
            {
                if (seriesEl.ValueKind != JsonValueKind.String)
                {
                    continue;
                }

                var seriesStr = seriesEl.GetString() ?? string.Empty;
                if (string.IsNullOrWhiteSpace(seriesStr))
                {
                    continue;
                }

                var (name, number) = ParseSeriesString(seriesStr);
                if (!string.IsNullOrEmpty(name))
                {
                    return (name, number);
                }
            }

            return null;
        }

        private async Task<WorkData> FetchWorkDataAsync(string workKey)
        {
            var response = await _httpClient.GetAsync($"{workKey}.json");

            using var doc = await JsonDocumentUtils.ParseResponseAsync(response);
            if (doc == null)
            {
                return new WorkData(string.Empty, string.Empty, null);
            }

            var root = doc.RootElement;

            var description = string.Empty;
            if (root.TryGetProperty("description", out var desc))
            {
                if (desc.ValueKind == JsonValueKind.String)
                {
                    description = desc.GetString() ?? string.Empty;
                }
                else if (desc.ValueKind == JsonValueKind.Object && desc.TryGetProperty("value", out var value))
                {
                    description = value.GetString() ?? string.Empty;
                }
            }

            var seriesName = string.Empty;
            int? seriesNumber = null;
            if (root.TryGetProperty("series", out var seriesArr) && seriesArr.ValueKind == JsonValueKind.Array)
            {
                foreach (var seriesEl in seriesArr.EnumerateArray())
                {
                    if (seriesEl.ValueKind != JsonValueKind.String)
                    {
                        continue;
                    }

                    var seriesStr = seriesEl.GetString() ?? string.Empty;
                    if (string.IsNullOrEmpty(seriesStr))
                    {
                        continue;
                    }

                    (seriesName, seriesNumber) = ParseSeriesString(seriesStr);
                    if (!string.IsNullOrEmpty(seriesName))
                    {
                        break;
                    }
                }
            }

            return new WorkData(description, seriesName, seriesNumber);
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
            var match = Regex.Match(
                series.Trim(),
                @"^(.+?)(?:\s*(?:[;,#])\s*(?:[Bb]k\.?\s+|[Bb]ook\s+)?(\d+))?$");

            if (match.Success)
            {
                var name = match.Groups[1].Value.Trim();
                name = name.TrimEnd(';', ',', ' ');
                var number = match.Groups[2].Success ? (int?)int.Parse(match.Groups[2].Value) : null;
                return (name, number);
            }

            return (series.Trim(), null);
        }

        private record WorkData(string Description, string SeriesName, int? SeriesNumber);
    }
}
