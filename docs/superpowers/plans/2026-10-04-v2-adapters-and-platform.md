# v2.0 OS 연결 구현 계획 (계획 4/6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 계획 3의 port를 실제 OS에 연결한다.
- 파일 저장
- 자동 실행
- 두 번 실행 방지
- 창 위치·크기 조절
- 업데이트
- 언어 감지
- 종료

composition root(`src/main.ts`)가 이 모두를 이어, 시험 화면에서도 실제 데이터로 동작하게 한다.

**Architecture:**
- **TypeScript adapter(`src/adapters/`):** port를 구현하고, Tauri 명령과 Tauri JS API만 부른다.
- **Rust 쪽은 세 덩어리로 나눈다.**
  1. 앱 crate(`src-tauri/`): Tauri 명령, 창, 메뉴 막대, macOS 코드.
  2. `todowidget-core`(`src-tauri/crates/core/`): Tauri 없이 테스트하는 순수 로직(안전한 쓰기, 자동 실행 판정, 창 띄우기 대비).
  3. `todowidget-windows`(`src-tauri/crates/windows/`): Tauri 없는 Windows API(레지스트리, 창 영역).
- **흐름은 application에 둔다.** 창 배치와 종료 흐름은 application의 `WindowPlacement`·`AppLifecycle`·`launchApp`이 맡고, 가짜 port로 TDD한다.

**Tech Stack:**
- Tauri 2.12.1, Rust 1.99.0
- plugin: single-instance 2.5.2, updater 2.13.1, process 2.4.0, dialog 2.8.1
- Rust crate: windows-registry 0.6, windows-sys 0.61, objc2-app-kit 0.3, sys-locale 0.3, dirs 7
- TypeScript 5.9, Vitest 5

**Spec:**
- 기준: `spec/` 전체. 특히 `behavior/storage.md`(STORE-02, 18, 20), `startup.md`(START-01, 08), `window.md`(WND-02, 03, 09, 14와 용어 "크기와 좌표"), `update.md`(UPD-02, 04, 08), `platform/windows.md`, `platform/macos.md`, `00-principles.md`(PRIV-01).
- 설계 문서: `docs/superpowers/specs/2026-10-03-cross-platform-design.md` 5장(구조)과 13장(기술 선택).
- 앞 계획에서 넘어온 일:
  - 계획 2: `docs/superpowers/reports/2026-10-03-plan2-risk-check.md`의 "다음 계획으로 넘기는 일"
  - 계획 3: `docs/superpowers/plans/2026-10-03-v2-domain-and-application.md`의 "계획 4로 넘기는 일"

## 이 계획이 다루는 spec ID

| 문서 | 이 계획에서 자동 테스트로 연결하는 ID | 직접 확인 (Task 11에서 PM과 Mac으로 본다) |
|---|---|---|
| storage | STORE-02, STORE-18(Rust로 옮김), STORE-20(adapter 쪽) | STORE-10 대화 상자 |
| startup | START-08 | START-01 |
| window | WND-02, WND-03(계산), WND-09(창 적용), WND-14(창 위치) | WND-03 실제 끌기 |
| update | UPD-02, UPD-08(설정) | UPD-09는 계획 6 |
| windows | WIN-01, WIN-03, WIN-04 | WIN-02, WIN-07은 Windows PC가 생기면 |
| macos | MAC-01, MAC-08 | MAC-02~07 |
| principles | PRIV-01(Rust 의존성 검사 추가) | — |

화면(ViewModel, 4개 언어 사전, 내용만큼 줄어드는 창 높이)은 계획 5다. 이 계획의 화면은 계획 2의 시험 화면을 실제 서비스에 이은 것이다.

## 개발 결정 (이 계획에서 정함, 설계 문서 13장에 기록)

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

## Global Constraints

- **커밋 메시지:** `feat:`·`test:`·`refactor:`·`chore:`·`ci:`·`docs:` 뒤에 한국어로 쓴다. `Co-Authored-By` 줄은 넣지 않는다.
- **push 금지.** push는 Task 11에서 PM 확인을 받은 뒤에만 한다.
- **pnpm:** `corepack enable` 후 pnpm 10.33.2를 쓴다. `pnpm-lock.yaml`의 `lockfileVersion`은 `'9.0'`이어야 한다.
- **npm 의존성:** 이 계획에서 더하는 것은 `@tauri-apps/plugin-updater`, `@tauri-apps/plugin-process`, `@tauri-apps/plugin-dialog`뿐이고, 버전은 정확히 고정(`-E`)한다.
- **Rust 의존성:** 이 계획에서 더하는 것은 위 Tech Stack의 crate와 dev-dependency `tempfile = "3"`뿐이다. tauri plugin crate는 `=`로 고정한다.
- **TypeScript 문법:** 지울 수 있는 문법만 쓴다(`enum`, constructor parameter property, `namespace` 금지). import에 `.ts` 확장자를 붙이고, private 상태는 `#` 필드로 둔다.
- **층 규칙(설계 문서 5.1, `tools/architecture/rules.ts`):**
  - `@tauri-apps/*`는 `src/adapters/`와 `src/main.ts`에서만 쓴다.
  - 네트워크와 `@tauri-apps/plugin-updater`는 `src/adapters/updater/`에서만 쓴다(Task 7에서 규칙을 더한다).
  - domain·application은 바깥 패키지를 쓰지 않는다.
  - `src/testing/`은 테스트에서만 가져온다.
- **OS 분기 위치(설계 문서 5.4):** OS에 따라 다른 코드는 다음 위치에만 둔다.
  - `src-tauri/src/platform/{macos,windows}.rs`
  - `src-tauri/crates/windows/`
  - `src/adapters/tauri/coordinates.ts`(좌표 변환)
- **테스트 이름:** TypeScript 테스트 이름은 spec ID로 시작한다. Rust 테스트는 `#[test]` 바로 위(3줄 안)에 `/// ID 설명` 주석을 단다.
- **Task 끝 검사:** 매 Task 끝에 다음이 통과해야 한다.
  ```
  pnpm test && pnpm typecheck && pnpm spec:check
  cargo fmt --check --manifest-path src-tauri/Cargo.toml --all
  cargo clippy --manifest-path src-tauri/Cargo.toml --workspace --all-targets -- -D warnings
  cargo test --manifest-path src-tauri/Cargo.toml --workspace
  ```
  Windows 코드를 바꾼 Task는 `cargo check --manifest-path src-tauri/Cargo.toml -p todowidget-windows --target x86_64-pc-windows-msvc`와 같은 대상의 clippy도 통과해야 한다. 대상은 `rustup target add x86_64-pc-windows-msvc`로 한 번 설치한다.
- **화면 캡처 금지.** PM의 다른 창이 찍힌다.
- **subagent 모델:** 구현, 수정, 리뷰 모두 Opus를 쓴다(CLAUDE.md).
- **Rust 테스트 범위:** 앱 crate(`src-tauri/src/`)에는 테스트를 두지 않는다. Tauri를 링크하기 때문이다. 테스트할 로직은 `todowidget-core`나 `todowidget-windows`에 둔다.

## 실행 전 PM 확인

1. **Task 1의 spec 변경("크기와 좌표"):** PM 승인을 받아야 Task 1을 시작한다.
2. **push:** Task 11의 Windows CI 확인에 필요하다.

---
### Task 1: spec — 배율이 다른 모니터의 크기와 좌표 (PM 승인 뒤)

**왜 바꾸는가:**
- 지금 spec(window.md 용어 "크기와 좌표")은 위치와 크기를 모두 **주 모니터 배율**로 나눈 값으로 정한다.
- 그런데 WebView는 창이 있는 모니터의 배율로 화면을 그린다. 그래서 다음 문제가 생긴다.
  - 맥북 Retina(배율 2) + 외부 모니터(배율 1) 조합에서 위젯을 외부 모니터로 옮기면 폭 320이 640으로 보인다.
  - 반대 조합에서는 160으로 줄어들어 최소 폭 280보다 좁아진다.
- macOS는 OS 좌표가 원래 포인트(배율 적용 전) 하나라서, 주 모니터 배율로 나눌 이유가 없다.

**Files:**
- Modify: `spec/behavior/window.md` (변경 이력, 용어 "크기와 좌표", WND-07, WND-08의 괄호 설명)
- Modify: `spec/README.md` ("v1.4와 다른 점" 표에 한 줄)

**Interfaces:**
- Produces: Task 5의 `coordinates.ts`가 따르는 단위 정의.
  - 크기는 창이 있는 모니터 배율 기준이다.
  - 위치는 Windows는 주 모니터 배율 기준, macOS는 포인트다.

- [ ] **Step 1: window.md 변경 이력에 한 줄 더하기**

```markdown
- 2026-10-04: PM 결정 — 크기는 창이 있는 모니터 배율 기준으로 하고, macOS 위치는 OS 포인트 좌표 그대로 쓴다(용어 "크기와 좌표"). 배율이 다른 모니터로 옮겨도 카드 크기가 같게 보이게 하려는 것이다
```

- [ ] **Step 2: 용어 "크기와 좌표" 문단을 통째로 바꾸기**

```markdown
**크기와 좌표**: 모두 논리 픽셀이다(화면 배율을 적용하기 전 값).
- **크기**(`width`, `maxHeight`)는 창이 있는 모니터의 배율 기준이다. 배율이 다른 모니터로 옮겨도 카드는 같은 크기로 보인다.
- **위치**(`left`, `top`)와 모니터 영역·작업 영역은 OS마다 정한 좌표 하나로 다룬다.
  - Windows는 실제 픽셀 좌표를 **주 모니터의 배율**로 나눈 값이다. v1.4가 쓰던 시스템 DPI 기준 DIP와 같은 값이라, v1.4가 저장한 위치와 크기를 그대로 쓴다.
  - macOS는 OS가 쓰는 포인트 좌표 그대로다.
- 모든 모니터의 배율이 같으면 두 OS 모두 "실제 픽셀 ÷ 화면 배율"과 같다.
- 창의 크기와 좌표는 카드 둘레의 그림자 여백(가로·세로 각 10)을 포함한 창 기준이다. 예를 들어 폭 320인 창의 카드 폭은 300이다.
```

- [ ] **Step 3: WND-07, WND-08의 괄호 설명 맞추기**

- WND-07: `주 모니터 작업 영역(주 모니터 배율 기준 논리 픽셀)`을 `주 모니터 작업 영역(용어 "크기와 좌표"의 위치 좌표)`로 바꾼다.
- WND-08: `같은 좌표(용어의 "크기와 좌표", 주 모니터 배율 기준)로 바꾼다`를 `같은 좌표(용어 "크기와 좌표"의 위치 좌표)로 바꾼다`로 바꾼다.

- [ ] **Step 4: spec/README.md "v1.4와 다른 점" 표에서 `화면 밖 위치 판단` 줄 위에 한 줄 더하기**

```markdown
| 배율이 다른 모니터의 창 크기 | 시스템 DPI 기준 DIP 하나로 저장 | 크기는 창이 있는 모니터 배율 기준. 위치는 Windows는 v1.4와 같고, macOS는 포인트 | WebView는 창이 있는 모니터 배율로 그린다. 크기를 주 모니터 배율로 정하면, 배율이 다른 모니터로 옮겼을 때 카드가 두 배로 커지거나 최소 폭보다 좁아진다(PM 결정). | WND-04 |
```

- [ ] **Step 5: 검사와 커밋**

Run: `pnpm spec:check`
Expected: `통과`

```bash
git add spec/behavior/window.md spec/README.md
git commit -m "docs: 배율이 다른 모니터에서 크기는 창의 모니터 배율 기준으로 정함"
```

---

### Task 2: Rust 작업 공간과 기반 정리

계획 2에서 넘어온 정리 작업을 한다.
- workspace와 `todowidget-core` crate를 만든다.
- fmt·clippy를 CI에 넣는다.
- spec 검사가 crate 안 Rust 테스트를 세게 한다.
- `tray-icon`은 macOS에서만 켠다.
- `--probe-login-item`을 지운다.
- OS 분기를 `platform::setup`·`platform::on_run_event`로 모은다.
- 두 번 실행을 막는다(START-01).
- `show_main`이 오지 않을 때의 대비책을 둔다.

**Files:**
- Create: `src-tauri/crates/core/Cargo.toml`, `src-tauri/crates/core/src/lib.rs`, `src-tauri/crates/core/src/show_gate.rs`
- Create: `src-tauri/src/commands.rs`, `src-tauri/src/platform/windows.rs`, `src-tauri/rustfmt.toml`
- Modify: `src-tauri/Cargo.toml`, `src-tauri/src/lib.rs`, `src-tauri/src/platform/mod.rs`, `src-tauri/src/platform/macos.rs`, `rust-toolchain.toml`, `.github/workflows/ci.yml`
- Modify: `tools/spec-check/config.ts`, `tools/spec-check/links.ts`, `tools/spec-check/check.test.ts`, `spec/README.md`(64번째 줄 근처, 참조로 세는 곳)
- Modify: `docs/superpowers/reports/2026-10-03-plan2-risk-check.md`
  - "다음 계획으로 넘기는 일" 표에서 이 Task가 끝낸 줄에 "완료 (계획 4 Task 2)"라고 표시한다.
  - 해당 줄: 두 번 실행 방지, `lib.rs` OS 분기, `tray-icon`, `--probe-login-item`, Rust 테스트와 tauri, `show_main` 3초, clippy·fmt.

**Interfaces:**
- Produces (Rust):
  - `todowidget_core::show_gate::{ShowGate, SHOW_FALLBACK_DELAY}`. `ShowGate::claim(&self) -> bool`은 처음 부른 쪽만 `true`를 받는다.
  - `crate::commands::bring_to_front(&AppHandle)`
  - 명령 `show_main(painted_at_ms: f64)`, `keep_hidden()`, `set_pinned(pinned: bool)`
  - `crate::platform::{setup(&mut App) -> tauri::Result<()>, on_run_event(&AppHandle, RunEvent)}`
- Produces (도구): `src-tauri/crates/*/src/**/*.rs`의 Rust 테스트 주석도 spec 참조로 센다.

- [ ] **Step 1: 실패하는 spec 검사 테스트 추가**

`tools/spec-check/check.test.ts`에서 `'Rust 테스트의 주석도 참조로 센다'` 테스트 다음에 더한다:

```ts
  it('src-tauri/crates 아래 crate의 Rust 테스트 주석도 참조로 센다', () => {
    write('src-tauri/crates/core/src/files.rs', '/// TASK-01 추가\n#[cfg(windows)]\n#[test]\nfn adds() {}');
    expect(runSpecCheck(root, { strict: true }).exitCode).toBe(0);
  });

  it('src-tauri/crates에서도 테스트에 붙지 않은 ID 언급은 참조로 세지 않는다', () => {
    write('src-tauri/crates/core/src/files.rs', '// TASK-01 설명\nfn adds() {}');
    expect(runSpecCheck(root, { strict: true }).coverage.unlinkedAuto.map((r) => r.id)).toEqual(['TASK-01']);
  });
```

Run: `pnpm vitest run tools/spec-check/check.test.ts`
Expected: 첫 테스트 FAIL (crates 경로를 세지 않음)

- [ ] **Step 2: spec 검사가 crate 경로를 세게 하기**

`tools/spec-check/config.ts`의 `TEST_GLOBS`를 바꾼다:

```ts
export const TEST_GLOBS: readonly string[] = [
  'src/**/*.test.ts',
  'src-tauri/src/**/*.rs',
  'src-tauri/crates/*/src/**/*.rs',
  'src-tauri/tests/**/*.rs',
  '.github/workflows/*.yml',
];
```

`tools/spec-check/links.ts`에서 Rust 규칙의 경로 조건을 바꾼다. 주석의 `- \`src-tauri/src/\`의 Rust 파일:`도 `` - `src-tauri/src/`와 `src-tauri/crates/*/src/`의 Rust 파일: ``로 고친다.

```ts
/** 제품 코드와 테스트가 한 파일에 섞이는 Rust 소스. 테스트에 붙은 주석만 참조로 센다. */
const RUST_SOURCE = /^src-tauri\/(?:src|crates\/[^/]+\/src)\/.*\.rs$/;
```

```ts
  if (RUST_SOURCE.test(file)) {
```

`spec/README.md`의 "참조로 세는 곳" 문장도 맞춘다.

```markdown
- `pnpm spec:check`가 참조로 세는 곳은 `src/**/*.test.ts`, `src-tauri/src/**/*.rs`, `src-tauri/crates/*/src/**/*.rs`, `src-tauri/tests/**/*.rs`, `.github/workflows/*.yml`이다. `src-tauri/src/`와 `src-tauri/crates/*/src/`에서는 3줄 안에 `#[test]`가 오는 `//`·`///` 주석의 ID만 센다. ...(뒤는 그대로)
```

Run: `pnpm vitest run tools/spec-check/check.test.ts`
Expected: PASS

- [ ] **Step 3: workspace와 core crate 만들기**

`src-tauri/Cargo.toml`을 다음처럼 바꾼다. `[package]`, `[lib]`, `[build-dependencies]`, `[profile.release]`는 그대로다.

```toml
[workspace]
members = ["crates/core"]

[dependencies]
tauri = { version = "=2.12.1", features = ["macos-private-api"] }
tauri-plugin-single-instance = "=2.5.2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
todowidget-core = { path = "crates/core" }

# 메뉴 막대 아이콘은 macOS만 쓴다(설계 문서 6장). Windows 빌드에는 tray 코드를 넣지 않는다.
[target.'cfg(target_os = "macos")'.dependencies]
tauri = { version = "=2.12.1", features = ["macos-private-api", "tray-icon"] }
objc2-service-management = { version = "0.3", features = ["SMAppService"] }
```

`src-tauri/crates/core/Cargo.toml`:

```toml
[package]
name = "todowidget-core"
version = "0.0.0"
edition = "2021"
publish = false
description = "Tauri 없이 테스트하는 TodoWidget 로직"

[dependencies]

[dev-dependencies]
```

`src-tauri/crates/core/src/lib.rs`:

```rust
//! Tauri 없이 테스트하는 로직. 앱 crate는 Tauri를 링크하므로 테스트를 두지 않는다(계획 2: Windows CI에서 테스트 실행 파일이 뜨지 않을 수 있다).
pub mod show_gate;
```

`src-tauri/rustfmt.toml`:

```toml
max_width = 120
```

`rust-toolchain.toml`:

```toml
[toolchain]
channel = "1.99.0"
profile = "minimal"
components = ["clippy", "rustfmt"]
```

- [ ] **Step 4: 실패하는 ShowGate 테스트 쓰기**

`src-tauri/crates/core/src/show_gate.rs`:

```rust
//! 화면(JS)이 `show_main`을 부르지 않을 때 창을 띄우는 대비책. JS가 실패해도 창이 숨은 채로 남지 않게 한다.
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

/// 이 시간 안에 `show_main`이나 `keep_hidden`이 오지 않으면 Rust가 창을 띄운다.
pub const SHOW_FALLBACK_DELAY: Duration = Duration::from_secs(3);

/// 창을 띄울지 숨긴 채 둘지는 한 번만 정한다. `show_main`, `keep_hidden`(STORE-10 대화 상자), 대비책 중 먼저 온 쪽이 정한다.
#[derive(Debug, Default)]
pub struct ShowGate {
    decided: AtomicBool,
}

impl ShowGate {
    /// 처음 부른 쪽만 `true`를 받는다.
    pub fn claim(&self) -> bool {
        todo!()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;

    #[test]
    fn first_claim_wins() {
        let gate = ShowGate::default();
        assert!(gate.claim());
        assert!(!gate.claim());
    }

    #[test]
    fn only_one_thread_wins() {
        let gate = Arc::new(ShowGate::default());
        let handles: Vec<_> = (0..8)
            .map(|_| {
                let gate = Arc::clone(&gate);
                std::thread::spawn(move || gate.claim())
            })
            .collect();
        let winners = handles.into_iter().map(|h| h.join().unwrap()).filter(|won| *won).count();
        assert_eq!(winners, 1);
    }

    #[test]
    fn fallback_waits_three_seconds() {
        assert_eq!(SHOW_FALLBACK_DELAY, Duration::from_secs(3));
    }
}
```

Run: `cargo test --manifest-path src-tauri/Cargo.toml -p todowidget-core`
Expected: FAIL (`not yet implemented`)

- [ ] **Step 5: 구현**

```rust
    pub fn claim(&self) -> bool {
        !self.decided.swap(true, Ordering::SeqCst)
    }
```

Run: `cargo test --manifest-path src-tauri/Cargo.toml -p todowidget-core`
Expected: PASS

- [ ] **Step 6: 앱 crate를 명령·platform 모듈로 나누기**

`src-tauri/src/commands.rs`:

```rust
//! JS가 부르는 Tauri 명령과 그 명령들이 함께 쓰는 창 동작.
use tauri::{AppHandle, Manager, State};
use todowidget_core::show_gate::{ShowGate, SHOW_FALLBACK_DELAY};

use crate::probe;

/// 창을 앞으로 가져온다. 처음 띄울 때, 다시 실행했을 때(START-01), 메뉴 막대 아이콘을 눌렀을 때(MAC-03) 같이 쓴다.
pub fn bring_to_front(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

/// 화면이 준비되면 JS가 부른다. 숨긴 창에서는 requestAnimationFrame이 오지 않으므로 mount 직후에 부른다.
#[tauri::command]
pub fn show_main(app: AppHandle, gate: State<'_, ShowGate>, painted_at_ms: f64) {
    // 계획 2 시험 측정. 계획 6 출시 전에 지우거나 기본 꺼진 feature로 막는다.
    probe::report_shown(painted_at_ms);
    let _ = gate.claim();
    bring_to_front(&app);
}

/// 시작하지 못해 대화 상자만 띄우고 끝낼 때(STORE-10) 대비책이 빈 창을 띄우지 않게 한다.
#[tauri::command]
pub fn keep_hidden(gate: State<'_, ShowGate>) {
    let _ = gate.claim();
}

/// 📌 맨 위 고정 (WND-09). 맨 위 고정만 바꾼다. macOS 전체 화면 앱에서는 📌와 관계없이 보이지 않는다 (MAC-07).
#[tauri::command]
pub fn set_pinned(app: AppHandle, pinned: bool) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_always_on_top(pinned);
    }
}

/// `SHOW_FALLBACK_DELAY` 안에 화면이 창을 띄우지 않으면 Rust가 띄운다.
pub fn spawn_show_fallback(app: AppHandle) {
    std::thread::spawn(move || {
        std::thread::sleep(SHOW_FALLBACK_DELAY);
        if app.state::<ShowGate>().claim() {
            bring_to_front(&app);
        }
    });
}
```

`src-tauri/src/lib.rs` 전체:

```rust
mod commands;
mod platform;
mod probe;

