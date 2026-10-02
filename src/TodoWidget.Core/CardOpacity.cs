namespace TodoWidget.Core;

/// <summary>카드 배경의 불투명도. 글자는 항상 선명하고 배경만 비친다.</summary>
public static class CardOpacity
{
    public const double Min = 0.6;
    public const double Default = 1.0;

    /// <summary>⋯ 메뉴 슬라이더의 끝값: 투명도 0%(불투명)~40%.</summary>
    public const int MaxTransparencyPercent = 40;

    public static double Resolve(double? saved) =>
        saved is { } v && double.IsFinite(v) ? Math.Clamp(v, Min, Default) : Default;

    /// <summary>슬라이더는 "얼마나 비치는가"를 보여 준다. 불투명도 0.85 → 투명도 15%.</summary>
    public static int ToTransparencyPercent(double opacity) =>
        (int)Math.Round((1 - Resolve(opacity)) * 100);

    public static double FromTransparencyPercent(double percent) =>
        Resolve(1 - Math.Round(percent) / 100);
}
