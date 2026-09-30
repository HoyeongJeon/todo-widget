using System.IO;
using System.Security;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Controls.Primitives;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Threading;
using TodoWidget.Core;

namespace TodoWidget.App;

public partial class MainWindow : Window
{
    private const string PinGlyph = "\uE718";
    private const string UnpinGlyph = "\uE77A";

    private readonly MainViewModel _vm;
    private readonly SettingsStore _settingsStore;
    private readonly WidgetSettings _settings;
    private readonly AutoStart _autoStart;

    public MainWindow(TodoSession session, SettingsStore settingsStore, WidgetSettings settings, AutoStart autoStart)
    {
        InitializeComponent();
        _settingsStore = settingsStore;
        _settings = settings;
        _autoStart = autoStart;
        _vm = new MainViewModel(session, settings.DoneExpanded);
        DataContext = _vm;

        MaxHeight = SystemParameters.WorkArea.Height * 0.7;
        (Left, Top) = WindowPlacement.Resolve(settings.Left, settings.Top, Width, VirtualScreen(), WorkArea());
        ApplyPinned();
        DataObject.AddPastingHandler(AddBox, AddBox_Pasting);
        Closing += (_, _) => SaveSettings();
    }

    /// <summary>두 번째 실행 요청이 오면 가려진 위젯을 앞으로 가져온다.</summary>
    public void BringToFront()
    {
        Show();
        Topmost = true;
        Topmost = _settings.Pinned;
        Activate();
    }

    // ── 헤더 ──────────────────────────────────────────

    private void Header_MouseLeftButtonDown(object sender, MouseButtonEventArgs e)
    {
        if (e.ButtonState != MouseButtonState.Pressed)
            return;
        DragMove();
        SaveSettings();
    }

    private void PinButton_Click(object sender, RoutedEventArgs e)
    {
        _settings.Pinned = !_settings.Pinned;
        ApplyPinned();
        SaveSettings();
    }

    private void ApplyPinned()
    {
        Topmost = _settings.Pinned;
        PinButton.Content = _settings.Pinned ? PinGlyph : UnpinGlyph;
        PinButton.Foreground = (Brush)FindResource(_settings.Pinned ? "InkBrush" : "HintBrush");
        PinButton.ToolTip = _settings.Pinned ? "맨 위 고정 끄기" : "맨 위에 고정";
    }

    private void MoreButton_Click(object sender, RoutedEventArgs e)
    {
        AutoStartMenuItem.IsChecked = _autoStart.IsEnabled;
        var menu = MoreButton.ContextMenu!;
        menu.PlacementTarget = MoreButton;
        menu.Placement = PlacementMode.Bottom;
        menu.IsOpen = true;
    }

