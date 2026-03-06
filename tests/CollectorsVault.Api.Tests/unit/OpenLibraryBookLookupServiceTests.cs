using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using CollectorsVault.Server.Services;
using Moq;
using Moq.Protected;
using Xunit;

namespace CollectorsVault.Api.Tests.Unit
{
    /// <summary>
    /// Unit tests for <see cref="OpenLibraryBookLookupService"/> that verify HTTP-level behaviour
    /// by mocking <see cref="HttpMessageHandler"/>.
    /// </summary>
    [Trait("Category", "Unit")]
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
                ("/isbn/", NotFound()),
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
                ("/isbn/", NotFound()),
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
                ("/isbn/", NotFound()),
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
                ("/isbn/", NotFound()),
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
                ("/isbn/", NotFound()),
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

            // No work key → work endpoint must NOT be called; edition endpoint is always called.
            var (service, _) = CreateService(
                ("/api/books", Ok(booksJson)),
                ("/isbn/", NotFound()));

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
                ("/isbn/", NotFound()),
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
                ("/isbn/", NotFound()),
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

            // No work key → work endpoint must NOT be called; edition endpoint is always called.
            var (service, _) = CreateService(
                ("/api/books", Ok(booksJson)),
                ("/isbn/", NotFound()));

            var result = await service.LookupByIsbnAsync("9780547928227");

