using TodoWidget.Core;
using Xunit;

namespace TodoWidget.Core.Tests;

public class SectionLayoutTests
{
    private static void AssertHeights(double[] expected, double[] actual)
    {
        Assert.Equal(expected.Length, actual.Length);
        for (var i = 0; i < expected.Length; i++)
            Assert.Equal(expected[i], actual[i], precision: 3);
    }

    [Fact]
    public void Everything_fits_so_each_section_gets_its_full_height()
    {
        AssertHeights([100, 200], SectionLayout.Allocate(400, [100, 200], [70, 74]));
    }

    [Fact]
    public void Unlimited_space_gives_each_section_its_full_height()
    {
        AssertHeights([600, 900], SectionLayout.Allocate(double.PositiveInfinity, [600, 900], [70, 74]));
    }

    [Fact]
    public void A_short_section_stays_whole_and_the_long_one_takes_the_rest()
    {
        AssertHeights([100, 300], SectionLayout.Allocate(400, [100, 900], [70, 74]));
    }

    [Fact]
    public void Two_long_sections_split_the_space_equally()
    {
        AssertHeights([200, 200], SectionLayout.Allocate(400, [600, 900], [70, 74]));
    }

    [Fact]
    public void A_collapsed_done_row_keeps_its_height_and_the_others_share_the_rest()
    {
        AssertHeights([177, 177, 46], SectionLayout.Allocate(400, [600, 900, 46], [70, 74, 88]));
    }

    [Fact]
    public void Sections_never_shrink_below_their_minimum()
    {
        AssertHeights([70, 74], SectionLayout.Allocate(100, [600, 900], [70, 74]));
    }

    [Fact]
    public void Sections_without_a_minimum_never_shrink()
    {
        AssertHeights([30, 370], SectionLayout.Allocate(400, [30, 900], [double.PositiveInfinity, 74]));
    }

    [Fact]
    public void The_allocated_heights_fill_the_available_space_exactly()
    {
        var heights = SectionLayout.Allocate(523.5, [313, 820, 46], [70, 74, 88]);

        Assert.Equal(523.5, heights.Sum(), precision: 3);
    }
}
