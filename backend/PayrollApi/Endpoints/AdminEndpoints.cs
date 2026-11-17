using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;
using PayrollApi.Data;
using PayrollApi.Security;

namespace PayrollApi.Endpoints;

public static partial class AdminEndpoints
{
    public sealed record NewUser(string? Username, string? DisplayName, int? RoleId);
    public sealed record EditUser(string? DisplayName, int? RoleId, bool? IsActive);
    public sealed record RoleBody(string? Name, string? Description, string[]? Permissions);

    [GeneratedRegex("^[A-Za-z0-9._-]{3,40}$")]
    private static partial Regex UsernamePattern();

    public static void MapAdmin(this WebApplication app)
    {
        var g = app.MapGroup("/api/admin").AddEndpointFilter(async (ctx, next) =>
            ctx.HttpContext.User().Can("users.manage")
                ? await next(ctx)
                : Reply.Error(403, "Only people who manage users can do this.", "forbidden"));

        g.MapGet("/catalog", () => Results.Ok(Permissions.Modules.Select(m => new
        {
            m.Key, m.Label, m.Group,
            actions = m.Actions.Select(a => new { a.Key, a.Label, a.Hint }),
        })));

        g.MapGet("/users", ListUsers);
        g.MapPost("/users", CreateUser);
        g.MapPut("/users/{id:int}", UpdateUser);
        g.MapPost("/users/{id:int}/reset-password", ResetPassword);
        g.MapDelete("/users/{id:int}", DeleteUser);

        g.MapGet("/roles", ListRoles);
        g.MapPost("/roles", CreateRole);
        g.MapPut("/roles/{id:int}", UpdateRole);
        g.MapDelete("/roles/{id:int}", DeleteRole);

        g.MapGet("/activity", Activity);
    }

    // ---------------------------------------------------------------- users

    private static async Task<IResult> ListUsers(HttpContext c, IDb db)
    {
        var me = c.User();
        var rows = await db.QueryAsync($"""
            SELECT u.id, u.username, u.displayName, u.roleId, r.name AS role, r.isAdmin, u.isActive, u.isDeveloper,
                   u.mustChangePassword, {Sql.IsoUtc("u.lastLoginAt")} AS lastLoginAt, {Sql.IsoUtc("u.createdAt")} AS createdAt,
                   CASE WHEN u.lockedUntil > SYSUTCDATETIME() THEN 1 ELSE 0 END AS isLocked
            FROM dbo.payroll_app_user u JOIN dbo.payroll_app_role r ON r.id = u.roleId
            WHERE u.status <> N'Deleted' {(me.IsDeveloper ? "" : "AND u.isDeveloper = 0")}
            ORDER BY u.isDeveloper DESC, u.displayName
            """);
        return Results.Content(rows.ToJsonString(), "application/json");
    }

    private static async Task<JsonObject?> Target(IDb db, AppUser me, int id)
    {
        var row = await db.FirstAsync($"""
            SELECT u.id, u.username, u.roleId, u.isActive, u.isDeveloper, r.isAdmin
            FROM dbo.payroll_app_user u JOIN dbo.payroll_app_role r ON r.id = u.roleId
            WHERE u.id = {Sql.Int(id)} AND u.status <> N'Deleted'
            """);
        if (row is null || (row.B("isDeveloper") && !me.IsDeveloper)) return null;
        return row;
    }

    private static async Task<JsonObject?> UsableRole(IDb db, AppUser me, int? roleId)
    {
        if (roleId is null) return null;
        var role = await db.FirstAsync($"SELECT id, name, isAdmin, isHidden FROM dbo.payroll_app_role WHERE id = {Sql.Int(roleId)} AND status = N'Active'");
        if (role is null || (role.B("isHidden") && !me.IsDeveloper)) return null;
        return role;
    }

    /// <summary>Would this leave the system without an active administrator (not counting the developer)?</summary>
    private static async Task<bool> LastAdmin(IDb db, int excludingUserId)
    {
        var row = await db.FirstAsync($"""
            SELECT COUNT(*) AS n FROM dbo.payroll_app_user u JOIN dbo.payroll_app_role r ON r.id = u.roleId
            WHERE u.status <> N'Deleted' AND u.isActive = 1 AND r.isAdmin = 1 AND u.isDeveloper = 0 AND u.id <> {Sql.Int(excludingUserId)}
            """);
        return (row?.I("n") ?? 0) == 0;
    }

