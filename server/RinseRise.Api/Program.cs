using System.Text;
using RinseRise.Api.Data;
using RinseRise.Api.Models;
using RinseRise.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
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
// appsettings.json (ConnectionStrings:Default), e.g. "Data Source=rinserise.db".
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

// ---- Uploads: where admin-uploaded images (branding logo, offer pamphlets)
// are stored. Defaults to wwwroot/uploads for local dev. In production, set
// Uploads:Directory (env var Uploads__Directory) to a path under a mounted,
// persisted volume — e.g. Railway's /app/data/uploads — otherwise every
// redeploy wipes them, since the container's own filesystem is ephemeral.
// See README "Deploy to Railway".
var uploadsDir = ResolveUploadsDirectory(config, builder.Environment);
Directory.CreateDirectory(uploadsDir);
builder.Services.AddSingleton(new UploadsOptions(uploadsDir));

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

// Logged on every boot so a Railway (or any host) deploy log makes it obvious
// whether Uploads__Directory actually took effect — the #1 way to notice a
// missed env var is uploaded images vanishing on the next redeploy, by which
// point it's too late to tell from the UI alone.
app.Logger.LogInformation("Uploads directory: {UploadsDir}", uploadsDir);

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

// CORS must run before UseStaticFiles: static file middleware serves the
// response and short-circuits the pipeline, so if CORS ran after it, /uploads
// responses (e.g. the branding logo) would go out with no
// Access-Control-Allow-Origin header. That's invisible in a plain <img> tag
// but breaks html2canvas's invoice PDF export, which must read the image's
// pixels into a canvas and silently drops any image that fails CORS.
app.UseCors("client");
app.UseStaticFiles(); // wwwroot's other static assets
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadsDir),
    RequestPath = "/uploads"
});
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/", () => Results.Ok(new { service = "Dry Clean API", docs = "/swagger" }));

app.Run();

static void SeedAdmin(AppDbContext db, IConfiguration config)
{
    var email = (config["Seed:AdminEmail"] ?? "admin@rinserise.local").ToLowerInvariant();
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

static string ResolveUploadsDirectory(IConfiguration config, IWebHostEnvironment env)
{
    var configured = config["Uploads:Directory"];
    if (string.IsNullOrWhiteSpace(configured))
        return Path.Combine(env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot"), "uploads");

    return Path.IsPathRooted(configured) ? configured : Path.Combine(env.ContentRootPath, configured);
}

public record UploadsOptions(string Directory);
