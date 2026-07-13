using DryClean.Api.Dtos;
using DryClean.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace DryClean.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;
    public AuthController(IAuthService auth) => _auth = auth;

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponseDto>> Register(RegisterDto dto)
    {
        try { return Ok(await _auth.RegisterAsync(dto)); }
        catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login(LoginDto dto)
    {
        var result = await _auth.LoginAsync(dto);
        return result is null
            ? Unauthorized(new { message = "Invalid email or password." })
            : Ok(result);
    }

    [HttpPost("google")]
    public async Task<ActionResult<AuthResponseDto>> Google(GoogleLoginDto dto)
    {
        try { return Ok(await _auth.GoogleLoginAsync(dto)); }
        catch (InvalidOperationException ex) { return Unauthorized(new { message = ex.Message }); }
    }
}