    private static async Task<IResult> CreateUser(NewUser body, HttpContext c, IDb db, AuditLog audit, IOptions<PayrollOptions> options)
    {
        var me = c.User();
        var username = body.Username?.Trim() ?? "";
        var name = body.DisplayName?.Trim() ?? "";
        if (!UsernamePattern().IsMatch(username))
            return Reply.Error(400, "Usernames are 3 to 40 characters: letters, numbers, dot, dash or underscore.", "username");
        if (name.Length is 0 or > 120) return Reply.Error(400, "Enter the person's name.", "displayName");
        var role = await UsableRole(db, me, body.RoleId);
        if (role is null) return Reply.Error(400, "Choose a role.", "roleId");

        var taken = await db.FirstAsync($"SELECT id FROM dbo.payroll_app_user WHERE username = {Sql.Str(username)} AND status <> N'Deleted'");
        if (taken is not null) return Reply.Error(409, $"The username \"{username}\" is already in use.", "username");

        var created = await db.FirstAsync($"""
            INSERT INTO dbo.payroll_app_user (username, displayName, roleId, passwordHash, mustChangePassword, createdBy)
            OUTPUT INSERTED.id
            VALUES ({Sql.Str(username)}, {Sql.Str(name)}, {Sql.Int(role.I("id"))},
                    {Sql.Str(Passwords.Hash(options.Value.Security.DefaultPassword))}, 1, {Sql.Str(me.Username)})
            """);
        audit.Write(c, me, "USER_CREATED", $"{username} ({name}) as {role.S("name")}");
        return Results.Ok(new { id = created?.I("id") });
    }

    private static async Task<IResult> UpdateUser(int id, EditUser body, HttpContext c, IDb db, AuditLog audit)
    {
        var me = c.User();
        var t = await Target(db, me, id);
        if (t is null) return Reply.Error(404, "That user no longer exists.", "missing");

        var name = body.DisplayName?.Trim() ?? "";
        if (name.Length is 0 or > 120) return Reply.Error(400, "Enter the person's name.", "displayName");
        var role = await UsableRole(db, me, body.RoleId);
        if (role is null) return Reply.Error(400, "Choose a role.", "roleId");
        var active = body.IsActive ?? true;

        var roleChanged = role.I("id") != t.I("roleId");
        if (id == me.Id && (!active || roleChanged))
            return Reply.Error(400, "You can't disable your own account or change your own role.", "self");
        if (t.B("isAdmin") && !t.B("isDeveloper") && (!active || !role.B("isAdmin")) && await LastAdmin(db, id))
            return Reply.Error(400, "There must always be at least one active administrator.", "lastAdmin");

        await db.RawJsonAsync($"""
            UPDATE dbo.payroll_app_user
            SET displayName = {Sql.Str(name)}, roleId = {Sql.Int(role.I("id"))}, isActive = {Sql.Bit(active)},
                tokenVersion = tokenVersion + {(active ? 0 : 1)}, updatedAt = SYSUTCDATETIME(), updatedBy = {Sql.Str(me.Username)}
            WHERE id = {Sql.Int(id)}
            """);
        UserStore.Invalidate();
        var changes = new List<string>();
        if (roleChanged) changes.Add($"role → {role.S("name")}");
        if (active != t.B("isActive")) changes.Add(active ? "enabled" : "disabled");
        audit.Write(c, me, "USER_UPDATED", $"{t.S("username")}{(changes.Count > 0 ? ": " + string.Join(", ", changes) : "")}");
        return Results.Ok(new { ok = true });
    }

