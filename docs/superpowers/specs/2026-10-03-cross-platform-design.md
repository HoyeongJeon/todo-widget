# 크로스플랫폼 전환 설계 (Todo Widget v2.0)

- 작성일: 2026-10-03
- 역할: PM(사용자), 개발(Claude)
- 기준: v1.4.0 (`9345d9f`). v1.3까지의 설계는 `2026-09-30-todo-widget-design.md`에 있다.

**변경 이력**
- 2026-10-03: 시각을 한국 표준시 고정 대신 각 PC의 시간대로 기록하도록 바꿨다(9장). 이에 따라 `tasks.json` 형식이 바뀌고, v1.4로 되돌리려면 백업 파일을 써야 한다.
- 2026-10-03: spec 형식을 '### ID 제목' 제목으로 정하고, prefix를 정리했다(창 WND, Windows WIN, 시작 START 추가).
- 2026-10-03: macOS 자동 실행을 LaunchAgent 대신 로그인 항목(SMAppService)으로 바꿨다(5.2, 6장). 사용자가 시스템 설정에서 끈 것을 꺼짐으로 정확히 알 수 있고, 최소 macOS 13이 된다. 자세한 규칙은 `spec/platform/macos.md` MAC-08.
- 2026-10-03: `spec/` 기준선을 v1.4 테스트·화면 동작과 대조해 보완했다(4.3). 이제 동작의 기준은 `spec/`이고, 이 문서는 설계 시점의 기록으로 남는다.
- 2026-10-03: 최종 리뷰 결정을 반영했다. port에 `Dialog`, `AppInfo`를 더하고(5.2), OS별 Rust 파일에 자동 실행 등록을 넣고(5.4), 최소 macOS 13(2장), 안내 줄 정의(8장), 모니터마다의 화면 밖 판단(9장), 자동 실행 직접 구현과 ad-hoc 서명 위험(12장), 체크리스트 시간(10장)을 맞췄다.
- 2026-10-03: PM 결정 — 켜는 속도 목표를 0.5초로 당기고, 로그인 직후 2초·다시 부르기 0.1초 기준을 더했다(11장, PERF-01·06·07).
- 2026-10-03: 의존 방향과 네트워크 제한(PRIV-01)을 lint 규칙 대신 Vitest 구조 테스트로 막기로 했다(5.1).
- 2026-10-03: 10장 자동 검사 목록에서 lint를 빼고 Vitest 항목에 층 구조·PRIV-01 구조 테스트를 넣어 5.1과 맞췄다.
- 2026-10-03: PM 결정 — 전체 화면에서는 📌와 관계없이 숨긴다(2장, 3장 다음 버전 후보에서 뺌, 5.4, 6장, 12장). 계획 2 확인에서 전체 화면 위 표시가 기대대로 되지 않았고, PM이 숨는 쪽을 골랐다. 자세한 규칙은 `spec/platform/macos.md` MAC-07.
- 2026-10-03: 12장 표에 계획 2 Mac 위험 확인 결과 칸을 더했다. macOS 크기 조절은 tao가 지원하지 않아 계획 4에서 직접 만든다.
- 2026-10-03: 12장 시작 시간 결과에 probe 측정의 한계(실행 파일 로딩과 화면 합성 제외)와 계획 5 체크리스트 최종 확인을 적고, Windows 자동 실행 결과를 "계획 4"로 바꿨다.
- 2026-10-03: PM 결정 — 계획 2 측정 결과로 11장 숫자를 그대로 두고, REL-10(시험 빌드의 업데이트 확인 주소)을 더했다.
- 2026-10-03: 계획 3 결과 — port 표를 실제 위치·이름으로 맞추고, 시계와 id 생성기는 domain이 쓰므로 domain에 둔다고 적었다. `FileSystem`은 `FileStore`로, `AppPaths`는 `FileStore`와 `resolveDataDir`로 대신했고, `Timer`를 더했다(5.1, 5.2).
- 2026-10-03: 계획 3 최종 리뷰 — `src/testing/`을 테스트 파일만 가져오는 층으로 구조 테스트에 넣고, 저장 전 미리 보기 값은 ViewModel이 든다고 적었다(5.1). 5.3의 `addMany`를 실제 이름 `addLines`로 고쳤다.
- 2026-10-04: 계획 4 반영 — port 위치와 구현, OS 분기 위치, Rust crate 구성, 기술 선택(5.2, 5.4, 5.5, 12장, 13장)
- 2026-10-05: 계획 4 최종 리뷰 — `show_main`은 ShowGate 결정과 관계없이 창을 띄운다고 적고(5.4), 5.5의 Rust 테스트 명령(`--exclude todo-widget`)과 로컬 Windows 검사 명령을 실제와 맞췄다
- 2026-10-06: PM 결정 — 화면은 v1.4 겉모양을 두 OS에 그대로 쓴다(6장 겉모양). 메뉴는 ⋯ 메뉴와 우클릭 메뉴 모두 v1.4 카드 모양으로 화면 안에 그리고, 앱 아이콘과 메뉴 막대 아이콘을 새로 만든다. 승인한 시안은 `docs/design/widget-mockup.html`, v1.4 값 기록은 `docs/design/v1.4-visual-reference.md`다
- 2026-10-06: 계획 5 반영 — ViewModel은 runes를 쓰는 `.svelte.ts` class(5.1), 화면 언어를 고르는 `screenLanguage`와 창 높이 `setHeight`(5.2), `src/presentation/theme/`(5.4), presentation 테스트 도구(5.5), I18N-02 자동 검사 예외(7장), 12장 `macOS 창` 줄의 그림자 결과, 계획 5 개발 결정과 실행하며 더한 결정 표(13.2)
- 2026-10-06: 계획 5 최종 리뷰 — 13.2 "실행하며 더한 결정"에 확인 판 중 크기 조절, IME Esc(keyCode 229) 줄을 더하고, Task 4 줄에 메뉴 체크도 켤 때 등록을 기다린다고 적었다
- 2026-10-06: PM 확인 반영 — 위로 연 메뉴에서 카드가 깜빡여, D11에 내용은 창을 올린 뒤에 밀고 되돌린 뒤에 올린다는 순서를 적었다
- 2026-10-06: PM 확인 반영 — 13.2 IME Esc 줄에 compositionend 바로 뒤에 keyCode 27로 오는 WebKit Esc도 거른다고 적었다
- 2026-10-06: PM 확인 반영 — 계측으로 찾은 WKWebView 한글 Esc 순서(composition 이벤트 없음, insertReplacementText 뒤 keyCode 27)를 13.2 IME Esc 줄에 적고, 시각 폭 규칙을 입력기 편집 표시 규칙으로 바꿨다
- 2026-10-06: PM 결정 — 화면 맨 아래에서 위로 연 메뉴의 한 프레임 깜빡임을 알려진 한계로 둔다고 13.2 D11에 적었다
- 2026-10-06: PM 결정 — 할 일 섹션 제목 줄을 10px 안으로 넣어 끝낸 일 줄·할 일 동그라미와 맞춘다고 6장 겉모양에 적고, 시안(`docs/design/widget-mockup.html`)도 같이 고쳤다
- 2026-10-06: 계획 5 Task 15 결과 — 12장 `macOS 창`·시작 시간·메모리·가만히 있을 때 CPU 줄에 실제 화면으로 다시 잰 값(중앙값 470ms, 약 61MB, 약 0%)과 PM 눈 확인 결과를 적었다
- 2026-10-07: PM 결정 (계획 6 준비) — 두 OS의 직접 확인을 모두 PM이 하고, README와 릴리스 안내는 영어로 쓴다(10장). 업데이트 서명 키는 개발이 만든다. PERF-06은 공개 뒤 PM이 설치한 위젯으로 본다
- 2026-10-07: 계획 6 반영 — 13.3 출시 개발 결정
- 2026-10-07: PM 결정 — 13.3 D7 줄: 3초 상한을 spec START-08에 적었다. v1.4로 되돌리기와 두 위젯 안내를 spec(storage.md, windows.md)과 README에 맞췄다
- 2026-10-07: Windows 확인 반영 — 13.2 IME Esc 줄에 WebView2 한글 순서(compositionend 뒤, keyup 전에 Esc keyCode 27)와 그 Esc도 거른다는 규칙을 적었다
- 2026-10-07: 7장 I18N-02 자동 검사 예외에 CSS 속성 선택자를 따로 더했다(메뉴 포커스 돌려주기가 `[data-focus-home]`을 쓴다). 공백 없는 기술 낱말 규칙은 그대로라 `Don't`·`[Beta]`·`x=y`는 계속 문구로 본다. 화면 동작은 바뀌지 않는다
- 2026-10-07: Windows 확인 반영 — 📌를 바꾼 뒤 WebView2에 키보드 포커스를 돌려주는 OS 분기를 `window-controller.ts`에 둔다고 5.4에 적었다(WND-09)
- 2026-10-07: 보안 점검(/cso) 반영 — 13.3 계획 6 추가 결정에 workflow action SHA 고정을 더했다

## 1. 목적

