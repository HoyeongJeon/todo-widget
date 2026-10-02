using System.Windows;
using System.Windows.Controls;
using TodoWidget.Core;

namespace TodoWidget.App;

/// <summary>
/// 섹션을 위에서부터 쌓되, 높이가 모자라면 SectionLayout 규칙으로 나눠 준다.
/// 각 섹션은 받은 높이 안에서 자기 ScrollViewer로 따로 스크롤한다.
/// </summary>
public sealed class SectionPanel : Panel
{
    /// <summary>섹션이 줄어들 수 있는 최소 높이(제목 + 첫 항목). 지정하지 않으면 줄어들지 않는다.</summary>
    public static readonly DependencyProperty MinimumProperty = DependencyProperty.RegisterAttached(
        "Minimum", typeof(double), typeof(SectionPanel),
        new FrameworkPropertyMetadata(double.PositiveInfinity, FrameworkPropertyMetadataOptions.AffectsParentMeasure));

    private double[] _heights = [];

    public static double GetMinimum(UIElement element) => (double)element.GetValue(MinimumProperty);

    public static void SetMinimum(UIElement element, double value) => element.SetValue(MinimumProperty, value);

    protected override Size MeasureOverride(Size availableSize)
    {
        var children = InternalChildren.Cast<UIElement>().ToList();
        var width = 0.0;
        var desired = new double[children.Count];
        for (var i = 0; i < children.Count; i++)
        {
            children[i].Measure(new Size(availableSize.Width, double.PositiveInfinity));
            desired[i] = children[i].DesiredSize.Height;
            width = Math.Max(width, children[i].DesiredSize.Width);
        }

        _heights = SectionLayout.Allocate(availableSize.Height, desired, children.Select(GetMinimum).ToList());
        // 줄어든 섹션만 받은 높이로 다시 잰다. 다 들어가는 섹션까지 다시 재면 마지막 측정 높이가 고정돼서,
        // 나중에 항목이 생겨도 크기 변화가 이 패널까지 올라오지 않는다(펼친 섹션이 제목 줄만 남는 문제).
        for (var i = 0; i < children.Count; i++)
        {
            if (_heights[i] < desired[i])
                children[i].Measure(new Size(availableSize.Width, _heights[i]));
        }

        return new Size(double.IsPositiveInfinity(availableSize.Width) ? width : availableSize.Width, _heights.Sum());
    }

    protected override Size ArrangeOverride(Size finalSize)
    {
        var y = 0.0;
        for (var i = 0; i < InternalChildren.Count && i < _heights.Length; i++)
        {
            InternalChildren[i].Arrange(new Rect(0, y, finalSize.Width, _heights[i]));
            y += _heights[i];
        }
        return finalSize;
    }
}
