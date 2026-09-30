namespace TodoWidget.Core;

/// <summary>창 위치, 맨 위 고정, 끝낸 것 펼침. 자동 실행 여부는 레지스트리가 기준이라 여기 없다.</summary>
public sealed class WidgetSettings
{
    public double? Left { get; set; }

    public double? Top { get; set; }

    public bool Pinned { get; set; } = true;

    public bool DoneExpanded { get; set; }
}
