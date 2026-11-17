using Microsoft.Extensions.Options;
using PayrollApi.Data;
using PayrollApi.Security;

namespace PayrollApi.Endpoints;

public static class Reply
{
    public static IResult Error(int status, string message, string code = "error", object? extra = null) =>
        Results.Json(new { error = message, code, extra }, statusCode: status);
}

public static class AuthEndpoints
{
    public sealed record LoginBody(string? Username, string? Password);
    public sealed record ChangeBody(string? CurrentPassword, string? NewPassword);

    public static void MapAuth(this WebApplication app)
    {
        var g = app.MapGroup("/api/auth");
        g.MapPost("/login", Login).AllowAnonymous().RequireRateLimiting("login");
        g.MapGet("/me", (HttpContext c) => Results.Ok(new { user = c.User().ToClient() }));
        g.MapPost("/change-password", ChangePassword).RequireRateLimiting("login");
        g.MapPost("/logout", (HttpContext c, AuditLog audit) =>
        {
            audit.Write(c, c.User(), "LOGOUT", null);
            return Results.Ok(new { ok = true });
        });
    }

    private static async Task<IResult> Login(LoginBody body, HttpContext c, IDb db, TokenService tokens,
        AuditLog audit, IOptions<PayrollOptions> options)
    {
        var o = options.Value.Security;
        var username = body.Username?.Trim() ?? "";
        var password = body.Password ?? "";
        if (username.Length == 0 || password.Length == 0)
            return Reply.Error(400, "Enter your username and password.");
        if (username.Length > 60 || password.Length > 128)
            return Reply.Error(401, "The username or password is incorrect.", "credentials");

        var row = await db.FirstAsync($"{UserStore.Select} WHERE u.username = {Sql.Str(username)} AND u.status <> N'Deleted'");
        if (row is null)
        {
            Passwords.SpendTime(password);
            audit.Write(c, null, "LOGIN_FAILED", "Unknown username", username);
            return Reply.Error(401, "The username or password is incorrect.", "credentials");
        }

        var id = row.I("id");
        var lockedSeconds = row.I("lockedSeconds");
        if (lockedSeconds > 0)
        {
            var mins = (int)Math.Ceiling(lockedSeconds / 60.0);
            return Reply.Error(423, $"This account is locked after too many wrong passwords. Try again in {mins} minute{(mins == 1 ? "" : "s")}, or ask the administrator to reset it.", "locked");
        }

        if (!Passwords.Verify(password, row.S("passwordHash")))
        {
            var failed = row.I("failedAttempts") + 1;
            if (failed >= o.MaxFailedLogins)
            {
                await db.RawJsonAsync($"UPDATE dbo.payroll_app_user SET failedAttempts = 0, lockedUntil = DATEADD(MINUTE, {Sql.Int(o.LockMinutes)}, SYSUTCDATETIME()) WHERE id = {Sql.Int(id)}");
                audit.Write(c, null, "ACCOUNT_LOCKED", $"{o.MaxFailedLogins} wrong passwords", row.S("username"));
                return Reply.Error(423, $"Too many wrong passwords. This account is locked for {o.LockMinutes} minutes.", "locked");
            }
            await db.RawJsonAsync($"UPDATE dbo.payroll_app_user SET failedAttempts = {Sql.Int(failed)} WHERE id = {Sql.Int(id)}");
            audit.Write(c, null, "LOGIN_FAILED", "Wrong password", row.S("username"));
            var left = o.MaxFailedLogins - failed;
            return Reply.Error(401, left <= 2
                ? $"The username or password is incorrect. {left} more wrong attempt{(left == 1 ? "" : "s")} will lock the account for {o.LockMinutes} minutes."
                : "The username or password is incorrect.", "credentials");
        }

        if (!row.B("isActive"))
            return Reply.Error(403, "This account has been disabled. Please contact the administrator.", "disabled");

        await db.RawJsonAsync($"UPDATE dbo.payroll_app_user SET failedAttempts = 0, lockedUntil = NULL, lastLoginAt = SYSUTCDATETIME() WHERE id = {Sql.Int(id)}");
        var user = UserStore.FromRow(row);
        var (token, expires) = tokens.Issue(user);
        audit.Write(c, user, "LOGIN", null);
        return Results.Ok(new { token, expiresAt = expires, user = user.ToClient() });
    }

    private static async Task<IResult> ChangePassword(ChangeBody body, HttpContext c, IDb db, TokenService tokens,
        UserStore users, AuditLog audit, IOptions<PayrollOptions> options)
    {
        var me = c.User();
        var row = await db.FirstAsync($"SELECT passwordHash FROM dbo.payroll_app_user WHERE id = {Sql.Int(me.Id)}");
        if (row is null || !Passwords.Verify(body.CurrentPassword ?? "", row.S("passwordHash")))
            return Reply.Error(400, "Your current password is not correct.", "current");
        if (body.NewPassword == body.CurrentPassword)
            return Reply.Error(400, "The new password must be different from the current one.", "same");
        var problem = Passwords.Problem(body.NewPassword, options.Value.Security.DefaultPassword, me.Username);
        if (problem is not null) return Reply.Error(400, problem, "weak");

        await db.RawJsonAsync($"""
            UPDATE dbo.payroll_app_user
            SET passwordHash = {Sql.Str(Passwords.Hash(body.NewPassword!))}, mustChangePassword = 0,
                passwordChangedAt = SYSUTCDATETIME(), tokenVersion = tokenVersion + 1, updatedAt = SYSUTCDATETIME(),
                updatedBy = {Sql.Str(me.Username)}
            WHERE id = {Sql.Int(me.Id)}
            """);
        UserStore.Invalidate();
        var fresh = await users.GetAsync(me.Id) ?? me;
        var (token, expires) = tokens.Issue(fresh);
        audit.Write(c, me, "PASSWORD_CHANGED", null);
        return Results.Ok(new { token, expiresAt = expires, user = fresh.ToClient() });
    }
}
