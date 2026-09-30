using System.Windows;
using TodoWidget.Core;

namespace TodoWidget.App;

public partial class App : Application
{
    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

        var clock = new KstClock();
        var settingsStore = new SettingsStore(AppPaths.SettingsFile);
        var settings = settingsStore.Load();
        var session = TodoSession.Open(new TaskStore(AppPaths.TasksFile, clock), clock);

        var window = new MainWindow(session, settingsStore, settings, new AutoStart());
        MainWindow = window;
        window.Show();
    }
}
