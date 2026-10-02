using TodoWidget.Core;
using Xunit;

namespace TodoWidget.Core.Tests;

public class CardOpacityTests
{
    [Fact]
    public void No_saved_value_means_fully_opaque()
    {
        Assert.Equal(1.0, CardOpacity.Resolve(null));
    }

    [Theory]
    [InlineData(0.8, 0.8)]
    [InlineData(0.6, 0.6)]
    [InlineData(0.1, 0.6)]
    [InlineData(1.5, 1.0)]
    [InlineData(double.NaN, 1.0)]
    public void Saved_values_are_kept_within_60_to_100_percent(double saved, double expected)
    {
        Assert.Equal(expected, CardOpacity.Resolve(saved));
    }

    [Theory]
    [InlineData(1.0, 0)]
    [InlineData(0.85, 15)]
    [InlineData(0.6, 40)]
    [InlineData(0.1, 40)]
    public void Opacity_shows_as_transparency_percent(double opacity, int expected)
    {
        Assert.Equal(expected, CardOpacity.ToTransparencyPercent(opacity));
    }

    [Theory]
    [InlineData(0, 1.0)]
    [InlineData(15, 0.85)]
    [InlineData(14.6, 0.85)]
    [InlineData(40, 0.6)]
    [InlineData(70, 0.6)]
    [InlineData(-5, 1.0)]
    public void Transparency_percent_becomes_opacity_in_whole_percent_steps(double percent, double expected)
    {
        Assert.Equal(expected, CardOpacity.FromTransparencyPercent(percent), precision: 10);
    }
}
