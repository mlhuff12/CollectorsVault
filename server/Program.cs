using CollectorsVault.Server.Data;
using CollectorsVault.Server.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Data.Sqlite;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
    {
        options.IncludeXmlComments(xmlPath, includeControllerXmlComments: true);
    }
    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Enter JWT token",
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        BearerFormat = "JWT",
        Scheme = "bearer"
    });
    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

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
builder.Services.AddScoped<IVaultService, VaultService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IAdminService, AdminService>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddHttpClient<IBookLookupService, OpenLibraryBookLookupService>(client =>
{
    client.BaseAddress = new Uri("https://openlibrary.org");
});

builder.Services.AddHttpClient("Omdb", client =>
{
    client.BaseAddress = new Uri("http://www.omdbapi.com");
});
builder.Services.AddHttpClient("UpcItemDb", client =>
{
    client.BaseAddress = new Uri("https://api.upcitemdb.com");
});
builder.Services.AddScoped<IMovieLookupService, OmdbMovieLookupService>();

builder.Services.AddHttpClient("Igdb", client =>
{
    client.BaseAddress = new Uri("https://api.igdb.com");
});
builder.Services.AddHttpClient("Twitch", client =>
{
    client.BaseAddress = new Uri("https://id.twitch.tv");
});
builder.Services.AddScoped<IGameLookupService, IgdbGameLookupService>();

var jwtKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrWhiteSpace(jwtKey))
{
    jwtKey = "CollectorsVaultSuperSecretKeyForJWT2024!!";
    Console.Error.WriteLine("[WARNING] Jwt:Key is not configured. Using insecure fallback key. Set Jwt:Key via dotnet user-secrets or environment variables before deploying to production.");
}
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "CollectorsVault";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtIssuer,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

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

app.UseHttpsRedirection();
app.UseCors("ClientPolicy");
app.UseAuthentication();
app.UseAuthorization();
app.MapGet("/", () => Results.Redirect("/swagger"));
app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<VaultDbContext>();
    dbContext.Database.EnsureCreated();

    if (dbContext.Database.IsRelational())
    {
        var requiredTables = new[] { "User", "Book", "Movie", "Game" };
        var missingTables = GetMissingTables(dbContext, requiredTables);
        if (missingTables.Count > 0)
        {
            app.Logger.LogWarning(
                "SQLite database is incompatible. Missing required tables: {MissingTables}. Recreating schema.",
                string.Join(", ", missingTables));
            RecreateSqliteSchema(dbContext, sqliteConnectionBuilder.DataSource, app.Logger);
        }
        else
        {
            // Tables exist — ensure any new columns added to existing tables are present.
            // ALTER TABLE ADD COLUMN preserves all existing data.
            var bookColumnsToAdd = new[]
            {
                // Series and format fields added in the series support feature.
                ("BookFormat",       "TEXT"),
                ("NeedsReplacement", "INTEGER NOT NULL DEFAULT 0"),
                ("SeriesName",       "TEXT"),
                ("SeriesNumber",     "INTEGER"),
                // Model refactor: Authors stored as JSON array; Subjects stored as JSON array.
                ("Authors",          "TEXT NOT NULL DEFAULT '[]'"),
                ("Subjects",         "TEXT"),
                // PublishDateString stores the original publish date text for books.
                ("PublishDateString", "TEXT"),
                // Publisher added on Book but may be absent in older DB files.
                ("Publisher",        "TEXT"),
                // Cover images and book URL added with lookup feature.
                ("CoverSmall",       "TEXT"),
                ("CoverMedium",      "TEXT"),
                ("CoverLarge",       "TEXT"),
                ("BookUrl",          "TEXT"),
                // PageCount added with lookup feature.
                ("PageCount",        "INTEGER"),
            };
            AddMissingColumns(dbContext, "Book", bookColumnsToAdd, app.Logger);
        }
    }

    var adminUsername = builder.Configuration["AdminUser:Username"] ?? "mlhuff12@gmail.com";
    var adminSecret = builder.Configuration["AdminUser:Secret"] ?? "CYCD6HM5Q57CGEDEEY6WRABKAERCR266I";

    if (string.IsNullOrWhiteSpace(builder.Configuration["AdminUser:TotpSecret"]))
    {
        app.Logger.LogWarning("[WARNING] AdminUser:Secret is not configured. Using the default seeded secret. Set AdminUser:Secret via dotnet user-secrets or environment variables before deploying to production.");
    }

    if (!dbContext.Users.Any(u => u.Username == adminUsername))
    {
        var now = DateTime.UtcNow;
        dbContext.Users.Add(new CollectorsVault.Server.Models.User
        {
            Username = adminUsername,
            Secret = adminSecret,
            AdminInd = true,
            CreatedUtcDate = now,
            LastModifiedUtcDate = now
        });
        dbContext.SaveChanges();
        app.Logger.LogInformation("Admin user '{AdminUsername}' added to the database.", adminUsername);
    }
}

