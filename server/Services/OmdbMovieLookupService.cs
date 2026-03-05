using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using CollectorsVault.Server.Contracts;
using Microsoft.Extensions.Configuration;

namespace CollectorsVault.Server.Services
{
    /// <summary>
    /// <see cref="IMovieLookupService"/> implementation backed by the OMDb API (http://www.omdbapi.com/).
    /// <para>
    /// UPC barcode lookup first resolves the UPC to a title via the UPC Item DB trial API,
    /// then fetches full movie details from OMDb.
    /// Title search queries OMDb's search endpoint directly.
    /// </para>
    /// <para>
    /// Configure the OMDb API key in <c>OmdbApiKey</c> (appsettings / user-secrets / environment variable).
    /// Without a key, lookups return empty results.
    /// </para>
    /// </summary>
    public class OmdbMovieLookupService : IMovieLookupService
    {
        private readonly HttpClient _httpClient;
        private readonly HttpClient _upcHttpClient;
        private readonly string _apiKey;

        public OmdbMovieLookupService(IHttpClientFactory httpClientFactory, IConfiguration configuration)
        {
            _httpClient = httpClientFactory.CreateClient("Omdb");
            _upcHttpClient = httpClientFactory.CreateClient("UpcItemDb");
            _apiKey = configuration["OmdbApiKey"] ?? string.Empty;
        }

        /// <inheritdoc/>
        public async Task<MovieLookupResult?> LookupByUpcAsync(string upc)
        {
            if (string.IsNullOrWhiteSpace(_apiKey))
            {
                return null;
            }

            // Step 1: resolve UPC → product title via UPC Item DB (free trial, no auth required)
            var title = await ResolveUpcTitleAsync(upc);
            if (string.IsNullOrWhiteSpace(title))
            {
                return null;
            }

            // Step 2: search OMDb by the resolved title
            var results = await SearchByTitleAsync(title);
            return results.FirstOrDefault();
        }

        /// <inheritdoc/>
        public async Task<IEnumerable<MovieLookupResult>> SearchByTitleAsync(string title)
        {
            if (string.IsNullOrWhiteSpace(_apiKey))
            {
                return Array.Empty<MovieLookupResult>();
            }

            try
            {
                var searchUrl = $"/?apikey={Uri.EscapeDataString(_apiKey)}&s={Uri.EscapeDataString(title)}&type=movie";
                var response = await _httpClient.GetAsync(searchUrl);
                if (!response.IsSuccessStatusCode)
                {
                    return Array.Empty<MovieLookupResult>();
                }

                var json = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;

                if (!root.TryGetProperty("Search", out var searchResults))
                {
                    return Array.Empty<MovieLookupResult>();
                }

                var results = new List<MovieLookupResult>();
                foreach (var item in searchResults.EnumerateArray())
                {
                    if (!item.TryGetProperty("imdbID", out var idEl))
                    {
                        continue;
                    }

                    var imdbId = idEl.GetString() ?? string.Empty;
                    var detail = await FetchDetailByImdbIdAsync(imdbId);
                    if (detail != null)
                    {
                        results.Add(detail);
                    }
                }

                return results;
            }
            catch (Exception)
            {
                return Array.Empty<MovieLookupResult>();
            }
        }

        // ── private helpers ────────────────────────────────────────────────────

        /// <summary>
        /// Resolves a UPC barcode to a product title using the UPC Item DB trial API.
        /// Returns <c>null</c> if the UPC is not found or the request fails.
        /// </summary>
        private async Task<string?> ResolveUpcTitleAsync(string upc)
        {
            try
            {
                var response = await _upcHttpClient.GetAsync($"/prod/trial/lookup?upc={Uri.EscapeDataString(upc)}");
                if (!response.IsSuccessStatusCode)
                {
                    return null;
                }

                var json = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;

                if (!root.TryGetProperty("items", out var items))
                {
                    return null;
                }

                foreach (var item in items.EnumerateArray())
                {
                    if (item.TryGetProperty("title", out var titleEl))
                    {
                        return titleEl.GetString();
                    }
                }
            }
            catch (Exception)
            {
                // Network or parse error — treat as not found
            }

            return null;
        }

        private async Task<MovieLookupResult?> FetchDetailByImdbIdAsync(string imdbId)
        {
            try
            {
                var url = $"/?apikey={Uri.EscapeDataString(_apiKey)}&i={Uri.EscapeDataString(imdbId)}&plot=short";
                var response = await _httpClient.GetAsync(url);
                if (!response.IsSuccessStatusCode)
                {
                    return null;
                }

                var json = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;

                if (root.TryGetProperty("Response", out var resp) && resp.GetString() == "False")
                {
                    return null;
                }

                return ParseFromOmdbDetail(root);
            }
            catch (Exception)
            {
                return null;
            }
        }

        private static MovieLookupResult ParseFromOmdbDetail(JsonElement el)
        {
            var result = new MovieLookupResult();

            if (el.TryGetProperty("Title", out var title))
            {
                result.Title = title.GetString() ?? string.Empty;
            }

            if (el.TryGetProperty("Director", out var director))
            {
                result.Director = director.GetString() ?? string.Empty;
            }

            if (el.TryGetProperty("Year", out var year))
            {
                var yearStr = year.GetString() ?? string.Empty;
                // Year may be "2010" or "2010–2015" for series
                if (int.TryParse(yearStr.Length >= 4 ? yearStr[..4] : yearStr, out var y))
                {
                    result.ReleaseYear = y;
                }
            }

            if (el.TryGetProperty("Genre", out var genre))
            {
                result.Genre = genre.GetString() ?? string.Empty;
            }

            if (el.TryGetProperty("Plot", out var plot))
            {
                result.Description = plot.GetString() ?? string.Empty;
            }

            if (el.TryGetProperty("Poster", out var poster) && poster.GetString() != "N/A")
            {
                result.CoverUrl = poster.GetString() ?? string.Empty;
            }

            if (el.TryGetProperty("Rated", out var rated))
            {
                result.Rating = rated.GetString() ?? string.Empty;
            }

            if (el.TryGetProperty("Runtime", out var runtime))
            {
                result.Runtime = runtime.GetString() ?? string.Empty;
            }

            if (el.TryGetProperty("Actors", out var actors))
            {
                result.Cast = actors.GetString() ?? string.Empty;
            }

            if (el.TryGetProperty("imdbID", out var imdbId))
            {
                result.ImdbId = imdbId.GetString() ?? string.Empty;
            }

            return result;
        }
    }
}
