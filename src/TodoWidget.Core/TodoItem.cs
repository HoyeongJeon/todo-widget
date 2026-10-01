namespace TodoWidget.Core;

/// <summary>할 일 하나. 상태와 제목은 TodoList를 통해서만 바뀐다.</summary>
public sealed class TodoItem
{
    public TodoItem(string id, string title, TodoStatus status, DateTime createdAt, DateTime? completedAt)
    {
        Id = id;
        Title = title;
        Status = status;
        CreatedAt = createdAt;
        CompletedAt = completedAt;
    }

    public string Id { get; }

    public string Title { get; internal set; }

    public TodoStatus Status { get; internal set; }

    public DateTime CreatedAt { get; }

    /// <summary>끝낸 시각. Done일 때만 값이 있다.</summary>
    public DateTime? CompletedAt { get; internal set; }
}
