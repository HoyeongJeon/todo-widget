namespace TodoWidget.Core;

/// <summary>창 폭과 최대 높이. 둘 다 그림자 여백(위아래·좌우 각 10)을 포함한 창 기준이다.</summary>
public readonly record struct WidgetSize(double Width, double MaxHeight);

/// <summary>저장된 크기를 허용 범위 안으로 맞춘다. 높이는 상한일 뿐이고, 할 일이 적으면 창은 내용만큼 줄어든다.</summary>
public static class WindowSize
{
    public const double MinWidth = 280;      // 카드 260
    public const double MaxWidth = 620;      // 카드 600
    public const double DefaultWidth = 320;  // 카드 300
    public const double MinMaxHeight = 330;  // 하는 중·시작 전 1개씩, 끝낸 것 줄, 입력칸이 보이는 높이
    public const double DefaultMaxHeightRatio = 0.5;

    public static WidgetSize Resolve(double? savedWidth, double? savedMaxHeight, double workAreaHeight)
    {
        var width = savedWidth is { } w && double.IsFinite(w)
            ? Math.Clamp(w, MinWidth, MaxWidth)
            : DefaultWidth;

        var ceiling = Math.Max(MinMaxHeight, workAreaHeight);
        var maxHeight = savedMaxHeight is { } h && double.IsFinite(h)
            ? Math.Clamp(h, MinMaxHeight, ceiling)
            : Math.Max(MinMaxHeight, workAreaHeight * DefaultMaxHeightRatio);

        return new WidgetSize(width, maxHeight);
    }
}
