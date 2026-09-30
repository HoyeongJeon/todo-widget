# 할 일 위젯 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 바탕화면에 늘 떠 있는 가벼운 할 일 위젯(시작 전 / 하는 중 / 끝낸 것)을 C# WPF로 만든다.

**Architecture:** 화면과 무관한 로직(할 일 규칙, 한국 시간, JSON 저장, 창 위치 계산, 자동 실행 등록)은 `TodoWidget.Core`에 두고 xUnit으로 TDD 한다. `TodoWidget.App`은 WPF 위젯 화면으로, Core를 호출해 결과를 그리기만 한다. 변경할 때마다 `TodoSession`이 즉시 저장하고 `Changed` 이벤트로 화면을 다시 그린다.

**Tech Stack:** C# / .NET 10 (LTS) / WPF / System.Text.Json / Microsoft.Win32.Registry / xUnit. 외부 NuGet 라이브러리 없음(테스트 제외).

**Spec:** `docs/superpowers/specs/2026-09-30-todo-widget-design.md`

## Global Constraints

- 모든 명령은 저장소 루트 `C:\dev\todo`에서 실행한다.
- 대상 프레임워크: 모든 프로젝트 `net10.0-windows`.
- 외부 라이브러리 금지. 테스트 프로젝트의 xUnit 템플릿 패키지만 허용.
- 상태 저장값: `todo` / `doing` / `done`. 화면 표시: 시작 전 / 하는 중 / 끝낸 것.
- 시각: 항상 한국 표준시(`Korea Standard Time`), 형식 `yyyy-MM-dd HH:mm:ss` (예: `2026-09-30 14:05:00`). `T` 금지. PC 시간대 무시.
- 데이터 폴더: `%APPDATA%\TodoWidget\` (`tasks.json`, `settings.json`). 개발 중 수동 실행은 반드시 환경 변수 `TODOWIDGET_DATA_DIR=C:\dev\todo\.devdata`로 한다. 실제 데이터 폴더와 첫 실행 판정을 오염시키지 않기 위해서다.
- 저장: 임시 파일(`<파일>.tmp`)에 쓴 뒤 원본과 교체. JSON의 한글은 이스케이프하지 않는다(메모장으로 읽을 수 있게).
- 자동 실행: `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`, 값 이름 `TodoWidget`, 값 `"<exe 경로>"`. Debug 빌드는 시작할 때 자동 실행을 건드리지 않는다.
- 창: 폭 300px 카드(창 폭 320 = 그림자 여백 10×2), 높이는 내용에 맞춤, 최대 화면 작업 영역 높이의 70%. 기본 위치는 작업 영역 오른쪽 위, 여백 24.
- 글꼴: 맑은 고딕(`Malgun Gothic`). 아이콘: `Segoe Fluent Icons, Segoe MDL2 Assets`.
- 색: 카드 `#FFFFFF`, 글자 `#2B2A28`, 흐린 글자 `#8C8983`, 구분선 `#EBE8E3`, 시작 전 `#B9B5AD`, 하는 중 `#E8935A`(배경 `#FDF1E8`), 끝낸 것 `#7FAE8A`, 접힘 배경 `#F6F5F2`, 힌트 `#B3AFA8`.
- 화면 문구(그대로 사용): "할 일", "N개 남음", "모두 끝냈어요", "하는 중", "시작 전", "끝낸 것 N", "펼치기"/"접기", "+ 할 일 추가", "할 일을 추가해 보세요", "이름 바꾸기", "삭제", "컴퓨터 켤 때 자동 실행", "종료", "저장 파일에 문제가 있어 백업해 두었어요", "저장하지 못했어요. 다음 변경 때 다시 시도해요".
- 커밋 메시지: conventional commits(`feat:`, `test:`, `chore:` 등). AI 공동 작성자 줄(`Co-Authored-By`)을 넣지 않는다.

**스펙을 구체화한 결정** (스펙에 없던 빈칸을 채운 것)
- 제목의 줄바꿈과 연속 공백은 공백 하나로 합친다. 여러 줄을 붙여 넣어도 한 줄 제목이 된다.
- 이름 바꾸기 중에 다른 곳을 클릭하면 Enter와 똑같이 저장한다.
- 추가 입력칸을 닫아도 입력하던 글자는 남아 있다. 다시 열면 이어서 쓸 수 있다.
- `done`인데 `completedAt`이 없는 항목은 파일 손상으로 보지 않는다. 끝낸 것 목록의 맨 아래에 둔다.
- `tasks.json`이 있지만 읽을 수 없는 경우(다른 프로그램이 잠금 등)에는 안내 창을 띄우고 종료한다. 빈 목록으로 시작하면 다음 저장 때 원본을 덮어쓰기 때문이다.

## Review Focus

1. **한글 입력 중 Enter** — 한글을 조합하는 중에 Enter를 눌러도 마지막 글자가 빠지거나 중복되지 않고 추가·이름 바꾸기가 된다. → Task 9의 IME 처리 코드와 PM 확인 항목.
2. **`tasks.json`을 읽을 수 없음** — 파일이 잠겨 있으면 앱이 빈 목록으로 덮어쓰지 않고 안내 후 종료한다. → Task 4 `Load_throws_when_the_file_is_locked`, Task 10 안내 창.
3. **여러 줄 붙여넣기** — 여러 줄 텍스트를 붙여 넣어도 한 줄 제목으로 저장된다. → Task 3 `Add_collapses_line_breaks_and_repeated_spaces`.
4. **같은 초에 여러 개 추가** — 빠르게 연달아 추가해도 추가한 순서대로 보인다. → Task 3 `InStatus_keeps_insertion_order_for_items_created_in_the_same_second`.
5. **창 위치가 비정상 값** — 창 좌표가 `NaN`이거나 모니터가 바뀌어도 위젯이 화면 안에 뜬다. → Task 5 `Save_writes_non_finite_positions_as_null`, Task 7 배치 테스트.

## 파일 구조

```
C:\dev\todo
├─ .gitignore
├─ TodoWidget.slnx                     # 솔루션 (dotnet new sln이 만드는 형식 그대로)
├─ docs/superpowers/{specs,plans}/
├─ src/
│  ├─ TodoWidget.Core/                 # 화면과 무관한 로직
│  │  ├─ TodoWidget.Core.csproj
│  │  ├─ IClock.cs                     # 현재 한국 시각 인터페이스
│  │  ├─ KstClock.cs                   # UTC → 한국 표준시
│  │  ├─ KstFormat.cs                  # "yyyy-MM-dd HH:mm:ss" 변환
│  │  ├─ TodoStatus.cs                 # Todo / Doing / Done
│  │  ├─ TodoItem.cs                   # 할 일 하나
│  │  ├─ TodoList.cs                   # 추가·순환·상태·이름·삭제·정렬 규칙
│  │  ├─ AtomicFile.cs                 # 임시 파일 → 교체 저장
│  │  ├─ TaskStore.cs                  # tasks.json 읽기/쓰기, 깨진 파일 백업
│  │  ├─ WidgetSettings.cs             # 창 위치·고정·펼침
│  │  ├─ SettingsStore.cs              # settings.json 읽기/쓰기
│  │  ├─ TodoSession.cs                # 목록 + 즉시 저장 + 안내 문구
│  │  ├─ WindowPlacement.cs            # 저장 위치 검증, 기본 위치 계산
│  │  └─ AutoStart.cs                  # 레지스트리 자동 실행
│  └─ TodoWidget.App/                  # WPF 위젯 (exe 이름 TodoWidget.exe)
│     ├─ TodoWidget.App.csproj
│     ├─ App.xaml / App.xaml.cs        # 시작 흐름
│     ├─ AppPaths.cs                   # 데이터 폴더 경로
│     ├─ SingleInstance.cs             # 두 번 실행 방지 + 기존 창 깨우기
│     ├─ Theme.xaml                    # 색·글꼴·버튼 스타일
│     ├─ Converters.cs                 # bool → Visibility
│     ├─ TodoItemView.cs               # 화면용 할 일
│     ├─ MainViewModel.cs              # 화면 상태
│     └─ MainWindow.xaml / .xaml.cs    # 위젯 화면과 조작
└─ tests/
   └─ TodoWidget.Core.Tests/
      ├─ TodoWidget.Core.Tests.csproj
      ├─ FakeClock.cs, TempDir.cs      # 테스트 도우미
      ├─ KstClockTests.cs, KstFormatTests.cs
      ├─ TodoListTests.cs
      ├─ TaskStoreTests.cs, SettingsStoreTests.cs
      ├─ TodoSessionTests.cs
      ├─ WindowPlacementTests.cs
      └─ AutoStartTests.cs
```

---

### Task 1: 개발 도구 설치와 솔루션 뼈대

**Files:**
- Create: `TodoWidget.slnx`, `src/TodoWidget.Core/TodoWidget.Core.csproj`, `src/TodoWidget.App/*` (템플릿), `tests/TodoWidget.Core.Tests/*` (템플릿)
- Modify: `.gitignore`

**Interfaces:**
- Consumes: 없음
- Produces: 빌드되는 솔루션. App 어셈블리 이름 `TodoWidget`, 네임스페이스 `TodoWidget.App`. Core 네임스페이스 `TodoWidget.Core`. 테스트 네임스페이스 `TodoWidget.Core.Tests`.

- [ ] **Step 1: .NET 10 SDK 설치**

```powershell
winget install --id Microsoft.DotNet.SDK.10 --silent --accept-package-agreements --accept-source-agreements
dotnet --list-sdks
```
Expected: `10.0.x [C:\Program Files\dotnet\sdk]` 한 줄 이상.

- [ ] **Step 2: 프로젝트 생성** (저장소 루트 `C:\dev\todo`에서)

```bash
dotnet new sln -n TodoWidget
dotnet new classlib -n TodoWidget.Core -o src/TodoWidget.Core -f net10.0
dotnet new wpf -n TodoWidget.App -o src/TodoWidget.App -f net10.0
dotnet new xunit -n TodoWidget.Core.Tests -o tests/TodoWidget.Core.Tests -f net10.0
rm src/TodoWidget.Core/Class1.cs
```

- [ ] **Step 3: Core 프로젝트 파일 교체**

`src/TodoWidget.Core/TodoWidget.Core.csproj` 전체:

```xml
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <TargetFramework>net10.0-windows</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>

</Project>
```

- [ ] **Step 4: App 프로젝트 파일 교체**

`src/TodoWidget.App/TodoWidget.App.csproj` 전체:

```xml
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <OutputType>WinExe</OutputType>
    <TargetFramework>net10.0-windows</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <UseWPF>true</UseWPF>
    <AssemblyName>TodoWidget</AssemblyName>
    <RootNamespace>TodoWidget.App</RootNamespace>
  </PropertyGroup>

  <ItemGroup>
    <ProjectReference Include="..\TodoWidget.Core\TodoWidget.Core.csproj" />
  </ItemGroup>

</Project>
```

- [ ] **Step 5: 테스트 프로젝트를 Windows 대상으로 바꾸고 Core 참조 추가**

```bash
sed -i 's#<TargetFramework>net10.0</TargetFramework>#<TargetFramework>net10.0-windows</TargetFramework>#' tests/TodoWidget.Core.Tests/TodoWidget.Core.Tests.csproj
grep -n "TargetFramework" tests/TodoWidget.Core.Tests/TodoWidget.Core.Tests.csproj
dotnet add tests/TodoWidget.Core.Tests/TodoWidget.Core.Tests.csproj reference src/TodoWidget.Core/TodoWidget.Core.csproj
```
Expected: `grep` 결과가 `<TargetFramework>net10.0-windows</TargetFramework>`.

