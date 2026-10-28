// Kompass.exe: double-click entry point on Windows. It only finds Node.js and runs
// launcher\kompass.mjs without a console window; everything else happens there.
// Compiled by install.ps1 with the C# compiler that ships with Windows (C# 5).
using System;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Windows.Forms;

[assembly: System.Reflection.AssemblyTitle("Kompass")]
[assembly: System.Reflection.AssemblyProduct("Kompass")]
[assembly: System.Reflection.AssemblyVersion("1.0.0.0")]

static class Launcher
{
    static readonly bool German = CultureInfo.CurrentUICulture.TwoLetterISOLanguageName == "de";

    [STAThread]
    static int Main()
    {
        string root = AppDomain.CurrentDomain.BaseDirectory;
        try
        {
            string node = FindNode();
            if (node == null)
            {
                Fail(German
                    ? "Node.js wurde nicht gefunden.\nBitte die aktuelle LTS-Version von nodejs.org installieren."
                    : "Node.js was not found.\nPlease install the current LTS version from nodejs.org.");
                return 1;
            }
            var psi = new ProcessStartInfo(node, "\"" + Path.Combine(root, @"launcher\kompass.mjs") + "\"");
            psi.WorkingDirectory = root;
            psi.UseShellExecute = false;
            psi.CreateNoWindow = true;
            Process.Start(psi);
            return 0;
        }
        catch (Exception ex)
        {
            Fail((German ? "Kompass konnte nicht gestartet werden.\n\n" : "Kompass could not be started.\n\n") + ex.Message);
            return 1;
        }
    }

    static string FindNode()
    {
        var path = Environment.GetEnvironmentVariable("PATH") ?? "";
        foreach (var dir in path.Split(';'))
        {
            try
            {
                var candidate = Path.Combine(dir.Trim().Trim('"'), "node.exe");
                if (dir.Trim().Length > 0 && File.Exists(candidate)) return candidate;
            }
            catch (ArgumentException) { }
        }
        string[] known =
        {
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"nodejs\node.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Programs\nodejs\node.exe"),
        };
        foreach (var k in known) if (File.Exists(k)) return k;
        return null;
    }

    static void Fail(string message)
    {
        MessageBox.Show(message, "Kompass", MessageBoxButtons.OK, MessageBoxIcon.Warning);
    }
}