    private void AutoStartMenuItem_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            if (AutoStartMenuItem.IsChecked)
                _autoStart.Enable(Environment.ProcessPath!);
            else
                _autoStart.Disable();
        }
        catch (Exception ex) when (ex is UnauthorizedAccessException or SecurityException or IOException)
        {
            MessageBox.Show("자동 실행 설정을 바꾸지 못했어요.", "할 일", MessageBoxButton.OK, MessageBoxImage.Warning);
        }
        AutoStartMenuItem.IsChecked = _autoStart.IsEnabled;
    }

    private void ExitMenuItem_Click(object sender, RoutedEventArgs e) => Close();

    // ── 목록 ──────────────────────────────────────────

    private void DoneFold_MouseLeftButtonDown(object sender, MouseButtonEventArgs e)
    {
        _vm.DoneExpanded = !_vm.DoneExpanded;
        SaveSettings();
    }

    private void StatusMark_Click(object sender, RoutedEventArgs e)
    {
        if (ItemOf(sender) is { } item)
            _vm.Cycle(item.Id);
    }

    private void MenuTodo_Click(object sender, RoutedEventArgs e) => SetStatus(sender, TodoStatus.Todo);

    private void MenuDoing_Click(object sender, RoutedEventArgs e) => SetStatus(sender, TodoStatus.Doing);

    private void MenuDone_Click(object sender, RoutedEventArgs e) => SetStatus(sender, TodoStatus.Done);

    private void SetStatus(object sender, TodoStatus status)
    {
        if (ItemOf(sender) is { } item)
            _vm.SetStatus(item.Id, status);
    }

    private void MenuDelete_Click(object sender, RoutedEventArgs e)
    {
        if (ItemOf(sender) is { } item)
            _vm.Delete(item.Id);
    }

    // ── 이름 바꾸기 ───────────────────────────────────

    private void MenuRename_Click(object sender, RoutedEventArgs e)
    {
        if (ItemOf(sender) is { } item)
            item.IsEditing = true;
    }

    private void Title_MouseLeftButtonDown(object sender, MouseButtonEventArgs e)
    {
        if (e.ClickCount == 2 && ItemOf(sender) is { } item)
        {
            item.IsEditing = true;
            e.Handled = true;
        }
    }

    private void EditBox_IsVisibleChanged(object sender, DependencyPropertyChangedEventArgs e)
    {
        if (e.NewValue is true && sender is TextBox box)
            FocusAndSelectAllLater(box);
    }

    private void EditBox_PreviewKeyDown(object sender, KeyEventArgs e)
    {
        if (sender is not TextBox box || ItemOf(box) is not { } item)
            return;

        switch (RealKey(e))
        {
            case Key.Enter:
                // 한글 조합 중인 마지막 글자가 Text에 들어간 뒤에 처리한다.
                Dispatcher.InvokeAsync(() => CommitRename(box), DispatcherPriority.Input);
                break;
            case Key.Escape:
                box.Text = item.Title;
                item.IsEditing = false;
                break;
        }
    }

    private void EditBox_LostKeyboardFocus(object sender, KeyboardFocusChangedEventArgs e)
    {
        if (sender is TextBox box)
            CommitRename(box);
    }

    private void CommitRename(TextBox box)
    {
        // Enter와 포커스 이탈이 겹쳐도 한 번만 저장한다.
        if (ItemOf(box) is not { IsEditing: true } item)
            return;

        item.IsEditing = false;
        if (!_vm.Rename(item.Id, box.Text))
            box.Text = item.Title;
    }

    // ── 할 일 추가 (늘 떠 있는 입력칸) ─────────────────

    private void AddBox_PreviewKeyDown(object sender, KeyEventArgs e)
    {
        switch (RealKey(e))
        {
            case Key.Enter:
                // 한글 조합 중인 마지막 글자가 Text에 들어간 뒤에 추가한다. 입력칸은 비우고 포커스를 유지해 연달아 입력할 수 있다.
                Dispatcher.InvokeAsync(() =>
                {
                    if (_vm.Add(AddBox.Text))
                        AddBox.Clear();
                }, DispatcherPriority.Input);
                break;
            case Key.Escape:
                AddBox.Clear();
                break;
        }
    }

    private void AddBox_TextChanged(object sender, TextChangedEventArgs e) =>
        AddPlaceholder.Visibility = AddBox.Text.Length == 0 ? Visibility.Visible : Visibility.Collapsed;

    private void AddBox_Pasting(object sender, DataObjectPastingEventArgs e)
    {
        if (e.SourceDataObject.GetData(DataFormats.UnicodeText) is not string text || !text.Contains('\n'))
            return;

        // 여러 줄은 한 줄 입력칸에 넣지 않고 줄마다 바로 추가한다.
        e.CancelCommand();
        _vm.Add(text);
    }

    // ── 공통 ──────────────────────────────────────────

    private void SaveSettings()
    {
        _settings.Left = Left;
        _settings.Top = Top;
        _settings.DoneExpanded = _vm.DoneExpanded;
        try
        {
            _settingsStore.Save(_settings);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            // 설정은 잃어도 되는 정보라 조용히 넘어간다.
        }
    }

    // 막 보이기 시작한 입력칸은 레이아웃이 끝난 뒤에야 포커스를 받을 수 있다.
    private void FocusAndSelectAllLater(TextBox box) =>
        Dispatcher.InvokeAsync(() =>
        {
            box.Focus();
            box.SelectAll();
        }, DispatcherPriority.Input);

    private static TodoItemView? ItemOf(object sender) => (sender as FrameworkElement)?.DataContext as TodoItemView;

    // 한글 입력기가 처리 중인 키는 ImeProcessed로 들어오므로 원래 키를 꺼낸다.
    private static Key RealKey(KeyEventArgs e) => e.Key == Key.ImeProcessed ? e.ImeProcessedKey : e.Key;

    private static ScreenRect VirtualScreen() => new(
        SystemParameters.VirtualScreenLeft, SystemParameters.VirtualScreenTop,
        SystemParameters.VirtualScreenWidth, SystemParameters.VirtualScreenHeight);

    private static ScreenRect WorkArea()
    {
        var area = SystemParameters.WorkArea;
        return new ScreenRect(area.Left, area.Top, area.Width, area.Height);
    }
}