- [ ] **Step 6: 솔루션에 추가**

```bash
dotnet sln add src/TodoWidget.Core/TodoWidget.Core.csproj src/TodoWidget.App/TodoWidget.App.csproj tests/TodoWidget.Core.Tests/TodoWidget.Core.Tests.csproj
```

- [ ] **Step 7: .gitignore 보강**

`.gitignore` 전체:

```
.superpowers/
.devdata/
bin/
obj/
dist/
TestResults/
.vs/
*.user
```

- [ ] **Step 8: 빌드와 템플릿 테스트 실행**

```bash
dotnet build
dotnet test
```
Expected: 빌드 성공(오류 0). 템플릿의 기본 테스트 1개 통과.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold .NET 10 solution with Core, App, and tests"
```

---

### Task 2: 한국 시각과 시각 형식

**Files:**
- Create: `src/TodoWidget.Core/IClock.cs`, `src/TodoWidget.Core/KstClock.cs`, `src/TodoWidget.Core/KstFormat.cs`
- Create: `tests/TodoWidget.Core.Tests/FakeClock.cs`, `tests/TodoWidget.Core.Tests/KstClockTests.cs`, `tests/TodoWidget.Core.Tests/KstFormatTests.cs`
- Delete: `tests/TodoWidget.Core.Tests/UnitTest1.cs`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `public interface IClock { DateTime Now { get; } }` — 한국 표준시, 초 단위, `DateTimeKind.Unspecified`
  - `public sealed class KstClock : IClock` — 생성자 `KstClock()`, `KstClock(Func<DateTime> utcNow)`
  - `public static class KstFormat` — `const string Pattern`, `string Format(DateTime)`, `bool TryParse(string?, out DateTime)`
  - 테스트용 `internal sealed class FakeClock : IClock` — `DateTime Now { get; set; }` 기본값 2026-09-30 09:00:00, `void Advance(TimeSpan)`

- [ ] **Step 1: 템플릿 테스트 삭제, 실패하는 테스트 작성**

```bash
rm tests/TodoWidget.Core.Tests/UnitTest1.cs
```

`tests/TodoWidget.Core.Tests/FakeClock.cs`:

```csharp
using TodoWidget.Core;

namespace TodoWidget.Core.Tests;

internal sealed class FakeClock : IClock
{
    public DateTime Now { get; set; } = new(2026, 9, 30, 9, 0, 0);

    public void Advance(TimeSpan by) => Now = Now.Add(by);
}
```

`tests/TodoWidget.Core.Tests/KstClockTests.cs`:

```csharp
using TodoWidget.Core;
using Xunit;

namespace TodoWidget.Core.Tests;

public class KstClockTests
{
    [Fact]
    public void Now_converts_utc_to_korea_standard_time()
    {
        var clock = new KstClock(() => new DateTime(2026, 9, 30, 5, 5, 7, DateTimeKind.Utc));

        Assert.Equal(new DateTime(2026, 9, 30, 14, 5, 7), clock.Now);
    }

    [Fact]
    public void Now_rolls_over_to_the_next_day_in_korea()
    {
        var clock = new KstClock(() => new DateTime(2026, 12, 31, 20, 0, 0, DateTimeKind.Utc));

        Assert.Equal(new DateTime(2027, 1, 1, 5, 0, 0), clock.Now);
    }

    [Fact]
    public void Now_drops_fractions_of_a_second()
    {
        var clock = new KstClock(() => new DateTime(2026, 9, 30, 5, 5, 7, 999, DateTimeKind.Utc));

        Assert.Equal(new DateTime(2026, 9, 30, 14, 5, 7), clock.Now);
        Assert.Equal(0, clock.Now.Millisecond);
    }
}
```

`tests/TodoWidget.Core.Tests/KstFormatTests.cs`:

```csharp
using TodoWidget.Core;
using Xunit;

namespace TodoWidget.Core.Tests;

public class KstFormatTests
{
    [Fact]
    public void Format_uses_date_space_time_without_T()
    {
        Assert.Equal("2026-09-30 14:05:00", KstFormat.Format(new DateTime(2026, 9, 30, 14, 5, 0)));
    }

    [Fact]
    public void TryParse_reads_the_storage_format()
    {
        Assert.True(KstFormat.TryParse("2026-09-30 14:05:09", out var value));
        Assert.Equal(new DateTime(2026, 9, 30, 14, 5, 9), value);
    }

    [Theory]
    [InlineData("2026-09-30T14:05:09")]
    [InlineData("2026-13-01 00:00:00")]
    [InlineData("")]
    [InlineData(null)]
    public void TryParse_rejects_other_formats(string? text)
    {
        Assert.False(KstFormat.TryParse(text, out _));
    }
}
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `dotnet test`
Expected: 빌드 실패. `error CS0246: The type or namespace name 'IClock' could not be found` (KstClock, KstFormat도 동일).

- [ ] **Step 3: 구현**

`src/TodoWidget.Core/IClock.cs`:

```csharp
namespace TodoWidget.Core;

/// <summary>현재 한국 표준시. 테스트에서 시각을 고정할 수 있게 인터페이스로 둔다.</summary>
public interface IClock
{
    DateTime Now { get; }
}
```

`src/TodoWidget.Core/KstClock.cs`:

```csharp
namespace TodoWidget.Core;

/// <summary>PC 시간대 설정과 관계없이 항상 한국 표준시를 돌려준다.</summary>
public sealed class KstClock : IClock
{
    private static readonly TimeZoneInfo Kst = TimeZoneInfo.FindSystemTimeZoneById("Korea Standard Time");

    private readonly Func<DateTime> _utcNow;

    public KstClock() : this(() => DateTime.UtcNow)
    {
    }

    public KstClock(Func<DateTime> utcNow) => _utcNow = utcNow;

    public DateTime Now
    {
        get
        {
            var kst = TimeZoneInfo.ConvertTimeFromUtc(_utcNow(), Kst);
            // 저장 형식이 초 단위이므로 그 아래는 버린다.
            return new DateTime(kst.Year, kst.Month, kst.Day, kst.Hour, kst.Minute, kst.Second, DateTimeKind.Unspecified);
        }
    }
}
```

`src/TodoWidget.Core/KstFormat.cs`:

```csharp
using System.Globalization;

namespace TodoWidget.Core;

/// <summary>저장용 시각 문자열 형식. 예: 2026-09-30 14:05:00</summary>
public static class KstFormat
{
    public const string Pattern = "yyyy-MM-dd HH:mm:ss";

    public static string Format(DateTime value) => value.ToString(Pattern, CultureInfo.InvariantCulture);

    public static bool TryParse(string? text, out DateTime value) =>
        DateTime.TryParseExact(text, Pattern, CultureInfo.InvariantCulture, DateTimeStyles.None, out value);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `dotnet test`
Expected: 모든 테스트 통과 (KstClock 3개, KstFormat 6개).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Korea Standard Time clock and storage time format"
```

---

### Task 3: 할 일 목록 규칙

**Files:**
- Create: `src/TodoWidget.Core/TodoStatus.cs`, `src/TodoWidget.Core/TodoItem.cs`, `src/TodoWidget.Core/TodoList.cs`
- Create: `tests/TodoWidget.Core.Tests/TodoListTests.cs`

