using System.Globalization;
using System.Text.Encodings.Web;
using System.Text.Json;

namespace TodoWidget.Core;

public sealed record TaskLoadResult(IReadOnlyList<TodoItem> Items, string? BackupPath);

/// <summary>tasks.json 읽기/쓰기. 깨진 파일은 백업하고 빈 목록으로 시작한다.</summary>
public sealed class TaskStore
{
    private static readonly JsonSerializerOptions Options = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        // 한글을 \uXXXX로 바꾸지 않아 메모장으로 읽을 수 있다.
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    private readonly IClock _clock;

    public TaskStore(string filePath, IClock clock)
    {
        FilePath = filePath;
        _clock = clock;
    }

    public string FilePath { get; }

    public TaskLoadResult Load()
    {
        if (!File.Exists(FilePath))
            return new TaskLoadResult([], null);

        // 잠겨 있어 읽지 못하면 IOException을 그대로 던진다. 빈 목록으로 시작해 원본을 덮어쓰지 않기 위해서다.
        var json = File.ReadAllText(FilePath);
        try
        {
            var dtos = JsonSerializer.Deserialize<List<TodoItemDto>>(json, Options)
                ?? throw new FormatException("tasks.json의 최상위 값이 비어 있습니다.");
            return new TaskLoadResult(dtos.Select(ToItem).ToList(), null);
        }
        catch (Exception e) when (e is JsonException or FormatException)
        {
            return new TaskLoadResult([], BackUpBrokenFile());
        }
    }

    public void Save(IEnumerable<TodoItem> items)
    {
        var dtos = items.Select(ToDto).ToList();
        AtomicFile.WriteAllText(FilePath, JsonSerializer.Serialize(dtos, Options));
    }

    private string BackUpBrokenFile()
    {
        var folder = Path.GetDirectoryName(Path.GetFullPath(FilePath))!;
        var stamp = _clock.Now.ToString("yyyyMMdd-HHmmss", CultureInfo.InvariantCulture);
        var backup = Path.Combine(folder, $"tasks.broken-{stamp}.json");
        for (var n = 2; File.Exists(backup); n++)
            backup = Path.Combine(folder, $"tasks.broken-{stamp}-{n}.json");

        File.Move(FilePath, backup);
        return backup;
    }

    private static TodoItem ToItem(TodoItemDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Id) || string.IsNullOrWhiteSpace(dto.Title))
            throw new FormatException("id 또는 title이 없습니다.");

        var status = dto.Status switch
        {
            "todo" => TodoStatus.Todo,
            "doing" => TodoStatus.Doing,
            "done" => TodoStatus.Done,
            _ => throw new FormatException($"알 수 없는 상태값: {dto.Status}"),
        };

        if (!KstFormat.TryParse(dto.CreatedAt, out var createdAt))
            throw new FormatException($"createdAt 형식 오류: {dto.CreatedAt}");

        DateTime? completedAt = null;
        if (dto.CompletedAt is not null)
        {
            if (!KstFormat.TryParse(dto.CompletedAt, out var parsed))
                throw new FormatException($"completedAt 형식 오류: {dto.CompletedAt}");
            completedAt = parsed;
        }

        return new TodoItem(dto.Id, dto.Title, status, createdAt, status == TodoStatus.Done ? completedAt : null);
    }

    private static TodoItemDto ToDto(TodoItem item) => new()
    {
        Id = item.Id,
        Title = item.Title,
        Status = item.Status switch
        {
            TodoStatus.Todo => "todo",
            TodoStatus.Doing => "doing",
            _ => "done",
        },
        CreatedAt = KstFormat.Format(item.CreatedAt),
        CompletedAt = item.CompletedAt is { } done ? KstFormat.Format(done) : null,
    };

    private sealed class TodoItemDto
    {
        public string? Id { get; set; }

        public string? Title { get; set; }

        public string? Status { get; set; }

        public string? CreatedAt { get; set; }

        public string? CompletedAt { get; set; }
    }
}
