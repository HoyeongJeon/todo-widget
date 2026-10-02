using System.ComponentModel;
using System.Runtime.CompilerServices;
using TodoWidget.Core;

namespace TodoWidget.App;

/// <summary>위젯 화면 상태. 세션이 바뀌면 목록을 새로 만들고 모든 바인딩을 갱신한다.</summary>
public sealed class MainViewModel : INotifyPropertyChanged
{
    private readonly TodoSession _session;
    private bool _todoExpanded;
    private bool _doneExpanded;

    public MainViewModel(TodoSession session, bool todoExpanded, bool doneExpanded)
    {
        _session = session;
        _todoExpanded = todoExpanded;
        _doneExpanded = doneExpanded;
        _session.Changed += (_, _) => Refresh();
        Refresh();
    }

    public event PropertyChangedEventHandler? PropertyChanged;

    public IReadOnlyList<TodoItemView> Todo { get; private set; } = [];

    public IReadOnlyList<TodoItemView> Done { get; private set; } = [];

    public bool HasTodo => Todo.Count > 0;

    public bool HasDone => Done.Count > 0;

    public bool IsEmpty => _session.List.Items.Count == 0;

    public string RemainingText =>
        _session.List.RemainingCount == 0 ? "모두 끝냈어요" : $"{_session.List.RemainingCount}개 남음";

    public string DoneToggleText => DoneExpanded ? "접기" : "펼치기";

    // Segoe MDL2 아이콘: 펼침 ChevronDown, 접힘 ChevronRight
    public string TodoChevron => ((char)(TodoExpanded ? 0xE70D : 0xE76C)).ToString();

    public string? Notice => _session.Notice;

    public bool HasNotice => Notice is not null;

    public bool TodoExpanded
    {
        get => _todoExpanded;
        set => SetExpanded(ref _todoExpanded, value, nameof(TodoChevron));
    }

    public bool DoneExpanded
    {
        get => _doneExpanded;
        set => SetExpanded(ref _doneExpanded, value, nameof(DoneToggleText));
    }

    public bool Add(string text) => _session.Add(text);

    public bool Toggle(string id) => _session.Toggle(id);

    public bool SetStatus(string id, TodoStatus status) => _session.SetStatus(id, status);

    public bool Rename(string id, string title) => _session.Rename(id, title);

    public bool Delete(string id) => _session.Delete(id);

    /// <summary>지금 화면에 그려진 항목. 목록이 새로 그려지면 이전 항목 객체는 화면에서 떨어져 나간다.</summary>
    public TodoItemView? ViewOf(string id) =>
        Todo.Concat(Done).FirstOrDefault(v => v.Id == id);

    private void Refresh()
    {
        Todo = Views(TodoStatus.Todo);
        Done = Views(TodoStatus.Done);
        OnPropertyChanged(string.Empty);
    }

    private List<TodoItemView> Views(TodoStatus status) =>
        _session.List.InStatus(status).Select(i => new TodoItemView(i)).ToList();

    private void SetExpanded(ref bool field, bool value, string toggleName, [CallerMemberName] string? name = null)
    {
        if (field == value)
            return;
        field = value;
        OnPropertyChanged(name);
        OnPropertyChanged(toggleName);
    }

    private void OnPropertyChanged([CallerMemberName] string? name = null) =>
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));
}