**Interfaces:**
- Consumes: `IClock` (Task 2), 테스트의 `FakeClock` (Task 2)
- Produces:
  - `public enum TodoStatus { Todo, Doing, Done }`
  - `public sealed class TodoItem` — 생성자 `TodoItem(string id, string title, TodoStatus status, DateTime createdAt, DateTime? completedAt)`; 속성 `string Id`, `string Title`, `TodoStatus Status`, `DateTime CreatedAt`, `DateTime? CompletedAt` (모두 public get, Title/Status/CompletedAt은 internal set)
  - `public sealed class TodoList` — 생성자 `TodoList(IClock clock, IEnumerable<TodoItem>? items = null)`; `IReadOnlyList<TodoItem> Items`; `int RemainingCount`; `TodoItem? Add(string title)`; `bool Cycle(string id)`; `bool SetStatus(string id, TodoStatus status)`; `bool Rename(string id, string title)`; `bool Delete(string id)`; `IReadOnlyList<TodoItem> InStatus(TodoStatus status)`. 모든 변경 메서드는 실제로 바뀌었거나 대상을 찾았으면 true, 대상이 없거나 입력이 무효면 false.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/TodoWidget.Core.Tests/TodoListTests.cs`:

```csharp
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
    public void Cycle_goes_todo_doing_done_and_back_to_todo()
    {
        var list = new TodoList(_clock);
        var item = list.Add("택배 반품 접수")!;

        Assert.True(list.Cycle(item.Id));
        Assert.Equal(TodoStatus.Doing, item.Status);
        Assert.True(list.Cycle(item.Id));
        Assert.Equal(TodoStatus.Done, item.Status);
        Assert.True(list.Cycle(item.Id));
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

        list.SetStatus(item.Id, TodoStatus.Doing);

        Assert.Null(item.CompletedAt);
    }

    [Fact]
    public void Finishing_again_records_a_new_completed_time()
    {
        var list = new TodoList(_clock);
        var item = list.Add("은행 방문")!;
        list.SetStatus(item.Id, TodoStatus.Done);
        list.Cycle(item.Id);
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

        Assert.False(list.Cycle("nope"));
        Assert.False(list.SetStatus("nope", TodoStatus.Done));
        Assert.False(list.Rename("nope", "새 이름"));
        Assert.False(list.Delete("nope"));
    }

    [Fact]
    public void RemainingCount_counts_todo_and_doing()
    {
        var list = new TodoList(_clock);
        list.Add("시작 전");
        list.Cycle(list.Add("하는 중")!.Id);
        list.SetStatus(list.Add("끝낸 것")!.Id, TodoStatus.Done);

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
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `dotnet test`
Expected: 빌드 실패. `error CS0246: The type or namespace name 'TodoList' could not be found`.

- [ ] **Step 3: 구현**

`src/TodoWidget.Core/TodoStatus.cs`:

```csharp
namespace TodoWidget.Core;

public enum TodoStatus
{
    Todo,
    Doing,
    Done,
}
```

`src/TodoWidget.Core/TodoItem.cs`:

```csharp
namespace TodoWidget.Core;

/// <summary>할 일 하나. 상태와 제목은 TodoList를 통해서만 바뀐다.</summary>
public sealed class TodoItem
{
    public TodoItem(string id, string title, TodoStatus status, DateTime createdAt, DateTime? completedAt)
    {
        Id = id;
        Title = title;
        Status = status;
        CreatedAt = createdAt;
        CompletedAt = completedAt;
    }

    public string Id { get; }

    public string Title { get; internal set; }

    public TodoStatus Status { get; internal set; }

    public DateTime CreatedAt { get; }

    /// <summary>끝낸 시각. Done일 때만 값이 있다.</summary>
    public DateTime? CompletedAt { get; internal set; }
}
```

`src/TodoWidget.Core/TodoList.cs`:

```csharp
namespace TodoWidget.Core;

/// <summary>할 일 목록의 규칙: 추가, 상태 순환, 상태 지정, 이름 바꾸기, 삭제, 정렬.</summary>
public sealed class TodoList
{
    private readonly IClock _clock;
    private readonly List<TodoItem> _items;

    public TodoList(IClock clock, IEnumerable<TodoItem>? items = null)
    {
        _clock = clock;
        _items = items?.ToList() ?? [];
    }

    public IReadOnlyList<TodoItem> Items => _items;

    /// <summary>남은 일 = 시작 전 + 하는 중.</summary>
    public int RemainingCount => _items.Count(i => i.Status != TodoStatus.Done);

    public TodoItem? Add(string title)
    {
        var clean = Clean(title);
        if (clean.Length == 0)
            return null;

        var item = new TodoItem(Guid.NewGuid().ToString(), clean, TodoStatus.Todo, _clock.Now, null);
        _items.Add(item);
        return item;
    }

    public bool Cycle(string id)
    {
        if (Find(id) is not { } item)
            return false;

        var next = item.Status switch
        {
            TodoStatus.Todo => TodoStatus.Doing,
            TodoStatus.Doing => TodoStatus.Done,
            _ => TodoStatus.Todo,
        };
        Apply(item, next);
        return true;
    }

    public bool SetStatus(string id, TodoStatus status)
    {
        if (Find(id) is not { } item)
            return false;

        Apply(item, status);
        return true;
    }

    public bool Rename(string id, string title)
    {
        var clean = Clean(title);
        if (Find(id) is not { } item || clean.Length == 0)
            return false;

        item.Title = clean;
        return true;
    }

    public bool Delete(string id) => _items.RemoveAll(i => i.Id == id) > 0;

    /// <summary>시작 전·하는 중은 만든 순서(오래된 것 위), 끝낸 것은 끝낸 시각 역순.</summary>
    public IReadOnlyList<TodoItem> InStatus(TodoStatus status)
    {
        var matching = _items.Where(i => i.Status == status);
        return status == TodoStatus.Done
            ? matching.OrderByDescending(i => i.CompletedAt).ToList()
            : matching.OrderBy(i => i.CreatedAt).ToList();
    }

    private void Apply(TodoItem item, TodoStatus status)
    {
        if (item.Status == status)
            return;

        item.Status = status;
        item.CompletedAt = status == TodoStatus.Done ? _clock.Now : null;
    }

    private TodoItem? Find(string id) => _items.FirstOrDefault(i => i.Id == id);

    // 줄바꿈·탭·연속 공백을 공백 하나로 합치고 앞뒤 공백을 없앤다.
    private static string Clean(string title) =>
        string.Join(' ', title.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `dotnet test`
Expected: 모든 테스트 통과.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add todo list rules for status cycling, completion time, and ordering"
```

---

### Task 4: 할 일 파일 저장소 (`tasks.json`)

**Files:**
- Create: `src/TodoWidget.Core/AtomicFile.cs`, `src/TodoWidget.Core/TaskStore.cs`
- Create: `tests/TodoWidget.Core.Tests/TempDir.cs`, `tests/TodoWidget.Core.Tests/TaskStoreTests.cs`

**Interfaces:**
- Consumes: `IClock`, `KstFormat` (Task 2); `TodoItem`, `TodoStatus` (Task 3)
- Produces:
  - `internal static class AtomicFile` — `void WriteAllText(string path, string content)` (폴더가 없으면 만든다)
  - `public sealed record TaskLoadResult(IReadOnlyList<TodoItem> Items, string? BackupPath)` — `BackupPath`가 null이 아니면 깨진 파일을 백업했다는 뜻
  - `public sealed class TaskStore` — 생성자 `TaskStore(string filePath, IClock clock)`; `string FilePath`; `TaskLoadResult Load()`; `void Save(IEnumerable<TodoItem> items)`. `Load`는 파일이 잠겨 읽을 수 없으면 `IOException`을 그대로 던진다. `Save`는 실패하면 `IOException`/`UnauthorizedAccessException`을 던진다.
  - 테스트용 `internal sealed class TempDir : IDisposable` — `string Root`, `string PathOf(string name)`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/TodoWidget.Core.Tests/TempDir.cs`:

```csharp
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
```

`tests/TodoWidget.Core.Tests/TaskStoreTests.cs`:

```csharp
using TodoWidget.Core;
using Xunit;

namespace TodoWidget.Core.Tests;

public sealed class TaskStoreTests : IDisposable
{
    private readonly TempDir _dir = new();
    private readonly FakeClock _clock = new();

    public void Dispose() => _dir.Dispose();

    private TaskStore Store() => new(_dir.PathOf("tasks.json"), _clock);

    [Fact]
    public void Load_returns_empty_when_the_file_does_not_exist()
    {
        var result = Store().Load();

        Assert.Empty(result.Items);
        Assert.Null(result.BackupPath);
    }

    [Fact]
    public void Save_then_load_returns_the_same_items()
    {
        var items = new[]
        {
            new TodoItem("a", "보고서 초안 쓰기", TodoStatus.Doing, new DateTime(2026, 9, 30, 9, 12, 40), null),
            new TodoItem("b", "은행 방문", TodoStatus.Done, new DateTime(2026, 9, 29, 8, 0, 0), new DateTime(2026, 9, 30, 14, 5, 0)),
        };

        Store().Save(items);
        var loaded = Store().Load().Items;

        Assert.Equal(2, loaded.Count);
        Assert.Equal("a", loaded[0].Id);
        Assert.Equal("보고서 초안 쓰기", loaded[0].Title);
        Assert.Equal(TodoStatus.Doing, loaded[0].Status);
        Assert.Equal(new DateTime(2026, 9, 30, 9, 12, 40), loaded[0].CreatedAt);
        Assert.Null(loaded[0].CompletedAt);
        Assert.Equal(TodoStatus.Done, loaded[1].Status);
        Assert.Equal(new DateTime(2026, 9, 30, 14, 5, 0), loaded[1].CompletedAt);
    }

    [Fact]
    public void Save_writes_readable_korean_and_the_storage_time_format()
    {
        Store().Save([new TodoItem("a", "보고서", TodoStatus.Done, new DateTime(2026, 9, 30, 9, 0, 0), new DateTime(2026, 9, 30, 14, 5, 0))]);

        var json = File.ReadAllText(_dir.PathOf("tasks.json"));

        Assert.Contains("\"보고서\"", json);
        Assert.Contains("\"status\": \"done\"", json);
        Assert.Contains("\"completedAt\": \"2026-09-30 14:05:00\"", json);
        Assert.DoesNotContain("T14:05", json);
    }

    [Fact]
    public void Save_creates_the_folder_and_leaves_no_temp_file()
    {
        var path = Path.Combine(_dir.Root, "nested", "tasks.json");

        new TaskStore(path, _clock).Save([]);

        Assert.True(File.Exists(path));
        Assert.False(File.Exists(path + ".tmp"));
    }

    [Fact]
    public void Save_overwrites_the_previous_content()
    {
        Store().Save([new TodoItem("a", "옛것", TodoStatus.Todo, _clock.Now, null)]);
        Store().Save([new TodoItem("b", "새것", TodoStatus.Todo, _clock.Now, null)]);

        Assert.Equal("새것", Assert.Single(Store().Load().Items).Title);
    }

    [Theory]
    [InlineData("{not json")]
    [InlineData("")]
    [InlineData("null")]
    [InlineData("{\"id\":\"a\"}")]
    [InlineData("[{\"id\":\"a\",\"title\":\"x\",\"status\":\"later\",\"createdAt\":\"2026-09-30 09:00:00\",\"completedAt\":null}]")]
    [InlineData("[{\"id\":\"a\",\"title\":\"x\",\"status\":\"todo\",\"createdAt\":\"2026-09-30T09:00:00\",\"completedAt\":null}]")]
    [InlineData("[{\"id\":\"a\",\"title\":\"\",\"status\":\"todo\",\"createdAt\":\"2026-09-30 09:00:00\",\"completedAt\":null}]")]
    [InlineData("[{\"title\":\"x\",\"status\":\"todo\",\"createdAt\":\"2026-09-30 09:00:00\",\"completedAt\":null}]")]
    public void Load_backs_up_a_broken_file_and_starts_empty(string content)
    {
        var path = _dir.PathOf("tasks.json");
        File.WriteAllText(path, content);

        var result = Store().Load();

        Assert.Empty(result.Items);
        Assert.Equal(_dir.PathOf("tasks.broken-20260930-090000.json"), result.BackupPath);
        Assert.Equal(content, File.ReadAllText(result.BackupPath!));
        Assert.False(File.Exists(path));
    }

    [Fact]
    public void A_second_backup_in_the_same_second_does_not_overwrite_the_first()
    {
        var path = _dir.PathOf("tasks.json");
        File.WriteAllText(path, "{broken 1");
        var first = Store().Load().BackupPath;
        File.WriteAllText(path, "{broken 2");

        var second = Store().Load().BackupPath;

        Assert.Equal(_dir.PathOf("tasks.broken-20260930-090000-2.json"), second);
        Assert.Equal("{broken 1", File.ReadAllText(first!));
        Assert.Equal("{broken 2", File.ReadAllText(second!));
    }

    [Fact]
    public void Load_accepts_done_without_completed_time()
    {
        File.WriteAllText(_dir.PathOf("tasks.json"),
            "[{\"id\":\"a\",\"title\":\"x\",\"status\":\"done\",\"createdAt\":\"2026-09-30 09:00:00\",\"completedAt\":null}]");

        var result = Store().Load();

        Assert.Null(result.BackupPath);
        Assert.Equal(TodoStatus.Done, Assert.Single(result.Items).Status);
    }

    [Fact]
    public void Load_ignores_completed_time_on_items_that_are_not_done()
    {
        File.WriteAllText(_dir.PathOf("tasks.json"),
            "[{\"id\":\"a\",\"title\":\"x\",\"status\":\"todo\",\"createdAt\":\"2026-09-30 09:00:00\",\"completedAt\":\"2026-09-30 10:00:00\"}]");

        Assert.Null(Assert.Single(Store().Load().Items).CompletedAt);
    }

    [Fact]
    public void Load_throws_when_the_file_is_locked()
    {
        var path = _dir.PathOf("tasks.json");
        File.WriteAllText(path, "[]");
        using var lockHandle = new FileStream(path, FileMode.Open, FileAccess.ReadWrite, FileShare.None);

        Assert.ThrowsAny<IOException>(() => Store().Load());
        lockHandle.Dispose();
        Assert.Equal("[]", File.ReadAllText(path));
    }
}
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `dotnet test`
Expected: 빌드 실패. `error CS0246: The type or namespace name 'TaskStore' could not be found`.

- [ ] **Step 3: 구현**

`src/TodoWidget.Core/AtomicFile.cs`:

```csharp
using System.Text;

namespace TodoWidget.Core;

/// <summary>임시 파일에 먼저 쓰고 원본과 교체한다. 저장 중 전원이 꺼져도 원본이 깨지지 않는다.</summary>
internal static class AtomicFile
{
    public static void WriteAllText(string path, string content)
    {
        var fullPath = Path.GetFullPath(path);
        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);

        var temp = fullPath + ".tmp";
        File.WriteAllText(temp, content, new UTF8Encoding(encoderShouldEmitUTF8Identifier: false));
        File.Move(temp, fullPath, overwrite: true);
    }
}
```

`src/TodoWidget.Core/TaskStore.cs`:

```csharp
using System.Globalization;
using System.Text.Encodings.Web;
using System.Text.Json;

namespace TodoWidget.Core;

public sealed record TaskLoadResult(IReadOnlyList<TodoItem> Items, string? BackupPath);

/// <summary>tasks.json 읽기/쓰기. 깨진 파일은 백업하고 빈 목록으로 시작한다.</summary>
public sealed class TaskStore
{
    private static readonly JsonSerializerOptions Options = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        // 한글을 \uXXXX로 바꾸지 않아 메모장으로 읽을 수 있다.
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    private readonly IClock _clock;

    public TaskStore(string filePath, IClock clock)
    {
        FilePath = filePath;
        _clock = clock;
    }

    public string FilePath { get; }

    public TaskLoadResult Load()
    {
        if (!File.Exists(FilePath))
            return new TaskLoadResult([], null);

        // 잠겨 있어 읽지 못하면 IOException을 그대로 던진다. 빈 목록으로 시작해 원본을 덮어쓰지 않기 위해서다.
        var json = File.ReadAllText(FilePath);
        try
        {
            var dtos = JsonSerializer.Deserialize<List<TodoItemDto>>(json, Options)
                ?? throw new FormatException("tasks.json의 최상위 값이 비어 있습니다.");
            return new TaskLoadResult(dtos.Select(ToItem).ToList(), null);
        }
        catch (Exception e) when (e is JsonException or FormatException)
        {
            return new TaskLoadResult([], BackUpBrokenFile());
        }
    }

    public void Save(IEnumerable<TodoItem> items)
    {
        var dtos = items.Select(ToDto).ToList();
        AtomicFile.WriteAllText(FilePath, JsonSerializer.Serialize(dtos, Options));
    }

    private string BackUpBrokenFile()
    {
        var folder = Path.GetDirectoryName(Path.GetFullPath(FilePath))!;
        var stamp = _clock.Now.ToString("yyyyMMdd-HHmmss", CultureInfo.InvariantCulture);
        var backup = Path.Combine(folder, $"tasks.broken-{stamp}.json");
        for (var n = 2; File.Exists(backup); n++)
            backup = Path.Combine(folder, $"tasks.broken-{stamp}-{n}.json");

        File.Move(FilePath, backup);
        return backup;
    }

    private static TodoItem ToItem(TodoItemDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Id) || string.IsNullOrWhiteSpace(dto.Title))
            throw new FormatException("id 또는 title이 없습니다.");

        var status = dto.Status switch
        {
            "todo" => TodoStatus.Todo,
            "doing" => TodoStatus.Doing,
            "done" => TodoStatus.Done,
            _ => throw new FormatException($"알 수 없는 상태값: {dto.Status}"),
        };

        if (!KstFormat.TryParse(dto.CreatedAt, out var createdAt))
            throw new FormatException($"createdAt 형식 오류: {dto.CreatedAt}");

        DateTime? completedAt = null;
        if (dto.CompletedAt is not null)
        {
            if (!KstFormat.TryParse(dto.CompletedAt, out var parsed))
                throw new FormatException($"completedAt 형식 오류: {dto.CompletedAt}");
            completedAt = parsed;
        }

        return new TodoItem(dto.Id, dto.Title, status, createdAt, status == TodoStatus.Done ? completedAt : null);
    }

    private static TodoItemDto ToDto(TodoItem item) => new()
    {
        Id = item.Id,
        Title = item.Title,
        Status = item.Status switch
        {
            TodoStatus.Todo => "todo",
            TodoStatus.Doing => "doing",
            _ => "done",
        },
        CreatedAt = KstFormat.Format(item.CreatedAt),
        CompletedAt = item.CompletedAt is { } done ? KstFormat.Format(done) : null,
    };

    private sealed class TodoItemDto
    {
        public string? Id { get; set; }

        public string? Title { get; set; }

        public string? Status { get; set; }

        public string? CreatedAt { get; set; }

        public string? CompletedAt { get; set; }
    }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `dotnet test`
Expected: 모든 테스트 통과.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add tasks.json store with atomic save and broken-file backup"
```

---

### Task 5: 설정 저장소 (`settings.json`)

**Files:**
- Create: `src/TodoWidget.Core/WidgetSettings.cs`, `src/TodoWidget.Core/SettingsStore.cs`
- Create: `tests/TodoWidget.Core.Tests/SettingsStoreTests.cs`

**Interfaces:**
- Consumes: `AtomicFile` (Task 4), 테스트의 `TempDir` (Task 4)
- Produces:
  - `public sealed class WidgetSettings` — `double? Left`, `double? Top`, `bool Pinned` (기본 true), `bool DoneExpanded` (기본 false), 모두 get/set
  - `public sealed class SettingsStore` — 생성자 `SettingsStore(string filePath)`; `bool Exists`; `WidgetSettings Load()` (없거나 깨지거나 읽을 수 없으면 기본값); `void Save(WidgetSettings settings)` (무한대·NaN 좌표는 null로 저장; 실패 시 `IOException`/`UnauthorizedAccessException`)

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/TodoWidget.Core.Tests/SettingsStoreTests.cs`:

```csharp
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
    public void Save_writes_non_finite_positions_as_null()
    {
        Store().Save(new WidgetSettings { Left = double.NaN, Top = double.PositiveInfinity });

        var loaded = Store().Load();

        Assert.Null(loaded.Left);
        Assert.Null(loaded.Top);
    }
}
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `dotnet test`
Expected: 빌드 실패. `error CS0246: The type or namespace name 'SettingsStore' could not be found`.

