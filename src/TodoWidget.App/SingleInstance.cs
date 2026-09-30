using System.Threading;

namespace TodoWidget.App;

/// <summary>위젯을 하나만 띄운다. 두 번째 실행은 첫 번째 위젯을 깨우고 끝난다.</summary>
internal sealed class SingleInstance : IDisposable
{
    private const string MutexName = @"Local\TodoWidget.SingleInstance";
    private const string ActivateEventName = @"Local\TodoWidget.Activate";

    private readonly Mutex _mutex;
    private readonly EventWaitHandle _activate;
    private readonly bool _isFirst;
    private RegisteredWaitHandle? _registration;

    public SingleInstance()
    {
        _mutex = new Mutex(initiallyOwned: true, MutexName, out _isFirst);
        _activate = new EventWaitHandle(false, EventResetMode.AutoReset, ActivateEventName);
    }

    public bool IsFirst => _isFirst;

    public void SignalFirstInstance() => _activate.Set();

    public void OnActivateRequested(Action callback) =>
        _registration = ThreadPool.RegisterWaitForSingleObject(
            _activate, (_, _) => callback(), null, Timeout.Infinite, executeOnlyOnce: false);

    public void Dispose()
    {
        _registration?.Unregister(null);
        _activate.Dispose();
        if (_isFirst)
            _mutex.ReleaseMutex();
        _mutex.Dispose();
    }
}
