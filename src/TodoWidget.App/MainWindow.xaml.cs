using System.IO;
using System.Security;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Controls.Primitives;
using System.Windows.Input;
using System.Windows.Interop;
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
        _vm = new MainViewModel(session, settings.DoingExpanded, settings.TodoExpanded, settings.DoneExpanded);
        DataContext = _vm;

        MinWidth = WindowSize.MinWidth;
        MaxWidth = WindowSize.MaxWidth;
        MaxHeight = SystemParameters.WorkArea.Height;
        ApplySize(WindowSize.Resolve(settings.Width, settings.MaxHeight, SystemParameters.WorkArea.Height));
        (Left, Top) = WindowPlacement.Resolve(settings.Left, settings.Top, Width, VirtualScreen(), WorkArea());
        ApplyPinned();
        foreach (var value in CardOpacity.Choices)
        {
            var item = new MenuItem { Header = $"{value * 100:0}%", Tag = value };
            item.Click += OpacityChoice_Click;
            OpacityMenuItem.Items.Add(item);
        }
        ApplyOpacity();
        SourceInitialized += (_, _) => HwndSource.FromHwnd(new WindowInteropHelper(this).Handle).AddHook(WndProc);
        // 창에 걸어 두면 추가 칸과 목록 안의 이름 바꾸기 칸 모두의 붙여넣기를 받는다.
        DataObject.AddPastingHandler(this, TextBox_Pasting);
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

    // ── 크기 조절 ─────────────────────────────────────

    private const int WmSizing = 0x0214;
    private const int WmExitSizeMove = 0x0232;
    private const double ShadowMargin = 10;
    private bool _resizing;


    private IntPtr WndProc(IntPtr hwnd, int msg, IntPtr wParam, IntPtr lParam, ref bool handled)
    {
        if (msg == WmSizing && !_resizing)
        {
            // 끄는 동안에는 상한을 풀어 카드가 마우스를 그대로 따라오게 한다.
            _resizing = true;
            SizeToContent = SizeToContent.Manual;
            Card.MaxHeight = double.PositiveInfinity;
        }
        else if (msg == WmExitSizeMove && _resizing)
        {
            // 손을 뗀 높이를 최대 높이로 저장하고, 내용이 더 짧으면 내용만큼 줄인다.
            _resizing = false;
            var size = WindowSize.Resolve(Width, ActualHeight, SystemParameters.WorkArea.Height);
            _settings.Width = size.Width;
            _settings.MaxHeight = size.MaxHeight;
            ApplySize(size);
            SaveSettings();
        }
        return IntPtr.Zero;
    }

    private void ApplySize(WidgetSize size)
    {
        Width = size.Width;
        Card.MaxHeight = size.MaxHeight - 2 * ShadowMargin;
        SizeToContent = SizeToContent.Height;
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

    private void OpacityChoice_Click(object sender, RoutedEventArgs e)
    {
        _settings.Opacity = (double)((MenuItem)sender).Tag;
        ApplyOpacity();
        SaveSettings();
    }

    // 배경만 비치게 한다. 글자·동그라미는 그대로 선명하다.
    private void ApplyOpacity()
    {
        var opacity = CardOpacity.Resolve(_settings.Opacity);
        foreach (var key in new[] { "CardBrush", "FoldBgBrush", "DoingBgBrush" })
        {
            var brush = ((SolidColorBrush)Application.Current.FindResource(key)).Clone();
            brush.Opacity = opacity;
            brush.Freeze();
            Resources[key] = brush;
        }
        CardShadow.Opacity = 0.12 * opacity;
        foreach (MenuItem item in OpacityMenuItem.Items)
            item.IsChecked = (double)item.Tag == opacity;
    }

    // ── 목록 ──────────────────────────────────────────

    private void DoingFold_MouseLeftButtonDown(object sender, MouseButtonEventArgs e)
    {
        _vm.DoingExpanded = !_vm.DoingExpanded;
        SaveSettings();
    }

    private void TodoFold_MouseLeftButtonDown(object sender, MouseButtonEventArgs e)
    {
        _vm.TodoExpanded = !_vm.TodoExpanded;
        SaveSettings();
    }

    private void DoneFold_MouseLeftButtonDown(object sender, MouseButtonEventArgs e)
    {
        _vm.DoneExpanded = !_vm.DoneExpanded;
        SaveSettings();
    }

    private void StatusMark_Click(object sender, RoutedEventArgs e)
    {
        // 저장으로 목록이 다시 그려지면 이 버튼은 화면에서 떨어져 나가므로, 누른 항목을 먼저 잡아 둔다.
        if (ItemOf(sender) is not { } item)
            return;

        // 동그라미는 포커스를 가져가지 않으므로, 이름을 바꾸던 중이면 먼저 저장한다.
        if (Keyboard.FocusedElement is TextBox editing && editing != AddBox)
            CommitRename(editing);

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
        // 메뉴가 열린 사이 다른 편집이 저장되어 목록이 새로 그려졌을 수 있으니, 지금 화면의 항목을 다시 찾는다.
        if (ItemOf(sender) is { } clicked && _vm.ViewOf(clicked.Id) is { } item)
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

    // 한 줄 입력칸은 여러 줄을 붙여 넣으면 첫 줄만 남기므로 직접 처리한다.
    private void TextBox_Pasting(object sender, DataObjectPastingEventArgs e)
    {
        // 목록 템플릿 안의 입력칸은 창에서 볼 때 Source가 목록으로 바뀌므로 OriginalSource로 찾는다.
        if (e.OriginalSource is not TextBox box
            || e.SourceDataObject.GetData(DataFormats.UnicodeText) is not string text
            || text.IndexOfAny(['\r', '\n']) < 0)
            return;

        if (box == AddBox)
        {
            // 추가 칸: 입력칸에 넣지 않고 줄마다 바로 추가한다.
            e.CancelCommand();
            _vm.Add(text);
        }
        else
        {
            // 이름 바꾸기 칸: 줄바꿈을 공백으로 바꿔 한 줄로 합친 뒤 직접 넣는다.
            e.CancelCommand();
            var joined = text.Replace("\r\n", " ").Replace('\r', ' ').Replace('\n', ' ');
            var start = box.SelectionStart;
            box.SelectedText = joined;
            box.Select(start + joined.Length, 0);
        }
    }

    // ── 공통 ──────────────────────────────────────────

    private void SaveSettings()
    {
        _settings.Left = Left;
        _settings.Top = Top;
        _settings.DoingExpanded = _vm.DoingExpanded;
        _settings.TodoExpanded = _vm.TodoExpanded;
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