- [ ] **Step 3: 구현**

`src/TodoWidget.Core/WidgetSettings.cs`:

```csharp
namespace TodoWidget.Core;

/// <summary>창 위치, 맨 위 고정, 끝낸 것 펼침. 자동 실행 여부는 레지스트리가 기준이라 여기 없다.</summary>
public sealed class WidgetSettings
{
    public double? Left { get; set; }

    public double? Top { get; set; }

    public bool Pinned { get; set; } = true;

    public bool DoneExpanded { get; set; }
}
```

`src/TodoWidget.Core/SettingsStore.cs`:

```csharp
using System.Text.Json;

namespace TodoWidget.Core;

/// <summary>settings.json 읽기/쓰기. 문제가 있으면 조용히 기본값을 쓴다.</summary>
public sealed class SettingsStore
{
    private static readonly JsonSerializerOptions Options = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private readonly string _filePath;

    public SettingsStore(string filePath) => _filePath = filePath;

    public bool Exists => File.Exists(_filePath);

    public WidgetSettings Load()
    {
        if (!Exists)
            return new WidgetSettings();

        try
        {
            return JsonSerializer.Deserialize<WidgetSettings>(File.ReadAllText(_filePath), Options) ?? new WidgetSettings();
        }
        catch (Exception e) when (e is JsonException or IOException or UnauthorizedAccessException)
        {
            return new WidgetSettings();
        }
    }

    public void Save(WidgetSettings settings)
    {
        var copy = new WidgetSettings
        {
            Left = Finite(settings.Left),
            Top = Finite(settings.Top),
            Pinned = settings.Pinned,
            DoneExpanded = settings.DoneExpanded,
        };
        AtomicFile.WriteAllText(_filePath, JsonSerializer.Serialize(copy, Options));
    }

    // WPF 창 좌표는 표시 전 NaN일 수 있고, JSON은 NaN을 저장하지 못한다.
    private static double? Finite(double? value) => value is { } v && double.IsFinite(v) ? v : null;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `dotnet test`
Expected: 모든 테스트 통과.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add settings store with safe defaults"
```

---

### Task 6: 즉시 저장 세션과 안내 문구

**Files:**
- Create: `src/TodoWidget.Core/TodoSession.cs`
- Create: `tests/TodoWidget.Core.Tests/TodoSessionTests.cs`

**Interfaces:**
- Consumes: `TodoList`, `TodoStatus` (Task 3); `TaskStore`, `TaskLoadResult` (Task 4); `IClock` (Task 2)
- Produces:
  - `public sealed class TodoSession` —
    - `public const string BackupNotice = "저장 파일에 문제가 있어 백업해 두었어요";`
    - `public const string SaveFailedNotice = "저장하지 못했어요. 다음 변경 때 다시 시도해요";`
    - `static TodoSession Open(TaskStore store, IClock clock)` (`Load`의 `IOException`은 그대로 전달)
    - `TodoList List`, `string? Notice`, `event EventHandler? Changed`
    - `bool Add(string title)`, `bool Cycle(string id)`, `bool SetStatus(string id, TodoStatus status)`, `bool Rename(string id, string title)`, `bool Delete(string id)` — 목록이 바뀌었으면 저장하고 `Changed`를 발생시킨 뒤 true

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/TodoWidget.Core.Tests/TodoSessionTests.cs`:

```csharp
using TodoWidget.Core;
using Xunit;

namespace TodoWidget.Core.Tests;

public sealed class TodoSessionTests : IDisposable
{
    private readonly TempDir _dir = new();
    private readonly FakeClock _clock = new();

    public void Dispose() => _dir.Dispose();

    private string TasksPath => _dir.PathOf("tasks.json");

    private TodoSession Open(string? path = null) => TodoSession.Open(new TaskStore(path ?? TasksPath, _clock), _clock);

    [Fact]
    public void Every_change_is_saved_immediately()
    {
        var session = Open();

        session.Add("보고서 초안 쓰기");
        var id = session.List.Items[0].Id;
        session.Cycle(id);

        var reloaded = new TaskStore(TasksPath, _clock).Load().Items;
        Assert.Equal(TodoStatus.Doing, Assert.Single(reloaded).Status);
    }

    [Fact]
    public void Rename_set_status_and_delete_are_saved()
    {
        var session = Open();
        session.Add("초안");
        var id = session.List.Items[0].Id;

        session.Rename(id, "보고서 초안");
        session.SetStatus(id, TodoStatus.Done);
        Assert.Equal("보고서 초안", new TaskStore(TasksPath, _clock).Load().Items[0].Title);

        session.Delete(id);
        Assert.Empty(new TaskStore(TasksPath, _clock).Load().Items);
    }

    [Fact]
    public void Changed_is_raised_only_when_something_changed()
    {
        var session = Open();
        var raised = 0;
        session.Changed += (_, _) => raised++;

        Assert.False(session.Add("   "));
        Assert.False(session.Cycle("nope"));
        Assert.Equal(0, raised);
        Assert.False(File.Exists(TasksPath));

        Assert.True(session.Add("메일 답장"));
        Assert.Equal(1, raised);
    }

    [Fact]
    public void Notice_is_empty_normally()
    {
        Assert.Null(Open().Notice);
    }

    [Fact]
    public void Opening_a_broken_file_shows_the_backup_notice()
    {
        File.WriteAllText(TasksPath, "{broken");

        var session = Open();

        Assert.Equal(TodoSession.BackupNotice, session.Notice);
        Assert.Empty(session.List.Items);
    }

    [Fact]
    public void Save_failure_keeps_the_change_in_memory_and_shows_a_notice()
    {
        // 폴더가 있어야 할 자리에 파일을 두어 저장을 실패시킨다.
        var blocker = _dir.PathOf("blocker");
        File.WriteAllText(blocker, "");
        var session = Open(Path.Combine(blocker, "tasks.json"));

        Assert.True(session.Add("은행 방문"));

        Assert.Single(session.List.Items);
        Assert.Equal(TodoSession.SaveFailedNotice, session.Notice);
    }

    [Fact]
    public void The_next_successful_save_clears_the_failure_notice()
    {
        var blocker = _dir.PathOf("blocker");
        File.WriteAllText(blocker, "");
        var path = Path.Combine(blocker, "tasks.json");
        var session = Open(path);
        session.Add("은행 방문");

        File.Delete(blocker);
        session.Add("택배 반품 접수");

        Assert.Null(session.Notice);
        Assert.Equal(2, new TaskStore(path, _clock).Load().Items.Count);
    }

