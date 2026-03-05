using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using CollectorsVault.Server.Contracts;
using Microsoft.Extensions.Configuration;

namespace CollectorsVault.Server.Services
{
    /// <summary>
    /// <see cref="IGameLookupService"/> implementation backed by the IGDB API (https://api.igdb.com/v4/).
    /// <para>
    /// IGDB requires a Twitch application client ID and client secret for OAuth2 authentication.
    /// Configure these in <c>Igdb:ClientId</c> and <c>Igdb:ClientSecret</c>
    /// (appsettings / user-secrets / environment variables).
    /// Without both credentials, lookups return empty results.
    /// </para>
    /// <para>
    /// UPC barcode lookup queries IGDB's <c>/games</c> endpoint filtering by the barcode's
    /// associated external reference. Title search uses a fuzzy text search.
    /// </para>
    /// </summary>
    public class IgdbGameLookupService : IGameLookupService
    {
        private readonly HttpClient _igdbClient;
        private readonly HttpClient _twitchClient;
        private readonly string _clientId;
        private readonly string _clientSecret;

        // Cached access token and its expiry
        private string? _accessToken;
        private DateTime _tokenExpiry = DateTime.MinValue;

        public IgdbGameLookupService(IHttpClientFactory httpClientFactory, IConfiguration configuration)
        {
            _igdbClient = httpClientFactory.CreateClient("Igdb");
            _twitchClient = httpClientFactory.CreateClient("Twitch");
            _clientId = configuration["Igdb:ClientId"] ?? string.Empty;
            _clientSecret = configuration["Igdb:ClientSecret"] ?? string.Empty;
        }

        /// <inheritdoc/>
        public async Task<GameLookupResult?> LookupByUpcAsync(string upc)
        {
            if (!HasCredentials())
            {
                return null;
            }

            var token = await GetAccessTokenAsync();
            if (string.IsNullOrEmpty(token))
            {
                return null;
            }

            try
            {
                // IGDB stores EAN/UPC values in the external_games endpoint
                var body = $"fields game.name,game.platforms.name,game.first_release_date,game.genres.name,game.summary,game.cover.url,game.involved_companies.company.name,game.involved_companies.developer,game.involved_companies.publisher; where uid = \"{upc}\" & category = 1; limit 1;";
                var result = await QueryIgdbAsync("external_games", body, token);
                return result.Count > 0 ? result[0] : null;
            }
            catch (Exception)
            {
                return null;
            }
        }

        /// <inheritdoc/>
        public async Task<IEnumerable<GameLookupResult>> SearchByTitleAsync(string title)
        {
            if (!HasCredentials())
            {
                return Array.Empty<GameLookupResult>();
            }

            var token = await GetAccessTokenAsync();
            if (string.IsNullOrEmpty(token))
            {
                return Array.Empty<GameLookupResult>();
            }

            try
            {
                var sanitized = title.Replace("\"", "\\\"");
                var body = $"fields name,platforms.name,first_release_date,genres.name,summary,cover.url,involved_companies.company.name,involved_companies.developer,involved_companies.publisher; search \"{sanitized}\"; limit 5;";
                return await QueryIgdbGamesAsync(body, token);
            }
            catch (Exception)
            {
                return Array.Empty<GameLookupResult>();
            }
        }

        // ── private helpers ────────────────────────────────────────────────────

        private bool HasCredentials() =>
            !string.IsNullOrWhiteSpace(_clientId) && !string.IsNullOrWhiteSpace(_clientSecret);

        /// <summary>
        /// Obtains (or returns cached) OAuth2 access token from Twitch.
        /// </summary>
        private async Task<string?> GetAccessTokenAsync()
        {
            if (!string.IsNullOrEmpty(_accessToken) && DateTime.UtcNow < _tokenExpiry)
            {
                return _accessToken;
            }

            try
            {
                var url = $"/oauth2/token?client_id={Uri.EscapeDataString(_clientId)}&client_secret={Uri.EscapeDataString(_clientSecret)}&grant_type=client_credentials";
                var response = await _twitchClient.PostAsync(url, new StringContent(string.Empty));
                if (!response.IsSuccessStatusCode)
                {
                    return null;
                }

                var json = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;

                _accessToken = root.TryGetProperty("access_token", out var at) ? at.GetString() : null;
                if (root.TryGetProperty("expires_in", out var exp) && exp.ValueKind == JsonValueKind.Number)
                {
                    _tokenExpiry = DateTime.UtcNow.AddSeconds(exp.GetInt32() - 60);
                }

                return _accessToken;
            }
            catch (Exception)
            {
                return null;
            }
        }