    private static async Task<IResult> ResetPassword(int id, HttpContext c, IDb db, AuditLog audit, IOptions<PayrollOptions> options)
    {
        var me = c.User();
        var t = await Target(db, me, id);
        if (t is null) return Reply.Error(404, "That user no longer exists.", "missing");
        if (id == me.Id) return Reply.Error(400, "Use Change password to change your own password.", "self");

        await db.RawJsonAsync($"""
            UPDATE dbo.payroll_app_user
            SET passwordHash = {Sql.Str(Passwords.Hash(options.Value.Security.DefaultPassword))}, mustChangePassword = 1,
                failedAttempts = 0, lockedUntil = NULL, tokenVersion = tokenVersion + 1,
                updatedAt = SYSUTCDATETIME(), updatedBy = {Sql.Str(me.Username)}
            WHERE id = {Sql.Int(id)}
            """);
        UserStore.Invalidate();
        audit.Write(c, me, "PASSWORD_RESET", t.S("username"));
        return Results.Ok(new { ok = true });
    }

    private static async Task<IResult> DeleteUser(int id, HttpContext c, IDb db, AuditLog audit)
    {
        var me = c.User();
        var t = await Target(db, me, id);
        if (t is null) return Reply.Error(404, "That user no longer exists.", "missing");
        if (id == me.Id) return Reply.Error(400, "You can't remove your own account.", "self");
        if (t.B("isAdmin") && !t.B("isDeveloper") && await LastAdmin(db, id))
            return Reply.Error(400, "There must always be at least one active administrator.", "lastAdmin");

        await db.RawJsonAsync($"""
            UPDATE dbo.payroll_app_user
            SET status = N'Deleted', isActive = 0, tokenVersion = tokenVersion + 1, updatedAt = SYSUTCDATETIME(), updatedBy = {Sql.Str(me.Username)}
            WHERE id = {Sql.Int(id)}
            """);
        UserStore.Invalidate();
        audit.Write(c, me, "USER_REMOVED", t.S("username"));
        return Results.Ok(new { ok = true });
    }

    // ---------------------------------------------------------------- roles

    private static async Task<IResult> ListRoles(HttpContext c, IDb db)
    {
        var me = c.User();
        var rows = await db.QueryAsync($"""
            SELECT r.id, r.name, r.description, r.permissions, r.isAdmin, r.isSystem, r.isHidden,
                   (SELECT COUNT(*) FROM dbo.payroll_app_user u WHERE u.roleId = r.id AND u.status <> N'Deleted') AS userCount
            FROM dbo.payroll_app_role r
            WHERE r.status = N'Active' {(me.IsDeveloper ? "" : "AND r.isHidden = 0")}
            ORDER BY r.isHidden DESC, r.isAdmin DESC, r.name
            """);
        foreach (var r in rows.OfType<JsonObject>())
        {
            string[] perms;
            try { perms = JsonSerializer.Deserialize<string[]>(r.S("permissions")) ?? []; } catch (JsonException) { perms = []; }
            r["permissions"] = new JsonArray(Normalise(perms).Select(p => (JsonNode)p!).ToArray());
        }
        return Results.Content(rows.ToJsonString(), "application/json");
    }

    /// <summary>Known keys only, and any action implies View of the same part.</summary>
    private static string[] Normalise(IEnumerable<string> perms)
    {
        var set = perms.Where(Permissions.AllKeys.Contains).ToHashSet();
        foreach (var p in set.ToArray())
        {
            var module = p.Split('.')[0];
            if (Permissions.AllKeys.Contains($"{module}.view")) set.Add($"{module}.view");
        }
        return [.. set.Order()];
    }

    private static string? RoleProblem(RoleBody b)
    {
        var name = b.Name?.Trim() ?? "";
        if (name.Length is < 2 or > 80) return "Give the role a name (2 to 80 characters).";
        if ((b.Description?.Length ?? 0) > 300) return "Keep the description under 300 characters.";
        return null;
    }

