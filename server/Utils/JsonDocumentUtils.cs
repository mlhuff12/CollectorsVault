using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;

namespace CollectorsVault.Server.Utils
{
    /// <summary>
    /// Utility methods for reading and parsing JSON from HTTP responses.
    /// </summary>
    public static class JsonDocumentUtils
    {
        /// <summary>
        /// Reads the body of <paramref name="response"/> and parses it as a
        /// <see cref="JsonDocument"/>.
        /// </summary>
        /// <param name="response">The HTTP response to read.</param>
        /// <returns>
        /// A parsed <see cref="JsonDocument"/> when the response is successful and the
        /// body is valid JSON; otherwise <see langword="null"/>.
        /// </returns>
        /// <remarks>
        /// The caller is responsible for disposing the returned <see cref="JsonDocument"/>.
        /// Returns <see langword="null"/> instead of throwing on non-success status codes
        /// or malformed JSON.
        /// </remarks>
        public static async Task<JsonDocument?> ParseResponseAsync(HttpResponseMessage response)
        {
            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            var json = await response.Content.ReadAsStringAsync();
            return TryParseJson(json);
        }

        /// <summary>
        /// Attempts to parse <paramref name="json"/> as a <see cref="JsonDocument"/>.
        /// </summary>
        /// <param name="json">The JSON string to parse.</param>
        /// <returns>
        /// A <see cref="JsonDocument"/> on success, or <see langword="null"/> if the
        /// input is null, empty, or not valid JSON.
        /// </returns>
        /// <remarks>The caller is responsible for disposing the returned document.</remarks>
        public static JsonDocument? TryParseJson(string? json)
        {
            if (string.IsNullOrWhiteSpace(json))
            {
                return null;
            }

            try
            {
                return JsonDocument.Parse(json);
            }
            catch (JsonException)
            {
                return null;
            }
        }
    }
}
