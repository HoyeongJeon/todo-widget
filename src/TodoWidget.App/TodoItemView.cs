using System.ComponentModel;
using System.Runtime.CompilerServices;
using TodoWidget.Core;

namespace TodoWidget.App;

/// <summary>화면에 그리는 할 일 한 줄. 목록이 바뀔 때마다 새로 만든다.</summary>
public sealed class TodoItemView : INotifyPropertyChanged
{
    private bool _isEditing;

    public TodoItemView(TodoItem item)
    {
        Id = item.Id;
        Title = item.Title;
        Status = item.Status;
    }

    public event PropertyChangedEventHandler? PropertyChanged;

    public string Id { get; }

    public string Title { get; }

    public TodoStatus Status { get; }

    public bool IsTodo => Status == TodoStatus.Todo;

    public bool IsDone => Status == TodoStatus.Done;

    public bool IsEditing
    {
        get => _isEditing;
        set
        {
            if (_isEditing == value)
                return;
            _isEditing = value;
            OnPropertyChanged();
        }
    }

    private void OnPropertyChanged([CallerMemberName] string? name = null) =>
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));
}
