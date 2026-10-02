using TodoWidget.Core;
using Xunit;

namespace TodoWidget.Core.Tests;

public sealed class TodoSessionTests : IDisposable
{
    private readonly TempDir _dir = new();
    private readonly FakeClock _clock = new();

    public void Dispose() => _dir.Dispose();

    private string TasksPath => _dir.PathOf("tasks.json");

    private TodoSession Open(string? path = null) => TodoSession.Open(new TaskStore(path ?? TasksPath, _clock), _clock);

    [Fact]
    public void Every_change_is_saved_immediately()
    {
        var session = Open();

        session.Add("보고서 초안 쓰기");
        var id = session.List.Items[0].Id;
        session.Cycle(id);

        var reloaded = new TaskStore(TasksPath, _clock).Load().Items;
        Assert.Equal(TodoStatus.Doing, Assert.Single(reloaded).Status);
    }

    [Fact]
    public void Rename_set_status_and_delete_are_saved()
    {
        var session = Open();
        session.Add("초안");
        var id = session.List.Items[0].Id;

        session.Rename(id, "보고서 초안");
        session.SetStatus(id, TodoStatus.Done);
        Assert.Equal("보고서 초안", new TaskStore(TasksPath, _clock).Load().Items[0].Title);

        session.Delete(id);
        Assert.Empty(new TaskStore(TasksPath, _clock).Load().Items);
    }

    [Fact]
    public void Changed_is_raised_only_when_something_changed()
    {
        var session = Open();
        var raised = 0;
        session.Changed += (_, _) => raised++;

        Assert.False(session.Add("   "));
        Assert.False(session.Cycle("nope"));
        Assert.Equal(0, raised);
        Assert.False(File.Exists(TasksPath));

        Assert.True(session.Add("메일 답장"));
        Assert.Equal(1, raised);
    }

    [Fact]
    public void Adding_several_lines_saves_once_and_raises_changed_once()
    {
        var session = Open();
        var raised = 0;
        session.Changed += (_, _) => raised++;

        Assert.True(session.Add("- 은행 방문\r\n- 택배 반품 접수\r\n\r\n- 메일 답장"));

        Assert.Equal(1, raised);
        var reloaded = new TaskStore(TasksPath, _clock).Load().Items;
        Assert.Equal(new[] { "은행 방문", "택배 반품 접수", "메일 답장" }, reloaded.Select(i => i.Title));
    }

    [Fact]
    public void Notice_is_empty_normally()
    {
        Assert.Null(Open().Notice);
    }

    [Fact]
    public void Opening_a_broken_file_shows_the_backup_notice()
    {
        File.WriteAllText(TasksPath, "{broken");

        var session = Open();

        Assert.Equal(TodoSession.BackupNotice, session.Notice);
        Assert.Empty(session.List.Items);
    }

    [Fact]
    public void Save_failure_keeps_the_change_in_memory_and_shows_a_notice()
    {
        // 폴더가 있어야 할 자리에 파일을 두어 저장을 실패시킨다.
        var blocker = _dir.PathOf("blocker");
        File.WriteAllText(blocker, "");
        var session = Open(Path.Combine(blocker, "tasks.json"));

        Assert.True(session.Add("은행 방문"));

        Assert.Single(session.List.Items);
        Assert.Equal(TodoSession.SaveFailedNotice, session.Notice);
    }

    [Fact]
    public void The_next_successful_save_clears_the_failure_notice()
    {
        var blocker = _dir.PathOf("blocker");
        File.WriteAllText(blocker, "");
        var path = Path.Combine(blocker, "tasks.json");
        var session = Open(path);
        session.Add("은행 방문");

        File.Delete(blocker);
        session.Add("택배 반품 접수");

        Assert.Null(session.Notice);
        Assert.Equal(2, new TaskStore(path, _clock).Load().Items.Count);
    }

    [Fact]
    public void Open_passes_through_a_locked_file_error()
    {
        File.WriteAllText(TasksPath, "[]");
        using var lockHandle = new FileStream(TasksPath, FileMode.Open, FileAccess.ReadWrite, FileShare.None);

        Assert.ThrowsAny<IOException>(() => Open());
    }
}
