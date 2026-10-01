using System.Text.Json;

namespace TodoWidget.Core;

/// <summary>settings.json 읽기/쓰기. 문제가 있으면 조용히 기본값을 쓴다.</summary>
public sealed class SettingsStore
{
    private static readonly JsonSerializerOptions Options = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private readonly string _filePath;

    public SettingsStore(string filePath) => _filePath = filePath;

    public bool Exists => File.Exists(_filePath);

    public WidgetSettings Load()
    {
        if (!Exists)
            return new WidgetSettings();

        try
        {
            return JsonSerializer.Deserialize<WidgetSettings>(File.ReadAllText(_filePath), Options) ?? new WidgetSettings();
        }
        catch (Exception e) when (e is JsonException or IOException or UnauthorizedAccessException)
        {
            return new WidgetSettings();
        }
    }

    public void Save(WidgetSettings settings)
    {
        var copy = new WidgetSettings
        {
            Left = Finite(settings.Left),
            Top = Finite(settings.Top),
            Width = Finite(settings.Width),
            MaxHeight = Finite(settings.MaxHeight),
            Pinned = settings.Pinned,
            DoneExpanded = settings.DoneExpanded,
        };
        AtomicFile.WriteAllText(_filePath, JsonSerializer.Serialize(copy, Options));
    }

    // WPF 창 좌표는 표시 전 NaN일 수 있고, JSON은 NaN을 저장하지 못한다.
    private static double? Finite(double? value) => value is { } v && double.IsFinite(v) ? v : null;
}