Windows 전용 위젯(v1.4, C# WPF)을 **Windows와 macOS에서 똑같이 동작하는 v2.0**으로 다시 만든다. PM이 Mac에서도 쓰고, 지인 2~3명과 나눠 쓴다.

**성공 기준**
- v1.4에서 되던 일은 두 OS에서 모두 똑같이 된다.
- 직관적이고 빠르다. 켜면 0.5초 안팎으로 보이고, 쓰는 동안 기다리는 느낌이 없다.
- Windows 사용자는 새 버전을 설치하기만 하면 기존 할 일이 그대로 보인다.
- v2.0을 한 번 설치하고 나면, 그다음부터는 위젯 안에서 클릭 한 번으로 업데이트한다.

## 2. 결정 요약

| 항목 | 결정 |
|---|---|
| 대상 OS | Windows 10/11 (x64), macOS 13 이상 (Apple Silicon + Intel). Linux는 제외 |
| 원칙 | 행동은 두 OS가 같게, 겉모양은 각 OS에 맞게 |
| 기술 | Tauri v2 + TypeScript. Rust는 OS와 닿는 얇은 부분에만 쓴다. 화면은 Svelte |
| 교체 방식 | Windows와 macOS를 v2.0으로 한 번에 교체한다. WPF 코드는 저장소에서 내린다 |
| 범위 | v1.4 기능 그대로 + 크로스플랫폼에 꼭 필요한 것 + 자동 업데이트 + 다국어 |
| 언어 | 한국어, 영어, 독일어, 중국어(간체). OS 언어 설정을 따른다 |
| 배포 | GitHub Release 링크. 코드 서명 없음. Windows는 설치 파일, macOS는 dmg |
| 업데이트 | 하단 한 줄 안내 + 클릭. 켤 때와 떠 있는 동안 하루 한 번 확인 |
| 개인정보 | 사용자 데이터는 기기 밖으로 나가지 않는다 |
| macOS 표시 | 메뉴 막대 아이콘만. Dock과 Cmd+Tab에는 없다. 모든 데스크톱(Spaces)에 따라다닌다. 전체 화면 앱에서는 📌와 관계없이 보이지 않는다 |
| 저장소 | `windows-todo-widget` → `todo-widget`으로 이름 변경 (v2.0 출시 전) |
| 개발 방식 | spec-driven + TDD. clean architecture, OOP, 느슨한 결합 |

## 3. 범위

**포함**
- v1.4의 모든 기능: 상태 3가지와 섹션 2개, 항상 떠 있는 입력칸, 여러 줄 붙여넣기, 우클릭 메뉴, 이름 바꾸기, 삭제, 섹션 접기, 크기 조절, 섹션별 스크롤, 배경 투명도(0~40%), 초기화, 맨 위 고정, 위치·크기·상태 복원, 자동 실행, 두 번 실행 방지, 안전한 저장과 깨진 파일 처리.
- 크로스플랫폼 필수 요소: macOS 메뉴 막대 아이콘, Spaces 대응, OS별 데이터 폴더·자동 실행·글꼴, Windows 설치 파일, macOS dmg.
- 자동 업데이트 (8장).
- 다국어 4개 (7장).

**제외**
- Linux, App Store 배포, 코드 서명(유료 인증서).
- 앱 안에서 언어 바꾸기. OS 설정만 따른다.
- v1.3 설계 9장의 제외 목록(동기화, 마감일, 드래그 정렬, 검색, 다크 모드, 단축키 등)은 그대로 제외다.

**다음 버전 후보**
- macOS 메뉴 막대 아이콘에 남은 개수 표시.

## 4. spec 구조와 운영

### 4.1 문서 구성

저장소 루트의 `spec/`은 **늘 현재 동작을 반영하는 문서**다. `docs/superpowers/specs/`는 설계 시점의 기록이고, `spec/`이 기준이다.

```
spec/
  README.md          spec 폴더 사용법과 전체 안내
  00-principles.md   제품 원칙, 개발 원칙, 가벼움 기준, 범위 밖 목록, 다음 버전 후보
  behavior/          공통 행동 spec. 두 OS가 똑같이 지킨다
    tasks.md         할 일, 상태 3가지와 규칙, 남은 개수
    list.md          섹션, 정렬, 접기, 빈 화면
    input.md         추가, 여러 줄 붙여넣기, 이름 바꾸기, 삭제, 초기화
    window.md        크기 조절, 이동, 맨 위 고정, 투명도, 위치 복원
    startup.md       시작, 자동 실행, 두 번 실행, 종료
    storage.md       저장 형식, 안전한 저장, 깨진 파일과 저장 실패
    i18n.md          언어 선택 규칙, 문구 목록
    update.md        업데이트 확인, 안내, 적용
  platform/          OS별 adapter spec. 공통 행동을 각 OS에서 어떻게 구현하는지
    windows.md
    macos.md
  release.md         빌드, 배포, 서명 키, 버전 규칙, 출시 순서
  checklists/        OS별 직접 확인 체크리스트
    windows.md
    macos.md
```

### 4.2 요구사항 형식

요구사항마다 ID를 붙이고, 조건·동작·결과·확인 방법을 적는다. `조건`과 `동작`은 필요할 때만 쓰고, `결과`와 `확인`은 반드시 쓴다.

```markdown
### TASK-09 이미 끝낸 일을 다시 끝낸 일로 지정하면 아무것도 바뀌지 않는다
- 조건: 상태 `done`, 끝낸 시각 `2026-10-03T09:00:00+09:00`
- 동작: 상태를 `done`으로 지정한다
- 결과: 끝낸 시각은 그대로 `2026-10-03T09:00:00+09:00`이고, 저장도 화면 갱신도 일어나지 않는다
- 확인: 자동 테스트
```

- ID 앞부분은 문서를 나타낸다.

| 파일 | prefix |
|---|---|
| `spec/00-principles.md` | `PRIV`, `PERF` |
| `spec/behavior/tasks.md` | `TASK` |
| `spec/behavior/list.md` | `LIST` |
| `spec/behavior/input.md` | `INPUT` |
| `spec/behavior/window.md` | `WND` |
| `spec/behavior/startup.md` | `START` |
| `spec/behavior/storage.md` | `STORE` |
| `spec/behavior/i18n.md` | `I18N` |
| `spec/behavior/update.md` | `UPD` |
| `spec/platform/windows.md` | `WIN` |
| `spec/platform/macos.md` | `MAC` |
| `spec/release.md` | `REL` |

`WND`는 창, `WIN`은 Windows 플랫폼, `START`는 시작을 가리킨다.

- 확인 방법은 **자동 테스트** 또는 **직접 확인** 중 하나다. 자동 테스트 이름에는 ID가 들어간다(예: `TASK-09 done을 다시 done으로 지정하면 끝낸 시각이 그대로다`). 직접 확인 항목은 `spec/checklists/`에 같은 ID로 올린다.
- CI가 연결을 검사한다. spec의 모든 ID는 테스트나 체크리스트 중 하나에 연결돼야 하고, 테스트와 체크리스트는 spec에 없는 ID를 가리킬 수 없다. `pnpm spec:check`는 형식, 없는 ID 참조, 체크리스트 누락을 검사하고, `pnpm spec:check:strict`는 테스트 없는 자동 테스트 항목까지 실패로 본다. 출시 전에는 strict가 통과해야 한다.

### 4.3 운영 규칙

1. **spec이 먼저다.** 동작을 바꾸려면 spec을 고치고 PM 승인을 받은 뒤, 실패하는 테스트 → 구현 → 리팩터링 순서로 간다. 코드와 spec이 다르면 코드가 틀린 것이다.
2. **테스트 없는 동작 코드는 넣지 않는다.** 자동으로 확인할 수 없는 동작만 체크리스트로 확인한다.
3. **첫 작업은 v1.4를 역으로 spec화하는 것이다.** v1.3 설계 문서에는 v1.4의 투명도 슬라이더(0~40%)와 초기화가 빠져 있다. v1.4의 C# 코드와 테스트를 근거로 빈칸을 채워 "v1.4가 실제로 하는 일"을 `spec/behavior/`에 확정한다. 이것이 v2.0이 통과해야 할 기준선이다.
4. 문서마다 변경 이력을 남긴다.

## 5. 앱 구조

### 5.1 층

```
presentation   View(Svelte) + ViewModel(Svelte 5 runes를 쓰는 .svelte.ts class, svelte import 없음)
application    사용 시나리오 + port interface
domain         할 일 규칙. 순수 TypeScript
adapters       Tauri와 OS에 닿는 유일한 곳. port를 구현한다
main.ts        composition root. 실행할 때 adapter를 만들어 주입한다
```

| 층 | 하는 일 | 의존해도 되는 것 |
|---|---|---|
| domain | 상태 규칙, 정렬, 붙여넣기 해석, 섹션 높이 배분, 창 크기 제한, 투명도 범위, 시각 형식과 v1.4 시각 변환 | 없음 |
| application | 추가하면 저장, 처음 실행이면 자동 실행 켜기, 업데이트 확인 주기 같은 흐름 | domain, port |
| presentation | 화면 상태(ViewModel)와 그리기(View), 문구 사전 | application, domain |
| adapters | 파일, 자동 실행, 업데이트, 창 제어, 언어 감지, 시계 | port, Tauri |

- 의존 방향과 네트워크 제한(PRIV-01)은 Vitest 구조 테스트(`src/architecture.test.ts`, 규칙은 `tools/architecture/`)로 막는다. 어기면 `pnpm test`와 CI가 실패한다. 별도 ESLint 규칙은 두지 않는다(개발 결정: 도구 하나로 충분하고, 규칙을 테스트로 읽을 수 있다).
- ViewModel은 Svelte 5 runes(`$state`)를 쓰는 class이고 `.svelte.ts` 파일이다(`src/presentation/*-view-model.svelte.ts`). `svelte` 패키지를 import하지 않는다. 동작 규칙은 ViewModel과 순수 TS 도우미(`src/presentation/input/`, `layout/`, `menu/`)에 두고, 컴포넌트는 그리기·DOM 이벤트 연결·크기 재기만 한다. View 프레임워크를 바꾸면 `$state` 선언을 다른 알림 방식으로 바꾸면 된다(계획 5 개발 결정 D1).
- 화면 문구 하드코딩도 같은 구조 테스트가 막는다(I18N-02, `tools/architecture/copy.ts`). 예외는 7장에 적는다.
- 테스트용 가짜(port 구현)는 `src/testing/`에 둔다. 테스트 파일(`*.test.ts`)만 가져오고, composition root(`src/main.ts`)를 포함한 제품 코드는 가져오지 않는다. 구조 테스트가 이것도 막는다.
- 투명도 미리 보기(WND-12)처럼 아직 확정하지 않은 화면 값은 ViewModel이 들고 있다가, 메뉴를 닫을 때 `SettingsService.update()`로 확정한다. `SettingsService`는 확정된 설정만 들고 저장한다.

### 5.2 port

| port | 하는 일 | 위치 | 구현 |
|---|---|---|---|
| `Clock` | 지금 시각(PC 시간대 포함) | `src/domain/clock.ts` | `src/adapters/system/clock.ts` / `FakeClock` |
| `IdGenerator` | 할 일 id | `src/domain/ids.ts` | `src/adapters/system/ids.ts` / `sequenceIds` |
| `FileStore` | 데이터 폴더 파일 읽기, 안전한 쓰기, 존재 확인, 이름 바꾸기, 복사 | `src/application/ports/file-store.ts` | `src/adapters/tauri/file-store.ts` → Rust `todowidget_core::files::DataDir` / `MemoryFileStore` |
| `AutoStart` | 자동 실행 켜짐 확인, 켜기, 끄기, 등록 경로 갱신 | `src/application/ports/auto-start.ts` | `src/adapters/tauri/auto-start.ts` → Rust `todowidget_core::autostart` (Windows `todowidget_windows::run_key`, macOS `platform/macos.rs`) / `FakeAutoStart` |
| `Updater` | latest.json 확인, 받아서 설치 | `src/application/ports/updater.ts` | `src/adapters/updater/tauri-updater.ts` / `FakeUpdater` |
| `Timer` | 나중에 한 번 실행 | `src/application/ports/timer.ts` | `src/adapters/system/timer.ts` / `FakeTimer`, `ManualTimer`, `ImmediateTimer` |
| `AppInfo` | 앱 버전, 개발 빌드 여부 | `src/application/ports/app-info.ts` | `src/adapters/tauri/app-info.ts` |
| `WindowController` | 위치, 크기, 창 높이만 바꾸기(내용 맞추기·메뉴용 늘리기), 맨 위 고정, 보이기·숨긴 채 두기, 끌어 옮기기, 크기 조절, 모니터 영역 | `src/application/ports/window-controller.ts` | `src/adapters/tauri/window-controller.ts` / `FakeWindowController` |
| `LocaleProvider` | OS 언어 (BCP 47) | `src/application/ports/locale.ts` | `src/adapters/tauri/locale.ts` |
| `Dialog` | OS 대화 상자 (STORE-10) | `src/application/ports/dialog.ts` | `src/adapters/tauri/dialog.ts` / `FakeDialog` |
| `AppProcess` | 종료, OS 쪽 종료 요청 받기 (START-08, MAC-04) | `src/application/ports/app-process.ts` | `src/adapters/tauri/process.ts` / `FakeProcess` |

- 저장 형식, 깨진 파일 백업, v1.4 데이터 변환 같은 **판단**은 TypeScript가 하고, Rust는 디스크에 안전하게 쓰는 일만 한다.
- 모든 의존은 constructor로 주입한다. 전역 singleton은 쓰지 않는다.
- `Clock`과 `IdGenerator`는 domain 규칙(할 일 추가, 상태 바꾸기)이 직접 쓰므로 domain에 둔다. 나머지 port는 application에 둔다.
- 따로 `AppPaths`는 두지 않는다. 데이터 폴더 위치는 Rust(`todowidget_core::files::resolve_data_dir`)가 정하고, `FileStore`는 파일 이름만 넘긴다. WebView는 환경 변수를 읽지 못하기 때문이다.
- `Dialog`의 Tauri 구현은 Rust 명령 `show_error_dialog`를 부른다. 이 명령은 창에 붙이지 않은(parent 없는) OS 오류 대화 상자를 띄운다. STORE-10에서는 위젯 창이 숨어 있어, 창에 붙이면 macOS sheet가 보이지 않기 때문이다. 그래서 JS 패키지 `@tauri-apps/plugin-dialog`는 쓰지 않고, Rust crate `tauri-plugin-dialog`만 쓴다.
- 테스트용 가짜는 모두 `src/testing/`에 있다. `AppInfo`는 값뿐이라 테스트에서 객체를 바로 만든다. `LocaleProvider`는 켤 때 `screenLanguage`(`src/application/language.ts`)가 한 번 읽는다(I18N-01).

### 5.3 OOP와 캡슐화

- `TodoList`는 내부 목록을 그대로 내보내지 않는다. `add`, `addLines`, `cycle`, `setStatus`, `rename`, `remove`, `clear` 같은 method로만 바뀐다.
- `Title`은 값 객체다. 앞뒤 공백을 지우고, 빈 제목이면 만들어지지 않는다.
- 클래스 하나는 책임 하나만 진다. 파일이 길어지면 나눌 때가 된 것이다. v1.4의 `MainWindow.xaml.cs`(420줄)처럼 화면 코드에 동작이 몰리지 않게, 동작은 ViewModel로 내린다.

### 5.4 OS에 따라 다른 코드가 있는 곳

이 목록 밖에는 OS 분기가 없어야 한다.

| 위치 | 내용 |
|---|---|
| `src/adapters/` 중 OS별 파일 | (없음 — 데이터 폴더는 Rust가 정한다. 자동 실행 adapter도 Rust 명령만 부르므로 OS 분기가 없다) |
| `src/adapters/tauri/window-controller.ts` | Windows에서만 📌(맨 위 고정)를 바꾼 뒤 WebView에 키보드 포커스를 돌려준다(`setFocus`, WND-09). WebView2는 tao가 맨 위 고정을 다시 적용하면 DOM 포커스는 남아도 키 입력을 잃는다 |
| `src/adapters/tauri/coordinates.ts` | 좌표 단위. Windows는 실제 픽셀을 위치는 주 모니터 배율로, 크기는 창이 있는 모니터 배율로 나눈다. macOS는 포인트 그대로다(window.md 용어 "크기와 좌표") |
| `src-tauri/src/platform/macos.rs` | 메뉴 막대 아이콘, Dock 숨김, Reopen 받기, 로그인 항목(SMAppService) 등록·해제·상태 읽기, 창 영역 한 번에 바꾸기(`NSWindow`), OS 이름(`OS_NAME`). 모든 Spaces 따라다니기는 Tauri 설정 `visibleOnAllWorkspaces`로 한다 |
| `src-tauri/src/platform/windows.rs` | `todowidget_windows`를 앱에 잇는다(자동 실행, 창 영역), OS 이름(`OS_NAME`). 작업 표시줄 숨김은 Tauri 설정 `skipTaskbar`로 한다 |
| `src-tauri/crates/windows/` | 레지스트리 `Run`·`StartupApproved\Run` 읽기·쓰기(`run_key.rs`), 창 위치·크기 한 번에 바꾸기(`frame.rs`, `SetWindowPos`) |
| `src/presentation/theme/` | 겉모양 CSS 변수(`theme.css`, 시안 값)와 OS·언어별 글꼴. 글꼴 이름은 `theme.css`의 `--font-{macos,windows}-{ko,en,zh}` 변수에 있고, `fonts.ts`가 OS와 화면 언어로 변수를 고른다 |

**Rust crate 구성**

| crate | 위치 | 하는 일 |
|---|---|---|
| 앱 crate (`todo-widget`) | `src-tauri/src/` | Tauri 명령, plugin 등록, 창, 메뉴 막대, `platform/`. Tauri를 링크하므로 Rust 테스트를 두지 않는다 |
| `todowidget-core` | `src-tauri/crates/core/` | Tauri 없이 테스트하는 순수 로직. 안전한 쓰기와 데이터 폴더(`files`), 자동 실행 판정(`autostart`), 창 영역 값(`frame`), 창 띄우기 결정(`show_gate`) |
| `todowidget-windows` | `src-tauri/crates/windows/` | Tauri 없는 Windows API. Windows에서만 컴파일된다 |

- 창을 띄울지는 `ShowGate`가 한 번만 정한다(정하지 않음·띄움·숨긴 채 둠). `show_main`, `keep_hidden`(STORE-10 대화 상자), 3초 대비책 중 먼저 온 쪽이 정한다. 다만 `show_main`은 결정과 관계없이 늘 창을 띄운다(두 명령 모두 JS가 부르므로 순서는 JS가 책임진다). 결정을 따르는 것은 `reveal()`과 3초 대비책이다.
- 다시 실행(START-01), 메뉴 막대 "열기", macOS Reopen은 모두 `reveal()`을 거친다. `keep_hidden`이 "숨긴 채 둠"으로 정했으면 `reveal()`은 아무것도 하지 않는다. 대화 상자 중에 빈 창이 뜨지 않게 하기 위해서다.

### 5.5 테스트

| 층 | 도구 | 범위 |
|---|---|---|
| domain, application | Vitest + 가짜 port | 공통 행동 spec 대부분 |
| presentation | Vitest node 환경으로 ViewModel과 순수 도우미. DOM 이벤트 연결이 핵심인 컴포넌트만 `@testing-library/svelte` + `happy-dom`(파일 첫 줄 `// @vitest-environment happy-dom`) | 목록·안내 줄·메뉴·창 높이 상태, 섹션 높이 나누기, 메뉴 자리, Enter·IME·붙여넣기·포커스 |
| adapters | `cargo test --workspace --exclude todo-widget`(core, windows crate. 앱 crate는 테스트가 없고, Windows에서 테스트 실행 파일이 rfd·common-controls 링크 때문에 뜨지 않을 수 있어 뺀다), Vitest port 계약 테스트, `pnpm privacy:check` | 안전한 쓰기, 데이터 폴더, 자동 실행 판정, Windows 레지스트리(Windows CI). 가짜와 진짜 구현이 같은 계약을 지키는지. HTTP crate를 updater plugin만 쓰는지(PRIV-01) |
| 실제 앱 | OS별 직접 확인 체크리스트 | 창 모양, 실제 IME 입력, 메뉴 막대, Spaces, 설치·업데이트 |

Tauri의 자동 E2E 도구는 macOS를 지원하지 않는다. 그래서 화면 아래 동작을 최대한 ViewModel로 끌어내려 자동 테스트 범위를 넓힌다.

Mac에서 Windows 대상으로 검사하는 것은 `todowidget-core`와 `todowidget-windows`뿐이다(`PATH="/opt/homebrew/opt/llvm/bin:$PATH" cargo clippy --manifest-path src-tauri/Cargo.toml -p todowidget-core -p todowidget-windows --all-targets --target x86_64-pc-windows-msvc -- -D warnings`). 앱 crate의 Windows 빌드는 CI에서 확인한다(13장 개발 결정).

## 6. OS별 동작

| 항목 | Windows | macOS |
|---|---|---|
| 앱이 보이는 곳 | 위젯만. 작업 표시줄, 트레이 없음 (v1.4와 같음) | 위젯 + 메뉴 막대 아이콘. Dock, Cmd+Tab 없음 |
| 가려졌을 때 | 바로가기·시작 메뉴로 다시 실행하면 기존 위젯이 앞으로 | 메뉴 막대 아이콘 클릭. Spotlight로 다시 실행해도 같음 |
| 종료 | ⋯ → 종료 | ⋯ → 종료, 메뉴 막대 아이콘 우클릭 → 종료 |
| 데스크톱 전환 | 해당 없음 | 모든 Spaces에 따라다님. 전체 화면 앱에서는 📌와 관계없이 보이지 않음. 📌는 일반 데스크톱에서 맨 위 고정만 정함 |
| 자동 실행 | `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`, 값 이름 `TodoWidget` (v1.4와 같음) | 로그인 항목(SMAppService) |
| 처음 실행 | `settings.json`이 없으면 처음 실행 → 자동 실행 켬 | 같음 |
| 두 번 실행 | 기존 위젯을 앞으로, 두 번째 프로세스는 종료 | 같음 |
| 설치 위치 | 사용자 폴더 (관리자 권한 없음) | 응용 프로그램 폴더 |
| 첫 실행 경고 | SmartScreen: 추가 정보 → 실행 | 시스템 설정 → 개인정보 보호 및 보안 → 그래도 열기 |

**글꼴**

| 언어 | Windows | macOS |
|---|---|---|
| 한국어 | 맑은 고딕 | Apple SD Gothic Neo |
| 영어, 독일어 | Segoe UI | 시스템 기본 (SF Pro) |
| 중국어 간체 | Microsoft YaHei | PingFang SC |

**겉모양**
- 둥근 카드, 따뜻한 중립 톤, 상태 동그라미 색(회색·주황·초록)은 제품의 정체성이라 공통이다.
- 겉모양은 v1.4를 두 OS에 그대로 쓴다(PM 결정, 2026-10-06). 색, 크기, 간격, 글자 크기, 그림자, 스크롤바는 v1.4 값이다. 두 OS에서 다른 것은 글꼴뿐이다.
  - 기준 시안: `docs/design/widget-mockup.html`(PM 승인). v1.4 값과 출처: `docs/design/v1.4-visual-reference.md`.
  - v1.4의 Windows 아이콘 글꼴(Segoe Fluent) 글리프는 같은 모양의 SVG로 그린다.
  - 메뉴는 ⋯ 메뉴와 우클릭 메뉴 모두 v1.4 카드 모양으로 웹 화면 안에 그린다. OS 기본 메뉴는 ⋯ 메뉴의 투명도 슬라이더를 담을 수 없고, 두 메뉴 모양이 달라지기 때문이다. 메뉴가 창보다 크면 메뉴가 열린 동안 창을 투명하게 늘린다. 메뉴 막대 아이콘의 메뉴("열기", "종료")만 OS 기본 메뉴다.
  - v1.4에 없던 것: 안내 줄의 누를 수 있는 `update.action` 글자, 앱 아이콘(상태 동그라미 세 개), macOS 메뉴 막대 아이콘(하는 중 동그라미, 한 가지 색 template).
  - v1.4와 다른 것: 할 일 섹션 제목 줄을 10px 안으로 넣어 끝낸 일 줄·할 일 동그라미와 맞춘다 (PM 결정 2026-10-06). 줄 높이 24와 위아래 hover 배경은 v1.4 그대로다.
  - 다크 모드는 v1.4에도 없었고 이번 범위 밖이다.
- 배경 투명도는 필수 기능이다. macOS에서 투명 창을 쓰려면 Tauri의 `macOSPrivateApi`를 켜야 하고, 이 때문에 App Store에는 올릴 수 없다. App Store는 범위 밖이므로 이 설정을 쓴다.

## 7. 다국어

- 지원 언어: 한국어(`ko`), 영어(`en`), 독일어(`de`), 중국어 간체(`zh-Hans`).
- 고르는 규칙: OS 언어가 `ko*`면 한국어, `de*`면 독일어, `zh*`면 지역과 관계없이 간체, 그 밖에는 영어.
- 화면 글자는 모두 언어별 사전에서 꺼낸다. 코드에 화면 문구를 직접 쓰지 않는다.
- 개수가 들어간 문장은 언어별 복수 규칙을 따른다. 예: "3개 남음" / "1 task left" / "3 tasks left".
- 네 사전의 키가 하나라도 다르면 테스트가 실패한다.
- 저장 데이터는 언어와 무관하다. 상태는 `todo`·`doing`·`done`으로 저장되고 화면에서만 번역된다.
- 독일어 문구가 가장 길다. 최소 폭(280px)에서 넘치지 않는지 직접 확인 항목으로 둔다.
- 번역은 개발이 한다. 독일어·중국어 원어민 검토는 가능해지면 반영한다.
- I18N-02 자동 검사(`tools/architecture/copy.ts`)는 presentation의 `.svelte`·`.ts`에서 다음을 찾는다.
  - 템플릿 글자 중 글자(문자)가 있는 것
  - `title`·`placeholder`·`aria-label`·`alt`·`label` 속성과, `type`이 `button`·`submit`·`reset`인 `<input>`의 `value`에 쓴 고정 글 중 글자가 있는 것
  - 그 밖의 `aria-*` 속성의 고정 글, 문자열 리터럴, template literal 중 문구처럼 보이는 것. template literal의 값 자리(`${…}`)는 `{n}`으로 읽고 고정 조각과 이어서 본다. 그래서 `` `${count} tasks left` ``는 `{n} tasks left`로 읽혀 문구로 걸린다
- 검사에서 늘 빼는 곳(계획 1이 미뤄 둔 목록, 계획 5 개발 결정 D8, PM 승인 2026-10-06):
  - 주석(`//`, `/* */`, `<!-- -->`)과 `<style>`
  - 사전 파일 `src/presentation/i18n/{ko,en,de,zh-hans}.ts`
  - 글자가 없는 기호·숫자(⋯ · % +)
  - `console.*(…)`·`new Error(…)`의 첫 인자가 따옴표 문자열 리터럴일 때(개발자용 문장). 첫 인자가 template literal이면 그대로 검사한다
- 문자열 리터럴·template literal과 그 밖의 `aria-*` 값을 볼 때만 쓰는 값 예외(템플릿 글자와 `title` 등 보이는 속성에는 쓰지 않는다):
  - 공백 없는 기술 낱말(이벤트 이름, 키 이름, 사전 키, 경로, CSS 값 하나, `{n}`)
  - CSS 속성 선택자(`[data-focus-home]`, `input[type="text"]`). 앞부분은 소문자 요소·클래스이고 속성 이름은 소문자로 시작해야 한다. `[Beta]`, `x=y`, `Don't`는 선택자가 아니라 문구로 본다
  - 소문자 낱말을 공백으로 이은 CSS 클래스 목록. 낱말마다 영어 소문자가 하나는 있어야 한다. 숫자만 있는 낱말이 끼면 클래스 목록이 아니다(`'3 tasks left'`는 문구다)
  - ASCII 밖의 글자(한글·한자·움라우트)가 있으면 이 값 예외에 들지 않고 늘 문구로 본다.
- 검사가 놓치는 것: 문자열 리터럴과 `aria-*` 값의 영어 한 낱말 문구(대소문자 무관, 예: `'Menu'`, `'Cancel'`)와 소문자 영어 낱말만 이은 문구(예: `'add a task'`), 문자열 이어 붙이기로 만든 문구(조각마다 따로 보므로). 템플릿 글자와 `title` 등 보이는 속성은 글자가 있으면 걸리므로 여기에 들지 않는다. 놓치는 것은 체크리스트 I18N-07에서 본다.
- 글꼴 이름은 `theme.css` 변수에 둔다. 다른 언어로 쓴 제목도 깨지지 않게 화면 언어 글꼴 뒤에 다른 언어 글꼴을 둔다(I18N-06).
- 독일어 문구는 최소 폭 280에서 안내 줄이 두 줄 안에 들어가게 짧게 쓴다(계획 5 개발 결정 D18).

## 8. 업데이트와 개인정보

**원칙:** 사용자 데이터는 기기 밖으로 나가지 않는다. 네트워크 통신은 업데이트 확인과 다운로드뿐이며, 요청에 사용자 데이터를 담지 않는다.

- 출시할 때 GitHub Release에 설치 파일과 함께 `latest.json`(최신 버전 번호와 파일 주소)을 올린다.
- 위젯은 켤 때 한 번, 떠 있는 동안 하루 한 번 `latest.json`을 읽는다. 마지막 확인 시각은 `settings.json`에 둔다.
- 새 버전이 있으면 위젯 하단의 안내 줄에 "새 버전이 있어요 · 업데이트"를 표시한다. 안내 줄은 한 번에 안내 하나를 보여 주는 줄이고, 글이 길면 두 줄까지 줄바꿈된다. v1.4의 저장 실패 안내와 같은 자리, 같은 모양이다.
- 누르면 받아서 설치하고 위젯을 다시 띄운다. 누르지 않으면 지금 버전을 계속 쓴다.
- 인터넷이 없거나 확인에 실패하면 조용히 넘어간다.
- 업데이트 파일은 업데이트 전용 키로 서명한다. 서명이 맞지 않으면 설치하지 않는다.
- v1.4에는 업데이트 기능이 없다. 따라서 v2.0은 모두가 한 번 직접 설치한다. 이후 버전부터 위젯 안에서 업데이트한다.

## 9. 데이터와 v1.4 호환

| OS | 데이터 폴더 |
|---|---|
| Windows | `%APPDATA%\TodoWidget\` (v1.4와 같음) |
| macOS | `~/Library/Application Support/TodoWidget/` |

- **Windows는 v1.4와 같은 폴더를 쓴다.** 설치하고 켜면 기존 할 일이 그대로 보인다.
- `settings.json`은 기존 항목을 유지하고 새 항목만 추가한다.
- 저장된 창 위치가 화면 밖이면 기본 위치로 되돌린다. v1.4는 모든 모니터를 감싼 사각형 하나로 판단했지만, v2.0은 모니터마다 헤더를 잡을 수 있는지 본다(`spec/behavior/window.md` WND-08).

### 9.1 시각 기록

- v1.4는 PC 시간대와 관계없이 한국 표준시로 기록했다. v2.0은 해외 사용자도 쓰므로 **각 PC의 시간대로 기록하고, 시간대 정보를 함께 저장한다.**
- 형식은 ISO 8601, 초 단위, 시간대 포함이다. 예: `2026-10-03T15:00:00+02:00`.
- 정렬(끝낸 일 최신순 등)은 문자열이 아니라 실제 시각으로 비교한다. 서로 다른 시간대에서 기록된 항목이 섞여도 순서가 맞다.
- 날짜를 따지는 판단은 지금 PC의 시간대를 기준으로 한다. 현재 v2.0에는 이런 기능이 없고, 나중의 "끝낸 일 자동 정리"를 위한 규칙이다.

### 9.2 `tasks.json` v2 형식

```json
{
  "version": 2,
  "tasks": [
    {
      "id": "3f2a9c1e-...",
      "title": "보고서 초안 쓰기",
      "status": "todo",
      "createdAt": "2026-10-03T09:12:40+09:00",
      "completedAt": null
    }
  ]
}
```

- 할 일 하나의 필드와 상태값은 v1.4와 같다. 시각 형식만 바뀐다.
- 파일 전체를 `version`이 있는 객체로 감싼다. 다음에 형식이 바뀌어도 어느 버전 파일인지 알고 변환할 수 있게 하기 위해서다(개발 판단).
- 앱이 아는 것보다 높은 `version`의 파일(더 새 버전 앱이 만든 파일)은 고치지 않는다. 덮어쓰지도, 깨진 파일로 백업하지도 않고, "새 버전에서 만든 파일이에요. 업데이트해 주세요"를 표시하고 저장하지 않는다.

### 9.3 v1.4 데이터 변환

v2.0이 v1.4 형식(배열, KST 시각)의 `tasks.json`을 처음 읽으면:
1. 원본을 `tasks.v1-backup-yyyyMMdd-HHmmss.json`으로 복사해 둔다.
2. v1.4의 시각을 한국 표준시(`+09:00`)로 해석해 v2 형식으로 바꾼다. 실제 시각은 그대로다.
3. v2 형식으로 저장한다.

- 백업에 실패하면 변환하지 않고 원본을 그대로 둔다. 할 일은 화면에 보여 주되 저장하지 않고, 저장 실패 안내를 표시한다. 다음 변경 때 다시 시도한다.
- 변환은 한 번만 일어난다. 이미 v2 형식이면 백업을 만들지 않는다.

**v1.4로 되돌리기**
- v1.4는 v2 형식을 읽지 못한다. v1.4를 다시 실행하면 v2 파일을 깨진 파일로 보고 `tasks.broken-....json`으로 이름을 바꾼 뒤 빈 목록으로 시작한다. 데이터가 지워지지는 않는다.
- 되돌리려면 `tasks.v1-backup-....json`을 `tasks.json`으로 바꾼다. v2.0에서 바꾼 내용은 반영되지 않는다. 이 방법은 v2.0 릴리스 안내에 적는다.

**자동 테스트**
- v1.4 테스트의 예시 데이터를 고정 파일로 가져와, v2.0이 읽고 변환하는지 확인한다. 시각, 상태, 순서가 보존되고 백업이 생겨야 한다.
- 변환은 한 번만 일어난다. 높은 `version`의 파일은 건드리지 않는다. 시간대가 다른 항목이 섞여도 정렬이 맞다.

**Windows 교체 순간**
- 자동 실행: v1.4가 등록한 `TodoWidget` 값이 있으면 새 설치 경로로 바꿔 쓴다. v1.4에서 꺼 두었으면 그대로 꺼진 상태다.
- v1.4가 켜져 있는 채로 설치하면 두 위젯이 함께 뜰 수 있다. v1.4와 v2.0은 두 번 실행을 막는 방식이 서로 다르기 때문이다. 릴리스 안내에 "먼저 기존 위젯을 종료하세요"를 적는다. 깜빡해도 재부팅하면 자동 실행이 v2.0만 띄운다.
- v1.4 데이터를 넣어 둔 PC에 v2.0을 설치해 보는 확인을 Windows 체크리스트에 둔다.

## 10. 빌드, 배포, 출시

**자동 검사 (GitHub Actions, Windows·macOS 양쪽)**
1. Vitest(층 구조·PRIV-01 구조 테스트 포함), `cargo test`
2. spec ID 연결 검사
3. 다국어 사전 키 검사
4. 빌드

**출시 절차**
1. 버전 태그를 올리면 Windows 설치 파일(NSIS, x64), macOS dmg(universal), `latest.json`이 Release 초안으로 만들어진다.
2. OS별 직접 확인 체크리스트를 진행한다. **두 OS 모두 PM이 한다**(PM 결정, 2026-10-07). 개발은 Mac에서 하므로 Windows 창을 직접 띄울 수 없고, PM의 다른 창이 찍히지 않게 화면을 캡처하지 않으므로 macOS 화면도 볼 수 없다. 개발은 확인 스크립트와 시험 데이터를 준비한다. 체크리스트는 매 출시 묶음과 v2.0.0(또는 바뀐 부분) 묶음으로 나누고, OS 하나에 매 출시 15~20분, v2.0.0 전체 45~60분쯤 걸린다(`spec/release.md`).
3. PM이 승인하면 공개한다.

**버전**
- 새 앱은 v2.0.0부터 시작한다. 버그 수정은 패치(2.0.1), 기능 추가는 마이너(2.1.0)를 올린다.
- 업데이트는 앞으로만 간다. 문제가 생기면 고친 버전을 바로 낸다.

**서명**
- macOS 빌드는 ad-hoc 서명만 한다. 실행에 필요한 최소한이다.
- 업데이트 서명 키는 개발이 한 번 만들어 GitHub Secrets에 넣는다. 백업 사본은 PM이 비밀번호 관리자 등에 보관한다. 키를 잃으면 모두가 한 번 더 직접 설치해야 한다.

**v2.0 출시 순서**
1. 저장소 이름을 `todo-widget`으로 바꾼다. 실행 직전에 PM 확인을 받는다. 업데이트 주소가 앱에 박히므로 v2.0 빌드 전에 해야 한다.
2. 새 이름의 업데이트 주소로 v2.0.0을 빌드한다.
3. README를 Windows·macOS 설치 안내로 새로 쓴다. 첫 실행 경고를 넘기는 방법을 포함한다. README와 릴리스 안내는 영어로 쓴다(PM 결정, 2026-10-07).
4. 출시하고, 지인들에게 새 링크를 보낸다.

## 11. 가벼움 기준

v1.4의 "가볍고 빠르다"를 숫자로 정한다. 실제로 재서 크게 다르면 PM과 다시 정한다.

| 항목 | 기준 |
|---|---|
| 평소에 켜고 위젯이 보일 때까지 | 0.5초 이내 (목표. 계획 2 Mac 측정 428ms로 그대로 둔다. 계획 5에서 실제 화면으로 다시 잰다) |
| 로그인 직후 자동 실행으로 보일 때까지 | 2초 이내 |
| 가려진 위젯을 다시 부를 때 | 0.1초 이내 |
| 할 일 추가·상태 변경 후 화면 반영 | 바로 (체감 지연 없음) |
| 가만히 있을 때 CPU | 거의 0% |
| 가만히 있을 때 메모리 (관련 프로세스 합) | Windows 150MB 이하, macOS 120MB 이하 |
| 설치 파일 크기 | 각 15MB 이하 |

Windows에서는 WebView2 때문에 v1.4보다 메모리를 더 쓸 수 있다. 체감 속도에는 영향이 없을 것으로 본다.

## 12. 위험과 초기 확인

개발 초기에 실제로 띄워서 확인하고, 기대와 다르면 바로 PM에게 보고한다.

결과는 계획 2 위험 확인(Mac, 2026-10-03)의 결과다. 자세한 숫자와 방법은 [보고서](../reports/2026-10-03-plan2-risk-check.md)에 있다. Windows 항목은 아직 확인하지 않았다.

| 항목 | 확인할 것 | 결과 |
|---|---|---|
| macOS 창 | 투명 배경 + 둥근 카드 + 그림자, 헤더로 이동 | 통과. 투명한 둥근 카드, 투명도 슬라이더, 헤더로 이동이 된다. 그림자는 잘 안 보여 계획 5 디자인에서 v1.4에 맞춘다 → 계획 5에서 PM 승인 시안의 그림자 값(0 3px 12px rgba(60,50,40,.16), 투명도에 따라 옅어짐)으로 맞췄다. 계획 5 Task 15 확인 2번에서 PM이 눈으로 확인했다 ([보고서](../reports/2026-10-03-plan2-risk-check.md) Step 5) |
| macOS 창 크기 조절 | 가장자리와 모서리를 끌어 크기 바꾸기 (WND-03) | 실패 → 계획 4. tao 0.37.1이 macOS에서 `drag_resize_window`를 지원하지 않는다(`NotSupported`). macOS는 가장자리를 누른 채 움직이는 포인터를 따라 창 크기를 직접 바꾼다(`setSize`). Windows는 OS 기본 크기 조절을 그대로 쓴다 ([보고서](../reports/2026-10-03-plan2-risk-check.md) Step 5). 계획 4에서 두 OS 모두 직접 구현으로 바꿨다(13장 개발 결정) |
| macOS 메뉴 막대·Spaces | Dock 숨김, 메뉴 막대 아이콘, 모든 Spaces 따라다니기 | 통과. Dock·Cmd+Tab에 없고, 메뉴 막대 아이콘 클릭·메뉴·다시 열기가 되고, 모든 데스크톱에 보인다 ([보고서](../reports/2026-10-03-plan2-risk-check.md) Step 5) |
| macOS 전체 화면 | 📌일 때 전체 화면 위 표시 (처음 계획) | PM 결정으로 바뀜. 📌를 켜도 전체 화면 앱 위에 뜨지 않았고, PM이 숨는 쪽을 골랐다. 이제 전체 화면에서는 📌와 관계없이 숨는다(MAC-07). 전체 화면 위 표시 코드는 지웠다 ([보고서](../reports/2026-10-03-plan2-risk-check.md) Step 5) |
| IME | 한글·중국어(병음) 조합 중 Enter로 정확히 하나 추가, 이어서 입력 | 통과 (Mac). 한글, 중국어 병음 모두 하나만 추가되고 이어서 입력된다. Windows는 확인 전 ([보고서](../reports/2026-10-03-plan2-risk-check.md) Step 5) |
| 시작 시간 | 11장 기준 측정 (PERF-01) | 통과 (Mac). 중앙값 428ms, 기준 500ms와의 여유는 70ms쯤이다. 설치·업데이트 뒤 첫 실행은 2.3초였다(PERF-01 조건 밖, 참고). probe 기준(실행 파일 로딩과 화면 합성 제외)이라 실제보다 짧다. 계획 5 Task 15에서 실제 화면으로 다시 재어 중앙값 470ms(통과, 여유 30ms쯤). Windows는 확인 전 ([보고서](../reports/2026-10-03-plan2-risk-check.md) Step 2) |
| 메모리 | 11장 기준 측정 (PERF-04) | 통과 (Mac). 관련 프로세스 4개 합 53.5~57.5MB, 기준 120MB. 계획 5 실제 화면에서 약 61MB. Windows는 확인 전 ([보고서](../reports/2026-10-03-plan2-risk-check.md) Step 3) |
| 가만히 있을 때 CPU | 11장 기준 측정 (PERF-03) | 통과 (Mac, 계획 5에서 다시 잼). 계획 2 빈 화면에서는 1분 평균이 6구간 중 5구간은 1% 미만, 1구간은 1.2%였다(주의). 계획 5 실제 화면에서는 켠 뒤 가만히 둔 2분 동안 앱 0%, WebKit 약 0.1%였다 ([보고서](../reports/2026-10-03-plan2-risk-check.md) Step 3) |
| 설치 파일 크기 | 11장 기준 측정 (PERF-05) | 통과 (Mac). dmg 1.55MB, 기준 15MB. Windows는 확인 전 ([보고서](../reports/2026-10-03-plan2-risk-check.md) Step 1) |
| Windows 자동 실행 | plugin을 쓰지 않고 직접 구현한다. `Run`의 값 이름 `TodoWidget`(v1.4와 같음)과 작업 관리자의 끈 표시(`StartupApproved\Run`)를 실제 Windows에서 읽고 쓰는지 (WIN-03, WIN-04) | 계획 4에서 구현했다(`todowidget_windows::run_key`). 실제 레지스트리 읽기·쓰기는 Windows CI의 Rust 테스트로 보고, 작업 관리자 표시는 Windows PC에서 확인한다 |
| macOS 자동 실행 | 로그인 항목(SMAppService)을 직접 구현한다. 켜기·끄기·상태 읽기와 켤 때마다 다시 등록하기가 실제 macOS에서 되는지 (MAC-08) | 통과. 등록·해제·상태 읽기가 된다. 로그아웃 뒤 다시 로그인했을 때 실제로 켜지는지는 PERF-06 확인 때 본다 ([보고서](../reports/2026-10-03-plan2-risk-check.md) Step 6) |
| macOS 자동 실행과 ad-hoc 서명 | ad-hoc 서명은 빌드마다 바뀐다. 그래서 업데이트할 때마다 로그인 항목이 "승인 필요"가 되거나 사라질 수 있고, 그러면 MAC-08이 자동 실행을 꺼짐으로 읽는다. 계획 2 초기 확인에서 두 빌드로 업데이트해 보고, 그렇다면 PM과 대응을 정한다 | 통과. 2.0.0으로 등록하고 2.0.1로 덮어써 서명(CDHash)이 바뀐 뒤에도 켜짐으로 남았다. MAC-08 방식을 그대로 간다 ([보고서](../reports/2026-10-03-plan2-risk-check.md) Step 6) |
| Windows WebView2 | Windows 10에서 WebView2가 없으면 설치 파일이 함께 설치하는지 | Windows 확인 전 |
| macOS 업데이트 | 새 macOS가 나오면 투명 창(`macOSPrivateApi`)이 계속 동작하는지 | 지금은 해당 없음. 새 macOS가 나오면 MAC-12로 본다 |

## 13. 기술 선택 기록

| 후보 | 결론 | 이유 |
|---|---|---|
| Avalonia (C# 유지) | 탈락 | Core와 테스트는 살지만 UI는 사실상 다시 써야 한다. macOS 한글 IME가 가장 큰 위험이었다. |
| OS별 네이티브 (WPF + SwiftUI) | 탈락 | 가장 네이티브하지만 기능을 추가할 때마다 두 번 구현해야 한다. |
| Tauri (채택) | 채택 | 코드 하나로 두 OS를 지원하고, 브라우저 엔진의 IME 처리가 성숙하다. CSS로 OS별 겉모양을 다듬기 쉽고, 설치 파일이 작다(v1.4는 130MB). 자동 실행, 두 번 실행 방지, 업데이트가 공식 plugin으로 있다. |
| Electron | 제외 | 가볍다는 기준에 맞지 않는다. |

### 13.1 계획 4 개발 결정 (2026-10-04)

계획 4(`docs/superpowers/plans/2026-10-04-v2-adapters-and-platform.md`) "개발 결정" 표에서 옮겼다.

| 결정 | 이유 |
|---|---|
| **크기 조절은 두 OS 모두 직접 구현한다.** pointer로 끌고, Rust `set_frame`이 위치와 크기를 한 번에 바꾼다 | tao가 macOS 크기 조절을 지원하지 않는다(계획 2). Windows의 기본 크기 조절은 끝난 때를 알려 주지 않는다. WND-03 "놓으면 저장"을 두 OS에서 같은 코드로 지키려면 직접 하는 쪽이 단순하다 |
| **창 옮기기는 OS 기본 끌기를 쓴다.** 저장은 마지막 이동 신호 0.5초 뒤에 한다 | 기본 끌기가 가장 매끄럽다. 어느 OS도 끌기가 끝난 때를 알려 주지 않는다 |
| **Windows 전용 Rust 코드는 Tauri 없는 crate로 나눈다** | Mac에서 `cargo check --target x86_64-pc-windows-msvc`로 검사할 수 있다. 앱 crate는 Windows 리소스 컴파일러(llvm-rc)가 없으면 Mac에서 검사되지 않는다. Tauri를 링크한 테스트가 Windows CI에서 뜨지 않을 위험(계획 2)도 피한다 |
| **데이터 폴더는 Rust가 정한다** (`dirs::data_dir()` + `TodoWidget`, `TODOWIDGET_DATA_DIR`) | WebView는 환경 변수를 읽지 못한다. TS `resolveDataDir`는 지운다 |
| **업데이트 port는 나누지 않는다** | `prepareRestart`가 받기 전에 이미 설정과 할 일 저장을 마친다. 그래서 Windows 설치 프로그램이 앱을 끝내도 잃는 것이 없다 |
| **업데이트 서명 키는 이 계획에서 개발용을 쓴다** | 개인 키는 버린다. 실제 키와 GitHub secret은 계획 6에서 PM과 만든다. 그 전에는 출시하지 않으므로 업데이트가 설치될 일이 없다 |
| **`startApp`의 예상 못 한 오류도 STORE-10 대화 상자로 보여 주고 끝낸다** | 시작 중 오류는 거의 모두 파일 문제다. 새 문구를 만들지 않고 오류 내용을 함께 보여 준다 |
| **메뉴 막대 "종료"와 창 닫기(Alt+F4)는 JS의 종료 흐름을 거친다.** JS가 3초 안에 끝내지 않으면 Rust가 끝낸다 | WND-14는 종료할 때 위치를 저장한다. Rust에서 바로 끝내면 저장하지 못한다 |
| **잠자기에서 깨어남은 1분마다 시계를 보고, 2분 넘게 건너뛰었으면 깨어난 것으로 본다** | OS별 전원 알림을 쓰는 것보다 단순하다. 1분 간격이라 CPU 영향이 없다(PERF-03) |

계획 4를 실행하며 더하거나 바꾼 결정이다.

| 결정 | 이유 |
|---|---|
| **로컬 Windows 대상 검사는 `todowidget-core`와 `todowidget-windows`만 한다.** 앱 crate의 Windows 빌드는 CI에서 확인한다 | updater가 ring을 끌어오고, ring의 C 빌드에는 MSVC 헤더가 필요하다. Mac에서는 llvm이 있어도 앱 crate를 Windows 대상으로 검사할 수 없다. 그래서 앱 crate의 Windows 코드(`platform/windows.rs`)는 얇게 두고, 로직은 두 crate에 둔다 |
| **STORE-10 대화 상자는 Rust 명령 `show_error_dialog`가 창 없이(parent 없이) 띄운다.** JS 패키지 `@tauri-apps/plugin-dialog`는 지웠다 | STORE-10에서는 위젯 창이 숨어 있다. 창에 붙인 macOS sheet는 보이지 않고 닫히지도 않는다 |
| **창을 띄울지는 `ShowGate`가 한 번만 정한다(정하지 않음·띄움·숨긴 채 둠).** 다시 실행·메뉴 막대 "열기"·Reopen은 `reveal()`을 거치고, 숨긴 채 두기로 정했으면 아무것도 하지 않는다 | STORE-10 대화 상자 중에 다시 실행해도 빈 창이 뜨지 않게 한다 |
| **OS 이름은 Rust `platform::OS_NAME`이 준다** (`app_info` 명령) | OS 분기를 `platform/` 안에 둔다(5.4). JS는 받은 이름으로 좌표 단위(`coordinates.ts`)와 📌 뒤 WebView 포커스 돌려주기(`window-controller.ts`, Windows만)를 고른다 |
| **크기 조절 pointer 추적은 듣기를 바로(동기로) 건다.** `pointerup` 말고도 `buttons === 0`이나 `lostpointercapture`가 오면 끝낸다 | 시작 값을 읽는 동안 놓은 pointer를 놓치면 창이 마우스를 계속 따라간다 |

**쓴 plugin과 crate**

| plugin·crate | 고른 이유 |
|---|---|
| `tauri-plugin-single-instance` | 공식 plugin이고, 세 OS를 지원한다 |
| `tauri-plugin-updater`, `tauri-plugin-process` | 공식이고, 서명을 확인한다 |
| `tauri-plugin-dialog` (Rust crate만) | 공식이고, OS 대화 상자를 띄운다 |
| `windows-registry` (`windows-result`) | Microsoft가 만들었다. `windows-result`는 레지스트리 오류에서 "없음"을 가려내는 데 쓴다 |
| `windows-sys` | Microsoft가 만들었다. 창 위치·크기를 한 번에 바꾼다(`SetWindowPos`) |
| `objc2-app-kit` | 계획 2부터 쓰는 objc2 묶음이다. 필요한 feature만 켜서 창 영역을 한 번에 바꾼다(`NSWindow`) |
| `sys-locale` | 작고, OS 언어를 BCP 47로 준다 |
| `dirs` | Tauri가 이미 쓴다 |

### 13.2 계획 5 개발 결정 (2026-10-06)

계획 5(`docs/superpowers/plans/2026-10-06-v2-presentation.md`) "개발 결정" 표에서 옮겼다. 다른 곳에서 번호(D1 등)로 가리키므로 번호 칸을 남긴다.

| # | 결정 | 이유 |
|---|---|---|
| D1 | **ViewModel은 Svelte 5 runes를 쓰는 class이고 `.svelte.ts` 파일로 `src/presentation/`에 둔다.** 동작 규칙은 ViewModel과 순수 TS 도우미에 두고 Vitest node 환경으로 테스트한다. 서비스는 `RunningApp`으로 받는다 | 서비스 변경 알림(`onChange`)을 `$state` 하나로 받아 getter가 다시 계산되게 하면, 화면 상태를 따로 복사하지 않아도 된다. 설계 문서 5.1의 "ViewModel은 Svelte에 의존하지 않는다"는 이 결정으로 바뀐다(Task 14). runes는 컴파일러 문법이라 ViewModel 코드에는 `svelte` import가 없다 |
| D2 | **컴포넌트 테스트는 DOM 이벤트 연결이 핵심인 것만** `@testing-library/svelte` + `happy-dom`으로 한다(파일 첫 줄 `// @vitest-environment happy-dom`) | 키보드·IME·붙여넣기·포커스는 이벤트를 실제로 흘려야 확인된다. 나머지는 ViewModel 테스트가 더 빠르고 덜 깨진다 |
| D3 | **Enter는 `isComposing`이거나 `keyCode === 229`이면 쓰지 않는다.** 확정 뒤 OS가 다시 보내는 Enter나 사용자가 다시 누른 Enter로 정확히 한 번 추가·저장한다. 판단은 순수 함수 `isCommitEnter`다. 이름 바꾸기 칸은 `beforeinput`의 줄바꿈 입력도 막는다 | INPUT-05는 어느 방식이든 바깥 결과가 같으면 된다. **이 규칙 그대로는 검증된 적이 없다.** 계획 2에서 Mac의 한글·병음으로 통과한 것은 `isComposing`만 보는 규칙이다(커밋 `9ee7d6e` 시험 화면). keyCode 229도 보는 것은 병음처럼 조합을 끝내는 Enter가 `isComposing: false, keyCode: 229`로 오는 경우에 할 일이 잘못 추가되지 않게 하려는 것이다. 반대로 한글처럼 조합을 끝내는 Enter가 그 모양으로 한 번만 오면 Enter를 두 번 눌러야 한다. 그래서 Task 15 확인 3번에서 (a) 한글 Enter 한 번 추가, (b) 병음 확정 Enter는 추가하지 않음을 따로 본다. (a)가 실패하면 `isComposing`만 보는 계획 2 규칙으로 돌리고 controller에게 알린다. (a)와 (b)가 서로 부딪히면 PM에게 묻는다 |
| D4 | **메뉴 막대 문구는 Rust 명령 `set_tray_labels { open, quit }`로 JS가 켤 때 넘긴다.** Rust 기본값은 영어 "Open"/"Quit"이고 곧바로 덮어쓴다 | Rust에 사전을 두지 않는다(I18N-02). 기본값은 JS가 실패해도 메뉴가 비지 않게 하려는 것이다 |
| D5 | **창 높이는 카드 `ResizeObserver` → `WindowPlacement.fitToContent(높이)`로 맞춘다.** 최대 높이로 제한하고, 크기를 끄는 동안은 무시한다. 메뉴용 임시 늘리기는 `expand(raise, height)`·`restore()`이고 저장하지 않는다 | WND-03 "내용이 짧으면 창은 내용만큼". v1.4 `SizeToContent`와 같은 동작을 창 밖에서 맞춘다 |
| D6 | **⋯ 메뉴와 우클릭 메뉴는 같은 `Menu` 컴포넌트다.** 방향키로 고를 수 있는 항목 사이를 돌고(v1.4 T:166), Enter·Space로 고르고, Esc로 닫는다. 우클릭 메뉴는 판 왼쪽 위가 커서 자리다 | v1.4와 같은 카드 모양·같은 조작. 설계 문서 6장 |
| D7 | **아이콘 글리프는 시안의 SVG symbol을 그대로 `Icon.svelte`로 옮긴다** | 설계 문서 6장: Segoe 글리프를 같은 모양의 SVG로 |
| D8 | **I18N-02 자동 검사 규칙과 예외.** presentation의 `.svelte`·`.ts`에서 (1) 템플릿 글자 중 글자(문자)가 있는 것, (2) `title`·`placeholder`·`aria-label`·`alt` 속성의 고정 글, (3) 문구처럼 보이는 문자열 리터럴을 찾는다. 예외: 글자 없는 것(⋯ · % + 숫자), 공백 없는 기술 낱말(`'keydown'`, `'app.title'`, `'text/plain'`), 소문자 CSS 클래스 목록(`'row doing'`), 주석, `<style>`, `console.*(…)`·`new Error(…)`의 첫 인자(개발자용), 사전 파일 네 개 | 계획 1이 미뤄 둔 예외 목록이다. 화면에 보일 글은 놓치지 않고 기술 문자열은 통과시킨다. 글자가 ASCII가 아니면(한글·한자·움라우트) 늘 문구로 본다 |
| D9 | **창 높이 바꾸기는 `WindowPlacement` 안에서 하나씩 차례로 한다.** 늘린 동안 생긴 이동 신호로는 위치를 저장하지 않고, 종료할 때는 먼저 되돌린 뒤 위치를 저장한다 | 맞추기·늘리기·되돌리기가 겹치면 창 높이가 뒤섞인다. 늘린 동안의 창 위쪽은 사용자의 위치가 아니다(WND-14) |
| D10 | **늘린 투명 부분을 누르면 메뉴를 닫는다.** macOS는 alpha 0 픽셀의 클릭이 뒤 앱으로 넘어가므로 창이 포커스를 잃는 것(`window` `blur`)으로 닫는다. Windows처럼 클릭이 창에 오면 메뉴 아래에 깐 투명 막(`backdrop`)이 받아 닫는다. 확인 판도 `blur`로 닫는다(취소) | 계획 4 PM 확인에서 macOS의 alpha 0 클릭 통과를 확인했다. 두 길 모두 "바깥을 누르면 닫힘"(v1.4 ContextMenu)과 같다. 같은 까닭으로 창이 포커스를 잃으면 열린 이름 바꾸기 칸에도 blur가 와서 이름이 저장된다(INPUT-14의 "다른 곳 클릭"을 앱 전환까지 넓힌 것. 해가 없어 동작은 그대로 두고 Task 15 확인 12번에서 본다) |
| D11 | **메뉴가 위로 열려 창 위로 나가면 창 위쪽을 올리고, 내용을 그만큼 아래로 민다(`lift`).** 카드는 화면에서 제자리다. 내용은 창을 올린 뒤에 밀고, 창을 되돌린 뒤에 올린다(PM 확인, 2026-10-06). 먼저 밀면 창 이동 IPC가 끝날 때까지 카드가 튀어 보인다. 창 이동(OS)과 웹 화면 다시 그리기(WebView)는 따로 일어나므로, 화면 맨 아래에서 위로 열 때 한 프레임 깜빡임이 남는다. PM 결정 2026-10-06: 알려진 한계로 둔다. 없애려면 메뉴를 별도 투명 창에 띄워야 하며 계획 6 이후 후보 | WND-10 "아래 공간이 모자라면 ⋯ 버튼 위로". ⋯ 버튼은 창 맨 위에 있어 위로 뜬 메뉴는 창 밖이다 |
| D12 | **켤 때 자동 실행 등록·경로 갱신은 기다리지 않는다.** 실패는 그대로 조용히 넘어간다 | PERF-01. macOS `SMAppService` 등록은 시스템 서비스를 거친다. 결과를 화면이 쓰지 않는다(메뉴를 열 때 다시 읽는다, START-04) |
| D13 | **메뉴 막대 아이콘은 36×36 PNG 한 장이다.** tray-icon 0.25가 높이를 늘 18pt로 맞추므로 @2x 해상도가 된다 | tray-icon은 이미지 한 장만 받는다(`platform_impl/macos/mod.rs` 281줄). @1x 화면에서는 OS가 줄여 그린다 |
| D14 | **아이콘 PNG·icns·ico는 저장소의 SVG 원본에서 `pnpm tauri icon`으로 만든다** | 새 도구가 필요 없다. 원본이 저장소에 있어 다시 만들 수 있다 |
| D15 | **글꼴 목록은 `theme.css`의 CSS 변수(`--font-macos-ko` 등 6개)로 두고, TS는 OS·언어로 변수 이름만 고른다** | 글꼴 이름이 한 곳에 있다. 글꼴 이름("Apple SD Gothic Neo")이 I18N-02 검사에 걸리지 않는다 |
| D16 | **섹션 높이는 DOM으로 재고 나누기는 domain `allocateSectionHeights`가 한다.** 섹션은 flex로 쌓는다 | LIST-13~15는 v1.4 `SectionLayout`과 같은 배분이다. 최소 높이는 실제 첫 줄 높이로 잰다(긴 제목 첫 줄도 맞다). 섹션과 줄 묶음(`.rows`)을 모두 flex column으로 쌓아 margin이 겹치지 않게 한다. 그래서 `offsetHeight`가 줄의 위아래 margin까지 포함해 측정이 정확하고, 줄 사이 간격도 v1.4와 같은 2px이다(리뷰 I1). 카드에는 최대 높이를 걸고 섹션 영역은 `overflow: hidden`이라, 최소 높이 합이 넘쳐도 입력칸은 잘리지 않고 섹션이 잘린다(v1.4 DockPanel과 같다, 리뷰 I3) |
| D17 | **이름 바꾸기 칸은 `textarea`다.** 높이는 내용에 맞추고, 줄바꿈 입력은 막는다 | 긴 제목이 칸 안에서 줄을 바꿔 전부 보인다(LIST-11, v1.4 TextBox Wrap). `input`은 한 줄로 잘린다 |
| D18 | **독일어 `notice.newerFile`은 짧게 번역한다**("Datei aus neuerer Version. Bitte aktualisieren.") | 실패 안내와 업데이트 버튼이 함께 붙어도 최소 폭 280에서 두 줄 안에 들어가게(안내 줄 정의). 시안의 독일어 문장은 예시였다 |
| D19 | **처음 창을 보이기 전 크기는 마운트 직후 바로 잰다.** 그 뒤의 변화는 `ResizeObserver`로 받는다 | 숨긴 창에서는 `requestAnimationFrame`처럼 `ResizeObserver`도 오지 않을 수 있다. 오지 않으면 3초 대비책이 창을 띄워 PERF-01을 놓친다 |
| D20 | **`keep_hidden`은 대비책이 이미 창을 띄운 뒤에도 창을 숨기고 숨김으로 정한다**(`ShowGate::hide`) | R14: 시작이 3초를 넘긴 뒤 STORE-10이면 대화 상자 뒤에 빈 창이 남았다. 대화 상자 뒤에는 곧 끝나므로 숨김이 늘 맞다 |
| D21 | **테스트용 `RunningApp`은 `src/testing/test-app.ts`의 `createTestApp()`이 가짜 port로 만든다** | ViewModel·컴포넌트 테스트가 같은 준비를 쓴다. `launchApp`을 쓰면 업데이트 확인과 읽기 다시 시도 타이머가 끼어든다 |
| D22 | **실패 보고는 `Report(action, error)`다.** action은 짧은 영어 낱말(`'pin'`, `'quit'`), 기본 구현은 `console.error` | 누르고 잊는 호출이 처리하지 않은 거부로 남지 않게 한다. 개발자 도구에서만 본다 |
| D23 | **투명도 슬라이더는 `input type="range"`에 시안 모양을 입힌다** | 클릭한 자리로 바로 가기(v1.4 IsMoveToPointEnabled), 끌기, 키보드가 기본으로 된다. WebKit·Chromium 모두 `::-webkit-slider-*`로 꾸민다 |
| D24 | **PM 확인 데이터 폴더에는 `settings.json`을 미리 만든다** | 처음 실행이 아니게 되어 release 빌드가 로그인 항목을 저절로 등록하지 않는다(START-02). 계획 4 확인 중 재시동 사고(실제 폴더 사용)를 막는다. 확인 스크립트는 앱을 켜는 모든 명령(`start`, `again`, `probe`)이 먼저 이 파일을 만든다 |
| D25 | **입력칸과 이름 바꾸기 칸에서는 OS 기본 우클릭 메뉴(잘라내기·복사·붙여넣기)를 막지 않는다.** 이름 바꾸기 중인 줄은 우클릭해도 할 일 메뉴를 열지 않는다. 그 밖의 곳은 WebView 기본 메뉴(새로 고침 등)를 막는다 | v1.4 TextBox에는 기본 잘라내기·복사·붙여넣기 메뉴가 있었다(controller 판단, 리뷰 M5) |
| D26 | **투명도 휠은 칸을 이렇게 센다.** (1) `deltaY`가 0이면 칸이 아니다. (2) 줄·쪽 단위(`deltaMode` 1·2)는 이벤트 하나가 한 칸이다. (3) 옛 값 `wheelDeltaY`가 0이 아니고 120의 배수이면 마우스 휠의 칸이고, `wheelDeltaY` 절댓값 ÷ 120이 칸 수다. (4) 그 밖의 픽셀 단위(트랙패드, Magic Mouse)는 `deltaY`를 쌓아 절댓값 50px마다 한 칸으로 센다. 한 칸이 2%다. 방향은 실제 손가락·휠 방향이고(P6), WebKit의 `webkitDirectionInvertedFromDevice`로 되찾는다. 칸 수는 `wheelDeltaY`로, 방향은 `deltaY`로 정한다. 계산은 순수 TS `WheelSteps`(Task 7)가 한다 | 트랙패드 가로 쓸기·Shift+휠이 "덜 투명하게"로 읽히지 않고, 트랙패드 쓸기 한 번에 0→40%가 끝까지 가지 않는다(리뷰 I4). Chromium(WebView2)과 WebKit은 끊어지는 마우스 휠 한 칸에 `wheelDeltaY`를 ±120으로 준다. 그래서 Windows 마우스의 `deltaY`가 100이든 125든, 화면 배율이 얼마든 한 칸이 정확히 2%다(controller 판단) |
| D27 | **메뉴 자리를 정하는 동안 메뉴가 닫히면 늦게 온 창 늘리기를 버린다.** `WindowViewModel`이 popup 세대 번호(`popupToken`)를 두고, `clearPopup`이 번호를 올린다. 메뉴는 자리를 정하기 시작할 때 번호를 받아 `fitPopup`에 넘긴다 | 화면 공간을 읽는 IPC를 기다리는 사이 닫히면, 되돌릴 사람이 없는 늘린 창과 `lift`가 남아 창 맞추기와 위치 저장이 멈춘다(리뷰 M1) |

계획 5를 실행하며 더하거나 바꾼 결정이다. 계획 문서의 표에 없으므로 틀렸을 때 비용도 여기에 적는다.

| 결정 | 이유 | 틀렸을 때 비용 |
|---|---|---|
| **D8 보완 (Task 13 리뷰): 자동 검사 범위를 넓히고 놓치는 것을 바로 적었다.** template literal의 값 자리는 `{n}`으로 읽고, 숫자만 있는 낱말은 CSS 클래스 이름으로 보지 않는다. `label`·`aria-*` 속성과 버튼 `<input>`의 `value`도 본다(7장) | 처음 규칙으로는 `` `${count} tasks left` ``(값 자리를 빼면 소문자 낱말만 남는다), `'3 tasks left'`(클래스 목록으로 읽혔다), `label`·`aria-*`·버튼 `value`에 쓴 문구가 빠져나갔다. D8의 "소문자 영어 한 낱말 문구만 놓친다"는 너무 좁았다. 실제로는 문자열 리터럴과 `aria-*` 값에서 영어 한 낱말 문구(대소문자 무관, 예: `'Menu'`, `'Cancel'`), 소문자 영어 낱말만 이은 문구(예: `'add a task'`), 문자열 이어 붙이기를 놓친다 | 놓친 문구가 화면에 나가면 다른 화면 언어에서도 영어로 보인다. 체크리스트 I18N-07에서 잡는다 |
| **(Task 4) `AutoStartControl`은 켤 때 자동 실행 등록 약속(`autoStartDone`)을 처음 줄(queue)로 받는다.** 켜자마자 ⋯ 메뉴에서 자동 실행을 바꾸면 켤 때의 갱신·켜기가 끝난 뒤에 처리한다 | 켤 때 등록을 기다리지 않으므로(D12) 그 사이 사용자가 끄면 뒤늦은 갱신이 다시 등록할 수 있다. START-03(사용자가 끈 자동 실행을 다시 켜지 않는다)이 계획 글("`launchApp`은 `autoStartDone`을 쓰지 않는다")보다 앞선다 | 켜자마자 메뉴에서 자동 실행을 바꾸면 OS 호출이 끝날 때까지 기다린다. 메뉴 표시도 같은 줄을 기다린다(최종 리뷰 M6): 등록이 끝나기 전에 열면 체크는 끝난 뒤의 상태로 보인다. 그래야 누를 때 바꾸는 방향과 체크가 맞다(START-04) |
| **(Task 7) Windows 정밀 터치패드에서는 휠의 실제 방향을 되찾지 못한다.** WND-12의 알려진 한계로 두고 Windows PC에서 확인한다(계획 6) | WebView2(Chromium)에는 `webkitDirectionInvertedFromDevice`가 없다. 그래서 OS 스크롤 방향 설정이 반영된 `deltaY`만 받는다(D26) | 터치패드 스크롤 방향을 뒤집어 둔 Windows 사용자는 투명도가 반대로 바뀐다 |
| **(Task 8) 크기 조절이 끝나면 `WindowViewModel`이 끄는 동안 마지막으로 받은 내용 높이로 창을 다시 맞춘다**(WND-03) | 끄는 동안 온 내용 높이를 버리면 `WindowPlacement`가 끌기 전 내용 높이를 기억한다. 그러면 메뉴로 늘렸다 되돌릴 때 창이 끌기 전 높이로 줄어 카드 아래가 잘린다. spec WND-03이 계획 코드보다 앞선다 | 크기 조절마다 맞추기 IPC가 한 번 더 간다 |
| **(Task 11) 투명도 슬라이더(`input`)에서 온 Enter·방향키·Space는 메뉴가 처리하지 않는다.** Esc만 메뉴를 닫는다 | 방향키와 Space는 슬라이더가 값을 바꾸는 데 쓴다(리뷰 M11). Enter를 메뉴가 받으면 전에 강조해 둔 항목(예: 종료)이 슬라이더에서 골라진다 | 슬라이더에 포커스가 있을 때 Enter는 아무 일도 하지 않는다 |
| **(최종 리뷰 I1) 초기화 확인 판이 열린 채 가장자리를 누르면 판만 닫고(취소) 크기 조절은 시작하지 않는다.** `WidgetViewModel.startResize`가 막는다 | 판 때문에 늘린 창을 되돌리는 일(`clearPopup → restore`)은 App effect에서 늦게 돈다. 그래서 바로 크기 조절을 시작하면 끄는 도중에 창 높이 바꾸기가 끼어 창이 튀고, 저장되는 최대 높이·위치가 틀린다. 메뉴는 backdrop이 가장자리를 덮어 이 길이 없다. 원칙으로 고치려면 adapter가 시작 영역을 읽기 전에 남은 창 높이 바꾸기를 기다려야 하는데, port를 바꿔야 해서 이번에는 막기만 한다 | 확인 판이 열린 채 가장자리를 끌면 한 번 더 끌어야 크기가 바뀐다 |
| **(최종 리뷰 I3) IME가 넘긴 Esc(`keyCode` 229)는 입력칸·이름 바꾸기 칸이 무시한다.** `isComposing`이 false여도 거른다. PM 확인(2026-10-06)에서 그래도 글이 지워져 릴리스 빌드에 임시 계측을 넣고 실제 순서를 기록했다. macOS WKWebView 한글 두벌식은 composition 이벤트를 하나도 보내지 않는다. 조합 중 글자는 `insertReplacementText` 입력으로 바뀌고, 그 키의 keydown(keyCode 229, `isComposing` false)은 입력이 끝난 **뒤에** 온다. 조합 중 Esc는 입력기가 글자를 `insertReplacementText`로 확정한 뒤 `isComposing:false, keyCode:27` keydown으로 온다. keydown의 timeStamp는 OS 키 시각이라 그 입력보다 앞서, 시각으로는 가를 수 없다. 그래서 칸이 "마지막 keydown 뒤 입력기 편집(`insertReplacementText`, `insertCompositionText`)이 있었다"를 기록하고, 그 뒤 첫 keydown이 Esc면 거른다. 모든 keydown이 이 표시를 지우므로, 조합이 끝난 뒤 누른 Esc는 그대로 글을 지운다(INPUT-04). compositionstart~compositionend 사이 Esc도 거른다(`isCompositionEscape`). Windows WebView2 한글은 compositionend를 보낸 뒤 그 Esc를 손을 떼는 keyup보다 먼저 `keyCode:27` keydown으로 보내므로(추정, 2026-10-07 Windows 확인), compositionend 뒤 아직 keydown·keyup이 없을 때 온 Esc도 거른다 | WebKit에서 한글·병음 조합을 Esc로 끝내면 `isComposing:false, keyCode:229`인 keydown이 올 수 있다. D3이 Enter에서 막은 것과 같은 모양이다. 거르지 않으면 쓰던 글을 잃는다(INPUT-04·15) | 조합 중 Esc 한 번은 조합만 끝낸다. 글을 지우거나 이름 바꾸기를 취소하려면 Esc를 한 번 더 누른다 |

**쓴 라이브러리**

| 라이브러리 | 고른 이유 |
|---|---|
| `@testing-library/svelte` 5.4.2 (dev) | Svelte 5 공식 권장 컴포넌트 테스트 도구다. 실제 DOM 이벤트를 흘려 IME·붙여넣기·포커스를 본다 |
| `happy-dom` 20.14.5 (dev) | jsdom보다 가볍고 빠르다. 컴포넌트 테스트 파일에서만 켠다 |

### 13.3 계획 6 개발 결정 (2026-10-07)

계획 6(`docs/superpowers/plans/2026-10-07-v2-release.md`) "개발 결정" 표에서 옮겼다. 다른 곳(코드 주석 등)에서 번호(D7 등)로 가리키므로 번호 칸을 남긴다.

| # | 결정 | 이유 |
|---|---|---|
| D1 | 출시 판단은 `tools/release/*.ts` 순수 함수 + `cli.ts`. workflow는 CLI만 부른다 | REL-03·05·10, PERF-05를 Vitest로 검사할 수 있다. workflow YAML은 글자 검사만 한다 |
| D2 | `tauri-apps/tauri-action`을 쓰지 않고 `pnpm tauri build` + `gh release create --draft`로 만든다 | `latest.json` 모양과 파일 이름을 우리가 정하고 테스트한다. 바깥 action 하나를 덜 믿는다 |
| D3 | 업데이트 파일 서명(`createUpdaterArtifacts`)은 `src-tauri/tauri.release.conf.json`에서만 켠다 | 켜 두면 서명 키 없는 빌드(CI 시험 설치 파일, PM 확인 빌드)가 실패한다 |
| D4 | 시험용 업데이트 주소(REL-10)는 빌드 때 `--config`로 겹쳐 쓴다. `node tools/release/cli.ts endpoint-config`가 `TODOWIDGET_UPDATE_ENDPOINT`로 그 JSON을 만든다. 출시 workflow는 이 변수가 비었는지 먼저 보고, `endpoint-config`를 부르지 않는다 | 앱 코드는 바뀌지 않고 설정 파일만 다르다 |
| D5 | `latest.json`의 `darwin-aarch64`·`darwin-x86_64`는 같은 universal `TodoWidget.app.tar.gz`를 가리킨다. Windows는 `windows-x86_64` 하나(NSIS 설치 파일 자체가 업데이트 파일) | universal 하나로 두 CPU를 덮는다(REL-03) |
| D6 | 업데이트 설치 중(`installing`)에는 확인하지 않고 1시간 뒤로 미룬다. adapter도 설치 중에는 받아 둔 업데이트를 바꾸지 않는다 | 하루 한 번 확인이 설치 중인 업데이트를 닫거나 바꾸면 설치가 실패하거나 다른 파일을 설치한다(계획 4 넘김, 출시 전 필수) |
| D7 | ⋯ → 종료는 저장을 3초까지만 기다리고 끝낸다(`QUIT_SAVE_LIMIT_MS`). 할 일은 바꿀 때마다 이미 저장된다 | OS 쪽 종료 요청은 Rust가 3초 뒤 끝낸다(`QUIT_FALLBACK_DELAY`). ⋯ → 종료만 대비책이 없었다(계획 5 R10) |
| D8 | 측정 코드는 `probe` cargo feature(기본 꺼짐) 안에서만 동작한다. 측정할 빌드는 `--features probe`로 만든다. crate-type은 `rlib`만 남긴다 | 출시 빌드에 측정 코드를 남기지 않는다(계획 2 넘김). staticlib·cdylib는 모바일용이다 |
| D9 | universal dmg를 만들지만 Intel Mac에서 실제로 띄워 보지는 않는다 | 확인할 기기가 없다. Rust·WebKit 공통 코드라 위험은 낮다. PM에게 보고한다 |
| D10 | Release 초안은 태그가 main 위에 있을 때만 만든다(`git merge-base --is-ancestor`) | 기능 브랜치에서 실수로 출시하지 않는다 |
| D11 | 개인 키와 비밀번호는 파일로만 다루고 화면에 출력하지 않는다. 비밀번호는 `openssl rand`로 만든다 | 대화 기록에 비밀이 남지 않는다(Q2) |

계획 6을 실행하며 더하거나 바꾼 결정이다. 계획 문서의 표에 없으므로 틀렸을 때 비용도 여기에 적는다.

| 결정 | 이유 | 틀렸을 때 비용 |
|---|---|---|
| **(Task 4) `pnpm spec:check`가 `tools/release` 테스트를 요구사항 참조로 센다.** `tools/spec-check/config.ts`의 `TEST_GLOBS`에 `tools/release/**/*.test.ts`를 더했다(`spec/README.md`의 테스트 위치 목록도 같이). `tools/` 전체로 넓히지 않는다 | REL-03·05·10, PERF-05의 자동 테스트는 `tools/release/`에 있다(D1). 세지 않으면 이 항목들이 테스트 없는 자동 테스트 항목이 되어 `pnpm spec:check:strict`가 통과할 수 없다(REL-02). `tools/spec-check/` 테스트에는 검사기를 시험하는 예시 ID가 섞여 있어, `tools/` 전체를 세면 실제로 테스트하지 않는 요구사항까지 참조로 잡힌다 | 출시 도구 테스트를 `tools/release/` 밖에 두면 참조로 세지 않는다. 그때 `TEST_GLOBS`에 그 위치를 더한다. 되돌리려면 설정 한 줄과 문서 한 줄을 고친다 |
| **(Task 2) ⋯ → 종료의 3초 상한(D7)을 spec START-08에 적었다(PM 결정, 2026-10-07).** 쓰는 중인 할 일 저장을 기다리되 3초를 넘기지 않는다 | 3초는 OS 쪽 종료 요청에 이미 있는 Rust 대비책(`QUIT_FALLBACK_DELAY`)과 같아, 저장이 멈춘 경우만 달라진다. 보통은 저장이 바로 끝나 사용자에게 보이는 차이가 없다. 다만 종료 동작의 규칙이므로 spec에 넣을지는 PM이 정한다 | spec만 보면 3초 상한을 알 수 없다. START-08의 "할 일은 따로 저장하지 않는다"와 달리 종료는 진행 중인 할 일 저장도 기다린다. 저장이 3초를 넘기면 그 저장이 끝나기 전에 앱이 끝날 수 있다. PM이 spec에 적기로 하면 START-08 한 줄을 고친다 |
| **workflow의 action은 모두 커밋 SHA로 고정하고 버전을 주석으로 단다(PM 결정, 2026-10-07).** `ci.yml`·`release.yml`의 `uses:` 전부. 처음엔 다음 버전으로 미뤘으나 보안 점검에서 출시 전으로 당겼다 | 출시 build job은 서명 키를 받는다. 태그로 부르는 바깥 action(`pnpm/action-setup`, `Swatinem/rust-cache`)은 그 태그가 바뀌면 같은 runner에서 키를 훔치거나 악성 빌드에 정상 서명을 붙일 수 있다 | 고정한 버전의 보안 수정을 자동으로 받지 못한다. 올릴 때는 새 태그의 SHA를 확인해 직접 바꾼다 |
