using System.Text;

namespace PayrollApi.Security;

public sealed record SqlUse(string Object, bool Write, string? Action);

/// <summary>Why a batch was refused. <see cref="Permission"/> is set when the batch is fine
/// but the person's role does not allow it.</summary>
public sealed class SqlRefused(string message, string? permission = null) : Exception(message)
{
    public string? Permission { get; } = permission;
}

/// <summary>
/// Reads a SQL batch sent by the app and works out which payroll tables it reads and which it
/// changes (and with which stored-procedure action), so the request can be checked against the
/// person's role before it reaches the database.
///
/// It is deliberately strict: anything it does not recognise is refused. Only dbo.payroll_*
/// objects may be used; the login tables, system catalogs, other databases, dynamic SQL and
/// schema changes are never allowed through this route.
/// </summary>
public static class SqlGuard
{
    private enum K { Name, Str, Num, Punct }

    private sealed record Tok(K Kind, string Text, string[] Parts, bool Quoted)
    {
        public bool Is(string word) => Kind == K.Name && !Quoted && Parts.Length == 1 && Parts[0].Equals(word, StringComparison.OrdinalIgnoreCase);
        public bool P(char c) => Kind == K.Punct && Text[0] == c;
        public string Lower => Text.ToLowerInvariant();
    }

    private static readonly HashSet<string> Blocked = new(StringComparer.OrdinalIgnoreCase)
    {
        "create", "alter", "drop", "truncate", "grant", "revoke", "deny", "backup", "restore", "shutdown",
        "reconfigure", "dbcc", "use", "openrowset", "openquery", "opendatasource", "openxml", "bulk", "waitfor",
        "kill", "checkpoint", "setuser", "revert", "readtext", "writetext", "updatetext", "enable", "disable",
    };

    // words that end a FROM list item (so they are not taken for a table alias)
    private static readonly HashSet<string> Clause = new(StringComparer.OrdinalIgnoreCase)
    {
        "where", "join", "inner", "left", "right", "full", "cross", "outer", "on", "group", "order", "having",
        "union", "except", "intersect", "with", "option", "pivot", "unpivot", "for", "set", "select", "insert",
        "update", "delete", "exec", "execute", "declare", "if", "else", "begin", "end", "commit", "rollback",
        "throw", "return", "while", "into", "values", "output", "when", "then", "apply", "as", "go", "merge",
    };

    private static readonly HashSet<string> TableFunctions = new(StringComparer.OrdinalIgnoreCase) { "openjson", "string_split" };

