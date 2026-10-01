using TodoWidget.Core;

namespace TodoWidget.Core.Tests;

internal sealed class FakeClock : IClock
{
    public DateTime Now { get; set; } = new(2026, 9, 30, 9, 0, 0);

    public void Advance(TimeSpan by) => Now = Now.Add(by);
}
