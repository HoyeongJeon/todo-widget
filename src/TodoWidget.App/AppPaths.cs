using System.IO;

namespace TodoWidget.App;

/// <summary>데이터 폴더. 개발 중에는 TODOWIDGET_DATA_DIR로 실제 데이터와 분리한다.</summary>
internal static class AppPaths
{
    public static string DataDir { get; } =
        Environment.GetEnvironmentVariable("TODOWIDGET_DATA_DIR") is { Length: > 0 } custom
            ? custom
            : Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "TodoWidget");

    public static string TasksFile => Path.Combine(DataDir, "tasks.json");

    public static string SettingsFile => Path.Combine(DataDir, "settings.json");
}