    [Fact]
    public void Open_passes_through_a_locked_file_error()
    {
        File.WriteAllText(TasksPath, "[]");
        using var lockHandle = new FileStream(TasksPath, FileMode.Open, FileAccess.ReadWrite, FileShare.None);

        Assert.ThrowsAny<IOException>(() => Open());
    }
}
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `dotnet test`
Expected: 빌드 실패. `error CS0246: The type or namespace name 'TodoSession' could not be found`.

- [ ] **Step 3: 구현**

`src/TodoWidget.Core/TodoSession.cs`:

```csharp
namespace TodoWidget.Core;

/// <summary>할 일 목록을 바꿀 때마다 바로 저장하고, 화면에 띄울 안내 문구를 관리한다.</summary>
public sealed class TodoSession
{
    public const string BackupNotice = "저장 파일에 문제가 있어 백업해 두었어요";
    public const string SaveFailedNotice = "저장하지 못했어요. 다음 변경 때 다시 시도해요";

    private readonly TaskStore _store;
    private readonly bool _hadBackup;
    private bool _saveFailed;

    private TodoSession(TodoList list, TaskStore store, bool hadBackup)
    {
        List = list;
        _store = store;
        _hadBackup = hadBackup;
    }

    public event EventHandler? Changed;

    public TodoList List { get; }

    public string? Notice => _saveFailed ? SaveFailedNotice : _hadBackup ? BackupNotice : null;

    public static TodoSession Open(TaskStore store, IClock clock)
    {
        var result = store.Load();
        return new TodoSession(new TodoList(clock, result.Items), store, result.BackupPath is not null);
    }

    public bool Add(string title) => Commit(List.Add(title) is not null);

    public bool Cycle(string id) => Commit(List.Cycle(id));

    public bool SetStatus(string id, TodoStatus status) => Commit(List.SetStatus(id, status));

    public bool Rename(string id, string title) => Commit(List.Rename(id, title));

    public bool Delete(string id) => Commit(List.Delete(id));

    private bool Commit(bool changed)
    {
        if (!changed)
            return false;

        try
        {
            _store.Save(List.Items);
            _saveFailed = false;
        }
        catch (Exception e) when (e is IOException or UnauthorizedAccessException)
        {
            // 변경은 메모리에 남기고, 다음 변경 때 전체를 다시 저장한다.
            _saveFailed = true;
        }

        Changed?.Invoke(this, EventArgs.Empty);
        return true;
    }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `dotnet test`
Expected: 모든 테스트 통과.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add todo session with immediate save and notices"
```

---

### Task 7: 창 위치 계산

**Files:**
- Create: `src/TodoWidget.Core/WindowPlacement.cs`
- Create: `tests/TodoWidget.Core.Tests/WindowPlacementTests.cs`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `public readonly record struct ScreenRect(double Left, double Top, double Width, double Height)` — `double Right`, `double Bottom`
  - `public static class WindowPlacement` — `const double Margin = 24`; `(double Left, double Top) Resolve(double? savedLeft, double? savedTop, double windowWidth, ScreenRect virtualScreen, ScreenRect workArea)`. 저장된 위치의 윗부분(끌 수 있는 헤더)이 전체 화면 영역 안에 40px 이상 보이면 그대로, 아니면 작업 영역 오른쪽 위(여백 24).

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/TodoWidget.Core.Tests/WindowPlacementTests.cs`:

```csharp
using TodoWidget.Core;
using Xunit;

namespace TodoWidget.Core.Tests;

public class WindowPlacementTests
{
    private static readonly ScreenRect SingleScreen = new(0, 0, 1920, 1080);
    private static readonly ScreenRect WorkArea = new(0, 0, 1920, 1040);
    private const double Width = 320;

    [Fact]
    public void No_saved_position_uses_the_top_right_of_the_work_area()
    {
        Assert.Equal((1576d, 24d), WindowPlacement.Resolve(null, null, Width, SingleScreen, WorkArea));
    }

    [Fact]
    public void A_visible_saved_position_is_kept()
    {
        Assert.Equal((300d, 200d), WindowPlacement.Resolve(300, 200, Width, SingleScreen, WorkArea));
    }

    [Fact]
    public void Only_one_coordinate_saved_uses_the_default()
    {
        Assert.Equal((1576d, 24d), WindowPlacement.Resolve(300, null, Width, SingleScreen, WorkArea));
    }

    [Theory]
    [InlineData(2500, 100)]   // 오른쪽 모니터를 뺀 경우
    [InlineData(-2000, 100)]  // 왼쪽 모니터를 뺀 경우
    [InlineData(300, -500)]   // 위로 벗어남
    [InlineData(300, 1070)]   // 아래로 벗어나 헤더를 잡을 수 없음
    public void An_off_screen_position_falls_back_to_the_default(double left, double top)
    {
        Assert.Equal((1576d, 24d), WindowPlacement.Resolve(left, top, Width, SingleScreen, WorkArea));
    }

    [Fact]
    public void A_partly_visible_window_whose_header_can_be_grabbed_is_kept()
    {
        Assert.Equal((1800d, 100d), WindowPlacement.Resolve(1800, 100, Width, SingleScreen, WorkArea));
    }

    [Fact]
    public void A_position_on_a_left_monitor_is_kept_when_that_monitor_exists()
    {
        var twoScreens = new ScreenRect(-1920, 0, 3840, 1080);

        Assert.Equal((-1500d, 100d), WindowPlacement.Resolve(-1500, 100, Width, twoScreens, WorkArea));
    }
}
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `dotnet test`
Expected: 빌드 실패. `error CS0246: The type or namespace name 'ScreenRect' could not be found`.

- [ ] **Step 3: 구현**

`src/TodoWidget.Core/WindowPlacement.cs`:

```csharp
namespace TodoWidget.Core;

public readonly record struct ScreenRect(double Left, double Top, double Width, double Height)
{
    public double Right => Left + Width;

    public double Bottom => Top + Height;
}

/// <summary>저장된 창 위치가 화면 밖이면 기본 위치(작업 영역 오른쪽 위)로 되돌린다.</summary>
public static class WindowPlacement
{
    public const double Margin = 24;

    // 헤더를 잡아 끌 수 있으려면 이만큼은 화면에 보여야 한다.
    private const double MinVisible = 40;

    public static (double Left, double Top) Resolve(
        double? savedLeft, double? savedTop, double windowWidth, ScreenRect virtualScreen, ScreenRect workArea)
    {
        if (savedLeft is { } left && savedTop is { } top && HeaderIsReachable(left, top, windowWidth, virtualScreen))
            return (left, top);

        return (workArea.Right - windowWidth - Margin, workArea.Top + Margin);
    }

    private static bool HeaderIsReachable(double left, double top, double width, ScreenRect screen) =>
        left + width - MinVisible >= screen.Left
        && left + MinVisible <= screen.Right
        && top >= screen.Top
        && top + MinVisible <= screen.Bottom;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `dotnet test`
Expected: 모든 테스트 통과.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add window placement fallback for off-screen positions"
```

---

### Task 8: 자동 실행 등록

**Files:**
- Create: `src/TodoWidget.Core/AutoStart.cs`
- Create: `tests/TodoWidget.Core.Tests/AutoStartTests.cs`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `public sealed class AutoStart` — 생성자 `AutoStart(string keyPath = RunKeyPath, string valueName = DefaultValueName)`; 상수 `RunKeyPath = @"Software\Microsoft\Windows\CurrentVersion\Run"`, `DefaultValueName = "TodoWidget"`; `bool IsEnabled`; `string? RegisteredCommand`; `void Enable(string exePath)` (값 `"<exePath>"`); `void Disable()`; `void RefreshPath(string exePath)` (켜져 있을 때만 경로 갱신); `void OnLaunch(bool isFirstRun, string exePath)` (첫 실행이면 Enable, 아니면 RefreshPath)

- [ ] **Step 1: 실패하는 테스트 작성**

테스트는 실제 Run 키 대신 `HKCU\Software\TodoWidgetTests\<GUID>`를 쓰고 끝나면 지운다.

`tests/TodoWidget.Core.Tests/AutoStartTests.cs`:

```csharp
using Microsoft.Win32;
using TodoWidget.Core;
using Xunit;

namespace TodoWidget.Core.Tests;

public sealed class AutoStartTests : IDisposable
{
    private readonly string _keyPath = $@"Software\TodoWidgetTests\{Guid.NewGuid():N}";

    public void Dispose() => Registry.CurrentUser.DeleteSubKeyTree(_keyPath, throwOnMissingSubKey: false);

    private AutoStart Create() => new(_keyPath);

    [Fact]
    public void Disabled_when_nothing_is_registered()
    {
        Assert.False(Create().IsEnabled);
        Assert.Null(Create().RegisteredCommand);
    }

    [Fact]
    public void Enable_registers_the_quoted_exe_path()
    {
        var autoStart = Create();

        autoStart.Enable(@"C:\dev\todo\dist\TodoWidget.exe");

        Assert.True(autoStart.IsEnabled);
        Assert.Equal("\"C:\\dev\\todo\\dist\\TodoWidget.exe\"", autoStart.RegisteredCommand);
    }

    [Fact]
    public void Disable_removes_the_value_and_is_safe_to_repeat()
    {
        var autoStart = Create();
        autoStart.Enable(@"C:\a\TodoWidget.exe");

        autoStart.Disable();
        autoStart.Disable();

        Assert.False(autoStart.IsEnabled);
    }

    [Fact]
    public void RefreshPath_updates_the_path_only_when_enabled()
    {
        var autoStart = Create();

        autoStart.RefreshPath(@"C:\new\TodoWidget.exe");
        Assert.False(autoStart.IsEnabled);

        autoStart.Enable(@"C:\old\TodoWidget.exe");
        autoStart.RefreshPath(@"C:\new\TodoWidget.exe");
        Assert.Equal("\"C:\\new\\TodoWidget.exe\"", autoStart.RegisteredCommand);
    }

    [Fact]
    public void First_launch_enables_auto_start()
    {
        var autoStart = Create();

        autoStart.OnLaunch(isFirstRun: true, @"C:\a\TodoWidget.exe");

        Assert.True(autoStart.IsEnabled);
    }

    [Fact]
    public void Later_launches_respect_the_user_turning_it_off()
    {
        var autoStart = Create();

        autoStart.OnLaunch(isFirstRun: false, @"C:\a\TodoWidget.exe");

        Assert.False(autoStart.IsEnabled);
    }
}
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `dotnet test`
Expected: 빌드 실패. `error CS0246: The type or namespace name 'AutoStart' could not be found`.

- [ ] **Step 3: 구현**

`src/TodoWidget.Core/AutoStart.cs`:

```csharp
using Microsoft.Win32;

namespace TodoWidget.Core;

/// <summary>Windows 시작 시 자동 실행. HKCU Run 키라 관리자 권한이 필요 없다.</summary>
public sealed class AutoStart
{
    public const string RunKeyPath = @"Software\Microsoft\Windows\CurrentVersion\Run";
    public const string DefaultValueName = "TodoWidget";

    private readonly string _keyPath;
    private readonly string _valueName;

    public AutoStart(string keyPath = RunKeyPath, string valueName = DefaultValueName)
    {
        _keyPath = keyPath;
        _valueName = valueName;
    }

    public bool IsEnabled => RegisteredCommand is not null;

    public string? RegisteredCommand
    {
        get
        {
            using var key = Registry.CurrentUser.OpenSubKey(_keyPath);
            return key?.GetValue(_valueName) as string;
        }
    }

    public void Enable(string exePath)
    {
        using var key = Registry.CurrentUser.CreateSubKey(_keyPath);
        key.SetValue(_valueName, $"\"{exePath}\"");
    }

