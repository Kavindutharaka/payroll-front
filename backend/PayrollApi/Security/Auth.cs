using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using PayrollApi.Data;

namespace PayrollApi.Security;

public sealed record AppUser(
    int Id, string Username, string DisplayName, int RoleId, string RoleName,
    bool IsAdmin, bool IsDeveloper, bool MustChangePassword, bool IsActive, int TokenVersion,
    IReadOnlySet<string> Permissions)
{
    public bool Can(string permission) => IsAdmin || Permissions.Contains(permission);

    public object ToClient() => new
    {
        id = Id, username = Username, displayName = DisplayName, roleId = RoleId, role = RoleName,
        isAdmin = IsAdmin, isDeveloper = IsDeveloper, mustChangePassword = MustChangePassword,
        permissions = IsAdmin ? Security.Permissions.AllKeys.Order().ToArray() : Permissions.Order().ToArray(),
    };
}

/// <summary>Loads the signed-in person and their role on each request (cached for a few seconds),
/// so a disabled account, a password reset or a role change takes effect straight away.</summary>
public sealed class UserStore(IDb db, IMemoryCache cache)
{
    private static int _generation;
    private static readonly TimeSpan Ttl = TimeSpan.FromSeconds(15);

    public const string Select = """
        SELECT u.id, u.username, u.displayName, u.roleId, r.name AS roleName, r.isAdmin, u.isDeveloper,
               u.mustChangePassword, u.isActive, u.tokenVersion, r.permissions, u.passwordHash,
               u.failedAttempts, u.status,
               CASE WHEN u.lockedUntil > SYSUTCDATETIME() THEN DATEDIFF(SECOND, SYSUTCDATETIME(), u.lockedUntil) ELSE 0 END AS lockedSeconds
        FROM dbo.payroll_app_user u JOIN dbo.payroll_app_role r ON r.id = u.roleId
        """;

    public static AppUser FromRow(System.Text.Json.Nodes.JsonObject r)
    {
        var isAdmin = r.B("isAdmin") || r.B("isDeveloper");
        HashSet<string> perms;
        try { perms = (JsonSerializer.Deserialize<string[]>(r.S("permissions")) ?? []).Where(Permissions.AllKeys.Contains).ToHashSet(); }
        catch (JsonException) { perms = []; }
        return new AppUser(r.I("id"), r.S("username"), r.S("displayName"), r.I("roleId"), r.S("roleName"),
            isAdmin, r.B("isDeveloper"), r.B("mustChangePassword"), r.B("isActive"), r.I("tokenVersion"), perms);
    }

    public async Task<AppUser?> GetAsync(int id, CancellationToken ct = default)
    {
        var key = $"user:{_generation}:{id}";
        if (cache.TryGetValue(key, out AppUser? hit)) return hit;
        var row = await db.FirstAsync($"{Select} WHERE u.id = {Sql.Int(id)} AND u.status <> N'Deleted'", ct);
        var user = row is null ? null : FromRow(row);
        cache.Set(key, user, Ttl);
        return user;
    }

    /// <summary>Forget every cached user - after any change to users or roles.</summary>
    public static void Invalidate() => Interlocked.Increment(ref _generation);
}

/// <summary>The payroll_* tables and procedures that exist, refreshed every few minutes.</summary>
public sealed class ObjectCatalog(IDb db, IMemoryCache cache)
{
    public async Task<IReadOnlyDictionary<string, bool>> GetAsync(CancellationToken ct = default)
    {
        if (cache.TryGetValue("objects", out IReadOnlyDictionary<string, bool>? hit) && hit is not null) return hit;
        var rows = await db.QueryAsync("""
            SELECT LOWER(name) AS name, CASE WHEN type IN ('P','PC') THEN 1 ELSE 0 END AS isProc
            FROM sys.objects WHERE name LIKE 'payroll[_]%' AND name NOT LIKE 'payroll[_]app[_]%'
              AND type IN ('U','V','P','PC','FN','IF','TF')
            """, ct);
        var map = rows.OfType<System.Text.Json.Nodes.JsonObject>().ToDictionary(r => r.S("name"), r => r.I("isProc") == 1);
        cache.Set("objects", (IReadOnlyDictionary<string, bool>)map, TimeSpan.FromMinutes(5));
        return map;
    }
}

/// <summary>Who did what. Written in the background so it never slows a request down.</summary>
public sealed class AuditLog(IDb db, ILogger<AuditLog> log)
{
    public void Write(HttpContext ctx, AppUser? user, string action, string? detail, string? usernameOverride = null)
    {
        var ip = ctx.Connection.RemoteIpAddress?.ToString();
        var sql = $"""
            INSERT INTO dbo.payroll_app_audit (userId, username, action, detail, ip)
            VALUES ({Sql.Int(user?.Id)}, {Sql.Str(usernameOverride ?? user?.Username)}, {Sql.Str(action)},
                    {Sql.Str(detail is { Length: > 1900 } ? detail[..1900] : detail)}, {Sql.Str(ip)})
            """;
        _ = Task.Run(async () =>
        {
            try { await db.RawJsonAsync(sql); }
            catch (Exception e) { log.LogWarning(e, "Audit write failed for {Action}", action); }
        });
    }
}

public sealed class TokenService(IOptions<PayrollOptions> options)
{
    private readonly JwtOptions _o = options.Value.Jwt;

    public SymmetricSecurityKey Key => new(Encoding.UTF8.GetBytes(_o.Secret));

    public (string Token, DateTime ExpiresUtc) Issue(AppUser u)
    {
        var expires = DateTime.UtcNow.AddHours(_o.Hours);
        var token = new JsonWebTokenHandler().CreateToken(new SecurityTokenDescriptor
        {
            Issuer = _o.Issuer,
            Audience = _o.Issuer,
            Expires = expires,
            Subject = new ClaimsIdentity([
                new Claim("sub", u.Id.ToString()),
                new Claim("tv", u.TokenVersion.ToString()),
                new Claim("name", u.Username),
            ]),
            SigningCredentials = new SigningCredentials(Key, SecurityAlgorithms.HmacSha256),
        });
        return (token, expires);
    }
}

public static class HttpContextUser
{
    public static AppUser User(this HttpContext ctx) =>
        ctx.Items["appUser"] as AppUser ?? throw new InvalidOperationException("No signed-in user");
}
