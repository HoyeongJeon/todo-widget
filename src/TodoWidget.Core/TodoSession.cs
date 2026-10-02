namespace TodoWidget.Core;

/// <summary>할 일 목록을 바꿀 때마다 바로 저장하고, 화면에 띄울 안내 문구를 관리한다.</summary>
public sealed class TodoSession
{
    public const string BackupNotice = "저장 파일에 문제가 있어 백업해 두었어요";
    public const string SaveFailedNotice = "저장하지 못했어요. 다음 변경 때 다시 시도해요";

    private readonly TaskStore _store;
    private readonly bool _hadBackup;
    private bool _saveFailed;

    private TodoSession(TodoList list, TaskStore store, bool hadBackup)
    {
        List = list;
        _store = store;
        _hadBackup = hadBackup;
    }

    public event EventHandler? Changed;

    public TodoList List { get; }

    public string? Notice => _saveFailed ? SaveFailedNotice : _hadBackup ? BackupNotice : null;

    public static TodoSession Open(TaskStore store, IClock clock)
    {
        var result = store.Load();
        return new TodoSession(new TodoList(clock, result.Items), store, result.BackupPath is not null);
    }

    /// <summary>입력칸의 한 줄이든 붙여 넣은 여러 줄이든 줄마다 추가하고, 저장은 한 번만 한다.</summary>
    public bool Add(string text) => Commit(List.AddLines(text).Count > 0);

    public bool Cycle(string id) => Commit(List.Cycle(id));

    public bool SetStatus(string id, TodoStatus status) => Commit(List.SetStatus(id, status));

    public bool Rename(string id, string title) => Commit(List.Rename(id, title));

    public bool Delete(string id) => Commit(List.Delete(id));

    public bool Clear() => Commit(List.Clear());

    private bool Commit(bool changed)
    {
        if (!changed)
            return false;

        try
        {
            _store.Save(List.Items);
            _saveFailed = false;
        }
        catch (Exception e) when (e is IOException or UnauthorizedAccessException)
        {
            // 변경은 메모리에 남기고, 다음 변경 때 전체를 다시 저장한다.
            _saveFailed = true;
        }

        Changed?.Invoke(this, EventArgs.Empty);
        return true;
    }
}
