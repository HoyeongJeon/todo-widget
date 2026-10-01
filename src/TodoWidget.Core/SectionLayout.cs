namespace TodoWidget.Core;

/// <summary>
/// 끝낸 일·할 일 섹션에 높이를 나눈다. 다 들어가면 각자 필요한 만큼,
/// 넘치면 짧은 섹션은 다 보여 주고 남은 높이를 긴 섹션들이 똑같이 나눈다(각자 스크롤).
/// </summary>
public static class SectionLayout
{
    /// <param name="available">섹션들이 쓸 수 있는 전체 높이. 무한대면 제한 없음.</param>
    /// <param name="desired">각 섹션이 다 보이려면 필요한 높이.</param>
    /// <param name="minimum">각 섹션이 줄어들 수 있는 최소 높이. 무한대면 줄어들지 않는다.</param>
    public static double[] Allocate(double available, IReadOnlyList<double> desired, IReadOnlyList<double> minimum)
    {
        if (double.IsPositiveInfinity(available) || desired.Sum() <= available)
            return desired.ToArray();

        var floors = desired.Select((d, i) => Math.Min(d, minimum[i])).ToArray();
        if (floors.Sum() >= available)
            return floors;

        // 모든 섹션이 같은 "수위"까지 차오른다고 보고, 합이 available이 되는 수위를 이분 탐색으로 찾는다.
        double low = 0, high = desired.Max();
        for (var i = 0; i < 100; i++)
        {
            var level = (low + high) / 2;
            if (Fill(level, floors, desired) > available)
                high = level;
            else
                low = level;
        }

        return desired.Select((d, i) => Math.Clamp(low, floors[i], d)).ToArray();
    }

    private static double Fill(double level, double[] floors, IReadOnlyList<double> desired) =>
        desired.Select((d, i) => Math.Clamp(level, floors[i], d)).Sum();
}
