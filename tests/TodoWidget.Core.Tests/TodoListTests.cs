using TodoWidget.Core;
using Xunit;

namespace TodoWidget.Core.Tests;

public class TodoListTests
{
    private readonly FakeClock _clock = new();

    [Fact]
    public void Add_creates_a_todo_item_with_created_time()
    {
        var list = new TodoList(_clock);

        var item = list.Add("보고서 초안 쓰기");

        Assert.NotNull(item);
        Assert.Equal("보고서 초안 쓰기", item.Title);
        Assert.Equal(TodoStatus.Todo, item.Status);
        Assert.Equal(_clock.Now, item.CreatedAt);
        Assert.Null(item.CompletedAt);
        Assert.False(string.IsNullOrWhiteSpace(item.Id));
        Assert.Single(list.Items);
    }

    [Fact]
    public void Add_gives_each_item_a_different_id()
    {
        var list = new TodoList(_clock);

        var a = list.Add("하나")!;
        var b = list.Add("둘")!;

        Assert.NotEqual(a.Id, b.Id);
    }

    [Fact]
    public void Add_trims_surrounding_spaces()
    {
        var list = new TodoList(_clock);

        Assert.Equal("메일 답장", list.Add("  메일 답장  ")!.Title);
    }

    [Fact]
    public void Add_collapses_line_breaks_and_repeated_spaces()
    {
        var list = new TodoList(_clock);

        Assert.Equal("회의 자료 출력 하기", list.Add("회의 자료\r\n출력   하기\n")!.Title);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("\r\n\t")]
    public void Add_ignores_blank_titles(string title)
    {
        var list = new TodoList(_clock);

        Assert.Null(list.Add(title));
        Assert.Empty(list.Items);
    }

    [Fact]
    public void AddLines_adds_one_item_per_line_in_order()
    {
        var list = new TodoList(_clock);

        var added = list.AddLines("은행 방문\r\n택배 반품 접수\n메일 답장");

        Assert.Equal(new[] { "은행 방문", "택배 반품 접수", "메일 답장" }, added.Select(i => i.Title));
        Assert.Equal(added, list.InStatus(TodoStatus.Todo));
    }

    [Fact]
    public void AddLines_skips_blank_lines()
    {
        var list = new TodoList(_clock);

        var added = list.AddLines("\r\n은행 방문\r\n\r\n   \r\n메일 답장\r\n");

        Assert.Equal(new[] { "은행 방문", "메일 답장" }, added.Select(i => i.Title));
    }

    [Fact]
    public void AddLines_strips_dash_and_bullet_but_keeps_numbers()
    {
        var list = new TodoList(_clock);

        var added = list.AddLines("- 은행 방문\n  • 택배 반품 접수\n-메일 답장\n1. 분기 보고서");

        Assert.Equal(new[] { "은행 방문", "택배 반품 접수", "메일 답장", "1. 분기 보고서" }, added.Select(i => i.Title));
    }

    [Fact]
    public void AddLines_with_a_single_line_adds_one_item()
    {
        var list = new TodoList(_clock);

        Assert.Equal("회의하기", Assert.Single(list.AddLines("회의하기")).Title);
    }

    [Fact]
    public void AddLines_with_only_blank_or_bullet_lines_adds_nothing()
    {
        var list = new TodoList(_clock);

        Assert.Empty(list.AddLines("\r\n - \n•\n"));
        Assert.Empty(list.Items);
    }

    [Fact]
    public void Toggle_finishes_a_todo_and_reopens_a_done_item()
    {
        var list = new TodoList(_clock);
        var item = list.Add("택배 반품 접수")!;

        Assert.True(list.Toggle(item.Id));
        Assert.Equal(TodoStatus.Done, item.Status);
        Assert.True(list.Toggle(item.Id));
        Assert.Equal(TodoStatus.Todo, item.Status);
    }

    [Fact]
    public void Becoming_done_records_completed_time()
    {
        var list = new TodoList(_clock);
        var item = list.Add("은행 방문")!;
        _clock.Advance(TimeSpan.FromMinutes(30));

        list.SetStatus(item.Id, TodoStatus.Done);

        Assert.Equal(new DateTime(2026, 9, 30, 9, 30, 0), item.CompletedAt);
    }

    [Fact]
    public void Leaving_done_clears_completed_time()
    {
        var list = new TodoList(_clock);
        var item = list.Add("은행 방문")!;
        list.SetStatus(item.Id, TodoStatus.Done);

        list.SetStatus(item.Id, TodoStatus.Todo);

        Assert.Null(item.CompletedAt);
    }

