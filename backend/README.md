# AIS Payroll API

The secure layer between the payroll app and SQL Server. The browser never talks to the
database directly: every request carries a sign-in token, and every SQL statement is
checked (allowed objects only) and permission-checked against the user's role before it runs.

- .NET 8 minimal API (`PayrollApi/`)
- Sign-in: PBKDF2 password hashes, JWT sessions (12 h), lock after 5 failed tries for 15 min
- Roles and permissions: `dbo.payroll_app_role`, users `dbo.payroll_app_user`, audit `dbo.payroll_app_audit`
- What can be granted lives in one place: `Security/Permissions.cs`

## Run locally

```bash
cd backend/PayrollApi
dotnet run --launch-profile PayrollApi
```

Listens on http://localhost:5080. `appsettings.Development.json` uses **Relay** mode
(forwards SQL to the open endpoint) so it works without a connection string - for testing only.
The React app reads `REACT_APP_API_BASE` from `.env.development`.

## Deploy to InterServer (IIS)

1. Publish:

   ```bash
   dotnet publish backend/PayrollApi -c Release -o backend/publish
   ```

2. Create an IIS site (e.g. `payroll-api.phvtech.com`) pointing at the publish folder,
   app pool **No Managed Code**, HTTPS binding. The ASP.NET Core 8 Hosting Bundle must be installed.

3. Set these as environment variables on the app pool (or in `web.config` `<environmentVariables>`,
   or an `appsettings.Production.json` next to the dll - that file is git-ignored). Never commit them.

   | Setting | Value |
   |---|---|
   | `Payroll__Jwt__Secret` | at least 32 random characters (e.g. `openssl rand -base64 48`) |
   | `Payroll__Database__Mode` | `Direct` |
   | `Payroll__Database__ConnectionString` | `Server=...;Database=...;User Id=...;Password=...;TrustServerCertificate=True` |
   | `Payroll__Cors__AllowedOrigins__0` | the frontend origin, e.g. `https://payroll.phvtech.com` |

   The API refuses to start without a JWT secret (outside Development) or, in Direct mode,
   without a connection string.

   Use a SQL login that can only reach the payroll database. Changing the JWT secret signs everyone out.

4. Check `https://<api-host>/api/health` returns `{"ok":true,"database":"direct"}`.

5. Frontend: set `REACT_APP_API_BASE` in `.env.production` to the API host, then
   `npm run build` and deploy `build/` as before.

## Important: close the old door

Until the old open SQL endpoint (`mas.phvtech.com/api/Master/sp`) can no longer reach the payroll
database, anyone who knows it can bypass this API. After the new API is live in Direct mode,
remove or restrict that endpoint's access to the payroll database.

## Accounts

- `Users & Roles` in the app (needs the *Users & roles - Manage* permission) adds users, resets
  forgotten passwords to the default and edits what each role can do.
- New and reset accounts get the default password and must change it at first sign-in.
- Built-in roles: Administrator (everything), Payroll Officer, Auditor, Report Viewer. Add more as needed.
- The developer account and role are hidden from everyone else.
