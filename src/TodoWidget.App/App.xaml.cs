using System.IO;
using System.Security;
using System.Windows;
using System.Windows.Interop;
using System.Windows.Media;
using TodoWidget.Core;

namespace TodoWidget.App;

public partial class App : Application
{
    private SingleInstance? _instance;

    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

        // 작은 위젯이라 GPU가 필요 없다. 소프트웨어 렌더링이 메모리를 절반 이하로 줄이고 투명 창도 더 빨리 그린다.
        RenderOptions.ProcessRenderMode = RenderMode.SoftwareOnly;

        _instance = new SingleInstance();
        if (!_instance.IsFirst)
        {
            // 이미 떠 있는 위젯을 앞으로 가져오고 이 프로세스는 끝낸다.
            _instance.SignalFirstInstance();
            Shutdown();
            return;
        }

        var clock = new KstClock();
        var settingsStore = new SettingsStore(AppPaths.SettingsFile);
        var isFirstRun = !settingsStore.Exists;
        var settings = settingsStore.Load();

        TodoSession session;
        try
        {
            session = TodoSession.Open(new TaskStore(AppPaths.TasksFile, clock), clock);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            // 읽지 못한 파일을 빈 목록으로 덮어쓰지 않도록 여기서 멈춘다.
            MessageBox.Show(
                $"할 일 파일을 열 수 없어요.\n{AppPaths.TasksFile}\n\n{ex.Message}",
                "할 일", MessageBoxButton.OK, MessageBoxImage.Warning);
            Shutdown();
            return;
        }

        var autoStart = new AutoStart();
#if !DEBUG
        // Debug 빌드는 개발용 exe가 자동 실행에 등록되지 않도록 건너뛴다.
        TryRun(() => autoStart.OnLaunch(isFirstRun, Environment.ProcessPath!));
#endif
        // 다음 실행부터 "처음 실행"이 아니게 설정 파일을 바로 만든다.
        if (isFirstRun)
            TryRun(() => settingsStore.Save(settings));

        var window = new MainWindow(session, settingsStore, settings, autoStart);
        MainWindow = window;
        window.Show();
        _instance.OnActivateRequested(() => Dispatcher.Invoke(window.BringToFront));
    }

    protected override void OnExit(ExitEventArgs e)
    {
        _instance?.Dispose();
        base.OnExit(e);
    }

    private static void TryRun(Action action)
    {
        try
        {
            action();
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or SecurityException)
        {
            // 자동 실행·첫 설정 저장은 실패해도 위젯은 떠야 한다.
        }
    }
}