    public void Disable()
    {
        using var key = Registry.CurrentUser.OpenSubKey(_keyPath, writable: true);
        key?.DeleteValue(_valueName, throwOnMissingValue: false);
    }

    /// <summary>exe를 옮겨도 자동 실행이 깨지지 않게, 켜져 있을 때만 경로를 갱신한다.</summary>
    public void RefreshPath(string exePath)
    {
        if (IsEnabled)
            Enable(exePath);
    }

    /// <summary>처음 실행이면 켜고, 이후에는 사용자가 끈 상태를 존중한다.</summary>
    public void OnLaunch(bool isFirstRun, string exePath)
    {
        if (isFirstRun)
            Enable(exePath);
        else
            RefreshPath(exePath);
    }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `dotnet test`
Expected: 모든 테스트 통과.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add registry-based auto start"
```

---

### Task 9: 위젯 화면과 조작

**Files:**
- Create: `src/TodoWidget.App/AppPaths.cs`, `src/TodoWidget.App/Theme.xaml`, `src/TodoWidget.App/Converters.cs`, `src/TodoWidget.App/TodoItemView.cs`, `src/TodoWidget.App/MainViewModel.cs`
- Modify (전체 교체): `src/TodoWidget.App/App.xaml`, `src/TodoWidget.App/App.xaml.cs`, `src/TodoWidget.App/MainWindow.xaml`, `src/TodoWidget.App/MainWindow.xaml.cs`

**Interfaces:**
- Consumes: `TodoSession`, `TodoStatus`, `TodoItem` (Task 3, 6); `SettingsStore`, `WidgetSettings` (Task 5); `WindowPlacement`, `ScreenRect` (Task 7); `AutoStart` (Task 8); `KstClock` (Task 2); `TaskStore` (Task 4)
- Produces:
  - `internal static class AppPaths` — `string DataDir`, `string TasksFile`, `string SettingsFile` (환경 변수 `TODOWIDGET_DATA_DIR`가 있으면 그 폴더)
  - `public partial class MainWindow` — 생성자 `MainWindow(TodoSession session, SettingsStore settingsStore, WidgetSettings settings, AutoStart autoStart)`; `public void BringToFront()`

이 작업은 화면 코드라 자동 테스트가 없다. 검증은 빌드, 실행 스모크 테스트, PM 확인으로 한다.

- [ ] **Step 1: 데이터 경로**

`src/TodoWidget.App/AppPaths.cs`:

```csharp
using System.IO;

namespace TodoWidget.App;

/// <summary>데이터 폴더. 개발 중에는 TODOWIDGET_DATA_DIR로 실제 데이터와 분리한다.</summary>
internal static class AppPaths
{
    public static string DataDir { get; } =
        Environment.GetEnvironmentVariable("TODOWIDGET_DATA_DIR") is { Length: > 0 } custom
            ? custom
            : Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "TodoWidget");

    public static string TasksFile => Path.Combine(DataDir, "tasks.json");

    public static string SettingsFile => Path.Combine(DataDir, "settings.json");
}
```

- [ ] **Step 2: 변환기와 화면용 모델**

`src/TodoWidget.App/Converters.cs`:

```csharp
using System.Globalization;
using System.Windows;
using System.Windows.Data;

namespace TodoWidget.App;

/// <summary>true → Visible, false → Collapsed. Invert면 반대.</summary>
public sealed class BoolToVisibilityConverter : IValueConverter
{
    public bool Invert { get; set; }

    public object Convert(object? value, Type targetType, object? parameter, CultureInfo culture) =>
        (value is true) != Invert ? Visibility.Visible : Visibility.Collapsed;

    public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture) =>
        throw new NotSupportedException();
}
```

`src/TodoWidget.App/TodoItemView.cs`:

```csharp
using System.ComponentModel;
using System.Runtime.CompilerServices;
using TodoWidget.Core;

namespace TodoWidget.App;

/// <summary>화면에 그리는 할 일 한 줄. 목록이 바뀔 때마다 새로 만든다.</summary>
public sealed class TodoItemView : INotifyPropertyChanged
{
    private bool _isEditing;

    public TodoItemView(TodoItem item)
    {
        Id = item.Id;
        Title = item.Title;
        Status = item.Status;
    }

    public event PropertyChangedEventHandler? PropertyChanged;

    public string Id { get; }

    public string Title { get; }

    public TodoStatus Status { get; }

    public bool IsTodo => Status == TodoStatus.Todo;

    public bool IsDoing => Status == TodoStatus.Doing;

    public bool IsDone => Status == TodoStatus.Done;

    public bool IsEditing
    {
        get => _isEditing;
        set
        {
            if (_isEditing == value)
                return;
            _isEditing = value;
            OnPropertyChanged();
        }
    }

    private void OnPropertyChanged([CallerMemberName] string? name = null) =>
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));
}
```

`src/TodoWidget.App/MainViewModel.cs`:

```csharp
using System.ComponentModel;
using System.Runtime.CompilerServices;
using TodoWidget.Core;

namespace TodoWidget.App;

/// <summary>위젯 화면 상태. 세션이 바뀌면 목록을 새로 만들고 모든 바인딩을 갱신한다.</summary>
public sealed class MainViewModel : INotifyPropertyChanged
{
    private readonly TodoSession _session;
    private bool _doneExpanded;

    public MainViewModel(TodoSession session, bool doneExpanded)
    {
        _session = session;
        _doneExpanded = doneExpanded;
        _session.Changed += (_, _) => Refresh();
        Refresh();
    }

    public event PropertyChangedEventHandler? PropertyChanged;

    public IReadOnlyList<TodoItemView> Doing { get; private set; } = [];

    public IReadOnlyList<TodoItemView> Todo { get; private set; } = [];

    public IReadOnlyList<TodoItemView> Done { get; private set; } = [];

    public bool HasDoing => Doing.Count > 0;

    public bool HasTodo => Todo.Count > 0;

    public bool HasDone => Done.Count > 0;

    public bool IsEmpty => _session.List.Items.Count == 0;

    public string RemainingText =>
        _session.List.RemainingCount == 0 ? "모두 끝냈어요" : $"{_session.List.RemainingCount}개 남음";

    public string DoneHeader => $"끝낸 것 {Done.Count}";

    public string DoneToggleText => DoneExpanded ? "접기" : "펼치기";

    public string? Notice => _session.Notice;

    public bool HasNotice => Notice is not null;

    public bool DoneExpanded
    {
        get => _doneExpanded;
        set
        {
            if (_doneExpanded == value)
                return;
            _doneExpanded = value;
            OnPropertyChanged();
            OnPropertyChanged(nameof(DoneToggleText));
        }
    }

    public bool Add(string title) => _session.Add(title);

    public bool Cycle(string id) => _session.Cycle(id);

    public bool SetStatus(string id, TodoStatus status) => _session.SetStatus(id, status);

    public bool Rename(string id, string title) => _session.Rename(id, title);

    public bool Delete(string id) => _session.Delete(id);

    private void Refresh()
    {
        Doing = Views(TodoStatus.Doing);
        Todo = Views(TodoStatus.Todo);
        Done = Views(TodoStatus.Done);
        OnPropertyChanged(string.Empty);
    }

    private List<TodoItemView> Views(TodoStatus status) =>
        _session.List.InStatus(status).Select(i => new TodoItemView(i)).ToList();

    private void OnPropertyChanged([CallerMemberName] string? name = null) =>
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));
}
```

- [ ] **Step 3: 테마**

`src/TodoWidget.App/Theme.xaml`:

```xml
<ResourceDictionary xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
                    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
                    xmlns:local="clr-namespace:TodoWidget.App">

    <SolidColorBrush x:Key="CardBrush" Color="#FFFFFF" />
    <SolidColorBrush x:Key="InkBrush" Color="#2B2A28" />
    <SolidColorBrush x:Key="MutedBrush" Color="#8C8983" />
    <SolidColorBrush x:Key="LineBrush" Color="#EBE8E3" />
    <SolidColorBrush x:Key="TodoBrush" Color="#B9B5AD" />
    <SolidColorBrush x:Key="DoingBrush" Color="#E8935A" />
    <SolidColorBrush x:Key="DoingBgBrush" Color="#FDF1E8" />
    <SolidColorBrush x:Key="DoneBrush" Color="#7FAE8A" />
    <SolidColorBrush x:Key="FoldBgBrush" Color="#F6F5F2" />
    <SolidColorBrush x:Key="HintBrush" Color="#B3AFA8" />
    <SolidColorBrush x:Key="HoverBrush" Color="#F4F2EE" />

    <FontFamily x:Key="UiFont">Malgun Gothic</FontFamily>
    <FontFamily x:Key="IconFont">Segoe Fluent Icons, Segoe MDL2 Assets</FontFamily>

    <local:BoolToVisibilityConverter x:Key="BoolToVis" />
    <local:BoolToVisibilityConverter x:Key="InverseBoolToVis" Invert="True" />

    <!-- 헤더의 📌, ⋯ 버튼 -->
    <Style x:Key="IconButton" TargetType="Button">
        <Setter Property="Background" Value="Transparent" />
        <Setter Property="Foreground" Value="{StaticResource MutedBrush}" />
        <Setter Property="FontFamily" Value="{StaticResource IconFont}" />
        <Setter Property="FontSize" Value="14" />
        <Setter Property="Width" Value="28" />
        <Setter Property="Height" Value="28" />
        <Setter Property="Cursor" Value="Hand" />
        <Setter Property="Focusable" Value="False" />
        <Setter Property="Template">
            <Setter.Value>
                <ControlTemplate TargetType="Button">
                    <Border x:Name="Bg" Background="{TemplateBinding Background}" CornerRadius="8">
                        <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center" />
                    </Border>
                    <ControlTemplate.Triggers>
                        <Trigger Property="IsMouseOver" Value="True">
                            <Setter TargetName="Bg" Property="Background" Value="{StaticResource HoverBrush}" />
                        </Trigger>
                    </ControlTemplate.Triggers>
                </ControlTemplate>
            </Setter.Value>
        </Setter>
    </Style>

    <!-- 할 일 앞 동그라미: 시작 전 빈 원, 하는 중 주황 점, 끝낸 것 초록 원 -->
    <Style x:Key="StatusMark" TargetType="Button">
        <Setter Property="Cursor" Value="Hand" />
        <Setter Property="Focusable" Value="False" />
        <Setter Property="Template">
            <Setter.Value>
                <ControlTemplate TargetType="Button">
                    <Grid Width="18" Height="18" Background="Transparent">
                        <Ellipse x:Name="Ring" Width="16" Height="16" Stroke="{StaticResource TodoBrush}" StrokeThickness="2" />
                        <Ellipse x:Name="Dot" Width="7" Height="7" Fill="{StaticResource DoingBrush}" Visibility="Collapsed" />
                    </Grid>
                    <ControlTemplate.Triggers>
                        <DataTrigger Binding="{Binding Status}" Value="Doing">
                            <Setter TargetName="Ring" Property="Stroke" Value="{StaticResource DoingBrush}" />
                            <Setter TargetName="Dot" Property="Visibility" Value="Visible" />
                        </DataTrigger>
                        <DataTrigger Binding="{Binding Status}" Value="Done">
                            <Setter TargetName="Ring" Property="Stroke" Value="{StaticResource DoneBrush}" />
                            <Setter TargetName="Ring" Property="Fill" Value="{StaticResource DoneBrush}" />
                        </DataTrigger>
                        <Trigger Property="IsMouseOver" Value="True">
                            <Setter TargetName="Ring" Property="Opacity" Value="0.7" />
                        </Trigger>
                    </ControlTemplate.Triggers>
                </ControlTemplate>
            </Setter.Value>
        </Setter>
    </Style>

    <!-- 테두리 없는 입력칸 -->
    <Style x:Key="PlainTextBox" TargetType="TextBox">
        <Setter Property="BorderThickness" Value="0" />
        <Setter Property="Background" Value="Transparent" />
        <Setter Property="Padding" Value="0" />
        <Setter Property="FontSize" Value="14.5" />
        <Setter Property="Foreground" Value="{StaticResource InkBrush}" />
        <Setter Property="CaretBrush" Value="{StaticResource InkBrush}" />
    </Style>

    <!-- 섹션 제목 (● 하는 중 1) -->
    <Style x:Key="SectionLabel" TargetType="TextBlock">
        <Setter Property="FontSize" Value="13" />
        <Setter Property="FontWeight" Value="SemiBold" />
        <Setter Property="Foreground" Value="{StaticResource MutedBrush}" />
        <Setter Property="Margin" Value="7,0,0,0" />
        <Setter Property="VerticalAlignment" Value="Center" />
    </Style>

