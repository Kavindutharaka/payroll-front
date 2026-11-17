using System.Data;
using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Options;

namespace PayrollApi.Data;

/// <summary>A database failure the caller may show. <see cref="UserMessage"/> is only set for
/// errors the app raised on purpose (THROW 50000+), never for SQL Server's own messages.</summary>
public sealed class DbFailure(string message, string? userMessage = null) : Exception(message)
{
    public string? UserMessage { get; } = userMessage;
}

/// <summary>Runs a SQL batch and returns its first result set as a JSON array - the same shape
/// the InterServer handler returns, so the app's existing queries work unchanged.</summary>
public interface IDb
{
    Task<string> RawJsonAsync(string sql, CancellationToken ct = default);
}

public static class DbExtensions
{
    public static async Task<JsonArray> QueryAsync(this IDb db, string sql, CancellationToken ct = default)
        => JsonNode.Parse(await db.RawJsonAsync(sql, ct)) as JsonArray ?? [];

    public static async Task<JsonObject?> FirstAsync(this IDb db, string sql, CancellationToken ct = default)
        => (await db.QueryAsync(sql, ct)).FirstOrDefault() as JsonObject;
}

/// <summary>Production: straight to SQL Server.</summary>
public sealed class DirectDb(IOptions<PayrollOptions> options, ILogger<DirectDb> log) : IDb
{
    private readonly DatabaseOptions _o = options.Value.Database;

    // Column names come out camelCased and duplicates numbered (x, x1) - exactly what the
    // InterServer handler does with a DataTable and System.Text.Json.
    private static readonly JsonSerializerOptions Json = new() { DictionaryKeyPolicy = JsonNamingPolicy.CamelCase };

    public async Task<string> RawJsonAsync(string sql, CancellationToken ct = default)
    {
        try
        {
            await using var conn = new SqlConnection(_o.ConnectionString);
            await conn.OpenAsync(ct);
            await using var cmd = new SqlCommand(sql, conn) { CommandTimeout = _o.CommandTimeoutSeconds };
            var table = new DataTable();
            using (var adapter = new SqlDataAdapter(cmd)) adapter.Fill(table);

            var rows = new List<Dictionary<string, object?>>(table.Rows.Count);
            foreach (DataRow r in table.Rows)
            {
                var d = new Dictionary<string, object?>(table.Columns.Count);
                foreach (DataColumn c in table.Columns) d[c.ColumnName] = r.IsNull(c) ? null : r[c];
                rows.Add(d);
            }
            return JsonSerializer.Serialize(rows, Json);
        }
        catch (SqlException e)
        {
            log.LogWarning(e, "SQL error {Number}", e.Number);
            throw new DbFailure($"SQL error {e.Number}", e.Number >= 50000 ? e.Message : null);
        }
    }
}

/// <summary>Local testing only: forwards to the InterServer SQL handler.</summary>
public sealed class RelayDb(HttpClient http, IOptions<PayrollOptions> options) : IDb
{
    private readonly string _url = options.Value.Database.RelayUrl;

    public async Task<string> RawJsonAsync(string sql, CancellationToken ct = default)
    {
        using var res = await http.PostAsync(_url,
            new StringContent(JsonSerializer.Serialize(new { SysID = sql }), Encoding.UTF8, "application/json"), ct);
        var body = await res.Content.ReadAsStringAsync(ct);
        if (!res.IsSuccessStatusCode) throw new DbFailure($"Relay returned {(int)res.StatusCode}");
        return string.IsNullOrWhiteSpace(body) ? "[]" : body;
    }
}

/// <summary>Literals for the backend's own statements. Every value that reaches SQL text goes
/// through one of these - never string concatenation of raw input.</summary>
public static class Sql
{
    public static string Str(string? v) => v is null ? "NULL" : "N'" + v.Replace("'", "''") + "'";
    public static string Int(int? v) => v is null ? "NULL" : v.Value.ToString(CultureInfo.InvariantCulture);
    public static string Bit(bool v) => v ? "1" : "0";

    /// <summary>UTC datetime2 rendered as ISO-8601 with a Z, so browsers show local time.</summary>
    public static string IsoUtc(string column) => $"CASE WHEN {column} IS NULL THEN NULL ELSE CONVERT(varchar(19), {column}, 126) + 'Z' END";
}

public static class JsonRow
{
    public static string? SN(this JsonObject o, string k) => o[k] switch
    {
        null => null,
        JsonValue v when v.TryGetValue<string>(out var s) => s,
        var n => n.ToJsonString(),
    };
    public static string S(this JsonObject o, string k) => o.SN(k) ?? "";
    public static int I(this JsonObject o, string k) => o[k] is null ? 0 : (int)o[k]!.GetValue<decimal>();
    public static bool B(this JsonObject o, string k) => o[k] is JsonValue v && v.TryGetValue<bool>(out var b) ? b : (o[k]?.ToString() == "1");
}
