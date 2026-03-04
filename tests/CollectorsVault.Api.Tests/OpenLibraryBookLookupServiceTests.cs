using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using CollectorsVault.Server.Services;
using Moq;
using Moq.Protected;
using Xunit;

namespace CollectorsVault.Api.Tests
{
    /// <summary>
    /// Unit tests for <see cref="OpenLibraryBookLookupService"/> that verify HTTP-level behaviour
    /// by mocking <see cref="HttpMessageHandler"/>.
    /// </summary>
    public class OpenLibraryBookLookupServiceTests
    {
        // ── helpers ────────────────────────────────────────────────────────────

        private static (OpenLibraryBookLookupService service, Mock<HttpMessageHandler> handlerMock)
            CreateService(params (string urlContains, HttpResponseMessage response)[] mappings)
        {
            var handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);

            foreach (var (urlContains, resp) in mappings)
            {
                handlerMock
                    .Protected()
                    .Setup<Task<HttpResponseMessage>>(
                        "SendAsync",
                        ItExpr.Is<HttpRequestMessage>(r => r.RequestUri!.ToString().Contains(urlContains)),
                        ItExpr.IsAny<CancellationToken>())
                    .ReturnsAsync(resp);
            }

            var client = new HttpClient(handlerMock.Object)
            {
                BaseAddress = new System.Uri("https://openlibrary.org")
            };

            return (new OpenLibraryBookLookupService(client), handlerMock);
        }

