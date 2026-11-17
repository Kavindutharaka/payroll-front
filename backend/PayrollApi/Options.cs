namespace PayrollApi;

/// <summary>Everything under "Payroll" in appsettings.json / environment variables
/// (Payroll__Jwt__Secret, Payroll__Database__ConnectionString, ...).</summary>
public sealed class PayrollOptions
{
    public DatabaseOptions Database { get; set; } = new();
    public JwtOptions Jwt { get; set; } = new();
    public CorsOptions Cors { get; set; } = new();
    public FileOptions Files { get; set; } = new();
    public SecurityOptions Security { get; set; } = new();
}

public sealed class DatabaseOptions
{
    /// <summary>"Direct" connects to SQL Server with <see cref="ConnectionString"/> (production).
    /// "Relay" forwards to the InterServer SQL handler - for local testing only, because that
    /// handler is open to anyone who knows its address.</summary>
    public string Mode { get; set; } = "Direct";
    public string ConnectionString { get; set; } = "";
    public string RelayUrl { get; set; } = "https://mas.phvtech.com/api/Master/sp";
    public int CommandTimeoutSeconds { get; set; } = 120;
}

public sealed class JwtOptions
{
    public string Secret { get; set; } = "";
    public string Issuer { get; set; } = "ais-payroll";
    public int Hours { get; set; } = 12;
}

public sealed class CorsOptions
{
    public string[] AllowedOrigins { get; set; } = [];
}

public sealed class FileOptions
{
    public string StoreUrl { get; set; } = "https://folder.phvtech.com/api/directory";
    public string Folder { get; set; } = "";
    public int MaxMegabytes { get; set; } = 25;
}

public sealed class SecurityOptions
{
    public string DefaultPassword { get; set; } = "123456";
    public int MaxFailedLogins { get; set; } = 5;
    public int LockMinutes { get; set; } = 15;
}
