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
        public async Task<BookLookupResult> LookupByIsbnAsync(string isbn)
        {
            BookLookupResult result = new BookLookupResult { Isbn = isbn };

            // First fetch that contains subjects, image urls, and book url
            var response = await _httpClient.GetAsync($"/api/books?bibkeys=ISBN:{Uri.EscapeDataString(isbn)}&format=json&jscmd=data");
            await ParseOpenLibraryResponse(response, result);

            // Second fetch by key (works id) - will sometime not contain much information
            if (!string.IsNullOrEmpty(result.Key))
            {
                response = await _httpClient.GetAsync($"{result.Key}.json");

                // Resetting Key in order to get works key
                result.Key = null;
                await ParseOpenLibraryResponse(response, result);

                // Fetch by Works key if missing expected information
                if (!string.IsNullOrEmpty(result.Key) && string.IsNullOrEmpty(result.Description))
                {
                    response = await _httpClient.GetAsync($"{result.Key}.json");
                    await ParseOpenLibraryResponse(response, result);
                }
            }
            
            if (!string.IsNullOrEmpty(result.SeriesUrl))
            {
                // Fetch series
                response = await _httpClient.GetAsync($"{result.SeriesUrl}.json");
                await ParseOpenLibraryResponse(response, result);

                if (!string.IsNullOrEmpty(result.LendingEditionKey))
                {
                    // Fetch lending edition for series number if available
                    response = await _httpClient.GetAsync($"/books/{result.LendingEditionKey}.json");
                    await ParseOpenLibraryResponse(response, result);
                } 
            }

            return result;
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
                /*
                result.Subjects = subjects.EnumerateArray()
                    .Select(s => s.GetString() ?? string.Empty)
                    .ToList();
                    */
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

        // ex. Animorphs -- 1, Animorphs 1, Animorphs:1
        private static int? ParseNumberFromSeriesString(string series)
        {
            var match = Regex.Match(series, @"(?:^|[^\d])(\d+)(?:$|[^\d])");
            if (match.Success)
            {
                return int.Parse(match.Groups[1].Value);
            }

            return null;
        }

        /// <summary>
        /// Parses a series string into a name and optional series number.
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

        /// <summary>
        /// Parses the Open Library API response and sets properties on the provided BookLookupResult if they are not already set.
        /// </summary>
        /// <param name="response">The HTTP response from the Open Library API.</param>
        /// <param name="result">The BookLookupResult to populate with data from the API response.</param>
        /// <returns>A task representing the asynchronous operation.</returns>
        private static async Task ParseOpenLibraryResponse(HttpResponseMessage response, BookLookupResult result)
        {
            // TODO : Refactor so that the Book object is returned instead and not passing the extra data it doesn't need
            using (var doc = await JsonDocumentUtils.ParseResponseAsync(response))
            {
                if (doc == null)
                {
                    return;
                }

                var root = doc.RootElement;

                if (root.TryGetProperty($"ISBN:{result.Isbn}", out var bookEl))
                {
                    root = bookEl;
                }

                // Iterate through all properties of BookLookupResult and try to set property if not already set
                if (string.IsNullOrEmpty(result.Title) && root.TryGetProperty("title", out var title))
                {
                    result.Title = title.GetString();
                }
                if ((result.Authors == null || result.Authors.Count == 0) && root.TryGetProperty("authors", out var authors))
                {
                    result.Authors = authors.EnumerateArray()
                        .Where(a => a.TryGetProperty("name", out _))
                        .Select(a => a.GetProperty("name").GetString() ?? string.Empty)
                        .ToList();
                }
                // TODO : Refactor to change Publisher to be Publishers (List<string>) in API, UI, and Database
                if (string.IsNullOrEmpty(result.Publisher) && root.TryGetProperty("publishers", out var publishers))
                {
                    result.Publisher = publishers.EnumerateArray()
                        .Where(p => p.TryGetProperty("name", out _))
                        .Select(p => p.GetProperty("name").GetString() ?? string.Empty)
                        .FirstOrDefault() ?? string.Empty;
                }
                // TODO : Investigate if we can set to DateOnly
                if (string.IsNullOrEmpty(result.PublishDate) && root.TryGetProperty("publish_date", out var pd))
                {
                    result.PublishDate = pd.GetString() ?? string.Empty;
                }
                if (!result.PageCount.HasValue && root.TryGetProperty("number_of_pages", out var pages) && pages.ValueKind == JsonValueKind.Number)
                {
                    result.PageCount = pages.GetInt32();
                }
                if (string.IsNullOrEmpty(result.Description) && root.TryGetProperty("description", out var desc))
                {
                    // TODO : Investigate if ever object for description
                    if (desc.ValueKind == JsonValueKind.String)
                    {
                        result.Description = desc.GetString() ?? string.Empty;
                    }
                    else if (desc.ValueKind == JsonValueKind.Object && desc.TryGetProperty("value", out var descVal))
                    {
                        result.Description = descVal.GetString() ?? string.Empty;
                    }
                }
                if ((result.Subjects == null || result.Subjects.Count == 0) && root.TryGetProperty("subjects", out var subjects))
                {
                    result.Subjects = subjects.EnumerateArray()
                        .Where(s => s.TryGetProperty("name", out _))
                        .Select(s => new KeyValuePair<string, string>(
                            s.GetProperty("name").GetString() ?? string.Empty,
                            s.TryGetProperty("url", out var url) ? url.GetString() ?? string.Empty : string.Empty))
                        .ToList();
                }
                if (string.IsNullOrEmpty(result.CoverSmall) && root.TryGetProperty("cover", out var cover))
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
                // TODO : Refactor to change property name to BookUrl in API, UI, and Database
                if (string.IsNullOrEmpty(result.ProviderUrl) && root.TryGetProperty("url", out var url))
                {
                    result.ProviderUrl = url.GetString() ?? string.Empty;
                }
                // Get Series Name from subjects if not already set, looking for "series:{name}" pattern
                if (string.IsNullOrEmpty(result.SeriesName) && result.Subjects != null)
                {
                    const string prefix = "series:";
                    var seriesSubject = result.Subjects.FirstOrDefault(s => s.Key.StartsWith(prefix, StringComparison.OrdinalIgnoreCase));

                    if (seriesSubject.Key != null)
                    {
                        var nameFromSubject = seriesSubject.Key[prefix.Length..].Trim();
                        if (!string.IsNullOrEmpty(nameFromSubject))
                        {
                            result.SeriesName = nameFromSubject;
                            result.SeriesUrl = seriesSubject.Value;
                        }
                    }
                }
                // Get Series Number if not already set
                if (!result.SeriesNumber.HasValue && !string.IsNullOrEmpty(result.SeriesName) && root.TryGetProperty("series", out var seriesArr) && seriesArr.ValueKind == JsonValueKind.Array)
                {
                    result.SeriesNumber = ParseNumberFromSeriesString(seriesArr[0].ToString());

                    if (result.SeriesNumber == null)
                    {
                        result.SeriesNotFound = true;
                    }
                }
                // Get BookFormat if not already set
                if (!result.BookFormat.HasValue && root.TryGetProperty("physical_format", out var physicalFormat))
                {
                    result.BookFormat = VaultService.ParseBookFormat(physicalFormat.GetString());
                }
                // Get Works key if not already set
                if (string.IsNullOrEmpty(result.Key) && root.TryGetProperty("works", out var works) && works.ValueKind == JsonValueKind.Array && works.GetArrayLength() > 0)
                {
                    var firstWork = works.EnumerateArray().First();
                    if (firstWork.TryGetProperty("key", out var workKey))
                    {
                        result.Key = workKey.GetString();
                    }
                }
                // Get Books key if not already set
                if (string.IsNullOrEmpty(result.Key) && root.TryGetProperty("key", out var key))
                {
                    result.Key = key.GetString();
                }   
                // Get lending edition from the matching work entry.
                if (string.IsNullOrEmpty(result.LendingEditionKey) && root.TryGetProperty("works", out var worksArr) 
                    && worksArr.ToString().Contains("lending_edition", StringComparison.OrdinalIgnoreCase) && worksArr.ValueKind == JsonValueKind.Array)
                {
                    var matchedWork = worksArr.EnumerateArray().FirstOrDefault(w =>
                    {
                        var keyMatches =
                            !string.IsNullOrWhiteSpace(result.Key) &&
                            w.TryGetProperty("key", out var workKey) &&
                            string.Equals(workKey.GetString(), result.Key, StringComparison.Ordinal);

                        var titleMatches =
                            !string.IsNullOrWhiteSpace(result.Title) &&
                            w.TryGetProperty("title", out var workTitle) &&
                            string.Equals(workTitle.GetString(), result.Title, StringComparison.OrdinalIgnoreCase);

                        return keyMatches || titleMatches;
                    });

                    if (matchedWork.ValueKind != JsonValueKind.Undefined)
                    {
                        if (matchedWork.TryGetProperty("lending_edition", out var lendingEdition) && lendingEdition.ValueKind == JsonValueKind.String)
                        {
                            result.LendingEditionKey = lendingEdition.GetString() ?? string.Empty;
                        }

                        // Some Open Library responses leave lending_edition blank but expose availability.openlibrary_edition.
                        if (string.IsNullOrEmpty(result.LendingEditionKey) &&
                            matchedWork.TryGetProperty("availability", out var availability) &&
                            availability.ValueKind == JsonValueKind.Object &&
                            availability.TryGetProperty("openlibrary_edition", out var openlibraryEdition) &&
                            openlibraryEdition.ValueKind == JsonValueKind.String)
                        {
                            result.LendingEditionKey = openlibraryEdition.GetString() ?? string.Empty;
                        }
                    }
                }
            }
        }
    }
}