app.Logger.LogInformation("Using SQLite database at: {DatabasePath}", sqliteConnectionBuilder.DataSource);

app.Run();

static List<string> GetMissingTables(VaultDbContext dbContext, IEnumerable<string> requiredTables)
{
    var connection = dbContext.Database.GetDbConnection();
    using var command = connection.CreateCommand();
    if (command.Connection is null)
    {
        return new List<string>();
    }

    var openedByMethod = false;
    if (command.Connection.State != System.Data.ConnectionState.Open)
    {
        command.Connection.Open();
        openedByMethod = true;
    }

    try
    {
        var missingTables = new List<string>();
        foreach (var tableName in requiredTables)
        {
            command.CommandText = "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = $name LIMIT 1;";
            command.Parameters.Clear();

            var parameter = command.CreateParameter();
            parameter.ParameterName = "$name";
            parameter.Value = tableName;
            command.Parameters.Add(parameter);

            var exists = command.ExecuteScalar() is not null;
            if (!exists)
            {
                missingTables.Add(tableName);
            }
        }

        return missingTables;
    }
    finally
    {
        if (openedByMethod && command.Connection.State == System.Data.ConnectionState.Open)
        {
            command.Connection.Close();
        }
    }
}

static void RecreateSqliteSchema(VaultDbContext dbContext, string? dbPath, ILogger logger)
{
    if (!string.IsNullOrWhiteSpace(dbPath) && File.Exists(dbPath))
    {
        var backupPath = $"{dbPath}.backup-{DateTime.UtcNow:yyyyMMddHHmmss}";
        File.Copy(dbPath, backupPath, overwrite: true);
        logger.LogWarning("Backed up incompatible SQLite database to: {BackupPath}", backupPath);
    }

    dbContext.Database.EnsureDeleted();
    dbContext.Database.EnsureCreated();
    logger.LogInformation("SQLite schema recreated successfully.");
}

static void AddMissingColumns(VaultDbContext dbContext, string tableName,
    IEnumerable<(string Name, string Definition)> columns, ILogger logger)
{
    // Validate that tableName and column names are safe SQL identifiers (letters, digits, underscores only).
    if (!System.Text.RegularExpressions.Regex.IsMatch(tableName, @"^\w+$"))
    {
        throw new ArgumentException($"Invalid table name: '{tableName}'", nameof(tableName));
    }

    var connection = dbContext.Database.GetDbConnection();
    using var command = connection.CreateCommand();
    if (command.Connection is null)
    {
        return;
    }

    var openedByMethod = false;
    if (command.Connection.State != System.Data.ConnectionState.Open)
    {
        command.Connection.Open();
        openedByMethod = true;
    }

    try
    {
        // PRAGMA table_info returns one row per column; we collect existing column names.
        command.CommandText = $"PRAGMA table_info({tableName});";
        var existingColumns = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        using (var reader = command.ExecuteReader())
        {
            while (reader.Read())
            {
                existingColumns.Add(reader.GetString(1)); // column 1 is "name"
            }
        }

        foreach (var (name, definition) in columns)
        {
            // Validate column name is a safe SQL identifier.
            if (!System.Text.RegularExpressions.Regex.IsMatch(name, @"^\w+$"))
            {
                throw new ArgumentException($"Invalid column name: '{name}'", nameof(columns));
            }

            if (existingColumns.Contains(name))
            {
                continue;
            }

            command.CommandText = $"ALTER TABLE {tableName} ADD COLUMN {name} {definition};";
            command.ExecuteNonQuery();
            logger.LogInformation("Added missing column '{Column}' to table '{Table}'.", name, tableName);
        }
    }
    finally
    {
        if (openedByMethod && command.Connection.State == System.Data.ConnectionState.Open)
        {
            command.Connection.Close();
        }
    }
}

public partial class Program { }