use todowidget_core::show_gate::ShowGate;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 계획 2 시험 측정. 계획 6 출시 전에 지우거나 기본 꺼진 feature로 막는다.
    probe::mark_process_start();

    let app = tauri::Builder::default()
        // 가장 먼저 등록한다. 두 번째 프로세스는 창을 만들거나 파일을 읽기 전에 끝나고, 떠 있는 위젯이 앞으로 온다 (START-01, WIN-07, MAC-05).
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| commands::bring_to_front(app)))
        .manage(ShowGate::default())
        .invoke_handler(tauri::generate_handler![commands::show_main, commands::keep_hidden, commands::set_pinned])
        .setup(|app| {
            platform::setup(app)?;
            commands::spawn_show_fallback(app.handle().clone());
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("TodoWidget을 실행하지 못했어요");

    app.run(platform::on_run_event);
}
```

`src-tauri/src/platform/mod.rs`:

```rust
//! OS마다 다른 앱 동작. 이 모듈과 `crates/windows` 밖에는 OS 분기를 두지 않는다 (설계 문서 5.4).
#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "macos")]
pub use macos::{on_run_event, setup};

#[cfg(windows)]
mod windows;
#[cfg(windows)]
pub use windows::{on_run_event, setup};

#[cfg(not(any(target_os = "macos", windows)))]
compile_error!("TodoWidget은 Windows와 macOS만 지원해요");
```

`src-tauri/src/platform/windows.rs`:

```rust
//! Windows 전용 앱 동작. 작업 표시줄 숨김(WIN-02)은 `tauri.conf.json`의 `skipTaskbar: true`로 한다.
use tauri::{App, AppHandle, RunEvent};

pub fn setup(_app: &mut App) -> tauri::Result<()> {
    Ok(())
}

pub fn on_run_event(_app: &AppHandle, _event: RunEvent) {}
```

`src-tauri/src/platform/macos.rs`:
- `probe_login_item` 함수를 지운다.
- `hide_from_dock`과 `install_tray`는 비공개(`fn`)로 바꾼다.
- 맨 아래에 다음을 더한다.
- `crate::bring_to_front`는 `crate::commands::bring_to_front`로 바꾼다.

```rust
/// Dock 숨김과 메뉴 막대 아이콘 (MAC-02, MAC-03, MAC-04).
pub fn setup(app: &mut App) -> tauri::Result<()> {
    hide_from_dock(app);
    install_tray(app)
}

/// Spotlight·응용 프로그램 폴더에서 다시 열면 macOS가 Reopen을 보낸다 (MAC-05).
pub fn on_run_event(app: &AppHandle, event: RunEvent) {
    if let RunEvent::Reopen { .. } = event {
        crate::commands::bring_to_front(app);
    }
}
```

`use tauri::{...}`에 `AppHandle, RunEvent`를 더한다. 파일 맨 위 doc 주석의 "로그인 항목"은 그대로 둔다(Task 4에서 다시 넣는다).

- [ ] **Step 7: CI에 fmt·clippy·workspace 테스트 넣기**

`.github/workflows/ci.yml`의 `check` job에서 `Rust 테스트` 단계를 다음 세 단계로 바꾼다.

```yaml
      - name: Rust 형식 검사
        run: cargo fmt --check --manifest-path src-tauri/Cargo.toml --all
      - name: Rust lint
        run: cargo clippy --manifest-path src-tauri/Cargo.toml --workspace --all-targets -- -D warnings
      - name: Rust 테스트
        run: cargo test --manifest-path src-tauri/Cargo.toml --workspace
```

- [ ] **Step 8: 형식 맞추고 전체 검사**

```bash
cargo fmt --manifest-path src-tauri/Cargo.toml --all
cargo clippy --manifest-path src-tauri/Cargo.toml --workspace --all-targets -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml --workspace
pnpm test && pnpm typecheck && pnpm spec:check
pnpm tauri build --debug --no-bundle
```

Expected: 모두 통과. clippy 경고가 나면 고친다(`#[allow]`로 덮지 않는다).

- [ ] **Step 9: 직접 확인 (개발자, 화면 캡처 없이)**

```bash
TODOWIDGET_PROBE=1 ./src-tauri/target/debug/todo-widget &
sleep 2
./src-tauri/target/debug/todo-widget; echo "두 번째 종료 코드: $?"
pgrep -fl "target/debug/todo-widget" | wc -l
```

Expected:
- 두 번째 실행은 바로 끝난다(종료 코드 0).
- 프로세스는 하나만 남는다.

확인이 끝나면 `pkill -f "target/debug/todo-widget"`로 끈다.

- [ ] **Step 10: 계획 2 보고서 표시와 커밋**

```bash
git add -A src-tauri rust-toolchain.toml .github/workflows/ci.yml tools/spec-check spec/README.md docs/superpowers/reports/2026-10-03-plan2-risk-check.md
git commit -m "chore: Rust workspace와 core crate를 만들고 두 번 실행 방지·창 띄우기 대비책·fmt/clippy 검사를 넣음"
```

---

### Task 3: 데이터 폴더와 안전한 쓰기

**Files:**
- Create: `src-tauri/crates/core/src/files.rs`
- Create: `src-tauri/src/commands/files.rs`. `commands.rs`를 `commands/mod.rs`로 옮기고 `pub mod files;`를 더한다.
- Create: `src/adapters/tauri/invoke.ts`, `src/adapters/tauri/file-store.ts`, `src/adapters/tauri/file-store.test.ts`
- Create: `src/testing/file-store-contract.ts`, `src/testing/memory-file-store.test.ts`
- Delete: `src/application/data-dir.ts`, `src/application/data-dir.test.ts` (STORE-18은 Rust 테스트로 옮긴다)
- Modify: `src-tauri/crates/core/Cargo.toml`, `src-tauri/crates/core/src/lib.rs`, `src-tauri/src/lib.rs`, `src/adapters/tauri/window.ts`(`Invoke` 타입을 `invoke.ts`에서 가져옴)

**Interfaces:**
- Consumes: `FileStore`, `FileAccessError` (`src/application/ports/file-store.ts`, 계획 3)
- Produces (Rust):
  - `todowidget_core::files::{DataDir, FileError, resolve_data_dir, os_data_dir, DATA_DIR_ENV, APP_FOLDER}`
  - 명령 `data_dir_info() -> { path: String, separator: String }`
  - 명령 `data_file_read(name) -> Option<String>`
  - 명령 `data_file_write_atomic(name, text)`
  - 명령 `data_file_exists(name) -> bool`
  - 명령 `data_file_rename(from, to)`
  - 명령 `data_file_copy(from, to)`
  - 모든 명령은 실패하면 한국어 오류 문자열로 거부한다.
- Produces (TS):
  - `type Invoke = (command: string, args?: Record<string, unknown>) => Promise<unknown>` (`src/adapters/tauri/invoke.ts`)
  - `createTauriFileStore(invoke: Invoke): Promise<FileStore>`
  - `describeFileStoreContract(name: string, makeStore: () => Promise<FileStore & { seed(name: string, text: string): Promise<void> }>)` (`src/testing/file-store-contract.ts`)

- [ ] **Step 1: 실패하는 Rust 테스트 쓰기**

`src-tauri/crates/core/Cargo.toml`:

```toml
[dependencies]
dirs = "7"

[dev-dependencies]
tempfile = "3"
```

`src-tauri/crates/core/src/lib.rs`에 `pub mod files;`를 더한다.

`src-tauri/crates/core/src/files.rs`:

```rust
//! 데이터 폴더 안의 파일. 형식·백업 이름 같은 판단은 TypeScript가 하고, 여기서는 디스크에 안전하게 읽고 쓰기만 한다 (설계 문서 5.2).
//! TypeScript 쪽 계약(`src/application/ports/file-store.ts`, `src/testing/file-store-contract.ts`)과 같은 동작을 아래 테스트로 확인한다.
use std::ffi::OsString;
use std::fmt;
use std::fs::{self, OpenOptions};
use std::io::{self, Write};
use std::path::{Path, PathBuf};

/// 개발과 테스트 중에 데이터 폴더를 바꾸는 환경 변수 (STORE-18).
pub const DATA_DIR_ENV: &str = "TODOWIDGET_DATA_DIR";
/// OS 데이터 폴더 아래의 앱 폴더 이름 (WIN-01, MAC-01). bundle identifier가 아니라 이 이름을 쓴다.
pub const APP_FOLDER: &str = "TodoWidget";

/// 환경 변수가 있고 비어 있지 않으면 그 폴더, 아니면 OS 데이터 폴더 아래 `TodoWidget` (STORE-18).
pub fn resolve_data_dir(env_value: Option<OsString>, os_data_dir: Option<PathBuf>) -> Option<PathBuf> {
    todo!()
}

/// Windows `%APPDATA%`(Roaming), macOS `~/Library/Application Support` (WIN-01, MAC-01).
pub fn os_data_dir() -> Option<PathBuf> {
    dirs::data_dir()
}

#[derive(Debug, PartialEq, Eq)]
pub enum FileError {
    /// 폴더 밖을 가리키거나 비어 있는 이름.
    InvalidName(String),
    /// 덮어쓰지 않는 동작의 대상이 이미 있다.
    AlreadyExists(String),
    /// 그 밖의 디스크 오류(권한, 잠금, 디스크 가득 참 등).
    Io { path: String, message: String },
}

impl fmt::Display for FileError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            FileError::InvalidName(name) => write!(f, "쓸 수 없는 파일 이름이에요: {name}"),
            FileError::AlreadyExists(path) => write!(f, "이미 있는 파일이에요: {path}"),
            FileError::Io { path, message } => write!(f, "{path}: {message}"),
        }
    }
}

impl std::error::Error for FileError {}

/// 데이터 폴더. 이름은 폴더 안의 파일 이름 하나여야 한다(하위 폴더나 `..` 금지).
#[derive(Debug, Clone)]
pub struct DataDir {
    root: PathBuf,
}

impl DataDir {
    pub fn new(root: PathBuf) -> Self {
        Self { root }
    }

    pub fn root(&self) -> &Path {
        &self.root
    }

    /// 없으면 `None`. UTF-8이 아닌 바이트는 바꿔 읽는다. 그런 파일은 TypeScript가 깨진 파일(STORE-08)로 본다.
    pub fn read(&self, name: &str) -> Result<Option<String>, FileError> {
        todo!()
    }

    /// 임시 파일에 쓰고 디스크에 내린 뒤 원본과 바꾼다. 중간에 실패해도 원본은 그대로다 (STORE-02). 폴더가 없으면 만든다.
    pub fn write_atomic(&self, name: &str, text: &str) -> Result<(), FileError> {
        todo!()
    }

    /// 있는지 확인하지 못하면 오류.
    pub fn exists(&self, name: &str) -> Result<bool, FileError> {
        todo!()
    }

    /// `to`가 이미 있으면 덮어쓰지 않고 실패한다 (STORE-08 백업 이름).
    pub fn rename_new(&self, from: &str, to: &str) -> Result<(), FileError> {
        todo!()
    }

    /// `to`가 이미 있으면 덮어쓰지 않고 실패한다 (STORE-12 v1 백업).
    pub fn copy_new(&self, from: &str, to: &str) -> Result<(), FileError> {
        todo!()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn dir() -> (tempfile::TempDir, DataDir) {
        let temp = tempfile::tempdir().unwrap();
        let data = DataDir::new(temp.path().join("TodoWidget"));
        (temp, data)
    }

    fn names(data: &DataDir) -> Vec<String> {
        let mut names: Vec<String> =
            fs::read_dir(data.root()).unwrap().map(|e| e.unwrap().file_name().to_string_lossy().into_owned()).collect();
        names.sort();
        names
    }

    /// STORE-02 폴더가 없으면 만들고, 쓴 뒤에는 임시 파일이 남지 않는다
    #[test]
    fn write_atomic_creates_folder_and_leaves_no_temp_file() {
        let (_temp, data) = dir();
        data.write_atomic("tasks.json", "{\"version\":2}").unwrap();
        data.write_atomic("tasks.json", "{\"version\":2,\"tasks\":[]}").unwrap();
        assert_eq!(data.read("tasks.json").unwrap().as_deref(), Some("{\"version\":2,\"tasks\":[]}"));
        assert_eq!(names(&data), vec!["tasks.json"]);
    }

    /// STORE-02 쓰다가 실패해도 원본은 그대로다
    #[test]
    fn write_atomic_keeps_original_on_failure() {
        let (_temp, data) = dir();
        data.write_atomic("tasks.json", "원본").unwrap();
        // 임시 파일 자리에 폴더를 두어 임시 파일 쓰기가 실패하게 한다.
        fs::create_dir(data.root().join(".tasks.json.tmp")).unwrap();
        assert!(matches!(data.write_atomic("tasks.json", "새 내용"), Err(FileError::Io { .. })));
        assert_eq!(data.read("tasks.json").unwrap().as_deref(), Some("원본"));
    }

    /// STORE-02 한글은 그대로 UTF-8로 쓴다
    #[test]
    fn write_atomic_writes_utf8() {
        let (_temp, data) = dir();
        data.write_atomic("tasks.json", "보고서 초안").unwrap();
        assert_eq!(fs::read(data.root().join("tasks.json")).unwrap(), "보고서 초안".as_bytes());
    }

    #[test]
    fn read_missing_is_none_and_invalid_utf8_is_replaced() {
        let (_temp, data) = dir();
        assert_eq!(data.read("tasks.json").unwrap(), None);
        fs::create_dir_all(data.root()).unwrap();
        fs::write(data.root().join("tasks.json"), [0xff, b'{']).unwrap();
        assert_eq!(data.read("tasks.json").unwrap().as_deref(), Some("\u{fffd}{"));
    }

    #[test]
    fn read_folder_is_io_error() {
        let (_temp, data) = dir();
        fs::create_dir_all(data.root().join("tasks.json")).unwrap();
        assert!(matches!(data.read("tasks.json"), Err(FileError::Io { .. })));
    }

    #[test]
    fn exists_reports_files() {
        let (_temp, data) = dir();
        assert!(!data.exists("settings.json").unwrap());
        data.write_atomic("settings.json", "{}").unwrap();
        assert!(data.exists("settings.json").unwrap());
    }

    #[test]
    fn rename_new_refuses_existing_target_and_keeps_both() {
        let (_temp, data) = dir();
        data.write_atomic("tasks.json", "깨짐").unwrap();
        data.write_atomic("tasks.broken-20261003-090000.json", "먼저 있던 백업").unwrap();
        assert!(matches!(
            data.rename_new("tasks.json", "tasks.broken-20261003-090000.json"),
            Err(FileError::AlreadyExists(_))
        ));
        assert_eq!(data.read("tasks.json").unwrap().as_deref(), Some("깨짐"));
        data.rename_new("tasks.json", "tasks.broken-20261003-090000-2.json").unwrap();
        assert_eq!(data.read("tasks.json").unwrap(), None);
        assert_eq!(data.read("tasks.broken-20261003-090000-2.json").unwrap().as_deref(), Some("깨짐"));
    }

    #[test]
    fn rename_missing_source_is_error() {
        let (_temp, data) = dir();
        fs::create_dir_all(data.root()).unwrap();
        assert!(data.rename_new("tasks.json", "b.json").is_err());
    }

    #[test]
    fn copy_new_refuses_existing_target_and_copies_otherwise() {
        let (_temp, data) = dir();
        data.write_atomic("tasks.json", "[]").unwrap();
        data.write_atomic("tasks.v1-backup-20261003-090000.json", "먼저").unwrap();
        assert!(matches!(
            data.copy_new("tasks.json", "tasks.v1-backup-20261003-090000.json"),
            Err(FileError::AlreadyExists(_))
        ));
        assert_eq!(data.read("tasks.v1-backup-20261003-090000.json").unwrap().as_deref(), Some("먼저"));
        data.copy_new("tasks.json", "tasks.v1-backup-20261003-090000-2.json").unwrap();
        assert_eq!(data.read("tasks.v1-backup-20261003-090000-2.json").unwrap().as_deref(), Some("[]"));
        assert_eq!(data.read("tasks.json").unwrap().as_deref(), Some("[]"));
    }

    #[test]
    fn copy_missing_source_is_error_and_creates_nothing() {
        let (_temp, data) = dir();
        fs::create_dir_all(data.root()).unwrap();
        assert!(data.copy_new("tasks.json", "b.json").is_err());
        assert!(!data.exists("b.json").unwrap());
    }

    #[test]
    fn rejects_names_outside_the_folder() {
        let (_temp, data) = dir();
        for name in ["", ".", "..", "../tasks.json", "a/b.json", "a\\b.json", "C:x.json"] {
            assert_eq!(data.read(name), Err(FileError::InvalidName(name.to_string())), "{name}");
            assert!(matches!(data.write_atomic(name, "x"), Err(FileError::InvalidName(_))), "{name}");
        }
    }

    /// STORE-18 환경 변수가 있으면 그 폴더를 쓰고, 없거나 비어 있으면 OS 데이터 폴더 아래 TodoWidget을 쓴다
    #[test]
    fn data_dir_follows_env_value() {
        let base = PathBuf::from("base");
        assert_eq!(
            resolve_data_dir(Some(OsString::from("dev-data")), Some(base.clone())),
            Some(PathBuf::from("dev-data"))
        );
        assert_eq!(resolve_data_dir(Some(OsString::new()), Some(base.clone())), Some(base.join("TodoWidget")));
        assert_eq!(resolve_data_dir(None, Some(base.clone())), Some(base.join("TodoWidget")));
        assert_eq!(resolve_data_dir(None, None), None);
    }

    /// WIN-01 데이터 폴더는 %APPDATA%\TodoWidget\이다
    #[cfg(windows)]
    #[test]
    fn windows_data_dir_is_roaming_appdata() {
        let appdata = PathBuf::from(std::env::var_os("APPDATA").expect("APPDATA가 없어요"));
        assert_eq!(resolve_data_dir(None, os_data_dir()), Some(appdata.join("TodoWidget")));
    }

    /// MAC-01 데이터 폴더는 ~/Library/Application Support/TodoWidget/이다
    #[cfg(target_os = "macos")]
    #[test]
    fn macos_data_dir_is_application_support() {
        let home = PathBuf::from(std::env::var_os("HOME").expect("HOME이 없어요"));
        assert_eq!(
            resolve_data_dir(None, os_data_dir()),
            Some(home.join("Library").join("Application Support").join("TodoWidget"))
        );
    }
}
```

Run: `cargo test --manifest-path src-tauri/Cargo.toml -p todowidget-core files`
Expected: FAIL (`not yet implemented`)

- [ ] **Step 2: Rust 구현**

```rust
pub fn resolve_data_dir(env_value: Option<OsString>, os_data_dir: Option<PathBuf>) -> Option<PathBuf> {
    match env_value {
        Some(value) if !value.is_empty() => Some(PathBuf::from(value)),
        _ => os_data_dir.map(|dir| dir.join(APP_FOLDER)),
    }
}
```

`impl DataDir` 안:

```rust
    fn path(&self, name: &str) -> Result<PathBuf, FileError> {
        let plain = !name.is_empty() && name != "." && name != ".." && !name.contains(['/', '\\', ':']);
        if plain {
            Ok(self.root.join(name))
        } else {
            Err(FileError::InvalidName(name.to_string()))
        }
    }

    fn io_error(path: &Path, error: io::Error) -> FileError {
        FileError::Io { path: path.display().to_string(), message: error.to_string() }
    }

    pub fn read(&self, name: &str) -> Result<Option<String>, FileError> {
        let path = self.path(name)?;
        match fs::read(&path) {
            Ok(bytes) => Ok(Some(String::from_utf8_lossy(&bytes).into_owned())),
            Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(None),
            Err(error) => Err(Self::io_error(&path, error)),
        }
    }

    pub fn write_atomic(&self, name: &str, text: &str) -> Result<(), FileError> {
        let path = self.path(name)?;
        let temp = self.root.join(format!(".{name}.tmp"));
        fs::create_dir_all(&self.root).map_err(|e| Self::io_error(&self.root, e))?;
        let written = (|| -> io::Result<()> {
            let mut file = OpenOptions::new().write(true).create(true).truncate(true).open(&temp)?;
            file.write_all(text.as_bytes())?;
            file.sync_all()?;
            // Windows에서도 원본을 바꿔 끼운다(MoveFileExW, MOVEFILE_REPLACE_EXISTING).
            fs::rename(&temp, &path)
        })();
        written.map_err(|error| {
            // 임시 파일 자리에 폴더가 있으면 지우지 않는다(지울 대상은 파일뿐이다).
            if temp.is_file() {
                let _ = fs::remove_file(&temp);
            }
            Self::io_error(&path, error)
        })
    }

    pub fn exists(&self, name: &str) -> Result<bool, FileError> {
        let path = self.path(name)?;
        path.try_exists().map_err(|e| Self::io_error(&path, e))
    }

    pub fn rename_new(&self, from: &str, to: &str) -> Result<(), FileError> {
        let source = self.path(from)?;
        let target = self.path(to)?;
        if target.try_exists().map_err(|e| Self::io_error(&target, e))? {
            return Err(FileError::AlreadyExists(target.display().to_string()));
        }
        fs::rename(&source, &target).map_err(|e| Self::io_error(&source, e))
    }

    pub fn copy_new(&self, from: &str, to: &str) -> Result<(), FileError> {
        let source_path = self.path(from)?;
        let target_path = self.path(to)?;
        let mut source = fs::File::open(&source_path).map_err(|e| Self::io_error(&source_path, e))?;
        let mut target = match OpenOptions::new().write(true).create_new(true).open(&target_path) {
            Ok(file) => file,
            Err(error) if error.kind() == io::ErrorKind::AlreadyExists => {
                return Err(FileError::AlreadyExists(target_path.display().to_string()))
            }
            Err(error) => return Err(Self::io_error(&target_path, error)),
        };
        let copied = io::copy(&mut source, &mut target).and_then(|_| target.sync_all());
        copied.map_err(|error| {
            drop(target);
            let _ = fs::remove_file(&target_path);
            Self::io_error(&target_path, error)
        })
    }
```

`rename_new`는 대상이 있는지 본 뒤 옮긴다. 그 사이에 다른 프로그램이 같은 이름을 만들 수 있지만 무시한다. 위젯은 하나만 뜨고(START-01), 백업 이름에는 초 단위 시각이 들어가기 때문이다.

Run: `cargo test --manifest-path src-tauri/Cargo.toml -p todowidget-core`
Expected: PASS

- [ ] **Step 3: Tauri 명령 만들기**

`git mv src-tauri/src/commands.rs src-tauri/src/commands/mod.rs`. 그다음 `mod.rs` 맨 위(`use` 줄 위)에 `pub mod files;`를 더한다.

`src-tauri/src/commands/files.rs`:

```rust
//! 데이터 폴더 파일 명령. JS의 `FileStore` adapter(`src/adapters/tauri/file-store.ts`)가 부른다. 오류는 한국어 문자열로 거부한다.
use serde::Serialize;
use tauri::State;
use todowidget_core::files::DataDir;

#[derive(Serialize)]
pub struct DataDirInfo {
    path: String,
    separator: String,
}

/// 대화 상자에 보여 줄 전체 경로를 만드는 데 쓴다 (STORE-10).
#[tauri::command]
pub fn data_dir_info(dir: State<'_, DataDir>) -> DataDirInfo {
    DataDirInfo { path: dir.root().display().to_string(), separator: std::path::MAIN_SEPARATOR.to_string() }
}

#[tauri::command]
pub async fn data_file_read(dir: State<'_, DataDir>, name: String) -> Result<Option<String>, String> {
    dir.read(&name).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn data_file_write_atomic(dir: State<'_, DataDir>, name: String, text: String) -> Result<(), String> {
    dir.write_atomic(&name, &text).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn data_file_exists(dir: State<'_, DataDir>, name: String) -> Result<bool, String> {
    dir.exists(&name).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn data_file_rename(dir: State<'_, DataDir>, from: String, to: String) -> Result<(), String> {
    dir.rename_new(&from, &to).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn data_file_copy(dir: State<'_, DataDir>, from: String, to: String) -> Result<(), String> {
    dir.copy_new(&from, &to).map_err(|e| e.to_string())
}
```

`async` 명령은 메인 스레드 밖에서 돌아 디스크를 기다리는 동안 화면이 멈추지 않는다.

`src-tauri/src/lib.rs`에서 builder에 데이터 폴더를 넣고 명령을 등록한다.

```rust
use todowidget_core::files::{os_data_dir, resolve_data_dir, DataDir, DATA_DIR_ENV};
```

```rust
    let data_dir = resolve_data_dir(std::env::var_os(DATA_DIR_ENV), os_data_dir())
        .expect("데이터 폴더 위치를 찾지 못했어요");
```

`tauri::Builder::default()` 앞에 위 코드를 두고, `.manage(ShowGate::default())` 다음에 `.manage(DataDir::new(data_dir))`를 더한다. `generate_handler!`에는 `commands::files::data_dir_info`, `commands::files::data_file_read`, `commands::files::data_file_write_atomic`, `commands::files::data_file_exists`, `commands::files::data_file_rename`, `commands::files::data_file_copy`를 더한다.

- [ ] **Step 4: 실패하는 TS 테스트 쓰기 — 계약과 adapter**

`src/adapters/tauri/invoke.ts`:

```ts
/** Tauri `invoke`의 모양. adapter는 이 타입만 알고, 실제 함수는 composition root가 넘긴다. */
export type Invoke = (command: string, args?: Record<string, unknown>) => Promise<unknown>;
```

`src/adapters/tauri/window.ts`의 `type Invoke = ...` 줄을 `import type { Invoke } from './invoke.ts';`로 바꾼다.

`src/testing/file-store-contract.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { FileAccessError, type FileStore } from '../application/ports/file-store.ts';

export type SeedableFileStore = FileStore & { seed(name: string, text: string): Promise<void> };

/**
 * FileStore가 지켜야 하는 계약. 가짜(MemoryFileStore)는 이 테스트로, 진짜(Rust DataDir)는
 * src-tauri/crates/core/src/files.rs의 같은 경우 테스트로 확인한다. 한쪽을 바꾸면 다른 쪽도 바꾼다.
 */
export function describeFileStoreContract(name: string, makeStore: () => Promise<SeedableFileStore>): void {
  describe(`${name}: FileStore 계약`, () => {
    it('없는 파일은 null로 읽는다', async () => {
      const store = await makeStore();
      expect(await store.read('tasks.json')).toBeNull();
      expect(await store.exists('tasks.json')).toBe(false);
    });

    it('STORE-02 쓴 내용을 그대로 읽는다', async () => {
      const store = await makeStore();
      await store.writeAtomic('tasks.json', '보고서');
      await store.writeAtomic('tasks.json', '은행');
      expect(await store.read('tasks.json')).toBe('은행');
      expect(await store.exists('tasks.json')).toBe(true);
    });

    it('이름 바꾸기와 복사는 대상이 있으면 덮어쓰지 않고 FileAccessError로 실패한다', async () => {
      const store = await makeStore();
      await store.seed('tasks.json', '원본');
      await store.seed('backup.json', '먼저');
      await expect(store.rename('tasks.json', 'backup.json')).rejects.toBeInstanceOf(FileAccessError);
      await expect(store.copy('tasks.json', 'backup.json')).rejects.toBeInstanceOf(FileAccessError);
      expect(await store.read('tasks.json')).toBe('원본');
      expect(await store.read('backup.json')).toBe('먼저');
    });

    it('이름 바꾸기는 옮기고, 복사는 원본을 남긴다', async () => {
      const store = await makeStore();
      await store.seed('tasks.json', '원본');
      await store.copy('tasks.json', 'copy.json');
      await store.rename('tasks.json', 'moved.json');
      expect(await store.read('tasks.json')).toBeNull();
      expect(await store.read('copy.json')).toBe('원본');
      expect(await store.read('moved.json')).toBe('원본');
    });

    it('없는 파일의 이름 바꾸기와 복사는 FileAccessError로 실패한다', async () => {
      const store = await makeStore();
      await expect(store.rename('none.json', 'a.json')).rejects.toBeInstanceOf(FileAccessError);
      await expect(store.copy('none.json', 'b.json')).rejects.toBeInstanceOf(FileAccessError);
    });
  });
}
```

`src/testing/memory-file-store.test.ts`:

```ts
import { describeFileStoreContract } from './file-store-contract.ts';
import { MemoryFileStore } from './memory-file-store.ts';

describeFileStoreContract('MemoryFileStore', async () => {
  const store = new MemoryFileStore();
  return Object.assign(store, {
    async seed(name: string, text: string) {
      store.files.set(name, text);
    },
  });
});
```

`src/adapters/tauri/file-store.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { FileAccessError } from '../../application/ports/file-store.ts';
import { createTauriFileStore } from './file-store.ts';

function fakeInvoke(results: Record<string, unknown> = {}) {
  return vi.fn(async (command: string, _args?: Record<string, unknown>) => {
    if (command === 'data_dir_info')
      return { path: '/Users/me/Library/Application Support/TodoWidget', separator: '/' };
    const result = results[command];
    if (result instanceof Error)
      throw result.message; // Tauri는 Rust 오류를 문자열로 거부한다
    return result;
  });
}

describe('Tauri FileStore adapter', () => {
  it('명령 이름과 인자를 그대로 넘긴다', async () => {
    const invoke = fakeInvoke({ data_file_read: '{}', data_file_exists: true });
    const store = await createTauriFileStore(invoke);
    expect(await store.read('tasks.json')).toBe('{}');
    expect(await store.exists('settings.json')).toBe(true);
    await store.writeAtomic('tasks.json', '[]');
    await store.rename('tasks.json', 'b.json');
    await store.copy('b.json', 'c.json');
    expect(invoke.mock.calls.slice(1)).toEqual([
      ['data_file_read', { name: 'tasks.json' }],
      ['data_file_exists', { name: 'settings.json' }],
      ['data_file_write_atomic', { name: 'tasks.json', text: '[]' }],
      ['data_file_rename', { from: 'tasks.json', to: 'b.json' }],
      ['data_file_copy', { from: 'b.json', to: 'c.json' }],
    ]);
  });

  it('없는 파일은 null이다 (Rust None)', async () => {
    const store = await createTauriFileStore(fakeInvoke({ data_file_read: null }));
    expect(await store.read('tasks.json')).toBeNull();
  });

  it('STORE-10 Rust 오류 문자열은 메시지를 지닌 FileAccessError가 된다', async () => {
    const store = await createTauriFileStore(fakeInvoke({ data_file_read: new Error('tasks.json: 다른 프로세스가 사용 중') }));
    const error = await store.read('tasks.json').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(FileAccessError);
    expect((error as Error).message).toBe('tasks.json: 다른 프로세스가 사용 중');
  });

  it('모든 명령의 거부를 FileAccessError로 바꾼다', async () => {
    const failing = new Error('잠김');
    const store = await createTauriFileStore(
      fakeInvoke({ data_file_write_atomic: failing, data_file_exists: failing, data_file_rename: failing, data_file_copy: failing }),
    );
    await expect(store.writeAtomic('a', 'x')).rejects.toBeInstanceOf(FileAccessError);
    await expect(store.exists('a')).rejects.toBeInstanceOf(FileAccessError);
    await expect(store.rename('a', 'b')).rejects.toBeInstanceOf(FileAccessError);
    await expect(store.copy('a', 'b')).rejects.toBeInstanceOf(FileAccessError);
  });

  it('STORE-10 대화 상자용 전체 경로는 데이터 폴더와 OS 구분자로 만든다', async () => {
    const store = await createTauriFileStore(fakeInvoke());
    expect(store.displayPath('tasks.json')).toBe('/Users/me/Library/Application Support/TodoWidget/tasks.json');
    const windows = vi.fn(async () => ({ path: 'C:\\Users\\me\\AppData\\Roaming\\TodoWidget\\', separator: '\\' }));
    expect((await createTauriFileStore(windows)).displayPath('tasks.json')).toBe('C:\\Users\\me\\AppData\\Roaming\\TodoWidget\\tasks.json');
  });
});
```

Run: `pnpm vitest run src/adapters/tauri/file-store.test.ts src/testing/memory-file-store.test.ts`
Expected:
- `file-store.test.ts`는 모듈이 없어 FAIL이다.
- MemoryFileStore 계약 테스트는 PASS여야 한다. 실패하면 MemoryFileStore가 계약을 어긴 것이니 가짜를 고친다.

- [ ] **Step 5: adapter 구현**

`src/adapters/tauri/file-store.ts`:

```ts
import { FileAccessError, type FileStore } from '../../application/ports/file-store.ts';
import type { Invoke } from './invoke.ts';

interface DataDirInfo {
  path: string;
  separator: string;
}

/**
 * 데이터 폴더 파일을 Rust 명령(`src-tauri/src/commands/files.rs`)으로 읽고 쓴다.
 * 데이터 폴더 위치는 Rust가 정한다(WIN-01, MAC-01, STORE-18). Tauri는 Rust 오류를 문자열로 거부하므로 모두 FileAccessError로 바꾼다.
 */
export async function createTauriFileStore(invoke: Invoke): Promise<FileStore> {
  const dir = (await invoke('data_dir_info')) as DataDirInfo;
  const prefix = dir.path.endsWith(dir.separator) ? dir.path : dir.path + dir.separator;

  async function call<T>(command: string, args: Record<string, unknown>): Promise<T> {
    try {
      return (await invoke(command, args)) as T;
    } catch (error) {
      throw new FileAccessError(error instanceof Error ? error.message : String(error), { cause: error });
    }
  }

  return {
    read: (name) => call<string | null>('data_file_read', { name }),
    writeAtomic: (name, text) => call<void>('data_file_write_atomic', { name, text }),
    exists: (name) => call<boolean>('data_file_exists', { name }),
    rename: (from, to) => call<void>('data_file_rename', { from, to }),
    copy: (from, to) => call<void>('data_file_copy', { from, to }),
    displayPath: (name) => prefix + name,
  };
}
```

`src/application/data-dir.ts`와 `src/application/data-dir.test.ts`를 지운다(`git rm`).

Run: `pnpm test && pnpm typecheck && pnpm spec:check`
Expected:
- PASS.
- spec 검사 출력에서 STORE-18, WIN-01, MAC-01이 "테스트 없음" 목록에서 빠진다. WIN-01은 Windows CI에서만 도는 테스트지만, 주석이 있으므로 참조로 센다.

- [ ] **Step 6: 실제 앱으로 확인 (개발자)**

```bash
cargo build --manifest-path src-tauri/Cargo.toml
DATA=$(mktemp -d)
TODOWIDGET_DATA_DIR="$DATA" ./src-tauri/target/debug/todo-widget &
sleep 3; pkill -f "target/debug/todo-widget"; ls -la "$DATA"
```

Expected: 아직 화면이 파일을 쓰지 않으므로 빈 폴더다. 명령 등록과 시작에 문제가 없는지만 본다. 실제 읽기·쓰기는 Task 10에서 본다.

- [ ] **Step 7: 커밋**

```bash
git add -A src-tauri src/adapters src/testing src/application
git commit -m "feat: Rust 안전한 쓰기와 데이터 폴더, FileStore adapter와 계약 테스트를 넣음"
```

---
### Task 4: 자동 실행 (Windows 레지스트리, macOS 로그인 항목)

**Files:**
- Create: `src-tauri/crates/core/src/autostart.rs`
- Create: `src-tauri/crates/windows/Cargo.toml`, `src-tauri/crates/windows/src/lib.rs`, `src-tauri/crates/windows/src/run_key.rs`
- Create: `src-tauri/src/commands/auto_start.rs`
- Create: `src/adapters/tauri/auto-start.ts`, `src/adapters/tauri/auto-start.test.ts`
- Modify: `src-tauri/Cargo.toml`(workspace members, Windows 의존성), `src-tauri/crates/core/src/lib.rs`, `src-tauri/src/lib.rs`, `src-tauri/src/commands/mod.rs`, `src-tauri/src/platform/{mod,macos,windows}.rs`

**Interfaces:**
- Consumes: `AutoStart` port (`src/application/ports/auto-start.ts`, 계획 3)
- Produces (Rust):
  - `todowidget_core::autostart::AutoStart` trait: `is_enabled() -> Result<bool, String>`, `enable()`, `disable()`, `refresh()`
  - Windows 판정: `RunKey` trait, `RunKeyAutoStart<K>`, `RUN_VALUE_NAME`, `run_value(&Path)`, `marks_disabled(&[u8])`
  - macOS 판정: `LoginItem` trait, `LoginItemStatus`, `LoginItemAutoStart<L>`
  - `todowidget_windows::run_key::HkcuRunKey`
  - `crate::platform::auto_start() -> Box<dyn AutoStart>`
  - 명령 `auto_start_is_enabled`, `auto_start_enable`, `auto_start_disable`, `auto_start_refresh`
- Produces (TS): `createTauriAutoStart(invoke: Invoke): AutoStart`

- [ ] **Step 1: 실패하는 판정 테스트 쓰기**

`src-tauri/crates/core/src/lib.rs`에 `pub mod autostart;`를 더한다.

`src-tauri/crates/core/src/autostart.rs`:

```rust
//! 자동 실행 판정 (START-02~05, WIN-03, WIN-04, MAC-08). OS API는 trait 뒤에 두고 판정만 여기서 테스트한다.
//! 실제 OS 구현: Windows는 `todowidget_windows::run_key::HkcuRunKey`, macOS는 `src-tauri/src/platform/macos.rs`의 `MainAppLoginItem`.
use std::path::{Path, PathBuf};

/// 앱이 쓰는 자동 실행 동작. 실패하면 한국어 오류 문자열을 돌려준다.
pub trait AutoStart: Send + Sync {
    /// OS가 실제로 허용한 상태다 (WIN-03, MAC-08).
    fn is_enabled(&self) -> Result<bool, String>;
    /// 지금 실행 파일로 등록해 켠다.
    fn enable(&self) -> Result<(), String>;
    /// 등록을 지워 끈다. 이미 꺼져 있어도 오류가 아니다 (START-04).
    fn disable(&self) -> Result<(), String>;
    /// 켤 때마다 등록 위치를 지금 실행 파일로 맞춘다. 꺼진 상태는 바꾸지 않는다 (START-03).
    fn refresh(&self) -> Result<(), String>;
}

// ---------- Windows: Run 키와 StartupApproved (WIN-03, WIN-04) ----------

/// v1.4와 같은 값 이름 (WIN-04).
pub const RUN_VALUE_NAME: &str = "TodoWidget";

/// `HKCU\...\Run`의 값 하나와 `HKCU\...\Explorer\StartupApproved\Run`의 같은 이름 값.
pub trait RunKey: Send + Sync {
    fn read(&self) -> Result<Option<String>, String>;
    fn write(&self, value: &str) -> Result<(), String>;
    /// 없어도 오류가 아니다.
    fn delete(&self) -> Result<(), String>;
    fn read_approved(&self) -> Result<Option<Vec<u8>>, String>;
    /// 없어도 오류가 아니다.
    fn delete_approved(&self) -> Result<(), String>;
}

/// 실행 파일 경로를 큰따옴표로 감싼다. v1.4와 같은 형식이다 (WIN-03).
pub fn run_value(exe: &Path) -> String {
    format!("\"{}\"", exe.display())
}

/// 작업 관리자·설정 앱이 끈 표시. 첫 바이트가 홀수(0x03, 0x07 등)면 꺼진 것이다. 0x02·0x06은 켜진 것이다.
pub fn marks_disabled(approved: &[u8]) -> bool {
    todo!()
}

pub struct RunKeyAutoStart<K> {
    key: K,
    exe: PathBuf,
}

impl<K: RunKey> RunKeyAutoStart<K> {
    pub fn new(key: K, exe: PathBuf) -> Self {
        Self { key, exe }
    }
}

impl<K: RunKey> AutoStart for RunKeyAutoStart<K> {
    fn is_enabled(&self) -> Result<bool, String> {
        todo!()
    }

    fn enable(&self) -> Result<(), String> {
        todo!()
    }

    fn disable(&self) -> Result<(), String> {
        todo!()
    }

    fn refresh(&self) -> Result<(), String> {
        todo!()
    }
}

// ---------- macOS: 로그인 항목 (MAC-08) ----------

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LoginItemStatus {
    NotRegistered,
    Enabled,
    RequiresApproval,
    NotFound,
}

/// `SMAppService.mainAppService`. 등록된 위치는 알려 주지 않는다 (MAC-08).
pub trait LoginItem: Send + Sync {
    fn status(&self) -> LoginItemStatus;
    fn register(&self) -> Result<(), String>;
    fn unregister(&self) -> Result<(), String>;
}

pub struct LoginItemAutoStart<L> {
    item: L,
}

impl<L: LoginItem> LoginItemAutoStart<L> {
    pub fn new(item: L) -> Self {
        Self { item }
    }
}

impl<L: LoginItem> AutoStart for LoginItemAutoStart<L> {
    fn is_enabled(&self) -> Result<bool, String> {
        todo!()
    }

    fn enable(&self) -> Result<(), String> {
        todo!()
    }

    fn disable(&self) -> Result<(), String> {
        todo!()
    }

    fn refresh(&self) -> Result<(), String> {
        todo!()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    const DISABLED: [u8; 12] = [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const ENABLED: [u8; 12] = [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    #[derive(Default)]
    struct FakeRunKey {
        run: Mutex<Option<String>>,
        approved: Mutex<Option<Vec<u8>>>,
        writes: Mutex<Vec<String>>,
        fail: bool,
    }

    impl FakeRunKey {
        fn with(run: Option<&str>, approved: Option<&[u8]>) -> Self {
            Self {
                run: Mutex::new(run.map(str::to_string)),
                approved: Mutex::new(approved.map(<[u8]>::to_vec)),
                ..Self::default()
            }
        }

        fn check(&self) -> Result<(), String> {
            if self.fail {
                Err("액세스가 거부되었습니다".to_string())
            } else {
                Ok(())
            }
        }
    }

    impl RunKey for FakeRunKey {
        fn read(&self) -> Result<Option<String>, String> {
            self.check()?;
            Ok(self.run.lock().unwrap().clone())
        }
        fn write(&self, value: &str) -> Result<(), String> {
            self.check()?;
            self.writes.lock().unwrap().push(value.to_string());
            *self.run.lock().unwrap() = Some(value.to_string());
            Ok(())
        }
        fn delete(&self) -> Result<(), String> {
            self.check()?;
            *self.run.lock().unwrap() = None;
            Ok(())
        }
        fn read_approved(&self) -> Result<Option<Vec<u8>>, String> {
            self.check()?;
            Ok(self.approved.lock().unwrap().clone())
        }
        fn delete_approved(&self) -> Result<(), String> {
            self.check()?;
            *self.approved.lock().unwrap() = None;
            Ok(())
        }
    }

    fn exe() -> PathBuf {
        PathBuf::from(r"C:\Users\me\AppData\Local\TodoWidget\todo-widget.exe")
    }

    fn windows(key: FakeRunKey) -> RunKeyAutoStart<FakeRunKey> {
        RunKeyAutoStart::new(key, exe())
    }

    /// WIN-03 Run 값이 있고 끈 표시가 없을 때만 켜진 것이다
    #[test]
    fn run_value_without_disabled_mark_is_enabled() {
        assert!(windows(FakeRunKey::with(Some("\"a.exe\""), None)).is_enabled().unwrap());
        assert!(windows(FakeRunKey::with(Some("\"a.exe\""), Some(&ENABLED))).is_enabled().unwrap());
        assert!(!windows(FakeRunKey::with(Some("\"a.exe\""), Some(&DISABLED))).is_enabled().unwrap());
        assert!(!windows(FakeRunKey::with(None, None)).is_enabled().unwrap());
        assert!(marks_disabled(&[7]));
        assert!(!marks_disabled(&[6]));
        assert!(!marks_disabled(&[]));
    }

    /// WIN-03 켜면 큰따옴표로 감싼 지금 실행 파일 경로를 쓰고 끈 표시를 지운다
    #[test]
    fn enable_writes_quoted_path_and_clears_disabled_mark() {
        let auto_start = windows(FakeRunKey::with(None, Some(&DISABLED)));
        auto_start.enable().unwrap();
        assert_eq!(
            auto_start.key.run.lock().unwrap().as_deref(),
            Some(r#""C:\Users\me\AppData\Local\TodoWidget\todo-widget.exe""#)
        );
        assert_eq!(*auto_start.key.approved.lock().unwrap(), None);
        assert!(auto_start.is_enabled().unwrap());
    }

    /// WIN-03 끄면 Run 값을 지우고, 이미 꺼져 있어도 오류가 아니다
    #[test]
    fn disable_deletes_run_value_twice_without_error() {
        let auto_start = windows(FakeRunKey::with(Some("\"a.exe\""), None));
        auto_start.disable().unwrap();
        auto_start.disable().unwrap();
        assert_eq!(*auto_start.key.run.lock().unwrap(), None);
    }

    /// WIN-03 켤 때 Run 값이 있으면 끈 표시가 있어도 경로만 바꾸고 끈 표시는 그대로 둔다
    #[test]
    fn refresh_rewrites_path_and_keeps_disabled_mark() {
        let auto_start = windows(FakeRunKey::with(Some("\"old.exe\""), Some(&DISABLED)));
        auto_start.refresh().unwrap();
        assert_eq!(*auto_start.key.writes.lock().unwrap(), vec![run_value(&exe())]);
        assert_eq!(auto_start.key.approved.lock().unwrap().as_deref(), Some(&DISABLED[..]));
        assert!(!auto_start.is_enabled().unwrap());
    }

    /// WIN-04 v1.4가 등록한 값은 v2.0 경로로 바꾸고, 값이 없으면 새로 만들지 않는다
    #[test]
    fn refresh_takes_over_v14_value_and_never_creates_one() {
        let v14 = windows(FakeRunKey::with(Some(r#""C:\Program Files\TodoWidget\TodoWidget.exe""#), None));
        v14.refresh().unwrap();
        assert_eq!(v14.key.run.lock().unwrap().clone(), Some(run_value(&exe())));

        let none = windows(FakeRunKey::with(None, None));
        none.refresh().unwrap();
        assert!(none.key.writes.lock().unwrap().is_empty());
        assert_eq!(*none.key.run.lock().unwrap(), None);
    }

    /// START-05 레지스트리가 거부하면 오류를 돌려준다
    #[test]
    fn registry_errors_are_returned() {
        let auto_start = windows(FakeRunKey { fail: true, ..FakeRunKey::default() });
        assert!(auto_start.enable().is_err());
        assert!(auto_start.is_enabled().is_err());
    }

    struct FakeLoginItem {
        status: Mutex<LoginItemStatus>,
        after_register: LoginItemStatus,
        calls: Mutex<Vec<&'static str>>,
        fail: bool,
    }

    impl FakeLoginItem {
        fn new(status: LoginItemStatus) -> Self {
            Self { status: Mutex::new(status), after_register: LoginItemStatus::Enabled, calls: Mutex::default(), fail: false }
        }
        fn calls(&self) -> Vec<&'static str> {
            self.calls.lock().unwrap().clone()
        }
    }

    impl LoginItem for FakeLoginItem {
        fn status(&self) -> LoginItemStatus {
            *self.status.lock().unwrap()
        }
        fn register(&self) -> Result<(), String> {
            self.calls.lock().unwrap().push("register");
            if self.fail {
                return Err("Operation not permitted".to_string());
            }
            *self.status.lock().unwrap() = self.after_register;
            Ok(())
        }
        fn unregister(&self) -> Result<(), String> {
            self.calls.lock().unwrap().push("unregister");
            *self.status.lock().unwrap() = LoginItemStatus::NotRegistered;
            Ok(())
        }
    }

    /// MAC-08 macOS가 켜짐으로 알려 줄 때만 켜진 것이다. 사용자가 끈 것과 승인 대기는 꺼진 것이다
    #[test]
    fn only_enabled_status_is_enabled() {
        use LoginItemStatus::*;
        for (status, expected) in [(Enabled, true), (RequiresApproval, false), (NotRegistered, false), (NotFound, false)] {
            assert_eq!(LoginItemAutoStart::new(FakeLoginItem::new(status)).is_enabled().unwrap(), expected, "{status:?}");
        }
    }

    /// MAC-08 켜면 로그인 항목으로 등록하고, macOS가 승인을 기다리게 하면 실패로 알린다
    #[test]
    fn enable_registers_and_fails_when_approval_is_needed() {
        let auto_start = LoginItemAutoStart::new(FakeLoginItem::new(LoginItemStatus::NotRegistered));
        auto_start.enable().unwrap();
        assert_eq!(auto_start.item.calls(), vec!["register"]);

        let mut needs_approval = FakeLoginItem::new(LoginItemStatus::NotRegistered);
        needs_approval.after_register = LoginItemStatus::RequiresApproval;
        assert!(LoginItemAutoStart::new(needs_approval).enable().is_err());

        let mut refused = FakeLoginItem::new(LoginItemStatus::NotRegistered);
        refused.fail = true;
        assert_eq!(LoginItemAutoStart::new(refused).enable(), Err("Operation not permitted".to_string()));
    }

    /// MAC-08 끄면 등록을 지우고, 등록되지 않았으면 아무것도 하지 않는다
    #[test]
    fn disable_unregisters_only_when_registered() {
        for status in [LoginItemStatus::Enabled, LoginItemStatus::RequiresApproval] {
            let auto_start = LoginItemAutoStart::new(FakeLoginItem::new(status));
            auto_start.disable().unwrap();
            assert_eq!(auto_start.item.calls(), vec!["unregister"], "{status:?}");
        }
        let none = LoginItemAutoStart::new(FakeLoginItem::new(LoginItemStatus::NotRegistered));
        none.disable().unwrap();
        assert!(none.item.calls().is_empty());
    }

    /// MAC-08 켜져 있으면 켤 때마다 지금 위치로 다시 등록하고, 꺼져 있으면 아무것도 하지 않는다
    #[test]
    fn refresh_re_registers_only_when_enabled() {
        let enabled = LoginItemAutoStart::new(FakeLoginItem::new(LoginItemStatus::Enabled));
        enabled.refresh().unwrap();
        assert_eq!(enabled.item.calls(), vec!["register"]);
        for status in [LoginItemStatus::NotRegistered, LoginItemStatus::RequiresApproval, LoginItemStatus::NotFound] {
            let auto_start = LoginItemAutoStart::new(FakeLoginItem::new(status));
            auto_start.refresh().unwrap();
            assert!(auto_start.item.calls().is_empty(), "{status:?}");
        }
    }
}
```

Run: `cargo test --manifest-path src-tauri/Cargo.toml -p todowidget-core autostart`
Expected: FAIL (`not yet implemented`)

- [ ] **Step 2: 판정 구현**

```rust
pub fn marks_disabled(approved: &[u8]) -> bool {
    approved.first().is_some_and(|flag| flag & 1 == 1)
}
```

`RunKeyAutoStart`:

```rust
    fn is_enabled(&self) -> Result<bool, String> {
        if self.key.read()?.is_none() {
            return Ok(false);
        }
        Ok(!self.key.read_approved()?.is_some_and(|bytes| marks_disabled(&bytes)))
    }

    fn enable(&self) -> Result<(), String> {
        self.key.write(&run_value(&self.exe))?;
        self.key.delete_approved()
    }

    fn disable(&self) -> Result<(), String> {
        self.key.delete()
    }

    fn refresh(&self) -> Result<(), String> {
        if self.key.read()?.is_some() {
            self.key.write(&run_value(&self.exe))?;
        }
        Ok(())
    }
```

`LoginItemAutoStart`:

```rust
    fn is_enabled(&self) -> Result<bool, String> {
        Ok(self.item.status() == LoginItemStatus::Enabled)
    }

    fn enable(&self) -> Result<(), String> {
        self.item.register()?;
        match self.item.status() {
            LoginItemStatus::Enabled => Ok(()),
            LoginItemStatus::RequiresApproval => {
                Err("시스템 설정 → 일반 → 로그인 항목에서 허용해야 해요".to_string())
            }
            status => Err(format!("로그인 항목에 등록되지 않았어요 ({status:?})")),
        }
    }

    fn disable(&self) -> Result<(), String> {
        match self.item.status() {
            LoginItemStatus::Enabled | LoginItemStatus::RequiresApproval => self.item.unregister(),
            LoginItemStatus::NotRegistered | LoginItemStatus::NotFound => Ok(()),
        }
    }

    fn refresh(&self) -> Result<(), String> {
        if self.item.status() == LoginItemStatus::Enabled {
            self.item.register()?;
        }
        Ok(())
    }
```

Run: `cargo test --manifest-path src-tauri/Cargo.toml -p todowidget-core`
Expected: PASS

- [ ] **Step 3: Windows 레지스트리 구현 crate 만들기**

`src-tauri/crates/windows/Cargo.toml`:

```toml
[package]
name = "todowidget-windows"
version = "0.0.0"
edition = "2021"
publish = false
description = "Tauri 없이 테스트하는 TodoWidget Windows API"

[target.'cfg(windows)'.dependencies]
todowidget-core = { path = "../core" }
windows-registry = "0.6"
windows-result = "0.4"
```

`windows-result`는 `cargo tree --target x86_64-pc-windows-msvc -i windows-result`로 이미 쓰는 버전과 같은지 확인하고 맞춘다.

`src-tauri/crates/windows/src/lib.rs`:

```rust
//! Windows API. 앱 crate와 달리 Tauri를 링크하지 않아 Windows CI에서 테스트를 돌릴 수 있고, Mac에서도 `cargo check --target x86_64-pc-windows-msvc`로 검사할 수 있다.
#![cfg(windows)]
pub mod run_key;
```

`src-tauri/crates/windows/src/run_key.rs`:

```rust
//! `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`과 `...\Explorer\StartupApproved\Run` (WIN-03). 현재 사용자 키라서 관리자 권한이 필요 없다.
use todowidget_core::autostart::RunKey;
use windows_registry::{Key, CURRENT_USER};

const RUN: &str = r"Software\Microsoft\Windows\CurrentVersion\Run";
const APPROVED: &str = r"Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run";
/// `HRESULT_FROM_WIN32(ERROR_FILE_NOT_FOUND)`. 키나 값이 없을 때 온다.
const NOT_FOUND: i32 = 0x8007_0002_u32 as i32;

pub struct HkcuRunKey {
    name: String,
}

impl HkcuRunKey {
    pub fn new(name: impl Into<String>) -> Self {
        Self { name: name.into() }
    }
}

fn is_missing(error: &windows_result::Error) -> bool {
    error.code().0 == NOT_FOUND
}

fn message(error: windows_result::Error) -> String {
    error.message()
}

/// 읽고 쓸 수 있게 연다. 키가 없으면 `None`.
fn open(path: &str) -> Result<Option<Key>, String> {
    match CURRENT_USER.options().read().write().open(path) {
        Ok(key) => Ok(Some(key)),
        Err(error) if is_missing(&error) => Ok(None),
        Err(error) => Err(message(error)),
    }
}

fn remove_value(path: &str, name: &str) -> Result<(), String> {
    let Some(key) = open(path)? else { return Ok(()) };
    match key.remove_value(name) {
        Ok(()) => Ok(()),
        Err(error) if is_missing(&error) => Ok(()),
        Err(error) => Err(message(error)),
    }
}

impl RunKey for HkcuRunKey {
    fn read(&self) -> Result<Option<String>, String> {
        let Some(key) = open(RUN)? else { return Ok(None) };
        match key.get_string(&self.name) {
            Ok(value) => Ok(Some(value)),
            Err(error) if is_missing(&error) => Ok(None),
            Err(error) => Err(message(error)),
        }
    }

    fn write(&self, value: &str) -> Result<(), String> {
        CURRENT_USER.create(RUN).and_then(|key| key.set_string(&self.name, value)).map_err(message)
    }

    fn delete(&self) -> Result<(), String> {
        remove_value(RUN, &self.name)
    }

    fn read_approved(&self) -> Result<Option<Vec<u8>>, String> {
        let Some(key) = open(APPROVED)? else { return Ok(None) };
        match key.get_value(&self.name) {
            Ok(value) => Ok(Some(value.to_vec())),
            Err(error) if is_missing(&error) => Ok(None),
            Err(error) => Err(message(error)),
        }
    }

    fn delete_approved(&self) -> Result<(), String> {
        remove_value(APPROVED, &self.name)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;
    use todowidget_core::autostart::{run_value, AutoStart, RunKeyAutoStart};
    use windows_registry::Type;

    /// 실제 HKCU에 시험용 이름으로 쓰고, 끝나면(실패해도) 지운다.
    struct TestValue(String);

    impl Drop for TestValue {
        fn drop(&mut self) {
            let _ = remove_value(RUN, &self.0);
            let _ = remove_value(APPROVED, &self.0);
        }
    }

    /// WIN-03 실제 레지스트리에서 켜기, 작업 관리자의 끈 표시, 끄기가 판정대로 동작한다
    #[test]
    fn real_registry_round_trip() {
        let value = TestValue(format!("TodoWidgetTest{}", std::process::id()));
        let exe = PathBuf::from(r"C:\시험\todo-widget.exe");
        let auto_start = RunKeyAutoStart::new(HkcuRunKey::new(value.0.clone()), exe.clone());

        assert!(!auto_start.is_enabled().unwrap());
        auto_start.enable().unwrap();
        assert!(auto_start.is_enabled().unwrap());
        assert_eq!(HkcuRunKey::new(value.0.clone()).read().unwrap(), Some(run_value(&exe)));

        CURRENT_USER.create(APPROVED).unwrap().set_bytes(&value.0, Type::Bytes, &[3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]).unwrap();
        assert!(!auto_start.is_enabled().unwrap());
        auto_start.refresh().unwrap();
        assert!(!auto_start.is_enabled().unwrap());

        auto_start.enable().unwrap();
        assert!(auto_start.is_enabled().unwrap());
        auto_start.disable().unwrap();
        auto_start.disable().unwrap();
        assert_eq!(HkcuRunKey::new(value.0.clone()).read().unwrap(), None);
    }
}
```

`windows-registry` 0.6.1 API를 docs.rs에서 확인하고 이름이 다르면 맞춘다. 확인할 이름은 다음과 같다.
- `Key::options()`, `read()`, `write()`, `open()`
- `get_value`와 그 반환값을 바이트로 바꾸는 법
- `set_bytes`, `remove_value`
- `windows_result::Error::message`

동작은 위와 같아야 한다.

`src-tauri/Cargo.toml`:

```toml
[workspace]
members = ["crates/core", "crates/windows"]
```

```toml
[target.'cfg(windows)'.dependencies]
todowidget-windows = { path = "crates/windows" }
```

Run:
```bash
cargo check --manifest-path src-tauri/Cargo.toml -p todowidget-windows --target x86_64-pc-windows-msvc
cargo clippy --manifest-path src-tauri/Cargo.toml -p todowidget-windows --target x86_64-pc-windows-msvc --all-targets -- -D warnings
```
Expected:
- 둘 다 통과한다.
- 실제 레지스트리 테스트(`real_registry_round_trip`)는 Windows CI에서 돈다(Task 11).

- [ ] **Step 4: macOS 로그인 항목과 앱 연결**

`src-tauri/src/platform/macos.rs`에 더한다(파일 맨 위 doc 주석의 "로그인 항목" 설명은 그대로 둔다).

```rust
use objc2_service_management::{SMAppService, SMAppServiceStatus};
use todowidget_core::autostart::{AutoStart, LoginItem, LoginItemAutoStart, LoginItemStatus};

/// 앱 자체를 로그인 항목으로 (MAC-08, macOS 13 이상).
struct MainAppLoginItem;

impl LoginItem for MainAppLoginItem {
    fn status(&self) -> LoginItemStatus {
        // SAFETY: SMAppService는 macOS 13 이상에서 쓸 수 있고, minimumSystemVersion이 13.0이다.
        let status = unsafe { SMAppService::mainAppService().status() };
        match status {
            SMAppServiceStatus::Enabled => LoginItemStatus::Enabled,
            SMAppServiceStatus::RequiresApproval => LoginItemStatus::RequiresApproval,
            SMAppServiceStatus::NotFound => LoginItemStatus::NotFound,
            _ => LoginItemStatus::NotRegistered,
        }
    }

    fn register(&self) -> Result<(), String> {
        // SAFETY: 위와 같다.
        unsafe { SMAppService::mainAppService().registerAndReturnError() }
            .map_err(|error| error.localizedDescription().to_string())
    }

    fn unregister(&self) -> Result<(), String> {
        // SAFETY: 위와 같다.
        unsafe { SMAppService::mainAppService().unregisterAndReturnError() }
            .map_err(|error| error.localizedDescription().to_string())
    }
}

pub fn auto_start() -> Box<dyn AutoStart> {
    Box::new(LoginItemAutoStart::new(MainAppLoginItem))
}
```

`localizedDescription`을 쓰려면 `objc2-foundation`의 `NSError` feature가 필요할 수 있다. 컴파일 오류가 나면 `objc2-foundation = { version = "0.3", features = ["NSError", "NSString"] }`을 macOS 의존성에 더한다. `localizedDescription`이 없는 버전이면 계획 2처럼 `format!("{error:?}")`를 쓴다.

`src-tauri/src/platform/windows.rs`에 더한다:

```rust
use todowidget_core::autostart::{AutoStart, RunKeyAutoStart, RUN_VALUE_NAME};
use todowidget_windows::run_key::HkcuRunKey;

pub fn auto_start() -> Box<dyn AutoStart> {
    let exe = std::env::current_exe().unwrap_or_default();
    Box::new(RunKeyAutoStart::new(HkcuRunKey::new(RUN_VALUE_NAME), exe))
}
```

`src-tauri/src/platform/mod.rs`의 두 `pub use` 줄에 `auto_start`를 더한다.

`src-tauri/src/commands/auto_start.rs`:

```rust
//! 자동 실행 명령. JS의 `AutoStart` adapter(`src/adapters/tauri/auto-start.ts`)가 부른다.
use tauri::State;
use todowidget_core::autostart::AutoStart;

pub struct AutoStartState(pub Box<dyn AutoStart>);

#[tauri::command]
pub async fn auto_start_is_enabled(state: State<'_, AutoStartState>) -> Result<bool, String> {
    state.0.is_enabled()
}

#[tauri::command]
pub async fn auto_start_enable(state: State<'_, AutoStartState>) -> Result<(), String> {
    state.0.enable()
}

#[tauri::command]
pub async fn auto_start_disable(state: State<'_, AutoStartState>) -> Result<(), String> {
    state.0.disable()
}

#[tauri::command]
pub async fn auto_start_refresh(state: State<'_, AutoStartState>) -> Result<(), String> {
    state.0.refresh()
}
```

`commands/mod.rs`에 `pub mod auto_start;`를 더한다. `lib.rs`의 builder에는 `.manage(commands::auto_start::AutoStartState(platform::auto_start()))`를 더하고, 네 명령을 `generate_handler!`에 등록한다.

- [ ] **Step 5: 실패하는 TS adapter 테스트 쓰기**

`src/adapters/tauri/auto-start.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { createTauriAutoStart } from './auto-start.ts';

describe('Tauri AutoStart adapter', () => {
  it('START-04 네 동작을 Rust 명령으로 넘기고 켜짐 여부를 돌려준다', async () => {
    const invoke = vi.fn(async (command: string) => (command === 'auto_start_is_enabled' ? true : null));
    const autoStart = createTauriAutoStart(invoke);
    expect(await autoStart.isEnabled()).toBe(true);
    await autoStart.enable();
    await autoStart.disable();
    await autoStart.refresh();
    expect(invoke.mock.calls.map(([command]) => command)).toEqual([
      'auto_start_is_enabled',
      'auto_start_enable',
      'auto_start_disable',
      'auto_start_refresh',
    ]);
  });

  it('START-05 Rust가 거부하면 그 문구를 담은 Error로 던진다', async () => {
    const autoStart = createTauriAutoStart(async () => {
      throw '시스템 설정 → 일반 → 로그인 항목에서 허용해야 해요';
    });
    await expect(autoStart.enable()).rejects.toThrow('로그인 항목에서 허용해야 해요');
  });
});
```

Run: `pnpm vitest run src/adapters/tauri/auto-start.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 6: TS adapter 구현**

`src/adapters/tauri/auto-start.ts`:

```ts
import type { AutoStart } from '../../application/ports/auto-start.ts';
import type { Invoke } from './invoke.ts';

/** OS 자동 실행 (WIN-03, MAC-08). 판정은 Rust(`todowidget_core::autostart`)가 한다. */
export function createTauriAutoStart(invoke: Invoke): AutoStart {
  async function call(command: string): Promise<unknown> {
    try {
      return await invoke(command);
    } catch (error) {
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  return {
    isEnabled: async () => (await call('auto_start_is_enabled')) === true,
    enable: async () => {
      await call('auto_start_enable');
    },
    disable: async () => {
      await call('auto_start_disable');
    },
    refresh: async () => {
      await call('auto_start_refresh');
    },
  };
}
```

- [ ] **Step 7: 전체 검사와 커밋**

Global Constraints의 검사와 Windows 대상 check·clippy를 돌린다. 그다음 `pnpm tauri build --debug --no-bundle`도 통과하는지 본다.

```bash
git add -A src-tauri src/adapters
git commit -m "feat: Windows Run 키와 macOS 로그인 항목으로 자동 실행을 연결함"
```

---

### Task 5: 창 좌표와 크기 조절

**Files:**
- Create: `src/domain/resize.ts`, `src/domain/resize.test.ts`
- Create: `src/application/ports/window-controller.ts`
- Create: `src/adapters/tauri/coordinates.ts`, `src/adapters/tauri/coordinates.test.ts`
- Create: `src/adapters/tauri/resize-tracker.ts`, `src/adapters/tauri/resize-tracker.test.ts`
- Create: `src/adapters/tauri/window-controller.ts`, `src/adapters/tauri/window-controller.test.ts`
- Create: `src-tauri/crates/core/src/frame.rs`, `src-tauri/crates/windows/src/frame.rs`
- Delete: `src/presentation/window-controls.ts`, `src/adapters/tauri/window.ts`, `src/adapters/tauri/window.test.ts`
- Modify: `src-tauri/crates/core/src/lib.rs`, `src-tauri/crates/windows/src/lib.rs`, `src-tauri/crates/windows/Cargo.toml`, `src-tauri/Cargo.toml`(macOS: objc2-app-kit 등)
- Modify: `src-tauri/src/commands/mod.rs`(`set_frame`), `src-tauri/src/lib.rs`, `src-tauri/src/platform/{mod,macos,windows}.rs`
- Modify: `src-tauri/tauri.conf.json`(`resizable: false`), `src-tauri/capabilities/default.json`
- Modify: `src/presentation/App.svelte`, `src/main.ts` (새 port로 바꿈. 실제 연결은 Task 10)

**Interfaces:**
- Consumes: `Rect`, `WINDOW_LIMITS` (`src/domain/window-geometry.ts`), `Invoke`
- Produces (domain):
  - `type ResizeEdge = 'North' | 'South' | 'East' | 'West' | 'NorthEast' | 'NorthWest' | 'SouthEast' | 'SouthWest'`
  - `interface SizeLimits { minWidth; maxWidth; minHeight; maxHeight }`
  - `resizeRect(start: Rect, edge: ResizeEdge, dx: number, dy: number, limits: SizeLimits): Rect`
  - `resizeLimits(workAreaHeight: number): SizeLimits`
- Produces (application port, `src/application/ports/window-controller.ts`):
  - `interface ScreenLayout { monitors: readonly Rect[]; primaryWorkArea: Rect }`
  - `interface PointerStart { screenX: number; screenY: number }`
  - `interface WindowController`:
    - `screen()`, `bounds()`, `setBounds(rect)`, `setPinned(pinned)`
    - `show(paintedAtMs)`, `keepHidden()`, `startDragging()`
    - `resize(edge, start, limits): Promise<Rect>`
    - `onMoved(listener): () => void`
- Produces (adapter):
  - `type DesktopOs = 'windows' | 'macos'`
  - `class Coordinates`
  - `trackResize(...)`, `type PointerSource`
  - `createWindowController(deps: WindowControllerDeps): WindowController`
  - `interface TauriWindowApi`
- Produces (Rust):
  - `todowidget_core::frame::{Frame, cocoa_origin_y}`, `Frame::to_pixels()`
  - `todowidget_windows::frame::set_window_frame(hwnd: isize, left, top, width, height)`
  - 명령 `set_frame(left: f64, top: f64, width: f64, height: f64)`
  - `crate::platform::set_frame(&WebviewWindow, Frame)`

- [ ] **Step 1: 실패하는 크기 조절 계산 테스트 쓰기**

`src/domain/resize.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { resizeLimits, resizeRect } from './resize.ts';

const start = { left: 1000, top: 100, width: 320, height: 520 };
const limits = resizeLimits(1040);

describe('크기 조절 계산', () => {
  it('WND-03 오른쪽·아래 가장자리는 끈 만큼 크기만 바꾼다', () => {
    expect(resizeRect(start, 'East', 50, 999, limits)).toEqual({ left: 1000, top: 100, width: 370, height: 520 });
    expect(resizeRect(start, 'South', 999, 80, limits)).toEqual({ left: 1000, top: 100, width: 320, height: 600 });
    expect(resizeRect(start, 'SouthEast', 50, 80, limits)).toEqual({ left: 1000, top: 100, width: 370, height: 600 });
  });

  it('WND-03 위·왼쪽 가장자리는 반대쪽 끝을 그대로 두고 위치와 크기를 함께 바꾼다', () => {
    expect(resizeRect(start, 'West', -50, 0, limits)).toEqual({ left: 950, top: 100, width: 370, height: 520 });
    expect(resizeRect(start, 'North', 0, -80, limits)).toEqual({ left: 1000, top: 20, width: 320, height: 600 });
    expect(resizeRect(start, 'NorthWest', 30, 20, limits)).toEqual({ left: 1030, top: 120, width: 290, height: 500 });
    expect(resizeRect(start, 'NorthEast', 30, 20, limits)).toEqual({ left: 1000, top: 120, width: 350, height: 500 });
    expect(resizeRect(start, 'SouthWest', 30, 20, limits)).toEqual({ left: 1030, top: 100, width: 290, height: 540 });
  });

  it('WND-04 폭은 280~620 안에서만 바뀌고, 왼쪽을 끌 때도 오른쪽 끝은 그대로다', () => {
    expect(resizeRect(start, 'East', -500, 0, limits).width).toBe(280);
    expect(resizeRect(start, 'East', 1000, 0, limits).width).toBe(620);
    expect(resizeRect(start, 'West', 500, 0, limits)).toEqual({ left: 1040, top: 100, width: 280, height: 520 });
  });

  it('WND-05 높이는 300 이상, 작업 영역 높이 이하에서만 바뀐다', () => {
    expect(resizeRect(start, 'South', 0, -500, limits).height).toBe(300);
    expect(resizeRect(start, 'South', 0, 5000, limits).height).toBe(1040);
    expect(resizeRect(start, 'North', 0, 400, limits)).toEqual({ left: 1000, top: 320, width: 320, height: 300 });
    expect(resizeLimits(150)).toEqual({ minWidth: 280, maxWidth: 620, minHeight: 300, maxHeight: 300 });
  });
});
```

Run: `pnpm vitest run src/domain/resize.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 2: 계산 구현**

`src/domain/resize.ts`:

```ts
import { type Rect, WINDOW_LIMITS } from './window-geometry.ts';

/** 크기를 바꾸는 가장자리와 모서리 (WND-03). */
export type ResizeEdge = 'North' | 'South' | 'East' | 'West' | 'NorthEast' | 'NorthWest' | 'SouthEast' | 'SouthWest';

export interface SizeLimits {
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
}

/** 끄는 동안과 놓은 뒤 저장할 때 같은 범위를 쓴다. 폭 280~620(WND-04), 높이 300~작업 영역 높이(WND-05). */
export function resizeLimits(workAreaHeight: number): SizeLimits {
  return {
    minWidth: WINDOW_LIMITS.minWidth,
    maxWidth: WINDOW_LIMITS.maxWidth,
    minHeight: WINDOW_LIMITS.minMaxHeight,
    maxHeight: Math.max(WINDOW_LIMITS.minMaxHeight, workAreaHeight),
  };
}

/**
 * 끈 거리(dx, dy)만큼 잡은 가장자리를 옮긴다. 반대쪽 가장자리는 그대로이고 크기는 limits 안으로 맞춘다 (WND-03).
 * 단위는 호출하는 쪽이 정한다. start, 거리, limits가 같은 단위면 된다.
 */
export function resizeRect(start: Rect, edge: ResizeEdge, dx: number, dy: number, limits: SizeLimits): Rect {
  let { left, top, width, height } = start;
  if (edge.endsWith('East'))
    width = clamp(start.width + dx, limits.minWidth, limits.maxWidth);
  if (edge.endsWith('West')) {
    width = clamp(start.width - dx, limits.minWidth, limits.maxWidth);
    left = start.left + start.width - width;
  }
  if (edge.startsWith('South'))
    height = clamp(start.height + dy, limits.minHeight, limits.maxHeight);
  if (edge.startsWith('North')) {
    height = clamp(start.height - dy, limits.minHeight, limits.maxHeight);
    top = start.top + start.height - height;
  }
  return { left, top, width, height };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
```

Run: `pnpm vitest run src/domain/resize.test.ts`
Expected: PASS

- [ ] **Step 3: port 옮기기**

`src/application/ports/window-controller.ts`:

```ts
import type { ResizeEdge, SizeLimits } from '../../domain/resize.ts';
import type { Rect } from '../../domain/window-geometry.ts';

/** 모니터 영역(작업 표시줄·메뉴 막대 포함)과 주 모니터 작업 영역 (WND-07, WND-08). */
export interface ScreenLayout {
  monitors: readonly Rect[];
  primaryWorkArea: Rect;
}

/** 끌기를 시작한 pointer의 화면 좌표(CSS px). */
export interface PointerStart {
  screenX: number;
  screenY: number;
}

/**
 * 위젯 창. 위치·크기·영역은 window.md 용어 "크기와 좌표"의 단위다.
 * 실제 구현은 src/adapters/tauri/window-controller.ts, 테스트용은 src/testing/fake-window-controller.ts.
 */
export interface WindowController {
  screen(): Promise<ScreenLayout>;
  bounds(): Promise<Rect>;
  /** 위치와 크기를 한 번에 바꾼다. */
  setBounds(rect: Rect): Promise<void>;
  /** 맨 위 고정 (WND-09). */
  setPinned(pinned: boolean): Promise<void>;
  /** 화면을 다 그렸으면 창을 보인다. paintedAtMs는 계획 2 시험 측정용이다. */
  show(paintedAtMs: number): Promise<void>;
  /** 시작하지 못해 대화 상자만 띄울 때 창을 숨긴 채 둔다 (STORE-10). */
  keepHidden(): Promise<void>;
  /** OS 기본 끌기로 창을 옮긴다 (WND-02). 끝난 때는 알 수 없으므로 onMoved로 안다. */
  startDragging(): Promise<void>;
  /** 가장자리를 끄는 동안 창이 따라오고, 놓으면 마지막 창 영역을 돌려준다 (WND-03). */
  resize(edge: ResizeEdge, start: PointerStart, limits: SizeLimits): Promise<Rect>;
  /** 창이 옮겨질 때마다 부른다. 돌려준 함수를 부르면 그만 받는다. */
  onMoved(listener: () => void): () => void;
}
```

`src/presentation/window-controls.ts`, `src/adapters/tauri/window.ts`, `src/adapters/tauri/window.test.ts`를 지운다(`git rm`).

- [ ] **Step 4: 실패하는 좌표 변환 테스트 쓰기**

`src/adapters/tauri/coordinates.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { Coordinates } from './coordinates.ts';

describe('좌표 변환 (window.md 용어 "크기와 좌표")', () => {
  it('WND-08 Windows는 위치를 주 모니터 배율로, 크기를 창이 있는 모니터 배율로 나눈다', () => {
    const coords = new Coordinates('windows', 1.5);
    // 배율 1인 오른쪽 보조 모니터 위의 창
    const native = coords.physicalToNative({ x: 2880, y: 150, width: 320, height: 520 }, 1);
    expect(native).toEqual({ left: 2880, top: 150, width: 320, height: 520 });
    const spec = coords.nativeToSpec(native, 1);
    expect(spec).toEqual({ left: 1920, top: 100, width: 320, height: 520 });
    expect(coords.specToNative(spec, 1)).toEqual(native);
    expect(coords.nativePerCss(1.5)).toBe(1.5);
  });

  it('WND-08 Windows 모니터 영역은 모두 주 모니터 배율로 나눈다 (v1.4 DIP와 같다)', () => {
    const coords = new Coordinates('windows', 1.25);
    expect(coords.monitorToSpec({ x: 0, y: 0, width: 2400, height: 1350 }, 1.25)).toEqual({ left: 0, top: 0, width: 1920, height: 1080 });
    expect(coords.monitorToSpec({ x: -1920, y: 0, width: 1920, height: 1080 }, 1)).toEqual({ left: -1536, top: 0, width: 1536, height: 864 });
  });

  it('WND-08 macOS는 OS 포인트 좌표를 그대로 쓴다', () => {
    const coords = new Coordinates('macos', 2);
    // Tauri는 macOS에서도 포인트에 창(모니터) 배율을 곱한 값을 준다
    const native = coords.physicalToNative({ x: 3152, y: 48, width: 640, height: 1040 }, 2);
    expect(native).toEqual({ left: 1576, top: 24, width: 320, height: 520 });
    expect(coords.nativeToSpec(native, 2)).toEqual(native);
    expect(coords.specToNative(native, 2)).toEqual(native);
    expect(coords.nativePerCss(2)).toBe(1);
    expect(coords.monitorToSpec({ x: 0, y: 0, width: 2880, height: 1800 }, 2)).toEqual({ left: 0, top: 0, width: 1440, height: 900 });
    expect(coords.monitorToSpec({ x: 1440, y: 0, width: 1920, height: 1080 }, 1)).toEqual({ left: 1440, top: 0, width: 1920, height: 1080 });
  });

  it('WND-04 크기 조절 범위는 Windows에서 창 모니터 배율만큼 키우고 macOS는 그대로 둔다', () => {
    const limits = { minWidth: 280, maxWidth: 620, minHeight: 300, maxHeight: 1040 };
    expect(new Coordinates('windows', 1).limitsToNative(limits, 1.5)).toEqual({ minWidth: 420, maxWidth: 930, minHeight: 450, maxHeight: 1560 });
    expect(new Coordinates('macos', 2).limitsToNative(limits, 2)).toEqual(limits);
  });
});
```

Run: `pnpm vitest run src/adapters/tauri/coordinates.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 5: 좌표 변환 구현**

`src/adapters/tauri/coordinates.ts`:

```ts
import type { SizeLimits } from '../../domain/resize.ts';
import type { Rect } from '../../domain/window-geometry.ts';

export type DesktopOs = 'windows' | 'macos';

/** Tauri JS API가 주는 영역. 실제 픽셀이다(macOS는 포인트 × 그 창·모니터의 배율). */
export interface PhysicalRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * OS 좌표와 spec 좌표(window.md 용어 "크기와 좌표") 사이를 바꾼다. 이 파일은 OS 분기를 둘 수 있는 곳이다(설계 문서 5.4).
 * - native: Rust `set_frame`이 받는 단위. Windows는 실제 픽셀, macOS는 포인트.
 * - spec: Windows 위치는 실제 픽셀 ÷ 주 모니터 배율, 크기는 ÷ 창이 있는 모니터 배율. macOS는 포인트 그대로.
 */
export class Coordinates {
  readonly #os: DesktopOs;
  readonly #primaryScale: number;

  constructor(os: DesktopOs, primaryScale: number) {
    this.#os = os;
    this.#primaryScale = primaryScale;
  }

  physicalToNative(rect: PhysicalRect, windowScale: number): Rect {
    const divisor = this.#os === 'macos' ? windowScale : 1;
    return { left: rect.x / divisor, top: rect.y / divisor, width: rect.width / divisor, height: rect.height / divisor };
  }

  nativeToSpec(rect: Rect, windowScale: number): Rect {
    if (this.#os === 'macos')
      return { ...rect };
    return {
      left: rect.left / this.#primaryScale,
      top: rect.top / this.#primaryScale,
      width: rect.width / windowScale,
      height: rect.height / windowScale,
    };
  }

  specToNative(rect: Rect, windowScale: number): Rect {
    if (this.#os === 'macos')
      return { ...rect };
    return {
      left: rect.left * this.#primaryScale,
      top: rect.top * this.#primaryScale,
      width: rect.width * windowScale,
      height: rect.height * windowScale,
    };
  }

  /** pointer가 CSS px 1만큼 움직일 때 native 단위로 얼마인지. */
  nativePerCss(windowScale: number): number {
    return this.#os === 'macos' ? 1 : windowScale;
  }

  monitorToSpec(rect: PhysicalRect, monitorScale: number): Rect {
    const divisor = this.#os === 'macos' ? monitorScale : this.#primaryScale;
    return { left: rect.x / divisor, top: rect.y / divisor, width: rect.width / divisor, height: rect.height / divisor };
  }

  limitsToNative(limits: SizeLimits, windowScale: number): SizeLimits {
    const factor = this.#os === 'macos' ? 1 : windowScale;
    return {
      minWidth: limits.minWidth * factor,
      maxWidth: limits.maxWidth * factor,
      minHeight: limits.minHeight * factor,
      maxHeight: limits.maxHeight * factor,
    };
  }
}
```

Run: `pnpm vitest run src/adapters/tauri/coordinates.test.ts`
Expected: PASS

- [ ] **Step 6: 실패하는 크기 조절 추적 테스트 쓰기**

`src/adapters/tauri/resize-tracker.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Rect } from '../../domain/window-geometry.ts';
import { type PointerLike, type PointerSource, trackResize } from './resize-tracker.ts';

class FakePointer implements PointerSource {
  readonly #listeners = new Map<string, Set<(event: PointerLike) => void>>();

  addEventListener(type: string, listener: (event: PointerLike) => void): void {
    const set = this.#listeners.get(type) ?? new Set();
    set.add(listener);
    this.#listeners.set(type, set);
  }

  removeEventListener(type: string, listener: (event: PointerLike) => void): void {
    this.#listeners.get(type)?.delete(listener);
  }

  emit(type: 'pointermove' | 'pointerup' | 'pointercancel', screenX: number, screenY: number): void {
    for (const listener of [...(this.#listeners.get(type) ?? [])])
      listener({ screenX, screenY });
  }

  get listenerCount(): number {
    return [...this.#listeners.values()].reduce((sum, set) => sum + set.size, 0);
  }
}

const limits = { minWidth: 280, maxWidth: 620, minHeight: 300, maxHeight: 1040 };
const startRect = { left: 1000, top: 100, width: 320, height: 520 };

function setup(nativePerCss = 1) {
  const pointer = new FakePointer();
  const frames: Array<() => void> = [];
  const sent: Rect[] = [];
  const done = trackResize(
    { source: pointer, requestFrame: (callback) => frames.push(callback), setFrame: async (rect) => void sent.push(rect) },
    { edge: 'SouthEast', start: { screenX: 500, screenY: 500 }, startRect, limits, nativePerCss },
  );
  const flushFrames = () => frames.splice(0).forEach((callback) => callback());
  return { pointer, sent, done, flushFrames };
}

describe('크기 조절 추적', () => {
  it('WND-03 끄는 동안 화면을 그릴 때마다 마지막 위치로 한 번만 창을 바꾼다', async () => {
    const { pointer, sent, flushFrames } = setup();
    pointer.emit('pointermove', 510, 505);
    pointer.emit('pointermove', 520, 530);
    expect(sent).toEqual([]);
    flushFrames();
    await Promise.resolve();
    expect(sent).toEqual([{ left: 1000, top: 100, width: 340, height: 550 }]);
  });

  it('WND-03 놓으면 마지막 영역을 적용하고 돌려주며, pointer 듣기를 멈춘다', async () => {
    const { pointer, sent, done } = setup();
    pointer.emit('pointerup', 560, 600);
    expect(await done).toEqual({ left: 1000, top: 100, width: 380, height: 620 });
    expect(sent.at(-1)).toEqual({ left: 1000, top: 100, width: 380, height: 620 });
    expect(pointer.listenerCount).toBe(0);
  });

  it('pointer 이동은 native 단위로 바꿔 계산한다 (Windows 배율 1.5)', async () => {
    const { pointer, done } = setup(1.5);
    pointer.emit('pointerup', 520, 500);
    expect((await done).width).toBe(350);
  });

  it('취소되면 마지막으로 받은 위치에서 끝낸다', async () => {
    const { pointer, done, flushFrames } = setup();
    pointer.emit('pointermove', 540, 500);
    flushFrames();
    pointer.emit('pointercancel', 0, 0);
    expect((await done).width).toBe(360);
  });

  it('창 바꾸기가 실패해도 끝까지 따라가고, 놓으면 끝낸다', async () => {
    const pointer = new FakePointer();
    const done = trackResize(
      { source: pointer, requestFrame: (callback) => callback(), setFrame: async () => Promise.reject(new Error('창이 없어요')) },
      { edge: 'East', start: { screenX: 0, screenY: 0 }, startRect, limits, nativePerCss: 1 },
    );
    pointer.emit('pointermove', 10, 0);
    pointer.emit('pointerup', 20, 0);
    expect((await done).width).toBe(340);
  });
});
```

Run: `pnpm vitest run src/adapters/tauri/resize-tracker.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 7: 추적 구현**

`src/adapters/tauri/resize-tracker.ts`:

```ts
import { type ResizeEdge, type SizeLimits, resizeRect } from '../../domain/resize.ts';
import type { Rect } from '../../domain/window-geometry.ts';

export interface PointerLike {
  screenX: number;
  screenY: number;
}

type PointerType = 'pointermove' | 'pointerup' | 'pointercancel';

/** 브라우저 `window`가 이 모양을 가진다. 화면은 가장자리 요소에 setPointerCapture를 걸어 창 밖에서도 pointer를 받게 한다. */
export interface PointerSource {
  addEventListener(type: PointerType, listener: (event: PointerLike) => void): void;
  removeEventListener(type: PointerType, listener: (event: PointerLike) => void): void;
}

export interface ResizeTrackDeps {
  source: PointerSource;
  requestFrame: (callback: () => void) => void;
  /** native 단위 영역으로 창을 바꾼다(Rust `set_frame`). */
  setFrame: (rect: Rect) => Promise<void>;
}

export interface ResizeTrackArgs {
  edge: ResizeEdge;
  start: PointerLike;
  /** native 단위 */
  startRect: Rect;
  /** native 단위 */
  limits: SizeLimits;
  nativePerCss: number;
}

/**
 * 놓을 때까지 pointer를 따라 창 영역을 바꾸고(WND-03), 마지막 영역(native)을 돌려준다.
 * 화면을 그릴 때마다 한 번만 계산하고, 창 바꾸기는 한 번에 하나만 보낸다. 밀린 것은 가장 새 영역 하나만 남긴다.
 */
export function trackResize(deps: ResizeTrackDeps, args: ResizeTrackArgs): Promise<Rect> {
  return new Promise((resolve) => {
    let latest: PointerLike = args.start;
    let frameRequested = false;
    let finished = false;
    let applied: Rect = args.startRect;
    let pending: Rect | null = null;
    let inFlight: Promise<void> | null = null;

    const rectAt = (pointer: PointerLike): Rect =>
      resizeRect(
        args.startRect,
        args.edge,
        (pointer.screenX - args.start.screenX) * args.nativePerCss,
        (pointer.screenY - args.start.screenY) * args.nativePerCss,
        args.limits,
      );

    const pump = (): void => {
      const rect = pending;
      pending = null;
      if (!rect) {
        inFlight = null;
        return;
      }
      applied = rect;
      inFlight = deps.setFrame(rect).catch(() => undefined).then(pump);
    };

    const push = (rect: Rect): void => {
      if (sameRect(rect, pending ?? applied))
        return;
      pending = rect;
      if (!inFlight)
        pump();
    };

    const onMove = (event: PointerLike): void => {
      latest = event;
      if (frameRequested || finished)
        return;
      frameRequested = true;
      deps.requestFrame(() => {
        frameRequested = false;
        if (!finished)
          push(rectAt(latest));
      });
    };

    const finish = (last: PointerLike): void => {
      if (finished)
        return;
      finished = true;
      deps.source.removeEventListener('pointermove', onMove);
      deps.source.removeEventListener('pointerup', onUp);
      deps.source.removeEventListener('pointercancel', onCancel);
      push(rectAt(last));
      void (async () => {
        while (inFlight)
          await inFlight;
        resolve(applied);
      })();
    };

    const onUp = (event: PointerLike): void => finish(event);
    const onCancel = (): void => finish(latest);

    deps.source.addEventListener('pointermove', onMove);
    deps.source.addEventListener('pointerup', onUp);
    deps.source.addEventListener('pointercancel', onCancel);
  });
}

function sameRect(a: Rect, b: Rect): boolean {
  return a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height;
}
```

Run: `pnpm vitest run src/adapters/tauri/resize-tracker.test.ts`
Expected: PASS

- [ ] **Step 8: 실패하는 창 제어 adapter 테스트 쓰기**

`src/adapters/tauri/window-controller.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import type { PointerLike, PointerSource } from './resize-tracker.ts';
import { type TauriMonitor, type TauriWindowApi, createWindowController } from './window-controller.ts';

function monitor(x: number, y: number, width: number, height: number, scaleFactor: number, workHeight = height): TauriMonitor {
  return { position: { x, y }, size: { width, height }, scaleFactor, workArea: { position: { x, y }, size: { width, height: workHeight } } };
}

function setup(os: 'windows' | 'macos', scale: number) {
  let movedHandler: (() => void) | null = null;
  const unlisten = vi.fn();
  const api: TauriWindowApi = {
    outerPosition: async () => ({ x: 1576 * scale, y: 24 * scale }),
    outerSize: async () => ({ width: 320 * scale, height: 520 * scale }),
    scaleFactor: async () => scale,
    startDragging: vi.fn(async () => undefined),
    onMoved: async (handler) => {
      movedHandler = handler;
      return unlisten;
    },
    primaryMonitor: async () => monitor(0, 0, 1920 * scale, 1080 * scale, scale, 1040 * scale),
    availableMonitors: async () => [monitor(0, 0, 1920 * scale, 1080 * scale, scale, 1040 * scale)],
  };
  const invoke = vi.fn(async (_command: string, _args?: Record<string, unknown>) => undefined);
  const listeners = new Map<string, (event: PointerLike) => void>();
  const pointer: PointerSource = {
    addEventListener: (type, listener) => void listeners.set(type, listener),
    removeEventListener: (type) => void listeners.delete(type),
  };
  const controller = createWindowController({ api, invoke, os, pointer, requestFrame: (callback) => callback() });
  return { api, invoke, controller, listeners, unlisten, moved: () => movedHandler?.() };
}

describe('Tauri 창 제어 adapter', () => {
  it('WND-07 화면 정보는 spec 좌표로 준다 (Windows 배율 1.25)', async () => {
    const { controller } = setup('windows', 1.25);
    expect(await controller.screen()).toEqual({
      monitors: [{ left: 0, top: 0, width: 1920, height: 1080 }],
      primaryWorkArea: { left: 0, top: 0, width: 1920, height: 1040 },
    });
    expect(await controller.bounds()).toEqual({ left: 1576, top: 24, width: 320, height: 520 });
  });

  it('WND-07 setBounds는 native 단위로 set_frame을 한 번 부른다', async () => {
    const win = setup('windows', 1.5);
    await win.controller.setBounds({ left: 100, top: 50, width: 320, height: 520 });
    expect(win.invoke).toHaveBeenCalledWith('set_frame', { left: 150, top: 75, width: 480, height: 780 });
    const mac = setup('macos', 2);
    await mac.controller.setBounds({ left: 100, top: 50, width: 320, height: 520 });
    expect(mac.invoke).toHaveBeenCalledWith('set_frame', { left: 100, top: 50, width: 320, height: 520 });
  });

  it('WND-09 맨 위 고정, 창 보이기, 숨긴 채 두기, 끌기를 넘긴다', async () => {
    const { api, invoke, controller } = setup('macos', 2);
    await controller.setPinned(false);
    await controller.show(12);
    await controller.keepHidden();
    await controller.startDragging();
    expect(invoke.mock.calls).toEqual([
      ['set_pinned', { pinned: false }],
      ['show_main', { paintedAtMs: 12 }],
      ['keep_hidden', undefined],
    ]);
    expect(api.startDragging).toHaveBeenCalledOnce();
  });

  it('WND-03 크기 조절은 native 단위로 따라가고, 놓으면 spec 좌표로 돌려준다 (Windows 배율 2)', async () => {
    const { controller, invoke, listeners } = setup('windows', 2);
    const done = controller.resize('East', { screenX: 100, screenY: 100 }, { minWidth: 280, maxWidth: 620, minHeight: 300, maxHeight: 1040 });
    await vi.waitFor(() => expect(listeners.has('pointerup')).toBe(true));
    listeners.get('pointerup')?.({ screenX: 150, screenY: 100 });
    expect(await done).toEqual({ left: 1576, top: 24, width: 370, height: 520 });
    expect(invoke).toHaveBeenLastCalledWith('set_frame', { left: 3152, top: 48, width: 740, height: 1040 });
  });

  it('WND-02 이동 신호를 넘기고, 그만 받으면 Tauri 듣기를 푼다', async () => {
    const { controller, moved, unlisten } = setup('macos', 2);
    const listener = vi.fn();
    const stop = controller.onMoved(listener);
    await vi.waitFor(() => {
      moved();
      expect(listener).toHaveBeenCalled();
    });
    stop();
    expect(unlisten).toHaveBeenCalledOnce();
  });
});
```

Run: `pnpm vitest run src/adapters/tauri/window-controller.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 9: 창 제어 adapter 구현**

`src/adapters/tauri/window-controller.ts`:

```ts
import type { PointerStart, ScreenLayout, WindowController } from '../../application/ports/window-controller.ts';
import type { ResizeEdge, SizeLimits } from '../../domain/resize.ts';
import type { Rect } from '../../domain/window-geometry.ts';
import { Coordinates, type DesktopOs, type PhysicalRect } from './coordinates.ts';
import type { Invoke } from './invoke.ts';
import { type PointerSource, trackResize } from './resize-tracker.ts';

interface Point {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

/** `@tauri-apps/api/window`의 Monitor 중 쓰는 것. 모두 실제 픽셀이다. */
export interface TauriMonitor {
  position: Point;
  size: Size;
  scaleFactor: number;
  workArea: { position: Point; size: Size };
}

/** `@tauri-apps/api/window`에서 쓰는 것. composition root가 실제 API로 채운다. */
export interface TauriWindowApi {
  outerPosition(): Promise<Point>;
  outerSize(): Promise<Size>;
  scaleFactor(): Promise<number>;
  startDragging(): Promise<void>;
  onMoved(handler: () => void): Promise<() => void>;
  primaryMonitor(): Promise<TauriMonitor | null>;
  availableMonitors(): Promise<TauriMonitor[]>;
}

export interface WindowControllerDeps {
  api: TauriWindowApi;
  invoke: Invoke;
  os: DesktopOs;
  pointer: PointerSource;
  requestFrame: (callback: () => void) => void;
}

export function createWindowController(deps: WindowControllerDeps): WindowController {
  const { api, invoke, os } = deps;

  async function primary(): Promise<TauriMonitor> {
    const found = (await api.primaryMonitor()) ?? (await api.availableMonitors())[0];
    if (!found)
      throw new Error('모니터를 찾지 못했어요');
    return found;
  }

  async function context(): Promise<{ coords: Coordinates; scale: number }> {
    const [main, scale] = await Promise.all([primary(), api.scaleFactor()]);
    return { coords: new Coordinates(os, main.scaleFactor), scale };
  }

  async function nativeBounds(coords: Coordinates, scale: number): Promise<Rect> {
    const [position, size] = await Promise.all([api.outerPosition(), api.outerSize()]);
    return coords.physicalToNative({ ...position, ...size }, scale);
  }

  const setFrame = async (rect: Rect): Promise<void> => {
    await invoke('set_frame', { left: rect.left, top: rect.top, width: rect.width, height: rect.height });
  };

  return {
    async screen(): Promise<ScreenLayout> {
      const [main, monitors] = await Promise.all([primary(), api.availableMonitors()]);
      const coords = new Coordinates(os, main.scaleFactor);
      const toSpec = (rect: PhysicalRect, scale: number): Rect => coords.monitorToSpec(rect, scale);
      return {
        monitors: monitors.map((m) => toSpec({ ...m.position, ...m.size }, m.scaleFactor)),
        primaryWorkArea: toSpec({ ...main.workArea.position, ...main.workArea.size }, main.scaleFactor),
      };
    },

    async bounds(): Promise<Rect> {
      const { coords, scale } = await context();
      return coords.nativeToSpec(await nativeBounds(coords, scale), scale);
    },

    async setBounds(rect: Rect): Promise<void> {
      const { coords, scale } = await context();
      await setFrame(coords.specToNative(rect, scale));
    },

    async setPinned(pinned: boolean): Promise<void> {
      await invoke('set_pinned', { pinned });
    },

    async show(paintedAtMs: number): Promise<void> {
      await invoke('show_main', { paintedAtMs });
    },

    async keepHidden(): Promise<void> {
      await invoke('keep_hidden');
    },

    startDragging: () => api.startDragging(),

    async resize(edge: ResizeEdge, start: PointerStart, limits: SizeLimits): Promise<Rect> {
      const { coords, scale } = await context();
      const final = await trackResize(
        { source: deps.pointer, requestFrame: deps.requestFrame, setFrame },
        {
          edge,
          start,
          startRect: await nativeBounds(coords, scale),
          limits: coords.limitsToNative(limits, scale),
          nativePerCss: coords.nativePerCss(scale),
        },
      );
      return coords.nativeToSpec(final, scale);
    },

    onMoved(listener: () => void): () => void {
      let stopped = false;
      let unlisten: (() => void) | null = null;
      void api.onMoved(listener).then((stop) => {
        if (stopped)
          stop();
        else
          unlisten = stop;
      });
      return () => {
        stopped = true;
        unlisten?.();
      };
    },
  };
}
```

Run: `pnpm vitest run src/adapters/tauri`
Expected: PASS

- [ ] **Step 10: Rust `set_frame` — 계산 테스트 먼저**

`src-tauri/crates/core/src/lib.rs`에 `pub mod frame;`를 더한다.

`src-tauri/crates/core/src/frame.rs`:

```rust
//! 창 위치와 크기를 한 번에 바꾸는 값. 따로 바꾸면 위·왼쪽 크기 조절 때 창이 떨린다 (WND-03).
//! 단위는 OS 좌표다. Windows는 실제 픽셀, macOS는 포인트(왼쪽 위가 원점).

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Frame {
    pub left: f64,
    pub top: f64,
    pub width: f64,
    pub height: f64,
}

impl Frame {
    /// Windows `SetWindowPos`용 정수 픽셀. 크기는 1 이상이다.
    pub fn to_pixels(self) -> (i32, i32, i32, i32) {
        todo!()
    }
}

/// macOS(Cocoa)는 주 화면 왼쪽 아래가 원점이고 y가 위로 커진다. 왼쪽 위 원점의 top을 Cocoa의 y로 바꾼다.
pub fn cocoa_origin_y(frame: Frame, primary_screen_height: f64) -> f64 {
    todo!()
}

#[cfg(test)]
mod tests {
    use super::*;

    const FRAME: Frame = Frame { left: 1576.4, top: 24.6, width: 320.0, height: 520.0 };

    /// WND-03 Windows는 반올림한 정수 픽셀로 바꾼다
    #[test]
    fn rounds_to_pixels() {
        assert_eq!(FRAME.to_pixels(), (1576, 25, 320, 520));
        assert_eq!(Frame { width: 0.2, height: -3.0, ..FRAME }.to_pixels(), (1576, 25, 1, 1));
    }

    /// WND-03 macOS는 아래쪽 원점으로 바꾼다
    #[test]
    fn converts_top_to_cocoa_y() {
        assert_eq!(cocoa_origin_y(Frame { top: 24.0, ..FRAME }, 900.0), 356.0);
        // 주 화면 위쪽 모니터에 있는 창
        assert_eq!(cocoa_origin_y(Frame { top: -1080.0, height: 520.0, ..FRAME }, 900.0), 1460.0);
    }
}
```

Run: `cargo test --manifest-path src-tauri/Cargo.toml -p todowidget-core frame`
Expected: FAIL

- [ ] **Step 11: 계산 구현과 OS별 적용**

```rust
    pub fn to_pixels(self) -> (i32, i32, i32, i32) {
        let round = |value: f64| value.round() as i32;
        (round(self.left), round(self.top), round(self.width).max(1), round(self.height).max(1))
    }
```

```rust
pub fn cocoa_origin_y(frame: Frame, primary_screen_height: f64) -> f64 {
    primary_screen_height - (frame.top + frame.height)
}
```

`src-tauri/crates/windows/Cargo.toml`의 Windows 의존성에 더한다:

```toml
windows-sys = { version = "0.61", features = ["Win32_Foundation", "Win32_UI_WindowsAndMessaging"] }
```

`src-tauri/crates/windows/src/lib.rs`에 `pub mod frame;`를 더한다.

`src-tauri/crates/windows/src/frame.rs`:

```rust
//! 창 위치와 크기를 한 번에 바꾼다 (WND-03).
use windows_sys::Win32::UI::WindowsAndMessaging::{SetWindowPos, SWP_NOACTIVATE, SWP_NOZORDER};

/// `hwnd`는 살아 있는 창 핸들이어야 한다. 값은 실제 픽셀이다.
pub fn set_window_frame(hwnd: isize, left: i32, top: i32, width: i32, height: i32) -> Result<(), String> {
    // SAFETY: 호출하는 쪽(Tauri 창)이 살아 있는 창 핸들을 넘긴다. 다른 창의 순서는 바꾸지 않는다.
    let ok = unsafe {
        SetWindowPos(hwnd as _, std::ptr::null_mut(), left, top, width, height, SWP_NOZORDER | SWP_NOACTIVATE)
    };
    if ok == 0 {
        Err(std::io::Error::last_os_error().to_string())
    } else {
        Ok(())
    }
}
```

`src-tauri/src/platform/windows.rs`:

```rust
use tauri::WebviewWindow;
use todowidget_core::frame::Frame;

pub fn set_frame(window: &WebviewWindow, frame: Frame) -> Result<(), String> {
    let hwnd = window.hwnd().map_err(|e| e.to_string())?.0 as isize;
    let (left, top, width, height) = frame.to_pixels();
    todowidget_windows::frame::set_window_frame(hwnd, left, top, width, height)
}
```

`src-tauri/Cargo.toml` macOS 의존성에 더한다. 버전은 `Cargo.lock`의 objc2 계열(0.3.2 / 0.6.4)과 맞춘다.

```toml
objc2 = "0.6"
objc2-app-kit = { version = "0.3", features = ["NSWindow", "NSScreen", "NSResponder"] }
objc2-foundation = { version = "0.3", features = ["NSGeometry", "NSArray"] }
```

`src-tauri/src/platform/macos.rs`:

```rust
use objc2::MainThreadMarker;
use objc2_app_kit::{NSScreen, NSWindow};
use objc2_foundation::{NSPoint, NSRect, NSSize};
use tauri::WebviewWindow;
use todowidget_core::frame::{cocoa_origin_y, Frame};

/// 포인트 좌표로 창 영역을 한 번에 바꾼다. AppKit은 메인 스레드에서만 부른다.
pub fn set_frame(window: &WebviewWindow, frame: Frame) -> Result<(), String> {
    let ns_window = window.ns_window().map_err(|e| e.to_string())? as usize;
    window
        .run_on_main_thread(move || {
            let mtm = MainThreadMarker::new().expect("메인 스레드에서 불러야 해요");
            // SAFETY: Tauri가 준 이 창의 NSWindow 포인터이고, 창이 살아 있는 동안 메인 스레드에서만 쓴다.
            let ns_window = unsafe { &*(ns_window as *const NSWindow) };
            // 첫 화면이 메뉴 막대가 있는 주 화면이고, Cocoa 좌표의 원점이다.
            let primary_height = NSScreen::screens(mtm).firstObject().map_or(0.0, |screen| screen.frame().size.height);
            let origin = NSPoint::new(frame.left, cocoa_origin_y(frame, primary_height));
            ns_window.setFrame_display(NSRect::new(origin, NSSize::new(frame.width, frame.height)), true);
        })
        .map_err(|e| e.to_string())
}
```

objc2 API 이름(`NSScreen::screens`, `firstObject`, `setFrame_display`)은 objc2-app-kit 0.3 문서로 확인하고 맞춘다. 동작은 위와 같아야 한다.

`src-tauri/src/platform/mod.rs`의 두 `pub use` 줄에 `set_frame`을 더한다.

`src-tauri/src/commands/mod.rs`:

```rust
use todowidget_core::frame::Frame;

/// 창 위치와 크기를 한 번에 바꾼다. 값은 OS 좌표다(Windows 실제 픽셀, macOS 포인트). 변환은 JS `coordinates.ts`가 한다.
#[tauri::command]
pub fn set_frame(app: AppHandle, left: f64, top: f64, width: f64, height: f64) -> Result<(), String> {
    let window = app.get_webview_window("main").ok_or("창이 없어요")?;
    crate::platform::set_frame(&window, Frame { left, top, width, height })
}
```

`lib.rs`의 `generate_handler!`에 `commands::set_frame`을 더한다.

- [ ] **Step 12: 창 설정과 권한**

`src-tauri/tauri.conf.json`의 main 창에서 `"resizable": true`를 `"resizable": false`로 바꾼다. 크기 조절은 직접 하고, 테두리 없는 창의 OS 기본 가장자리와 겹치지 않게 한다. `minWidth`·`maxWidth`·`minHeight`는 그대로 둔다.

`src-tauri/capabilities/default.json`:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "주 창 권한",
  "windows": ["main"],
  "permissions": ["core:default", "core:window:allow-start-dragging"]
}
```

`core:default`에는 창·모니터 위치를 읽는 권한과 이동 이벤트 듣기가 들어 있다. 실제 앱에서 권한 오류가 나면, 그 권한 하나만 더하고 이유를 커밋 메시지에 적는다.

- [ ] **Step 13: 시험 화면을 새 port로 바꾸기 (Task 10까지 임시)**

`src/main.ts`:

```ts
import { invoke } from '@tauri-apps/api/core';
import { availableMonitors, getCurrentWindow, primaryMonitor } from '@tauri-apps/api/window';
import { mount } from 'svelte';
import type { DesktopOs } from './adapters/tauri/coordinates.ts';
import { createWindowController } from './adapters/tauri/window-controller.ts';
import App from './presentation/App.svelte';

const startedAt = performance.now();
const target = document.getElementById('app');
if (!target)
  throw new Error('#app 요소가 없어요');

const current = getCurrentWindow();
const os: DesktopOs = navigator.userAgent.includes('Windows') ? 'windows' : 'macos'; // Task 8에서 Rust app_info로 바꾼다
const windowController = createWindowController({
  api: {
    outerPosition: () => current.outerPosition(),
    outerSize: () => current.outerSize(),
    scaleFactor: () => current.scaleFactor(),
    startDragging: () => current.startDragging(),
    onMoved: (handler) => current.onMoved(() => handler()),
    primaryMonitor,
    availableMonitors,
  },
  invoke,
  os,
  pointer: window,
  requestFrame: (callback) => requestAnimationFrame(() => callback()),
});
mount(App, { target, props: { windowController, startedAt } });
```

Tauri Monitor 객체는 `workArea`를 가진다. 타입이 `TauriMonitor`와 맞지 않으면 `primaryMonitor`·`availableMonitors`를 감싸서 필요한 필드만 옮긴다.

`src/presentation/App.svelte`의 `<script>`에서 다음을 바꾼다.
- import: `import type { WindowController } from '../application/ports/window-controller.ts'; import { type ResizeEdge, resizeLimits } from '../domain/resize.ts';`
- props: `let { windowController, startedAt }: { windowController: WindowController; startedAt: number } = $props();`
- `controls.ready(...)` → `windowController.show(...)`
- `controls.setPinned(pinned)` → `windowController.setPinned(pinned)`
- `controls.startDragging()` → `windowController.startDragging()`
- `resize`:

```ts
  function resize(edge: ResizeEdge) {
    return (event: PointerEvent): void => {
      event.preventDefault();
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
      void windowController.resize(edge, event, resizeLimits(globalThis.screen.availHeight));
    };
  }
```

마크업과 CSS에 여덟 방향 가장자리를 둔다. 기존 셋(`east`, `south`, `south-east`)은 그대로 두고 다섯을 더한다.

```svelte
<div class="edge north" role="presentation" onpointerdown={resize('North')}></div>
<div class="edge west" role="presentation" onpointerdown={resize('West')}></div>
<div class="edge north-east" role="presentation" onpointerdown={resize('NorthEast')}></div>
<div class="edge north-west" role="presentation" onpointerdown={resize('NorthWest')}></div>
<div class="edge south-west" role="presentation" onpointerdown={resize('SouthWest')}></div>
```

```css
  .north { top: 0; left: 0; width: 100%; height: 8px; cursor: ns-resize; }
  .west { top: 0; left: 0; width: 8px; height: 100%; cursor: ew-resize; }
  .north-east { top: 0; right: 0; width: 14px; height: 14px; cursor: nesw-resize; }
  .north-west { top: 0; left: 0; width: 14px; height: 14px; cursor: nwse-resize; }
  .south-west { bottom: 0; left: 0; width: 14px; height: 14px; cursor: nesw-resize; }
```

각 규칙은 기존 CSS처럼 한 줄에 한 속성으로 풀어 쓴다.

- [ ] **Step 14: 전체 검사, 실제 크기 조절 확인, 커밋**

Global Constraints의 검사와 Windows 대상 check·clippy를 돌린다. 그다음 `pnpm tauri dev`로 띄워 개발자가 직접 확인한다(화면 캡처 없이).
- 여덟 방향 가장자리를 끌면 창이 떨리지 않고 따라온다.
- 위·왼쪽을 끌 때 반대쪽 끝은 움직이지 않는다.
- 폭은 280보다 작아지지 않는다.

```bash
git add -A src src-tauri
git commit -m "feat: 창 좌표 변환과 직접 구현한 여덟 방향 크기 조절을 넣음"
```

---
### Task 6: 창 배치 서비스 (WindowPlacement)

저장된 위치·크기를 창에 적용하고, 옮기거나 크기를 바꾸면 저장한다. 종료할 때 위치를 저장하는 일도 여기서 한다. 화면(계획 5)은 이 서비스만 부른다.

**Files:**
- Create: `src/application/window-placement.ts`, `src/application/window-placement.test.ts`
- Create: `src/testing/fake-window-controller.ts`, `src/testing/manual-timer.ts`

**Interfaces:**
- Consumes:
  - `WindowController`, `ScreenLayout`, `PointerStart` (Task 5)
  - `resizeLimits`, `ResizeEdge` (Task 5)
  - `resolveWidgetSize`, `resolveWidgetPosition` (계획 3)
  - `SettingsService` (`update(patch)`, `current`)
  - `Timer`
- Produces:
  - `MOVE_SAVE_DELAY_MS = 500`
  - `class WindowPlacement`:
    - `constructor(deps: { window: WindowController; settings: SettingsService; timer: Timer })`
    - `apply(): Promise<void>`
    - `setPinned(pinned: boolean): Promise<void>`
    - `resize(edge: ResizeEdge, start: PointerStart): Promise<void>`
    - `captureForQuit(): Promise<void>`
    - `dispose(): void`
  - 테스트용 `FakeWindowController`, `ManualTimer`

- [ ] **Step 1: 테스트용 가짜 만들기**

`src/testing/manual-timer.ts`:

```ts
import type { Timer } from '../application/ports/timer.ts';

/** 테스트용 타이머. 시간 없이, 부를 때 예약된 일을 실행한다. 늦추기(debounce) 확인에 쓴다. */
export class ManualTimer implements Timer {
  readonly delays: number[] = [];
  #entries: Array<{ task: () => void; cancelled: boolean }> = [];

  schedule(ms: number, task: () => void): () => void {
    this.delays.push(ms);
    const entry = { task, cancelled: false };
    this.#entries.push(entry);
    return () => {
      entry.cancelled = true;
    };
  }

  /** 취소되지 않은 예약 수. */
  get pending(): number {
    return this.#entries.filter((entry) => !entry.cancelled).length;
  }

  runAll(): void {
    for (const entry of this.#entries.splice(0)) {
      if (!entry.cancelled)
        entry.task();
    }
  }
}
```

`src/testing/fake-window-controller.ts`:

```ts
import type { PointerStart, ScreenLayout, WindowController } from '../application/ports/window-controller.ts';
import type { ResizeEdge, SizeLimits } from '../domain/resize.ts';
import type { Rect } from '../domain/window-geometry.ts';

/** 테스트용 창. 기본 화면은 window.md 예시와 같은 모니터 하나(1920×1080, 작업 영역 높이 1040)다. */
export class FakeWindowController implements WindowController {
  layout: ScreenLayout = {
    monitors: [{ left: 0, top: 0, width: 1920, height: 1080 }],
    primaryWorkArea: { left: 0, top: 0, width: 1920, height: 1040 },
  };
  current: Rect = { left: 0, top: 0, width: 320, height: 520 };
  pinned: boolean | null = null;
  shown: number[] = [];
  keptHidden = false;
  drags = 0;
  /** resize가 놓을 때 돌려줄 영역. null이면 지금 영역을 그대로 돌려준다. */
  resizeResult: Rect | null = null;
  resizeCalls: Array<{ edge: ResizeEdge; start: PointerStart; limits: SizeLimits }> = [];
  failBounds = false;
  readonly #moved = new Set<() => void>();

  async screen(): Promise<ScreenLayout> {
    return this.layout;
  }

  async bounds(): Promise<Rect> {
    if (this.failBounds)
      throw new Error('창 위치를 읽지 못했어요');
    return { ...this.current };
  }

  async setBounds(rect: Rect): Promise<void> {
    this.current = { ...rect };
  }

  async setPinned(pinned: boolean): Promise<void> {
    this.pinned = pinned;
  }

  async show(paintedAtMs: number): Promise<void> {
    this.shown.push(paintedAtMs);
  }

  async keepHidden(): Promise<void> {
    this.keptHidden = true;
  }

  async startDragging(): Promise<void> {
    this.drags++;
  }

  async resize(edge: ResizeEdge, start: PointerStart, limits: SizeLimits): Promise<Rect> {
    this.resizeCalls.push({ edge, start, limits });
    if (this.resizeResult)
      this.current = { ...this.resizeResult };
    return { ...this.current };
  }

  onMoved(listener: () => void): () => void {
    this.#moved.add(listener);
    return () => this.#moved.delete(listener);
  }

  get movedListeners(): number {
    return this.#moved.size;
  }

  /** 사용자가 창을 끌어 옮긴 것처럼 한다. */
  moveTo(left: number, top: number): void {
    this.current = { ...this.current, left, top };
    for (const listener of this.#moved)
      listener();
  }
}
```

- [ ] **Step 2: 실패하는 테스트 쓰기**

`src/application/window-placement.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { FakeWindowController } from '../testing/fake-window-controller.ts';
import { ManualTimer } from '../testing/manual-timer.ts';
import { MemoryFileStore } from '../testing/memory-file-store.ts';
import { flush } from '../testing/fake-timer.ts';
import { SETTINGS_FILE, SettingsRepository } from './settings/settings-repository.ts';
import { SettingsService } from './settings/settings-service.ts';
import { MOVE_SAVE_DELAY_MS, WindowPlacement } from './window-placement.ts';

let files: MemoryFileStore;
let window: FakeWindowController;
let timer: ManualTimer;

beforeEach(() => {
  files = new MemoryFileStore();
  window = new FakeWindowController();
  timer = new ManualTimer();
});

async function placement(saved?: Record<string, unknown>): Promise<{ placement: WindowPlacement; settings: SettingsService }> {
  if (saved)
    files.files.set(SETTINGS_FILE, JSON.stringify(saved));
  const settings = await SettingsService.open(new SettingsRepository(files));
  return { placement: new WindowPlacement({ window, settings, timer }), settings };
}

function savedSettings(): Record<string, unknown> {
  return JSON.parse(files.files.get(SETTINGS_FILE) ?? 'null');
}

describe('창 배치', () => {
  it('WND-06 WND-07 저장된 크기·위치가 없으면 기본 크기로 작업 영역 오른쪽 위에 띄우고 맨 위에 고정한다', async () => {
    const { placement: p } = await placement();
    await p.apply();
    expect(window.current).toEqual({ left: 1576, top: 24, width: 320, height: 520 });
    expect(window.pinned).toBe(true);
  });

  it('WND-04 WND-05 WND-08 저장된 값은 범위로 맞추고, 헤더를 잡을 수 있는 위치는 그대로 쓴다', async () => {
    const { placement: p } = await placement({ left: 300, top: 200, width: 2000, maxHeight: 3000, pinned: false });
    await p.apply();
    expect(window.current).toEqual({ left: 300, top: 200, width: 620, height: 1040 });
    expect(window.pinned).toBe(false);
  });

  it('WND-08 화면 밖에 저장된 위치는 기본 위치로 띄운다', async () => {
    const { placement: p } = await placement({ left: 2500, top: 100 });
    await p.apply();
    expect(window.current).toMatchObject({ left: 1576, top: 24 });
  });

  it('WND-09 맨 위 고정을 바꾸면 창에 적용하고 저장한다', async () => {
    const { placement: p, settings } = await placement();
    await p.setPinned(false);
    expect(window.pinned).toBe(false);
    expect(settings.current.pinned).toBe(false);
    expect(savedSettings()).toMatchObject({ pinned: false });
  });

  it('WND-02 옮기는 동안은 저장하지 않고, 마지막 이동 0.5초 뒤 한 번 위치를 저장한다', async () => {
    const { placement: p } = await placement();
    await p.apply();
    files.writes.length = 0;
    window.moveTo(100, 100);
    window.moveTo(200, 150);
    window.moveTo(300, 200);
    expect(timer.pending).toBe(1);
    expect(timer.delays.at(-1)).toBe(MOVE_SAVE_DELAY_MS);
    expect(files.writes).toEqual([]);
    timer.runAll();
    await flush();
    expect(files.writes).toEqual([SETTINGS_FILE]);
    expect(savedSettings()).toMatchObject({ left: 300, top: 200 });
  });

  it('WND-02 위치를 읽지 못하면 저장하지 않고 넘어간다', async () => {
    const { placement: p } = await placement();
    await p.apply();
    files.writes.length = 0;
    window.failBounds = true;
    window.moveTo(100, 100);
    timer.runAll();
    await flush();
    expect(files.writes).toEqual([]);
  });

  it('WND-03 크기 조절은 같은 범위로 끌게 하고, 놓으면 폭·최대 높이·위치를 저장한다', async () => {
    const { placement: p } = await placement();
    await p.apply();
    window.resizeResult = { left: 1400, top: 24, width: 496, height: 700 };
    await p.resize('West', { screenX: 1576, screenY: 300 });
    expect(window.resizeCalls).toEqual([
      { edge: 'West', start: { screenX: 1576, screenY: 300 }, limits: { minWidth: 280, maxWidth: 620, minHeight: 300, maxHeight: 1040 } },
    ]);
    expect(savedSettings()).toMatchObject({ left: 1400, top: 24, width: 496, maxHeight: 700 });
  });

  it('WND-14 종료할 때 지금 위치를 다른 설정과 함께 저장하고, 기다리던 이동 저장은 취소한다', async () => {
    const { placement: p } = await placement({ doneExpanded: true });
    await p.apply();
    window.moveTo(640, 480);
    await p.captureForQuit();
    expect(timer.pending).toBe(0);
    expect(savedSettings()).toMatchObject({ left: 640, top: 480, doneExpanded: true });
  });

  it('WND-14 종료할 때 위치를 읽지 못해도 던지지 않는다', async () => {
    const { placement: p } = await placement();
    window.failBounds = true;
    await expect(p.captureForQuit()).resolves.toBeUndefined();
  });

  it('apply를 다시 불러도 이동 듣기는 하나이고, dispose하면 멈춘다', async () => {
    const { placement: p } = await placement();
    await p.apply();
    await p.apply();
    expect(window.movedListeners).toBe(1);
    window.moveTo(10, 10);
    p.dispose();
    expect(window.movedListeners).toBe(0);
    expect(timer.pending).toBe(0);
  });
});
```

`window`라는 지역 변수 이름은 테스트 환경(Node)에서 전역과 겹치지 않는다. 헷갈리면 `win`으로 바꿔도 된다.

Run: `pnpm vitest run src/application/window-placement.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 3: 구현**

`src/application/window-placement.ts`:

```ts
import type { ResizeEdge } from '../domain/resize.ts';
import { resizeLimits } from '../domain/resize.ts';
import { resolveWidgetPosition, resolveWidgetSize } from '../domain/window-geometry.ts';
import type { Timer } from './ports/timer.ts';
import type { PointerStart, WindowController } from './ports/window-controller.ts';
import type { SettingsService } from './settings/settings-service.ts';

/** OS는 끌기가 끝난 때를 알려 주지 않으므로, 마지막 이동 신호에서 이만큼 지나면 놓은 것으로 본다 (WND-02). */
export const MOVE_SAVE_DELAY_MS = 500;

export interface PlacementDeps {
  window: WindowController;
  settings: SettingsService;
  timer: Timer;
}

/**
 * 창 위치·크기·맨 위 고정을 설정과 맞춘다. 켤 때 적용하고(WND-04~09), 옮기거나(WND-02) 크기를 바꾸면(WND-03) 저장하며,
 * 종료할 때 위치를 저장한다(WND-14). 창 높이를 내용에 맞춰 줄이는 일은 계획 5에서 더한다.
 */
export class WindowPlacement {
  readonly #deps: PlacementDeps;
  #cancelSave: (() => void) | null = null;
  #stopMoved: (() => void) | null = null;

  constructor(deps: PlacementDeps) {
    this.#deps = deps;
  }

  async apply(): Promise<void> {
    const { window, settings } = this.#deps;
    const screen = await window.screen();
    const saved = settings.current;
    const size = resolveWidgetSize(saved.width, saved.maxHeight, screen.primaryWorkArea.height);
    const position = resolveWidgetPosition(saved, size.width, screen.monitors, screen.primaryWorkArea);
    await window.setBounds({ ...position, width: size.width, height: size.maxHeight });
    await window.setPinned(saved.pinned);
    this.#stopMoved ??= window.onMoved(() => this.#scheduleSave());
  }

  async setPinned(pinned: boolean): Promise<void> {
    await this.#deps.window.setPinned(pinned);
    await this.#deps.settings.update({ pinned });
  }

  async resize(edge: ResizeEdge, start: PointerStart): Promise<void> {
    const { window, settings } = this.#deps;
    const screen = await window.screen();
    const rect = await window.resize(edge, start, resizeLimits(screen.primaryWorkArea.height));
    this.#cancelPending();
    const size = resolveWidgetSize(rect.width, rect.height, screen.primaryWorkArea.height);
    await settings.update({ left: rect.left, top: rect.top, width: size.width, maxHeight: size.maxHeight });
  }

  /** 종료나 업데이트로 다시 띄우기 전에 지금 위치를 저장한다. 실패해도 던지지 않는다 (WND-14). */
  async captureForQuit(): Promise<void> {
    this.#cancelPending();
    await this.#savePosition();
  }

  dispose(): void {
    this.#cancelPending();
    this.#stopMoved?.();
    this.#stopMoved = null;
  }

  #scheduleSave(): void {
    this.#cancelPending();
    this.#cancelSave = this.#deps.timer.schedule(MOVE_SAVE_DELAY_MS, () => {
      this.#cancelSave = null;
      void this.#savePosition();
    });
  }

  #cancelPending(): void {
    this.#cancelSave?.();
    this.#cancelSave = null;
  }

  async #savePosition(): Promise<void> {
    try {
      const bounds = await this.#deps.window.bounds();
      await this.#deps.settings.update({ left: bounds.left, top: bounds.top });
    } catch {
      // 위치를 읽지 못하면 이번 저장은 건너뛴다. 설정 저장 실패는 SettingsService가 조용히 넘긴다(STORE-17).
    }
  }
}
```

Run: `pnpm vitest run src/application/window-placement.test.ts`
Expected: PASS

- [ ] **Step 4: 전체 검사와 커밋**

Run: `pnpm test && pnpm typecheck && pnpm spec:check`
Expected:
- PASS
- spec 검사 출력에서 WND-02가 "테스트 없음" 목록에서 빠진다.

```bash
git add src/application/window-placement.ts src/application/window-placement.test.ts src/testing/fake-window-controller.ts src/testing/manual-timer.ts
git commit -m "feat: 창 배치 서비스로 위치·크기·고정을 적용하고 옮기거나 크기를 바꾸면 저장함"
```

---

### Task 7: 업데이트 adapter와 네트워크 검사

**Files:**
- Create: `src/adapters/updater/tauri-updater.ts`, `src/adapters/updater/tauri-updater.test.ts`, `src/adapters/updater/updater-config.test.ts`
- Create: `tools/privacy/network-crates.ts`, `tools/privacy/network-crates.test.ts`, `tools/privacy/cli.ts`
- Modify: `package.json`(의존성, `privacy:check` script), `pnpm-lock.yaml`
- Modify: `src-tauri/Cargo.toml`, `src-tauri/src/lib.rs`, `src-tauri/tauri.conf.json`, `src-tauri/capabilities/default.json`
- Modify: `tools/architecture/rules.ts`, `src/architecture.test.ts`, `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `Updater` port (`fetchLatest(): Promise<{ version: string }>`, `downloadAndInstall(): Promise<void>`)
- Produces:
  - `interface PendingUpdate { version: string; downloadAndInstall(): Promise<void>; close(): Promise<void> }`
  - `interface UpdaterApi { check(): Promise<PendingUpdate | null>; relaunch(): Promise<void> }`
  - `createTauriUpdater(api: UpdaterApi, currentVersion: string): Updater`
  - `tauriUpdaterApi(): UpdaterApi`(실제 plugin을 감싼 것)
  - `directDependents(treeOutput: string): string[]`, `checkNetworkCrates(run: (crate: string) => string | null): string[]`

- [ ] **Step 1: 의존성 넣기**

```bash
npm view @tauri-apps/plugin-updater versions --json | tail -5
npm view @tauri-apps/plugin-process versions --json | tail -5
```

crate(`tauri-plugin-updater 2.13.1`, `tauri-plugin-process 2.4.0`)와 major·minor가 같은 가장 새 JS 버전을 고른다.

```bash
pnpm add -E @tauri-apps/plugin-updater@<버전> @tauri-apps/plugin-process@<버전>
grep lockfileVersion pnpm-lock.yaml
```

Expected: `lockfileVersion: '9.0'`

`src-tauri/Cargo.toml` `[dependencies]`:

```toml
tauri-plugin-updater = "=2.13.1"
tauri-plugin-process = "=2.4.0"
```

`src-tauri/src/lib.rs`의 builder에서 single-instance 다음에 더한다:

```rust
        // 업데이트 확인·설치 (UPD-01~08). 네트워크 요청은 이 plugin 하나뿐이다 (PRIV-01).
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
```

`src-tauri/capabilities/default.json`의 `permissions`에 `"updater:default"`, `"process:allow-restart"`를 더한다.

- [ ] **Step 2: 개발용 서명 키 만들기 (개인 키는 버린다)**

```bash
KEYDIR=$(mktemp -d)
pnpm tauri signer generate --ci -w "$KEYDIR/dev-updater.key"
cat "$KEYDIR/dev-updater.key.pub"
rm -rf "$KEYDIR"
```

`--ci`는 비밀번호 없이 만든다. 공개 키 한 줄을 `tauri.conf.json`에 넣는다. 개인 키는 버리므로 이 키로 서명한 업데이트는 없다. 계획 6에서 PM과 실제 키를 만들고 공개 키를 바꾼다.

`src-tauri/tauri.conf.json` 최상위(`"app"`과 `"bundle"` 사이)에 더한다:

```json
  "plugins": {
    "updater": {
      "pubkey": "<위에서 출력한 공개 키>",
      "endpoints": ["https://github.com/HoyeongJeon/windows-todo-widget/releases/latest/download/latest.json"],
      "windows": { "installMode": "passive" }
    }
  },
```

주소에 `{{current_version}}` 같은 변수를 넣지 않는다. 그래야 모든 사용자가 같은 주소를 부른다(UPD-02). 저장소 이름은 계획 6에서 바꾼다. GitHub는 바뀐 이름으로 넘겨 주지만, 그때 이 주소도 함께 고친다.

- [ ] **Step 3: 실패하는 설정·adapter 테스트 쓰기**

`src/adapters/updater/updater-config.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const config = JSON.parse(readFileSync(new URL('../../../src-tauri/tauri.conf.json', import.meta.url), 'utf8'));
const updater = config.plugins?.updater ?? {};

describe('업데이트 설정', () => {
  it('UPD-02 확인 주소는 모든 사용자에게 같은 GitHub Release의 latest.json 하나다', () => {
    expect(updater.endpoints).toHaveLength(1);
    expect(updater.endpoints[0]).toMatch(/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/releases\/latest\/download\/latest\.json$/);
    expect(updater.endpoints[0]).not.toContain('{{');
  });

  it('UPD-02 요청에 따로 붙이는 header가 없다', () => {
    expect(updater.headers).toBeUndefined();
  });

  it('UPD-08 앱에 업데이트 전용 공개 키가 들어 있다', () => {
    expect(typeof updater.pubkey).toBe('string');
    expect(updater.pubkey.length).toBeGreaterThan(40);
  });
});
```

`src/adapters/updater/tauri-updater.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { type PendingUpdate, type UpdaterApi, createTauriUpdater } from './tauri-updater.ts';

function pending(version: string, fail = false): PendingUpdate & { calls: string[] } {
  const calls: string[] = [];
  return {
    version,
    calls,
    downloadAndInstall: async () => {
      calls.push('install');
      if (fail)
        throw new Error('서명이 맞지 않아요');
    },
    close: async () => void calls.push('close'),
  };
}

function api(result: PendingUpdate | null) {
  const relaunch = vi.fn(async () => undefined);
  const check = vi.fn(async (..._args: unknown[]) => result);
  return { check, relaunch, api: { check, relaunch } satisfies UpdaterApi };
}

describe('Tauri updater adapter', () => {
  it('UPD-02 확인은 인자 없이(사용자 데이터 없이) plugin의 check만 부른다', async () => {
    const { check, api: updaterApi } = api(pending('2.1.0'));
    await createTauriUpdater(updaterApi, '2.0.0').fetchLatest();
    expect(check).toHaveBeenCalledOnce();
    expect(check.mock.calls[0]).toEqual([]);
  });

  it('UPD-03 새 버전이 있으면 그 버전을, 없으면 지금 버전을 돌려준다', async () => {
    expect(await createTauriUpdater(api(pending('2.1.0')).api, '2.0.0').fetchLatest()).toEqual({ version: '2.1.0' });
    expect(await createTauriUpdater(api(null).api, '2.0.0').fetchLatest()).toEqual({ version: '2.0.0' });
  });

  it('UPD-04 설치는 마지막으로 확인한 업데이트를 받아 설치한 뒤 다시 띄운다', async () => {
    const update = pending('2.1.0');
    const { relaunch, api: updaterApi } = api(update);
    const updater = createTauriUpdater(updaterApi, '2.0.0');
    await updater.fetchLatest();
    await updater.downloadAndInstall();
    expect(update.calls).toEqual(['install']);
    expect(relaunch).toHaveBeenCalledOnce();
  });

  it('UPD-07 UPD-08 받기·설치·서명 확인이 실패하면 던지고 다시 띄우지 않는다', async () => {
    const { relaunch, api: updaterApi } = api(pending('2.1.0', true));
    const updater = createTauriUpdater(updaterApi, '2.0.0');
    await updater.fetchLatest();
    await expect(updater.downloadAndInstall()).rejects.toThrow('서명이 맞지 않아요');
    expect(relaunch).not.toHaveBeenCalled();
  });

  it('UPD-05 확인하지 않았거나 새 버전이 없으면 설치하지 않는다', async () => {
    await expect(createTauriUpdater(api(null).api, '2.0.0').downloadAndInstall()).rejects.toThrow();
  });

  it('다시 확인하면 앞서 받은 업데이트 정보를 닫는다', async () => {
    const first = pending('2.1.0');
    const check = vi.fn<() => Promise<PendingUpdate | null>>().mockResolvedValueOnce(first).mockResolvedValueOnce(pending('2.2.0'));
    const updater = createTauriUpdater({ check, relaunch: async () => undefined }, '2.0.0');
    await updater.fetchLatest();
    expect(await updater.fetchLatest()).toEqual({ version: '2.2.0' });
    expect(first.calls).toEqual(['close']);
  });
});
```

Run: `pnpm vitest run src/adapters/updater`
Expected: 설정 테스트는 Step 2를 마쳤으면 PASS이고, adapter 테스트는 FAIL(모듈 없음)이다.

- [ ] **Step 4: adapter 구현**

`src/adapters/updater/tauri-updater.ts`:

```ts
import { relaunch } from '@tauri-apps/plugin-process';
import { check } from '@tauri-apps/plugin-updater';
import type { Updater } from '../../application/ports/updater.ts';

/** plugin이 돌려주는 업데이트 중 쓰는 것. 받기·서명 확인·설치는 plugin이 한다 (UPD-08). */
export interface PendingUpdate {
  version: string;
  downloadAndInstall(): Promise<void>;
  close(): Promise<void>;
}

export interface UpdaterApi {
  check(): Promise<PendingUpdate | null>;
  relaunch(): Promise<void>;
}

/** 실제 plugin. 이 폴더만 네트워크를 쓸 수 있다 (PRIV-01). 요청 주소는 tauri.conf.json의 endpoints 하나다 (UPD-02). */
export function tauriUpdaterApi(): UpdaterApi {
  return { check: () => check(), relaunch };
}

/**
 * GitHub Release의 latest.json으로 새 버전을 확인하고, 누르면 받아서 설치한 뒤 다시 띄운다.
 * Windows에서는 설치 프로그램이 앱을 끝내므로 relaunch까지 가지 않는다. 설정 저장은 UpdateService가 그 전에 한다(prepareRestart).
 */
export function createTauriUpdater(api: UpdaterApi, currentVersion: string): Updater {
  let pending: PendingUpdate | null = null;

  return {
    async fetchLatest(): Promise<{ version: string }> {
      const found = await api.check();
      const previous = pending;
      pending = found;
      await previous?.close().catch(() => undefined);
      return { version: found?.version ?? currentVersion };
    },

    async downloadAndInstall(): Promise<void> {
      if (!pending)
        throw new Error('설치할 업데이트가 없어요');
      await pending.downloadAndInstall();
      await api.relaunch();
    },
  };
}
```

plugin의 `check()`가 돌려주는 `Update`는 `version`, `downloadAndInstall()`, `close()`를 가진다. 타입이 맞지 않으면 `tauriUpdaterApi` 안에서 감싸 맞춘다.

Run: `pnpm vitest run src/adapters/updater`
Expected: PASS

- [ ] **Step 5: 구조 테스트 — updater plugin도 updater 폴더에서만**

`src/architecture.test.ts`의 `'PRIV-01 Tauri의 websocket·upload plugin도 ...'` 테스트 다음에 더한다:

```ts
  it('PRIV-01 Tauri updater plugin은 updater adapter에서만 쓴다', () => {
    const violations = checkArchitecture([
      file('src/adapters/tauri/x.ts', "import { check } from '@tauri-apps/plugin-updater';"),
      file('src/adapters/updater/tauri-updater.ts', "import { check } from '@tauri-apps/plugin-updater';"),
    ]);
    expect(violations).toEqual([
      { path: 'src/adapters/tauri/x.ts', line: 1, message: '네트워크는 src/adapters/updater/에서만 써요 (PRIV-01): @tauri-apps/plugin-updater' },
    ]);
  });
```

Run: `pnpm vitest run src/architecture.test.ts`
Expected: FAIL

`tools/architecture/rules.ts`의 `NETWORK_PATTERN`에서 `@tauri-apps\/plugin-(?:http|websocket|upload)`를 `@tauri-apps\/plugin-(?:http|websocket|upload|updater)`로 바꾼다.

Run: `pnpm vitest run src/architecture.test.ts`
Expected: PASS(실제 소스 검사 포함)

- [ ] **Step 6: 실패하는 Rust 네트워크 crate 검사 테스트 쓰기**

`tools/privacy/network-crates.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { checkNetworkCrates, directDependents } from './network-crates.ts';

const reqwestTree = [
  '0reqwest v0.12.24',
  '1tauri-plugin-updater v2.13.1',
  '2todo-widget v2.0.0 (/repo/src-tauri)',
].join('\n');

describe('Rust 네트워크 crate 검사', () => {
  it('cargo tree -i 출력에서 바로 위 의존자만 고른다', () => {
    expect(directDependents(reqwestTree)).toEqual(['tauri-plugin-updater']);
  });

  it('PRIV-01 reqwest는 updater plugin만 쓰고 다른 HTTP crate는 없어야 한다', () => {
    expect(checkNetworkCrates((crate) => (crate === 'reqwest' ? reqwestTree : null))).toEqual([]);
  });

  it('PRIV-01 다른 crate가 reqwest를 쓰거나 다른 HTTP crate가 있으면 알린다', () => {
    const extra = `${reqwestTree}\n1tauri-plugin-http v2.5.0\n2todo-widget v2.0.0 (/repo/src-tauri)`;
    expect(checkNetworkCrates((crate) => (crate === 'reqwest' ? extra : crate === 'ureq' ? '0ureq v2.0.0\n1some-crate v1.0.0' : null))).toEqual([
      'reqwest를 tauri-plugin-http가 써요. 네트워크는 tauri-plugin-updater만 써야 해요 (PRIV-01)',
      'ureq가 의존성에 있어요 (PRIV-01)',
    ]);
  });
});
```

Run: `pnpm vitest run tools/privacy`
Expected: FAIL (모듈 없음)

- [ ] **Step 7: 검사 구현과 CI 연결**

`tools/privacy/network-crates.ts`:

```ts
/** HTTP 요청을 보낼 수 있는 crate와, 그것을 써도 되는 crate (PRIV-01). */
export const NETWORK_CRATES: Readonly<Record<string, readonly string[]>> = {
  reqwest: ['tauri-plugin-updater'],
  ureq: [],
  isahc: [],
  curl: [],
  attohttpc: [],
};

/** `cargo tree -i <crate> -e normal --prefix depth` 출력에서 깊이 1(바로 위 의존자)의 crate 이름. */
export function directDependents(treeOutput: string): string[] {
  const names = treeOutput
    .split(/\r?\n/)
    .map((line) => /^1([\w-]+) v/.exec(line)?.[1])
    .filter((name): name is string => name !== undefined);
  return [...new Set(names)];
}

/** run(crate)는 그 crate의 역의존 트리 출력이고, 의존성에 없으면 null이다. 어긴 것을 문장으로 돌려준다. */
export function checkNetworkCrates(run: (crate: string) => string | null): string[] {
  const problems: string[] = [];
  for (const [crate, allowed] of Object.entries(NETWORK_CRATES)) {
    const tree = run(crate);
    if (tree === null)
      continue;
    if (allowed.length === 0) {
      problems.push(`${crate}가 의존성에 있어요 (PRIV-01)`);
      continue;
    }
    for (const user of directDependents(tree).filter((name) => !allowed.includes(name)))
      problems.push(`${crate}를 ${user}가 써요. 네트워크는 ${allowed.join(', ')}만 써야 해요 (PRIV-01)`);
  }
  return problems;
}
```

`tools/privacy/cli.ts`:

```ts
import { spawnSync } from 'node:child_process';
import { checkNetworkCrates } from './network-crates.ts';

/** Rust 의존성 중 네트워크 crate를 검사한다. 이 OS의 빌드 대상 기준이라 CI가 Windows·macOS에서 각각 돌린다. */
const problems = checkNetworkCrates((crate) => {
  const result = spawnSync(
    'cargo',
    ['tree', '--manifest-path', 'src-tauri/Cargo.toml', '--workspace', '-i', crate, '-e', 'normal', '--prefix', 'depth'],
    { encoding: 'utf8' },
  );
  if (result.status === 0)
    return result.stdout;
  if (/did not match any packages/.test(result.stderr))
    return null;
  throw new Error(`cargo tree가 실패했어요: ${result.stderr}`);
});

if (problems.length > 0) {
  for (const problem of problems)
    console.error(problem);
  process.exit(1);
}
console.log('네트워크 crate 검사 통과');
```

`package.json` `scripts`에 `"privacy:check": "node tools/privacy/cli.ts"`를 더한다.

`.github/workflows/ci.yml`의 `check` job에서 `Rust 테스트` 다음에 더한다:

```yaml
      - name: PRIV-01 Rust 네트워크 crate 검사
        run: pnpm privacy:check
```

Run: `pnpm privacy:check`
Expected:
- `네트워크 crate 검사 통과`
- 실패하면 `cargo tree -i reqwest -e normal`로 어느 crate가 끌어왔는지 보고 판단한다.
- 그 판단은 Task 보고에 적는다.

- [ ] **Step 8: 전체 검사와 커밋**

Global Constraints의 검사, `pnpm privacy:check`, `pnpm tauri build --debug --no-bundle`을 돌린다.

```bash
git add -A package.json pnpm-lock.yaml src/adapters/updater tools src/architecture.test.ts src-tauri .github/workflows/ci.yml
git commit -m "feat: updater plugin adapter와 개발용 서명 키, Rust 네트워크 crate 검사를 넣음"
```

---
### Task 8: 작은 adapter들 — 시각 예약, 잠자기, 언어, 앱 정보, 대화 상자, 종료

**Files:**
- Create: `src/application/ports/dialog.ts`, `src/application/ports/app-process.ts`, `src/application/ports/locale.ts`
- Create: `src/adapters/system/timer.ts`, `src/adapters/system/timer.test.ts`
- Create: `src/adapters/system/wake.ts`, `src/adapters/system/wake.test.ts`
- Create: `src/adapters/tauri/app-info.ts`, `src/adapters/tauri/app-info.test.ts`
- Create: `src/adapters/tauri/locale.ts`, `src/adapters/tauri/locale.test.ts`
- Create: `src/adapters/tauri/dialog.ts`, `src/adapters/tauri/dialog.test.ts`
- Create: `src/adapters/tauri/process.ts`, `src/adapters/tauri/process.test.ts`
- Create: `src/testing/fake-dialog.ts`, `src/testing/fake-process.ts`
- Modify: `package.json`, `pnpm-lock.yaml`(`@tauri-apps/plugin-dialog`), `src-tauri/Cargo.toml`, `src-tauri/src/lib.rs`, `src-tauri/src/commands/mod.rs`, `src-tauri/src/platform/macos.rs`, `src-tauri/capabilities/default.json`

**Interfaces:**
- Produces (port):
  - `Dialog { showError(title: string, message: string): Promise<void> }`
  - `AppProcess { exit(): Promise<void>; onQuitRequested(listener: () => void): () => void }`
  - `LocaleProvider { osLocale(): Promise<string | null> }`
- Produces (adapter):
  - `createSystemTimer(): Timer`
  - `watchWake(onWake: () => void, api?: IntervalApi): () => void`, `WAKE_CHECK_INTERVAL_MS`, `WAKE_GAP_MS`
  - `loadPlatformInfo(invoke): Promise<PlatformInfo>` (`PlatformInfo = AppInfo & { os: DesktopOs }`)
  - `createLocaleProvider(invoke): LocaleProvider`
  - `createDialog(message): Dialog`, `tauriDialog(): Dialog`
  - `createTauriProcess(invoke, listen): AppProcess`
- Produces (Rust):
  - 명령 `app_info() -> { version, isDevBuild, os }`
  - 명령 `os_locale() -> Option<String>`
  - 명령 `quit_app()`
  - `crate::commands::request_quit(&AppHandle)`: `quit-requested` 이벤트를 보내고, 3초 안에 끝나지 않으면 끝낸다
- Produces (테스트용): `FakeDialog`, `FakeProcess`

- [ ] **Step 1: port 세 개 쓰기**

`src/application/ports/dialog.ts`:

```ts
/** OS 대화 상자. 위젯을 띄우지 못할 때 알린다 (STORE-10). */
export interface Dialog {
  showError(title: string, message: string): Promise<void>;
}
```

`src/application/ports/app-process.ts`:

```ts
/** 앱 프로세스. */
export interface AppProcess {
  /** 프로세스를 끝낸다. 저장은 부르는 쪽이 먼저 마친다 (START-08). */
  exit(): Promise<void>;
  /** 메뉴 막대 "종료"(MAC-04)나 창 닫기처럼 OS 쪽에서 종료를 청하면 부른다. 돌려준 함수를 부르면 그만 받는다. */
  onQuitRequested(listener: () => void): () => void;
}
```

`src/application/ports/locale.ts`:

```ts
/** OS 언어. BCP 47 태그(예: `ko-KR`, `de-DE`, `zh-Hans-CN`)이고 알 수 없으면 null이다 (I18N-01, 화면 언어는 계획 5). */
export interface LocaleProvider {
  osLocale(): Promise<string | null>;
}
```

- [ ] **Step 2: 실패하는 adapter 테스트 쓰기**

`src/adapters/system/timer.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSystemTimer } from './timer.ts';

afterEach(() => {
  vi.useRealTimers();
});

describe('시스템 타이머', () => {
  it('정한 시간 뒤에 한 번 실행하고, 취소하면 실행하지 않는다', () => {
    vi.useFakeTimers();
    const timer = createSystemTimer();
    const ran: string[] = [];
    timer.schedule(1000, () => ran.push('a'));
    const cancel = timer.schedule(1000, () => ran.push('b'));
    cancel();
    vi.advanceTimersByTime(999);
    expect(ran).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(ran).toEqual(['a']);
  });
});
```

`src/adapters/system/wake.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { type IntervalApi, WAKE_CHECK_INTERVAL_MS, WAKE_GAP_MS, watchWake } from './wake.ts';

function fakeIntervals() {
  let now = 0;
  let tick: (() => void) | null = null;
  let cleared = false;
  const api: IntervalApi = {
    now: () => now,
    setInterval: (callback, ms) => {
      expect(ms).toBe(WAKE_CHECK_INTERVAL_MS);
      tick = callback;
      return 1;
    },
    clearInterval: () => {
      cleared = true;
    },
  };
  return {
    api,
    passes: (ms: number) => {
      now += ms;
      tick?.();
    },
    isCleared: () => cleared,
  };
}

describe('잠자기에서 깨어남', () => {
  it('UPD-01 1분마다 볼 때 2분 넘게 건너뛰었으면 깨어난 것으로 알린다', () => {
    const intervals = fakeIntervals();
    let wakes = 0;
    watchWake(() => wakes++, intervals.api);
    intervals.passes(WAKE_CHECK_INTERVAL_MS);
    intervals.passes(WAKE_CHECK_INTERVAL_MS + 500);
    expect(wakes).toBe(0);
    intervals.passes(8 * 60 * 60 * 1000);
    expect(wakes).toBe(1);
    intervals.passes(WAKE_CHECK_INTERVAL_MS);
    expect(wakes).toBe(1);
    expect(WAKE_GAP_MS).toBe(2 * WAKE_CHECK_INTERVAL_MS);
  });

  it('멈추면 interval을 지운다', () => {
    const intervals = fakeIntervals();
    watchWake(() => undefined, intervals.api)();
    expect(intervals.isCleared()).toBe(true);
  });
});
```

`src/adapters/tauri/app-info.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { loadPlatformInfo } from './app-info.ts';

describe('앱 정보', () => {
  it('START-07 Rust가 알려 준 버전, 개발 빌드 여부, OS를 쓴다', async () => {
    const info = await loadPlatformInfo(async () => ({ version: '2.0.0', isDevBuild: true, os: 'macos' }));
    expect(info).toEqual({ version: '2.0.0', isDevBuild: true, os: 'macos' });
  });

  it('모르는 OS면 던진다', async () => {
    await expect(loadPlatformInfo(async () => ({ version: '2.0.0', isDevBuild: false, os: 'linux' }))).rejects.toThrow();
  });
});
```

`src/adapters/tauri/locale.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createLocaleProvider } from './locale.ts';

describe('OS 언어', () => {
  it('I18N-01 Rust가 읽은 BCP 47 태그를 그대로 준다', async () => {
    expect(await createLocaleProvider(async () => 'ko-KR').osLocale()).toBe('ko-KR');
  });

  it('I18N-01 알 수 없거나 실패하면 null이다', async () => {
    expect(await createLocaleProvider(async () => null).osLocale()).toBeNull();
    expect(await createLocaleProvider(async () => '').osLocale()).toBeNull();
    expect(
      await createLocaleProvider(async () => {
        throw '실패';
      }).osLocale(),
    ).toBeNull();
  });
});
```

`src/adapters/tauri/dialog.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { createDialog } from './dialog.ts';

describe('대화 상자', () => {
  it('STORE-10 제목과 내용을 오류 대화 상자로 보여 주고 닫힐 때까지 기다린다', async () => {
    const message = vi.fn(async () => undefined);
    await createDialog(message).showError('할 일', '할 일 파일을 열 수 없어요');
    expect(message).toHaveBeenCalledWith('할 일 파일을 열 수 없어요', { title: '할 일', kind: 'error' });
  });
});
```

`src/adapters/tauri/process.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { createTauriProcess } from './process.ts';

describe('앱 프로세스', () => {
  it('START-08 끝내기는 quit_app 명령을 부른다', async () => {
    const invoke = vi.fn(async () => undefined);
    await createTauriProcess(invoke, async () => () => undefined).exit();
    expect(invoke).toHaveBeenCalledWith('quit_app');
  });

  it('START-08 OS의 종료 요청(quit-requested)을 넘기고, 그만 받으면 듣기를 푼다', async () => {
    let handler: (() => void) | null = null;
    const unlisten = vi.fn();
    const listen = vi.fn(async (event: string, callback: () => void) => {
      expect(event).toBe('quit-requested');
      handler = callback;
      return unlisten;
    });
    const process = createTauriProcess(async () => undefined, listen);
    const listener = vi.fn();
    const stop = process.onQuitRequested(listener);
    await vi.waitFor(() => expect(handler).not.toBeNull());
    handler?.();
    expect(listener).toHaveBeenCalledOnce();
    stop();
    expect(unlisten).toHaveBeenCalledOnce();
  });
});
```

Run: `pnpm vitest run src/adapters`
Expected: 새 테스트 FAIL (모듈 없음)

- [ ] **Step 3: adapter 구현**

`src/adapters/system/timer.ts`:

```ts
import type { Timer } from '../../application/ports/timer.ts';

/** setTimeout으로 한 번 실행한다. 잠자는 동안 멈출 수 있어, 잠자기에서 깨어나면 UpdateService.onWake()가 다시 맞춘다. */
export function createSystemTimer(): Timer {
  return {
    schedule(ms: number, task: () => void): () => void {
      const handle = globalThis.setTimeout(task, ms);
      return () => globalThis.clearTimeout(handle);
    },
  };
}
```

`src/adapters/system/wake.ts`:

```ts
export const WAKE_CHECK_INTERVAL_MS = 60_000;
/** 1분마다 보는데 이보다 오래 건너뛰었으면 그동안 잠들어 있던 것이다. */
export const WAKE_GAP_MS = 2 * WAKE_CHECK_INTERVAL_MS;

export interface IntervalApi {
  now(): number;
  setInterval(callback: () => void, ms: number): unknown;
  clearInterval(handle: unknown): void;
}

const systemIntervals: IntervalApi = {
  now: () => Date.now(),
  setInterval: (callback, ms) => globalThis.setInterval(callback, ms),
  clearInterval: (handle) => globalThis.clearInterval(handle as Parameters<typeof globalThis.clearInterval>[0]),
};

/** 잠자기에서 깨어나면 알린다 (UPD-01). 1분에 한 번 시계만 보므로 가만히 있을 때 CPU를 거의 쓰지 않는다 (PERF-03). */
export function watchWake(onWake: () => void, api: IntervalApi = systemIntervals): () => void {
  let last = api.now();
  const handle = api.setInterval(() => {
    const now = api.now();
    if (now - last > WAKE_GAP_MS)
      onWake();
    last = now;
  }, WAKE_CHECK_INTERVAL_MS);
  return () => api.clearInterval(handle);
}
```

`src/adapters/tauri/app-info.ts`:

```ts
import type { AppInfo } from '../../application/ports/app-info.ts';
import type { DesktopOs } from './coordinates.ts';
import type { Invoke } from './invoke.ts';

export interface PlatformInfo extends AppInfo {
  readonly os: DesktopOs;
}

/** Rust `app_info` 명령. 개발 빌드는 debug 빌드다(`pnpm tauri dev`, `--debug`) (START-07). */
export async function loadPlatformInfo(invoke: Invoke): Promise<PlatformInfo> {
  const info = (await invoke('app_info')) as { version: string; isDevBuild: boolean; os: string };
  if (info.os !== 'windows' && info.os !== 'macos')
    throw new Error(`지원하지 않는 OS예요: ${info.os}`);
  return { version: info.version, isDevBuild: info.isDevBuild, os: info.os };
}
```

`src/adapters/tauri/locale.ts`:

```ts
import type { LocaleProvider } from '../../application/ports/locale.ts';
import type { Invoke } from './invoke.ts';

/** WebView의 navigator.language는 앱 번들의 지역화에 따라 OS 언어와 다를 수 있어, Rust(sys-locale)가 읽은 값을 쓴다. */
export function createLocaleProvider(invoke: Invoke): LocaleProvider {
  return {
    async osLocale(): Promise<string | null> {
      try {
        const locale = await invoke('os_locale');
        return typeof locale === 'string' && locale.length > 0 ? locale : null;
      } catch {
        return null;
      }
    },
  };
}
```

`src/adapters/tauri/dialog.ts`:

```ts
import { message as tauriMessage } from '@tauri-apps/plugin-dialog';
import type { Dialog } from '../../application/ports/dialog.ts';

type MessageFn = (text: string, options: { title: string; kind: 'error' }) => Promise<unknown>;

export function createDialog(message: MessageFn): Dialog {
  return {
    async showError(title: string, text: string): Promise<void> {
      await message(text, { title, kind: 'error' });
    },
  };
}

export function tauriDialog(): Dialog {
  return createDialog(tauriMessage);
}
```

`src/adapters/tauri/process.ts`:

```ts
import type { AppProcess } from '../../application/ports/app-process.ts';
import type { Invoke } from './invoke.ts';

/** Rust `request_quit`이 보내는 이벤트 (메뉴 막대 "종료", 창 닫기). */
export const QUIT_REQUESTED_EVENT = 'quit-requested';

type Listen = (event: string, handler: () => void) => Promise<() => void>;

export function createTauriProcess(invoke: Invoke, listen: Listen): AppProcess {
  return {
    async exit(): Promise<void> {
      await invoke('quit_app');
    },
    onQuitRequested(listener: () => void): () => void {
      let stopped = false;
      let unlisten: (() => void) | null = null;
      void listen(QUIT_REQUESTED_EVENT, listener).then((stop) => {
        if (stopped)
          stop();
        else
          unlisten = stop;
      });
      return () => {
        stopped = true;
        unlisten?.();
      };
    },
  };
}
```

`@tauri-apps/plugin-dialog`는 Step 5에서 설치한다. 이 Step의 테스트는 `createDialog`만 쓰지만, import는 설치해야 풀린다. 그래서 Step 5의 `pnpm add`를 먼저 해도 된다.

Run: `pnpm vitest run src/adapters`
Expected: PASS

- [ ] **Step 4: 테스트용 가짜**

`src/testing/fake-dialog.ts`:

```ts
import type { Dialog } from '../application/ports/dialog.ts';

export class FakeDialog implements Dialog {
  readonly shown: Array<{ title: string; message: string }> = [];

  async showError(title: string, message: string): Promise<void> {
    this.shown.push({ title, message });
  }
}
```

`src/testing/fake-process.ts`:

```ts
import type { AppProcess } from '../application/ports/app-process.ts';

export class FakeProcess implements AppProcess {
  exits = 0;
  readonly #listeners = new Set<() => void>();

  async exit(): Promise<void> {
    this.exits++;
  }

  onQuitRequested(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  /** 테스트: 메뉴 막대 "종료"를 누른 것처럼 한다. */
  requestQuit(): void {
    for (const listener of this.#listeners)
      listener();
  }
}
```

- [ ] **Step 5: Rust 명령과 종료 요청**

```bash
npm view @tauri-apps/plugin-dialog versions --json | tail -5
pnpm add -E @tauri-apps/plugin-dialog@<crate 2.8.1과 major·minor가 같은 버전>
```

`src-tauri/Cargo.toml` `[dependencies]`:

```toml
tauri-plugin-dialog = "=2.8.1"
sys-locale = "0.3"
```

`src-tauri/src/commands/mod.rs`에 더한다(`use`는 파일 위로 모은다):

```rust
use serde::Serialize;
use std::time::Duration;
use tauri::Emitter;

/// JS가 이 시간 안에 저장을 마치고 끝내지 않으면 Rust가 끝낸다.
const QUIT_FALLBACK_DELAY: Duration = Duration::from_secs(3);
/// JS `src/adapters/tauri/process.ts`의 `QUIT_REQUESTED_EVENT`와 같다.
const QUIT_EVENT: &str = "quit-requested";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    version: String,
    is_dev_build: bool,
    os: &'static str,
}

/// 앱 버전과 개발 빌드 여부(START-07), OS.
#[tauri::command]
pub fn app_info(app: AppHandle) -> AppInfo {
    AppInfo {
        version: app.package_info().version.to_string(),
        is_dev_build: cfg!(debug_assertions),
        os: if cfg!(windows) { "windows" } else { "macos" },
    }
}

/// OS 언어(BCP 47). 화면 언어를 고르는 데 쓴다 (I18N-01).
#[tauri::command]
pub fn os_locale() -> Option<String> {
    sys_locale::get_locale()
}

/// JS 종료 흐름이 저장을 마친 뒤 부른다 (START-08).
#[tauri::command]
pub fn quit_app(app: AppHandle) {
    app.exit(0);
}

/// OS 쪽 종료 요청(메뉴 막대 "종료", 창 닫기)을 JS 종료 흐름으로 넘긴다. 위치를 저장해야 하기 때문이다 (WND-14).
pub fn request_quit(app: &AppHandle) {
    let _ = app.emit(QUIT_EVENT, ());
    let app = app.clone();
    std::thread::spawn(move || {
        std::thread::sleep(QUIT_FALLBACK_DELAY);
        app.exit(0);
    });
}
```

`src-tauri/src/platform/macos.rs`의 tray 메뉴 `"quit" => app.exit(0),`을 `"quit" => crate::commands::request_quit(app),`으로 바꾼다.

`src-tauri/src/lib.rs`:
- builder에 `.plugin(tauri_plugin_dialog::init())`를 더한다(process plugin 다음).
- `generate_handler!`에 `commands::app_info`, `commands::os_locale`, `commands::quit_app`을 더한다.
- `.setup(...)` 앞에 다음을 더한다.

```rust
        // Alt+F4 같은 창 닫기도 종료 흐름을 거쳐 위치를 저장한다 (WND-14).
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                commands::request_quit(window.app_handle());
            }
        })
```

`use tauri::Manager;`가 필요하면 더한다.

`src-tauri/capabilities/default.json`의 `permissions`에 `"dialog:allow-message"`를 더한다.

- [ ] **Step 6: 전체 검사와 커밋**

Global Constraints의 검사와 Windows 대상 check·clippy, `pnpm privacy:check`, `pnpm tauri build --debug --no-bundle`을 돌린다. 끝나면 `pnpm-lock.yaml`의 `lockfileVersion`이 `'9.0'`인지 본다.

```bash
git add -A package.json pnpm-lock.yaml src src-tauri
git commit -m "feat: 시스템 타이머·잠자기 감지·OS 언어·앱 정보·대화 상자·종료 요청 adapter를 넣음"
```

---

### Task 9: 앱 수명 — 시작에서 종료까지 (launchApp, AppLifecycle)

composition root가 하던 흐름(시작 실패 대화 상자, 창 배치, 업데이트 시작, 종료 순서)을 application으로 내려 테스트한다. `src/main.ts`는 adapter를 만들어 넘기기만 한다.

**Files:**
- Create: `src/application/lifecycle.ts`, `src/application/lifecycle.test.ts`
- Create: `src/application/launch.ts`, `src/application/launch.test.ts`

**Interfaces:**
- Consumes:
  - `startApp`, `StartupDeps`(`files`, `clock`, `timer`, `newId`, `autoStart`, `appInfo`)
  - `WindowPlacement`(Task 6), `UpdateService`, `AutoStartControl`, `TodoSession.whenSaved()`
  - `Dialog`, `AppProcess`(Task 8), `Updater`, `WindowController`
  - `TASKS_FILE`
- Produces:
  - `class AppLifecycle { constructor(deps: { session; placement; process }); quit(): Promise<void>; prepareRestart(): Promise<void> }`
  - `interface LaunchTexts { appTitle: string; cannotOpen: string }`
  - `interface LaunchDeps extends StartupDeps { window; dialog; process; updater; watchWake: (onWake: () => void) => () => void; texts: LaunchTexts }`
  - `interface RunningApp { session; settings; placement; lifecycle; updates; autoStart: AutoStartControl }`
  - `type LaunchResult = { kind: 'exited' } | ({ kind: 'running' } & RunningApp)`
  - `launchApp(deps: LaunchDeps): Promise<LaunchResult>`

- [ ] **Step 1: 실패하는 종료 흐름 테스트 쓰기**

`src/application/lifecycle.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { FakeClock } from '../testing/fake-clock.ts';
import { FakeProcess } from '../testing/fake-process.ts';
import { FakeWindowController } from '../testing/fake-window-controller.ts';
import { ManualTimer } from '../testing/manual-timer.ts';
import { MemoryFileStore } from '../testing/memory-file-store.ts';
import { sequenceIds } from '../testing/sequence-ids.ts';
import { AppLifecycle } from './lifecycle.ts';
import { SETTINGS_FILE, SettingsRepository } from './settings/settings-repository.ts';
import { SettingsService } from './settings/settings-service.ts';
import { TASKS_FILE, TaskRepository } from './storage/task-repository.ts';
import { TodoSession } from './todo-session.ts';
import { WindowPlacement } from './window-placement.ts';

let files: MemoryFileStore;
let window: FakeWindowController;
let process: FakeProcess;

beforeEach(() => {
  files = new MemoryFileStore();
  window = new FakeWindowController();
  process = new FakeProcess();
});

async function lifecycle(): Promise<{ lifecycle: AppLifecycle; session: TodoSession }> {
  const clock = new FakeClock();
  const session = await TodoSession.open(new TaskRepository(files, clock), clock, sequenceIds());
  const settings = await SettingsService.open(new SettingsRepository(files));
  const placement = new WindowPlacement({ window, settings, timer: new ManualTimer() });
  return { lifecycle: new AppLifecycle({ session, placement, process }), session };
}

describe('앱 수명', () => {
  it('START-08 WND-14 종료하면 창 위치를 설정에 저장하고, 할 일 저장이 끝난 뒤 프로세스를 끝낸다', async () => {
    const { lifecycle: app, session } = await lifecycle();
    let releaseWrite: () => void = () => undefined;
    files.writeGate = new Promise((resolve) => {
      releaseWrite = resolve;
    });
    session.add('보고서');
    window.current = { left: 640, top: 480, width: 320, height: 520 };
    const quitting = app.quit();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(process.exits).toBe(0);
    releaseWrite();
    await quitting;
    expect(process.exits).toBe(1);
    expect(JSON.parse(files.files.get(SETTINGS_FILE) ?? 'null')).toMatchObject({ left: 640, top: 480 });
    expect(files.files.get(TASKS_FILE)).toContain('보고서');
  });

  it('WND-14 설정이나 할 일 저장에 실패해도 그대로 끝낸다', async () => {
    const { lifecycle: app, session } = await lifecycle();
    files.failWrites = true;
    session.add('보고서');
    await app.quit();
    expect(process.exits).toBe(1);
  });

  it('START-08 여러 번 눌러도 한 번만 끝낸다', async () => {
    const { lifecycle: app } = await lifecycle();
    await Promise.all([app.quit(), app.quit()]);
    expect(process.exits).toBe(1);
  });

  it('UPD-04 다시 띄우기 전 준비는 종료처럼 저장하지만 프로세스를 끝내지 않는다', async () => {
    const { lifecycle: app } = await lifecycle();
    window.current = { left: 10, top: 20, width: 320, height: 520 };
    await app.prepareRestart();
    expect(process.exits).toBe(0);
    expect(JSON.parse(files.files.get(SETTINGS_FILE) ?? 'null')).toMatchObject({ left: 10, top: 20 });
  });
});
```

Run: `pnpm vitest run src/application/lifecycle.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 2: 종료 흐름 구현**

`src/application/lifecycle.ts`:

```ts
import type { AppProcess } from './ports/app-process.ts';
import type { TodoSession } from './todo-session.ts';
import type { WindowPlacement } from './window-placement.ts';

export interface LifecycleDeps {
  session: TodoSession;
  placement: WindowPlacement;
  process: AppProcess;
}

/** 종료(START-08)와 업데이트로 다시 띄우기 전(UPD-04)의 저장 순서. 저장이 실패해도 멈추지 않는다 (WND-14). */
export class AppLifecycle {
  readonly #deps: LifecycleDeps;
  #quitting: Promise<void> | null = null;

  constructor(deps: LifecycleDeps) {
    this.#deps = deps;
  }

  quit(): Promise<void> {
    this.#quitting ??= this.#quit();
    return this.#quitting;
  }

  /** 창 위치를 다른 설정과 함께 저장하고(WND-14), 바뀐 할 일이 디스크에 써질 때까지 기다린다. */
  async prepareRestart(): Promise<void> {
    await this.#deps.placement.captureForQuit();
    await this.#deps.session.whenSaved().catch(() => undefined);
  }

  async #quit(): Promise<void> {
    await this.prepareRestart();
    await this.#deps.process.exit();
  }
}
```

Run: `pnpm vitest run src/application/lifecycle.test.ts`
Expected: PASS

- [ ] **Step 3: 실패하는 시작 흐름 테스트 쓰기**

`src/application/launch.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { FakeAutoStart } from '../testing/fake-auto-start.ts';
import { FakeClock } from '../testing/fake-clock.ts';
import { FakeDialog } from '../testing/fake-dialog.ts';
import { FakeProcess } from '../testing/fake-process.ts';
import { FakeTimer, flush } from '../testing/fake-timer.ts';
import { FakeUpdater } from '../testing/fake-updater.ts';
import { FakeWindowController } from '../testing/fake-window-controller.ts';
import { MemoryFileStore } from '../testing/memory-file-store.ts';
import { sequenceIds } from '../testing/sequence-ids.ts';
import { type LaunchResult, launchApp } from './launch.ts';
import { SETTINGS_FILE } from './settings/settings-repository.ts';
import { TASKS_FILE } from './storage/task-repository.ts';

let files: MemoryFileStore;
let clock: FakeClock;
let timer: FakeTimer;
let window: FakeWindowController;
let dialog: FakeDialog;
let process: FakeProcess;
let updater: FakeUpdater;
let autoStart: FakeAutoStart;
let wakes: Array<() => void>;

beforeEach(() => {
  files = new MemoryFileStore();
  clock = new FakeClock();
  timer = new FakeTimer(clock);
  window = new FakeWindowController();
  dialog = new FakeDialog();
  process = new FakeProcess();
  updater = new FakeUpdater();
  autoStart = new FakeAutoStart();
  wakes = [];
});

/** 읽기 다시 시도(STORE-20, 100ms 간격)가 끝나도록 시간을 조금씩 보낸다. 24시간 업데이트 예약은 실행되지 않는다. */
async function launch(): Promise<LaunchResult> {
  const result = launchApp({
    files,
    clock,
    timer,
    newId: sequenceIds(),
    autoStart,
    appInfo: { version: '2.0.0', isDevBuild: false },
    window,
    dialog,
    process,
    updater,
    watchWake: (onWake) => {
      wakes.push(onWake);
      return () => undefined;
    },
    texts: { appTitle: '할 일', cannotOpen: '할 일 파일을 열 수 없어요' },
  });
  for (let i = 0; i < 6; i++) {
    await flush();
    await timer.advance(100);
  }
  return result;
}

describe('앱 시작', () => {
  it('STORE-10 tasks.json을 읽지 못하면 창을 숨긴 채 대화 상자를 보이고, 확인하면 끝낸다', async () => {
    files.files.set(TASKS_FILE, '{"version":2,"tasks":[]}');
    files.unreadable.add(TASKS_FILE);
    expect(await launch()).toEqual({ kind: 'exited' });
    expect(window.keptHidden).toBe(true);
    expect(dialog.shown).toEqual([
      { title: '할 일', message: expect.stringMatching(/^할 일 파일을 열 수 없어요\n\/data\/tasks\.json\n.*읽지 못했어요/) },
    ]);
    expect(process.exits).toBe(1);
    expect(window.shown).toEqual([]);
    expect(autoStart.calls).toEqual([]);
  });

  it('STORE-10 시작 중 예상 못 한 오류도 같은 대화 상자로 알리고 끝낸다', async () => {
    files.read = async () => {
      throw new TypeError('버그');
    };
    expect(await launch()).toEqual({ kind: 'exited' });
    expect(dialog.shown[0]?.message).toContain('/data/tasks.json');
    expect(dialog.shown[0]?.message).toContain('버그');
    expect(process.exits).toBe(1);
  });

  it('WND-07 UPD-01 준비되면 창을 배치하고 업데이트를 확인하며 실행 중인 서비스를 돌려준다', async () => {
    const result = await launch();
    if (result.kind !== 'running')
      throw new Error('실행되지 않았어요');
    expect(window.current).toEqual({ left: 1576, top: 24, width: 320, height: 520 });
    expect(window.pinned).toBe(true);
    expect(updater.fetches).toBe(1);
    expect(result.session.items).toEqual([]);
    expect(result.autoStart.failed).toBe(false);
    expect(dialog.shown).toEqual([]);
  });

  it('START-08 OS가 종료를 청하면 위치를 저장하고 끝낸다', async () => {
    await launch();
    window.current = { left: 700, top: 300, width: 320, height: 520 };
    process.requestQuit();
    await flush();
    expect(process.exits).toBe(1);
    expect(JSON.parse(files.files.get(SETTINGS_FILE) ?? 'null')).toMatchObject({ left: 700, top: 300 });
  });

  it('UPD-01 잠자기에서 깨어났을 때 마지막 확인에서 24시간이 지났으면 바로 다시 확인한다', async () => {
    await launch();
    expect(wakes).toHaveLength(1);
    clock.setEpochMs(clock.now().toEpochMs() + 24 * 60 * 60 * 1000);
    wakes[0]?.();
    await flush();
    expect(updater.fetches).toBe(2);
  });
});
```

Run: `pnpm vitest run src/application/launch.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 4: 시작 흐름 구현**

`src/application/launch.ts`:

```ts
import { AutoStartControl } from './auto-start-control.ts';
import { AppLifecycle } from './lifecycle.ts';
import type { AppProcess } from './ports/app-process.ts';
import type { Dialog } from './ports/dialog.ts';
import type { Updater } from './ports/updater.ts';
import type { WindowController } from './ports/window-controller.ts';
import type { SettingsService } from './settings/settings-service.ts';
import { type StartupDeps, startApp } from './startup.ts';
import { TASKS_FILE } from './storage/task-repository.ts';
import type { TodoSession } from './todo-session.ts';
import { UpdateService } from './update-service.ts';
import { WindowPlacement } from './window-placement.ts';

/** 대화 상자 문구. 계획 5에서 I18N 사전(`app.title`, `error.cannotOpen`)으로 채운다. */
export interface LaunchTexts {
  appTitle: string;
  cannotOpen: string;
}

export interface LaunchDeps extends StartupDeps {
  window: WindowController;
  dialog: Dialog;
  process: AppProcess;
  updater: Updater;
  /** 잠자기에서 깨어나면 부른다. 돌려준 함수는 듣기를 멈춘다. */
  watchWake: (onWake: () => void) => () => void;
  texts: LaunchTexts;
}

export interface RunningApp {
  session: TodoSession;
  settings: SettingsService;
  placement: WindowPlacement;
  lifecycle: AppLifecycle;
  updates: UpdateService;
  autoStart: AutoStartControl;
}

export type LaunchResult = { kind: 'exited' } | ({ kind: 'running' } & RunningApp);

/**
 * 위젯을 켠다. 할 일 파일을 열지 못하면 창을 숨긴 채 대화 상자로 알리고 끝낸다(STORE-10).
 * 예상 못 한 오류도 같은 대화 상자로 알린다(개발 결정: 시작 중 오류는 거의 모두 파일 문제다).
 * 열면 창을 배치하고(WND-04~09), 업데이트 확인을 시작하고(UPD-01), OS의 종료 요청을 종료 흐름으로 잇는다(START-08).
 */
export async function launchApp(deps: LaunchDeps): Promise<LaunchResult> {
  let started: Awaited<ReturnType<typeof startApp>>;
  try {
    started = await startApp(deps);
  } catch (error) {
    started = { kind: 'cannotOpen', path: deps.files.displayPath(TASKS_FILE), detail: error instanceof Error ? error.message : String(error) };
  }

  if (started.kind === 'cannotOpen') {
    await deps.window.keepHidden().catch(() => undefined);
    await deps.dialog.showError(deps.texts.appTitle, `${deps.texts.cannotOpen}\n${started.path}\n${started.detail}`).catch(() => undefined);
    await deps.process.exit();
    return { kind: 'exited' };
  }

  const { session, settings } = started;
  const placement = new WindowPlacement({ window: deps.window, settings, timer: deps.timer });
  const lifecycle = new AppLifecycle({ session, placement, process: deps.process });
  const updates = new UpdateService({
    updater: deps.updater,
    clock: deps.clock,
    timer: deps.timer,
    appInfo: deps.appInfo,
    settings,
    prepareRestart: () => lifecycle.prepareRestart(),
  });

  await placement.apply().catch(() => undefined);
  deps.process.onQuitRequested(() => void lifecycle.quit());
  deps.watchWake(() => void updates.onWake());
  void updates.start();

  return { kind: 'running', session, settings, placement, lifecycle, updates, autoStart: new AutoStartControl(deps.autoStart) };
}
```

`placement.apply()`가 실패하면(예: 모니터 정보를 못 읽음) 창은 tauri.conf.json의 기본 크기로 뜨고, 위젯은 계속 동작한다.

Run: `pnpm vitest run src/application`
Expected: PASS

- [ ] **Step 5: 전체 검사와 커밋**

Run: `pnpm test && pnpm typecheck && pnpm spec:check`
Expected:
- PASS
- spec 검사 출력에서 START-08이 "테스트 없음" 목록에서 빠진다.

```bash
git add src/application/lifecycle.ts src/application/lifecycle.test.ts src/application/launch.ts src/application/launch.test.ts
git commit -m "feat: 시작 실패 대화 상자부터 종료 저장까지 앱 수명 흐름을 application으로 묶음"
```

---
### Task 10: composition root와 시험 화면 연결

**Files:**
- Modify: `src/main.ts`(전체), `src/presentation/App.svelte`(script와 마크업), `src/adapters/tauri/window-controller.ts`(`tauriWindowApi()` 추가)

**Interfaces:**
- Consumes: Task 3~9의 모든 adapter와 `launchApp`
- Produces: `tauriWindowApi(): TauriWindowApi`. 실행되는 앱이 실제 데이터 폴더로 할 일과 설정을 읽고 쓴다.

- [ ] **Step 1: 실제 Tauri 창 API 묶기**

`src/adapters/tauri/window-controller.ts`에 더한다:

```ts
import { availableMonitors, getCurrentWindow, primaryMonitor } from '@tauri-apps/api/window';

/** 실제 Tauri 창 API. Monitor 객체는 필요한 필드(position, size, scaleFactor, workArea)를 그대로 가진다. */
export function tauriWindowApi(): TauriWindowApi {
  const current = getCurrentWindow();
  return {
    outerPosition: () => current.outerPosition(),
    outerSize: () => current.outerSize(),
    scaleFactor: () => current.scaleFactor(),
    startDragging: () => current.startDragging(),
    onMoved: (handler) => current.onMoved(() => handler()),
    primaryMonitor,
    availableMonitors,
  };
}
```

- [ ] **Step 2: composition root**

`src/main.ts` 전체:

```ts
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { mount } from 'svelte';
import { createSystemClock } from './adapters/system/clock.ts';
import { createIdGenerator } from './adapters/system/ids.ts';
import { createSystemTimer } from './adapters/system/timer.ts';
import { watchWake } from './adapters/system/wake.ts';
import { loadPlatformInfo } from './adapters/tauri/app-info.ts';
import { createTauriAutoStart } from './adapters/tauri/auto-start.ts';
import { tauriDialog } from './adapters/tauri/dialog.ts';
import { createTauriFileStore } from './adapters/tauri/file-store.ts';
import { createTauriProcess } from './adapters/tauri/process.ts';
import { createWindowController, tauriWindowApi } from './adapters/tauri/window-controller.ts';
import { createTauriUpdater, tauriUpdaterApi } from './adapters/updater/tauri-updater.ts';
import { launchApp } from './application/launch.ts';
import App from './presentation/App.svelte';

/** composition root. adapter를 만들어 application에 넘기고, 실행되면 화면을 붙인다. 흐름은 launchApp이 정한다. */
async function main(): Promise<void> {
  const startedAt = performance.now();
  const target = document.getElementById('app');
  if (!target)
    throw new Error('#app 요소가 없어요');

  const platform = await loadPlatformInfo(invoke);
  const windowController = createWindowController({
    api: tauriWindowApi(),
    invoke,
    os: platform.os,
    pointer: window,
    requestFrame: (callback) => requestAnimationFrame(() => callback()),
  });

  const result = await launchApp({
    files: await createTauriFileStore(invoke),
    clock: createSystemClock(),
    timer: createSystemTimer(),
    newId: createIdGenerator(),
    autoStart: createTauriAutoStart(invoke),
    appInfo: { version: platform.version, isDevBuild: platform.isDevBuild },
    window: windowController,
    dialog: tauriDialog(),
    process: createTauriProcess(invoke, (event, handler) => listen(event, () => handler())),
    updater: createTauriUpdater(tauriUpdaterApi(), platform.version),
    watchWake: (onWake) => watchWake(onWake),
    // 계획 5에서 I18N 사전(app.title, error.cannotOpen)으로 바꾼다.
    texts: { appTitle: '할 일', cannotOpen: '할 일 파일을 열 수 없어요' },
  });

  if (result.kind === 'running')
    mount(App, { target, props: { app: result, windowController, startedAt } });
}

main().catch((error: unknown) => {
  // 창이 숨은 채로 남지 않게 Rust 대비책(SHOW_FALLBACK_DELAY)이 창을 띄운다. 원인은 개발자 도구에서 본다.
  console.error('TodoWidget을 시작하지 못했어요', error);
});
```

- [ ] **Step 3: 시험 화면을 실제 서비스에 잇기**

`src/presentation/App.svelte`의 `<script>`를 바꾼다(스타일과 가장자리 요소는 Task 5 그대로 둔다).

```svelte
<script lang="ts">
  // 시험 화면이다. 실제 위젯 화면(ViewModel, 4개 언어 사전)은 계획 5에서 만든다. 이 화면의 문구는 그때 사전으로 옮긴다.
  import type { RunningApp } from '../application/launch.ts';
  import { pickNotice } from '../application/notices.ts';
  import type { WindowController } from '../application/ports/window-controller.ts';
  import type { ResizeEdge } from '../domain/resize.ts';

  let { app, windowController, startedAt }: { app: RunningApp; windowController: WindowController; startedAt: number } = $props();

  /** 서비스가 바뀌었다고 알릴 때마다 올려서 다시 그린다. */
  let revision = $state(0);
  let text = $state('');
  let pinned = $state(app.settings.current.pinned);
  let autoStartOn = $state(false);
  let transparency = $state(0);

  $effect(() => {
    const bump = () => revision++;
    const stops = [app.session.onChange(bump), app.updates.onChange(bump), app.autoStart.onChange(bump)];
    void windowController.show(performance.now() - startedAt);
    void app.autoStart.isEnabled().then((on) => (autoStartOn = on));
    return () => stops.forEach((stop) => stop());
  });

  // 서비스는 Svelte 상태가 아니므로 revision을 읽어 다시 계산하게 한다.
  const items = $derived.by(() => {
    void revision;
    return app.session.items;
  });
  const notice = $derived.by(() => {
    void revision;
    return pickNotice({
      saveFailed: app.session.saveFailed,
      fileProblem: app.session.fileProblem,
      autoStartFailed: app.autoStart.failed,
      update: app.updates.state,
    });
  });

  function onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.isComposing)
      return;
    if (app.session.add(text))
      text = '';
  }

  function onHeaderPointerDown(event: PointerEvent): void {
    if (event.button === 0)
      void windowController.startDragging();
  }

  function togglePin(): void {
    pinned = !pinned;
    void app.placement.setPinned(pinned);
  }

  async function toggleAutoStart(): Promise<void> {
    autoStartOn = await app.autoStart.toggle();
  }

  function resize(edge: ResizeEdge) {
    return (event: PointerEvent): void => {
      event.preventDefault();
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
      void app.placement.resize(edge, event);
    };
  }
</script>
```

`<main class="card">` 안을 다음으로 바꾼다:

```svelte
<main class="card" style:--card-alpha={1 - transparency / 100}>
  <header role="presentation" onpointerdown={onHeaderPointerDown}>
    <h1>할 일 (시험 화면)</h1>
    <button onpointerdown={(e) => e.stopPropagation()} onclick={togglePin}>{pinned ? '📌 켬' : '📌 끔'}</button>
  </header>
  <ul>
    {#each items as item (item.id)}
      <li><button class="item" onclick={() => app.session.cycle(item.id)}>[{item.status}] {item.title}</button></li>
    {/each}
  </ul>
  {#if notice}
    <p class="notice">
      {notice.messages.join(' · ')}
      {#if notice.action}<button onclick={() => void app.updates.install()}>update.action</button>{/if}
    </p>
  {/if}
  <input bind:value={text} onkeydown={onKeydown} placeholder="할 일 추가" />
  <label>투명도 {transparency}% <input type="range" min="0" max="40" bind:value={transparency} /></label>
  <footer>
    <button onclick={() => void toggleAutoStart()}>자동 실행: {autoStartOn ? '켬' : '끔'}</button>
    <button onclick={() => void app.lifecycle.quit()}>종료</button>
  </footer>
</main>
```

스타일에 `.item { all: unset; cursor: pointer; }`와 `.notice { font-size: 12px; }`를 더한다(기존 CSS처럼 한 줄에 한 속성).

- [ ] **Step 4: 전체 검사**

Global Constraints의 검사와 `pnpm privacy:check`를 돌린다. 그다음 `pnpm tauri build --debug --no-bundle`도 돌린다.

`svelte-check --fail-on-warnings`가 접근성 경고를 내면 고친다. 클릭할 수 있는 요소는 `button`으로 둔다.

- [ ] **Step 5: 실제 앱으로 끝까지 확인 (개발자, 화면 캡처 없이)**

v1.4 형식 파일을 둔 임시 데이터 폴더로 켠다. 화면을 보지 않고 파일만으로 저장 흐름 전체를 확인한다.

```bash
DATA=$(mktemp -d)
printf '[{"id":"a","title":"보고서 초안 쓰기","status":"doing","createdAt":"2026-09-30 09:12:40","completedAt":null}]' > "$DATA/tasks.json"
TODOWIDGET_DATA_DIR="$DATA" ./src-tauri/target/debug/todo-widget &
sleep 5
ls "$DATA"; cat "$DATA/tasks.json"; cat "$DATA/settings.json"
pkill -f "target/debug/todo-widget"
```

Expected:
- `tasks.v1-backup-*.json`이 생기고 `tasks.json`이 `{"version": 2, ...}` 형식이다(STORE-12).
- `settings.json`이 있다(START-02).
- 처음 배치 뒤 이동 신호로 저장되므로 `left`·`top`이 숫자다.
- 개발 빌드이므로 자동 실행은 건드리지 않는다(START-07).

그다음 `chmod 000 "$DATA/tasks.json"`으로 같은 명령을 다시 실행한다.
- Expected: 위젯 창 없이 "할 일 파일을 열 수 없어요" 대화 상자만 뜬다.
- 이 대화 상자는 개발자가 보지 않는다. `pgrep`으로 프로세스가 살아 있는지만 확인하고 `pkill`한다.
- 끝나면 `chmod 644`로 되돌린다.
- 대화 상자를 눈으로 보는 확인은 Task 11에서 PM이 한다.

- [ ] **Step 6: 커밋**

```bash
git add src/main.ts src/presentation/App.svelte src/adapters/tauri/window-controller.ts
git commit -m "feat: composition root가 실제 adapter로 앱을 켜고 시험 화면을 실제 서비스에 이음"
```

---

### Task 11: 문서 정리, PM 직접 확인, Windows CI

**Files:**
- Modify: `docs/superpowers/specs/2026-10-03-cross-platform-design.md`
  - 5.2 port 표, 5.4 OS 분기 표, 5.5 테스트 표
  - 13장 기술 선택
  - 변경 이력
- Modify: `docs/superpowers/plans/2026-10-03-v2-domain-and-application.md` ("계획 4로 넘기는 일"에 완료 표시)
- Modify: `docs/superpowers/reports/2026-10-03-plan2-risk-check.md` ("다음 계획으로 넘기는 일"에서 계획 4 줄 완료 표시)
- Modify: `CLAUDE.md` (문서 지도에 계획 4)
- Modify: 이 계획 문서 (실행 기록)

- [ ] **Step 1: 설계 문서 고치기**

5.2 port 표를 지금 코드에 맞춘다.

| port | 위치 | 구현 |
|---|---|---|
| `FileStore` | `src/application/ports/file-store.ts` | `src/adapters/tauri/file-store.ts` → Rust `todowidget_core::files::DataDir` / `MemoryFileStore` |
| `AutoStart` | `src/application/ports/auto-start.ts` | `src/adapters/tauri/auto-start.ts` → Rust `todowidget_core::autostart` (Windows `todowidget_windows::run_key`, macOS `platform/macos.rs`) / `FakeAutoStart` |
| `Updater` | `src/application/ports/updater.ts` | `src/adapters/updater/tauri-updater.ts` / `FakeUpdater` |
| `Timer` | `src/application/ports/timer.ts` | `src/adapters/system/timer.ts` / `FakeTimer`, `ManualTimer`, `ImmediateTimer` |
| `AppInfo` | `src/application/ports/app-info.ts` | `src/adapters/tauri/app-info.ts` |
| `WindowController` | `src/application/ports/window-controller.ts` | `src/adapters/tauri/window-controller.ts` / `FakeWindowController` |
| `LocaleProvider` | `src/application/ports/locale.ts` | `src/adapters/tauri/locale.ts` |
| `Dialog` | `src/application/ports/dialog.ts` | `src/adapters/tauri/dialog.ts` / `FakeDialog` |
| `AppProcess` | `src/application/ports/app-process.ts` | `src/adapters/tauri/process.ts` / `FakeProcess` |

- 5.2 표 아래의 "`resolveDataDir`" 문장은 지운다. 그 자리에 다음 문장을 넣는다.
  > 데이터 폴더 위치는 Rust(`todowidget_core::files::resolve_data_dir`)가 정하고, `FileStore`는 파일 이름만 넘긴다. WebView는 환경 변수를 읽지 못하기 때문이다.
- 5.4 표에 두 줄을 더한다.
  - `src-tauri/crates/windows/`(레지스트리, 창 영역)
  - `src/adapters/tauri/coordinates.ts`(좌표 단위)
- 5.4 표의 기존 줄을 고친다. `src/adapters/` 중 OS별 파일의 "데이터 폴더 경로"는 "(없음 — 데이터 폴더는 Rust가 정한다)"로 바꾼다.
- 5.5 표의 adapters 줄 범위: `cargo test --workspace`(core, windows crate), `pnpm privacy:check`.
- 13장에 이 계획 맨 위 "개발 결정" 표의 아홉 줄을 옮긴다. 그리고 쓴 plugin·crate와 고른 이유를 한 줄씩 적는다.
  - single-instance: 공식 plugin이고, 세 OS를 지원한다.
  - updater·process: 공식이고, 서명을 확인한다.
  - dialog: 공식이고, OS 대화 상자를 띄운다.
  - windows-registry: Microsoft가 만들었다.
  - sys-locale: 작고, OS 언어를 BCP 47로 준다.
  - dirs: Tauri가 이미 쓴다.
- 변경 이력에 다음 줄을 더한다.
  > 2026-10-04: 계획 4 반영 — port 위치와 구현, OS 분기 위치, Rust crate 구성, 기술 선택

- [ ] **Step 2: 앞 계획 문서와 CLAUDE.md**

- 계획 3 "계획 4로 넘기는 일"의 각 줄 끝에 "— 완료 (계획 4 Task N)"을 붙인다.
- `Updater` port 나누기 검토 줄은 "— 나누지 않기로 함 (계획 4 개발 결정)"으로 표시한다.
- 계획 2 보고서 표에서 계획 4 줄도 같은 방식으로 표시한다.
- `CLAUDE.md` 문서 지도의 계획 3 줄 아래에 다음 줄을 더한다.

```markdown
| 계획 4 (OS 연결) | `docs/superpowers/plans/2026-10-04-v2-adapters-and-platform.md` |
```

```bash
pnpm spec:check
git add docs CLAUDE.md
git commit -m "docs: 계획 4 결과를 설계 문서와 앞 계획 문서에 반영함"
```

- [ ] **Step 3: PM 직접 확인 (Mac)**

개발자가 앱 번들을 만들어 PM에게 넘긴다.
- PM의 실제 데이터를 건드리지 않게 임시 데이터 폴더를 쓴다.
- **처음 켜는 순간 로그인 항목이 등록된다.** 임시 데이터 폴더에는 `settings.json`이 없으므로 처음 실행이고, release 빌드는 이때 자동 실행을 켠다(START-02). 그래서 **처음 켜기 전에** PM에게 "Mac에 로그인 항목이 잠시 생겼다가 정리 때 지워진다"고 알리고 동의를 받는다. 동의하지 않으면 이 확인을 하지 않는다. 켤 때 macOS가 "백그라운드 항목이 추가됨" 알림을 띄우는 것은 정상이다.
- 개발 빌드는 START-02·START-03의 자동 실행 단계와 MAC-08의 위치 갱신을 건너뛰므로(START-07) 이 확인은 release 빌드로 한다.
- 시험이 끝나면 자동 실행을 끄고, 옮긴 앱과 임시 폴더를 지운다(아래 정리 순서).

```bash
pnpm tauri build --bundles app
DATA=$(mktemp -d); echo "$DATA"
open -n --env TODOWIDGET_DATA_DIR="$DATA" src-tauri/target/release/bundle/macos/TodoWidget.app
```

PM에게 다음을 순서대로 확인해 달라고 한다. 결과는 이 계획의 실행 기록에 적는다.

1. **START-01, MAC-05:** 위 `open -n` 명령을 한 번 더 실행해도 위젯이 하나뿐이고, 가려져 있었다면 앞으로 온다.
2. **WND-02:** 헤더를 끌어 옮기고 1초 기다린다. 그다음 터미널에서 `pkill -9 TodoWidget`으로 강제로 끄고 다시 켜면 옮긴 자리에 뜬다.
3. **WND-03:** 여덟 방향 가장자리와 모서리를 끌면 창이 떨리지 않고 따라온다. 폭이 280보다 좁아지지 않는다. 놓은 뒤 다시 켜면 그 크기다.
4. **WND-09:** 📌를 끄면 다른 창에 가려지고, 다시 켜면 그 상태가 유지된다.
5. **WND-14, MAC-04:** 메뉴 막대 아이콘 우클릭 → 종료로 끈 뒤 다시 켜면 마지막 위치에 뜬다.
6. **STORE-10:** 먼저 시험 화면에서 할 일을 하나 더하고 위젯을 끈다(`tasks.json`이 생기게). 그다음 `chmod 000 "$DATA/tasks.json"` 후 켜면 빈 창 없이 "할 일 파일을 열 수 없어요" 대화 상자만 뜬다. 대화 상자는 다른 앱 창 뒤가 아니라 앞에 뜬다. 확인을 누르면 아무것도 남지 않는다. 끝나면 `chmod 644 "$DATA/tasks.json"`.
7. **START-02, MAC-08:** 시스템 설정 → 일반 → 로그인 항목에 TodoWidget이 처음 실행 때부터 있다. 시험 화면의 "자동 실행" 버튼으로 끄면 사라지고, 다시 켜면 생긴다. 켜 둔 채로 다음으로 간다.
8. **(외부 모니터가 있으면) 용어 "크기와 좌표":** 배율이 다른 모니터로 옮겨도 카드 폭이 같게 보인다.
9. **MAC-08 위치 갱신 (Ruling R6):** 자동 실행이 켜진 채로 앱 번들을 다른 폴더로 옮겨 켠다. 위젯을 메뉴 막대 → 종료로 먼저 끈다(떠 있으면 START-01에 따라 새로 켠 앱이 바로 끝난다).

   ```bash
   mkdir -p /tmp/TodoWidget-moved
   ditto src-tauri/target/release/bundle/macos/TodoWidget.app /tmp/TodoWidget-moved/TodoWidget.app
   open -n --env TODOWIDGET_DATA_DIR="$DATA" /tmp/TodoWidget-moved/TodoWidget.app
   ```

   시스템 설정 → 일반 → 로그인 항목, 또는 `sfltool dumpbtm`(읽기만 한다. 암호를 물을 수 있다)에서 TodoWidget 항목이 `/tmp/TodoWidget-moved/TodoWidget.app`을 가리키는지 본다. 옛 위치(`target/release/bundle/macos/`)를 가리키면 실행 기록에 적는다. 앱을 옮긴 사람의 자동 실행이 옛 위치를 가리킨다는 뜻이다(MAC-11 안내로 완화).

끝나면 이 순서로 정리한다.
1. 떠 있는 위젯(9번을 했으면 옮긴 앱)의 시험 화면에서 "자동 실행"을 끈다.
2. 시스템 설정 → 일반 → 로그인 항목에서 TodoWidget이 사라졌는지 본다. 남아 있으면 위젯을 끄고, 맨 위 `open -n` 명령(같은 `--env TODOWIDGET_DATA_DIR="$DATA"`)으로 원래 위치의 앱을 켜서 "자동 실행"을 다시 끄고 본다. `--env` 없이 켜면 PM의 실제 데이터 폴더를 쓰므로 꼭 붙인다.
3. 메뉴 막대 아이콘 우클릭 → 종료로 위젯을 끈다.
4. `rm -rf "$DATA" /tmp/TodoWidget-moved`
- `sfltool dumpbtm` 목록에는 `disabled` 상태의 기록 한 줄이 남을 수 있다. 실행하지 않는 기록이고, 이것만 지우는 명령은 다른 앱의 기록까지 모두 지우므로 지우지 않는다(계획 2 보고서 Step 6).
- 빌드 결과(`target` 안)는 로그인 항목에서 빠졌으면 그대로 두어도 된다.

- [ ] **Step 4: Windows 확인 (push는 PM 확인 뒤)**

PM에게 push를 확인받은 뒤 `git push origin feat/cross-platform`을 한다. CI의 두 OS job이 모두 통과해야 한다. Windows job에서 특히 확인할 것은 다음과 같다.
- WIN-01·WIN-03 Rust 테스트(실제 레지스트리)
- `pnpm privacy:check`
- 빌드

실패하면 고치고, 같은 방식으로 다시 push한다.

Windows 시험 설치 파일은 필요할 때 workflow_dispatch(`windows_probe`)로 만든다. 실제 Windows 확인(WIN-02, WIN-07, WIN-09)은 Windows PC가 생기면 한다(계획 2 보고서의 Windows 확인 절차).

- [ ] **Step 5: 실행 기록 쓰기**

이 문서 끝에 "실행 기록" 절을 더한다.
- 계획과 달라진 곳
- PM 확인 결과
- CI 결과
- 계획 5로 넘기는 일

계획 5로 넘기는 일은 다음 목록에서 시작한다.

- 시험 화면(`App.svelte`)을 실제 화면으로 바꾼다. 문구는 I18N 사전으로 옮긴다.
  - 대상: launch 대화 상자 문구, 메뉴 막대 메뉴 "열기"·"종료"(지금은 Rust에 한국어로 있다)
- 창 높이를 내용에 맞춰 줄인다(WND-03 "내용이 짧으면 창은 내용만큼"). `WindowPlacement`에 method를 더한다.
- `LocaleProvider`로 화면 언어를 고른다(`pickLanguage`).
- 업데이트 서명 실제 키와 endpoint 저장소 이름은 계획 6에서 바꾼다.

---

## 셀프 리뷰 기록 (계획 작성 때)

- **spec 연결:** STORE-02·18·20, START-01·08, WND-02·03·09·14, UPD-02·08, WIN-01·03·04, MAC-01·08, PRIV-01에 Task가 있다.
- **이 계획 밖으로 넘기는 것:**
  - 직접 확인 항목 중 WIN-02·07·09는 Windows PC가 필요하다.
  - MAC-02·03·06·07은 계획 2에서 이미 봤고, 계획 5에서 실제 화면으로 다시 본다.
- **타입 일치:** Task 5의 `WindowController`를 Task 6·9·10이 같은 이름으로 쓴다. Task 8의 port를 Task 9·10이 쓴다.
- **확인할 외부 API 이름:** 다음 API는 이름이 바뀌었을 수 있다. 해당 Step에 "문서로 확인하고 맞춘다"고 적었고, 동작은 계획에 고정했다.
  - windows-registry 0.6
  - objc2-app-kit 0.3
  - Tauri plugin JS 버전
