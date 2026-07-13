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

    /// <summary>Always responds the same way whether or not the email is
    /// registered, so the response can't be used to enumerate accounts.</summary>
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordDto dto)
    {
        await _auth.ForgotPasswordAsync(dto);
        return Ok(new { message = "If that email is registered, a verification code has been sent." });
    }

    [HttpPost("verify-reset-code")]
    public async Task<IActionResult> VerifyResetCode(VerifyResetCodeDto dto)
    {
        var valid = await _auth.VerifyResetCodeAsync(dto);
        return valid
            ? Ok(new { valid = true })
            : BadRequest(new { message = "That code is invalid or has expired." });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(ResetPasswordDto dto)
    {
        try
        {
            await _auth.ResetPasswordAsync(dto);
            return Ok(new { message = "Password updated. You can now sign in." });
        }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }
}
