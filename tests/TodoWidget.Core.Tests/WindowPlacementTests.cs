using TodoWidget.Core;
using Xunit;

namespace TodoWidget.Core.Tests;

public class WindowPlacementTests
{
    private static readonly ScreenRect SingleScreen = new(0, 0, 1920, 1080);
    private static readonly ScreenRect WorkArea = new(0, 0, 1920, 1040);
    private const double Width = 320;

    [Fact]
    public void No_saved_position_uses_the_top_right_of_the_work_area()
    {
        Assert.Equal((1576d, 24d), WindowPlacement.Resolve(null, null, Width, SingleScreen, WorkArea));
    }

    [Fact]
    public void A_visible_saved_position_is_kept()
    {
        Assert.Equal((300d, 200d), WindowPlacement.Resolve(300, 200, Width, SingleScreen, WorkArea));
    }

    [Fact]
    public void Only_one_coordinate_saved_uses_the_default()
    {
        Assert.Equal((1576d, 24d), WindowPlacement.Resolve(300, null, Width, SingleScreen, WorkArea));
    }

    [Theory]
    [InlineData(2500, 100)]   // 오른쪽 모니터를 뺀 경우
    [InlineData(-2000, 100)]  // 왼쪽 모니터를 뺀 경우
    [InlineData(300, -500)]   // 위로 벗어남
    [InlineData(300, 1070)]   // 아래로 벗어나 헤더를 잡을 수 없음
    public void An_off_screen_position_falls_back_to_the_default(double left, double top)
    {
        Assert.Equal((1576d, 24d), WindowPlacement.Resolve(left, top, Width, SingleScreen, WorkArea));
    }

    [Fact]
    public void A_partly_visible_window_whose_header_can_be_grabbed_is_kept()
    {
        Assert.Equal((1800d, 100d), WindowPlacement.Resolve(1800, 100, Width, SingleScreen, WorkArea));
    }

    [Fact]
    public void A_position_on_a_left_monitor_is_kept_when_that_monitor_exists()
    {
        var twoScreens = new ScreenRect(-1920, 0, 3840, 1080);

        Assert.Equal((-1500d, 100d), WindowPlacement.Resolve(-1500, 100, Width, twoScreens, WorkArea));
    }
}