    /// <param name="objects">payroll_* tables and procedures that exist (lower case), procedures flagged.</param>
    public static List<SqlUse> Analyse(string sql, IReadOnlyDictionary<string, bool> objects)
    {
        var t = Lex(sql);
        var uses = new List<SqlUse>();
        var ctes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var execTargets = new HashSet<int>();

        // common table expressions: WITH x AS (  /  , x AS (  /  x (cols) AS (
        for (int i = 1; i < t.Count - 2; i++)
        {
            if (t[i].Kind != K.Name || t[i].Parts.Length != 1) continue;
            if (!(t[i - 1].Is("with") || t[i - 1].P(','))) continue;
            int j = i + 1;
            if (t[j].P('(')) j = SkipParens(t, j);
            if (j + 1 < t.Count && t[j].Is("as") && t[j + 1].P('(')) ctes.Add(t[i].Parts[0]);
        }

        string? Resolve(Tok x)
        {
            if (x.Kind != K.Name) return null;
            if (x.Parts.Length == 1) return x.Parts[0].ToLowerInvariant();
            if (x.Parts.Length == 2 && x.Parts[0].Equals("dbo", StringComparison.OrdinalIgnoreCase)) return x.Parts[1].ToLowerInvariant();
            return null;
        }

        void Target(Tok x, bool write, bool tableVarOk = true)
        {
            if (x.Kind == K.Name && x.Parts.Length == 1 && x.Parts[0].StartsWith('@'))
            {
                if (!tableVarOk) throw new SqlRefused("This request is not allowed (dynamic SQL).");
                return; // table variable
            }
            var name = Resolve(x) ?? throw new SqlRefused($"\"{x.Text}\" is not a payroll table.");
            if (!write && ctes.Contains(name)) return;
            if (name.StartsWith("payroll_app_")) throw new SqlRefused("The login tables cannot be used from here.");
            if (!objects.ContainsKey(name)) throw new SqlRefused($"\"{x.Text}\" is not a payroll table.");
            uses.Add(new SqlUse(name, write, null));
        }

        // FROM / JOIN / APPLY sources, including comma-separated lists
        void Sources(int j, bool firstIsWrite)
        {
            bool write = firstIsWrite;
            while (j < t.Count)
            {
                var x = t[j];
                if (x.P('(')) j = SkipParens(t, j);
                else if (x.Kind == K.Name && x.Parts.Length == 1 && TableFunctions.Contains(x.Parts[0]) && j + 1 < t.Count && t[j + 1].P('('))
                    j = SkipParens(t, j + 1);
                else if (x.Kind == K.Name && !(Clause.Contains(x.Text) && !x.Quoted)) { Target(x, write); j++; }
                else return;

                write = false;
                if (j < t.Count && t[j].Is("as")) j += 2;
                else if (j < t.Count && t[j].Kind == K.Name && !(Clause.Contains(t[j].Text) && !t[j].Quoted)) j++;
                if (j + 1 < t.Count && t[j].Is("with") && t[j + 1].P('(')) j = SkipParens(t, j + 1);
                if (j < t.Count && t[j].P(',')) { j++; continue; }
                return;
            }
        }

        bool deleteFrom = false;
        for (int i = 0; i < t.Count; i++)
        {
            var x = t[i];
            if (x.Kind != K.Name) continue;

            // names anywhere in the batch
            if (x.Parts.Any(p => p.StartsWith("payroll_app_", StringComparison.OrdinalIgnoreCase)))
                throw new SqlRefused("The login tables cannot be used from here.");
            if (x.Parts.Length >= 3 || x.Parts.Any(p => p.Length == 0))
                throw new SqlRefused("Only this database's payroll tables can be used.");
            if (x.Parts.Length == 2)
            {
                var schema = x.Parts[0].ToLowerInvariant();
                if (schema is "sys" or "information_schema" or "master" or "msdb" or "tempdb" or "model")
                    throw new SqlRefused("System tables cannot be used from here.");
                if (schema == "dbo" && !objects.ContainsKey(x.Parts[1].ToLowerInvariant()))
                    throw new SqlRefused($"\"{x.Text}\" is not a payroll table.");
            }
            if (!x.Quoted && x.Parts.Length == 1 && (x.Parts[0].StartsWith("sp_", StringComparison.OrdinalIgnoreCase) || x.Parts[0].StartsWith("xp_", StringComparison.OrdinalIgnoreCase)))
                throw new SqlRefused("System procedures cannot be used from here.");
            if (!x.Quoted && x.Parts.Length == 1 && Blocked.Contains(x.Parts[0]))
                throw new SqlRefused($"{x.Parts[0].ToUpperInvariant()} statements are not allowed.");

            if (x.Quoted || x.Parts.Length != 1) continue;
            var next = i + 1 < t.Count ? t[i + 1] : null;
            switch (x.Lower)
            {
                case "from":
                    Sources(i + 1, deleteFrom);
                    deleteFrom = false;
                    break;
                case "join":
                case "apply":
                    Sources(i + 1, false);
                    break;
                case "into":
                    if (next is null) throw new SqlRefused("Incomplete statement.");
                    Target(next, true);
                    break;
                case "update":
                    if (next is null) throw new SqlRefused("Incomplete statement.");
                    Target(next, true);
                    break;
                case "delete":
                    if (next is not null && next.Is("from")) deleteFrom = true;
                    else if (next is not null) Target(next, true);
                    break;
                case "merge":
                    if (next is not null && !next.Is("into")) Target(next, true);
                    break;
                case "exec":
                case "execute":
                {
                    int j = i + 1;
                    // EXEC @rc = dbo.proc ...
                    if (j + 2 < t.Count && t[j].Kind == K.Name && t[j].Parts[0].StartsWith('@') && t[j + 1].P('=')) j += 2;
                    if (j >= t.Count || t[j].Kind != K.Name || t[j].Parts[0].StartsWith('@'))
                        throw new SqlRefused("This request is not allowed (dynamic SQL).");
                    var name = Resolve(t[j]) ?? throw new SqlRefused($"\"{t[j].Text}\" is not a payroll procedure.");
                    if (!objects.TryGetValue(name, out var isProc) || !isProc || name.StartsWith("payroll_app_"))
                        throw new SqlRefused($"\"{t[j].Text}\" is not a payroll procedure.");
                    execTargets.Add(j);
                    uses.Add(new SqlUse(name, !Permissions.ReadProcedures.Contains(name), ActionOf(t, j + 1)));
                    break;
                }
            }
        }

        // a procedure named without EXEC (allowed by SQL Server at the start of a batch)
        for (int i = 0; i < t.Count; i++)
        {
            var name = t[i].Kind == K.Name ? Resolve(t[i]) : null;
            if (name is not null && objects.TryGetValue(name, out var isProc) && isProc && !execTargets.Contains(i))
                throw new SqlRefused("Procedures must be called with EXEC.");
        }
        return uses;
    }

