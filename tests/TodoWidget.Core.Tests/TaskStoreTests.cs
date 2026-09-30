using TodoWidget.Core;
using Xunit;

namespace TodoWidget.Core.Tests;

public sealed class TaskStoreTests : IDisposable
{
    private readonly TempDir _dir = new();
    private readonly FakeClock _clock = new();

    public void Dispose() => _dir.Dispose();

    private TaskStore Store() => new(_dir.PathOf("tasks.json"), _clock);

    [Fact]
    public void Load_returns_empty_when_the_file_does_not_exist()
    {
        var result = Store().Load();

        Assert.Empty(result.Items);
        Assert.Null(result.BackupPath);
    }

    [Fact]
    public void Save_then_load_returns_the_same_items()
    {
        var items = new[]
        {
            new TodoItem("a", "보고서 초안 쓰기", TodoStatus.Doing, new DateTime(2026, 9, 30, 9, 12, 40), null),
            new TodoItem("b", "은행 방문", TodoStatus.Done, new DateTime(2026, 9, 29, 8, 0, 0), new DateTime(2026, 9, 30, 14, 5, 0)),
        };

        Store().Save(items);
        var loaded = Store().Load().Items;

        Assert.Equal(2, loaded.Count);
        Assert.Equal("a", loaded[0].Id);
        Assert.Equal("보고서 초안 쓰기", loaded[0].Title);
        Assert.Equal(TodoStatus.Doing, loaded[0].Status);
        Assert.Equal(new DateTime(2026, 9, 30, 9, 12, 40), loaded[0].CreatedAt);
        Assert.Null(loaded[0].CompletedAt);
        Assert.Equal(TodoStatus.Done, loaded[1].Status);
        Assert.Equal(new DateTime(2026, 9, 30, 14, 5, 0), loaded[1].CompletedAt);
    }

    [Fact]
    public void Save_writes_readable_korean_and_the_storage_time_format()
    {
        Store().Save([new TodoItem("a", "보고서", TodoStatus.Done, new DateTime(2026, 9, 30, 9, 0, 0), new DateTime(2026, 9, 30, 14, 5, 0))]);

        var json = File.ReadAllText(_dir.PathOf("tasks.json"));

        Assert.Contains("\"보고서\"", json);
        Assert.Contains("\"status\": \"done\"", json);
        Assert.Contains("\"completedAt\": \"2026-09-30 14:05:00\"", json);
        Assert.DoesNotContain("T14:05", json);
    }

    [Fact]
    public void Save_creates_the_folder_and_leaves_no_temp_file()
    {
        var path = Path.Combine(_dir.Root, "nested", "tasks.json");

        new TaskStore(path, _clock).Save([]);

        Assert.True(File.Exists(path));
        Assert.False(File.Exists(path + ".tmp"));
    }

    [Fact]
    public void Save_overwrites_the_previous_content()
    {
        Store().Save([new TodoItem("a", "옛것", TodoStatus.Todo, _clock.Now, null)]);
        Store().Save([new TodoItem("b", "새것", TodoStatus.Todo, _clock.Now, null)]);

        Assert.Equal("새것", Assert.Single(Store().Load().Items).Title);
    }

    [Theory]
    [InlineData("{not json")]
    [InlineData("")]
    [InlineData("null")]
    [InlineData("{\"id\":\"a\"}")]
    [InlineData("[{\"id\":\"a\",\"title\":\"x\",\"status\":\"later\",\"createdAt\":\"2026-09-30 09:00:00\",\"completedAt\":null}]")]
    [InlineData("[{\"id\":\"a\",\"title\":\"x\",\"status\":\"todo\",\"createdAt\":\"2026-09-30T09:00:00\",\"completedAt\":null}]")]
    [InlineData("[{\"id\":\"a\",\"title\":\"\",\"status\":\"todo\",\"createdAt\":\"2026-09-30 09:00:00\",\"completedAt\":null}]")]
    [InlineData("[{\"title\":\"x\",\"status\":\"todo\",\"createdAt\":\"2026-09-30 09:00:00\",\"completedAt\":null}]")]
    public void Load_backs_up_a_broken_file_and_starts_empty(string content)
    {
        var path = _dir.PathOf("tasks.json");
        File.WriteAllText(path, content);

        var result = Store().Load();

        Assert.Empty(result.Items);
        Assert.Equal(_dir.PathOf("tasks.broken-20260930-090000.json"), result.BackupPath);
        Assert.Equal(content, File.ReadAllText(result.BackupPath!));
        Assert.False(File.Exists(path));
    }

    [Fact]
    public void A_second_backup_in_the_same_second_does_not_overwrite_the_first()
    {
        var path = _dir.PathOf("tasks.json");
        File.WriteAllText(path, "{broken 1");
        var first = Store().Load().BackupPath;
        File.WriteAllText(path, "{broken 2");

        var second = Store().Load().BackupPath;

        Assert.Equal(_dir.PathOf("tasks.broken-20260930-090000-2.json"), second);
        Assert.Equal("{broken 1", File.ReadAllText(first!));
        Assert.Equal("{broken 2", File.ReadAllText(second!));
    }

    [Fact]
    public void Load_accepts_done_without_completed_time()
    {
        File.WriteAllText(_dir.PathOf("tasks.json"),
            "[{\"id\":\"a\",\"title\":\"x\",\"status\":\"done\",\"createdAt\":\"2026-09-30 09:00:00\",\"completedAt\":null}]");

        var result = Store().Load();

        Assert.Null(result.BackupPath);
        Assert.Equal(TodoStatus.Done, Assert.Single(result.Items).Status);
    }

    [Fact]
    public void Load_ignores_completed_time_on_items_that_are_not_done()
    {
        File.WriteAllText(_dir.PathOf("tasks.json"),
            "[{\"id\":\"a\",\"title\":\"x\",\"status\":\"todo\",\"createdAt\":\"2026-09-30 09:00:00\",\"completedAt\":\"2026-09-30 10:00:00\"}]");

        Assert.Null(Assert.Single(Store().Load().Items).CompletedAt);
    }

    [Fact]
    public void Load_throws_when_the_file_is_locked()
    {
        var path = _dir.PathOf("tasks.json");
        File.WriteAllText(path, "[]");
        using var lockHandle = new FileStream(path, FileMode.Open, FileAccess.ReadWrite, FileShare.None);

        Assert.ThrowsAny<IOException>(() => Store().Load());
        lockHandle.Dispose();
        Assert.Equal("[]", File.ReadAllText(path));
    }
}
