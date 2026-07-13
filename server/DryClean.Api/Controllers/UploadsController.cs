using System.IO;
using System.Linq;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace DryClean.Api.Controllers;

/// <summary>Accepts an image (e.g. an offer pamphlet) and saves it under
/// wwwroot/uploads, returning a relative URL to store and display.</summary>
[ApiController]
[Route("api/admin/uploads")]
[Authorize(Roles = "Admin")]
public class UploadsController : ControllerBase
{
    private readonly IWebHostEnvironment _env;
    public UploadsController(IWebHostEnvironment env) => _env = env;

    [HttpPost]
    [RequestSizeLimit(6_000_000)] // ~6 MB
    public async Task<IActionResult> Upload(IFormFile file)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "No file uploaded." });

        var allowed = new[] { ".jpg", ".jpeg", ".png", ".webp", ".gif" };
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowed.Contains(ext))
            return BadRequest(new { message = "Only image files (jpg, png, webp, gif) are allowed." });

        var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
        var dir = Path.Combine(webRoot, "uploads");
        Directory.CreateDirectory(dir);

        var name = $"{System.Guid.NewGuid():N}{ext}";
        await using (var stream = System.IO.File.Create(Path.Combine(dir, name)))
            await file.CopyToAsync(stream);

        return Ok(new { url = $"/uploads/{name}" });
    }
}
