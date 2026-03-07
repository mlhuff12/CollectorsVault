using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using CollectorsVault.Server.Utils;
using Xunit;

namespace CollectorsVault.Api.Tests.Unit
{
    /// <summary>
    /// Unit tests for <see cref="JsonDocumentUtils"/>.
    /// </summary>
    [Trait("Category", "Unit")]
    public class JsonDocumentUtilsTests
    {
        // ── TryParseJson ──────────────────────────────────────────────────────

        [Fact]
        public void TryParseJson_ReturnsNull_WhenInputIsNull()
        {
            var result = JsonDocumentUtils.TryParseJson(null);

            Assert.Null(result);
        }

        [Fact]
        public void TryParseJson_ReturnsNull_WhenInputIsEmpty()
        {
            var result = JsonDocumentUtils.TryParseJson(string.Empty);

            Assert.Null(result);
        }

        [Fact]
        public void TryParseJson_ReturnsNull_WhenInputIsWhitespace()
        {
            var result = JsonDocumentUtils.TryParseJson("   ");

            Assert.Null(result);
        }

        [Fact]
        public void TryParseJson_ReturnsNull_WhenInputIsMalformedJson()
        {
            var result = JsonDocumentUtils.TryParseJson("not valid json {{{");

            Assert.Null(result);
        }

        [Fact]
        public void TryParseJson_ReturnsParsedDocument_WhenInputIsValidJson()
        {
            const string json = @"{""title"": ""The Hobbit"", ""year"": 1937}";

            using var result = JsonDocumentUtils.TryParseJson(json);

            Assert.NotNull(result);
            Assert.Equal("The Hobbit", result!.RootElement.GetProperty("title").GetString());
            Assert.Equal(1937, result.RootElement.GetProperty("year").GetInt32());
        }

        [Fact]
        public void TryParseJson_ReturnsParsedDocument_WhenInputIsJsonArray()
        {
            const string json = @"[""Animorphs #1"", ""Animorphs #2""]";

            using var result = JsonDocumentUtils.TryParseJson(json);

            Assert.NotNull(result);
            Assert.Equal(JsonValueKind.Array, result!.RootElement.ValueKind);
            Assert.Equal(2, result.RootElement.GetArrayLength());
        }

        [Fact]
        public void TryParseJson_ReturnsParsedDocument_WhenInputIsEmptyJsonObject()
        {
            using var result = JsonDocumentUtils.TryParseJson("{}");

            Assert.NotNull(result);
            Assert.Equal(JsonValueKind.Object, result!.RootElement.ValueKind);
        }

        // ── ParseResponseAsync ────────────────────────────────────────────────

        [Fact]
        public async Task ParseResponseAsync_ReturnsNull_WhenResponseIsNonSuccess()
        {
            var response = new HttpResponseMessage(HttpStatusCode.NotFound);

            var result = await JsonDocumentUtils.ParseResponseAsync(response);

            Assert.Null(result);
        }

        [Fact]
        public async Task ParseResponseAsync_ReturnsNull_WhenResponseBodyIsMalformedJson()
        {
            var response = new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("not valid json {{{", Encoding.UTF8, "application/json")
            };

            var result = await JsonDocumentUtils.ParseResponseAsync(response);

            Assert.Null(result);
        }

        [Fact]
        public async Task ParseResponseAsync_ReturnsNull_WhenResponseBodyIsEmpty()
        {
            var response = new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(string.Empty, Encoding.UTF8, "application/json")
            };

            var result = await JsonDocumentUtils.ParseResponseAsync(response);

            Assert.Null(result);
        }

        [Fact]
        public async Task ParseResponseAsync_ReturnsParsedDocument_WhenResponseIsSuccessWithValidJson()
        {
            const string json = @"{""isbn"": ""0590629778"", ""series"": [""Animorphs #1""]}";
            var response = new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json")
            };

            using var result = await JsonDocumentUtils.ParseResponseAsync(response);

            Assert.NotNull(result);
            Assert.Equal("0590629778", result!.RootElement.GetProperty("isbn").GetString());
        }

        [Fact]
        public async Task ParseResponseAsync_ReturnsNull_WhenStatusCodeIs500()
        {
            var response = new HttpResponseMessage(HttpStatusCode.InternalServerError)
            {
                Content = new StringContent(@"{""error"": ""server error""}")
            };

            var result = await JsonDocumentUtils.ParseResponseAsync(response);

            Assert.Null(result);
        }
    }
}
