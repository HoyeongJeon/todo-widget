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

    [Fact]
    public void The_menu_offers_100_to_60_percent_in_10_percent_steps()
    {
        Assert.Equal(new[] { 1.0, 0.9, 0.8, 0.7, 0.6 }, CardOpacity.Choices);
    }
}
