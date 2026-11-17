using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;
using PayrollApi.Data;
using PayrollApi.Security;

namespace PayrollApi.Endpoints;

public static partial class DataEndpoints
{
    public sealed record SqlBody(string? SysID);

    public static void MapData(this WebApplication app)
    {
        app.MapPost("/api/sql", RunSql).RequireRateLimiting("api");

        var files = app.MapGroup("/api/files").RequireRateLimiting("api");
        files.MapPost("/", Upload).DisableAntiforgery();
        files.MapGet("/{storedName}", Download);
    }

    /// <summary>
    /// The app's database route. Same request and response as the InterServer handler, but only
    /// for a signed-in person, only for payroll tables, and only for what their role allows.
    /// </summary>
    private static async Task<IResult> RunSql(SqlBody body, HttpContext c, IDb db, ObjectCatalog catalog,
        AuditLog audit, ILogger<SqlBody> log)
    {
        var me = c.User();
        var sql = body.SysID ?? "";
        if (sql.Trim().Length == 0) return Reply.Error(400, "Empty request.");

        List<SqlUse> uses;
        try { uses = SqlGuard.Analyse(sql, await catalog.GetAsync()); }
        catch (SqlRefused e)
        {
            log.LogWarning("Refused SQL from {User}: {Reason}", me.Username, e.Message);
            audit.Write(c, me, "REFUSED", e.Message);
            return Reply.Error(400, e.Message, "refused");
        }

        foreach (var w in uses.Where(u => u.Write))
        {
            var needed = Permissions.RequiredForWrite(w.Object, w.Action);
            if (needed is null ? !me.IsAdmin : !me.Can(needed))
            {
                var what = needed is null ? "make this change" : $"\"{Permissions.Label(needed)}\"";
                audit.Write(c, me, "DENIED", $"{w.Object} {w.Action}".Trim());
                return Reply.Error(403, $"Your role doesn't allow {what}. Ask the administrator if you need it.", "forbidden", new { permission = needed });
            }
        }
        if (!me.IsAdmin)
        {
            var blocked = uses.FirstOrDefault(u => !u.Write && !Permissions.CanRead(u.Object, me.Permissions));
            if (blocked is not null)
            {
                audit.Write(c, me, "DENIED", $"read {blocked.Object}");
                return Reply.Error(403, "Your role can't open this information. Ask the administrator if you need it.", "forbidden");
            }
        }

        string json;
        try { json = await db.RawJsonAsync(sql, c.RequestAborted); }
        catch (DbFailure e)
        {
            return Reply.Error(500, e.UserMessage ?? "The database could not complete the request.", "database");
        }

        var writes = uses.Where(u => u.Write).ToList();
        if (writes.Count > 0)
        {
            var summary = string.Join(", ", writes.GroupBy(w => $"{w.Object[8..]} {w.Action}".Trim())
                .Select(g => g.Count() > 1 ? $"{g.Key} ×{g.Count()}" : g.Key));
            audit.Write(c, me, "CHANGE", summary);
        }
        return Results.Content(json, "application/json");
    }

    // ---------------------------------------------------------------- payroll files

    [GeneratedRegex(@"[^\w.\- ]+")]
    private static partial Regex Unsafe();

    private static string StoreBase(PayrollOptions o) => $"{o.Files.StoreUrl.TrimEnd('/')}/{Uri.EscapeDataString(o.Files.Folder)}";

    private static async Task<IResult> Upload(IFormFile? file, HttpContext c, IHttpClientFactory http,
        IOptions<PayrollOptions> options, AuditLog audit)
    {
        var me = c.User();
        if (!me.Can("documents.upload")) return Reply.Error(403, "Your role doesn't allow uploading files.", "forbidden");
        if (file is null || file.Length == 0) return Reply.Error(400, "Choose a file to upload.");
        var o = options.Value;
        if (file.Length > o.Files.MaxMegabytes * 1024L * 1024L)
            return Reply.Error(400, $"Files can be up to {o.Files.MaxMegabytes} MB.");

        // the store has no login - a random prefix keeps each file's address unguessable
        var safe = Regex.Replace(Unsafe().Replace(Path.GetFileName(file.FileName), "_"), @"\s+", "_");
        if (safe.Length > 150) safe = safe[^150..];
        var storedName = $"{Convert.ToHexString(RandomNumberGenerator.GetBytes(8)).ToLowerInvariant()}_{safe}";

        using var form = new MultipartFormDataContent();
        await using var stream = file.OpenReadStream();
        var part = new StreamContent(stream);
        part.Headers.ContentType = new MediaTypeHeaderValue(string.IsNullOrEmpty(file.ContentType) ? "application/octet-stream" : file.ContentType);
        form.Add(part, "files", storedName);

        using var res = await http.CreateClient("store").PostAsync($"{StoreBase(o)}/upload", form, c.RequestAborted);
        if (!res.IsSuccessStatusCode) return Reply.Error(502, $"The file store did not accept the file ({(int)res.StatusCode}).", "store");
        var saved = (JsonNode.Parse(await res.Content.ReadAsStringAsync())?["uploadedFiles"] as JsonArray)?.FirstOrDefault()?.ToString();
        if (string.IsNullOrEmpty(saved)) return Reply.Error(502, "The file store did not confirm the upload.", "store");

        audit.Write(c, me, "FILE_UPLOADED", file.FileName);
        return Results.Ok(new { storedName = saved, fileName = file.FileName, sizeBytes = file.Length });
    }

    private static async Task<IResult> Download(string storedName, HttpContext c, IDb db, IHttpClientFactory http,
        IOptions<PayrollOptions> options)
    {
        var me = c.User();
        if (!me.Can("documents.view")) return Reply.Error(403, "Your role doesn't allow opening payroll files.", "forbidden");

        // only files that are on the list can be fetched
        var doc = await db.FirstAsync($"SELECT fileName FROM dbo.payroll_document WHERE storedName = {Sql.Str(storedName)} AND status = 'Active'");
        if (doc is null) return Reply.Error(404, "That file is no longer on the list.", "missing");

        var res = await http.CreateClient("store").GetAsync($"{StoreBase(options.Value)}/files/{Uri.EscapeDataString(storedName)}",
            HttpCompletionOption.ResponseHeadersRead, c.RequestAborted);
        if (!res.IsSuccessStatusCode) { res.Dispose(); return Reply.Error(502, "The file store could not return the file.", "store"); }
        c.Response.RegisterForDispose(res);
        return Results.Stream(await res.Content.ReadAsStreamAsync(),
            res.Content.Headers.ContentType?.ToString() ?? "application/octet-stream", doc.S("fileName"));
    }
}