            Assert.NotNull(result);
            Assert.Equal("An edition-level object description.", result!.Description);
        }

        // ── Series lookup — edition level (primary source) ─────────────────────

        [Fact]
        public async Task LookupByIsbnAsync_PopulatesSeriesName_WhenEditionHasSeriesField()
        {
            // The /isbn/{isbn}.json endpoint exposes a "series" array at the edition level.
            // This is the most direct and reliable source — it is checked first.
            const string booksJson = @"{
                ""ISBN:0590629778"": {
                    ""title"": ""The Invasion"",
                    ""works"": [{""key"": ""/works/OL7872220W""}]
                }
            }";
            const string editionJson = @"{""series"": [""Animorphs #1""]}";
            const string workJson = @"{""description"": ""A shape-shifting adventure.""}";

            var (service, _) = CreateService(
                ("/api/books", Ok(booksJson)),
                ("/isbn/", Ok(editionJson)),
                ("/works/", Ok(workJson)));

            var result = await service.LookupByIsbnAsync("0590629778");

            Assert.NotNull(result);
            Assert.Equal("Animorphs", result!.SeriesName);
            Assert.Equal(1, result.SeriesNumber);
            Assert.False(result.SeriesNotFound);
        }

        [Fact]
        public async Task LookupByIsbnAsync_PopulatesSeriesName_WhenEditionHasSemicolonFormat()
        {
            // Open Library also uses "Name ; N" or "Name ; bk. N" as the series string format.
            const string booksJson = @"{
                ""ISBN:0439064864"": {
                    ""title"": ""Harry Potter and the Chamber of Secrets"",
                    ""works"": [{""key"": ""/works/OL82592W""}]
                }
            }";
            const string editionJson = @"{""series"": [""Harry Potter ; 2""]}";
            const string workJson = @"{""description"": ""Harry returns to Hogwarts.""}";

            var (service, _) = CreateService(
                ("/api/books", Ok(booksJson)),
                ("/isbn/", Ok(editionJson)),
                ("/works/", Ok(workJson)));

            var result = await service.LookupByIsbnAsync("0439064864");

            Assert.NotNull(result);
            Assert.Equal("Harry Potter", result!.SeriesName);
            Assert.Equal(2, result.SeriesNumber);
            Assert.False(result.SeriesNotFound);
        }

        [Fact]
        public async Task LookupByIsbnAsync_EditionSeriesTakesPriorityOverWorkSeries()
        {
            // The edition-level series is checked first; the work-level series is the fallback.
            const string booksJson = @"{
                ""ISBN:0590629778"": {
                    ""title"": ""The Invasion"",
                    ""works"": [{""key"": ""/works/OL7872220W""}]
                }
            }";
            const string editionJson = @"{""series"": [""Animorphs #1""]}";
            // Work also has series — edition should take priority.
            const string workJson = @"{""series"": [""SomethingElse #99""], ""description"": ""A shape-shifting adventure.""}";

            var (service, _) = CreateService(
                ("/api/books", Ok(booksJson)),
                ("/isbn/", Ok(editionJson)),
                ("/works/", Ok(workJson)));

            var result = await service.LookupByIsbnAsync("0590629778");

            Assert.NotNull(result);
            Assert.Equal("Animorphs", result!.SeriesName);
            Assert.Equal(1, result.SeriesNumber);
        }

        // ── Series lookup — work level (fallback when edition has none) ─────────

        [Fact]
        public async Task LookupByIsbnAsync_FallsBackToWorkSeries_WhenEditionHasNone()
        {
            const string booksJson = @"{
                ""ISBN:0590629778"": {
                    ""title"": ""The Invasion"",
                    ""works"": [{""key"": ""/works/OL7872220W""}]
                }
            }";
            const string editionJson = @"{""title"": ""The Invasion""}";  // no series field
            const string workJson = @"{""series"": [""Animorphs #1""]}";

            var (service, _) = CreateService(
                ("/api/books", Ok(booksJson)),
                ("/isbn/", Ok(editionJson)),
                ("/works/", Ok(workJson)));

            var result = await service.LookupByIsbnAsync("0590629778");

            Assert.NotNull(result);
            Assert.Equal("Animorphs", result!.SeriesName);
            Assert.Equal(1, result.SeriesNumber);
            Assert.False(result.SeriesNotFound);
        }

        [Fact]
        public async Task LookupByIsbnAsync_LeavesSeriesEmpty_WhenNeitherEditionNorWorkHasSeries()
        {
            const string booksJson = @"{
                ""ISBN:9780547928227"": {
                    ""title"": ""The Hobbit"",
                    ""works"": [{""key"": ""/works/OL262059W""}]
                }
            }";
            const string editionJson = @"{""title"": ""The Hobbit""}";  // no series
            const string workJson = @"{""description"": ""A hobbit's adventure.""}";  // no series

            var (service, _) = CreateService(
                ("/api/books", Ok(booksJson)),
                ("/isbn/", Ok(editionJson)),
                ("/works/", Ok(workJson)));

            var result = await service.LookupByIsbnAsync("9780547928227");

            Assert.NotNull(result);
            Assert.Equal(string.Empty, result!.SeriesName);
            Assert.Null(result.SeriesNumber);
            Assert.False(result.SeriesNotFound);
        }

        [Fact]
        public async Task LookupByIsbnAsync_LeavesSeriesEmpty_WhenEditionEndpointFails()
        {
            const string booksJson = @"{
                ""ISBN:0590629778"": {
                    ""title"": ""The Invasion"",
                    ""works"": [{""key"": ""/works/OL7872220W""}]
                }
            }";
            const string workJson = @"{""description"": ""A shape-shifting adventure.""}";

            var (service, _) = CreateService(
                ("/api/books", Ok(booksJson)),
                ("/isbn/", NotFound()),
                ("/works/", Ok(workJson)));

            var result = await service.LookupByIsbnAsync("0590629778");

            Assert.NotNull(result);
            Assert.Equal(string.Empty, result!.SeriesName);
        }

        // ── Series lookup — subject tag fallback ──────────────────────────────

        [Fact]
        public async Task LookupByIsbnAsync_PopulatesSeriesName_FromSubjectTag_WhenNoOtherSeriesFound()
        {
            const string booksJson = @"{
                ""ISBN:0590629778"": {
                    ""title"": ""The Invasion"",
                    ""subjects"": [{""name"": ""series:Animorphs""}],
                    ""works"": [{""key"": ""/works/OL7872220W""}]
                }
            }";
            const string editionJson = @"{""title"": ""The Invasion""}";  // no series field
            const string workJson = @"{""description"": ""A shape-shifting adventure.""}";  // no series field

            var (service, _) = CreateService(
                ("/api/books", Ok(booksJson)),
                ("/isbn/", Ok(editionJson)),
                ("/works/", Ok(workJson)));

            var result = await service.LookupByIsbnAsync("0590629778");

            Assert.NotNull(result);
            Assert.Equal("Animorphs", result!.SeriesName);
            Assert.Null(result.SeriesNumber);
            Assert.True(result.SeriesNotFound);
        }

        [Fact]
        public async Task LookupByIsbnAsync_SubjectTagSeriesNotUsed_WhenEditionSeriesAlreadyFound()
        {
            // When edition series is available, the subject tag fallback should not override it.
            const string booksJson = @"{
                ""ISBN:0590629778"": {
                    ""title"": ""The Invasion"",
                    ""subjects"": [{""name"": ""series:WrongSeries""}],
                    ""works"": [{""key"": ""/works/OL7872220W""}]
                }
            }";
            const string editionJson = @"{""series"": [""Animorphs #1""]}";
            const string workJson = @"{""description"": ""A shape-shifting adventure.""}";

            var (service, _) = CreateService(
                ("/api/books", Ok(booksJson)),
                ("/isbn/", Ok(editionJson)),
                ("/works/", Ok(workJson)));

            var result = await service.LookupByIsbnAsync("0590629778");

            Assert.NotNull(result);
            Assert.Equal("Animorphs", result!.SeriesName);
            Assert.Equal(1, result.SeriesNumber);
            Assert.False(result.SeriesNotFound);
        }

        // ── physical_format → BookFormat ──────────────────────────────────────

        [Fact]
        public async Task LookupByIsbnAsync_PopulatesBookFormat_WhenPhysicalFormatPresent()
        {
            const string booksJson = @"{
                ""ISBN:9780547928227"": {
                    ""title"": ""The Hobbit"",
                    ""physical_format"": ""Paperback""
                }
            }";

            var (service, _) = CreateService(
                ("/api/books", Ok(booksJson)),
                ("/isbn/", NotFound()));

            var result = await service.LookupByIsbnAsync("9780547928227");

            Assert.NotNull(result);
            Assert.Equal(CollectorsVault.Server.Models.BookFormat.Paperback, result!.BookFormat);
        }

        [Fact]
        public async Task LookupByIsbnAsync_LeavesBookFormatNull_WhenPhysicalFormatAbsent()
        {
            const string booksJson = @"{
                ""ISBN:9780547928227"": {
                    ""title"": ""The Hobbit""
                }
            }";

            var (service, _) = CreateService(
                ("/api/books", Ok(booksJson)),
                ("/isbn/", NotFound()));

            var result = await service.LookupByIsbnAsync("9780547928227");

            Assert.NotNull(result);
            Assert.Null(result!.BookFormat);
        }

        // ── ParseSeriesString unit tests ────────────────────────────────────────

        [Theory]
        [InlineData("Animorphs #1", "Animorphs", 1)]
        [InlineData("Animorphs #12", "Animorphs", 12)]
        [InlineData("Harry Potter, Book 1", "Harry Potter", 1)]
        [InlineData("Harry Potter, 3", "Harry Potter", 3)]
        [InlineData("Harry Potter ; 3", "Harry Potter", 3)]
        [InlineData("His Dark Materials ; bk. 1", "His Dark Materials", 1)]
        [InlineData("Narnia ; bk. 2", "Narnia", 2)]
        [InlineData("Animorphs", "Animorphs", null)]
        public void ParseSeriesString_ParsesNameAndNumber(string input, string expectedName, int? expectedNumber)
        {
            var (name, number) = OpenLibraryBookLookupService.ParseSeriesString(input);
            Assert.Equal(expectedName, name);
            Assert.Equal(expectedNumber, number);
        }
    }
}
