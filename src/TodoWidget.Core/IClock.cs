namespace TodoWidget.Core;

/// <summary>현재 한국 표준시. 테스트에서 시각을 고정할 수 있게 인터페이스로 둔다.</summary>
public interface IClock
{
    DateTime Now { get; }
}
