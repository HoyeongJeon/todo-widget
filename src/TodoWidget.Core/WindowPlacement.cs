namespace TodoWidget.Core;

public readonly record struct ScreenRect(double Left, double Top, double Width, double Height)
{
    public double Right => Left + Width;

    public double Bottom => Top + Height;
}

/// <summary>저장된 창 위치가 화면 밖이면 기본 위치(작업 영역 오른쪽 위)로 되돌린다.</summary>
public static class WindowPlacement
{
    public const double Margin = 24;

    // 헤더를 잡아 끌 수 있으려면 이만큼은 화면에 보여야 한다.
    private const double MinVisible = 40;

    public static (double Left, double Top) Resolve(
        double? savedLeft, double? savedTop, double windowWidth, ScreenRect virtualScreen, ScreenRect workArea)
    {
        if (savedLeft is { } left && savedTop is { } top && HeaderIsReachable(left, top, windowWidth, virtualScreen))
            return (left, top);

        return (workArea.Right - windowWidth - Margin, workArea.Top + Margin);
    }

    private static bool HeaderIsReachable(double left, double top, double width, ScreenRect screen) =>
        left + width - MinVisible >= screen.Left
        && left + MinVisible <= screen.Right
        && top >= screen.Top
        && top + MinVisible <= screen.Bottom;
}
