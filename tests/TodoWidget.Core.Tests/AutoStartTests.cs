using Microsoft.Win32;
using TodoWidget.Core;
using Xunit;

namespace TodoWidget.Core.Tests;

public sealed class AutoStartTests : IDisposable
{
    private readonly string _keyPath = $@"Software\TodoWidgetTests\{Guid.NewGuid():N}";

    public void Dispose() => Registry.CurrentUser.DeleteSubKeyTree(_keyPath, throwOnMissingSubKey: false);

    private AutoStart Create() => new(_keyPath);

    [Fact]
    public void Disabled_when_nothing_is_registered()
    {
        Assert.False(Create().IsEnabled);
        Assert.Null(Create().RegisteredCommand);
    }

    [Fact]
    public void Enable_registers_the_quoted_exe_path()
    {
        var autoStart = Create();

        autoStart.Enable(@"C:\dev\todo\dist\TodoWidget.exe");

        Assert.True(autoStart.IsEnabled);
        Assert.Equal("\"C:\\dev\\todo\\dist\\TodoWidget.exe\"", autoStart.RegisteredCommand);
    }

    [Fact]
    public void Disable_removes_the_value_and_is_safe_to_repeat()
    {
        var autoStart = Create();
        autoStart.Enable(@"C:\a\TodoWidget.exe");

        autoStart.Disable();
        autoStart.Disable();

        Assert.False(autoStart.IsEnabled);
    }

    [Fact]
    public void RefreshPath_updates_the_path_only_when_enabled()
    {
        var autoStart = Create();

        autoStart.RefreshPath(@"C:\new\TodoWidget.exe");
        Assert.False(autoStart.IsEnabled);

        autoStart.Enable(@"C:\old\TodoWidget.exe");
        autoStart.RefreshPath(@"C:\new\TodoWidget.exe");
        Assert.Equal("\"C:\\new\\TodoWidget.exe\"", autoStart.RegisteredCommand);
    }

    [Fact]
    public void First_launch_enables_auto_start()
    {
        var autoStart = Create();

        autoStart.OnLaunch(isFirstRun: true, @"C:\a\TodoWidget.exe");

        Assert.True(autoStart.IsEnabled);
    }

    [Fact]
    public void Later_launches_respect_the_user_turning_it_off()
    {
        var autoStart = Create();

        autoStart.OnLaunch(isFirstRun: false, @"C:\a\TodoWidget.exe");

        Assert.False(autoStart.IsEnabled);
    }
}
