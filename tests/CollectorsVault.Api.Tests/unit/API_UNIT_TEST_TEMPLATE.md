# API Unit Test Template

Use this template for API unit tests in `tests/CollectorsVault.Api.Tests/unit`.

## Rules

- Test name format: `Method_Condition_Expected`.
- Use `Moq` for collaborator setup and behavior.
- Keep `// Arrange`, `// Act`, `// Assert` comments in every test.
- Do not add a blank line immediately after `// Arrange`.
- Include one blank line before `// Act`.
- Include one blank line before `// Assert`.
- Use `MockBehavior.Strict` for all mocks (default policy). The only recognized exception is mocks that also set `CallBase = true` (e.g., EF Core `DbContext` subclass mocks). See [docs/testing-guidelines.md](../../../docs/testing-guidelines.md) for details.

## Example

```csharp
using System.Threading.Tasks;
using CollectorsVault.Server.Controllers;
using CollectorsVault.Server.Services;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace CollectorsVault.Api.Tests.Unit
{
    [Trait("Category", "Unit")]
    public class ExampleControllerTests
    {
        [Fact]
        public async Task GetById_WhenItemExists_ReturnsOkWithPayload()
        {
            // Arrange
            var serviceMock = new Mock<IExampleService>(MockBehavior.Strict);
            serviceMock
                .Setup(service => service.GetByIdAsync(1L))
                .ReturnsAsync(new ExampleDto { Id = 1L, Name = "Item 1" });

            var controller = new ExampleController(serviceMock.Object);

            // Act
            var result = await controller.GetById(1L);

            // Assert
            var ok = Assert.IsType<OkObjectResult>(result.Result);
            var payload = Assert.IsType<ExampleDto>(ok.Value);
            Assert.Equal(1L, payload.Id);
            Assert.Equal("Item 1", payload.Name);

            serviceMock.Verify(service => service.GetByIdAsync(1L), Times.Once);
        }
    }
}
```

Replace `ExampleController`, `IExampleService`, and `ExampleDto` with your test target types.