    private static async Task<IResult> CreateRole(RoleBody body, HttpContext c, IDb db, AuditLog audit)
    {
        var me = c.User();
        if (RoleProblem(body) is { } p) return Reply.Error(400, p, "name");
        var name = body.Name!.Trim();
        if (await db.FirstAsync($"SELECT id FROM dbo.payroll_app_role WHERE name = {Sql.Str(name)} AND status <> N'Deleted'") is not null)
            return Reply.Error(409, $"A role called \"{name}\" already exists.", "name");
        var perms = Normalise(body.Permissions ?? []);
        var row = await db.FirstAsync($"""
            INSERT INTO dbo.payroll_app_role (name, description, permissions, updatedBy)
            OUTPUT INSERTED.id
            VALUES ({Sql.Str(name)}, {Sql.Str(body.Description?.Trim())}, {Sql.Str(JsonSerializer.Serialize(perms))}, {Sql.Str(me.Username)})
            """);
        audit.Write(c, me, "ROLE_CREATED", $"{name}: {perms.Length} permissions");
        return Results.Ok(new { id = row?.I("id") });
    }

    private static async Task<IResult> UpdateRole(int id, RoleBody body, HttpContext c, IDb db, AuditLog audit)
    {
        var me = c.User();
        var role = await db.FirstAsync($"SELECT id, name, isSystem, isHidden FROM dbo.payroll_app_role WHERE id = {Sql.Int(id)} AND status = N'Active'");
        if (role is null || (role.B("isHidden") && !me.IsDeveloper)) return Reply.Error(404, "That role no longer exists.", "missing");
        if (role.B("isSystem")) return Reply.Error(400, "Built-in roles always have full access and can't be changed.", "system");
        if (RoleProblem(body) is { } p) return Reply.Error(400, p, "name");
        var name = body.Name!.Trim();
        if (await db.FirstAsync($"SELECT id FROM dbo.payroll_app_role WHERE name = {Sql.Str(name)} AND status <> N'Deleted' AND id <> {Sql.Int(id)}") is not null)
            return Reply.Error(409, $"A role called \"{name}\" already exists.", "name");
        var perms = Normalise(body.Permissions ?? []);
        await db.RawJsonAsync($"""
            UPDATE dbo.payroll_app_role
            SET name = {Sql.Str(name)}, description = {Sql.Str(body.Description?.Trim())}, permissions = {Sql.Str(JsonSerializer.Serialize(perms))},
                updatedAt = SYSUTCDATETIME(), updatedBy = {Sql.Str(me.Username)}
            WHERE id = {Sql.Int(id)}
            """);
        UserStore.Invalidate();
        audit.Write(c, me, "ROLE_UPDATED", $"{name}: {perms.Length} permissions");
        return Results.Ok(new { ok = true });
    }

    private static async Task<IResult> DeleteRole(int id, HttpContext c, IDb db, AuditLog audit)
    {
        var me = c.User();
        var role = await db.FirstAsync($"""
            SELECT r.id, r.name, r.isSystem, r.isHidden,
                   (SELECT COUNT(*) FROM dbo.payroll_app_user u WHERE u.roleId = r.id AND u.status <> N'Deleted') AS userCount
            FROM dbo.payroll_app_role r WHERE r.id = {Sql.Int(id)} AND r.status = N'Active'
            """);
        if (role is null || (role.B("isHidden") && !me.IsDeveloper)) return Reply.Error(404, "That role no longer exists.", "missing");
        if (role.B("isSystem")) return Reply.Error(400, "Built-in roles can't be removed.", "system");
        var n = role.I("userCount");
        if (n > 0) return Reply.Error(409, $"{n} user{(n == 1 ? " still has" : "s still have")} this role. Move them to another role first.", "inUse");
        await db.RawJsonAsync($"UPDATE dbo.payroll_app_role SET status = N'Deleted', updatedAt = SYSUTCDATETIME(), updatedBy = {Sql.Str(me.Username)} WHERE id = {Sql.Int(id)}");
        audit.Write(c, me, "ROLE_REMOVED", role.S("name"));
        return Results.Ok(new { ok = true });
    }

    // ---------------------------------------------------------------- activity

    private static async Task<IResult> Activity(HttpContext c, IDb db, int? take)
    {
        var n = Math.Clamp(take ?? 200, 1, 1000);
        var rows = await db.QueryAsync($"""
            SELECT TOP ({n}) a.id, {Sql.IsoUtc("a.at")} AS at, a.username, a.action, a.detail, a.ip
            FROM dbo.payroll_app_audit a ORDER BY a.id DESC
            """);
        return Results.Content(rows.ToJsonString(), "application/json");
    }
}
