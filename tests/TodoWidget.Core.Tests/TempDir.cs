namespace TodoWidget.Core.Tests;

/// <summary>테스트마다 새 임시 폴더를 만들고 끝나면 지운다.</summary>
internal sealed class TempDir : IDisposable
{
    public TempDir()
    {
        Root = Path.Combine(Path.GetTempPath(), "TodoWidgetTests", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(Root);
    }

    public string Root { get; }

    public string PathOf(string name) => Path.Combine(Root, name);

    public void Dispose()
    {
        try
        {
            Directory.Delete(Root, recursive: true);
        }
        catch (IOException)
        {
        }
    }
}
