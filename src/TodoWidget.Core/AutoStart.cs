using Microsoft.Win32;

namespace TodoWidget.Core;

/// <summary>Windows 시작 시 자동 실행. HKCU Run 키라 관리자 권한이 필요 없다.</summary>
public sealed class AutoStart
{
    public const string RunKeyPath = @"Software\Microsoft\Windows\CurrentVersion\Run";
    public const string DefaultValueName = "TodoWidget";

    private readonly string _keyPath;
    private readonly string _valueName;

    public AutoStart(string keyPath = RunKeyPath, string valueName = DefaultValueName)
    {
        _keyPath = keyPath;
        _valueName = valueName;
    }

    public bool IsEnabled => RegisteredCommand is not null;

    public string? RegisteredCommand
    {
        get
        {
            using var key = Registry.CurrentUser.OpenSubKey(_keyPath);
            return key?.GetValue(_valueName) as string;
        }
    }

    public void Enable(string exePath)
    {
        using var key = Registry.CurrentUser.CreateSubKey(_keyPath);
        key.SetValue(_valueName, $"\"{exePath}\"");
    }

    public void Disable()
    {
        using var key = Registry.CurrentUser.OpenSubKey(_keyPath, writable: true);
        key?.DeleteValue(_valueName, throwOnMissingValue: false);
    }

    /// <summary>exe를 옮겨도 자동 실행이 깨지지 않게, 켜져 있을 때만 경로를 갱신한다.</summary>
    public void RefreshPath(string exePath)
    {
        if (IsEnabled)
            Enable(exePath);
    }

    /// <summary>처음 실행이면 켜고, 이후에는 사용자가 끈 상태를 존중한다.</summary>
    public void OnLaunch(bool isFirstRun, string exePath)
    {
        if (isFirstRun)
            Enable(exePath);
        else
            RefreshPath(exePath);
    }
}