        private static HttpResponseMessage Ok(string body)
            => new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(body)
            };

        private static HttpResponseMessage NotFound()
            => new HttpResponseMessage(HttpStatusCode.NotFound);

        // ── LookupByIsbnAsync ──────────────────────────────────────────────────

        [Fact]
        public async Task LookupByIsbnAsync_ReturnsNull_WhenBooksEndpointReturnsNonSuccess()
        {
            var (service, _) = CreateService(("/api/books", NotFound()));

            var result = await service.LookupByIsbnAsync("9780547928227");

            Assert.Null(result);
        }

        [Fact]
        public async Task LookupByIsbnAsync_ReturnsNull_WhenResponseIsEmptyObject()
        {
            var (service, _) = CreateService(("/api/books", Ok("{}")));

            var result = await service.LookupByIsbnAsync("9780547928227");

            Assert.Null(result);
        }

        [Fact]
        public async Task LookupByIsbnAsync_PopulatesDescription_WhenWorkHasPlainStringDescription()
        {
            const string booksJson = @"{
                ""ISBN:9780547928227"": {
                    ""title"": ""The Hobbit"",
                    ""works"": [{""key"": ""/works/OL262059W""}]
                }
            }";
            const string workJson = @"{""description"": ""In a hole in the ground there lived a hobbit.""}";

            var (service, _) = CreateService(
                ("/api/books", Ok(booksJson)),
                ("/works/", Ok(workJson)));

            var result = await service.LookupByIsbnAsync("9780547928227");

            Assert.NotNull(result);
            Assert.Equal("The Hobbit", result!.Title);
            Assert.Equal("In a hole in the ground there lived a hobbit.", result.Description);
        }

        [Fact]
        public async Task LookupByIsbnAsync_PopulatesDescription_WhenWorkHasObjectFormatDescription()
        {
            const string booksJson = @"{
                ""ISBN:9780547928227"": {
                    ""title"": ""The Hobbit"",
                    ""works"": [{""key"": ""/works/OL262059W""}]
                }
            }";
            const string workJson = @"{
                ""description"": {
                    ""type"": ""/type/text"",
                    ""value"": ""In a hole in the ground there lived a hobbit.""
                }
            }";

            var (service, _) = CreateService(
                ("/api/books", Ok(booksJson)),
                ("/works/", Ok(workJson)));

            var result = await service.LookupByIsbnAsync("9780547928227");

            Assert.NotNull(result);
            Assert.Equal("In a hole in the ground there lived a hobbit.", result!.Description);
        }

        [Fact]
        public async Task LookupByIsbnAsync_LeavesDescriptionEmpty_WhenWorkHasNoDescriptionField()
        {
            const string booksJson = @"{
                ""ISBN:9780547928227"": {
                    ""title"": ""The Hobbit"",
                    ""works"": [{""key"": ""/works/OL262059W""}]
                }
            }";
            const string workJson = @"{""subjects"": [""Fantasy""]}";

            var (service, _) = CreateService(
                ("/api/books", Ok(booksJson)),
                ("/works/", Ok(workJson)));

            var result = await service.LookupByIsbnAsync("9780547928227");

            Assert.NotNull(result);
            Assert.Equal(string.Empty, result!.Description);
        }

        [Fact]
        public async Task LookupByIsbnAsync_LeavesDescriptionEmpty_WhenWorksEndpointReturnsNonSuccess()
        {
            const string booksJson = @"{
                ""ISBN:9780547928227"": {
                    ""title"": ""The Hobbit"",
                    ""works"": [{""key"": ""/works/OL262059W""}]
                }
            }";

            var (service, _) = CreateService(
                ("/api/books", Ok(booksJson)),
                ("/works/", NotFound()));

            var result = await service.LookupByIsbnAsync("9780547928227");

            Assert.NotNull(result);
            Assert.Equal(string.Empty, result!.Description);
        }

        [Fact]
        public async Task LookupByIsbnAsync_LeavesDescriptionEmpty_WhenWorkJsonIsMalformed()
        {
            const string booksJson = @"{
                ""ISBN:9780547928227"": {
                    ""title"": ""The Hobbit"",
                    ""works"": [{""key"": ""/works/OL262059W""}]
                }
            }";

            var (service, _) = CreateService(
                ("/api/books", Ok(booksJson)),
                ("/works/", Ok("not valid json {{{")));

            var result = await service.LookupByIsbnAsync("9780547928227");

            Assert.NotNull(result);
            Assert.Equal(string.Empty, result!.Description);
        }

        [Fact]
        public async Task LookupByIsbnAsync_LeavesDescriptionEmpty_WhenNoWorksKeyPresent()
        {
            const string booksJson = @"{
                ""ISBN:9780547928227"": {
                    ""title"": ""The Hobbit""
                }
            }";

            // Only one mapping — works endpoint must NOT be called
            var (service, _) = CreateService(("/api/books", Ok(booksJson)));

            var result = await service.LookupByIsbnAsync("9780547928227");

            Assert.NotNull(result);
            Assert.Equal(string.Empty, result!.Description);
        }

        [Fact]
        public async Task LookupByIsbnAsync_UsesEditionDescription_WhenWorkHasNoDescription()
        {
            const string booksJson = @"{
                ""ISBN:9780547928227"": {
                    ""title"": ""The Hobbit"",
                    ""description"": ""An edition-level description."",
                    ""works"": [{""key"": ""/works/OL262059W""}]
                }
            }";
            const string workJson = @"{""subjects"": [""Fantasy""]}";

            var (service, _) = CreateService(
                ("/api/books", Ok(booksJson)),
                ("/works/", Ok(workJson)));

            var result = await service.LookupByIsbnAsync("9780547928227");

            Assert.NotNull(result);
            Assert.Equal("An edition-level description.", result!.Description);
        }

        [Fact]
        public async Task LookupByIsbnAsync_PrefersWorkDescription_OverEditionDescription()
        {
            const string booksJson = @"{
                ""ISBN:9780547928227"": {
                    ""title"": ""The Hobbit"",
                    ""description"": ""An edition-level description."",
                    ""works"": [{""key"": ""/works/OL262059W""}]
                }
            }";
            const string workJson = @"{""description"": ""The authoritative work-level description.""}";

            var (service, _) = CreateService(
                ("/api/books", Ok(booksJson)),
                ("/works/", Ok(workJson)));

            var result = await service.LookupByIsbnAsync("9780547928227");

            Assert.NotNull(result);
            Assert.Equal("The authoritative work-level description.", result!.Description);
        }

        [Fact]
        public async Task LookupByIsbnAsync_UsesEditionDescription_WhenNoWorksKey()
        {
            const string booksJson = @"{
                ""ISBN:9780547928227"": {
                    ""title"": ""The Hobbit"",
                    ""description"": {
                        ""type"": ""/type/text"",
                        ""value"": ""An edition-level object description.""
                    }
                }
            }";

            // Only one mapping — works endpoint must NOT be called
            var (service, _) = CreateService(("/api/books", Ok(booksJson)));

            var result = await service.LookupByIsbnAsync("9780547928227");

            Assert.NotNull(result);
            Assert.Equal("An edition-level object description.", result!.Description);
        }

        // ── Series lookup — direct work series field ───────────────────────────

        [Fact]
        public async Task LookupByIsbnAsync_PopulatesSeriesName_WhenWorkHasSeriesField()
        {
            const string booksJson = @"{
                ""ISBN:0590629778"": {
                    ""title"": ""The Invasion"",
                    ""works"": [{""key"": ""/works/OL7872220W""}]
                }
            }";
            const string workJson = @"{""series"": [""Animorphs #1""]}";

            var (service, _) = CreateService(
                ("/api/books", Ok(booksJson)),
                ("/works/", Ok(workJson)));

            var result = await service.LookupByIsbnAsync("0590629778");

            Assert.NotNull(result);
            Assert.Equal("Animorphs", result!.SeriesName);
            Assert.Equal(1, result.SeriesNumber);
            Assert.False(result.SeriesNotFound);
        }

        [Fact]
        public async Task LookupByIsbnAsync_PopulatesSeriesNameOnly_WhenWorkSeriesHasNoNumber()
        {
            const string booksJson = @"{
                ""ISBN:0590629778"": {
                    ""title"": ""The Invasion"",
                    ""works"": [{""key"": ""/works/OL7872220W""}]
                }
            }";
            const string workJson = @"{""series"": [""Animorphs""]}";

            var (service, _) = CreateService(
                ("/api/books", Ok(booksJson)),
                ("/works/", Ok(workJson)));

            var result = await service.LookupByIsbnAsync("0590629778");

            Assert.NotNull(result);
            Assert.Equal("Animorphs", result!.SeriesName);
            Assert.Null(result.SeriesNumber);
            Assert.False(result.SeriesNotFound);
        }

        // ── Series lookup — collectionID fallback path ─────────────────────────

        [Fact]
        public async Task LookupByIsbnAsync_UsesCollectionPath_WhenWorkHasNoSeries()
        {
            const string booksJson = @"{
                ""ISBN:0590629778"": {
                    ""title"": ""The Invasion"",
                    ""works"": [{""key"": ""/works/OL7872220W""}],
                    ""subjects"": [
                        {""name"": ""collectionID:Animorphs"", ""url"": ""https://openlibrary.org/subjects/collectionid:animorphs""}
                    ]
                }
            }";
            const string workJson = @"{""description"": ""A shape-shifting adventure.""}";
            const string collectionJson = @"{
                ""works"": [
                    {
                        ""key"": ""/works/OL7872220W"",
                        ""lending_edition"": ""OL24959144M""
                    }
                ]
            }";
            const string lendingEditionJson = @"{""series"": [""Animorphs #1""]}";

            var (service, _) = CreateService(
                ("/api/books", Ok(booksJson)),
                ("/works/OL7872220W", Ok(workJson)),
                ("/subjects/", Ok(collectionJson)),
                ("/works/OL24959144M", Ok(lendingEditionJson)));

            var result = await service.LookupByIsbnAsync("0590629778");

            Assert.NotNull(result);
            Assert.Equal("Animorphs", result!.SeriesName);
            Assert.Equal(1, result.SeriesNumber);
            Assert.False(result.SeriesNotFound);
        }

        [Fact]
        public async Task LookupByIsbnAsync_SetsSeriesNotFound_WhenCollectionPathYieldsNoSeries()
        {
            const string booksJson = @"{
                ""ISBN:0590629778"": {
                    ""title"": ""The Invasion"",
                    ""works"": [{""key"": ""/works/OL7872220W""}],
                    ""subjects"": [
                        {""name"": ""collectionID:Animorphs"", ""url"": ""https://openlibrary.org/subjects/collectionid:animorphs""}
                    ]
                }
            }";
            const string workJson = @"{""description"": ""A shape-shifting adventure.""}";
            const string collectionJson = @"{ ""works"": [] }";

            var (service, _) = CreateService(
                ("/api/books", Ok(booksJson)),
                ("/works/OL7872220W", Ok(workJson)),
                ("/subjects/", Ok(collectionJson)));

            var result = await service.LookupByIsbnAsync("0590629778");

            Assert.NotNull(result);
            Assert.Equal("Animorphs", result!.SeriesName);
            Assert.True(result.SeriesNotFound);
        }

        [Fact]
        public async Task LookupByIsbnAsync_LeavesSeriesEmpty_WhenNoCollectionIdSubject()
        {
            const string booksJson = @"{
                ""ISBN:9780547928227"": {
                    ""title"": ""The Hobbit"",
                    ""works"": [{""key"": ""/works/OL262059W""}],
                    ""subjects"": [
                        {""name"": ""Fantasy fiction"", ""url"": ""https://openlibrary.org/subjects/fantasy_fiction""}
                    ]
                }
            }";
            const string workJson = @"{""description"": ""A hobbit's adventure.""}";

            var (service, _) = CreateService(
                ("/api/books", Ok(booksJson)),
                ("/works/", Ok(workJson)));

            var result = await service.LookupByIsbnAsync("9780547928227");

            Assert.NotNull(result);
            Assert.Equal(string.Empty, result!.SeriesName);
            Assert.Null(result.SeriesNumber);
            Assert.False(result.SeriesNotFound);
        }

        // ── ParseSeriesString unit tests ────────────────────────────────────────

        [Theory]
        [InlineData("Animorphs #1", "Animorphs", 1)]
        [InlineData("Animorphs #12", "Animorphs", 12)]
        [InlineData("Harry Potter, Book 1", "Harry Potter", 1)]
        [InlineData("Harry Potter, 3", "Harry Potter", 3)]
        [InlineData("Animorphs", "Animorphs", null)]
        public void ParseSeriesString_ParsesNameAndNumber(string input, string expectedName, int? expectedNumber)
        {
            var (name, number) = OpenLibraryBookLookupService.ParseSeriesString(input);
            Assert.Equal(expectedName, name);
            Assert.Equal(expectedNumber, number);
        }
    }
}
