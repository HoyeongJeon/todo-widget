using System.ComponentModel;
using System.Runtime.CompilerServices;
using TodoWidget.Core;

namespace TodoWidget.App;

/// <summary>위젯 화면 상태. 세션이 바뀌면 목록을 새로 만들고 모든 바인딩을 갱신한다.</summary>
public sealed class MainViewModel : INotifyPropertyChanged
{
    private readonly TodoSession _session;
    private bool _doneExpanded;

    public MainViewModel(TodoSession session, bool doneExpanded)
    {
        _session = session;
        _doneExpanded = doneExpanded;
        _session.Changed += (_, _) => Refresh();
        Refresh();
    }

    public event PropertyChangedEventHandler? PropertyChanged;

    public IReadOnlyList<TodoItemView> Doing { get; private set; } = [];

    public IReadOnlyList<TodoItemView> Todo { get; private set; } = [];

    public IReadOnlyList<TodoItemView> Done { get; private set; } = [];

    public bool HasDoing => Doing.Count > 0;

    public bool HasTodo => Todo.Count > 0;

    public bool HasDone => Done.Count > 0;

    public bool IsEmpty => _session.List.Items.Count == 0;

    public string RemainingText =>
        _session.List.RemainingCount == 0 ? "모두 끝냈어요" : $"{_session.List.RemainingCount}개 남음";

    public string DoneHeader => $"끝낸 것 {Done.Count}";

    public string DoneToggleText => DoneExpanded ? "접기" : "펼치기";

    public string? Notice => _session.Notice;

    public bool HasNotice => Notice is not null;

    public bool DoneExpanded
    {
        get => _doneExpanded;
        set
        {
            if (_doneExpanded == value)
                return;
            _doneExpanded = value;
            OnPropertyChanged();
            OnPropertyChanged(nameof(DoneToggleText));
        }
    }

    public bool Add(string text) => _session.Add(text);

    public bool Cycle(string id) => _session.Cycle(id);

    public bool SetStatus(string id, TodoStatus status) => _session.SetStatus(id, status);

    public bool Rename(string id, string title) => _session.Rename(id, title);

    public bool Delete(string id) => _session.Delete(id);

    private void Refresh()
    {
        Doing = Views(TodoStatus.Doing);
        Todo = Views(TodoStatus.Todo);
        Done = Views(TodoStatus.Done);
        OnPropertyChanged(string.Empty);
    }

    private List<TodoItemView> Views(TodoStatus status) =>
        _session.List.InStatus(status).Select(i => new TodoItemView(i)).ToList();

    private void OnPropertyChanged([CallerMemberName] string? name = null) =>
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));
}
