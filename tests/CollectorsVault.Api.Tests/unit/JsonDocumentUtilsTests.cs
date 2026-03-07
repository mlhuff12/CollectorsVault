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
        // -- TryParseJson ------------------------------------------------------

        [Fact]
        public void TryParseJson_WhenInputIsNull_ReturnsNull()
        {
            // Arrange
            // Act
            var result = JsonDocumentUtils.TryParseJson(null);

            // Assert
            Assert.Null(result);
        }

        [Fact]
        public void TryParseJson_WhenInputIsEmpty_ReturnsNull()
        {
            // Arrange
            // Act
            var result = JsonDocumentUtils.TryParseJson(string.Empty);

            // Assert
            Assert.Null(result);
        }

        [Fact]
        public void TryParseJson_WhenInputIsWhitespace_ReturnsNull()
        {
            // Arrange
            // Act
            var result = JsonDocumentUtils.TryParseJson("   ");

            // Assert
            Assert.Null(result);
        }

        [Fact]
        public void TryParseJson_WhenInputIsMalformedJson_ReturnsNull()
        {
            // Arrange
            // Act
            var result = JsonDocumentUtils.TryParseJson("not valid json {{{");

            // Assert
            Assert.Null(result);
        }

        [Fact]
        public void TryParseJson_WhenInputIsValidJson_ReturnsParsedDocument()
        {
            // Arrange
            // Act
            const string json = @"{""title"": ""The Hobbit"", ""year"": 1937}";

            using var result = JsonDocumentUtils.TryParseJson(json);

            // Assert
            Assert.NotNull(result);
            Assert.Equal("The Hobbit", result!.RootElement.GetProperty("title").GetString());
            Assert.Equal(1937, result.RootElement.GetProperty("year").GetInt32());
        }

        [Fact]
        public void TryParseJson_WhenInputIsJsonArray_ReturnsParsedDocument()
        {
            // Arrange
            // Act
            const string json = @"[""Animorphs #1"", ""Animorphs #2""]";

            using var result = JsonDocumentUtils.TryParseJson(json);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(JsonValueKind.Array, result!.RootElement.ValueKind);
            Assert.Equal(2, result.RootElement.GetArrayLength());
        }

        [Fact]
        public void TryParseJson_WhenInputIsEmptyJsonObject_ReturnsParsedDocument()
        {
            // Arrange
            // Act
            using var result = JsonDocumentUtils.TryParseJson("{}");

            // Assert
            Assert.NotNull(result);
            Assert.Equal(JsonValueKind.Object, result!.RootElement.ValueKind);
        }

        // -- ParseResponseAsync -------------------------------------------------

        [Fact]
        public async Task ParseResponseAsync_WhenResponseIsNonSuccess_ReturnsNull()
        {
            // Arrange
            var response = new HttpResponseMessage(HttpStatusCode.NotFound);

            // Act
            var result = await JsonDocumentUtils.ParseResponseAsync(response);

            // Assert
            Assert.Null(result);
        }

        [Fact]
        public async Task ParseResponseAsync_WhenResponseBodyIsMalformedJson_ReturnsNull()
        {
            // Arrange
            var response = new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("not valid json {{{", Encoding.UTF8, "application/json")
            };

            // Act
            var result = await JsonDocumentUtils.ParseResponseAsync(response);

            // Assert
            Assert.Null(result);
        }

        [Fact]
        public async Task ParseResponseAsync_WhenResponseBodyIsEmpty_ReturnsNull()
        {
            // Arrange
            var response = new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(string.Empty, Encoding.UTF8, "application/json")
            };

            // Act
            var result = await JsonDocumentUtils.ParseResponseAsync(response);

            // Assert
            Assert.Null(result);
        }

        [Fact]
        public async Task ParseResponseAsync_WhenResponseIsSuccessWithValidJson_ReturnsParsedDocument()
        {
            // Arrange
            // Act
            const string json = @"{""isbn"": ""0590629778"", ""series"": [""Animorphs #1""]}";
            var response = new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json")
            };

            using var result = await JsonDocumentUtils.ParseResponseAsync(response);

            // Assert
            Assert.NotNull(result);
            Assert.Equal("0590629778", result!.RootElement.GetProperty("isbn").GetString());
        }

        [Fact]
        public async Task ParseResponseAsync_WhenStatusCodeIs500_ReturnsNull()
        {
            // Arrange
            var response = new HttpResponseMessage(HttpStatusCode.InternalServerError)
            {
                Content = new StringContent(@"{""error"": ""server error""}")
            };

            // Act
            var result = await JsonDocumentUtils.ParseResponseAsync(response);

            // Assert
            Assert.Null(result);
        }
    }
}