</ResourceDictionary>
```

- [ ] **Step 4: App.xaml에서 StartupUri 제거, 테마 연결**

`src/TodoWidget.App/App.xaml` 전체 (StartupUri가 남아 있으면 인자 없는 MainWindow를 만들려다 실행 즉시 죽는다):

```xml
<Application x:Class="TodoWidget.App.App"
             xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
             xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">
    <Application.Resources>
        <ResourceDictionary Source="Theme.xaml" />
    </Application.Resources>
</Application>
```

`src/TodoWidget.App/App.xaml.cs` 전체 (Task 10에서 시작 흐름을 완성한다):

```csharp
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
```

- [ ] **Step 5: 위젯 화면 XAML**

`src/TodoWidget.App/MainWindow.xaml` 전체:

```xml
<Window x:Class="TodoWidget.App.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        xmlns:local="clr-namespace:TodoWidget.App"
        Title="할 일"
        Width="320"
        SizeToContent="Height"
        WindowStyle="None"
        AllowsTransparency="True"
        Background="Transparent"
        ShowInTaskbar="False"
        ResizeMode="NoResize"
        FontFamily="{StaticResource UiFont}"
        Foreground="{StaticResource InkBrush}"
        UseLayoutRounding="True">

    <Window.Resources>
        <DataTemplate x:Key="ItemTemplate" DataType="{x:Type local:TodoItemView}">
            <Border x:Name="Row" CornerRadius="10" Padding="10,8" Margin="0,1" Background="Transparent">
                <Border.ContextMenu>
                    <ContextMenu>
                        <MenuItem Header="시작 전" IsChecked="{Binding IsTodo, Mode=OneWay}" Click="MenuTodo_Click" />
                        <MenuItem Header="하는 중" IsChecked="{Binding IsDoing, Mode=OneWay}" Click="MenuDoing_Click" />
                        <MenuItem Header="끝낸 것" IsChecked="{Binding IsDone, Mode=OneWay}" Click="MenuDone_Click" />
                        <Separator />
                        <MenuItem Header="이름 바꾸기" Click="MenuRename_Click" />
                        <MenuItem Header="삭제" Click="MenuDelete_Click" />
                    </ContextMenu>
                </Border.ContextMenu>
                <Grid>
                    <Grid.ColumnDefinitions>
                        <ColumnDefinition Width="Auto" />
                        <ColumnDefinition />
                    </Grid.ColumnDefinitions>
                    <Button Style="{StaticResource StatusMark}" Click="StatusMark_Click"
                            VerticalAlignment="Top" Margin="0,1,10,0" ToolTip="상태 바꾸기" />
                    <TextBlock x:Name="TitleText" Grid.Column="1" Text="{Binding Title}" FontSize="14.5"
                               TextWrapping="Wrap" Background="Transparent"
                               Visibility="{Binding IsEditing, Converter={StaticResource InverseBoolToVis}}"
                               MouseLeftButtonDown="Title_MouseLeftButtonDown" />
                    <TextBox Grid.Column="1" Style="{StaticResource PlainTextBox}"
                             Text="{Binding Title, Mode=OneTime}" TextWrapping="Wrap"
                             Visibility="{Binding IsEditing, Converter={StaticResource BoolToVis}}"
                             IsVisibleChanged="EditBox_IsVisibleChanged"
                             PreviewKeyDown="EditBox_PreviewKeyDown"
                             LostKeyboardFocus="EditBox_LostKeyboardFocus" />
                </Grid>
            </Border>
            <DataTemplate.Triggers>
                <DataTrigger Binding="{Binding Status}" Value="Doing">
                    <Setter TargetName="Row" Property="Background" Value="{StaticResource DoingBgBrush}" />
                </DataTrigger>
                <DataTrigger Binding="{Binding Status}" Value="Done">
                    <Setter TargetName="TitleText" Property="Foreground" Value="{StaticResource MutedBrush}" />
                    <Setter TargetName="TitleText" Property="TextDecorations" Value="Strikethrough" />
                </DataTrigger>
            </DataTemplate.Triggers>
        </DataTemplate>
    </Window.Resources>

    <Border Margin="10" Background="{StaticResource CardBrush}" CornerRadius="18" Padding="18,16,18,12">
        <Border.Effect>
            <DropShadowEffect BlurRadius="20" ShadowDepth="3" Direction="270" Opacity="0.12" Color="#3C3228" />
        </Border.Effect>

        <DockPanel LastChildFill="True">

            <!-- 헤더: 끌어서 창 이동 -->
            <Grid DockPanel.Dock="Top" Background="Transparent" Margin="0,0,0,4"
                  MouseLeftButtonDown="Header_MouseLeftButtonDown">
                <Grid.ColumnDefinitions>
                    <ColumnDefinition />
                    <ColumnDefinition Width="Auto" />
                    <ColumnDefinition Width="Auto" />
                </Grid.ColumnDefinitions>
                <StackPanel>
                    <TextBlock Text="할 일" FontSize="16" FontWeight="Bold" />
                    <TextBlock Text="{Binding RemainingText}" FontSize="12.5" Foreground="{StaticResource MutedBrush}" Margin="0,2,0,0" />
                </StackPanel>
                <Button x:Name="PinButton" Grid.Column="1" Style="{StaticResource IconButton}"
                        VerticalAlignment="Top" Click="PinButton_Click" />
                <Button x:Name="MoreButton" Grid.Column="2" Style="{StaticResource IconButton}"
                        VerticalAlignment="Top" Content="&#xE712;" ToolTip="메뉴" Click="MoreButton_Click">
                    <Button.ContextMenu>
                        <ContextMenu>
                            <MenuItem x:Name="AutoStartMenuItem" Header="컴퓨터 켤 때 자동 실행"
                                      IsCheckable="True" Click="AutoStartMenuItem_Click" />
                            <Separator />
                            <MenuItem Header="종료" Click="ExitMenuItem_Click" />
                        </ContextMenu>
                    </Button.ContextMenu>
                </Button>
            </Grid>

            <!-- 하단: 안내 문구 + 할 일 추가 -->
            <StackPanel DockPanel.Dock="Bottom">
                <TextBlock Text="{Binding Notice}" Foreground="{StaticResource DoingBrush}" FontSize="12.5"
                           TextWrapping="Wrap" Margin="0,8,0,0"
                           Visibility="{Binding HasNotice, Converter={StaticResource BoolToVis}}" />
                <Border BorderBrush="{StaticResource LineBrush}" BorderThickness="0,1,0,0" Margin="0,12,0,0" Padding="0,10,0,0">
                    <Grid>
                        <TextBlock x:Name="AddHint" Text="+ 할 일 추가" FontSize="14" Foreground="{StaticResource HintBrush}"
                                   Background="Transparent" Cursor="Hand" MouseLeftButtonDown="AddHint_MouseLeftButtonDown" />
                        <TextBox x:Name="AddBox" Style="{StaticResource PlainTextBox}" Visibility="Collapsed"
                                 PreviewKeyDown="AddBox_PreviewKeyDown" LostKeyboardFocus="AddBox_LostKeyboardFocus" />
                    </Grid>
                </Border>
            </StackPanel>

            <!-- 목록: 넘치면 여기만 스크롤 -->
            <ScrollViewer VerticalScrollBarVisibility="Auto">
                <StackPanel>
                    <TextBlock Text="할 일을 추가해 보세요" FontSize="13.5" Foreground="{StaticResource MutedBrush}"
                               HorizontalAlignment="Center" Margin="0,14,0,6"
                               Visibility="{Binding IsEmpty, Converter={StaticResource BoolToVis}}" />

                    <StackPanel Margin="0,8,0,0" Visibility="{Binding HasDoing, Converter={StaticResource BoolToVis}}">
                        <StackPanel Orientation="Horizontal" Margin="0,0,0,6">
                            <Ellipse Width="8" Height="8" Fill="{StaticResource DoingBrush}" VerticalAlignment="Center" />
                            <TextBlock Text="하는 중" Style="{StaticResource SectionLabel}" />
                            <TextBlock Text="{Binding Doing.Count}" Style="{StaticResource SectionLabel}" FontWeight="Normal" Margin="5,0,0,0" />
                        </StackPanel>
                        <ItemsControl ItemsSource="{Binding Doing}" ItemTemplate="{StaticResource ItemTemplate}" />
                    </StackPanel>

                    <StackPanel Margin="0,12,0,0" Visibility="{Binding HasTodo, Converter={StaticResource BoolToVis}}">
                        <StackPanel Orientation="Horizontal" Margin="0,0,0,6">
                            <Ellipse Width="8" Height="8" Fill="{StaticResource TodoBrush}" VerticalAlignment="Center" />
                            <TextBlock Text="시작 전" Style="{StaticResource SectionLabel}" />
                            <TextBlock Text="{Binding Todo.Count}" Style="{StaticResource SectionLabel}" FontWeight="Normal" Margin="5,0,0,0" />
                        </StackPanel>
                        <ItemsControl ItemsSource="{Binding Todo}" ItemTemplate="{StaticResource ItemTemplate}" />
                    </StackPanel>

                    <StackPanel Margin="0,12,0,0" Visibility="{Binding HasDone, Converter={StaticResource BoolToVis}}">
                        <Border Background="{StaticResource FoldBgBrush}" CornerRadius="10" Padding="10,8" Cursor="Hand"
                                MouseLeftButtonDown="DoneFold_MouseLeftButtonDown">
                            <DockPanel>
                                <TextBlock DockPanel.Dock="Right" Text="{Binding DoneToggleText}" FontSize="13" Foreground="{StaticResource MutedBrush}" />
                                <TextBlock Text="{Binding DoneHeader}" FontSize="13" Foreground="{StaticResource MutedBrush}" />
                            </DockPanel>
                        </Border>
                        <ItemsControl ItemsSource="{Binding Done}" ItemTemplate="{StaticResource ItemTemplate}" Margin="0,4,0,0"
                                      Visibility="{Binding DoneExpanded, Converter={StaticResource BoolToVis}}" />
                    </StackPanel>
                </StackPanel>
            </ScrollViewer>
        </DockPanel>
    </Border>
