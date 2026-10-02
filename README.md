# windows-todo-widget

A small, always-on desktop to-do widget for Windows. It sits on your desktop and shows at a glance how much is left to do.

The UI is in Korean.

## Features

- **Three states, two sections.** Click the circle to move a task from *할 일* (to do) to *하는 중* (in progress) to *끝낸 일* (done). In-progress tasks stay in the to-do list, highlighted in orange at the top.
- **Always-visible input.** Type a task at the bottom and press Enter. The box stays open, so you can add several in a row.
- **Paste a list.** Paste multiple lines and each line becomes its own task. Blank lines are skipped, and leading `-` / `•` bullets are removed.
- **Right-click menu.** Jump straight to any state (for example, finish a task in one step), rename, or delete. You can also double-click a title to rename it.
- **Done on top, folded.** Finished tasks sit at the top in a "끝낸 일 N" row that stays folded until you open it. The newest finished task is listed first.
- **Fold the list.** Click the *할 일* title to fold it down to one line. The count stays visible.
- **Resizable.** Drag any edge or corner. The height you drag to becomes a limit: with few tasks the widget stays small, and with many it stops there and scrolls.
- **Separate scrolling.** With the done list open, *끝낸 일* and *할 일* scroll on their own. A short section stays fully visible, and long sections share the remaining space.
- **Background transparency.** Drag the slider in the ⋯ menu (or scroll over it) to make the card 0–40% see-through. The change shows as you drag. Only the card background fades, so text stays crisp.
- **Clear all.** ⋯ → 초기화 deletes every task after you confirm in the widget. Your settings stay as they are.
- **Pin on top.** Toggle always-on-top with the pin button.
- **Remembers its place.** Position, size, opacity, pin state, and fold state are restored on the next launch.
- **Starts with Windows.** Auto start is enabled on the first run and can be turned off from the ⋯ menu.
- **Single instance.** Launching it again brings the existing widget to the front.

## Download

1. Download `TodoWidget-win-x64.zip` from the [latest release](https://github.com/HoyeongJeon/windows-todo-widget/releases/latest).
2. Unzip it anywhere you like, for example `C:\Tools\TodoWidget\`.
3. Run `TodoWidget.exe`.

There is nothing to install, and the .NET runtime is bundled. On the first run, the widget registers itself to start with Windows. Move the exe to its final folder before you run it.

> **Windows protected your PC?** The exe is not code-signed, so SmartScreen may warn you the first time. Click **More info → Run anyway**.

To update, quit the widget (⋯ → 종료), replace `TodoWidget.exe` with the one from the newest release, and run it. There is no auto update. Your tasks and settings live in `%APPDATA%\TodoWidget\`, so they are kept.

To uninstall, turn off auto start from the ⋯ menu, quit the widget, and delete the exe and `%APPDATA%\TodoWidget\`.

## Requirements

- Windows 10 or 11 (x64)
- To build: the [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)

## Build and run

```powershell
dotnet publish src/TodoWidget.App/TodoWidget.App.csproj -c Release -r win-x64 --self-contained false -p:PublishSingleFile=true -o dist
.\dist\TodoWidget.exe
```

The result is a single `TodoWidget.exe` of about 300 KB. It needs the .NET 10 Desktop Runtime to be installed.

To build the self-contained release (runtime bundled, about 130 MB):

```powershell
dotnet publish src/TodoWidget.App/TodoWidget.App.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -p:DebugType=none -o release
```

Single-file compression is left off on purpose. The release is zipped for download instead, because a compressed exe decompresses into memory and roughly doubles its RAM use.

## Data

Everything is stored as plain JSON in `%APPDATA%\TodoWidget\`:

| File | Contents |
|---|---|
| `tasks.json` | Your tasks |
| `settings.json` | Window position and size, background opacity, pin state, and which sections are folded |

```json
[
  {
    "id": "3f2a9c1e-…",
    "title": "보고서 초안 쓰기",
    "status": "todo",
    "createdAt": "2026-09-30 09:12:40",
    "completedAt": null
  }
]
```

- **Time format.** Times are always Korea Standard Time in `yyyy-MM-dd HH:mm:ss`, regardless of the PC's time zone setting.
- **Safe saves.** Each change is written to a temp file, flushed to disk, and then swapped in, so a power cut cannot leave a half-written file.
- **Broken files.** If `tasks.json` cannot be parsed, it is renamed to `tasks.broken-<timestamp>.json` and the widget starts empty with a notice.
- **Unreadable files.** If the file is locked by another program, the widget shows a message and exits rather than overwriting it.

Auto start is registered under `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` as `TodoWidget`.

## Development

```powershell
dotnet build
dotnet test
```

Set `TODOWIDGET_DATA_DIR` to keep test data away from your real tasks while developing:

```powershell
$env:TODOWIDGET_DATA_DIR = "C:\dev\todo\.devdata"
dotnet run --project src/TodoWidget.App
```

Debug builds never touch the auto-start registry entry on launch.

### Project layout

```
src/TodoWidget.Core/         UI-free logic: task rules, KST clock, JSON stores, window placement, auto start
src/TodoWidget.App/          WPF widget (builds TodoWidget.exe)
tests/TodoWidget.Core.Tests/ xUnit tests for Core
docs/superpowers/            Design spec and implementation plan (Korean)
```

The widget renders in software mode on purpose. It needs no GPU features, and this roughly halves its memory use.
