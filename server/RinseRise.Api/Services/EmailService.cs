using System.Net;
using System.Net.Mail;
using RinseRise.Api.Models;

namespace RinseRise.Api.Services;

public interface IEmailService
{
    /// <summary>Sends the "forgot password" one-time code by email.</summary>
    Task<string> SendPasswordResetCodeAsync(string toEmail, string toName, string code);
}

/// <summary>
/// Logs the email to the console until SMTP keys are configured — either in
/// appsettings.json, or (no redeploy needed) from Admin → API Keys. Uses
/// System.Net.Mail directly (works with any SMTP provider — Gmail, SES,
/// SendGrid's SMTP relay, Mailgun, your host's own mailbox, etc.) rather than
/// a provider-specific SDK, same "no extra dependency" approach as the rest
/// of this codebase's third-party integrations.
/// </summary>
public class EmailService : IEmailService
{
    private readonly ILogger<EmailService> _log;
    private readonly ISettingsService _settings;

    public EmailService(ILogger<EmailService> log, ISettingsService settings)
    {
        _log = log; _settings = settings;
    }

    public async Task<string> SendPasswordResetCodeAsync(string toEmail, string toName, string code)
    {
        var host = await _settings.GetOrConfigAsync(SettingKeys.SmtpHost, "Email:SmtpHost");
        var portRaw = await _settings.GetOrConfigAsync(SettingKeys.SmtpPort, "Email:SmtpPort");
        var username = await _settings.GetOrConfigAsync(SettingKeys.SmtpUsername, "Email:SmtpUsername");
        var password = await _settings.GetOrConfigAsync(SettingKeys.SmtpPassword, "Email:SmtpPassword");
        var fromEmail = await _settings.GetOrConfigAsync(SettingKeys.SmtpFromEmail, "Email:SmtpFromEmail");
        var fromName = await _settings.GetOrConfigAsync(SettingKeys.SmtpFromName, "Email:SmtpFromName");

        var projectName = await _settings.GetAsync(SettingKeys.ProjectName) ?? "Rinse & Rise";
        var primary = await _settings.GetAsync(SettingKeys.ThemePrimaryColor) ?? "#e8590c";
        var accent = await _settings.GetAsync(SettingKeys.ThemeAccentColor) ?? "#f59e0b";

        var subject = $"{projectName}: your password reset code";
        var html = BuildResetEmailHtml(toName, code, projectName, primary, accent);

        if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(username) ||
            string.IsNullOrWhiteSpace(password) || string.IsNullOrWhiteSpace(fromEmail))
        {
            _log.LogInformation("[EMAIL -> {To}] {Subject}\nVerification code: {Code}", toEmail, subject, code);
            return "logged (add SMTP keys under Admin → API Keys to deliver for real)";
        }

        // A misconfigured key (bad host/credentials/from-address) shouldn't 500
        // the forgot-password endpoint — that would leak which emails are
        // registered (a 500 only happens for real accounts) and just breaks
        // the flow for everyone. Log it so the admin can diagnose delivery
        // issues from the server console, but always let the caller proceed.
        try
        {
            using var message = new MailMessage
            {
                From = new MailAddress(fromEmail, string.IsNullOrWhiteSpace(fromName) ? projectName : fromName),
                Subject = subject,
                Body = html,
                IsBodyHtml = true,
            };
            message.To.Add(toEmail);

            var port = int.TryParse(portRaw, out var parsedPort) ? parsedPort : 587;
            using var client = new SmtpClient(host, port)
            {
                Credentials = new NetworkCredential(username, password),
                EnableSsl = true,
            };
            await client.SendMailAsync(message);
            return "sent";
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Failed to send password reset email to {To} via {Host}:{Port}", toEmail, host, portRaw);
            return $"failed: {ex.Message}";
        }
    }

    // Table-based layout with every style inlined — the only markup that
    // renders consistently across email clients (Gmail, Outlook, Apple Mail
    // all strip or mangle <style> blocks to varying degrees). Colors are
    // pulled live from Settings so the email always matches whatever the
    // admin has set under Features → Branding/Theme, not a hardcoded palette.
    private static string BuildResetEmailHtml(string name, string code, string projectName, string primary, string accent)
    {
        var greeting = string.IsNullOrWhiteSpace(name) ? "there" : WebUtility.HtmlEncode(name.Split(' ')[0]);
        var safeProjectName = WebUtility.HtmlEncode(projectName);
        var safeCode = WebUtility.HtmlEncode(code);

        return $@"<!doctype html>
<html>
<head><meta charset=""utf-8""><meta name=""viewport"" content=""width=device-width, initial-scale=1""></head>
<body style=""margin:0;padding:0;background:#fbf3ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;"">
  <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""background:#fbf3ec;padding:32px 16px;"">
    <tr>
      <td align=""center"">
        <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""max-width:460px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #efe2d6;"">
          <tr>
            <td style=""background:{primary};padding:26px 32px;text-align:center;"">
              <span style=""font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-.01em;"">{safeProjectName}</span>
            </td>
          </tr>
          <tr>
            <td style=""padding:32px 32px 4px;"">
              <h1 style=""margin:0 0 10px;font-size:20px;color:#211a15;font-weight:800;"">Reset your password</h1>
              <p style=""margin:0 0 22px;font-size:15px;line-height:1.55;color:#6f6155;"">
                Hi {greeting}, use the code below to reset your {safeProjectName} account password.
                It expires in <strong style=""color:#211a15;"">10 minutes</strong>.
              </p>
            </td>
          </tr>
          <tr>
            <td style=""padding:0 32px 26px;"">
              <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""background:#fbf3ec;border:1.5px solid {accent};border-radius:12px;"">
                <tr>
                  <td style=""padding:20px;text-align:center;"">
                    <span style=""font-family:ui-monospace,Consolas,Menlo,monospace;font-size:34px;font-weight:800;letter-spacing:.35em;color:#211a15;"">{safeCode}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style=""padding:0 32px 32px;"">
              <p style=""margin:0;font-size:13px;line-height:1.5;color:#6f6155;"">
                Didn't request this? You can safely ignore this email — your password won't change
                unless this code is entered.
              </p>
            </td>
          </tr>
          <tr>
            <td style=""background:#fbf3ec;padding:18px 32px;text-align:center;border-top:1px solid #efe2d6;"">
              <p style=""margin:0;font-size:12px;color:#6f6155;"">{safeProjectName} · This is an automated message, please don't reply.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>";
    }
}
