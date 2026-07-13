using System.Text;
using DryClean.Api.Data;
using DryClean.Api.Models;
using DryClean.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;

// ---- Hosting: bind to Railway's (or any PaaS's) $PORT when present ----
// Locally, dotnet run keeps using launchSettings.json / Kestrel defaults, so
// nothing changes for local dev.
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(port))
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

// ---- Database: SQLite, managed with EF Core migrations ----
// A single local file (no server to install/run) — set the path in
// appsettings.json (ConnectionStrings:Default), e.g. "Data Source=dryclean.db".
var connectionString = config.GetConnectionString("Default");
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseSqlite(connectionString));

// ---- DI: application services ----
builder.Services.AddHttpClient();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddScoped<IPaymentService, RazorpayService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IPricingService, PricingService>();
builder.Services.AddScoped<ISettingsService, SettingsService>();
builder.Services.AddScoped<IOfferService, OfferService>();
builder.Services.AddScoped<ICatalogueService, CatalogueService>();

// ---- JWT authentication ----
var jwt = config.GetSection("Jwt");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwt["Issuer"],
            ValidAudience = jwt["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt["Key"]!))
        };
    });
builder.Services.AddAuthorization();

// ---- CORS: appsettings.json's Cors:AllowedOrigins, plus an optional
// CORS_ALLOWED_ORIGINS env var (comma-separated) so a deployed frontend URL
// can be added without a code change/redeploy — just set the env var on the
// API service and restart it. ----
var envOrigins = (Environment.GetEnvironmentVariable("CORS_ALLOWED_ORIGINS") ?? "")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
var origins = (config.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>())
    .Concat(envOrigins).Distinct().ToArray();
builder.Services.AddCors(o => o.AddPolicy("client", p =>
    p.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod()));

// ---- Swagger with a Bearer auth box ----
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Dry Clean API", Version = "v1" });
    var scheme = new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
    };
    c.AddSecurityDefinition("Bearer", scheme);
    c.AddSecurityRequirement(new OpenApiSecurityRequirement { [scheme] = Array.Empty<string>() });
});

var app = builder.Build();

// ---- Apply pending EF Core migrations, then seed an admin on first run ----
// Run `dotnet ef migrations add InitialCreate` once before the first launch so
// there is a migration to apply. Migrate() then creates/updates the schema.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
    SeedAdmin(db, config);
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseStaticFiles(); // serves uploaded images from wwwroot/uploads
app.UseCors("client");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/", () => Results.Ok(new { service = "Dry Clean API", docs = "/swagger" }));

app.Run();

static void SeedAdmin(AppDbContext db, IConfiguration config)
{
    var email = (config["Seed:AdminEmail"] ?? "admin@dryclean.local").ToLowerInvariant();
    if (db.Users.Any(u => u.Email == email)) return;

    db.Users.Add(new User
    {
        Name = "Store Admin",
        Email = email,
        Role = UserRole.Admin,
        PasswordHash = PasswordHasher.Hash(config["Seed:AdminPassword"] ?? "Admin@123")
    });
    db.SaveChanges();
}