</Window>
```

- [ ] **Step 6: 위젯 화면 코드**

`src/TodoWidget.App/MainWindow.xaml.cs` 전체:

```csharp
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
            FocusLater(box, selectAll: true);
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

    // ── 할 일 추가 ────────────────────────────────────

    private void AddHint_MouseLeftButtonDown(object sender, MouseButtonEventArgs e)
    {
        AddHint.Visibility = Visibility.Collapsed;
        AddBox.Visibility = Visibility.Visible;
        FocusLater(AddBox, selectAll: false);
    }

    private void AddBox_PreviewKeyDown(object sender, KeyEventArgs e)
    {
        switch (RealKey(e))
        {
            case Key.Enter:
                // 한글 조합 중인 마지막 글자가 Text에 들어간 뒤에 추가한다. 입력칸은 열어 두어 연달아 입력할 수 있다.
                Dispatcher.InvokeAsync(() =>
                {
                    if (_vm.Add(AddBox.Text))
                        AddBox.Clear();
                }, DispatcherPriority.Input);
                break;
            case Key.Escape:
                CloseAddBox();
                break;
        }
    }

    private void AddBox_LostKeyboardFocus(object sender, KeyboardFocusChangedEventArgs e) => CloseAddBox();

    private void CloseAddBox()
    {
        // 입력하던 글자는 남겨 두어 다시 열면 이어서 쓸 수 있다.
        AddBox.Visibility = Visibility.Collapsed;
        AddHint.Visibility = Visibility.Visible;
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

    private void FocusLater(TextBox box, bool selectAll) =>
        Dispatcher.InvokeAsync(() =>
        {
            box.Focus();
            if (selectAll)
                box.SelectAll();
            else
                box.CaretIndex = box.Text.Length;
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
```

- [ ] **Step 7: 빌드**

Run: `dotnet build`
Expected: 오류 0. (경고는 허용하되 새로 생긴 nullable 경고는 고친다.)

- [ ] **Step 8: 실행 스모크 테스트** (XAML 오류는 실행해야 드러난다)

```powershell
$env:TODOWIDGET_DATA_DIR = "C:\dev\todo\.devdata"
$p = Start-Process "src\TodoWidget.App\bin\Debug\net10.0-windows\TodoWidget.exe" -PassThru
Start-Sleep -Seconds 3
if ($p.HasExited) { "CRASHED: exit code $($p.ExitCode)" } else { "RUNNING"; Stop-Process -Id $p.Id }
```
Expected: `RUNNING`. `CRASHED`면 이벤트 뷰어(Windows 로그 > 응용 프로그램)의 .NET Runtime 오류로 원인을 찾아 고친다.

- [ ] **Step 9: 자동 테스트가 여전히 통과하는지 확인**

Run: `dotnet test`
Expected: 모든 테스트 통과.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add widget window with list, status changes, rename, and add"
```

- [ ] **Step 11: PM 확인 요청** — 아래 명령으로 위젯을 띄우고 PM에게 확인을 부탁한다. 문제가 있으면 고친 뒤 다시 확인받는다.

```powershell
$env:TODOWIDGET_DATA_DIR = "C:\dev\todo\.devdata"
Start-Process "src\TodoWidget.App\bin\Debug\net10.0-windows\TodoWidget.exe"
```

PM 확인 항목:
- 시안 A처럼 보인다: 둥근 카드, 헤더("할 일", "N개 남음"), 섹션 순서 하는 중 → 시작 전 → 끝낸 것.
- "+ 할 일 추가" → 한글로 입력하고 Enter → 마지막 글자까지 정확히 추가된다. 입력칸이 열린 채라 연달아 추가된다. Esc를 누르면 닫힌다.
- 여러 줄 텍스트를 붙여 넣으면 한 줄 제목이 된다.
- 동그라미 클릭 → 시작 전 → 하는 중(주황 배경) → 끝낸 것(초록, 가운데 줄) → 시작 전.
- 우클릭 메뉴: 현재 상태에 체크가 있고, 상태 이동·이름 바꾸기·삭제가 된다.
- 제목 더블클릭 → 한글로 고치고 Enter → 저장된다. Esc → 취소된다. 다 지우고 Enter → 원래 제목이 유지된다.
- "끝낸 것 N"을 누르면 펼쳐지고 접힌다. 최근에 끝낸 것이 위다.
- 📌 버튼으로 맨 위 고정이 켜지고 꺼진다. 아이콘 색이 바뀐다.
- 할 일을 많이 추가하면 화면 높이의 70%에서 멈추고 목록만 스크롤된다.
- 헤더를 끌어 옮기고 ⋯ → 종료 → 다시 실행하면 같은 위치, 같은 고정·펼침 상태로 뜬다.

---

### Task 10: 시작 흐름 (두 번 실행 방지, 자동 실행, 읽기 실패 안내)

**Files:**
- Create: `src/TodoWidget.App/SingleInstance.cs`
- Modify (전체 교체): `src/TodoWidget.App/App.xaml.cs`

**Interfaces:**
- Consumes: `MainWindow(...)`, `MainWindow.BringToFront()`, `AppPaths` (Task 9); `AutoStart.OnLaunch(bool, string)` (Task 8); `SettingsStore.Exists` (Task 5); `TodoSession.Open` (Task 6)
- Produces: `internal sealed class SingleInstance : IDisposable` — `bool IsFirst`, `void SignalFirstInstance()`, `void OnActivateRequested(Action callback)`

- [ ] **Step 1: 두 번 실행 방지**

`src/TodoWidget.App/SingleInstance.cs`:

```csharp
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
```

- [ ] **Step 2: 시작 흐름 완성**

`src/TodoWidget.App/App.xaml.cs` 전체:

```csharp
using System.IO;
using System.Security;
using System.Windows;
using TodoWidget.Core;

namespace TodoWidget.App;

public partial class App : Application
{
    private SingleInstance? _instance;

    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

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
```

- [ ] **Step 3: 빌드와 테스트**

Run: `dotnet build` 그리고 `dotnet test`
Expected: 오류 0, 모든 테스트 통과.

- [ ] **Step 4: 두 번 실행 스모크 테스트**

```powershell
$env:TODOWIDGET_DATA_DIR = "C:\dev\todo\.devdata"
$exe = "src\TodoWidget.App\bin\Debug\net10.0-windows\TodoWidget.exe"
$first = Start-Process $exe -PassThru
Start-Sleep -Seconds 3
$second = Start-Process $exe -PassThru
Start-Sleep -Seconds 3
"first running: $(-not $first.HasExited); second exited: $($second.HasExited)"
Stop-Process -Id $first.Id
```
Expected: `first running: True; second exited: True`

- [ ] **Step 5: 읽기 실패 스모크 테스트** (파일을 잠근 채 실행 → 안내 창, 원본 유지)

```powershell
$env:TODOWIDGET_DATA_DIR = "C:\dev\todo\.devdata"
New-Item -ItemType Directory -Force $env:TODOWIDGET_DATA_DIR | Out-Null
$tasks = Join-Path $env:TODOWIDGET_DATA_DIR "tasks.json"
if (-not (Test-Path $tasks)) { Set-Content -Path $tasks -Value "[]" -Encoding utf8 }
$before = Get-Content $tasks -Raw
$lock = [System.IO.File]::Open($tasks, 'Open', 'ReadWrite', 'None')
$p = Start-Process "src\TodoWidget.App\bin\Debug\net10.0-windows\TodoWidget.exe" -PassThru
Start-Sleep -Seconds 3
"still running (dialog open): $(-not $p.HasExited)"
Stop-Process -Id $p.Id
$lock.Dispose()
"unchanged: $((Get-Content $tasks -Raw) -eq $before)"
```
Expected: `still running (dialog open): True` (안내 창이 떠 있음), `unchanged: True`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add single instance, auto start on launch, and unreadable-file guard"
```

---

### Task 11: 배포, 바로가기, 최종 확인

**Files:**
- Create (git 추적 안 함): `dist/TodoWidget.exe`, `%USERPROFILE%\Desktop\09_앱_바로가기\할 일 위젯.lnk`

**Interfaces:**
- Consumes: Task 1–10 전체
- Produces: 실행 가능한 `dist\TodoWidget.exe`와 바로가기

- [ ] **Step 1: 실행 중인 위젯 종료** (두 번 실행 방지 때문에 새 exe가 바로 종료되는 것을 막는다)

```powershell
Get-Process TodoWidget -ErrorAction SilentlyContinue | Stop-Process
```

- [ ] **Step 2: Release 단일 exe로 빌드**

```bash
dotnet publish src/TodoWidget.App/TodoWidget.App.csproj -c Release -r win-x64 --self-contained false -p:PublishSingleFile=true -o dist
ls -la dist
```
Expected: `dist/TodoWidget.exe`가 있다. 크기는 수백 KB~수 MB 수준이다(런타임 미포함).

- [ ] **Step 3: 실제 데이터 폴더가 비어 있는지 확인** (처음 실행 판정을 위해)

```powershell
Test-Path "$env:APPDATA\TodoWidget\settings.json"
```
Expected: `False`. `True`면 개발 중에 환경 변수 없이 실행된 적이 있다는 뜻이다. PM에게 알리고, 그 폴더를 지워도 되는지 확인받은 뒤 진행한다.

- [ ] **Step 4: 바로가기 만들기**

```powershell
$shell = New-Object -ComObject WScript.Shell
$lnk = $shell.CreateShortcut("$env:USERPROFILE\Desktop\09_앱_바로가기\할 일 위젯.lnk")
$lnk.TargetPath = "C:\dev\todo\dist\TodoWidget.exe"
$lnk.WorkingDirectory = "C:\dev\todo\dist"
$lnk.Save()
Test-Path "$env:USERPROFILE\Desktop\09_앱_바로가기\할 일 위젯.lnk"
```
Expected: `True`

- [ ] **Step 5: 첫 실행과 자동 실행 등록 확인**

```powershell
Remove-Item Env:TODOWIDGET_DATA_DIR -ErrorAction SilentlyContinue
$sw = [Diagnostics.Stopwatch]::StartNew()
$p = Start-Process "C:\dev\todo\dist\TodoWidget.exe" -PassThru
$null = $p.WaitForInputIdle(5000)
"startup ms: $($sw.ElapsedMilliseconds)"
Start-Sleep -Seconds 1
(Get-ItemProperty "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name TodoWidget).TodoWidget
Test-Path "$env:APPDATA\TodoWidget\settings.json"
```
Expected: `startup ms`가 1000 미만. Run 값이 `"C:\dev\todo\dist\TodoWidget.exe"`. `settings.json` 존재 `True`.

- [ ] **Step 6: PM 최종 확인 요청** — Task 9의 PM 확인 항목과 함께 아래를 확인받는다.
- 바로가기(`09_앱_바로가기\할 일 위젯`)를 다시 누르면 새 창이 생기지 않고 기존 위젯이 앞으로 온다(고정을 끈 상태에서 다른 창으로 가린 뒤 확인).
- ⋯ → "컴퓨터 켤 때 자동 실행" 체크를 끄고 켜면 레지스트리 값이 사라지고 생긴다.
- 재부팅(또는 로그아웃 후 로그인)하면 위젯이 자동으로 뜬다.
- 할 일을 하나 끝낸 뒤 `%APPDATA%\TodoWidget\tasks.json`을 메모장으로 열면 한글이 그대로 보이고, 시각이 `2026-09-30 14:05:00` 형식이다.
- 위젯을 종료하고 `tasks.json`에 `{깨짐`을 적어 저장한 뒤 실행하면 → 빈 목록, 하단에 "저장 파일에 문제가 있어 백업해 두었어요", 같은 폴더에 `tasks.broken-….json` 백업이 있다. (확인 후 백업 파일 내용을 `tasks.json`으로 되돌려도 된다.)

- [ ] **Step 7: 작업 마무리 커밋** (코드 변경이 있었을 때만)

```bash
git status --short
git add -A
git commit -m "chore: finalize release build settings"
```