    private static string? ActionOf(List<Tok> t, int from)
    {
        for (int k = from; k < t.Count - 2; k++)
        {
            if (t[k].P(';') || t[k].Is("exec") || t[k].Is("execute") || t[k].Is("select") || t[k].Is("insert")) break;
            if (t[k].Kind == K.Name && t[k].Text.Equals("@action", StringComparison.OrdinalIgnoreCase) && t[k + 1].P('=') && t[k + 2].Kind == K.Str)
                return t[k + 2].Text.Trim().ToUpperInvariant();
        }
        return null;
    }

    private static int SkipParens(List<Tok> t, int open)
    {
        int depth = 0;
        for (int k = open; k < t.Count; k++)
        {
            if (t[k].P('(')) depth++;
            else if (t[k].P(')') && --depth == 0) return k + 1;
        }
        return t.Count;
    }

    private static List<Tok> Lex(string s)
    {
        var list = new List<Tok>();
        int i = 0, n = s.Length;
        while (i < n)
        {
            char c = s[i];
            if (char.IsWhiteSpace(c)) { i++; continue; }
            if (c == '-' && i + 1 < n && s[i + 1] == '-') { while (i < n && s[i] != '\n') i++; continue; }
            if (c == '/' && i + 1 < n && s[i + 1] == '*')
            {
                int depth = 0;
                while (i < n)
                {
                    if (i + 1 < n && s[i] == '/' && s[i + 1] == '*') { depth++; i += 2; }
                    else if (i + 1 < n && s[i] == '*' && s[i + 1] == '/') { depth--; i += 2; if (depth == 0) break; }
                    else i++;
                }
                if (depth != 0) throw new SqlRefused("Unclosed comment.");
                continue;
            }
            if ((c == 'N' || c == 'n') && i + 1 < n && s[i + 1] == '\'') { i++; c = '\''; }
            if (c == '\'')
            {
                var sb = new StringBuilder();
                i++;
                while (true)
                {
                    if (i >= n) throw new SqlRefused("Unclosed text value.");
                    if (s[i] == '\'') { if (i + 1 < n && s[i + 1] == '\'') { sb.Append('\''); i += 2; continue; } i++; break; }
                    sb.Append(s[i++]);
                }
                list.Add(new Tok(K.Str, sb.ToString(), [], false));
                continue;
            }
            if (char.IsDigit(c) || (c == '.' && i + 1 < n && char.IsDigit(s[i + 1])))
            {
                int st = i;
                while (i < n && (char.IsLetterOrDigit(s[i]) || s[i] == '.' || ((s[i] == '+' || s[i] == '-') && (s[i - 1] == 'e' || s[i - 1] == 'E')))) i++;
                list.Add(new Tok(K.Num, s[st..i], [], false));
                continue;
            }
            if (IsNameStart(c) || c == '[' || c == '"')
            {
                var parts = new List<string>();
                bool quoted = false;
                var text = new StringBuilder();
                while (true)
                {
                    if (i < n && (s[i] == '[' || s[i] == '"'))
                    {
                        char close = s[i] == '[' ? ']' : '"';
                        var sb = new StringBuilder();
                        i++;
                        while (true)
                        {
                            if (i >= n) throw new SqlRefused("Unclosed name.");
                            if (s[i] == close) { if (i + 1 < n && s[i + 1] == close) { sb.Append(close); i += 2; continue; } i++; break; }
                            sb.Append(s[i++]);
                        }
                        parts.Add(sb.ToString()); quoted = true; text.Append(sb);
                    }
                    else if (i < n && IsNameStart(s[i]))
                    {
                        int st = i;
                        while (i < n && IsNamePart(s[i])) i++;
                        parts.Add(s[st..i]); text.Append(s, st, i - st);
                    }
                    else if (i < n && s[i] == '*' && parts.Count > 0) { parts.Add("*"); text.Append('*'); i++; } // e.*
                    else parts.Add(""); // a..b

                    // dotted names (allow spaces around the dot)
                    int k = i;
                    while (k < n && s[k] == ' ') k++;
                    if (k < n && s[k] == '.' && !(k + 1 < n && char.IsDigit(s[k + 1])))
                    {
                        i = k + 1;
                        while (i < n && s[i] == ' ') i++;
                        text.Append('.');
                        continue;
                    }
                    break;
                }
                list.Add(new Tok(K.Name, text.ToString(), [.. parts], quoted));
                continue;
            }
            list.Add(new Tok(K.Punct, c.ToString(), [], false));
            i++;
        }
        return list;
    }

    private static bool IsNameStart(char c) => char.IsLetter(c) || c == '_' || c == '@' || c == '#';
    private static bool IsNamePart(char c) => char.IsLetterOrDigit(c) || c == '_' || c == '@' || c == '#' || c == '$';
}
