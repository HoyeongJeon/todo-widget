using TodoWidget.Core;
using Xunit;

namespace TodoWidget.Core.Tests;

public class KstFormatTests
{
    [Fact]
    public void Format_uses_date_space_time_without_T()
    {
        Assert.Equal("2026-09-30 14:05:00", KstFormat.Format(new DateTime(2026, 9, 30, 14, 5, 0)));
    }

    [Fact]
    public void TryParse_reads_the_storage_format()
    {
        Assert.True(KstFormat.TryParse("2026-09-30 14:05:09", out var value));
        Assert.Equal(new DateTime(2026, 9, 30, 14, 5, 9), value);
    }

    [Theory]
    [InlineData("2026-09-30T14:05:09")]
    [InlineData("2026-13-01 00:00:00")]
    [InlineData("")]
    [InlineData(null)]
    public void TryParse_rejects_other_formats(string? text)
    {
        Assert.False(KstFormat.TryParse(text, out _));
    }
}
