using CollectorsVault.Server.Data;
using Microsoft.Data.Sqlite;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System.IO;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var configuredConnectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Data Source=Data/collectorsvault.db";
var sqliteConnectionBuilder = new SqliteConnectionStringBuilder(configuredConnectionString);

if (!Path.IsPathRooted(sqliteConnectionBuilder.DataSource))
{
    var resolvedPath = Path.Combine(builder.Environment.ContentRootPath, sqliteConnectionBuilder.DataSource);
    var resolvedDirectory = Path.GetDirectoryName(resolvedPath);

    if (!string.IsNullOrWhiteSpace(resolvedDirectory))
    {
        Directory.CreateDirectory(resolvedDirectory);
    }

    var legacyPath = Path.Combine(builder.Environment.ContentRootPath, "collectorsvault.db");
    if (!File.Exists(resolvedPath) && File.Exists(legacyPath))
    {
        File.Copy(legacyPath, resolvedPath);
    }

    sqliteConnectionBuilder.DataSource = resolvedPath;
}

builder.Services.AddDbContext<VaultDbContext>(options =>
    options.UseSqlite(sqliteConnectionBuilder.ConnectionString));

builder.Services.AddCors(options =>
{
    options.AddPolicy("ClientPolicy", policy =>
    {
        policy
            .AllowAnyOrigin()
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "CollectorsVault API v1");
    options.RoutePrefix = "swagger";
});

app.UseCors("ClientPolicy");
app.UseAuthorization();
app.MapGet("/", () => Results.Redirect("/swagger"));
app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<VaultDbContext>();
    dbContext.Database.EnsureCreated();
}

app.Logger.LogInformation("Using SQLite database at: {DatabasePath}", sqliteConnectionBuilder.DataSource);

app.Run();
