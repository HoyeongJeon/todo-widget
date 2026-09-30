using TodoWidget.Core;
using Xunit;

namespace TodoWidget.Core.Tests;

public class KstClockTests
{
    [Fact]
    public void Now_converts_utc_to_korea_standard_time()
    {
        var clock = new KstClock(() => new DateTime(2026, 9, 30, 5, 5, 7, DateTimeKind.Utc));

        Assert.Equal(new DateTime(2026, 9, 30, 14, 5, 7), clock.Now);
    }

    [Fact]
    public void Now_rolls_over_to_the_next_day_in_korea()
    {
        var clock = new KstClock(() => new DateTime(2026, 12, 31, 20, 0, 0, DateTimeKind.Utc));

        Assert.Equal(new DateTime(2027, 1, 1, 5, 0, 0), clock.Now);
    }

    [Fact]
    public void Now_drops_fractions_of_a_second()
    {
        var clock = new KstClock(() => new DateTime(2026, 9, 30, 5, 5, 7, 999, DateTimeKind.Utc));

        Assert.Equal(new DateTime(2026, 9, 30, 14, 5, 7), clock.Now);
        Assert.Equal(0, clock.Now.Millisecond);
    }
}
