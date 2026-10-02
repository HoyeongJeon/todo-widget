namespace TodoWidget.Core;

/// <summary>할 일 목록의 규칙: 추가, 상태 순환, 상태 지정, 이름 바꾸기, 삭제, 정렬.</summary>
public sealed class TodoList
{
    private readonly IClock _clock;
    private readonly List<TodoItem> _items;

    public TodoList(IClock clock, IEnumerable<TodoItem>? items = null)
    {
        _clock = clock;
        _items = items?.ToList() ?? [];
    }

    public IReadOnlyList<TodoItem> Items => _items;

    /// <summary>남은 일 = 할 일 + 하는 중.</summary>
    public int RemainingCount => _items.Count(i => i.Status != TodoStatus.Done);

    public TodoItem? Add(string title)
    {
        var clean = Clean(title);
        if (clean.Length == 0)
            return null;

        var item = new TodoItem(Guid.NewGuid().ToString(), clean, TodoStatus.Todo, _clock.Now, null);
        _items.Add(item);
        return item;
    }

    /// <summary>붙여 넣은 여러 줄을 줄마다 할 일 하나로 추가한다. 빈 줄은 건너뛰고 줄 앞의 "-", "•"는 뗀다.</summary>
    public IReadOnlyList<TodoItem> AddLines(string text)
    {
        var added = new List<TodoItem>();
        foreach (var line in text.Split('\r', '\n'))
        {
            if (Add(StripBullet(line)) is { } item)
                added.Add(item);
        }
        return added;
    }

    public bool Cycle(string id)
    {
        if (Find(id) is not { } item)
            return false;

        var next = item.Status switch
        {
            TodoStatus.Todo => TodoStatus.Doing,
            TodoStatus.Doing => TodoStatus.Done,
            _ => TodoStatus.Todo,
        };
        Apply(item, next);
        return true;
    }

    public bool SetStatus(string id, TodoStatus status)
    {
        if (Find(id) is not { } item)
            return false;

        Apply(item, status);
        return true;
    }

    public bool Rename(string id, string title)
    {
        var clean = Clean(title);
        if (Find(id) is not { } item || clean.Length == 0)
            return false;

        item.Title = clean;
        return true;
    }

    public bool Delete(string id) => _items.RemoveAll(i => i.Id == id) > 0;

    /// <summary>⋯ 메뉴의 초기화: 상태와 상관없이 모두 지운다.</summary>
    public bool Clear()
    {
        if (_items.Count == 0)
            return false;
        _items.Clear();
        return true;
    }

    /// <summary>할 일 섹션에 보일 순서: 하는 중이 위, 그 아래 할 일.</summary>
    public IReadOnlyList<TodoItem> Remaining() => [.. InStatus(TodoStatus.Doing), .. InStatus(TodoStatus.Todo)];

    /// <summary>할 일·하는 중은 만든 순서(오래된 것 위), 끝낸 일은 끝낸 시각 역순.</summary>
    public IReadOnlyList<TodoItem> InStatus(TodoStatus status)
    {
        var matching = _items.Where(i => i.Status == status);
        return status == TodoStatus.Done
            ? matching.OrderByDescending(i => i.CompletedAt).ToList()
            : matching.OrderBy(i => i.CreatedAt).ToList();
    }

    private void Apply(TodoItem item, TodoStatus status)
    {
        if (item.Status == status)
            return;

        item.Status = status;
        item.CompletedAt = status == TodoStatus.Done ? _clock.Now : null;
    }

    private TodoItem? Find(string id) => _items.FirstOrDefault(i => i.Id == id);

    // 줄바꿈·탭·연속 공백을 공백 하나로 합치고 앞뒤 공백을 없앤다.
    private static string Clean(string title) =>
        string.Join(' ', title.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));

    // 목록 기호 "-", "•"만 뗀다. "1."처럼 숫자는 제목의 일부일 수 있어 남긴다.
    private static string StripBullet(string line)
    {
        var trimmed = line.TrimStart();
        return trimmed.StartsWith('-') || trimmed.StartsWith('•') ? trimmed[1..] : trimmed;
    }
}
