using TodoWidget.Core;
using Xunit;

namespace TodoWidget.Core.Tests;

public class WindowSizeTests
{
    private const double WorkAreaHeight = 1040;

    [Fact]
    public void No_saved_size_uses_default_width_and_half_the_work_area()
    {
        Assert.Equal(new WidgetSize(320, 520), WindowSize.Resolve(null, null, WorkAreaHeight));
    }

    [Fact]
    public void A_saved_size_within_range_is_kept()
    {
        Assert.Equal(new WidgetSize(450, 700), WindowSize.Resolve(450, 700, WorkAreaHeight));
    }

    [Theory]
    [InlineData(100, 280)]
    [InlineData(2000, 620)]
    public void Width_is_clamped_to_the_allowed_range(double saved, double expected)
    {
        Assert.Equal(expected, WindowSize.Resolve(saved, null, WorkAreaHeight).Width);
    }

    [Fact]
    public void Max_height_below_the_minimum_is_raised()
    {
        Assert.Equal(300, WindowSize.Resolve(null, 50, WorkAreaHeight).MaxHeight);
    }

    [Fact]
    public void Max_height_taller_than_the_work_area_is_lowered()
    {
        Assert.Equal(WorkAreaHeight, WindowSize.Resolve(null, 3000, WorkAreaHeight).MaxHeight);
    }

    [Fact]
    public void Non_finite_values_fall_back_to_defaults()
    {
        Assert.Equal(new WidgetSize(320, 520), WindowSize.Resolve(double.NaN, double.PositiveInfinity, WorkAreaHeight));
    }

    [Fact]
    public void A_very_small_screen_still_allows_the_minimum_height()
    {
        Assert.Equal(300, WindowSize.Resolve(null, null, 150).MaxHeight);
    }
}
