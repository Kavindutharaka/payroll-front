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

API: `https://payroll-back.phvtech.com` · App: `https://payroll.phvtech.com`

1. Publish:

   ```bash
   dotnet publish backend/PayrollApi -c Release -o backend/publish
   ```

2. IIS site `payroll-back.phvtech.com` pointing at the uploaded publish folder, app pool
   **No Managed Code**, HTTPS binding. The ASP.NET Core 8 Hosting Bundle must be installed on the server.

3. `appsettings.Production.json` next to `PayrollApi.dll` holds the production settings
   (template: `PayrollApi/appsettings.Production.example.json`). It is git-ignored and never
   committed. Set the SQL connection string in it.

   | Setting | Value |
   |---|---|
   | `Jwt:Secret` | at least 32 random characters. Changing it signs everyone out |
   | `Database:Mode` | `Direct` |
   | `Database:ConnectionString` | `Server=...;Database=...;User Id=...;Password=...;TrustServerCertificate=True` |
   | `Cors:AllowedOrigins` | `https://payroll.phvtech.com` (the app's address, exactly) |

   The same settings can be environment variables instead (`Payroll__Jwt__Secret`, ...).
   The API refuses to start without a JWT secret or, in Direct mode, without a connection string.
   Use a SQL login that can only reach the payroll database.

4. Check `https://payroll-back.phvtech.com/api/health`:
   `{"ok":true,"database":"direct","databaseReachable":true}`. `databaseReachable:false` means the
   connection string or SQL login is wrong. A 500.30/500.31 page means the API could not start:
   set `stdoutLogEnabled="true"` in its `web.config` and read `logs\stdout*.log`.

5. Front end: `npm run build`, upload `build/` with the site's own `web.config` as before.
   The API address is in **`config.js`** next to `index.html`. Edit it on the server if the API
   moves; no rebuild is needed. (`.env.production` is only the fallback.)

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
