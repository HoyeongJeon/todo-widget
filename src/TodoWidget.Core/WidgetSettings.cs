namespace TodoWidget.Core;

/// <summary>창 위치·크기, 맨 위 고정, 섹션별 펼침. 자동 실행 여부는 레지스트리가 기준이라 여기 없다.</summary>
public sealed class WidgetSettings
{
    public double? Left { get; set; }

    public double? Top { get; set; }

    public double? Width { get; set; }

    /// <summary>사용자가 끌어서 정한 최대 높이. 할 일이 적으면 창은 이보다 작다.</summary>
    public double? MaxHeight { get; set; }

    /// <summary>카드 배경 불투명도(0.6~1.0). 없으면 1.0.</summary>
    public double? Opacity { get; set; }

    public bool Pinned { get; set; } = true;

    public bool DoneExpanded { get; set; }

    public bool DoingExpanded { get; set; } = true;

    public bool TodoExpanded { get; set; } = true;
}
