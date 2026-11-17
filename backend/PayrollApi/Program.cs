using System.Security.Cryptography;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;
using PayrollApi;
using PayrollApi.Data;
using PayrollApi.Endpoints;
using PayrollApi.Security;

var builder = WebApplication.CreateBuilder(args);
var section = builder.Configuration.GetSection("Payroll");
var settings = section.Get<PayrollOptions>() ?? new PayrollOptions();

// ---- settings that must be right before anything starts
if (string.IsNullOrWhiteSpace(settings.Jwt.Secret))
{
    if (!builder.Environment.IsDevelopment())
        throw new InvalidOperationException("Set Payroll:Jwt:Secret (at least 32 random characters) before starting the API.");
    settings.Jwt.Secret = Convert.ToBase64String(RandomNumberGenerator.GetBytes(48)); // dev: sessions end on restart
}
if (settings.Jwt.Secret.Length < 32)
    throw new InvalidOperationException("Payroll:Jwt:Secret must be at least 32 characters.");
var relay = settings.Database.Mode.Equals("Relay", StringComparison.OrdinalIgnoreCase);
if (!relay && string.IsNullOrWhiteSpace(settings.Database.ConnectionString))
    throw new InvalidOperationException("Set Payroll:Database:ConnectionString, or Payroll:Database:Mode = Relay for local testing.");

builder.Services.Configure<PayrollOptions>(section);
builder.Services.PostConfigure<PayrollOptions>(o => o.Jwt.Secret = settings.Jwt.Secret);

// ---- services
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient("store", h => h.Timeout = TimeSpan.FromMinutes(5));
if (relay)
{
    builder.Services.AddHttpClient("relay", h => h.Timeout = TimeSpan.FromSeconds(settings.Database.CommandTimeoutSeconds + 10));
    builder.Services.AddSingleton<IDb>(sp => new RelayDb(sp.GetRequiredService<IHttpClientFactory>().CreateClient("relay"),
        sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<PayrollOptions>>()));
}
else builder.Services.AddSingleton<IDb, DirectDb>();
builder.Services.AddSingleton<UserStore>();
builder.Services.AddSingleton<ObjectCatalog>();
builder.Services.AddSingleton<AuditLog>();
builder.Services.AddSingleton<TokenService>();

// Payroll answers are large and repetitive JSON (one month's sheet is ~200 KB) - compressed
// they are a tenth of that, which is most of the wait on a slow office connection.
builder.Services.AddResponseCompression(o =>
{
    o.EnableForHttps = true;
    o.Providers.Add<Microsoft.AspNetCore.ResponseCompression.BrotliCompressionProvider>();
    o.Providers.Add<Microsoft.AspNetCore.ResponseCompression.GzipCompressionProvider>();
});
builder.Services.Configure<Microsoft.AspNetCore.ResponseCompression.BrotliCompressionProviderOptions>(o => o.Level = System.IO.Compression.CompressionLevel.Fastest);
builder.Services.Configure<Microsoft.AspNetCore.ResponseCompression.GzipCompressionProviderOptions>(o => o.Level = System.IO.Compression.CompressionLevel.Fastest);

builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .WithOrigins(settings.Cors.AllowedOrigins)
    .AllowAnyHeader()
    .WithMethods("GET", "POST", "PUT", "DELETE")
    .WithExposedHeaders("Content-Disposition")
    // the browser asks "may I?" (OPTIONS) before each request from the app's own address;
    // remembering the answer saves a round trip on every one of them
    .SetPreflightMaxAge(TimeSpan.FromHours(2))));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o =>
{
    o.MapInboundClaims = false;
    o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true, ValidIssuer = settings.Jwt.Issuer,
        ValidateAudience = true, ValidAudience = settings.Jwt.Issuer,
        ValidateLifetime = true, ClockSkew = TimeSpan.FromMinutes(1),
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(settings.Jwt.Secret)),
        NameClaimType = "name",
    };
    o.Events = new JwtBearerEvents
    {
        // the token alone is not enough: the account must still be active and the token not
        // older than the last password change / reset / disable
        OnTokenValidated = async ctx =>
        {
            var sub = ctx.Principal?.FindFirst("sub")?.Value;
            var tv = ctx.Principal?.FindFirst("tv")?.Value;
            if (!int.TryParse(sub, out var id)) { ctx.Fail("bad token"); return; }
            var user = await ctx.HttpContext.RequestServices.GetRequiredService<UserStore>().GetAsync(id);
            if (user is null || !user.IsActive || user.TokenVersion.ToString() != tv) { ctx.Fail("session ended"); return; }
            ctx.HttpContext.Items["appUser"] = user;
        },
        OnChallenge = async ctx =>
        {
            ctx.HandleResponse();
            ctx.Response.StatusCode = 401;
            await ctx.Response.WriteAsJsonAsync(new { error = "Your session has ended. Please sign in again.", code = "session" });
        },
    };
});
builder.Services.AddAuthorization(o =>
    o.FallbackPolicy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build());

builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = 429;
    o.OnRejected = async (ctx, ct) =>
        await ctx.HttpContext.Response.WriteAsJsonAsync(new { error = "Too many requests. Please wait a moment and try again.", code = "rate" }, ct);
    o.AddPolicy("login", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ctx.Connection.RemoteIpAddress?.ToString() ?? "?",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(1) }));
    o.AddPolicy("api", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ctx.User.FindFirst("sub")?.Value ?? ctx.Connection.RemoteIpAddress?.ToString() ?? "?",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 900, Window = TimeSpan.FromMinutes(1) }));
});

var app = builder.Build();

app.UseExceptionHandler(e => e.Run(async ctx =>
{
    ctx.Response.StatusCode = 500;
    await ctx.Response.WriteAsJsonAsync(new { error = "Something went wrong on the server. Please try again.", code = "server" });
}));

app.Use(async (ctx, next) =>
{
    var h = ctx.Response.Headers;
    h.XContentTypeOptions = "nosniff";
    h.XFrameOptions = "DENY";
    h["Referrer-Policy"] = "no-referrer";
    h.CacheControl = "no-store";
    await next();
});

// data only: sign-in answers carry the session token and stay uncompressed (BREACH)
app.UseWhen(ctx => !ctx.Request.Path.StartsWithSegments("/api/auth"), branch => branch.UseResponseCompression());
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

// someone on the default / reset password may only change it
app.Use(async (ctx, next) =>
{
    if (ctx.Items["appUser"] is AppUser { MustChangePassword: true } && !ctx.Request.Path.StartsWithSegments("/api/auth"))
    {
        ctx.Response.StatusCode = 403;
        await ctx.Response.WriteAsJsonAsync(new { error = "Please set a new password before continuing.", code = "password_change_required" });
        return;
    }
    await next();
});
app.UseRateLimiter();

app.MapGet("/api/health", () => Results.Ok(new { ok = true, database = relay ? "relay" : "direct" })).AllowAnonymous();
app.MapAuth();
app.MapAdmin();
app.MapData();

app.Run();
