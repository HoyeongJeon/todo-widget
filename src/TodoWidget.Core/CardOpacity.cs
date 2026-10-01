namespace TodoWidget.Core;

/// <summary>카드 배경의 불투명도. 글자는 항상 선명하고 배경만 비친다.</summary>
public static class CardOpacity
{
    public const double Min = 0.6;
    public const double Default = 1.0;

    /// <summary>⋯ 메뉴에 보여 줄 선택지: 100%~60%, 10% 간격.</summary>
    public static IReadOnlyList<double> Choices { get; } = [1.0, 0.9, 0.8, 0.7, 0.6];

    public static double Resolve(double? saved) =>
        saved is { } v && double.IsFinite(v) ? Math.Clamp(v, Min, Default) : Default;
}
