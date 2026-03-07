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
        // -- helpers ----------------------------------------------------------

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

        // -- LookupByIsbnAsync ------------------------------------------------

        [Fact]
        public async Task LookupByIsbnAsync_WhenBooksEndpointReturnsNonSuccess_ReturnsDefaultResult()
        {
            // Arrange
            var (service, _) = CreateService(("/api/books", NotFound()));

            // Act
            var result = await service.LookupByIsbnAsync("9780547928227");

            // Assert
            Assert.NotNull(result);
            Assert.Equal("9780547928227", result!.Isbn);
            Assert.Equal(string.Empty, result.Title);
        }

        [Fact]
        public async Task LookupByIsbnAsync_WhenResponseIsEmptyObject_ReturnsDefaultResult()
        {
            // Arrange
            var (service, _) = CreateService(("/api/books", Ok("{}")));

            // Act
            var result = await service.LookupByIsbnAsync("9780547928227");

            // Assert
            Assert.NotNull(result);
            Assert.Equal("9780547928227", result!.Isbn);
            Assert.Equal(string.Empty, result.Title);
        }

        [Fact]
        public async Task LookupByIsbnAsync_WhenWorkHasPlainStringDescription_PopulatesDescription()
        {
            // Arrange
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

            // Act
            var result = await service.LookupByIsbnAsync("9780547928227");

            // Assert
            Assert.NotNull(result);
            Assert.Equal("The Hobbit", result!.Title);
            Assert.Equal("In a hole in the ground there lived a hobbit.", result.Description);
        }

        [Fact]
        public async Task LookupByIsbnAsync_WhenWorkHasObjectFormatDescription_PopulatesDescription()
        {
            // Arrange
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

            // Act
            var result = await service.LookupByIsbnAsync("9780547928227");

            // Assert
            Assert.NotNull(result);
            Assert.Equal("In a hole in the ground there lived a hobbit.", result!.Description);
        }

        [Fact]
        public async Task LookupByIsbnAsync_WhenWorkHasNoDescriptionField_LeavesDescriptionEmpty()
        {
            // Arrange
            const string booksJson = @"{
                ""ISBN:9780547928227"": {
                    ""title"": ""The Hobbit"",
                    ""works"": [{""key"": ""/works/OL262059W""}]
                }
            }";
            const string workJson = @"{""subjects"": [{""name"": ""Fantasy"", ""url"": ""/subjects/fantasy""}]}";

            var (service, _) = CreateService(
                ("/api/books", Ok(booksJson)),
                ("/isbn/", NotFound()),
                ("/works/", Ok(workJson)));

            // Act
            var result = await service.LookupByIsbnAsync("9780547928227");

            // Assert
            Assert.NotNull(result);
            Assert.Equal(string.Empty, result!.Description);
        }

        [Fact]
        public async Task LookupByIsbnAsync_WhenWorkHasSubjectObjects_PopulatesSubjectsWithNameAndUrl()
        {
            // Arrange
            const string booksJson = @"{
                ""ISBN:9780547928227"": {
                    ""title"": ""The Hobbit"",
                    ""works"": [{""key"": ""/works/OL262059W""}]
                }
            }";
            const string workJson = @"{
                ""subjects"": [
                    {""name"": ""Fantasy"", ""url"": ""/subjects/fantasy""},
                    {""name"": ""Adventure"", ""url"": ""/subjects/adventure""}
                ]
            }";

            var (service, _) = CreateService(
                ("/api/books", Ok(booksJson)),
                ("/isbn/", NotFound()),
                ("/works/", Ok(workJson)));

            // Act
            var result = await service.LookupByIsbnAsync("9780547928227");

            // Assert
            Assert.NotNull(result);
            Assert.Equal(2, result!.Subjects.Count);
            Assert.Equal("Fantasy", result.Subjects[0].Key);
            Assert.Equal("/subjects/fantasy", result.Subjects[0].Value);
            Assert.Equal("Adventure", result.Subjects[1].Key);
            Assert.Equal("/subjects/adventure", result.Subjects[1].Value);
        }

        [Fact]
        public async Task LookupByIsbnAsync_WhenWorksEndpointReturnsNonSuccess_LeavesDescriptionEmpty()
        {
            // Arrange
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

            // Act
            var result = await service.LookupByIsbnAsync("9780547928227");

            // Assert
            Assert.NotNull(result);
            Assert.Equal(string.Empty, result!.Description);
        }

        [Fact]
        public async Task LookupByIsbnAsync_WhenWorkJsonIsMalformed_LeavesDescriptionEmpty()
        {
            // Arrange
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

            // Act
            var result = await service.LookupByIsbnAsync("9780547928227");

            // Assert
            Assert.NotNull(result);
            Assert.Equal(string.Empty, result!.Description);
        }

        [Fact]
        public async Task LookupByIsbnAsync_WhenNoWorksKeyPresent_LeavesDescriptionEmpty()
        {
            // Arrange
            const string booksJson = @"{
                ""ISBN:9780547928227"": {
                    ""title"": ""The Hobbit""
                }
            }";

            // No work key -> work endpoint must NOT be called; edition endpoint is always called.
            var (service, _) = CreateService(
                ("/api/books", Ok(booksJson)),
                ("/isbn/", NotFound()));

            // Act
            var result = await service.LookupByIsbnAsync("9780547928227");

            // Assert
            Assert.NotNull(result);
            Assert.Equal(string.Empty, result!.Description);
        }

        [Fact]
        public async Task LookupByIsbnAsync_WhenWorkHasNoDescription_UsesEditionDescription()
        {
            // Arrange
            const string booksJson = @"{
                ""ISBN:9780547928227"": {
                    ""title"": ""The Hobbit"",
                    ""description"": ""An edition-level description."",
                    ""works"": [{""key"": ""/works/OL262059W""}]
                }
            }";
            const string workJson = @"{""subjects"": [{""name"": ""Fantasy"", ""url"": ""/subjects/fantasy""}]}";

            var (service, _) = CreateService(
                ("/api/books", Ok(booksJson)),
                ("/isbn/", NotFound()),
                ("/works/", Ok(workJson)));

            // Act
            var result = await service.LookupByIsbnAsync("9780547928227");

            // Assert
            Assert.NotNull(result);
            Assert.Equal("An edition-level description.", result!.Description);
        }

        [Fact]
        public async Task LookupByIsbnAsync_WhenEditionDescriptionAlreadySet_PreservesEditionDescription()
        {
            // Arrange
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

            // Act
            var result = await service.LookupByIsbnAsync("9780547928227");

            // Assert
            Assert.NotNull(result);
            Assert.Equal("An edition-level description.", result!.Description);
        }

        [Fact]
        public async Task LookupByIsbnAsync_WhenNoWorksKey_UsesEditionDescription()
        {
            // Arrange
            const string booksJson = @"{
                ""ISBN:9780547928227"": {
                    ""title"": ""The Hobbit"",
                    ""description"": {
                        ""type"": ""/type/text"",
                        ""value"": ""An edition-level object description.""
                    }
                }
            }";

            // No work key -> work endpoint must NOT be called; edition endpoint is always called.
            var (service, _) = CreateService(
                ("/api/books", Ok(booksJson)),
                ("/isbn/", NotFound()));

            // Act
            var result = await service.LookupByIsbnAsync("9780547928227");

            // Assert
            Assert.NotNull(result);
            Assert.Equal("An edition-level object description.", result!.Description);
        }

        // -- Series lookup with refactored flow -------------------------------

        [Fact]
        public async Task LookupByIsbnAsync_WhenSeriesOnlyProvidedByIsbnEndpoint_LeavesSeriesEmpty()
        {
            // Arrange
            // In the refactored flow, series from /isbn/{isbn}.json is not used directly.
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

            // Act
            var result = await service.LookupByIsbnAsync("0590629778");

            // Assert
            Assert.NotNull(result);
            Assert.Equal(string.Empty, result!.SeriesName);
            Assert.Null(result.SeriesNumber);
            Assert.False(result.SeriesNotFound);
        }

        [Fact]
        public async Task LookupByIsbnAsync_WhenSemicolonSeriesOnlyProvidedByIsbnEndpoint_LeavesSeriesEmpty()
        {
            // Arrange
            // Even parseable /isbn series values are ignored by the refactored path.
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

            // Act
            var result = await service.LookupByIsbnAsync("0439064864");

            // Assert
            Assert.NotNull(result);
            Assert.Equal(string.Empty, result!.SeriesName);
            Assert.Null(result.SeriesNumber);
            Assert.False(result.SeriesNotFound);
        }

        [Fact]
        public async Task LookupByIsbnAsync_WhenNoSeriesUrlIsAvailable_LeavesSeriesEmpty()
        {
            // Arrange
            // Refactored series resolution depends on subject-derived series URL and follow-up calls.
            const string booksJson = @"{
                ""ISBN:0590629778"": {
                    ""title"": ""The Invasion"",
                    ""works"": [{""key"": ""/works/OL7872220W""}]
                }
            }";
            const string editionJson = @"{""series"": [""Animorphs #1""]}";
            // Work-level series in this payload does not populate series under current flow.
            const string workJson = @"{""series"": [""SomethingElse #99""], ""description"": ""A shape-shifting adventure.""}";

            var (service, _) = CreateService(
                ("/api/books", Ok(booksJson)),
                ("/isbn/", Ok(editionJson)),
                ("/works/", Ok(workJson)));

            // Act
            var result = await service.LookupByIsbnAsync("0590629778");

            // Assert
            Assert.NotNull(result);
            Assert.Equal(string.Empty, result!.SeriesName);
            Assert.Null(result.SeriesNumber);
        }

        // -- Series lookup current behavior -----------------------------------

        [Fact]
        public async Task LookupByIsbnAsync_WhenWorkProvidesSeriesWithoutSeriesUrlFlow_LeavesSeriesEmpty()
        {
            // Arrange
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

            // Act
            var result = await service.LookupByIsbnAsync("0590629778");

            // Assert
            Assert.NotNull(result);
            Assert.Equal(string.Empty, result!.SeriesName);
            Assert.Null(result.SeriesNumber);
            Assert.False(result.SeriesNotFound);
        }

        [Fact]
        public async Task LookupByIsbnAsync_WhenNeitherEditionNorWorkHasSeries_LeavesSeriesEmpty()
        {
            // Arrange
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

            // Act
            var result = await service.LookupByIsbnAsync("9780547928227");

            // Assert
            Assert.NotNull(result);
            Assert.Equal(string.Empty, result!.SeriesName);
            Assert.Null(result.SeriesNumber);
            Assert.False(result.SeriesNotFound);
        }

        [Fact]
        public async Task LookupByIsbnAsync_WhenEditionEndpointFails_LeavesSeriesEmpty()
        {
            // Arrange
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

            // Act
            var result = await service.LookupByIsbnAsync("0590629778");

            // Assert
            Assert.NotNull(result);
            Assert.Equal(string.Empty, result!.SeriesName);
        }

        // -- Series lookup - subject tag fallback -----------------------------

        [Fact]
        public async Task LookupByIsbnAsync_WhenNoOtherSeriesFoundAndSubjectTagExists_PopulatesSeriesNameFromSubjectTag()
        {
            // Arrange
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

            // Act
            var result = await service.LookupByIsbnAsync("0590629778");

            // Assert
            Assert.NotNull(result);
            Assert.Equal("Animorphs", result!.SeriesName);
            Assert.Null(result.SeriesNumber);
            Assert.False(result.SeriesNotFound);
        }

        [Fact]
        public async Task LookupByIsbnAsync_WhenSeriesSubjectExists_UsesSubjectTagSeriesOverEditionSeries()
        {
            // Arrange
            // In the refactored flow, series can be derived from subject tags.
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

            // Act
            var result = await service.LookupByIsbnAsync("0590629778");

            // Assert
            Assert.NotNull(result);
            Assert.Equal("WrongSeries", result!.SeriesName);
            Assert.Null(result.SeriesNumber);
            Assert.False(result.SeriesNotFound);
        }

        // -- physical_format -> BookFormat ------------------------------------

        [Fact]
        public async Task LookupByIsbnAsync_WhenPhysicalFormatPresent_PopulatesBookFormat()
        {
            // Arrange
            const string booksJson = @"{
                ""ISBN:9780547928227"": {
                    ""title"": ""The Hobbit"",
                    ""physical_format"": ""Paperback""
                }
            }";

            var (service, _) = CreateService(
                ("/api/books", Ok(booksJson)),
                ("/isbn/", NotFound()));

            // Act
            var result = await service.LookupByIsbnAsync("9780547928227");

            // Assert
            Assert.NotNull(result);
            Assert.Equal(CollectorsVault.Server.Models.BookFormat.Paperback, result!.BookFormat);
        }

        [Fact]
        public async Task LookupByIsbnAsync_WhenPhysicalFormatAbsent_LeavesBookFormatNull()
        {
            // Arrange
            const string booksJson = @"{
                ""ISBN:9780547928227"": {
                    ""title"": ""The Hobbit""
                }
            }";

            var (service, _) = CreateService(
                ("/api/books", Ok(booksJson)),
                ("/isbn/", NotFound()));

            // Act
            var result = await service.LookupByIsbnAsync("9780547928227");

            // Assert
            Assert.NotNull(result);
            Assert.Null(result!.BookFormat);
        }

        // -- ParseSeriesString unit tests -------------------------------------

        [Theory]
        [InlineData("Animorphs #1", "Animorphs", 1)]
        [InlineData("Animorphs #12", "Animorphs", 12)]
        [InlineData("Harry Potter, Book 1", "Harry Potter", 1)]
        [InlineData("Harry Potter, 3", "Harry Potter", 3)]
        [InlineData("Harry Potter ; 3", "Harry Potter", 3)]
        [InlineData("His Dark Materials ; bk. 1", "His Dark Materials", 1)]
        [InlineData("Narnia ; bk. 2", "Narnia", 2)]
        [InlineData("Animorphs", "Animorphs", null)]
        public void ParseSeriesString_WhenInputProvided_ReturnsExpectedNameAndNumber(string input, string expectedName, int? expectedNumber)
        {
            // Arrange
            // Act
            var (name, number) = OpenLibraryBookLookupService.ParseSeriesString(input);

            // Assert
            Assert.Equal(expectedName, name);
            Assert.Equal(expectedNumber, number);
        }
    }
}



