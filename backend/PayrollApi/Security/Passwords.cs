using System.Security.Cryptography;
using System.Text;

namespace PayrollApi.Security;

/// <summary>PBKDF2-SHA256 with a per-password random salt.
/// Stored as: pbkdf2-sha256$iterations$saltBase64$hashBase64</summary>
public static class Passwords
{
    private const int Iterations = 100_000;
    private const int SaltBytes = 16;
    private const int HashBytes = 32;

    public static string Hash(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltBytes);
        var hash = Rfc2898DeriveBytes.Pbkdf2(Encoding.UTF8.GetBytes(password), salt, Iterations, HashAlgorithmName.SHA256, HashBytes);
        return $"pbkdf2-sha256${Iterations}${Convert.ToBase64String(salt)}${Convert.ToBase64String(hash)}";
    }

    public static bool Verify(string password, string stored)
    {
        var p = stored.Split('$');
        if (p.Length != 4 || p[0] != "pbkdf2-sha256" || !int.TryParse(p[1], out var iter)) return false;
        byte[] salt, expected;
        try { salt = Convert.FromBase64String(p[2]); expected = Convert.FromBase64String(p[3]); }
        catch (FormatException) { return false; }
        var actual = Rfc2898DeriveBytes.Pbkdf2(Encoding.UTF8.GetBytes(password), salt, iter, HashAlgorithmName.SHA256, expected.Length);
        return CryptographicOperations.FixedTimeEquals(actual, expected);
    }

    // Used when the username does not exist, so a wrong username takes as long as a wrong password.
    private static readonly string Decoy = Hash(Convert.ToBase64String(RandomNumberGenerator.GetBytes(12)));
    public static void SpendTime(string password) => Verify(password, Decoy);

    /// <summary>Rules for a password a person chooses. Returns null when it is acceptable.</summary>
    public static string? Problem(string? password, string defaultPassword, string username)
    {
        if (string.IsNullOrEmpty(password) || password.Length < 8) return "Use at least 8 characters.";
        if (password.Length > 128) return "Use 128 characters or fewer.";
        if (password == defaultPassword) return "Choose a password other than the default one.";
        if (!password.Any(char.IsLetter) || !password.Any(char.IsDigit)) return "Use both letters and numbers.";
        if (password.Contains(username, StringComparison.OrdinalIgnoreCase)) return "Don't include your username in the password.";
        return null;
    }
}