    [Fact]
    public void Finishing_again_records_a_new_completed_time()
    {
        var list = new TodoList(_clock);
        var item = list.Add("은행 방문")!;
        list.SetStatus(item.Id, TodoStatus.Done);
        list.Toggle(item.Id);
        _clock.Advance(TimeSpan.FromHours(1));

        list.SetStatus(item.Id, TodoStatus.Done);

        Assert.Equal(new DateTime(2026, 9, 30, 10, 0, 0), item.CompletedAt);
    }

    [Fact]
    public void Setting_done_on_a_done_item_keeps_the_original_time()
    {
        var list = new TodoList(_clock);
        var item = list.Add("은행 방문")!;
        list.SetStatus(item.Id, TodoStatus.Done);
        var first = item.CompletedAt;
        _clock.Advance(TimeSpan.FromHours(1));

        list.SetStatus(item.Id, TodoStatus.Done);

        Assert.Equal(first, item.CompletedAt);
    }

    [Fact]
    public void Rename_changes_the_title_with_the_same_cleanup_as_add()
    {
        var list = new TodoList(_clock);
        var item = list.Add("초안")!;

        Assert.True(list.Rename(item.Id, "  보고서\n초안  "));
        Assert.Equal("보고서 초안", item.Title);
    }

    [Fact]
    public void Rename_to_blank_keeps_the_old_title()
    {
        var list = new TodoList(_clock);
        var item = list.Add("초안")!;

        Assert.False(list.Rename(item.Id, "   "));
        Assert.Equal("초안", item.Title);
    }

    [Fact]
    public void Delete_removes_the_item()
    {
        var list = new TodoList(_clock);
        var keep = list.Add("남길 것")!;
        var remove = list.Add("지울 것")!;

        Assert.True(list.Delete(remove.Id));

        Assert.Equal(new[] { keep }, list.Items);
    }

    [Fact]
    public void Operations_on_an_unknown_id_return_false()
    {
        var list = new TodoList(_clock);

        Assert.False(list.Toggle("nope"));
        Assert.False(list.SetStatus("nope", TodoStatus.Done));
        Assert.False(list.Rename("nope", "새 이름"));
        Assert.False(list.Delete("nope"));
    }

    [Fact]
    public void RemainingCount_counts_items_not_done()
    {
        var list = new TodoList(_clock);
        list.Add("할 일 하나");
        list.Add("할 일 둘");
        list.SetStatus(list.Add("끝낸 일")!.Id, TodoStatus.Done);

        Assert.Equal(2, list.RemainingCount);
    }

    [Fact]
    public void InStatus_orders_todo_by_created_time_oldest_first()
    {
        var list = new TodoList(_clock);
        var first = list.Add("첫째")!;
        _clock.Advance(TimeSpan.FromMinutes(1));
        var second = list.Add("둘째")!;

        Assert.Equal(new[] { first, second }, list.InStatus(TodoStatus.Todo));
    }

    [Fact]
    public void InStatus_keeps_insertion_order_for_items_created_in_the_same_second()
    {
        var list = new TodoList(_clock);
        var a = list.Add("가")!;
        var b = list.Add("나")!;
        var c = list.Add("다")!;

        Assert.Equal(new[] { a, b, c }, list.InStatus(TodoStatus.Todo));
    }

    [Fact]
    public void InStatus_orders_done_by_completed_time_newest_first()
    {
        var list = new TodoList(_clock);
        var early = list.Add("먼저 끝냄")!;
        var late = list.Add("나중에 끝냄")!;
        list.SetStatus(early.Id, TodoStatus.Done);
        _clock.Advance(TimeSpan.FromMinutes(5));
        list.SetStatus(late.Id, TodoStatus.Done);

        Assert.Equal(new[] { late, early }, list.InStatus(TodoStatus.Done));
    }

    [Fact]
    public void InStatus_puts_done_items_without_completed_time_last()
    {
        var legacy = new TodoItem("x", "시각 없음", TodoStatus.Done, _clock.Now, null);
        var list = new TodoList(_clock, [legacy]);
        var normal = list.Add("정상")!;
        list.SetStatus(normal.Id, TodoStatus.Done);

        Assert.Equal(new[] { normal, legacy }, list.InStatus(TodoStatus.Done));
    }
}