        /// <summary>
        /// Posts an Apicalypse query to an IGDB endpoint and returns parsed game results.
        /// Used for the external_games endpoint where game data is nested.
        /// </summary>
        private async Task<List<GameLookupResult>> QueryIgdbAsync(string endpoint, string body, string token)
        {
            var request = new HttpRequestMessage(HttpMethod.Post, $"/v4/{endpoint}");
            request.Headers.Add("Client-ID", _clientId);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            request.Content = new StringContent(body, Encoding.UTF8, "text/plain");

            var response = await _igdbClient.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                return new List<GameLookupResult>();
            }

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);

            var results = new List<GameLookupResult>();
            foreach (var item in doc.RootElement.EnumerateArray())
            {
                if (item.TryGetProperty("game", out var game))
                {
                    results.Add(ParseGame(game));
                }
            }

            return results;
        }

        /// <summary>
        /// Posts an Apicalypse query to the IGDB /games endpoint and returns parsed results.
        /// </summary>
        private async Task<List<GameLookupResult>> QueryIgdbGamesAsync(string body, string token)
        {
            var request = new HttpRequestMessage(HttpMethod.Post, "/v4/games");
            request.Headers.Add("Client-ID", _clientId);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            request.Content = new StringContent(body, Encoding.UTF8, "text/plain");

            var response = await _igdbClient.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                return new List<GameLookupResult>();
            }

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);

            var results = new List<GameLookupResult>();
            foreach (var item in doc.RootElement.EnumerateArray())
            {
                results.Add(ParseGame(item));
            }

            return results;
        }

        private static GameLookupResult ParseGame(JsonElement el)
        {
            var result = new GameLookupResult();

            if (el.TryGetProperty("id", out var id) && id.ValueKind == JsonValueKind.Number)
            {
                result.IgdbId = id.GetInt64();
            }

            if (el.TryGetProperty("name", out var name))
            {
                result.Title = name.GetString() ?? string.Empty;
            }

            if (el.TryGetProperty("summary", out var summary))
            {
                result.Description = summary.GetString() ?? string.Empty;
            }

            if (el.TryGetProperty("first_release_date", out var releaseTs) && releaseTs.ValueKind == JsonValueKind.Number)
            {
                result.ReleaseYear = DateTimeOffset.FromUnixTimeSeconds(releaseTs.GetInt64()).Year;
            }

            if (el.TryGetProperty("platforms", out var platforms))
            {
                var names = new List<string>();
                foreach (var p in platforms.EnumerateArray())
                {
                    if (p.TryGetProperty("name", out var pName))
                    {
                        names.Add(pName.GetString() ?? string.Empty);
                    }
                }
                result.Platform = string.Join(", ", names);
            }

            if (el.TryGetProperty("genres", out var genres))
            {
                var names = new List<string>();
                foreach (var g in genres.EnumerateArray())
                {
                    if (g.TryGetProperty("name", out var gName))
                    {
                        names.Add(gName.GetString() ?? string.Empty);
                    }
                }
                result.Genre = string.Join(", ", names);
            }

            if (el.TryGetProperty("cover", out var cover) && cover.TryGetProperty("url", out var coverUrl))
            {
                var url = coverUrl.GetString() ?? string.Empty;
                // IGDB cover URLs start with "//"; make them https
                if (url.StartsWith("//"))
                {
                    url = "https:" + url;
                }
                // Replace "t_thumb" with "t_cover_big" for a larger image
                result.CoverUrl = url.Replace("t_thumb", "t_cover_big");
            }

            if (el.TryGetProperty("involved_companies", out var companies))
            {
                var developers = new List<string>();
                var publishers = new List<string>();
                foreach (var company in companies.EnumerateArray())
                {
                    var companyName = string.Empty;
                    if (company.TryGetProperty("company", out var companyEl) && companyEl.TryGetProperty("name", out var cName))
                    {
                        companyName = cName.GetString() ?? string.Empty;
                    }

                    if (!string.IsNullOrEmpty(companyName))
                    {
                        if (company.TryGetProperty("developer", out var devFlag) && devFlag.GetBoolean())
                        {
                            developers.Add(companyName);
                        }
                        if (company.TryGetProperty("publisher", out var pubFlag) && pubFlag.GetBoolean())
                        {
                            publishers.Add(companyName);
                        }
                    }
                }
                result.Developer = string.Join(", ", developers);
                result.Publisher = string.Join(", ", publishers);
            }

            return result;
        }
    }
}
