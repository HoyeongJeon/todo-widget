using TodoWidget.Core;
using Xunit;

namespace TodoWidget.Core.Tests;

public sealed class SettingsStoreTests : IDisposable
{
    private readonly TempDir _dir = new();

    public void Dispose() => _dir.Dispose();

    private SettingsStore Store() => new(_dir.PathOf("settings.json"));

    [Fact]
    public void Missing_file_gives_defaults()
    {
        var store = Store();

        var settings = store.Load();

        Assert.False(store.Exists);
        Assert.Null(settings.Left);
        Assert.Null(settings.Top);
        Assert.True(settings.Pinned);
        Assert.False(settings.DoneExpanded);
        Assert.True(settings.DoingExpanded);
        Assert.True(settings.TodoExpanded);
    }

    [Fact]
    public void Save_then_load_returns_the_same_values()
    {
        Store().Save(new WidgetSettings { Left = 1500.5, Top = 24, Pinned = false, DoneExpanded = true });

        var loaded = Store().Load();

        Assert.True(Store().Exists);
        Assert.Equal(1500.5, loaded.Left);
        Assert.Equal(24, loaded.Top);
        Assert.False(loaded.Pinned);
        Assert.True(loaded.DoneExpanded);
    }

    [Theory]
    [InlineData("{broken")]
    [InlineData("")]
    [InlineData("null")]
    [InlineData("[1,2]")]
    public void Broken_file_gives_defaults(string content)
    {
        File.WriteAllText(_dir.PathOf("settings.json"), content);

        var settings = Store().Load();

        Assert.True(settings.Pinned);
        Assert.Null(settings.Left);
    }

    [Fact]
    public void Missing_fields_keep_their_defaults()
    {
        File.WriteAllText(_dir.PathOf("settings.json"), "{\"doneExpanded\": true}");

        var settings = Store().Load();

        Assert.True(settings.DoneExpanded);
        Assert.True(settings.Pinned);
    }

    [Fact]
    public void Size_is_saved_and_loaded()
    {
        Store().Save(new WidgetSettings { Width = 450, MaxHeight = 700 });

        var loaded = Store().Load();

        Assert.Equal(450, loaded.Width);
        Assert.Equal(700, loaded.MaxHeight);
    }

    [Fact]
    public void Opacity_is_saved_and_loaded()
    {
        Store().Save(new WidgetSettings { Opacity = 0.7 });

        Assert.Equal(0.7, Store().Load().Opacity);
    }

    [Fact]
    public void Section_folds_are_saved_and_loaded()
    {
        Store().Save(new WidgetSettings { DoingExpanded = false, TodoExpanded = false });

        var loaded = Store().Load();

        Assert.False(loaded.DoingExpanded);
        Assert.False(loaded.TodoExpanded);
    }

    [Fact]
    public void Settings_from_before_section_folds_keep_both_sections_open()
    {
        File.WriteAllText(_dir.PathOf("settings.json"), "{\"pinned\": true, \"doneExpanded\": true}");

        var settings = Store().Load();

        Assert.True(settings.DoingExpanded);
        Assert.True(settings.TodoExpanded);
    }

    [Fact]
    public void Settings_from_before_resizing_have_no_size()
    {
        File.WriteAllText(_dir.PathOf("settings.json"), "{\"left\": 10, \"top\": 20, \"pinned\": true, \"doneExpanded\": false}");

        var settings = Store().Load();

        Assert.Null(settings.Width);
        Assert.Null(settings.MaxHeight);
        Assert.Equal(10, settings.Left);
    }

    [Fact]
    public void Save_writes_non_finite_sizes_as_null()
    {
        Store().Save(new WidgetSettings { Width = double.NaN, MaxHeight = double.NegativeInfinity });

        var loaded = Store().Load();

        Assert.Null(loaded.Width);
        Assert.Null(loaded.MaxHeight);
    }

    [Fact]
    public void Save_writes_non_finite_positions_as_null()
    {
        Store().Save(new WidgetSettings { Left = double.NaN, Top = double.PositiveInfinity });

        var loaded = Store().Load();

        Assert.Null(loaded.Left);
        Assert.Null(loaded.Top);
    }
}
