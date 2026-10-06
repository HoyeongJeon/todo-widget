# v2.0 화면 구현 계획 (계획 5/6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 계획 2의 시험 화면을 PM이 승인한 시안(`docs/design/widget-mockup.html`)과 같은 실제 위젯 화면으로 바꾼다.
- 4개 언어 사전과 화면 언어 고르기
- 테마(색, 글꼴)
- 화면 상태를 드는 ViewModel과 얇은 Svelte 컴포넌트
- 창 높이를 내용에 맞추기, 메뉴·확인 판이 창보다 크면 잠깐 늘리기
- 메뉴 막대 문구·앱 아이콘·메뉴 막대 아이콘
- 앞 계획에서 넘어온 정리
- PERF-01·PERF-03 다시 재기와 PM 직접 확인

**Architecture:**
- **ViewModel(`src/presentation/*.svelte.ts`):** Svelte 5 runes(`$state`)를 쓰는 class다. 동작 규칙은 여기와 순수 TS 도우미(`src/presentation/{input,layout,menu}/`)에 두고 Vitest(node 환경)로 테스트한다. application 서비스는 constructor로 받는다(`RunningApp`).
- **컴포넌트(`src/presentation/components/*.svelte`):** 얇다. 그리기, DOM 이벤트 연결, 크기 재기만 한다. 키보드·IME·붙여넣기·포커스처럼 DOM 이벤트 연결이 핵심인 것만 `@testing-library/svelte` + `happy-dom`으로 테스트한다.
- **창 크기:** application의 `WindowPlacement`가 창 높이를 내용에 맞추고(WND-03), 메뉴가 열린 동안 창을 늘렸다가 되돌린다. 바꾸기는 하나씩 차례로 한다.
- **문구:** 화면, OS 대화 상자, 메뉴 막대 메뉴의 글은 모두 사전에서 꺼낸다. Rust에는 화면 언어 문구를 두지 않는다.

**Tech Stack:**
- Svelte 5.57.1(runes), TypeScript 5.9, Vite 8.3.2, Vitest 5.0.3
- 새 dev 의존성: `@testing-library/svelte` 5.4.2, `happy-dom` 20.14.5
- Tauri 2.12.1(`include_image!`, tray `MenuItem::set_text`), Tauri CLI 2.12.1(`tauri icon`이 SVG를 바로 읽는다)

**Spec:**
- 기준: `spec/` 전체. 특히 `behavior/i18n.md`, `list.md`, `input.md`, `window.md`(WND-01·03·09·10~13), `startup.md`(START-04·05·08·09), `update.md`(UPD-03·04·07), `platform/macos.md`(MAC-02~07·09), `checklists/`.
- 설계 문서: `docs/superpowers/specs/2026-10-03-cross-platform-design.md` 5장(구조), 6장(겉모양, 2026-10-06 PM 결정), 7장(다국어), 11장(가벼움).
- 화면 모양: `docs/design/widget-mockup.html`(PM 승인 시안. 화면은 이것과 같아야 한다), `docs/design/v1.4-visual-reference.md`(v1.4 값과 출처).
- 앞 계획에서 넘어온 일:
  - 계획 4: `docs/superpowers/plans/2026-10-04-v2-adapters-and-platform.md`의 "계획 5로 넘기는 일"
  - 계획 2: `docs/superpowers/reports/2026-10-03-plan2-risk-check.md`의 "다음 계획으로 넘기는 일"에서 계획 5 줄

## PM 결정 (2026-10-06)

계획을 쓰며 개발이 정하지 않고 PM에게 물은 것이다. 제품 동작이 바뀌거나, PM 일이 늘거나, spec을 바꾸거나, 밖으로 나가는 일이기 때문이다. PM이 2026-10-06에 다섯 가지 모두 추천대로 정했다. 이유는 물을 때 적은 그대로 남긴다.

| # | 정한 것 | 결정 | 이유와 포기하는 것 | 닿는 곳 |
|---|---|---|---|---|
| P1 | **macOS에서 다른 앱을 쓰다가 위젯을 처음 누를 때 바로 동작하게 할지** (Tauri `acceptFirstMouse`) | **결정: 켠다** (추천대로) | 지금 설정(꺼짐)에서는 위젯이 비활성일 때 첫 클릭이 창을 앞으로 가져오기만 하고 버튼에 닿지 않는다. 동그라미나 📌를 두 번 눌러야 한다. v1.4(Windows)는 한 번에 된다. 켜면 잘못 누른 첫 클릭도 동작으로 이어지지만, 위젯은 작고 늘 떠 있는 도구라 한 번에 되는 쪽이 맞다고 본다 | Task 12 Step 7, Task 15 확인 26번 |
| P2 | **세로 간격을 v1.4 값으로 할지 시안 화면 값으로 할지** | **PM 재확인 2026-10-06: v1.4 값** (처음 결정은 같은 날 v1.4 값 12px. 리뷰 I2에서 처음 근거 측정이 틀린 것이 드러나 실제 측정으로 다시 물었다) | 처음에 적은 "시안 9px, 위젯 12px"은 틀렸다. 끝낸 일 섹션과 할 일 제목 줄 사이는 시안과 위젯 모두 9px이다(제목 줄의 -3 margin이 상자를 끌어올린다). 같은 브라우저로 잰 실제 차이는 두 곳이다. (1) 헤더 바로 아래: 위젯이 시안보다 4px 넓다(헤더 → 끝낸 일 12 vs 8, 헤더 → 할 일 제목 줄 13 vs 9, 헤더 → 빈 목록 안내 18 vs 14). 위젯 값이 v1.4(WPF는 margin을 더한다)와 같다. (2) 줄 사이: 위젯 2px(줄 묶음을 flex로 쌓아 margin이 겹치지 않음, D16) vs 시안 1px. 2px이 v1.4 값이다. 그 밖에 1px 차이(제목 줄 → 첫 줄 4 vs 3, 끝 줄 → 안내 줄 9 vs 8)도 v1.4 값을 따른다. 설계 문서 6장 "간격은 v1.4 값"대로 두 곳 모두 v1.4 값을 쓴다 | Task 12 `Header.svelte`·`TaskSections.svelte` CSS(그대로), Task 15 확인 2번 |
| P3 | **spec I18N-02에 자동 검사의 예외를 한 줄 더할지** (spec 변경) | **결정: 더한다** (추천대로, spec 변경 승인) | 지금 문장은 "문자열 리터럴은 사전 키가 아니면 검사에 걸린다"이다. 그대로 하면 `'keydown'`, `'row doing'` 같은 기술 문자열도 모두 걸린다. 계획 1이 "예외 목록(CSS 클래스 등)은 계획 5에서 정한다"고 미뤄 둔 것을 이 계획 개발 결정 D8로 정했고, spec에 그 범위를 한 줄로 적는다. 동작은 바뀌지 않는다. 변경 이력에 "PM 승인 2026-10-06"을 적는다 | Task 13 Step 5 |
| P4 | **PM 직접 확인 시간** | **결정: 약 60분, 한 번에** (추천대로) | 화면을 처음 실제로 보는 확인이라 항목이 많다(Task 15, 27개). 시스템 설정에서 선호 언어 순서를 잠깐 바꿔야 하고(I18N-06·07), 자동 실행 체크를 확인할 때 로그인 항목이 잠깐 생긴다(START-04). 둘 다 확인 뒤 되돌린다 | Task 15 |
| P5 | **push** (Windows CI) | **결정: Task 15에서 PM 확인 뒤** (추천대로) | 밖으로 나가는 일이다. Windows CI에서 앱 crate 빌드, 레지스트리 테스트, 화면 테스트를 본다. push 직전에 다시 확인받는다 | Task 15 Step 5 |
| P6 | **투명도 휠 방향** (macOS "자연스러운 스크롤"에서 손으로 위로 굴리면 `deltaY`가 양수가 된다, 리뷰 I4-3) | **결정 (2026-10-06): 손가락·휠의 실제 방향.** 실제로 위로 굴리면 더 투명하게. OS의 스크롤 방향 설정과 관계없고 두 OS에서 같다 | spec WND-12의 "위로 굴리면 더 투명하게"를 실제 방향으로 읽는다. WebKit은 `webkitDirectionInvertedFromDevice`로 뒤집힌 것을 알려 주므로 그 값으로 실제 방향을 되찾는다. WebView2는 휠 방향을 뒤집지 않는다. spec WND-12에 한 문장을 더한다 | Task 7 Step 0(spec), `wheel-steps.ts`, `TransparencySlider.svelte`, Task 15 확인 10번 |

새로 설치할 도구는 없다. 앱 아이콘과 메뉴 막대 아이콘 PNG는 이미 있는 Tauri CLI(`pnpm tauri icon`)가 SVG에서 바로 만든다(이 Mac에는 `rsvg-convert`·`magick`이 없다. 2026-10-06 확인).

## 범위

| 넣는 것 | Task |
|---|---|
| 4개 언어 사전, 복수 규칙, 켤 때 화면 언어 고르기 (I18N-01·03·04·05) | 1 |
| 테마: 시안의 색 CSS 변수, OS·언어별 글꼴 (I18N-06, MAC-09, WIN-08) | 2 |
| 창 높이를 내용에 맞추기, 메뉴용 임시 늘리기, 창 위아래 화면 공간 (WND-03·10·14) | 3 |
| 종료 다시 시도, 자동 실행 등록을 기다리지 않는 시작 (START-08, PERF-01) | 4 |
| Rust 정리: 대비책이 띄운 뒤의 STORE-10 빈 창(R14), 레지스트리 읽기 권한 | 5 |
| 메뉴 막대 문구를 사전으로, 앱 아이콘·메뉴 막대 template 아이콘 (MAC-03·04) | 6 |
| 화면 규칙 도우미: Enter·붙여넣기·섹션 높이·메뉴 위치·키보드 이동 | 7 |
| 창·⋯ 메뉴 ViewModel (투명도 미리 보기, 자동 실행 체크, 창 늘리기) | 8 |
| 위젯 ViewModel (목록, 헤더, 안내 줄, 이름 바꾸기, 우클릭 메뉴, 초기화, 📌) | 9 |
| 컴포넌트 테스트 도구, 입력칸, 할 일 줄 (IME, 붙여넣기, 포커스) | 10 |
| 메뉴, ⋯ 메뉴, 우클릭 메뉴, 투명도 슬라이더, 초기화 확인 판 | 11 |
| 화면 조립: 헤더, 섹션, 안내 줄, 크기 조절 가장자리, composition root | 12 |
| I18N-02 하드코딩 문구 자동 검사, `invoke('plugin:…')` 네트워크 우회 검사 | 13 |
| 설계 문서·앞 계획 문서·CLAUDE.md 정리 | 14 |
| PM 직접 확인(macOS release), PERF-01·03·04 다시 재기, CI, 실행 기록 | 15 |

| 넣지 않는 것 | 어디서 |
|---|---|
| 업데이트 서명 실제 키, endpoint 저장소 이름, `updater:default` 좁히기, 설치 중 확인 문제, 네트워크 crate 목록 넓히기 | 계획 6 |
| Windows PC 확인(WIN-02·07·08·09, 혼합 배율 첫 크기 R12) | 계획 6 (Windows PC가 생기면) |
| `probe.rs` 정리, 쓰지 않는 crate-type 정리 | 계획 6 |
| PERF-06(로그인 직후 자동 실행) | 계획 6. 재시동하면 로그인 항목이 실제 데이터 폴더로 위젯을 켜므로 시험 폴더로는 잴 수 없다 |
| UPD-04 실제 설치, UPD-09 | 계획 6 (출시된 이전 버전이 있어야 한다) |

## 이 계획이 다루는 spec ID

자동 테스트 ID는 테스트 이름 앞에 ID를 적는다. 직접 확인 ID는 Task 15에서 PM과 macOS release 빌드로 본다.

| 문서 | 자동 테스트 (Task) | 직접 확인 (Task 15 번호) |
|---|---|---|
| i18n | I18N-01 (1), I18N-02 (13, 6), I18N-03 (1), I18N-04 (1), I18N-05 (1) | I18N-06 (22), I18N-07 (23) |
| list | LIST-01·06·07·08·09·10 (9), LIST-13·14·15 (7) | LIST-11 (4), LIST-12 (5), LIST-16 (7) |
| input | INPUT-01·04·10 (10), INPUT-02·03·07 (9, 10), INPUT-05 (7, 10), INPUT-11 (9, 10, 12), INPUT-12 (7, 9, 11), INPUT-13·15 (9, 10), INPUT-14 (7, 9, 10), INPUT-16 (7, 10), INPUT-17 (9), INPUT-18 (9, 11), INPUT-19 (7, 8, 9, 11), INPUT-20 (9) | INPUT-06 (3), INPUT-12·13·16·17 (12), INPUT-18·19 (13) |
| window | WND-02 (3, 9), WND-03 (3, 8, 9), WND-09 (9), WND-10 (3, 7, 8, 9, 11), WND-11 (8), WND-12 (7, 8, 11), WND-14 (3) | WND-01 (2), WND-02 (14), WND-03 (8), WND-10 (9), WND-12 (10), WND-09 (15), WND-13 (11) |
| startup | START-02·06 (4), START-04 (8), START-05 (9), START-08 (4, 8), START-09 (9, 12) | START-01 (19), START-04 (16), START-08 (27), START-09 (17) |
| update | UPD-03·07 (9), UPD-04 (9, 12) | — |
| storage | STORE-10 (5, Rust) | STORE-10 (18) |
| macos | MAC-04 (6) | MAC-02 (19), MAC-03 (20), MAC-04 (21), MAC-05 (19), MAC-06 (24), MAC-07 (25), MAC-09 (22), MAC-12 (1) |
| windows | WIN-03 (5, Windows CI) | — |
| principles | PRIV-01 (13), PERF-01 (4) | PERF-01 (1, 측정), PERF-02 (6), PERF-03·04 (측정), PERF-07 (20) |

`pnpm spec:check:strict`에서 이 계획이 끝나면 남는 "테스트 없는 자동 테스트 항목"은 PERF-05, REL-02·03·05·10뿐이다(모두 계획 6).

## 개발 결정 (이 계획에서 정함. Task 14에서 설계 문서 13장으로 옮긴다)

D1~D7은 controller가 계획을 맡기며 정한 것이고, D8부터는 계획을 쓰며 정한 내부 결정이다. 모두 제품에 드러나지 않고 나중에 바꿀 수 있다.

| # | 결정 | 이유 | 틀렸을 때 비용 |
|---|---|---|---|
| D1 | **ViewModel은 Svelte 5 runes를 쓰는 class이고 `.svelte.ts` 파일로 `src/presentation/`에 둔다.** 동작 규칙은 ViewModel과 순수 TS 도우미에 두고 Vitest node 환경으로 테스트한다. 서비스는 `RunningApp`으로 받는다 | 서비스 변경 알림(`onChange`)을 `$state` 하나로 받아 getter가 다시 계산되게 하면, 화면 상태를 따로 복사하지 않아도 된다. 설계 문서 5.1의 "ViewModel은 Svelte에 의존하지 않는다"는 이 결정으로 바뀐다(Task 14). runes는 컴파일러 문법이라 ViewModel 코드에는 `svelte` import가 없다 | View 프레임워크를 바꾸면 `$state` 몇 줄을 다른 알림 방식으로 바꿔야 한다 |
| D2 | **컴포넌트 테스트는 DOM 이벤트 연결이 핵심인 것만** `@testing-library/svelte` + `happy-dom`으로 한다(파일 첫 줄 `// @vitest-environment happy-dom`) | 키보드·IME·붙여넣기·포커스는 이벤트를 실제로 흘려야 확인된다. 나머지는 ViewModel 테스트가 더 빠르고 덜 깨진다 | 컴포넌트 배선 실수가 PM 확인에서야 보일 수 있다 |
| D3 | **Enter는 `isComposing`이거나 `keyCode === 229`이면 쓰지 않는다.** 확정 뒤 OS가 다시 보내는 Enter나 사용자가 다시 누른 Enter로 정확히 한 번 추가·저장한다. 판단은 순수 함수 `isCommitEnter`다. 이름 바꾸기 칸은 `beforeinput`의 줄바꿈 입력도 막는다 | INPUT-05는 어느 방식이든 바깥 결과가 같으면 된다. **이 규칙 그대로는 검증된 적이 없다.** 계획 2에서 Mac의 한글·병음으로 통과한 것은 `isComposing`만 보는 규칙이다(커밋 `9ee7d6e` 시험 화면). keyCode 229도 보는 것은 병음처럼 조합을 끝내는 Enter가 `isComposing: false, keyCode: 229`로 오는 경우에 할 일이 잘못 추가되지 않게 하려는 것이다. 반대로 한글처럼 조합을 끝내는 Enter가 그 모양으로 한 번만 오면 Enter를 두 번 눌러야 한다. 그래서 Task 15 확인 3번에서 (a) 한글 Enter 한 번 추가, (b) 병음 확정 Enter는 추가하지 않음을 따로 본다. (a)가 실패하면 `isComposing`만 보는 계획 2 규칙으로 돌리고 controller에게 알린다. (a)와 (b)가 서로 부딪히면 PM에게 묻는다 | (a)가 실패하면 규칙과 테스트를 한 번 고친다(Task 7 `enter-key.ts`) |
| D4 | **메뉴 막대 문구는 Rust 명령 `set_tray_labels { open, quit }`로 JS가 켤 때 넘긴다.** Rust 기본값은 영어 "Open"/"Quit"이고 곧바로 덮어쓴다 | Rust에 사전을 두지 않는다(I18N-02). 기본값은 JS가 실패해도 메뉴가 비지 않게 하려는 것이다 | 켜고 몇 ms 동안 영어로 보일 수 있다(메뉴를 열 틈이 없다) |
| D5 | **창 높이는 카드 `ResizeObserver` → `WindowPlacement.fitToContent(높이)`로 맞춘다.** 최대 높이로 제한하고, 크기를 끄는 동안은 무시한다. 메뉴용 임시 늘리기는 `expand(raise, height)`·`restore()`이고 저장하지 않는다 | WND-03 "내용이 짧으면 창은 내용만큼". v1.4 `SizeToContent`와 같은 동작을 창 밖에서 맞춘다 | 맞추는 IPC가 내용이 바뀔 때마다 한 번 더 간다 |
| D6 | **⋯ 메뉴와 우클릭 메뉴는 같은 `Menu` 컴포넌트다.** 방향키로 고를 수 있는 항목 사이를 돌고(v1.4 T:166), Enter·Space로 고르고, Esc로 닫는다. 우클릭 메뉴는 판 왼쪽 위가 커서 자리다 | v1.4와 같은 카드 모양·같은 조작. 설계 문서 6장 | — |
| D7 | **아이콘 글리프는 시안의 SVG symbol을 그대로 `Icon.svelte`로 옮긴다** | 설계 문서 6장: Segoe 글리프를 같은 모양의 SVG로 | — |
| D8 | **I18N-02 자동 검사 규칙과 예외.** presentation의 `.svelte`·`.ts`에서 (1) 템플릿 글자 중 글자(문자)가 있는 것, (2) `title`·`placeholder`·`aria-label`·`alt` 속성의 고정 글, (3) 문구처럼 보이는 문자열 리터럴을 찾는다. 예외: 글자 없는 것(⋯ · % + 숫자), 공백 없는 기술 낱말(`'keydown'`, `'app.title'`, `'text/plain'`), 소문자 CSS 클래스 목록(`'row doing'`), 주석, `<style>`, `console.*(…)`·`new Error(…)`의 첫 인자(개발자용), 사전 파일 네 개 | 계획 1이 미뤄 둔 예외 목록이다. 화면에 보일 글은 놓치지 않고 기술 문자열은 통과시킨다. 글자가 ASCII가 아니면(한글·한자·움라우트) 늘 문구로 본다 | 소문자 영어 한 낱말 문구(예: `'show'`)는 놓친다. 체크리스트 I18N-07에서 본다 |
| D9 | **창 높이 바꾸기는 `WindowPlacement` 안에서 하나씩 차례로 한다.** 늘린 동안 생긴 이동 신호로는 위치를 저장하지 않고, 종료할 때는 먼저 되돌린 뒤 위치를 저장한다 | 맞추기·늘리기·되돌리기가 겹치면 창 높이가 뒤섞인다. 늘린 동안의 창 위쪽은 사용자의 위치가 아니다(WND-14) | — |
| D10 | **늘린 투명 부분을 누르면 메뉴를 닫는다.** macOS는 alpha 0 픽셀의 클릭이 뒤 앱으로 넘어가므로 창이 포커스를 잃는 것(`window` `blur`)으로 닫는다. Windows처럼 클릭이 창에 오면 메뉴 아래에 깐 투명 막(`backdrop`)이 받아 닫는다. 확인 판도 `blur`로 닫는다(취소) | 계획 4 PM 확인에서 macOS의 alpha 0 클릭 통과를 확인했다. 두 길 모두 "바깥을 누르면 닫힘"(v1.4 ContextMenu)과 같다. 같은 까닭으로 창이 포커스를 잃으면 열린 이름 바꾸기 칸에도 blur가 와서 이름이 저장된다(INPUT-14의 "다른 곳 클릭"을 앱 전환까지 넓힌 것. 해가 없어 동작은 그대로 두고 Task 15 확인 12번에서 본다) | 다른 앱으로 넘어가면 열린 메뉴·확인 판이 닫힌다(취소라 잃는 것은 없다) |
| D11 | **메뉴가 위로 열려 창 위로 나가면 창 위쪽을 올리고, 내용을 그만큼 아래로 민다(`lift`).** 카드는 화면에서 제자리다 | WND-10 "아래 공간이 모자라면 ⋯ 버튼 위로". ⋯ 버튼은 창 맨 위에 있어 위로 뜬 메뉴는 창 밖이다 | 위로 열 때 한 프레임 깜빡일 수 있다(Task 15 확인 9번) |
| D12 | **켤 때 자동 실행 등록·경로 갱신은 기다리지 않는다.** 실패는 그대로 조용히 넘어간다 | PERF-01. macOS `SMAppService` 등록은 시스템 서비스를 거친다. 결과를 화면이 쓰지 않는다(메뉴를 열 때 다시 읽는다, START-04) | — |
| D13 | **메뉴 막대 아이콘은 36×36 PNG 한 장이다.** tray-icon 0.25가 높이를 늘 18pt로 맞추므로 @2x 해상도가 된다 | tray-icon은 이미지 한 장만 받는다(`platform_impl/macos/mod.rs` 281줄). @1x 화면에서는 OS가 줄여 그린다 | @1x 외부 모니터에서 아주 조금 흐릴 수 있다 |
| D14 | **아이콘 PNG·icns·ico는 저장소의 SVG 원본에서 `pnpm tauri icon`으로 만든다** | 새 도구가 필요 없다. 원본이 저장소에 있어 다시 만들 수 있다 | — |
| D15 | **글꼴 목록은 `theme.css`의 CSS 변수(`--font-macos-ko` 등 6개)로 두고, TS는 OS·언어로 변수 이름만 고른다** | 글꼴 이름이 한 곳에 있다. 글꼴 이름("Apple SD Gothic Neo")이 I18N-02 검사에 걸리지 않는다 | — |
| D16 | **섹션 높이는 DOM으로 재고 나누기는 domain `allocateSectionHeights`가 한다.** 섹션은 flex로 쌓는다 | LIST-13~15는 v1.4 `SectionLayout`과 같은 배분이다. 최소 높이는 실제 첫 줄 높이로 잰다(긴 제목 첫 줄도 맞다). 섹션과 줄 묶음(`.rows`)을 모두 flex column으로 쌓아 margin이 겹치지 않게 한다. 그래서 `offsetHeight`가 줄의 위아래 margin까지 포함해 측정이 정확하고, 줄 사이 간격도 v1.4와 같은 2px이다(리뷰 I1). 카드에는 최대 높이를 걸고 섹션 영역은 `overflow: hidden`이라, 최소 높이 합이 넘쳐도 입력칸은 잘리지 않고 섹션이 잘린다(v1.4 DockPanel과 같다, 리뷰 I3) | — |
| D17 | **이름 바꾸기 칸은 `textarea`다.** 높이는 내용에 맞추고, 줄바꿈 입력은 막는다 | 긴 제목이 칸 안에서 줄을 바꿔 전부 보인다(LIST-11, v1.4 TextBox Wrap). `input`은 한 줄로 잘린다 | — |
| D18 | **독일어 `notice.newerFile`은 짧게 번역한다**("Datei aus neuerer Version. Bitte aktualisieren.") | 실패 안내와 업데이트 버튼이 함께 붙어도 최소 폭 280에서 두 줄 안에 들어가게(안내 줄 정의). 시안의 독일어 문장은 예시였다 | 원어민 검토 때 바뀔 수 있다 |
| D19 | **처음 창을 보이기 전 크기는 마운트 직후 바로 잰다.** 그 뒤의 변화는 `ResizeObserver`로 받는다 | 숨긴 창에서는 `requestAnimationFrame`처럼 `ResizeObserver`도 오지 않을 수 있다. 오지 않으면 3초 대비책이 창을 띄워 PERF-01을 놓친다 | — |
| D20 | **`keep_hidden`은 대비책이 이미 창을 띄운 뒤에도 창을 숨기고 숨김으로 정한다**(`ShowGate::hide`) | R14: 시작이 3초를 넘긴 뒤 STORE-10이면 대화 상자 뒤에 빈 창이 남았다. 대화 상자 뒤에는 곧 끝나므로 숨김이 늘 맞다 | — |
| D21 | **테스트용 `RunningApp`은 `src/testing/test-app.ts`의 `createTestApp()`이 가짜 port로 만든다** | ViewModel·컴포넌트 테스트가 같은 준비를 쓴다. `launchApp`을 쓰면 업데이트 확인과 읽기 다시 시도 타이머가 끼어든다 | — |
| D22 | **실패 보고는 `Report(action, error)`다.** action은 짧은 영어 낱말(`'pin'`, `'quit'`), 기본 구현은 `console.error` | 누르고 잊는 호출이 처리하지 않은 거부로 남지 않게 한다. 개발자 도구에서만 본다 | — |
| D23 | **투명도 슬라이더는 `input type="range"`에 시안 모양을 입힌다** | 클릭한 자리로 바로 가기(v1.4 IsMoveToPointEnabled), 끌기, 키보드가 기본으로 된다. WebKit·Chromium 모두 `::-webkit-slider-*`로 꾸민다 | — |
| D24 | **PM 확인 데이터 폴더에는 `settings.json`을 미리 만든다** | 처음 실행이 아니게 되어 release 빌드가 로그인 항목을 저절로 등록하지 않는다(START-02). 계획 4 확인 중 재시동 사고(실제 폴더 사용)를 막는다. 확인 스크립트는 앱을 켜는 모든 명령(`start`, `again`, `probe`)이 먼저 이 파일을 만든다 | — |
| D25 | **입력칸과 이름 바꾸기 칸에서는 OS 기본 우클릭 메뉴(잘라내기·복사·붙여넣기)를 막지 않는다.** 이름 바꾸기 중인 줄은 우클릭해도 할 일 메뉴를 열지 않는다. 그 밖의 곳은 WebView 기본 메뉴(새로 고침 등)를 막는다 | v1.4 TextBox에는 기본 잘라내기·복사·붙여넣기 메뉴가 있었다(controller 판단, 리뷰 M5) | — |
| D26 | **투명도 휠은 칸을 이렇게 센다.** (1) `deltaY`가 0이면 칸이 아니다. (2) 줄·쪽 단위(`deltaMode` 1·2)는 이벤트 하나가 한 칸이다. (3) 옛 값 `wheelDeltaY`가 0이 아니고 120의 배수이면 마우스 휠의 칸이고, `wheelDeltaY` 절댓값 ÷ 120이 칸 수다. (4) 그 밖의 픽셀 단위(트랙패드, Magic Mouse)는 `deltaY`를 쌓아 절댓값 50px마다 한 칸으로 센다. 한 칸이 2%다. 방향은 실제 손가락·휠 방향이고(P6), WebKit의 `webkitDirectionInvertedFromDevice`로 되찾는다. 칸 수는 `wheelDeltaY`로, 방향은 `deltaY`로 정한다. 계산은 순수 TS `WheelSteps`(Task 7)가 한다 | 트랙패드 가로 쓸기·Shift+휠이 "덜 투명하게"로 읽히지 않고, 트랙패드 쓸기 한 번에 0→40%가 끝까지 가지 않는다(리뷰 I4). Chromium(WebView2)과 WebKit은 끊어지는 마우스 휠 한 칸에 `wheelDeltaY`를 ±120으로 준다. 그래서 Windows 마우스의 `deltaY`가 100이든 125든, 화면 배율이 얼마든 한 칸이 정확히 2%다(controller 판단) | 트랙패드 이벤트의 `wheelDeltaY`가 우연히 120의 배수이면 한 칸으로 센다. 드물고 영향이 작다 |
| D27 | **메뉴 자리를 정하는 동안 메뉴가 닫히면 늦게 온 창 늘리기를 버린다.** `WindowViewModel`이 popup 세대 번호(`popupToken`)를 두고, `clearPopup`이 번호를 올린다. 메뉴는 자리를 정하기 시작할 때 번호를 받아 `fitPopup`에 넘긴다 | 화면 공간을 읽는 IPC를 기다리는 사이 닫히면, 되돌릴 사람이 없는 늘린 창과 `lift`가 남아 창 맞추기와 위치 저장이 멈춘다(리뷰 M1) | — |

## 파일 구조

| 파일 | 책임 |
|---|---|
| `src/presentation/i18n/keys.ts` | 문구 키 목록(`MESSAGE_KEYS`), `MessageKey`, `Dictionary` 타입 |
| `src/presentation/i18n/{ko,en,de,zh-hans}.ts` | 언어별 사전 |
| `src/presentation/i18n/translator.ts` | `createTranslator(language)` → `Translate`, `DICTIONARIES` |
| `src/application/language.ts` | `screenLanguage(locale)`: `LocaleProvider` + `pickLanguage` |
| `src/presentation/theme/theme.css` | 시안 색 CSS 변수, 글꼴 변수, 전역 바탕(투명), 스크롤바 |
| `src/presentation/theme/fonts.ts` | `fontStack(platform, language)` → `var(--font-…)` |
| `src/domain/window-geometry.ts` (수정) | `SHADOW_MARGIN`, `spaceAround()` |
| `src/application/ports/window-controller.ts` (수정) | `setHeight(height, raise)` |
| `src/application/window-placement.ts` (수정) | `maxHeight`, `height`, `fitToContent`, `expand`, `restore`, `roomAround`, `show`, `startMove` |
| `src/adapters/tauri/window-controller.ts` (수정) | `setHeight` 구현 |
| `src/adapters/tauri/tray.ts` | `setTrayLabels(invoke, labels)` |
| `src-tauri/icons/source/{app-icon,tray-template}.svg` | 아이콘 원본 |
| `src/presentation/input/enter-key.ts` | `isCommitEnter` (D3) |
| `src/presentation/input/rename-paste.ts` | `joinLines`, `insertText` (INPUT-16) |
| `src/presentation/layout/section-heights.ts` | `sectionListHeights` (LIST-13~15) |
| `src/presentation/menu/menu-placement.ts` | `placeMoreMenu`, `placeContextMenu`, `popupExtent` (WND-10) |
| `src/presentation/menu/menu-navigation.ts` | `moveHighlight` (D6) |
| `src/presentation/report.ts` | `Report`, `reportToConsole` (D22) |
| `src/presentation/window-view-model.svelte.ts` | 창 높이·크기 조절·메뉴용 늘리기 상태 |
| `src/presentation/more-menu-view-model.svelte.ts` | ⋯ 메뉴: 자동 실행 체크, 투명도 미리 보기, 초기화·종료 |
| `src/presentation/widget-view-model.svelte.ts` | 위젯 전체: 목록, 헤더, 안내 줄, 이름 바꾸기, 우클릭 메뉴, 초기화, 📌, 접기 |
| `src/testing/test-app.ts` | `createTestApp()` (D21) |
| `src/presentation/components/Icon.svelte` | 시안 SVG 글리프 6개 |
| `src/presentation/components/AddInput.svelte` | 입력칸 (INPUT-01~05·07·10) |
| `src/presentation/components/TaskRow.svelte` | 할 일 줄, 상태 동그라미, 이름 바꾸기 칸 |
| `src/presentation/components/Menu.svelte` | 메뉴 판 공통 (D6) |
| `src/presentation/components/MoreMenu.svelte` | ⋯ 메뉴 (WND-10) |
| `src/presentation/components/ContextMenu.svelte` | 우클릭 메뉴 (INPUT-12) |
| `src/presentation/components/TransparencySlider.svelte` | 투명도 줄 (WND-11·12) |
| `src/presentation/components/ResetConfirm.svelte` | 초기화 확인 판 (INPUT-18) |
| `src/presentation/components/Header.svelte` | 헤더 (WND-02·09·10, LIST-06) |
| `src/presentation/components/TaskSections.svelte` | 끝낸 일·할 일 섹션, 빈 목록, 섹션 높이 (LIST-01·07·08·10·13~16) |
| `src/presentation/components/NoticeLine.svelte` | 안내 줄 (START-09, UPD-03·04·07) |
| `src/presentation/components/ResizeEdges.svelte` | 크기 조절 가장자리 여덟 개 (WND-03) |
| `src/presentation/App.svelte` (다시 씀) | 화면 조립, 카드 크기 재기, 메뉴 자리, 창 포커스 잃음 |
| `src/main.ts` (수정) | 화면 언어, 글꼴, 메뉴 막대 문구, 대화 상자 문구, ViewModel 만들기 |
| `tools/architecture/copy.ts` | I18N-02 검사 (D8) |

## Global Constraints

- **커밋 메시지:** `feat:`·`test:`·`refactor:`·`chore:`·`ci:`·`docs:`·`fix:` 뒤에 한국어로 쓴다. `Co-Authored-By` 줄은 넣지 않는다.
- **push 금지.** push는 Task 15에서 PM 확인을 받은 뒤에만 한다. 릴리스는 하지 않는다.
- **pnpm:** `corepack enable` 후 pnpm 10.33.2를 쓴다(`package.json`의 `packageManager`). `pnpm-lock.yaml`의 `lockfileVersion`은 `'9.0'`이어야 한다. 의존성을 더한 뒤 반드시 확인한다.
- **npm 의존성:** 이 계획에서 더하는 것은 dev 의존성 `@testing-library/svelte` 5.4.2와 `happy-dom` 20.14.5뿐이고, 버전은 정확히 고정(`-E`)한다.
- **Rust 의존성:** 이 계획에서 더하는 crate와 feature는 없다. 메뉴 막대 아이콘은 `tauri::include_image!`(컴파일 때 PNG를 읽는다)를 쓴다.
- **TypeScript 문법:** 지울 수 있는 문법만 쓴다(`enum`, constructor parameter property, `namespace` 금지). import에 `.ts` 확장자를 붙이고(`.svelte.ts`도 `.svelte.ts`로), private 상태는 `#` 필드로 둔다.
- **층 규칙(설계 문서 5.1, `tools/architecture/rules.ts`):**
  - `@tauri-apps/*`는 `src/adapters/`와 `src/main.ts`에서만 쓴다.
  - 네트워크와 `@tauri-apps/plugin-updater`는 `src/adapters/updater/`에서만 쓴다.
  - domain·application은 바깥 패키지를 쓰지 않는다. presentation은 `svelte`를 쓸 수 있다.
  - `src/testing/`은 테스트에서만 가져온다. `src/testing/`은 presentation을 가져올 수 없다.
- **화면 문구(I18N-02):** presentation의 `.svelte`·`.ts`에 화면 문구를 직접 쓰지 않는다. 사전 키로 꺼낸다(D8의 예외만 허용). 개발자용 오류 문장은 `console.error(…)`·`new Error(…)` 첫 인자로만 쓴다. 다른 실패 보고 이름은 짧은 영어 낱말이다(D22).
- **OS 분기 위치(설계 문서 5.4):** OS에 따라 다른 코드는 `src-tauri/src/platform/{macos,windows}.rs`, `src-tauri/crates/windows/`, `src/adapters/tauri/coordinates.ts`, `src/presentation/theme/`(글꼴)에만 둔다.
- **테스트 이름:** TypeScript 테스트 이름은 spec ID로 시작한다(여러 개면 공백으로 잇는다). Rust 테스트는 `#[test]` 바로 위(3줄 안)에 `/// ID 설명` 주석을 단다. 컴포넌트 테스트 파일은 첫 줄이 `// @vitest-environment happy-dom`이다.
- **Rust 테스트 범위:** 앱 crate(`src-tauri/src/`)에는 테스트를 두지 않는다. 테스트할 로직은 `todowidget-core`나 `todowidget-windows`에 둔다.
- **Task 끝 검사:** 매 Task 끝에 다음이 통과해야 한다(`.github/workflows/ci.yml`과 같다).
  ```
  pnpm test && pnpm typecheck && pnpm spec:check
  cargo fmt --check --manifest-path src-tauri/Cargo.toml --all
  cargo clippy --manifest-path src-tauri/Cargo.toml --workspace --all-targets -- -D warnings
  cargo test --manifest-path src-tauri/Cargo.toml --workspace --exclude todo-widget
  pnpm privacy:check
  ```
  Windows 코드를 바꾼 Task(5)는 다음도 통과해야 한다. 앱 crate의 Windows 빌드는 CI에서 본다(설계 문서 5.5, 13장).
  ```
  PATH="/opt/homebrew/opt/llvm/bin:$PATH" cargo clippy --manifest-path src-tauri/Cargo.toml -p todowidget-core -p todowidget-windows --all-targets --target x86_64-pc-windows-msvc -- -D warnings
  ```
- **실행 안전:**
  - 실제 데이터 폴더(`~/Library/Application Support/TodoWidget/`)를 건드리지 않는다. 앱을 띄울 때는 늘 `TODOWIDGET_DATA_DIR`에 임시 폴더를 준다.
  - 화면 캡처를 하지 않는다. PM의 다른 창이 찍힌다.
  - 실제 SMAppService 등록·해제는 PM 승인 없이 하지 않는다. 개발 빌드(`pnpm tauri dev`)는 자동 실행을 건드리지 않는다(START-07).
  - 업데이트: 켤 때마다 나가는 확인 요청(GitHub `latest.json`을 읽기만 하는 GET, 지금은 파일이 없어 조용히 실패한다)은 개발 실행과 PM 확인에서 허용한다. 업데이트 받기·설치(`downloadAndInstall`)는 PM 승인 없이 하지 않는다(PM 결정 2026-10-06, 리뷰 I7).
  - cargo-xwin, MSVC SDK, 새 이미지 도구를 설치하지 않는다.
- **subagent 모델:** 구현, 수정, 리뷰 모두 Opus를 쓴다(CLAUDE.md).

---
### Task 1: 다국어 사전과 화면 언어

**spec:** I18N-01, I18N-03, I18N-04, I18N-05

**Files:**
- Create: `src/presentation/i18n/keys.ts`, `src/presentation/i18n/ko.ts`, `src/presentation/i18n/en.ts`, `src/presentation/i18n/de.ts`, `src/presentation/i18n/zh-hans.ts`, `src/presentation/i18n/translator.ts`
- Create: `src/application/language.ts`
- Test: `src/presentation/i18n/i18n.test.ts`, `src/application/language.test.ts`

**Interfaces:**
- Consumes: `Language`, `pickLanguage(osLocale: string | null): Language` (`src/domain/language.ts`), `LocaleProvider` (`src/application/ports/locale.ts`), `NoticeKey` (`src/application/notices.ts`, `MessageKey`의 부분 집합이다)
- Produces:
  - `MESSAGE_KEYS: readonly MessageKey[]`, `type MessageKey`, `interface PluralText { one; other }`, `type Dictionary = Readonly<Record<MessageKey, string | PluralText>>` (`keys.ts`)
  - `type Translate = (key: MessageKey, n?: number) => string`, `createTranslator(language: Language): Translate`, `DICTIONARIES: Readonly<Record<Language, Dictionary>>` (`translator.ts`)
  - `screenLanguage(locale: LocaleProvider): Promise<Language>` (`src/application/language.ts`)

- [ ] **Step 1: 실패하는 테스트 쓰기 — 화면 언어**

`src/application/language.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { screenLanguage } from './language.ts';
import type { LocaleProvider } from './ports/locale.ts';

function locale(value: string | null): LocaleProvider {
  return { osLocale: async () => value };
}

describe('화면 언어', () => {
  it('I18N-01 켤 때 OS 언어로 화면 언어를 정한다', async () => {
    const tags = ['ko-KR', 'de-AT', 'zh-CN', 'zh-TW', 'zh-Hant-HK', 'en-US', 'fr-FR', 'ja-JP'];
    const languages = await Promise.all(tags.map((tag) => screenLanguage(locale(tag))));
    expect(languages).toEqual(['ko', 'de', 'zh-Hans', 'zh-Hans', 'zh-Hans', 'en', 'en', 'en']);
  });

  it('I18N-01 OS 언어를 알 수 없거나 읽지 못하면 영어다', async () => {
    expect(await screenLanguage(locale(null))).toBe('en');
    const failing: LocaleProvider = {
      osLocale: async () => {
        throw new Error('읽지 못했어요');
      },
    };
    expect(await screenLanguage(failing)).toBe('en');
  });
});
```

- [ ] **Step 2: 실패하는 테스트 쓰기 — 사전**

`src/presentation/i18n/i18n.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TASKS_FILE, TaskRepository } from '../../application/storage/task-repository.ts';
import { TodoSession } from '../../application/todo-session.ts';
import { FakeClock } from '../../testing/fake-clock.ts';
import { MemoryFileStore } from '../../testing/memory-file-store.ts';
import { sequenceIds } from '../../testing/sequence-ids.ts';
import { MESSAGE_KEYS, type PluralText } from './keys.ts';
import { DICTIONARIES, createTranslator } from './translator.ts';

interface SpecRow {
  key: string;
  ko: string;
  en: string;
}

/** spec/behavior/i18n.md "문구" 표의 줄. */
function specRows(): SpecRow[] {
  const text = readFileSync(new URL('../../../spec/behavior/i18n.md', import.meta.url), 'utf8');
  const table = text.slice(text.indexOf('## 문구'));
  return [...table.matchAll(/^\| `([A-Za-z.]+)` \| (.+) \| (.+) \|$/gm)].map((m) => ({ key: m[1] ?? '', ko: m[2] ?? '', en: m[3] ?? '' }));
}

/** 사전 값을 spec 표와 같은 모양으로 적는다. 복수 형태는 `one: … / other: …`. */
function asSpecCell(entry: string | PluralText): string {
  return typeof entry === 'string' ? entry : `one: ${entry.one} / other: ${entry.other}`;
}

describe('사전', () => {
  it('I18N-03 네 언어 사전의 키가 spec 문구 표의 키와 똑같다', () => {
    const expected = specRows().map((row) => row.key).sort();
    expect(expected).toHaveLength(34);
    expect([...MESSAGE_KEYS].sort()).toEqual(expected);
    for (const dictionary of Object.values(DICTIONARIES))
      expect(Object.keys(dictionary).sort()).toEqual(expected);
  });

  it('I18N-03 한국어·영어 문구는 spec 문구 표와 같다', () => {
    for (const row of specRows()) {
      const key = row.key as (typeof MESSAGE_KEYS)[number];
      expect(asSpecCell(DICTIONARIES.ko[key]), row.key).toBe(row.ko);
      expect(asSpecCell(DICTIONARIES.en[key]), row.key).toBe(row.en);
    }
  });

  it('I18N-04 개수가 들어간 문구는 언어별 복수 규칙을 따른다', () => {
    const en = createTranslator('en');
    const ko = createTranslator('ko');
    const de = createTranslator('de');
    const zh = createTranslator('zh-Hans');
    expect([en('header.remaining', 1), en('header.remaining', 3), en('reset.question', 1), en('reset.question', 5)]).toEqual([
      '1 task left',
      '3 tasks left',
      'Delete 1 task?',
      'Delete all 5 tasks?',
    ]);
    expect([ko('header.remaining', 1), ko('header.remaining', 3), ko('reset.question', 1), ko('reset.question', 5)]).toEqual([
      '1개 남음',
      '3개 남음',
      '할 일 1개를 모두 지울까요?',
      '할 일 5개를 모두 지울까요?',
    ]);
    expect([de('header.remaining', 1), de('header.remaining', 2), de('reset.question', 1), de('reset.question', 5)]).toEqual([
      '1 Aufgabe offen',
      '2 Aufgaben offen',
      '1 Aufgabe löschen?',
      'Alle 5 Aufgaben löschen?',
    ]);
    expect([zh('header.remaining', 1), zh('reset.question', 5)]).toEqual(['还剩 1 项', '要删除全部 5 项待办吗？']);
  });

  it('I18N-04 영어·독일어만 one/other 두 형태가 있고, 한국어·중국어는 한 형태만 쓴다', () => {
    const pluralKeys = (language: keyof typeof DICTIONARIES) =>
      MESSAGE_KEYS.filter((key) => typeof DICTIONARIES[language][key] !== 'string');
    expect(pluralKeys('en')).toEqual(['header.remaining', 'reset.question']);
    expect(pluralKeys('de')).toEqual(['header.remaining', 'reset.question']);
    expect(pluralKeys('ko')).toEqual([]);
    expect(pluralKeys('zh-Hans')).toEqual([]);
  });

  it('I18N-04 {n} 자리가 있는 문구는 네 언어 모두 그 자리가 있다', () => {
    for (const key of MESSAGE_KEYS) {
      const hasCount = asSpecCell(DICTIONARIES.ko[key]).includes('{n}');
      for (const dictionary of Object.values(DICTIONARIES)) {
        const entry = dictionary[key];
        const forms = typeof entry === 'string' ? [entry] : [entry.one, entry.other];
        for (const form of forms)
          expect(form.includes('{n}'), `${key}: ${form}`).toBe(hasCount);
      }
    }
  });

  it('I18N-04 개수 없이 꺼내면 other 형태를 그대로 준다', () => {
    expect(createTranslator('en')('menu.quit')).toBe('Quit');
    expect(createTranslator('en')('header.remaining')).toBe('{n} tasks left');
  });

  it('I18N-05 저장 데이터는 언어와 무관하고 화면에서만 번역된다', async () => {
    const files = new MemoryFileStore();
    const clock = new FakeClock();
    const session = await TodoSession.open(new TaskRepository(files, clock), clock, sequenceIds());
    session.add('보고서 쓰기');
    session.setStatus(session.items[0]?.id ?? '', 'doing');
    await session.whenSaved();
    const saved = files.files.get(TASKS_FILE) ?? '';
    expect(JSON.parse(saved).tasks[0]).toMatchObject({ title: '보고서 쓰기', status: 'doing' });

    // 영어 화면으로 다시 켜도 파일은 그대로이고, 상태 이름만 화면에서 번역된다.
    const writes = files.writes.length;
    const reopened = await TodoSession.open(new TaskRepository(files, clock), clock, sequenceIds());
    expect(reopened.items[0]).toMatchObject({ title: '보고서 쓰기', status: 'doing' });
    expect(files.writes).toHaveLength(writes);
    expect(createTranslator('ko')('status.doing')).toBe('하는 중');
    expect(createTranslator('en')('status.doing')).toBe('In progress');
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `pnpm vitest run src/presentation/i18n src/application/language.test.ts`
Expected: FAIL — `Failed to resolve import "./keys.ts"`, `"./language.ts"`

- [ ] **Step 4: 키와 사전 쓰기**

`src/presentation/i18n/keys.ts`:

```ts
/** spec/behavior/i18n.md "문구" 표의 키. 순서도 표와 같다 (I18N-03). */
export const MESSAGE_KEYS = [
  'app.title',
  'header.remaining',
  'header.allDone',
  'pin.on',
  'pin.off',
  'menu.more',
  'menu.autoStart',
  'menu.transparency',
  'menu.reset',
  'menu.quit',
  'status.todo',
  'status.doing',
  'status.done',
  'item.changeStatus',
  'item.rename',
  'item.delete',
  'section.doneShow',
  'section.doneHide',
  'input.placeholder',
  'list.empty',
  'reset.question',
  'reset.warning',
  'reset.cancel',
  'reset.confirm',
  'notice.backup',
  'notice.saveFailed',
  'notice.newerFile',
  'notice.autoStartFailed',
  'update.available',
  'update.action',
  'update.installing',
  'update.failed',
  'error.cannotOpen',
  'tray.open',
] as const;

export type MessageKey = (typeof MESSAGE_KEYS)[number];

/** 개수에 따라 형태가 바뀌는 문구. 영어·독일어만 쓰고, 한국어·중국어는 문자열 하나다 (I18N-04). */
export interface PluralText {
  readonly one: string;
  readonly other: string;
}

/** 화면 언어 하나의 사전. 문구 안의 `{n}`은 개수 자리다. */
export type Dictionary = Readonly<Record<MessageKey, string | PluralText>>;
```

`src/presentation/i18n/ko.ts`:

```ts
import type { Dictionary } from './keys.ts';

/** 한국어. spec/behavior/i18n.md 문구 표의 한국어 열 그대로다. */
export const ko: Dictionary = {
  'app.title': '할 일',
  'header.remaining': '{n}개 남음',
  'header.allDone': '모두 끝냈어요',
  'pin.on': '맨 위 고정 끄기',
  'pin.off': '맨 위에 고정',
  'menu.more': '메뉴',
  'menu.autoStart': '컴퓨터 켤 때 자동 실행',
  'menu.transparency': '투명도',
  'menu.reset': '초기화',
  'menu.quit': '종료',
  'status.todo': '할 일',
  'status.doing': '하는 중',
  'status.done': '끝낸 일',
  'item.changeStatus': '상태 바꾸기',
  'item.rename': '이름 바꾸기',
  'item.delete': '삭제',
  'section.doneShow': '펼치기',
  'section.doneHide': '접기',
  'input.placeholder': '할 일 추가',
  'list.empty': '할 일을 추가해 보세요',
  'reset.question': '할 일 {n}개를 모두 지울까요?',
  'reset.warning': '지운 뒤에는 되돌릴 수 없어요.',
  'reset.cancel': '취소',
  'reset.confirm': '모두 지우기',
  'notice.backup': '저장 파일에 문제가 있어 백업해 두었어요',
  'notice.saveFailed': '저장하지 못했어요. 다음 변경 때 다시 시도해요',
  'notice.newerFile': '새 버전에서 만든 파일이에요. 업데이트해 주세요',
  'notice.autoStartFailed': '자동 실행 설정을 바꾸지 못했어요',
  'update.available': '새 버전이 있어요',
  'update.action': '업데이트',
  'update.installing': '업데이트하는 중이에요',
  'update.failed': '업데이트하지 못했어요',
  'error.cannotOpen': '할 일 파일을 열 수 없어요',
  'tray.open': '열기',
};
```

`src/presentation/i18n/en.ts`:

```ts
import type { Dictionary } from './keys.ts';

/** 영어. spec/behavior/i18n.md 문구 표의 영어 열 그대로다. */
export const en: Dictionary = {
  'app.title': 'To-do',
  'header.remaining': { one: '{n} task left', other: '{n} tasks left' },
  'header.allDone': 'All done',
  'pin.on': 'Stop keeping on top',
  'pin.off': 'Keep on top',
  'menu.more': 'Menu',
  'menu.autoStart': 'Open at login',
  'menu.transparency': 'Transparency',
  'menu.reset': 'Clear all',
  'menu.quit': 'Quit',
  'status.todo': 'To do',
  'status.doing': 'In progress',
  'status.done': 'Done',
  'item.changeStatus': 'Change status',
  'item.rename': 'Rename',
  'item.delete': 'Delete',
  'section.doneShow': 'Show',
  'section.doneHide': 'Hide',
  'input.placeholder': 'Add a task',
  'list.empty': 'Add your first task',
  'reset.question': { one: 'Delete {n} task?', other: 'Delete all {n} tasks?' },
  'reset.warning': "This can't be undone.",
  'reset.cancel': 'Cancel',
  'reset.confirm': 'Delete all',
  'notice.backup': 'Your task file had a problem, so it was backed up',
  'notice.saveFailed': "Couldn't save. Will try again on the next change",
  'notice.newerFile': 'This file is from a newer version. Please update',
  'notice.autoStartFailed': "Couldn't change the open-at-login setting",
  'update.available': 'A new version is available',
  'update.action': 'Update',
  'update.installing': 'Updating…',
  'update.failed': "Couldn't update",
  'error.cannotOpen': "Can't open your task file",
  'tray.open': 'Open',
};
```

`src/presentation/i18n/de.ts` (개발 번역, D18):

```ts
import type { Dictionary } from './keys.ts';

/** 독일어. 개발이 번역했다. 원어민 검토는 가능해지면 반영한다 (설계 문서 7장). 최소 폭 280에서 넘치지 않게 짧게 쓴다 (I18N-07). */
export const de: Dictionary = {
  'app.title': 'Aufgaben',
  'header.remaining': { one: '{n} Aufgabe offen', other: '{n} Aufgaben offen' },
  'header.allDone': 'Alles erledigt',
  'pin.on': 'Nicht mehr im Vordergrund halten',
  'pin.off': 'Im Vordergrund halten',
  'menu.more': 'Menü',
  'menu.autoStart': 'Beim Anmelden öffnen',
  'menu.transparency': 'Transparenz',
  'menu.reset': 'Alle löschen',
  'menu.quit': 'Beenden',
  'status.todo': 'Zu erledigen',
  'status.doing': 'In Arbeit',
  'status.done': 'Erledigt',
  'item.changeStatus': 'Status ändern',
  'item.rename': 'Umbenennen',
  'item.delete': 'Löschen',
  'section.doneShow': 'Anzeigen',
  'section.doneHide': 'Ausblenden',
  'input.placeholder': 'Aufgabe hinzufügen',
  'list.empty': 'Füge deine erste Aufgabe hinzu',
  'reset.question': { one: '{n} Aufgabe löschen?', other: 'Alle {n} Aufgaben löschen?' },
  'reset.warning': 'Das lässt sich nicht rückgängig machen.',
  'reset.cancel': 'Abbrechen',
  'reset.confirm': 'Alle löschen',
  'notice.backup': 'Die Aufgabendatei war fehlerhaft und wurde gesichert',
  'notice.saveFailed': 'Speichern fehlgeschlagen. Neuer Versuch bei der nächsten Änderung',
  'notice.newerFile': 'Datei aus neuerer Version. Bitte aktualisieren.',
  'notice.autoStartFailed': 'Autostart-Einstellung konnte nicht geändert werden',
  'update.available': 'Neue Version verfügbar',
  'update.action': 'Aktualisieren',
  'update.installing': 'Wird aktualisiert…',
  'update.failed': 'Update fehlgeschlagen',
  'error.cannotOpen': 'Aufgabendatei kann nicht geöffnet werden',
  'tray.open': 'Öffnen',
};
```

`src/presentation/i18n/zh-hans.ts`:

```ts
import type { Dictionary } from './keys.ts';

/** 중국어 간체. 개발이 번역했다. 원어민 검토는 가능해지면 반영한다 (설계 문서 7장). */
export const zhHans: Dictionary = {
  'app.title': '待办事项',
  'header.remaining': '还剩 {n} 项',
  'header.allDone': '全部完成',
  'pin.on': '取消置顶',
  'pin.off': '置顶',
  'menu.more': '菜单',
  'menu.autoStart': '登录时打开',
  'menu.transparency': '透明度',
  'menu.reset': '全部清除',
  'menu.quit': '退出',
  'status.todo': '待办',
  'status.doing': '进行中',
  'status.done': '已完成',
  'item.changeStatus': '更改状态',
  'item.rename': '重命名',
  'item.delete': '删除',
  'section.doneShow': '展开',
  'section.doneHide': '收起',
  'input.placeholder': '添加待办',
  'list.empty': '添加你的第一项待办',
  'reset.question': '要删除全部 {n} 项待办吗？',
  'reset.warning': '删除后无法恢复。',
  'reset.cancel': '取消',
  'reset.confirm': '全部删除',
  'notice.backup': '任务文件有问题，已备份',
  'notice.saveFailed': '无法保存。下次更改时会重试',
  'notice.newerFile': '此文件来自更新的版本，请更新',
  'notice.autoStartFailed': '无法更改登录时打开设置',
  'update.available': '有新版本',
  'update.action': '更新',
  'update.installing': '正在更新…',
  'update.failed': '更新失败',
  'error.cannotOpen': '无法打开任务文件',
  'tray.open': '打开',
};
```

- [ ] **Step 5: 번역기와 화면 언어 쓰기**

`src/presentation/i18n/translator.ts`:

```ts
import type { Language } from '../../domain/language.ts';
import { de } from './de.ts';
import { en } from './en.ts';
import type { Dictionary, MessageKey } from './keys.ts';
import { ko } from './ko.ts';
import { zhHans } from './zh-hans.ts';

/** 화면 문구를 꺼낸다. n을 주면 언어별 복수 규칙으로 형태를 고르고 `{n}` 자리에 넣는다 (I18N-02, I18N-04). */
export type Translate = (key: MessageKey, n?: number) => string;

export const DICTIONARIES: Readonly<Record<Language, Dictionary>> = { ko, en, de, 'zh-Hans': zhHans };

/** 켤 때 정한 화면 언어의 번역기. 앱 안에서 언어를 바꾸지 않는다 (I18N-01). */
export function createTranslator(language: Language): Translate {
  const dictionary = DICTIONARIES[language];
  const plural = new Intl.PluralRules(language);
  return (key, n) => {
    const entry = dictionary[key];
    const text = typeof entry === 'string' ? entry : n !== undefined && plural.select(n) === 'one' ? entry.one : entry.other;
    return n === undefined ? text : text.replaceAll('{n}', String(n));
  };
}
```

`src/application/language.ts`:

```ts
import { type Language, pickLanguage } from '../domain/language.ts';
import type { LocaleProvider } from './ports/locale.ts';

/** 켤 때 한 번 OS 언어로 화면 언어를 정한다. OS 언어를 읽지 못하면 영어다 (I18N-01). */
export async function screenLanguage(locale: LocaleProvider): Promise<Language> {
  try {
    return pickLanguage(await locale.osLocale());
  } catch {
    return pickLanguage(null);
  }
}
```

- [ ] **Step 6: 통과 확인**

Run: `pnpm vitest run src/presentation/i18n src/application/language.test.ts`
Expected: PASS (9 tests)

Run: Global Constraints의 Task 끝 검사
Expected: 모두 통과

- [ ] **Step 7: 커밋**

```bash
git add src/presentation/i18n src/application/language.ts src/application/language.test.ts
git commit -m "feat: 네 언어 사전과 복수 규칙, 켤 때 화면 언어 고르기를 더함"
```

---

### Task 2: 테마 — 색과 글꼴

**spec:** I18N-06, MAC-09, WIN-08(글꼴 표), WND-13(배경 알파 변수)

**Files:**
- Create: `src/presentation/theme/theme.css`, `src/presentation/theme/fonts.ts`
- Test: `src/presentation/theme/fonts.test.ts`

**Interfaces:**
- Consumes: `Language` (`src/domain/language.ts`)
- Produces:
  - `type DesktopPlatform = 'windows' | 'macos'`, `fontStack(platform: DesktopPlatform, language: Language): string` → `'var(--font-macos-ko)'` 같은 CSS 값
  - CSS 변수(`theme.css`): `--card`(RGB 숫자), `--ink`, `--muted`, `--line`, `--todo`, `--accent`, `--accent-hover`, `--doingbg`(RGB 숫자), `--done`, `--foldbg`(RGB 숫자), `--hint`, `--hover`, `--danger`, `--danger-hover`, `--thumb`, `--thumb-hover`, `--shadow`(RGB 숫자), `--selection`, `--font-ui`, `--font-{macos,windows}-{ko,en,zh}`. 전역 클래스 `.scroll`(얇은 스크롤바, LIST-16). 컴포넌트는 카드 불투명도를 `--a`로 받는다(Task 12에서 카드에 건다)

- [ ] **Step 1: 실패하는 테스트 쓰기**

`src/presentation/theme/fonts.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fontStack } from './fonts.ts';

const css = readFileSync(new URL('./theme.css', import.meta.url), 'utf8');

/** theme.css에서 변수의 첫 글꼴. */
function firstFont(variable: string): string {
  const match = new RegExp(`${variable}:\\s*([^,;]+)`).exec(css);
  return (match?.[1] ?? '').replaceAll('"', '').trim();
}

describe('글꼴', () => {
  it('I18N-06 MAC-09 WIN-08 화면 언어와 OS로 글꼴 변수를 고른다. 독일어는 영어와 같다', () => {
    expect(fontStack('macos', 'ko')).toBe('var(--font-macos-ko)');
    expect(fontStack('macos', 'de')).toBe('var(--font-macos-en)');
    expect(fontStack('windows', 'en')).toBe('var(--font-windows-en)');
    expect(fontStack('windows', 'zh-Hans')).toBe('var(--font-windows-zh)');
  });

  it('I18N-06 MAC-09 WIN-08 글꼴 변수의 첫 글꼴은 글꼴 표대로다', () => {
    expect(firstFont('--font-macos-ko')).toBe('Apple SD Gothic Neo');
    expect(firstFont('--font-macos-en')).toBe('-apple-system');
    expect(firstFont('--font-macos-zh')).toBe('PingFang SC');
    expect(firstFont('--font-windows-ko')).toBe('Malgun Gothic');
    expect(firstFont('--font-windows-en')).toBe('Segoe UI');
    expect(firstFont('--font-windows-zh')).toBe('Microsoft YaHei');
  });

  it('I18N-06 다른 언어로 쓴 제목도 깨지지 않게 세 언어 글꼴을 모두 뒤에 둔다', () => {
    for (const os of ['macos', 'windows']) {
      for (const tag of ['ko', 'en', 'zh']) {
        const line = new RegExp(`--font-${os}-${tag}:([^;]+);`).exec(css)?.[1] ?? '';
        const fonts = os === 'macos' ? ['Apple SD Gothic Neo', 'PingFang SC'] : ['Malgun Gothic', 'Microsoft YaHei'];
        for (const font of fonts)
          expect(line, `${os}-${tag}`).toContain(font);
      }
    }
  });

  it('WND-13 배경 세 가지는 카드 불투명도(--a)를 알파로 쓰도록 RGB 숫자로 둔다', () => {
    expect(css).toMatch(/--card: 255, 255, 255;/);
    expect(css).toMatch(/--foldbg: 246, 245, 242;/);
    expect(css).toMatch(/--doingbg: 253, 241, 232;/);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm vitest run src/presentation/theme`
Expected: FAIL — `ENOENT ... theme.css`

- [ ] **Step 3: 테마 쓰기**

`src/presentation/theme/theme.css` (값은 시안 `:root`와 `docs/design/v1.4-visual-reference.md` 4장 그대로다):

```css
/* 위젯 겉모양 (설계 문서 6장, PM 승인 시안 docs/design/widget-mockup.html). 다크 모드는 범위 밖이다. */
:root {
  /* 투명도(WND-11)가 알파로 들어가는 배경은 RGB 숫자로 둔다: rgba(var(--card), var(--a)). */
  --card: 255, 255, 255;
  --doingbg: 253, 241, 232;
  --foldbg: 246, 245, 242;
  --shadow: 60, 50, 40;
  --ink: #2b2a28;
  --muted: #8c8983;
  --line: #ebe8e3;
  --todo: #a29d95;
  --accent: #e8935a;
  --accent-hover: #c9733c;
  --done: #7fae8a;
  --hint: #b3afa8;
  --hover: #f4f2ee;
  --danger: #d9624b;
  --danger-hover: #c4523c;
  --thumb: #d9d5ce;
  --thumb-hover: #b9b5ad;
  --selection: #b4d5fe;

  /* 글꼴 (I18N-06, MAC-09, WIN-08). 화면 언어 글꼴을 앞에, 다른 언어 글꼴을 뒤에 둔다. main.ts가 --font-ui를 고른다. */
  --font-macos-ko: "Apple SD Gothic Neo", -apple-system, "PingFang SC", sans-serif;
  --font-macos-en: -apple-system, "SF Pro Text", "Apple SD Gothic Neo", "PingFang SC", sans-serif;
  --font-macos-zh: "PingFang SC", -apple-system, "Apple SD Gothic Neo", sans-serif;
  --font-windows-ko: "Malgun Gothic", "Segoe UI", "Microsoft YaHei", sans-serif;
  --font-windows-en: "Segoe UI", "Malgun Gothic", "Microsoft YaHei", sans-serif;
  --font-windows-zh: "Microsoft YaHei", "Segoe UI", "Malgun Gothic", sans-serif;
  --font-ui: var(--font-macos-en);
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

/* 창은 투명하다. 카드 밖은 비친다 (WND-01). */
html,
body {
  margin: 0;
  padding: 0;
  background: transparent;
  overflow: hidden;
}

body {
  font-family: var(--font-ui);
  color: var(--ink);
  cursor: default;
  -webkit-font-smoothing: antialiased;
  -webkit-user-select: none;
  user-select: none;
}

input,
textarea {
  font: inherit;
  color: inherit;
  -webkit-user-select: text;
  user-select: text;
}

::selection {
  background: var(--selection);
}

/* 섹션마다 따로 스크롤한다. 화살표 없는 6px 손잡이와 내용 사이 4px (LIST-16, v1.4 T:79-106). */
.scroll {
  overflow-x: hidden;
  overflow-y: auto;
}

.scroll::-webkit-scrollbar {
  width: 10px;
}

.scroll::-webkit-scrollbar-track {
  background: transparent;
}

.scroll::-webkit-scrollbar-thumb {
  background: var(--thumb);
  background-clip: padding-box;
  border-left: 4px solid transparent;
  border-radius: 3px;
}

.scroll::-webkit-scrollbar-thumb:hover {
  background-color: var(--thumb-hover);
}
```

`src/presentation/theme/fonts.ts`:

```ts
import type { Language } from '../../domain/language.ts';

/** 글꼴이 다른 OS. adapter의 `DesktopOs`와 같은 이름이다. */
export type DesktopPlatform = 'windows' | 'macos';

const FONT_TAGS: Readonly<Record<Language, string>> = { ko: 'ko', en: 'en', de: 'en', 'zh-Hans': 'zh' };

/**
 * 화면 언어와 OS에 맞는 글꼴 (I18N-06, MAC-09, WIN-08). 글꼴 이름은 theme.css 변수에 있고, 여기서는 변수만 고른다.
 * 이 파일은 OS에 따라 다른 값을 고르는 곳이다(설계 문서 5.4의 `src/presentation/theme/`).
 */
export function fontStack(platform: DesktopPlatform, language: Language): string {
  return `var(--font-${platform}-${FONT_TAGS[language]})`;
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm vitest run src/presentation/theme`
Expected: PASS (4 tests)

Run: Global Constraints의 Task 끝 검사
Expected: 모두 통과

- [ ] **Step 5: 커밋**

```bash
git add src/presentation/theme
git commit -m "feat: 시안 색과 OS·언어별 글꼴을 테마 CSS 변수로 둠"
```

---

### Task 3: 창 높이 맞추기와 메뉴용 늘리기

**spec:** WND-03(내용이 짧으면 창은 내용만큼), WND-10(창 위아래 화면 공간, 메뉴가 창보다 크면 늘림), WND-14(늘린 채 종료), WND-02(늘린 동안 위치 저장 안 함)

**Files:**
- Modify: `src/domain/window-geometry.ts` (`SHADOW_MARGIN`, `spaceAround`)
- Modify: `src/application/ports/window-controller.ts` (`setHeight`, `ScreenLayout.workAreas`)
- Modify: `src/application/window-placement.ts`
- Modify: `src/adapters/tauri/window-controller.ts` (`setHeight`, 모니터마다의 작업 영역)
- Modify: `src/testing/fake-window-controller.ts` (`setHeight`, `heightCalls`, `resizeGate`, `failPinned`, `layout.workAreas`)
- Test: `src/domain/window-geometry.test.ts`, `src/application/window-placement.test.ts`, `src/adapters/tauri/window-controller.test.ts`

**Interfaces:**
- Consumes: `WindowController`, `SettingsService`, `Timer`, `resolveWidgetSize`, `resizeLimits`
- Produces:
  - `SHADOW_MARGIN = 10`, `spaceAround(bounds: Rect, monitors: readonly Rect[], workAreas: readonly Rect[], primaryWorkArea: Rect): { above: number; below: number }` (domain)
  - `ScreenLayout.workAreas: readonly Rect[]` — 모니터마다의 작업 영역(메뉴 막대·Dock·작업 표시줄을 뺀 영역). `monitors`와 같은 순서다. Tauri `Monitor.workArea`(설치된 `@tauri-apps/api` 2.12.1 `window.d.ts` 67줄)를 adapter가 넘긴다(리뷰 M9)
  - `WindowController.setHeight(height: number, raise: number): Promise<void>` — 폭과 왼쪽은 그대로 두고 높이를 `height`로, 위쪽 끝을 `raise`만큼 올린다(음수면 내린다). 둘 다 크기 단위(창이 있는 모니터 배율 기준, CSS px와 같다)
  - `WindowPlacement`에 더하는 것:
    - `get maxHeight(): number` — 지금 최대 높이(WND-05로 맞춘 값)
    - `get height(): number` — 내용에 맞춘 창 높이(메뉴로 늘린 동안에도 늘리기 전 값)
    - `fitToContent(height: number): Promise<void>`
    - `expand(raise: number, height: number): Promise<void>` / `restore(): Promise<void>`
    - `roomAround(): Promise<{ above: number; below: number }>`
    - `show(paintedAtMs: number): Promise<void>`, `startMove(): Promise<void>`
  - `FakeWindowController`에 더하는 것: `heightCalls: Array<{ height: number; raise: number }>`, `resizeGate: Promise<void> | null`, `failPinned: boolean`

- [ ] **Step 1: 실패하는 테스트 쓰기 — domain**

`src/domain/window-geometry.test.ts` 맨 끝에 더한다(파일 맨 위 import에 `spaceAround`를 더한다):

```ts
describe('창 위아래 화면 공간', () => {
  const primary = { left: 0, top: 0, width: 1920, height: 1080 };
  const workArea = { left: 0, top: 0, width: 1920, height: 1040 };
  /** 주 모니터 왼쪽의 보조 모니터. macOS 기본 설정처럼 위에 메뉴 막대(25)가 있다. */
  const left = { left: -1920, top: 0, width: 1920, height: 1080 };
  const leftWork = { left: -1920, top: 25, width: 1920, height: 1055 };

  it('WND-10 주 모니터에서는 작업 영역 기준으로 창 위아래에 남은 공간을 잰다', () => {
    expect(spaceAround({ left: 1576, top: 24, width: 320, height: 300 }, [primary], [workArea], workArea)).toEqual({ above: 24, below: 716 });
  });

  it('WND-10 다른 모니터에 있으면 그 모니터의 작업 영역 기준이다(메뉴 막대·Dock을 뺀다)', () => {
    expect(spaceAround({ left: -1500, top: 100, width: 320, height: 300 }, [primary, left], [workArea, leftWork], workArea)).toEqual({ above: 75, below: 680 });
  });

  it('WND-10 어느 모니터와도 겹치지 않으면 주 모니터 작업 영역 기준이다', () => {
    expect(spaceAround({ left: 5000, top: 100, width: 320, height: 300 }, [primary], [workArea], workArea)).toEqual({ above: 100, below: 640 });
  });
});
```

- [ ] **Step 2: 실패하는 테스트 쓰기 — application**

`src/application/window-placement.test.ts` 맨 끝에 더한다:

```ts
describe('창 높이', () => {
  it('WND-03 내용이 짧으면 창은 내용만큼, 길면 최대 높이에서 멈춘다', async () => {
    const { placement: p } = await placement();
    await p.apply();
    expect(p.maxHeight).toBe(520);
    await p.fitToContent(200.4);
    expect(window.current).toEqual({ left: 1576, top: 24, width: 320, height: 201 });
    expect(p.height).toBe(201);
    await p.fitToContent(900);
    expect(window.current.height).toBe(520);
  });

  it('WND-03 높이가 같으면 창을 다시 바꾸지 않는다', async () => {
    const { placement: p } = await placement();
    await p.apply();
    await p.fitToContent(200);
    await p.fitToContent(200);
    expect(window.heightCalls).toEqual([{ height: 200, raise: 0 }]);
  });

  it('WND-03 크기를 끄는 동안의 내용 높이는 무시하고, 놓은 높이가 새 최대 높이가 된다', async () => {
    const { placement: p } = await placement();
    await p.apply();
    let release: () => void = () => undefined;
    window.resizeGate = new Promise((resolve) => {
      release = resolve;
    });
    window.resizeResult = { left: 1576, top: 24, width: 320, height: 600 };
    const resizing = p.resize('South', { screenX: 0, screenY: 0 });
    await p.fitToContent(200);
    expect(window.heightCalls).toEqual([]);
    release();
    await resizing;
    expect([p.maxHeight, p.height]).toEqual([600, 600]);
    await p.fitToContent(200);
    expect(window.current.height).toBe(200);
  });

  it('WND-10 메뉴가 창보다 크면 늘리고, 늘린 동안 바뀐 내용 높이로 되돌린다. 위로 늘리면 창 위쪽을 올린다', async () => {
    const { placement: p } = await placement();
    await p.apply();
    await p.fitToContent(200);
    await p.expand(0, 300);
    expect(window.current).toMatchObject({ top: 24, height: 300 });
    await p.fitToContent(250);
    expect(window.current.height).toBe(300);
    await p.expand(100, 400);
    expect(window.current).toMatchObject({ top: -76, height: 400 });
    expect(p.height).toBe(200);
    await p.restore();
    expect(window.current).toMatchObject({ top: 24, height: 250 });
    expect(p.height).toBe(250);
    await p.restore();
    expect(window.heightCalls).toHaveLength(4);
  });

  it('WND-14 메뉴로 늘린 채 끝내도 늘리기 전 위치를 저장한다', async () => {
    const { placement: p } = await placement();
    await p.apply();
    await p.fitToContent(200);
    await p.expand(100, 400);
    await p.captureForQuit();
    expect(window.current).toMatchObject({ top: 24, height: 200 });
    expect(savedSettings()).toMatchObject({ left: 1576, top: 24 });
  });

  it('WND-02 메뉴로 창을 올린 동안 온 이동 신호로는 위치를 저장하지 않는다', async () => {
    const { placement: p } = await placement();
    await p.apply();
    await p.expand(100, 400);
    files.writes.length = 0;
    window.moveTo(window.current.left, window.current.top);
    timer.runAll();
    await flush();
    expect(files.writes).toEqual([]);
  });

  it('WND-10 창 위아래로 남은 화면 공간을 알려 준다', async () => {
    const { placement: p } = await placement();
    await p.apply();
    await p.fitToContent(300);
    expect(await p.roomAround()).toEqual({ above: 24, below: 716 });
  });

  it('WND-02 창 보이기와 끌어 옮기기를 창에 넘긴다', async () => {
    const { placement: p } = await placement();
    await p.show(5);
    await p.startMove();
    expect(window.shown).toEqual([5]);
    expect(window.drags).toBe(1);
  });
});
```

- [ ] **Step 3: 실패하는 테스트 쓰기 — adapter**

`src/adapters/tauri/window-controller.test.ts`의 `'WND-07 setBounds는 …'` 테스트 다음에 더한다:

```ts
  it('WND-03 setHeight는 지금 위치에서 높이와 위쪽 끝만 native 단위로 바꾼다', async () => {
    const win = setup('windows', 2);
    await win.controller.setHeight(300, 50);
    expect(win.invoke).toHaveBeenCalledWith('set_frame', { left: 3152, top: -52, width: 640, height: 600 });
    const mac = setup('macos', 2);
    await mac.controller.setHeight(300, 0);
    expect(mac.invoke).toHaveBeenCalledWith('set_frame', { left: 1576, top: 24, width: 320, height: 300 });
  });
```

같은 파일의 `'WND-07 화면 정보는 spec 좌표로 준다 (Windows 배율 1.25)'` 테스트 기대값에 모니터마다의 작업 영역을 더한다:

```ts
    expect(await controller.screen()).toEqual({
      monitors: [{ left: 0, top: 0, width: 1920, height: 1080 }],
      workAreas: [{ left: 0, top: 0, width: 1920, height: 1040 }],
      primaryWorkArea: { left: 0, top: 0, width: 1920, height: 1040 },
    });
```

- [ ] **Step 4: 실패 확인**

Run: `pnpm vitest run src/domain/window-geometry.test.ts src/application/window-placement.test.ts src/adapters/tauri/window-controller.test.ts`
Expected: FAIL — `spaceAround is not a function`, `p.fitToContent is not a function`, `controller.setHeight is not a function`

- [ ] **Step 5: domain 구현**

`src/domain/window-geometry.ts`에서 `HEADER_GRAB` 선언 아래에 더한다:

```ts
/** 카드 둘레의 투명한 그림자 여백. 창 크기는 이 여백을 포함한다 (window.md 용어 "크기와 좌표"). */
export const SHADOW_MARGIN = 10;
```

같은 파일의 `headerReachable` 함수 위에 더한다:

```ts
/**
 * 창이 있는 모니터에서 창 위아래로 남은 공간. 그 모니터의 작업 영역(메뉴 막대·Dock·작업 표시줄을 뺀 영역) 기준이다.
 * 창과 가장 많이 겹치는 모니터를 창이 있는 모니터로 본다. 어느 모니터와도 겹치지 않으면 주 모니터 작업 영역 기준이다 (WND-10).
 * workAreas는 monitors와 같은 순서다. 작업 영역을 모르는 모니터는 모니터 영역 전체를 쓴다.
 */
export function spaceAround(bounds: Rect, monitors: readonly Rect[], workAreas: readonly Rect[], primaryWorkArea: Rect): { above: number; below: number } {
  let home = -1;
  let best = 0;
  monitors.forEach((monitor, index) => {
    const area = overlapArea(bounds, monitor);
    if (area > best) {
      best = area;
      home = index;
    }
  });
  const area = home < 0 ? primaryWorkArea : (workAreas[home] ?? monitors[home] ?? primaryWorkArea);
  return { above: bounds.top - area.top, below: area.top + area.height - (bounds.top + bounds.height) };
}

function overlapArea(a: Rect, b: Rect): number {
  const width = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
  const height = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
  return width > 0 && height > 0 ? width * height : 0;
}

```

- [ ] **Step 6: port와 가짜 구현**

`src/application/ports/window-controller.ts`의 `ScreenLayout`에서 `monitors` 아래에 더한다:

```ts
  /** 모니터마다의 작업 영역(메뉴 막대·Dock·작업 표시줄을 뺀 영역). monitors와 같은 순서다 (WND-10). */
  workAreas: readonly Rect[];
```

같은 파일의 `setBounds` 아래에 더한다:

```ts
  /**
   * 폭과 왼쪽은 그대로 두고 높이를 height로, 위쪽 끝을 raise만큼 올린다(음수면 내린다). 한 번에 바꾼다.
   * height와 raise는 크기 단위다(창이 있는 모니터 배율 기준, CSS px와 같다). 창 높이 맞추기(WND-03)와 메뉴용 늘리기(WND-10)에 쓴다.
   */
  setHeight(height: number, raise: number): Promise<void>;
```

`src/testing/fake-window-controller.ts`:
- `layout`의 `monitors` 줄 아래에 `workAreas: [{ left: 0, top: 0, width: 1920, height: 1040 }],`를 더한다.
- 필드 `failBounds = false;` 아래에 더한다:

```ts
  /** setPinned가 실패한다. */
  failPinned = false;
  /** 주면 resize가 이 약속이 끝날 때까지 놓지 않은 채 멈춰 있다. */
  resizeGate: Promise<void> | null = null;
  heightCalls: Array<{ height: number; raise: number }> = [];
```

- `setBounds` 아래에 더한다:

```ts
  async setHeight(height: number, raise: number): Promise<void> {
    this.heightCalls.push({ height, raise });
    this.current = { ...this.current, top: this.current.top - raise, height };
  }
```

- `setPinned`를 바꾼다:

```ts
  async setPinned(pinned: boolean): Promise<void> {
    if (this.failPinned)
      throw new Error('맨 위 고정을 바꾸지 못했어요');
    this.pinned = pinned;
  }
```

- `resize`의 첫 줄(`this.resizeCalls.push(...)`) 다음에 더한다:

```ts
    if (this.resizeGate)
      await this.resizeGate;
```

- [ ] **Step 7: adapter 구현**

`src/adapters/tauri/window-controller.ts`의 `screen()`이 돌려주는 객체에서 `monitors:` 줄 다음에 더한다:

```ts
        workAreas: monitors.map((m) => toSpec({ ...m.workArea.position, ...m.workArea.size }, m.scaleFactor)),
```

같은 파일의 반환 객체에서 `setBounds` 다음에 더한다:

```ts
    async setHeight(height: number, raise: number): Promise<void> {
      const { coords, scale } = await context();
      const native = await nativeBounds(coords, scale);
      const perCss = coords.nativePerCss(scale);
      await setFrame({ left: native.left, top: native.top - raise * perCss, width: native.width, height: height * perCss });
    },
```

- [ ] **Step 8: WindowPlacement 구현**

`src/application/window-placement.ts` 전체를 다음으로 바꾼다:

```ts
import type { ResizeEdge } from '../domain/resize.ts';
import { resizeLimits } from '../domain/resize.ts';
import { resolveWidgetPosition, resolveWidgetSize, spaceAround } from '../domain/window-geometry.ts';
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
 * 종료할 때 위치를 저장한다(WND-14). 창 높이는 내용에 맞추고(WND-03), 메뉴가 창보다 크면 열린 동안 늘린다(WND-10, 저장하지 않음).
 * 창 높이 바꾸기(맞추기·늘리기·되돌리기)는 하나씩 차례로 한다.
 */
export class WindowPlacement {
  readonly #deps: PlacementDeps;
  #cancelSave: (() => void) | null = null;
  #stopMoved: (() => void) | null = null;
  /** 마지막으로 읽은 주 모니터 작업 영역 높이. 크기 조절을 기다림 없이 시작하는 데 쓴다. */
  #workAreaHeight: number | null = null;
  /** 내용에 맞춘 창 높이. 메뉴로 늘린 동안에도 늘리기 전 높이다. */
  #height = 0;
  /** 마지막으로 받은 내용 높이(카드 + 위아래 그림자 여백). */
  #contentHeight: number | null = null;
  /** 메뉴로 창 위쪽을 올린 만큼. 늘리지 않았으면 null. */
  #raised: number | null = null;
  #resizing = false;
  /** 창 높이 바꾸기 줄의 끝. 실패해도 다음 것을 막지 않는다. */
  #frames: Promise<void> = Promise.resolve();

  constructor(deps: PlacementDeps) {
    this.#deps = deps;
  }

  /** 창 높이의 상한(WND-05). apply 전에는 작업 영역을 몰라 300이다. */
  get maxHeight(): number {
    const saved = this.#deps.settings.current;
    return resolveWidgetSize(saved.width, saved.maxHeight, this.#workAreaHeight ?? 0).maxHeight;
  }

  /** 내용에 맞춘 창 높이. 메뉴로 늘린 동안에도 늘리기 전 높이다. */
  get height(): number {
    return this.#height;
  }

  async apply(): Promise<void> {
    const { window, settings } = this.#deps;
    const screen = await window.screen();
    this.#workAreaHeight = screen.primaryWorkArea.height;
    const saved = settings.current;
    const size = resolveWidgetSize(saved.width, saved.maxHeight, screen.primaryWorkArea.height);
    const position = resolveWidgetPosition(saved, size.width, screen.monitors, screen.primaryWorkArea);
    await window.setBounds({ ...position, width: size.width, height: size.maxHeight });
    this.#height = size.maxHeight;
    await window.setPinned(saved.pinned);
    this.#stopMoved ??= window.onMoved(() => this.#scheduleSave());
  }

  async setPinned(pinned: boolean): Promise<void> {
    await this.#deps.window.setPinned(pinned);
    await this.#deps.settings.update({ pinned });
  }

  /** 화면을 다 그렸으면 창을 보인다. */
  show(paintedAtMs: number): Promise<void> {
    return this.#deps.window.show(paintedAtMs);
  }

  /** OS 기본 끌기로 창을 옮긴다 (WND-02). */
  startMove(): Promise<void> {
    return this.#deps.window.startDragging();
  }

  /**
   * 창 높이를 내용에 맞춘다. 최대 높이를 넘지 않는다 (WND-03 "내용이 짧으면 창은 내용만큼").
   * 크기를 끄는 동안 온 높이는 카드가 창을 채운 높이라 무시한다. 메뉴로 늘린 동안은 기억만 했다가 restore()에서 맞춘다.
   */
  fitToContent(height: number): Promise<void> {
    if (this.#resizing)
      return Promise.resolve();
    this.#contentHeight = height;
    return this.#frame(async () => {
      if (this.#raised === null)
        await this.#fit();
    });
  }

  /** 메뉴·확인 판이 들어가게 창 위쪽을 raise만큼 올리고 높이를 height로 늘린다. 저장하지 않는다 (WND-10). */
  expand(raise: number, height: number): Promise<void> {
    return this.#frame(async () => {
      const previous = this.#raised ?? 0;
      await this.#deps.window.setHeight(height, raise - previous);
      this.#raised = raise;
    });
  }

  /** 늘린 창을 내용 높이로 되돌린다. 늘리지 않았으면 아무것도 하지 않는다. */
  restore(): Promise<void> {
    return this.#frame(async () => {
      const raised = this.#raised;
      if (raised === null)
        return;
      const target = this.#target() ?? this.#height;
      try {
        await this.#deps.window.setHeight(target, -raised);
        this.#height = target;
      } finally {
        this.#raised = null;
      }
    });
  }

  /** 창이 있는 모니터에서 창 위아래로 남은 화면 공간 (WND-10 "아래 공간이 모자라면"). */
  async roomAround(): Promise<{ above: number; below: number }> {
    const [bounds, screen] = await Promise.all([this.#deps.window.bounds(), this.#deps.window.screen()]);
    return spaceAround(bounds, screen.monitors, screen.workAreas, screen.primaryWorkArea);
  }

  /**
   * window.resize는 기다림 없이 바로 부른다. 그 전에 IPC를 기다리면 그 사이 놓은 pointer를 adapter가 놓쳐
   * 크기 조절이 끝나지 않고 저장도 되지 않는다. 그래서 끌기 범위는 마지막으로 읽어 둔 작업 영역 높이로 정한다.
   * 예외: apply()가 아직 돌지 않아 읽어 둔 값이 없으면 screen()을 먼저 기다린다(보통 흐름은 아니다).
   * 모니터 구성이 바뀌었을 수 있으므로 화면은 함께 다시 읽고, 놓은 뒤 그 높이로 맞춰 저장하고 기억한다(WND-05).
   * 놓은 높이가 새 최대 높이이고, 그보다 내용이 짧으면 화면이 다음 fitToContent로 줄인다 (WND-03).
   */
  async resize(edge: ResizeEdge, start: PointerStart): Promise<void> {
    const { window, settings } = this.#deps;
    this.#resizing = true;
    try {
      const known = this.#workAreaHeight ?? (await window.screen()).primaryWorkArea.height;
      // 거부를 바로 받아 두어, window.resize가 먼저 실패해도 처리하지 않은 거부로 남지 않게 한다.
      const fresh = window.screen().then((screen) => screen.primaryWorkArea.height, () => known);
      const rect = await window.resize(edge, start, resizeLimits(known));
      this.#cancelPending();
      const workAreaHeight = await fresh;
      this.#workAreaHeight = workAreaHeight;
      this.#height = rect.height;
      const size = resolveWidgetSize(rect.width, rect.height, workAreaHeight);
      await settings.update({ left: rect.left, top: rect.top, width: size.width, maxHeight: size.maxHeight });
    } finally {
      this.#resizing = false;
    }
  }

  /** 종료나 업데이트로 다시 띄우기 전에 지금 위치를 저장한다. 메뉴로 늘렸으면 먼저 되돌린다. 실패해도 던지지 않는다 (WND-14). */
  async captureForQuit(): Promise<void> {
    this.#cancelPending();
    await this.restore().catch(() => undefined);
    await this.#savePosition();
  }

  dispose(): void {
    this.#cancelPending();
    this.#stopMoved?.();
    this.#stopMoved = null;
  }

  #target(): number | null {
    return this.#contentHeight === null ? null : Math.min(Math.ceil(this.#contentHeight), this.maxHeight);
  }

  async #fit(): Promise<void> {
    const target = this.#target();
    if (target === null || target === this.#height)
      return;
    await this.#deps.window.setHeight(target, 0);
    this.#height = target;
  }

  #frame(task: () => Promise<void>): Promise<void> {
    const run = this.#frames.then(task);
    this.#frames = run.catch(() => undefined);
    return run;
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

  /** 메뉴로 창 위쪽을 올린 동안은 사용자가 옮긴 위치가 아니므로 저장하지 않는다. 되돌릴 때 다시 이동 신호가 온다. */
  async #savePosition(): Promise<void> {
    if (this.#raised !== null)
      return;
    try {
      const bounds = await this.#deps.window.bounds();
      await this.#deps.settings.update({ left: bounds.left, top: bounds.top });
    } catch {
      // 위치를 읽지 못하면 이번 저장은 건너뛴다. 설정 저장 실패는 SettingsService가 조용히 넘긴다(STORE-17).
    }
  }
}
```

- [ ] **Step 9: 통과 확인**

Run: `pnpm vitest run src/domain/window-geometry.test.ts src/application/window-placement.test.ts src/adapters/tauri/window-controller.test.ts`
Expected: PASS (기존 테스트 포함)

Run: Global Constraints의 Task 끝 검사
Expected: 모두 통과. 시험 화면(`App.svelte`)은 아직 `windowController.show`·`startDragging`을 직접 부르지만 port에 그대로 있으므로 타입 검사가 통과한다.

- [ ] **Step 10: 커밋**

```bash
git add src/domain/window-geometry.ts src/domain/window-geometry.test.ts src/application/ports/window-controller.ts src/application/window-placement.ts src/application/window-placement.test.ts src/adapters/tauri/window-controller.ts src/adapters/tauri/window-controller.test.ts src/testing/fake-window-controller.ts
git commit -m "feat: 창 높이를 내용에 맞추고 메뉴가 열린 동안 창을 늘렸다 되돌림"
```

---

### Task 4: 종료 다시 시도와 시작 경로

**spec:** START-08(종료 실패 뒤 다시 누르기), PERF-01(자동 실행 등록을 기다리지 않음), START-02·START-06(그대로 지킴)

**Files:**
- Modify: `src/application/lifecycle.ts`, `src/application/startup.ts`, `src/application/launch.ts`(OS 종료 요청의 거부 처리, 리뷰 M3)
- Modify: `src/testing/fake-process.ts` (`failExit`)
- Test: `src/application/lifecycle.test.ts`, `src/application/startup.test.ts`, `src/application/launch.test.ts`

**Interfaces:**
- Consumes: `AppProcess`, `AutoStart`, `SettingsService`
- Produces:
  - `StartupResult`의 `ready`에 `autoStartDone: Promise<void>`가 더해진다(결코 거부되지 않는다). `launchApp`은 쓰지 않는다.
  - `AppLifecycle.quit()`은 `exit()`가 실패하면 거부하고, 다음 `quit()`이 처음부터 다시 한다.
  - `FakeProcess.failExit: boolean`

- [ ] **Step 1: 실패하는 테스트 쓰기**

`src/testing/fake-process.ts`의 `exit`을 바꾸고 필드를 더한다:

```ts
  exits = 0;
  /** exit이 실패한다. 부른 횟수는 센다. */
  failExit = false;
  readonly #listeners = new Set<() => void>();

  async exit(): Promise<void> {
    this.exits++;
    if (this.failExit)
      throw new Error('끝내지 못했어요');
  }
```

`src/application/lifecycle.test.ts`의 `'START-08 여러 번 눌러도 한 번만 끝낸다'` 다음에 더한다:

```ts
  it('START-08 끝내기에 실패하면 다시 눌러 끝낼 수 있다', async () => {
    const { lifecycle: app } = await lifecycle();
    process.failExit = true;
    await expect(app.quit()).rejects.toThrow('끝내지 못했어요');
    process.failExit = false;
    await app.quit();
    expect(process.exits).toBe(2);
  });
```

`src/application/startup.test.ts`의 `'START-07 …'` 다음에 더한다:

```ts
  it('PERF-01 자동 실행 등록을 기다리지 않고 준비를 마친다', async () => {
    autoStart.gate = new Promise(() => undefined);
    const result = await start();
    expect(result.kind).toBe('ready');
    expect(autoStart.calls).toEqual(['enable']);
    expect(JSON.parse(files.files.get(SETTINGS_FILE) ?? '')).toMatchObject({ pinned: true });
  });

  it('START-06 자동 실행이 끝나기를 기다리는 약속은 실패해도 거부되지 않는다', async () => {
    autoStart.failEnable = true;
    const result = await start();
    if (result.kind !== 'ready')
      throw new Error('준비되지 않았어요');
    await expect(result.autoStartDone).resolves.toBeUndefined();
  });
```

`src/application/launch.test.ts`의 `describe` 안 끝에 더한다. 메뉴 막대 "종료"나 창 닫기로 끝내다 실패해도 처리하지 않은 거부가 남지 않아야 한다(Rust 대비책이 3초 뒤 끝낸다):

```ts
  it('START-08 OS 종료 요청으로 끝내다 실패해도 처리하지 않은 거부를 남기지 않는다', async () => {
    const result = await launch();
    expect(result.kind).toBe('running');
    process.failExit = true;
    process.requestQuit();
    await flush();
    expect(process.exits).toBe(1);
  });
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm vitest run src/application/lifecycle.test.ts src/application/startup.test.ts src/application/launch.test.ts`
Expected: FAIL — 종료 다시 시도 테스트는 `exits`가 1에서 멈춘다(거부된 약속을 그대로 돌려준다). PERF-01 테스트는 5초 시간 초과. OS 종료 요청 테스트는 Vitest가 `Unhandled Rejection: 끝내지 못했어요`로 실패시킨다.

- [ ] **Step 3: 구현**

`src/application/lifecycle.ts`의 `quit()`을 바꾼다:

```ts
  /** 한 번만 끝낸다. 끝내기에 실패하면 거부하고, 다음에 누르면 처음부터 다시 한다 (START-08). */
  quit(): Promise<void> {
    this.#quitting ??= this.#quit().catch((error: unknown) => {
      this.#quitting = null;
      throw error;
    });
    return this.#quitting;
  }
```

`src/application/startup.ts`:
- `StartupResult`의 `ready` 줄을 바꾼다:

```ts
  | { kind: 'ready'; session: TodoSession; settings: SettingsService; autoStartDone: Promise<void> };
```

- 함수 설명과 본문의 자동 실행 부분을 바꾼다(할 일 읽기 다음부터 끝까지):

```ts
/**
 * 읽기에 실패하면 잠깐 다시 읽는다(STORE-20). 할 일을 먼저 읽는다. 읽지 못하면 자동 실행과 첫 설정 파일을 건드리지 않고 멈춘다(STORE-10).
 * 그다음 첫 설정 파일(START-02)과 자동 실행(START-02, START-03, START-07). 둘의 실패는 조용히 넘어간다(START-06).
 * 자동 실행 등록은 OS를 거쳐 시간이 걸릴 수 있어 기다리지 않는다(PERF-01). 끝나기를 기다려야 하면 autoStartDone을 쓴다.
 */
export async function startApp(deps: StartupDeps): Promise<StartupResult> {
  const files = new RetryingFileStore(deps.files, deps.timer);
  const settingsRepo = new SettingsRepository(files);
  const firstRun = !(await settingsRepo.exists());

  let session: TodoSession;
  try {
    session = await TodoSession.open(new TaskRepository(files, deps.clock), deps.clock, deps.newId);
  } catch (error) {
    if (error instanceof CannotOpenError)
      return { kind: 'cannotOpen', path: error.path, detail: error.detail };
    throw error;
  }

  const settings = await SettingsService.open(settingsRepo);
  if (firstRun)
    await settings.save();

  const autoStartDone = deps.appInfo.isDevBuild
    ? Promise.resolve()
    : quietly(() => (firstRun ? deps.autoStart.enable() : deps.autoStart.refresh()));
  return { kind: 'ready', session, settings, autoStartDone };
}
```

`src/application/launch.ts`의 OS 종료 요청 줄을 바꾼다:

```ts
  // 끝내기에 실패하면 Rust 대비책(QUIT_FALLBACK_DELAY, 3초)이 끝낸다. 거부를 처리하지 않은 채 두지 않는다.
  deps.process.onQuitRequested(() => void lifecycle.quit().catch(() => undefined));
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm vitest run src/application`
Expected: PASS (launch.test 포함 기존 테스트 모두)

Run: Global Constraints의 Task 끝 검사
Expected: 모두 통과

- [ ] **Step 5: 커밋**

```bash
git add src/application/lifecycle.ts src/application/lifecycle.test.ts src/application/startup.ts src/application/startup.test.ts src/application/launch.ts src/application/launch.test.ts src/testing/fake-process.ts
git commit -m "fix: 종료 실패 뒤 다시 끝낼 수 있게 하고 켤 때 자동 실행 등록을 기다리지 않음"
```

---

### Task 5: Rust 정리 — STORE-10 빈 창과 레지스트리 읽기 권한

**spec:** STORE-10(대화 상자 뒤에 빈 창이 없다), WIN-03(레지스트리 판정은 그대로)

**Files:**
- Modify: `src-tauri/crates/core/src/show_gate.rs` (`hide`)
- Modify: `src-tauri/src/commands/mod.rs` (`keep_hidden`)
- Modify: `src-tauri/crates/windows/src/run_key.rs` (읽기는 읽기 권한으로)

**Interfaces:**
- Produces: `ShowGate::hide(&self)` — 이미 정했어도 숨김으로 바꾼다.

- [ ] **Step 1: 실패하는 Rust 테스트 쓰기**

`src-tauri/crates/core/src/show_gate.rs`의 `tests` 모듈에서 `is_hidden_only_after_hidden_decision` 다음에 더한다:

```rust
    /// STORE-10 대비책이 먼저 창을 띄웠어도 숨긴 채 두기가 이긴다
    #[test]
    fn hide_overrides_shown() {
        let gate = ShowGate::default();
        assert!(gate.claim(Decision::Shown));
        gate.hide();
        assert_eq!(gate.decision(), Some(Decision::Hidden));
        assert!(gate.is_hidden());
        assert!(!gate.claim(Decision::Shown));
    }
```

- [ ] **Step 2: 실패 확인**

Run: `cargo test --manifest-path src-tauri/Cargo.toml -p todowidget-core show_gate`
Expected: FAIL — `no method named 'hide' found for struct 'ShowGate'`

- [ ] **Step 3: 구현**

`src-tauri/crates/core/src/show_gate.rs`의 `impl ShowGate`에서 `claim` 다음에 더한다:

```rust
    /// 이미 띄우기로 정했어도 숨긴 채 두기로 바꾼다. STORE-10 대화 상자를 띄운 뒤에는 앱이 곧 끝나므로 늘 숨김이 맞다.
    /// 시작이 `SHOW_FALLBACK_DELAY`를 넘겨 대비책이 먼저 창을 띄운 경우에도 대화 상자 뒤에 빈 창이 남지 않게 한다.
    pub fn hide(&self) {
        self.state.store(HIDDEN, Ordering::SeqCst);
    }
```

`src-tauri/src/commands/mod.rs`의 `keep_hidden`을 바꾼다:

```rust
/// 시작하지 못해 대화 상자만 띄우고 끝낼 때(STORE-10) 대비책·다시 실행·메뉴 막대 아이콘이 빈 창을 띄우지 않게 한다.
/// 대비책이나 다시 실행이 이미 창을 띄웠어도 다시 숨긴다.
#[tauri::command]
pub fn keep_hidden(app: AppHandle, gate: State<'_, ShowGate>) {
    gate.hide();
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
}
```

`src-tauri/crates/windows/src/run_key.rs`에서 `open` 함수를 둘로 나눈다:

```rust
/// 읽기만 한다. 키가 없으면 `None`.
fn open_read(path: &str) -> Result<Option<Key>, String> {
    match CURRENT_USER.open(path) {
        Ok(key) => Ok(Some(key)),
        Err(error) if is_missing(&error) => Ok(None),
        Err(error) => Err(message(error)),
    }
}

/// 값을 지울 수 있게 읽고 쓰기로 연다. 키가 없으면 `None`.
fn open_write(path: &str) -> Result<Option<Key>, String> {
    match CURRENT_USER.options().read().write().open(path) {
        Ok(key) => Ok(Some(key)),
        Err(error) if is_missing(&error) => Ok(None),
        Err(error) => Err(message(error)),
    }
}
```

같은 파일에서 `remove_value`는 `open_write`를, `RunKey::read`와 `RunKey::read_approved`는 `open_read`를 부르도록 바꾼다. 세 줄이 이렇게 바뀐다(`read_approved` 줄은 길어져 rustfmt가 나눈다):

```rust
    let Some(key) = open_write(path)? else { return Ok(()) };
```

```rust
        let Some(key) = open_read(RUN)? else { return Ok(None) };
```

```rust
        let Some(key) = open_read(APPROVED)? else {
            return Ok(None);
        };
```

바꾼 뒤 `cargo fmt --manifest-path src-tauri/Cargo.toml --all`를 한 번 돌린다.

- [ ] **Step 4: 통과 확인**

Run: `cargo test --manifest-path src-tauri/Cargo.toml --workspace --exclude todo-widget`
Expected: PASS

Run: Global Constraints의 Task 끝 검사와 Windows 대상 clippy
Expected: 모두 통과. 레지스트리 실제 동작(`real_registry_round_trip`, WIN-03)은 Task 15의 Windows CI에서 본다.

- [ ] **Step 5: 커밋**

```bash
git add src-tauri/crates/core/src/show_gate.rs src-tauri/src/commands/mod.rs src-tauri/crates/windows/src/run_key.rs
git commit -m "fix: 대비책이 띄운 뒤의 STORE-10에도 빈 창을 숨기고 레지스트리는 읽기 권한으로 읽음"
```

---

### Task 6: 메뉴 막대 문구와 아이콘

**spec:** MAC-03(단색 아이콘), MAC-04(문구는 화면 언어), I18N-02(Rust에 문구를 두지 않는다)

**Files:**
- Create: `src-tauri/icons/source/app-icon.svg`, `src-tauri/icons/source/tray-template.svg`
- Create (생성물): `src-tauri/icons/tray-template.png`
- Modify (생성물로 덮어씀): `src-tauri/icons/`에 지금 있는 16개 모두 — `32x32.png`, `128x128.png`, `128x128@2x.png`, `icon.icns`, `icon.ico`, `icon.png`, `Square30x30Logo.png`, `Square44x44Logo.png`, `Square71x71Logo.png`, `Square89x89Logo.png`, `Square107x107Logo.png`, `Square142x142Logo.png`, `Square150x150Logo.png`, `Square284x284Logo.png`, `Square310x310Logo.png`, `StoreLogo.png`
- Modify: `src-tauri/src/platform/macos.rs`, `src-tauri/src/platform/windows.rs`, `src-tauri/src/platform/mod.rs`, `src-tauri/src/commands/mod.rs`, `src-tauri/src/lib.rs`
- Create: `src/adapters/tauri/tray.ts`
- Test: `src/adapters/tauri/tray.test.ts`, `src/tauri-config.test.ts`

**Interfaces:**
- Produces:
  - Rust 명령 `set_tray_labels(open: String, quit: String)`. macOS는 메뉴 막대 메뉴 두 항목의 글을 바꾸고, Windows는 아무것도 하지 않는다.
  - `crate::platform::set_tray_labels(app: &AppHandle, open: &str, quit: &str)`
  - TS `setTrayLabels(invoke: Invoke, labels: { open: string; quit: string }): Promise<void>` (`src/adapters/tauri/tray.ts`). Task 12에서 `main.ts`가 `t('tray.open')`, `t('menu.quit')`로 부른다.

- [ ] **Step 1: 실패하는 테스트 쓰기**

`src/adapters/tauri/tray.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { setTrayLabels } from './tray.ts';

describe('메뉴 막대 문구', () => {
  it('MAC-04 I18N-02 화면 언어 사전의 글을 Rust 명령으로 넘긴다', async () => {
    const invoke = vi.fn(async (_command: string, _args?: Record<string, unknown>) => undefined);
    await setTrayLabels(invoke, { open: '열기', quit: '종료' });
    expect(invoke).toHaveBeenCalledWith('set_tray_labels', { open: '열기', quit: '종료' });
  });
});
```

`src/tauri-config.test.ts` 맨 위 import를 `import { existsSync, readFileSync } from 'node:fs';`로 바꾸고, `describe('Tauri 설정', …)` 안 끝에 더한다:

```ts
  it('MAC-03 메뉴 막대 아이콘은 18pt @2x(36×36) PNG이고, 아이콘은 저장소의 SVG 원본에서 만든다', () => {
    const png = readFileSync(new URL('../src-tauri/icons/tray-template.png', import.meta.url));
    expect(png.subarray(1, 4).toString('latin1')).toBe('PNG');
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([36, 36]);
    expect(existsSync(new URL('../src-tauri/icons/source/app-icon.svg', import.meta.url))).toBe(true);
    expect(existsSync(new URL('../src-tauri/icons/source/tray-template.svg', import.meta.url))).toBe(true);
  });

  it('MAC-04 I18N-02 메뉴 막대 메뉴의 기본 문구를 Rust에 한국어로 두지 않는다', () => {
    const macos = readFileSync(new URL('../src-tauri/src/platform/macos.rs', import.meta.url), 'utf8');
    const items = [...macos.matchAll(/MenuItem::with_id\([^)]*\)/g)].map((m) => m[0]);
    expect(items).toHaveLength(2);
    expect(items.join('\n')).not.toMatch(/\p{Script=Hangul}/u);
  });
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm vitest run src/adapters/tauri/tray.test.ts src/tauri-config.test.ts`
Expected: FAIL — `Failed to resolve import "./tray.ts"`, `ENOENT ... tray-template.png`, 한글 검사 실패

- [ ] **Step 3: SVG 원본 쓰기**

`src-tauri/icons/source/app-icon.svg` (시안의 앱 아이콘. 상태 동그라미 세 개):

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FBF8F3"/>
      <stop offset="1" stop-color="#EFE9E0"/>
    </linearGradient>
  </defs>
  <rect x="6" y="6" width="116" height="116" rx="27" fill="url(#bg)" stroke="#E2DCD2"/>
  <rect x="22" y="30" width="84" height="20" rx="7" fill="#FDF1E8"/>
  <circle cx="34" cy="40" r="6" fill="none" stroke="#E8935A" stroke-width="2.6"/>
  <circle cx="34" cy="40" r="2.6" fill="#E8935A"/>
  <rect x="46" y="37.5" width="48" height="5" rx="2.5" fill="#2B2A28" opacity=".75"/>
  <circle cx="34" cy="64" r="6" fill="none" stroke="#A29D95" stroke-width="2.6"/>
  <rect x="46" y="61.5" width="36" height="5" rx="2.5" fill="#2B2A28" opacity=".75"/>
  <circle cx="34" cy="88" r="7.3" fill="#7FAE8A"/>
  <rect x="46" y="85.5" width="42" height="5" rx="2.5" fill="#8C8983" opacity=".7"/>
</svg>
```

`src-tauri/icons/source/tray-template.svg` (하는 중 동그라미. template이라 색은 무시되고 알파만 쓴다):

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
  <circle cx="9" cy="9" r="6.6" fill="none" stroke="#000" stroke-width="1.6"/>
  <circle cx="9" cy="9" r="2.8" fill="#000"/>
</svg>
```

- [ ] **Step 4: PNG·icns·ico 만들기 (D14)**

`tauri icon`은 기본으로 android·ios 폴더까지 만들므로 임시 폴더에 만들고 지금 있는 파일만 옮긴다.

```bash
TMP=$(mktemp -d)
pnpm tauri icon src-tauri/icons/source/app-icon.svg -o "$TMP/app"
# 저장소에 지금 있는 아이콘 파일만 새로 만든 것으로 바꾼다. Tauri 기본 그림이 남지 않게 모두 돈다.
for path in src-tauri/icons/*.png src-tauri/icons/*.icns src-tauri/icons/*.ico; do
  f=$(basename "$path")
  [ -f "$TMP/app/$f" ] && cp "$TMP/app/$f" "$path"
done
pnpm tauri icon src-tauri/icons/source/tray-template.svg --png 36 -o "$TMP/tray"
cp "$TMP/tray/36x36.png" src-tauri/icons/tray-template.png
rm -rf "$TMP"
git status --short src-tauri/icons
```

Expected: 기존 16개가 바뀌고(` M`) `tray-template.png` 하나와 `source/` SVG 둘이 생긴다(`??`). 모두 17개 PNG·icns·ico와 SVG 둘이다. `src-tauri/icons/android`·`ios`는 생기지 않는다.

- [ ] **Step 5: Rust 구현**

`src-tauri/src/platform/macos.rs`:
- `use tauri::{…}` 블록을 바꾼다:

```rust
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    App, AppHandle, Manager, RunEvent, WebviewWindow, Wry,
};
```

- `install_tray`를 바꾸고 그 위에 상태 타입을 더한다:

```rust
/// 메뉴 막대 메뉴의 두 항목. 글은 JS가 화면 언어 사전으로 바꾼다(`set_tray_labels`, MAC-04, I18N-02).
struct TrayLabels {
    open: MenuItem<Wry>,
    quit: MenuItem<Wry>,
}

/// 메뉴 막대 아이콘 (MAC-03, MAC-04). 아이콘은 하는 중 동그라미 template 이미지라 밝은·어두운 메뉴 막대에서 OS가 색을 바꾼다.
fn install_tray(app: &App) -> tauri::Result<()> {
    // 화면이 사전 문구로 바꾸기 전 잠깐의 기본값이다. Rust에는 화면 언어 사전을 두지 않는다.
    let open = MenuItem::with_id(app, "open", "Open", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open, &quit])?;
    TrayIconBuilder::with_id("main")
        // 36×36 한 장이다. tray-icon이 높이를 18pt로 맞추므로 @2x 해상도가 된다.
        .icon(tauri::include_image!("icons/tray-template.png"))
        .icon_as_template(true)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open" => crate::commands::reveal(app),
            "quit" => crate::commands::request_quit(app),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                crate::commands::reveal(tray.app_handle());
            }
        })
        .build(app)?;
    app.manage(TrayLabels { open, quit });
    Ok(())
}

/// 메뉴 막대 메뉴 글을 화면 언어 문구로 바꾼다 (MAC-04).
pub fn set_tray_labels(app: &AppHandle, open: &str, quit: &str) {
    if let Some(labels) = app.try_state::<TrayLabels>() {
        let _ = labels.open.set_text(open);
        let _ = labels.quit.set_text(quit);
    }
}
```

`src-tauri/src/platform/windows.rs`의 `on_run_event` 다음에 더한다:

```rust
/// Windows에는 메뉴 막대 아이콘이 없다(WIN-02).
pub fn set_tray_labels(_app: &AppHandle, _open: &str, _quit: &str) {}
```

`src-tauri/src/platform/mod.rs`의 두 `pub use` 줄에 `set_tray_labels`를 더한다:

```rust
pub use macos::{auto_start, on_run_event, set_frame, set_tray_labels, setup, OS_NAME};
```

```rust
pub use windows::{auto_start, on_run_event, set_frame, set_tray_labels, setup, OS_NAME};
```

`src-tauri/src/commands/mod.rs`의 `set_pinned` 다음에 더한다:

```rust
/// 메뉴 막대 메뉴 글 (MAC-04). JS가 화면 언어 사전의 `tray.open`, `menu.quit`을 넘긴다(I18N-02).
#[tauri::command]
pub fn set_tray_labels(app: AppHandle, open: String, quit: String) {
    crate::platform::set_tray_labels(&app, &open, &quit);
}
```

`src-tauri/src/lib.rs`의 `generate_handler!` 목록에서 `commands::set_pinned,` 다음 줄에 `commands::set_tray_labels,`를 더한다.

- [ ] **Step 6: TS adapter 구현**

`src/adapters/tauri/tray.ts`:

```ts
import type { Invoke } from './invoke.ts';

/** macOS 메뉴 막대 메뉴의 "열기"·"종료" 글 (MAC-04). 화면 언어 사전에서 꺼낸 글을 넘긴다(I18N-02). Windows에서는 Rust가 아무것도 하지 않는다. */
export async function setTrayLabels(invoke: Invoke, labels: { open: string; quit: string }): Promise<void> {
  await invoke('set_tray_labels', { open: labels.open, quit: labels.quit });
}
```

- [ ] **Step 7: 통과 확인**

Run: `pnpm vitest run src/adapters/tauri/tray.test.ts src/tauri-config.test.ts`
Expected: PASS

Run: Global Constraints의 Task 끝 검사
Expected: 모두 통과. `cargo clippy`가 macOS 코드(`include_image!`, `TrayLabels`)를 컴파일한다. `windows.rs`는 Task 15의 Windows CI에서 컴파일된다.

- [ ] **Step 8: 커밋**

```bash
git add src-tauri/icons src-tauri/src/platform src-tauri/src/commands/mod.rs src-tauri/src/lib.rs src/adapters/tauri/tray.ts src/adapters/tauri/tray.test.ts src/tauri-config.test.ts
git commit -m "feat: 앱 아이콘과 메뉴 막대 template 아이콘을 만들고 메뉴 막대 문구를 화면 언어로 바꾸는 명령을 더함"
```

---
### Task 7: 화면 규칙 도우미 (순수 TS)

**spec:** INPUT-05·14(Enter), INPUT-16(이름 칸 붙여넣기), LIST-13·14·15(섹션 높이), WND-10(메뉴 위치, 창 늘리기), INPUT-12·WND-10(방향키 이동, D6), WND-12(휠 칸 세기, D26)

**Files:**
- Create: `src/presentation/input/enter-key.ts`, `src/presentation/input/rename-paste.ts`, `src/presentation/input/wheel-steps.ts`, `src/presentation/layout/section-heights.ts`, `src/presentation/menu/menu-placement.ts`, `src/presentation/menu/menu-navigation.ts`
- Modify: `spec/behavior/window.md` (WND-12 휠 방향 한 문장, PM 결정 P6)
- Test: 같은 폴더의 `enter-key.test.ts`, `rename-paste.test.ts`, `wheel-steps.test.ts`, `section-heights.test.ts`, `menu-placement.test.ts`, `menu-navigation.test.ts`

**Interfaces:**
- Consumes: `allocateSectionHeights` (`src/domain/section-layout.ts`), `SHADOW_MARGIN` (Task 3)
- Produces:
  - `isCommitEnter(event: { key: string; isComposing: boolean; keyCode: number }): boolean`
  - `joinLines(text: string): string`, `insertText(value: string, start: number, end: number, text: string): { value: string; caret: number }`
  - `PIXELS_PER_STEP = 50`, `WHEEL_NOTCH = 120`, `class WheelSteps { steps(event: { deltaY: number; deltaMode: number; invertedFromDevice?: boolean; wheelDeltaY?: number }): number }` — 양수는 실제로 위로(더 투명하게) 굴린 칸 수, 음수는 아래로, 0은 칸이 아님
  - `interface SectionMeasure { chrome; content; firstRow; expanded }`, `interface ListHeights { done: number | null; todo: number | null }`, `sectionListHeights(available: number, sections: { done: SectionMeasure | null; todo: SectionMeasure | null }): ListHeights`, `sameListHeights(a: ListHeights, b: ListHeights): boolean`
  - `MENU_GAP = 4`, `interface Allowance { top; bottom }`, `MENU_SHADOW: Allowance`, `interface Anchor { top; bottom; right }`, `interface Size { width; height }`, `interface Room { above; below }`, `interface Position { left; top }`, `placeMoreMenu(anchor, menu, windowHeight, room): Position`, `placeContextMenu(at: { x; y }, menu: Size, window: Size, room: Room): Position`, `popupExtent(popup: { top; bottom }, windowHeight: number, allowance: Allowance): { raise: number; height: number } | null`
  - `moveHighlight(selectable: readonly boolean[], current: number | null, step: 1 | -1): number | null`

- [ ] **Step 0: spec — 휠 방향 (PM 결정 P6, spec이 먼저다)**

`spec/behavior/window.md`:
- 변경 이력 맨 아래에 더한다:

```markdown
- 2026-10-06: PM 결정 — WND-12 휠 방향은 OS의 스크롤 방향 설정(macOS "자연스러운 스크롤")과 관계없이 손가락·휠의 실제 방향을 따른다고 적었다. 두 OS에서 같다
```

- WND-12 `- 결과:` 줄에서 `(위로 굴리면 더 투명하게, 아래로 굴리면 덜 투명하게, 0~40% 안에서).` 바로 뒤에 같은 줄로 넣는다:

```markdown
방향은 OS의 스크롤 방향 설정과 관계없이 손가락·휠의 실제 방향을 따른다.
```

Run: `pnpm spec:check`
Expected: `통과`

- [ ] **Step 1: 실패하는 테스트 쓰기**

`src/presentation/input/enter-key.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { isCommitEnter } from './enter-key.ts';

const key = (overrides: Partial<{ key: string; isComposing: boolean; keyCode: number }> = {}) => ({ key: 'Enter', isComposing: false, keyCode: 13, ...overrides });

describe('추가·저장에 쓰는 Enter', () => {
  it('INPUT-05 INPUT-14 조합 중이 아닌 Enter만 쓴다', () => {
    expect(isCommitEnter(key())).toBe(true);
    expect(isCommitEnter(key({ key: 'a' }))).toBe(false);
  });

  it('INPUT-05 INPUT-14 조합을 확정하는 Enter는 쓰지 않는다', () => {
    expect(isCommitEnter(key({ isComposing: true, keyCode: 229 }))).toBe(false);
    expect(isCommitEnter(key({ isComposing: true }))).toBe(false);
  });

  it('INPUT-05 조합 중이 아니라고 하면서 keyCode가 229인 Enter(Safari 계열)도 확정용이라 쓰지 않는다', () => {
    expect(isCommitEnter(key({ keyCode: 229 }))).toBe(false);
  });
});
```

`src/presentation/input/rename-paste.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { insertText, joinLines } from './rename-paste.ts';

describe('이름 바꾸기 칸에 붙여넣기', () => {
  it('INPUT-16 줄바꿈 하나를 공백 하나로 바꾼다', () => {
    expect(joinLines('보고서\r\n초안\n쓰기\r끝')).toBe('보고서 초안 쓰기 끝');
    expect(joinLines('보고서\n\n초안\n')).toBe('보고서  초안 ');
  });

  it('INPUT-16 선택 영역 자리에 넣고 커서를 넣은 글 바로 뒤에 둔다', () => {
    expect(insertText('초안', 2, 2, 'A B')).toEqual({ value: '초안A B', caret: 5 });
    expect(insertText('보고서 초안', 0, 3, '계획서')).toEqual({ value: '계획서 초안', caret: 3 });
  });
});
```

`src/presentation/input/wheel-steps.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { PIXELS_PER_STEP, WHEEL_NOTCH, WheelSteps } from './wheel-steps.ts';

describe('투명도 휠 칸 세기', () => {
  it('WND-12 줄 단위 휠(마우스 휠 한 칸)은 이벤트 하나가 한 칸이다. 위로 굴리면 양수다', () => {
    const wheel = new WheelSteps();
    expect([wheel.steps({ deltaY: -3, deltaMode: 1 }), wheel.steps({ deltaY: 3, deltaMode: 1 })]).toEqual([1, -1]);
  });

  it('WND-12 마우스 휠 칸(wheelDeltaY가 120의 배수)은 deltaY 크기와 관계없이 한 칸에 한 번이다', () => {
    const wheel = new WheelSteps();
    expect(WHEEL_NOTCH).toBe(120);
    expect(wheel.steps({ deltaY: -100, deltaMode: 0, wheelDeltaY: 120 })).toBe(1);
    expect(wheel.steps({ deltaY: 125, deltaMode: 0, wheelDeltaY: -120 })).toBe(-1);
    expect(wheel.steps({ deltaY: -200, deltaMode: 0, wheelDeltaY: 240 })).toBe(2);
    expect(wheel.steps({ deltaY: 3, deltaMode: 0, wheelDeltaY: -120, invertedFromDevice: true })).toBe(1);
  });

  it('WND-12 세로 움직임이 없는 휠(가로 쓸기, Shift+휠)은 칸이 아니다', () => {
    const wheel = new WheelSteps();
    expect([wheel.steps({ deltaY: 0, deltaMode: 0 }), wheel.steps({ deltaY: 0, deltaMode: 1 })]).toEqual([0, 0]);
  });

  it('WND-12 픽셀 단위 휠(트랙패드)은 50px 쌓일 때마다 한 칸이다', () => {
    const wheel = new WheelSteps();
    expect(PIXELS_PER_STEP).toBe(50);
    const steps = [-20, -20, -20, -40, -100].map((deltaY) => wheel.steps({ deltaY, deltaMode: 0 }));
    expect(steps).toEqual([0, 0, 1, 1, 2]);
  });

  it('WND-12 macOS 자연스러운 스크롤로 뒤집힌 값이면 실제 방향으로 되돌린다', () => {
    const wheel = new WheelSteps();
    expect(wheel.steps({ deltaY: 3, deltaMode: 1, invertedFromDevice: true })).toBe(1);
    expect(wheel.steps({ deltaY: -3, deltaMode: 1, invertedFromDevice: true })).toBe(-1);
    expect(wheel.steps({ deltaY: 100, deltaMode: 0, invertedFromDevice: true })).toBe(2);
  });

  it('WND-12 방향이 바뀌면 쌓아 둔 것을 버리고 반대쪽으로 새로 쌓는다', () => {
    const wheel = new WheelSteps();
    const steps = [-40, 30, 30].map((deltaY) => wheel.steps({ deltaY, deltaMode: 0 }));
    expect(steps).toEqual([0, 0, -1]);
  });
});
```

`src/presentation/layout/section-heights.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { type SectionMeasure, sameListHeights, sectionListHeights } from './section-heights.ts';

/**
 * v1.4 치수: 끝낸 일 섹션은 위 8 + 접힘 줄 34 + 4, 할 일 섹션은 위 12 + 제목 줄 24.
 * 항목 한 줄은 38 = 줄 36 + 위아래 margin 1씩. 줄 묶음(.rows)이 flex column이라 margin이 겹치지 않아 화면에서도 이 값으로 잰다.
 */
const done = (content: number, expanded = true): SectionMeasure => ({ chrome: expanded ? 46 : 42, content: expanded ? content : 0, firstRow: 38, expanded });
const todo = (content: number, expanded = true): SectionMeasure => ({ chrome: 36, content: expanded ? content : 0, firstRow: 38, expanded });

describe('섹션 높이', () => {
  it('LIST-13 높이가 넉넉하면 목록 높이를 제한하지 않는다', () => {
    // 필요 [100, 200], 가용 400
    expect(sectionListHeights(400, { done: done(54), todo: todo(164) })).toEqual({ done: null, todo: null });
  });

  it('LIST-14 짧은 섹션은 다 보이고 긴 섹션이 나머지를 쓴다 (필요 [100, 900] → [100, 300])', () => {
    const heights = sectionListHeights(400, { done: done(54), todo: todo(864) });
    expect(heights.done).toBeCloseTo(54, 2);
    expect(heights.todo).toBeCloseTo(264, 2);
    expect((heights.done ?? 0) + 46 + (heights.todo ?? 0) + 36).toBeCloseTo(400, 2);
  });

  it('LIST-14 긴 섹션 둘은 똑같이 나눈다 (필요 [600, 900] → [200, 200])', () => {
    const heights = sectionListHeights(400, { done: done(554), todo: todo(864) });
    expect(heights.done).toBeCloseTo(154, 2);
    expect(heights.todo).toBeCloseTo(164, 2);
  });

  it('LIST-15 최소 높이(제목 줄 + 첫 항목) 아래로 줄지 않는다', () => {
    expect(sectionListHeights(100, { done: done(54), todo: todo(864) })).toEqual({ done: 38, todo: 38 });
  });

  it('LIST-15 접힌 섹션은 제목 줄만 쓰고 목록 높이는 정하지 않는다', () => {
    const heights = sectionListHeights(400, { done: done(0, false), todo: todo(900) });
    expect(heights.done).toBeNull();
    expect(heights.todo).toBeCloseTo(322, 2);
  });

  it('LIST-01 보이지 않는 섹션은 빼고 나눈다', () => {
    expect(sectionListHeights(300, { done: null, todo: todo(900) }).todo).toBeCloseTo(264, 2);
  });

  it('LIST-14 0.5 안의 차이는 같은 높이로 본다', () => {
    expect(sameListHeights({ done: 10, todo: null }, { done: 10.4, todo: null })).toBe(true);
    expect(sameListHeights({ done: 10, todo: null }, { done: 11, todo: null })).toBe(false);
    expect(sameListHeights({ done: null, todo: 5 }, { done: 0, todo: 5 })).toBe(false);
  });
});
```

`src/presentation/menu/menu-placement.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { MENU_SHADOW, placeContextMenu, placeMoreMenu, popupExtent } from './menu-placement.ts';

/** 폭 320 창의 ⋯ 버튼: 창 위 10 + 카드 위 여백 16에서 28 높이, 오른쪽 끝은 320 - 10 - 18. */
const more = { top: 26, bottom: 54, right: 292 };
const menu = { width: 222, height: 150 };

describe('메뉴 위치', () => {
  it('WND-10 ⋯ 메뉴는 버튼 바로 아래 4에 오른쪽 끝을 맞춰 뜬다', () => {
    expect(placeMoreMenu(more, menu, 300, { above: 24, below: 500 })).toEqual({ left: 70, top: 58 });
  });

  it('WND-10 창보다 길어도 창 아래 화면 공간에 들어가면 아래로 뜬다', () => {
    expect(placeMoreMenu(more, menu, 200, { above: 24, below: 100 })).toEqual({ left: 70, top: 58 });
  });

  it('WND-10 아래 공간이 모자라면 버튼 위로 뜬다', () => {
    expect(placeMoreMenu(more, menu, 200, { above: 400, below: 0 })).toEqual({ left: 70, top: -128 });
  });

  it('WND-10 위아래 모두 모자라면 아래로 뜬다', () => {
    expect(placeMoreMenu(more, menu, 200, { above: 50, below: 0 })).toEqual({ left: 70, top: 58 });
  });

  it('INPUT-12 우클릭 메뉴는 판 왼쪽 위가 커서 자리이고, 창 오른쪽을 넘지 않게 왼쪽으로 민다', () => {
    const size = { width: 150, height: 170 };
    const window = { width: 320, height: 300 };
    expect(placeContextMenu({ x: 100, y: 120 }, size, window, { above: 0, below: 500 })).toEqual({ left: 100, top: 120 });
    expect(placeContextMenu({ x: 250, y: 120 }, size, window, { above: 0, below: 500 })).toEqual({ left: 160, top: 120 });
  });

  it('INPUT-12 우클릭 메뉴는 아래 공간이 모자라고 위 공간이 있으면 커서 위로 뜬다', () => {
    expect(placeContextMenu({ x: 100, y: 120 }, { width: 150, height: 170 }, { width: 320, height: 300 }, { above: 100, below: 0 })).toEqual({ left: 100, top: -50 });
  });

  it('INPUT-12 위아래 모두 모자라면 공간이 더 넓은 쪽으로 뜬다', () => {
    const size = { width: 150, height: 170 };
    const window = { width: 320, height: 300 };
    expect(placeContextMenu({ x: 100, y: 120 }, size, window, { above: 0, below: 0 })).toEqual({ left: 100, top: 120 });
    expect(placeContextMenu({ x: 100, y: 250 }, size, window, { above: 0, below: 0 })).toEqual({ left: 100, top: 80 });
  });
});

describe('메뉴용 창 늘리기', () => {
  it('WND-10 판과 그림자가 창 안에 들어가면 늘리지 않는다', () => {
    expect(popupExtent({ top: 58, bottom: 208 }, 300, MENU_SHADOW)).toBeNull();
    expect(popupExtent({ top: 10, bottom: 190 }, 200, { top: 0, bottom: 10 })).toBeNull();
  });

  it('WND-10 판이 창 아래로 나가면 그림자까지 들어가게 높이를 늘린다', () => {
    expect(popupExtent({ top: 58, bottom: 258 }, 200, MENU_SHADOW)).toEqual({ raise: 0, height: 274 });
  });

  it('WND-10 판이 창 위로 나가면 창 위쪽을 올리고 그만큼 높이를 늘린다', () => {
    expect(popupExtent({ top: -128, bottom: 22 }, 200, MENU_SHADOW)).toEqual({ raise: 134, height: 334 });
  });
});
```

`src/presentation/menu/menu-navigation.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { moveHighlight } from './menu-navigation.ts';

/** ⋯ 메뉴: 자동 실행, 투명도 줄, 구분선, 초기화(비활성), 종료. */
const selectable = [true, false, false, false, true];

describe('메뉴 방향키', () => {
  it('WND-10 INPUT-12 아래 방향키는 고를 수 있는 다음 항목으로 가고, 끝에서는 처음으로 돈다', () => {
    expect(moveHighlight(selectable, null, 1)).toBe(0);
    expect(moveHighlight(selectable, 0, 1)).toBe(4);
    expect(moveHighlight(selectable, 4, 1)).toBe(0);
  });

  it('WND-10 INPUT-12 위 방향키는 거꾸로 돈다', () => {
    expect(moveHighlight(selectable, null, -1)).toBe(4);
    expect(moveHighlight(selectable, 0, -1)).toBe(4);
    expect(moveHighlight(selectable, 4, -1)).toBe(0);
  });

  it('INPUT-19 고를 수 있는 항목이 없으면 강조하지 않는다', () => {
    expect(moveHighlight([false, false], null, 1)).toBeNull();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm vitest run src/presentation/input src/presentation/layout src/presentation/menu`
Expected: FAIL — 여섯 파일 모두 `Failed to resolve import`

- [ ] **Step 3: 구현**

`src/presentation/input/enter-key.ts`:

```ts
/** keydown 이벤트에서 쓰는 것. */
export interface KeyLike {
  key: string;
  isComposing: boolean;
  keyCode: number;
}

/**
 * 할 일 추가·이름 저장에 쓸 Enter인지. IME 조합을 확정하는 Enter(isComposing, 또는 keyCode 229)는 쓰지 않는다.
 * 조합을 확정한 뒤 OS가 Enter를 한 번 더 보내면 그것을, 보내지 않으면 사용자가 다시 누른 Enter를 쓴다.
 * 어느 쪽이든 정확히 한 번이다 (INPUT-05, INPUT-14).
 */
export function isCommitEnter(event: KeyLike): boolean {
  return event.key === 'Enter' && !event.isComposing && event.keyCode !== 229;
}
```

`src/presentation/input/rename-paste.ts`:

```ts
const LINE_BREAK = /\r\n|\r|\n/g;

/** 이름 바꾸기 칸에 붙여 넣는 글. 줄바꿈 하나를 공백 하나로 바꾼다 (INPUT-16). */
export function joinLines(text: string): string {
  return text.replace(LINE_BREAK, ' ');
}

/** value의 [start, end)를 text로 바꾸고, 커서를 넣은 글 바로 뒤에 둔다 (INPUT-16). */
export function insertText(value: string, start: number, end: number, text: string): { value: string; caret: number } {
  return { value: value.slice(0, start) + text + value.slice(end), caret: start + text.length };
}
```

`src/presentation/input/wheel-steps.ts` (D26):

```ts
/** 픽셀 단위 휠(트랙패드, Magic Mouse)은 세로로 이만큼 쌓일 때마다 한 칸으로 센다 (D26). */
export const PIXELS_PER_STEP = 50;

/** 끊어지는 마우스 휠 한 칸의 옛 값 `wheelDeltaY` 크기. Chromium(WebView2)과 WebKit이 같다 (D26). */
export const WHEEL_NOTCH = 120;

/** wheel 이벤트에서 쓰는 것. deltaMode 0은 픽셀, 1은 줄, 2는 쪽 단위다. */
export interface WheelLike {
  deltaY: number;
  deltaMode: number;
  /** OS 스크롤 방향 설정(macOS "자연스러운 스크롤") 때문에 deltaY가 실제 방향과 반대이면 true. WebKit의 `webkitDirectionInvertedFromDevice`다. */
  invertedFromDevice?: boolean;
  /** 옛 값. 마우스 휠은 한 칸에 ±120이다. 칸 수를 세는 데만 쓰고 방향은 deltaY로 정한다. */
  wheelDeltaY?: number;
}

/**
 * 투명도 슬라이더 위 휠을 "칸"으로 바꾼다 (WND-12 "한 칸에 2%"). 양수는 위로(더 투명하게), 음수는 아래로 굴린 칸 수다.
 * 세로 움직임이 없으면(가로 쓸기, Shift+휠) 칸이 아니다. 줄·쪽 단위는 이벤트 하나가 한 칸이다.
 * wheelDeltaY가 120의 배수이면 마우스 휠의 칸이다(Windows 마우스의 deltaY가 100이든 125든 한 칸에 한 번).
 * 그 밖의 픽셀 단위는 쌓아서 PIXELS_PER_STEP마다 한 칸으로 세어, 트랙패드 쓸기 한 번에 끝까지 가지 않게 한다.
 * 방향: OS의 스크롤 방향 설정과 관계없이 손가락·휠의 실제 방향을 따른다(PM 결정 P6). 실제로 위로 굴리면 양수다.
 */
export class WheelSteps {
  #pixels = 0;

  steps(event: WheelLike): number {
    // 실제 방향의 deltaY. 위로 굴리면 음수다.
    const deltaY = event.invertedFromDevice === true ? -event.deltaY : event.deltaY;
    if (deltaY === 0)
      return 0;
    const up = deltaY < 0;
    if (event.deltaMode !== 0) {
      this.#pixels = 0;
      return up ? 1 : -1;
    }
    const legacy = Math.abs(event.wheelDeltaY ?? 0);
    if (legacy !== 0 && legacy % WHEEL_NOTCH === 0) {
      this.#pixels = 0;
      const notches = legacy / WHEEL_NOTCH;
      return up ? notches : -notches;
    }
    if (Math.sign(deltaY) !== Math.sign(this.#pixels))
      this.#pixels = 0;
    this.#pixels += deltaY;
    const whole = Math.trunc(this.#pixels / PIXELS_PER_STEP);
    this.#pixels -= whole * PIXELS_PER_STEP;
    return whole === 0 ? 0 : -whole;
  }
}
```

`src/presentation/layout/section-heights.ts`:

```ts
import { allocateSectionHeights } from '../../domain/section-layout.ts';

/** 섹션 하나를 화면에서 잰 값. 모두 CSS px다. */
export interface SectionMeasure {
  /** 목록 말고 섹션이 쓰는 높이: 위 여백 + 제목 줄 + 제목 줄과 목록 사이. */
  readonly chrome: number;
  /** 목록을 다 보이려면 필요한 높이. 접혀 있으면 0이다. */
  readonly content: number;
  /** 첫 항목 한 줄의 높이(위아래 여백 포함). 최소 높이에 쓴다 (LIST-15). */
  readonly firstRow: number;
  readonly expanded: boolean;
}

/** 섹션 목록의 최대 높이. null이면 제한하지 않는다. */
export interface ListHeights {
  readonly done: number | null;
  readonly todo: number | null;
}

const NAMES = ['done', 'todo'] as const;

/**
 * 섹션들이 쓸 수 있는 높이(available)를 v1.4와 같이 나눠 목록마다 최대 높이를 정한다.
 * 다 들어가면 제한하지 않는다(LIST-13). 넘치면 짧은 섹션은 다 보이고 긴 섹션들이 나머지를 똑같이 나눈다(LIST-14).
 * 최소 높이(제목 줄 + 첫 항목, 접히면 제목 줄) 아래로는 줄지 않는다(LIST-15). 보이지 않는 섹션(null)은 빼고 나눈다(LIST-01).
 */
export function sectionListHeights(available: number, sections: { done: SectionMeasure | null; todo: SectionMeasure | null }): ListHeights {
  const shown = NAMES.flatMap((name) => {
    const measure = sections[name];
    return measure === null ? [] : [{ name, measure }];
  });
  const desired = shown.map(({ measure }) => measure.chrome + (measure.expanded ? measure.content : 0));
  const minimum = shown.map(({ measure }) => measure.chrome + (measure.expanded ? Math.min(measure.firstRow, measure.content) : 0));
  const result: { done: number | null; todo: number | null } = { done: null, todo: null };
  if (desired.reduce((a, b) => a + b, 0) <= available)
    return result;
  const allocated = allocateSectionHeights(Math.max(0, available), desired, minimum);
  shown.forEach(({ name, measure }, index) => {
    if (measure.expanded)
      result[name] = Math.max(0, (allocated[index] ?? 0) - measure.chrome);
  });
  return result;
}

/** 0.5 안의 차이는 같은 높이로 본다. 잴 때마다 다시 그리는 것을 막는다. */
export function sameListHeights(a: ListHeights, b: ListHeights): boolean {
  return NAMES.every((name) => {
    const x = a[name];
    const y = b[name];
    return x === null || y === null ? x === y : Math.abs(x - y) < 0.5;
  });
}
```

`src/presentation/menu/menu-placement.ts`:

```ts
import { SHADOW_MARGIN } from '../../domain/window-geometry.ts';

/** ⋯ 버튼과 메뉴 사이 간격 (WND-10). */
export const MENU_GAP = 4;

/** 판 위아래에 비워 둘 그림자 자리. */
export interface Allowance {
  top: number;
  bottom: number;
}

/** 메뉴 판 그림자 자리. v1.4 MenuShadowMargin(위 6, 아래 16)과 같다. */
export const MENU_SHADOW: Allowance = { top: 6, bottom: 16 };

/** 위치는 모두 창(내용을 밀기 전) 왼쪽 위 기준 CSS px다. */
export interface Anchor {
  top: number;
  bottom: number;
  right: number;
}

export interface Size {
  width: number;
  height: number;
}

/** 창 위아래로 남은 화면 공간 (WindowPlacement.roomAround). */
export interface Room {
  above: number;
  below: number;
}

export interface Position {
  left: number;
  top: number;
}

/**
 * ⋯ 메뉴: 버튼 바로 아래(간격 4)에 오른쪽 끝을 버튼 오른쪽 끝에 맞춘다. 창을 늘려서라도 화면 안에 들어가면 아래로,
 * 아래 공간이 모자라면 버튼 위로 뜬다. 위도 모자라면 아래로 뜬다 (WND-10).
 */
export function placeMoreMenu(anchor: Anchor, menu: Size, windowHeight: number, room: Room): Position {
  const left = anchor.right - menu.width;
  const below = anchor.bottom + MENU_GAP;
  if (below + menu.height + MENU_SHADOW.bottom <= windowHeight + Math.max(0, room.below))
    return { left, top: below };
  const above = anchor.top - MENU_GAP - menu.height;
  if (above - MENU_SHADOW.top >= -Math.max(0, room.above))
    return { left, top: above };
  return { left, top: below };
}

/**
 * 우클릭 메뉴: 판 왼쪽 위가 커서 자리다(v1.4 T:152-154). 창 오른쪽을 넘으면 왼쪽으로 민다.
 * 아래 공간(창 아래 화면 공간 포함)이 모자라고 위 공간이 있으면 커서 위로 뜬다. 둘 다 모자라면 더 넓은 쪽으로 뜬다.
 */
export function placeContextMenu(at: { x: number; y: number }, menu: Size, window: Size, room: Room): Position {
  const left = Math.max(SHADOW_MARGIN, Math.min(at.x, window.width - SHADOW_MARGIN - menu.width));
  const spaceBelow = window.height + Math.max(0, room.below) - at.y;
  const spaceAbove = at.y + Math.max(0, room.above);
  if (menu.height + MENU_SHADOW.bottom <= spaceBelow)
    return { left, top: at.y };
  if (menu.height + MENU_SHADOW.top <= spaceAbove)
    return { left, top: at.y - menu.height };
  return { left, top: spaceBelow >= spaceAbove ? at.y : at.y - menu.height };
}

/**
 * 판(과 그림자 자리)이 창 밖으로 나가면 창을 얼마나 늘려야 하는지. raise는 창 위쪽을 올릴 만큼, height는 늘린 뒤 전체 높이다.
 * 늘릴 필요가 없으면 null (WND-10, 설계 문서 6장 "메뉴가 창보다 크면 메뉴가 열린 동안 창을 투명하게 늘린다").
 */
export function popupExtent(popup: { top: number; bottom: number }, windowHeight: number, allowance: Allowance): { raise: number; height: number } | null {
  const top = Math.min(0, Math.floor(popup.top - allowance.top));
  const bottom = Math.max(windowHeight, Math.ceil(popup.bottom + allowance.bottom));
  if (top === 0 && bottom === windowHeight)
    return null;
  // 0 - top: top이 0일 때 -0이 아니라 0이 되게 한다.
  return { raise: 0 - top, height: bottom - top };
}
```

`src/presentation/menu/menu-navigation.ts`:

```ts
/**
 * 방향키로 메뉴 강조를 옮긴다. 고를 수 있는 항목(비활성·구분선·투명도 줄 제외) 사이에서만 움직이고,
 * 끝에서는 반대쪽 끝으로 돈다(v1.4 T:166). 고를 수 있는 항목이 없으면 null.
 */
export function moveHighlight(selectable: readonly boolean[], current: number | null, step: 1 | -1): number | null {
  const count = selectable.length;
  if (!selectable.some(Boolean))
    return null;
  let index = current ?? (step === 1 ? -1 : count);
  for (let i = 0; i < count; i++) {
    index = (index + step + count) % count;
    if (selectable[index])
      return index;
  }
  return null;
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm vitest run src/presentation/input src/presentation/layout src/presentation/menu`
Expected: PASS (31 tests)

Run: Global Constraints의 Task 끝 검사
Expected: 모두 통과

- [ ] **Step 5: 커밋**

```bash
git add spec/behavior/window.md src/presentation/input src/presentation/layout src/presentation/menu
git commit -m "feat: Enter·붙여넣기·휠·섹션 높이·메뉴 위치·방향키 규칙을 순수 함수로 둠"
```

---

### Task 8: 창·⋯ 메뉴 ViewModel

**spec:** WND-03(끄는 동안 카드가 창을 채움, 놓은 높이가 최대 높이), WND-10(메뉴용 늘리기), WND-11·12(투명도 미리 보기와 저장), START-04(메뉴를 열 때 자동 실행 상태), START-08(⋯ → 종료), INPUT-19(초기화 비활성)

**Files:**
- Create: `src/presentation/report.ts`, `src/presentation/window-view-model.svelte.ts`, `src/presentation/more-menu-view-model.svelte.ts`
- Create: `src/testing/test-app.ts`
- Test: `src/presentation/window-view-model.test.ts`, `src/presentation/more-menu-view-model.test.ts`

**Interfaces:**
- Consumes: `RunningApp` (`src/application/launch.ts`), `WindowPlacement`(Task 3), `popupExtent`·`Allowance`·`Room`(Task 7), `opacityFromPercent`·`resolveOpacity`·`stepTransparency`·`transparencyPercent` (`src/domain/opacity.ts`), `SHADOW_MARGIN`
- Produces:
  - `type Report = (action: string, error: unknown) => void`, `reportToConsole: Report` (`report.ts`)
  - `createTestApp(files?: MemoryFileStore): Promise<TestApp>` — `TestApp { app: RunningApp; files; window: FakeWindowController; autoStart: FakeAutoStart; updater: FakeUpdater; process: FakeProcess; clock: FakeClock; timer: ManualTimer }`. `placement.apply()`까지 한다(창 높이 520).
  - `class WindowViewModel` (`new WindowViewModel({ placement, report })`):
    - `resizing: boolean`($state), `lift: number`($state)
    - `get maxCardHeight(): number`, `get baseHeight(): number`
    - `showFirst(contentHeight: number, paintedAtMs: number): Promise<void>`, `contentResized(height: number): void`
    - `resize(edge: ResizeEdge, start: PointerStart): Promise<void>`, `startMove(): void`
    - `room(): Promise<Room>`, `get popupToken(): number`, `fitPopup(token: number, popup: { top: number; bottom: number }, allowance: Allowance): Promise<void>`, `clearPopup(): Promise<void>` (D27)
  - `class MoreMenuViewModel` (`new MoreMenuViewModel({ app, report, hasItems: () => boolean, onReset: () => void })`):
    - `open: boolean`($state), `autoStartChecked: boolean`($state)
    - `get transparency(): number`(0~40), `get cardOpacity(): number`(0.6~1), `get resetEnabled(): boolean`
    - `show(): Promise<void>`, `close(): void`, `setTransparency(percent: number): void`, `wheel(up: boolean): void`, `toggleAutoStart(): Promise<void>`, `reset(): void`, `quit(): void`

- [ ] **Step 1: 테스트 준비 도구 쓰기 (D21)**

`src/testing/test-app.ts`:

```ts
import { AutoStartControl } from '../application/auto-start-control.ts';
import type { RunningApp } from '../application/launch.ts';
import { AppLifecycle } from '../application/lifecycle.ts';
import { SettingsRepository } from '../application/settings/settings-repository.ts';
import { SettingsService } from '../application/settings/settings-service.ts';
import { TaskRepository } from '../application/storage/task-repository.ts';
import { TodoSession } from '../application/todo-session.ts';
import { UpdateService } from '../application/update-service.ts';
import { WindowPlacement } from '../application/window-placement.ts';
import { FakeAutoStart } from './fake-auto-start.ts';
import { FakeClock } from './fake-clock.ts';
import { FakeProcess } from './fake-process.ts';
import { FakeUpdater } from './fake-updater.ts';
import { FakeWindowController } from './fake-window-controller.ts';
import { ManualTimer } from './manual-timer.ts';
import { MemoryFileStore } from './memory-file-store.ts';
import { sequenceIds } from './sequence-ids.ts';

export interface TestApp {
  app: RunningApp;
  files: MemoryFileStore;
  window: FakeWindowController;
  autoStart: FakeAutoStart;
  updater: FakeUpdater;
  process: FakeProcess;
  clock: FakeClock;
  timer: ManualTimer;
}

/**
 * 화면 테스트용 앱. 가짜 port로 application 서비스를 만들고 창 배치까지 한다(창 1576, 24, 320×520).
 * 업데이트 확인은 시작하지 않는다. 필요하면 테스트가 `app.updates.check()`를 부른다.
 */
export async function createTestApp(files = new MemoryFileStore()): Promise<TestApp> {
  const clock = new FakeClock();
  const timer = new ManualTimer();
  const window = new FakeWindowController();
  const autoStart = new FakeAutoStart();
  const updater = new FakeUpdater();
  const process = new FakeProcess();
  const session = await TodoSession.open(new TaskRepository(files, clock), clock, sequenceIds());
  const settings = await SettingsService.open(new SettingsRepository(files));
  const placement = new WindowPlacement({ window, settings, timer });
  await placement.apply();
  const lifecycle = new AppLifecycle({ session, placement, process });
  const updates = new UpdateService({
    updater,
    clock,
    timer,
    appInfo: { version: '2.0.0', isDevBuild: false },
    settings,
    prepareRestart: () => lifecycle.prepareRestart(),
  });
  return {
    app: { session, settings, placement, lifecycle, updates, autoStart: new AutoStartControl(autoStart) },
    files,
    window,
    autoStart,
    updater,
    process,
    clock,
    timer,
  };
}
```

- [ ] **Step 2: 실패하는 테스트 쓰기**

`src/presentation/window-view-model.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createTestApp } from '../testing/test-app.ts';
import { MENU_SHADOW } from './menu/menu-placement.ts';
import { WindowViewModel } from './window-view-model.svelte.ts';

async function setup() {
  const test = await createTestApp();
  const reports: string[] = [];
  const vm = new WindowViewModel({ placement: test.app.placement, report: (action) => reports.push(action) });
  return { ...test, vm, reports };
}

describe('창 화면 상태', () => {
  it('WND-03 처음에는 내용 높이에 맞춘 뒤 창을 보인다', async () => {
    const { vm, window } = await setup();
    expect(vm.maxCardHeight).toBe(500);
    vm.contentResized(150);
    expect(window.heightCalls).toEqual([]);
    await vm.showFirst(200, 7);
    expect(window.current.height).toBe(200);
    expect(window.shown).toEqual([7]);
    expect(vm.baseHeight).toBe(200);
    await vm.showFirst(300, 8);
    expect(window.shown).toEqual([7]);
  });

  it('WND-03 끄는 동안은 resizing이고, 놓으면 새 최대 높이를 쓴다', async () => {
    const { vm, window } = await setup();
    await vm.showFirst(200, 0);
    let release: () => void = () => undefined;
    window.resizeGate = new Promise((resolve) => {
      release = resolve;
    });
    window.resizeResult = { left: 1576, top: 24, width: 320, height: 600 };
    const resizing = vm.resize('South', { screenX: 0, screenY: 0 });
    expect(vm.resizing).toBe(true);
    vm.contentResized(580);
    release();
    await resizing;
    expect(vm.resizing).toBe(false);
    expect(vm.maxCardHeight).toBe(580);
    expect(vm.baseHeight).toBe(600);
  });

  it('WND-10 메뉴가 창보다 크면 늘리고, 닫으면 내용 높이로 되돌린다', async () => {
    const { vm, window } = await setup();
    await vm.showFirst(200, 0);
    await vm.fitPopup(vm.popupToken, { top: 58, bottom: 258 }, MENU_SHADOW);
    expect([window.current.top, window.current.height, vm.lift]).toEqual([24, 274, 0]);
    expect(vm.baseHeight).toBe(200);
    await vm.clearPopup();
    expect([window.current.top, window.current.height]).toEqual([24, 200]);
  });

  it('WND-10 위로 열린 메뉴는 창 위쪽을 올리고 내용을 그만큼 아래로 민다', async () => {
    const { vm, window } = await setup();
    await vm.showFirst(200, 0);
    await vm.fitPopup(vm.popupToken, { top: -128, bottom: 22 }, MENU_SHADOW);
    expect([window.current.top, window.current.height, vm.lift]).toEqual([-110, 334, 134]);
    await vm.clearPopup();
    expect([window.current.top, window.current.height, vm.lift]).toEqual([24, 200, 0]);
  });

  it('WND-10 판이 창 안에 들어가면 늘리지 않고, 늘려 둔 창은 되돌린다', async () => {
    const { vm, window } = await setup();
    await vm.showFirst(300, 0);
    await vm.fitPopup(vm.popupToken, { top: 58, bottom: 400 }, MENU_SHADOW);
    expect(window.current.height).toBe(416);
    await vm.fitPopup(vm.popupToken, { top: 58, bottom: 208 }, MENU_SHADOW);
    expect(window.current.height).toBe(300);
  });

  it('WND-10 자리를 정하는 동안 메뉴가 닫혔으면 늦게 온 늘리기는 버린다', async () => {
    const { vm, window } = await setup();
    await vm.showFirst(200, 0);
    const token = vm.popupToken;
    await vm.clearPopup();
    await vm.fitPopup(token, { top: -128, bottom: 258 }, MENU_SHADOW);
    expect([window.current.top, window.current.height, vm.lift]).toEqual([24, 200, 0]);
  });

  it('WND-10 창을 늘리지 못하면 내용을 아래로 밀지 않는다', async () => {
    const { vm, window, reports } = await setup();
    await vm.showFirst(200, 0);
    window.setHeight = async () => {
      throw new Error('창을 바꾸지 못했어요');
    };
    await vm.fitPopup(vm.popupToken, { top: -128, bottom: 22 }, MENU_SHADOW);
    expect([vm.lift, reports]).toEqual([0, ['expand']]);
  });

  it('WND-10 창 위아래 공간을 읽지 못하면 아래가 넉넉하다고 본다', async () => {
    const { vm, window } = await setup();
    window.failBounds = true;
    expect(await vm.room()).toEqual({ above: 0, below: Number.POSITIVE_INFINITY });
  });
});
```

`src/presentation/more-menu-view-model.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { SETTINGS_FILE } from '../application/settings/settings-repository.ts';
import { flush } from '../testing/fake-timer.ts';
import { MemoryFileStore } from '../testing/memory-file-store.ts';
import { createTestApp } from '../testing/test-app.ts';
import { MoreMenuViewModel } from './more-menu-view-model.svelte.ts';

async function setup(settings?: Record<string, unknown>) {
  const files = new MemoryFileStore();
  if (settings)
    files.files.set(SETTINGS_FILE, JSON.stringify(settings));
  const test = await createTestApp(files);
  let hasItems = false;
  let resets = 0;
  const menu = new MoreMenuViewModel({
    app: test.app,
    report: () => undefined,
    hasItems: () => hasItems,
    onReset: () => resets++,
  });
  return { ...test, menu, setHasItems: (value: boolean) => (hasItems = value), resets: () => resets };
}

const settingsWrites = (files: MemoryFileStore) => files.writes.filter((name) => name === SETTINGS_FILE).length;

describe('⋯ 메뉴', () => {
  it('START-04 메뉴를 열 때마다 OS 자동 실행 상태를 읽어 체크에 보인다', async () => {
    const { menu, autoStart } = await setup();
    autoStart.enabled = true;
    await menu.show();
    expect([menu.open, menu.autoStartChecked]).toEqual([true, true]);
    menu.close();
    autoStart.enabled = false;
    await menu.show();
    expect(menu.autoStartChecked).toBe(false);
  });

  it('START-04 자동 실행을 누르면 메뉴를 닫고, 바꾼 뒤 다시 읽은 상태를 체크에 보인다', async () => {
    const { menu, autoStart } = await setup();
    await menu.show();
    await menu.toggleAutoStart();
    expect([menu.open, menu.autoStartChecked, autoStart.enabled]).toEqual([false, true, true]);
  });

  it('WND-11 저장된 불투명도를 투명도 %로 보인다', async () => {
    const { menu } = await setup({ opacity: 0.85 });
    expect([menu.transparency, menu.cardOpacity]).toEqual([15, 0.85]);
  });

  it('WND-12 끄는 동안 카드에 바로 보이고, 메뉴를 닫을 때 바뀌었으면 한 번 저장한다', async () => {
    const { menu, files, app } = await setup();
    await flush();
    const before = settingsWrites(files);
    await menu.show();
    menu.setTransparency(14.6);
    menu.setTransparency(30.4);
    expect([menu.transparency, menu.cardOpacity]).toEqual([30, 0.7]);
    expect(settingsWrites(files)).toBe(before);
    menu.close();
    await flush();
    expect(settingsWrites(files)).toBe(before + 1);
    expect(app.settings.current.opacity).toBe(0.7);
    expect([menu.transparency, menu.cardOpacity]).toEqual([30, 0.7]);
  });

  it('WND-12 값이 바뀌지 않았으면 저장하지 않는다', async () => {
    const { menu, files } = await setup({ opacity: 0.7 });
    const before = settingsWrites(files);
    await menu.show();
    menu.setTransparency(10);
    menu.setTransparency(30);
    menu.close();
    await flush();
    expect(settingsWrites(files)).toBe(before);
  });

  it('WND-11 WND-12 휠 한 칸은 2%이고, 범위 밖 값은 0~40%로 맞춘다', async () => {
    const { menu } = await setup();
    await menu.show();
    menu.wheel(true);
    menu.wheel(true);
    expect(menu.transparency).toBe(4);
    menu.wheel(false);
    expect(menu.transparency).toBe(2);
    menu.setTransparency(70);
    expect(menu.transparency).toBe(40);
    menu.setTransparency(-5);
    expect(menu.transparency).toBe(0);
  });

  it('INPUT-19 할 일이 없으면 초기화를 고를 수 없다', async () => {
    const { menu, setHasItems, resets } = await setup();
    expect(menu.resetEnabled).toBe(false);
    setHasItems(true);
    expect(menu.resetEnabled).toBe(true);
    await menu.show();
    menu.reset();
    expect([menu.open, resets()]).toEqual([false, 1]);
  });

  it('START-08 종료를 누르면 메뉴를 닫고 종료 흐름을 탄다', async () => {
    const { menu, process } = await setup();
    await menu.show();
    menu.quit();
    await flush();
    expect([menu.open, process.exits]).toEqual([false, 1]);
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `pnpm vitest run src/presentation/window-view-model.test.ts src/presentation/more-menu-view-model.test.ts`
Expected: FAIL — `Failed to resolve import "./window-view-model.svelte.ts"`

- [ ] **Step 4: 구현**

`src/presentation/report.ts`:

```ts
/** 누르고 잊는 호출이 실패했을 때 부른다. 화면에는 보이지 않고 개발자 도구에서 본다. action은 짧은 영어 낱말이다(예: 'pin'). */
export type Report = (action: string, error: unknown) => void;

export const reportToConsole: Report = (action, error) => {
  console.error('TodoWidget', action, error);
};
```

`src/presentation/window-view-model.svelte.ts`:

```ts
import type { PointerStart } from '../application/ports/window-controller.ts';
import type { WindowPlacement } from '../application/window-placement.ts';
import type { ResizeEdge } from '../domain/resize.ts';
import { SHADOW_MARGIN } from '../domain/window-geometry.ts';
import { type Allowance, type Room, popupExtent } from './menu/menu-placement.ts';
import type { Report } from './report.ts';

export interface WindowDeps {
  placement: WindowPlacement;
  report: Report;
}

/** 창 높이와 크기 조절, 메뉴용 늘리기의 화면 상태 (WND-03, WND-10). */
export class WindowViewModel {
  /** 가장자리를 끄는 중이면 카드가 창 높이를 채운다(v1.4 MC:64-91). */
  resizing = $state(false);
  /** 메뉴 때문에 창 위쪽을 올린 만큼 내용을 아래로 민다. 그래서 카드는 화면에서 제자리다 (D11). */
  lift = $state(0);
  #maxHeight = $state(0);
  #baseHeight = $state(0);
  readonly #placement: WindowPlacement;
  readonly #report: Report;
  #shown = false;
  /** 메뉴·확인 판 세대 번호. 화면을 다시 그리게 할 값이 아니라 $state가 아니다. */
  #popupToken = 0;

  constructor(deps: WindowDeps) {
    this.#placement = deps.placement;
    this.#report = deps.report;
    this.#maxHeight = deps.placement.maxHeight;
    this.#baseHeight = deps.placement.height;
  }

  /** 카드가 쓸 수 있는 가장 큰 높이. 최대 높이에서 위아래 그림자 여백을 뺀다(v1.4 MC:89). */
  get maxCardHeight(): number {
    return this.#maxHeight - 2 * SHADOW_MARGIN;
  }

  /** 메뉴로 늘리기 전, 내용에 맞춘 창 높이. 메뉴 자리를 정할 때 쓴다. */
  get baseHeight(): number {
    return this.#baseHeight;
  }

  /** 처음 한 번: 창 높이를 내용에 맞춘 뒤 창을 보인다. 맞추기에 실패해도 보인다 (D19). */
  async showFirst(contentHeight: number, paintedAtMs: number): Promise<void> {
    if (this.#shown)
      return;
    this.#shown = true;
    await this.#placement.fitToContent(contentHeight).catch((error: unknown) => this.#report('fit', error));
    this.#baseHeight = this.#placement.height;
    await this.#placement.show(paintedAtMs).catch((error: unknown) => this.#report('show', error));
  }

  /** 카드 높이가 바뀌었다. height는 카드 + 위아래 그림자 여백이다 (WND-03). 처음 보이기 전과 끄는 동안은 무시한다. */
  contentResized(height: number): void {
    if (!this.#shown || this.resizing)
      return;
    this.#placement.fitToContent(height).then(
      () => {
        this.#baseHeight = this.#placement.height;
      },
      (error: unknown) => this.#report('fit', error),
    );
  }

  /** 가장자리를 끌어 크기를 바꾼다. 놓을 때까지 resizing이다 (WND-03). placement.resize는 기다림 없이 바로 부른다. */
  async resize(edge: ResizeEdge, start: PointerStart): Promise<void> {
    this.resizing = true;
    try {
      await this.#placement.resize(edge, start);
    } catch (error) {
      this.#report('resize', error);
    } finally {
      this.resizing = false;
      this.#maxHeight = this.#placement.maxHeight;
      this.#baseHeight = this.#placement.height;
    }
  }

  /** 헤더를 끌어 창을 옮긴다 (WND-02). */
  startMove(): void {
    this.#placement.startMove().catch((error: unknown) => this.#report('move', error));
  }

  /** 창 위아래로 남은 화면 공간. 읽지 못하면 아래가 넉넉하다고 본다(메뉴가 아래로 뜬다). */
  room(): Promise<Room> {
    return this.#placement.roomAround().catch(() => ({ above: 0, below: Number.POSITIVE_INFINITY }));
  }

  /** 지금 열린 메뉴·확인 판의 세대 번호. 메뉴는 자리를 정하기 시작할 때 받아 fitPopup에 넘긴다 (D27). */
  get popupToken(): number {
    return this.#popupToken;
  }

  /**
   * 판이 창 밖으로 나가면 열린 동안 창을 늘린다. 들어가면 늘려 둔 창을 되돌린다 (WND-10, D11).
   * 그 사이 메뉴가 닫혀 세대 번호가 바뀌었으면 아무것도 하지 않는다. 되돌릴 사람이 없는 늘린 창이 남지 않게 한다 (D27).
   */
  async fitPopup(token: number, popup: { top: number; bottom: number }, allowance: Allowance): Promise<void> {
    if (token !== this.#popupToken)
      return;
    const extent = popupExtent(popup, this.#baseHeight, allowance);
    if (!extent)
      return this.#restore();
    this.lift = extent.raise;
    await this.#placement.expand(extent.raise, extent.height).catch((error: unknown) => {
      // 창을 올리지 못했는데 내용만 내려가 있으면 카드가 잘린다.
      this.lift = 0;
      this.#report('expand', error);
    });
  }

  /** 메뉴·확인 판이 모두 닫혔다. 세대 번호를 올리고, 늘린 창을 되돌린다. 늘리지 않았으면 창은 그대로다. */
  async clearPopup(): Promise<void> {
    this.#popupToken++;
    await this.#restore();
  }

  async #restore(): Promise<void> {
    this.lift = 0;
    await this.#placement.restore().catch((error: unknown) => this.#report('restore', error));
    this.#baseHeight = this.#placement.height;
  }
}
```

`src/presentation/more-menu-view-model.svelte.ts`:

```ts
import type { RunningApp } from '../application/launch.ts';
import { opacityFromPercent, resolveOpacity, stepTransparency, transparencyPercent } from '../domain/opacity.ts';
import type { Report } from './report.ts';

export interface MoreMenuDeps {
  app: RunningApp;
  report: Report;
  /** 할 일이 하나라도 있는지. 초기화를 고를 수 있는지 정한다 (INPUT-19). */
  hasItems: () => boolean;
  /** 초기화를 골랐다. 확인 판을 연다 (INPUT-18). */
  onReset: () => void;
}

/**
 * ⋯ 메뉴: 자동 실행 체크(START-04), 투명도(WND-11·12), 초기화(INPUT-18·19), 종료(START-08).
 * 투명도는 끄는 동안 미리 보기 값을 들고 있다가 메뉴를 닫을 때 바뀌었으면 한 번 저장한다(설계 문서 5.1).
 */
export class MoreMenuViewModel {
  open = $state(false);
  autoStartChecked = $state(false);
  /** 아직 저장하지 않은 투명도 %. 없으면 저장된 값을 보인다. */
  #preview = $state<number | null>(null);
  readonly #deps: MoreMenuDeps;

  constructor(deps: MoreMenuDeps) {
    this.#deps = deps;
  }

  /** 슬라이더와 % 값 (0~40). */
  get transparency(): number {
    return this.#preview ?? transparencyPercent(this.#deps.app.settings.current.opacity);
  }

  /** 카드 배경 불투명도. 미리 보기 값을 바로 쓴다 (WND-12). */
  get cardOpacity(): number {
    return opacityFromPercent(this.transparency);
  }

  get resetEnabled(): boolean {
    return this.#deps.hasItems();
  }

  /** 메뉴를 연다. 열 때마다 OS 자동 실행 상태를 읽는다 (START-04). */
  async show(): Promise<void> {
    this.#preview = null;
    this.open = true;
    const enabled = await this.#deps.app.autoStart.isEnabled();
    if (this.open)
      this.autoStartChecked = enabled;
  }

  /** 메뉴를 닫는다. 투명도가 바뀌었으면 한 번 저장한다(WND-12). 저장 실패는 SettingsService가 조용히 넘긴다(STORE-17). */
  close(): void {
    if (!this.open)
      return;
    this.open = false;
    const preview = this.#preview;
    if (preview === null)
      return;
    const opacity = opacityFromPercent(preview);
    const settings = this.#deps.app.settings;
    if (opacity !== resolveOpacity(settings.current.opacity))
      void settings.update({ opacity });
    this.#preview = null;
  }

  /** 1% 단위로 맞추고 0~40%로 제한한다 (WND-11). */
  setTransparency(percent: number): void {
    this.#preview = transparencyPercent(opacityFromPercent(percent));
  }

  /** 슬라이더 위 휠 한 칸: 위로 굴리면 2% 더 투명하게 (WND-12). */
  wheel(up: boolean): void {
    this.setTransparency(stepTransparency(this.transparency, up));
  }

  /** 메뉴를 닫고 자동 실행을 바꾼 뒤, 다시 읽은 실제 상태를 체크에 둔다 (START-04, START-05). */
  async toggleAutoStart(): Promise<void> {
    this.close();
    try {
      this.autoStartChecked = await this.#deps.app.autoStart.toggle();
    } catch (error) {
      this.#deps.report('autoStart', error);
    }
  }

  reset(): void {
    if (!this.resetEnabled)
      return;
    this.close();
    this.#deps.onReset();
  }

  quit(): void {
    this.close();
    this.#deps.app.lifecycle.quit().catch((error: unknown) => this.#deps.report('quit', error));
  }
}
```

- [ ] **Step 5: 통과 확인**

Run: `pnpm vitest run src/presentation/window-view-model.test.ts src/presentation/more-menu-view-model.test.ts`
Expected: PASS (16 tests). node 환경에서는 Svelte가 `.svelte.ts`를 서버용으로 컴파일해 `$state`가 보통 필드처럼 동작한다(2026-10-06 실험으로 확인: `$state`·`$derived`가 node 환경 테스트에서 바뀐 값을 돌려준다).

Run: Global Constraints의 Task 끝 검사
Expected: 모두 통과

- [ ] **Step 6: 커밋**

```bash
git add src/presentation/report.ts src/presentation/window-view-model.svelte.ts src/presentation/window-view-model.test.ts src/presentation/more-menu-view-model.svelte.ts src/presentation/more-menu-view-model.test.ts src/testing/test-app.ts
git commit -m "feat: 창 높이·크기 조절 상태와 ⋯ 메뉴(자동 실행, 투명도 미리 보기) ViewModel을 더함"
```

---
### Task 9: 위젯 ViewModel

**spec:** LIST-01·06·07·08·09·10, INPUT-02·03·07·11·12·13·14·15·17·18·19·20, WND-09(실패하면 표시를 되돌림), START-05·09, UPD-03·04·07

**Files:**
- Create: `src/presentation/widget-view-model.svelte.ts`
- Test: `src/presentation/widget-view-model.test.ts`

**Interfaces:**
- Consumes: `RunningApp`, `pickNotice` (`src/application/notices.ts`), `Translate`(Task 1), `WindowViewModel`·`MoreMenuViewModel`·`Report`·`reportToConsole`(Task 8), `createTestApp`(Task 8)
- Produces: `class WidgetViewModel` (`new WidgetViewModel({ app, t, report? })`)
  - 필드: `t: Translate`, `menu: MoreMenuViewModel`, `window: WindowViewModel`, `pinned`·`doneExpanded`·`todoExpanded`·`confirmingReset: boolean`, `renaming: RenameState | null`, `contextMenu: ContextMenuState | null` (모두 `$state`)
  - getter: `itemCount`, `doneItems: TodoItem[]`, `todoItems: TodoItem[]`, `sections: SectionName[]`, `isEmpty`, `remainingText`, `pinTooltip`, `doneToggleText`, `resetQuestion`, `notice: NoticeView | null`, `anyPopupOpen`
  - method: `statusChoices(itemId): StatusChoice[]`, `add(text): boolean`, `cycle(id)`, `setStatus(id, status)`, `remove(id)`, `startRename(id)`, `updateDraft(text)`, `commitRename(text?)`, `cancelRename()`, `toggleDone()`, `toggleTodo()`, `togglePin(): Promise<void>`, `openMoreMenu(): Promise<void>`, `openContextMenu(itemId, x, y)`, `closeContextMenu()`, `openReset()`, `cancelReset()`, `confirmReset()`, `closePopups()`, `installUpdate()`, `startResize(edge, start): Promise<void>`, `dispose()`
  - 타입: `type SectionName = 'done' | 'todo'`, `interface ContextMenuState { itemId; x; y }`(x·y는 이벤트의 clientX·clientY), `interface RenameState { id; draft }`, `interface NoticeView { messages: string[]; action: string | null }`, `interface StatusChoice { status; label; checked }`

- [ ] **Step 1: 실패하는 테스트 쓰기**

`src/presentation/widget-view-model.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { SETTINGS_FILE } from '../application/settings/settings-repository.ts';
import { TASKS_FILE } from '../application/storage/task-repository.ts';
import type { TodoItem } from '../domain/todo-item.ts';
import { flush } from '../testing/fake-timer.ts';
import { MemoryFileStore } from '../testing/memory-file-store.ts';
import { createTestApp } from '../testing/test-app.ts';
import { createTranslator } from './i18n/translator.ts';
import { WidgetViewModel } from './widget-view-model.svelte.ts';

async function widget(options: { settings?: Record<string, unknown>; tasks?: string } = {}) {
  const files = new MemoryFileStore();
  if (options.settings)
    files.files.set(SETTINGS_FILE, JSON.stringify(options.settings));
  if (options.tasks)
    files.files.set(TASKS_FILE, options.tasks);
  const test = await createTestApp(files);
  const reports: string[] = [];
  const vm = new WidgetViewModel({ app: test.app, t: createTranslator('ko'), report: (action) => reports.push(action) });
  const id = (title: string): string => test.app.session.items.find((item) => item.title === title)?.id ?? '';
  return { ...test, vm, reports, id };
}

const titles = (items: readonly TodoItem[]): string[] => items.map((item) => item.title);
const writesOf = (files: MemoryFileStore, name: string): number => files.writes.filter((written) => written === name).length;

describe('목록 화면', () => {
  it('LIST-01 섹션은 끝낸 일, 할 일 순서이고 항목이 없는 섹션은 숨긴다', async () => {
    const { vm, app, id } = await widget();
    expect(vm.sections).toEqual([]);
    vm.add('보고서');
    expect(vm.sections).toEqual(['todo']);
    vm.add('장보기');
    app.session.setStatus(id('장보기'), 'done');
    expect(vm.sections).toEqual(['done', 'todo']);
    app.session.setStatus(id('보고서'), 'done');
    expect(vm.sections).toEqual(['done']);
  });

  it('LIST-06 남은 개수가 있으면 "N개 남음", 없으면 "모두 끝냈어요"', async () => {
    const { vm, app, id } = await widget();
    expect(vm.remainingText).toBe('모두 끝냈어요');
    vm.add('보고서\n장보기');
    expect(vm.remainingText).toBe('2개 남음');
    app.session.setStatus(id('장보기'), 'done');
    expect(vm.remainingText).toBe('1개 남음');
  });

  it('LIST-07 LIST-09 끝낸 일은 처음에 접혀 있고, 펼치면 "접기"가 보이며 바로 저장한다', async () => {
    const { vm, app } = await widget();
    expect([vm.doneExpanded, vm.doneToggleText]).toEqual([false, '펼치기']);
    vm.toggleDone();
    expect([vm.doneExpanded, vm.doneToggleText]).toEqual([true, '접기']);
    await flush();
    expect(app.settings.current.doneExpanded).toBe(true);
  });

  it('LIST-08 LIST-09 할 일은 처음에 펼쳐 있고 개수는 하는 중을 포함한다. 접으면 바로 저장한다', async () => {
    const { vm, app, id } = await widget();
    vm.add('보고서\n장보기');
    app.session.setStatus(id('장보기'), 'doing');
    expect(vm.todoExpanded).toBe(true);
    expect(titles(vm.todoItems)).toEqual(['장보기', '보고서']);
    vm.toggleTodo();
    await flush();
    expect([vm.todoExpanded, app.settings.current.todoExpanded]).toEqual([false, false]);
  });

  it('LIST-09 다음에 켤 때 저장된 접힘 상태를 그대로 쓴다', async () => {
    const { vm } = await widget({ settings: { doneExpanded: true, todoExpanded: false } });
    expect([vm.doneExpanded, vm.todoExpanded]).toEqual([true, false]);
  });

  it('LIST-10 할 일이 하나도 없으면 빈 목록이다', async () => {
    const { vm } = await widget();
    expect(vm.isEmpty).toBe(true);
    vm.add('보고서');
    expect(vm.isEmpty).toBe(false);
  });
});

describe('추가', () => {
  it('INPUT-02 INPUT-20 추가하면 true이고, 맨 앞 목록 기호 하나를 뗀다', async () => {
    const { vm } = await widget();
    expect(vm.add('- 은행 방문')).toBe(true);
    expect(vm.add('1. 분기 보고서')).toBe(true);
    expect(titles(vm.todoItems)).toEqual(['은행 방문', '1. 분기 보고서']);
  });

  it('INPUT-03 INPUT-20 빈 입력이나 기호뿐인 입력은 추가하지 않는다', async () => {
    const { vm } = await widget();
    expect(vm.add('   ')).toBe(false);
    expect(vm.add('-')).toBe(false);
    expect(vm.isEmpty).toBe(true);
  });

  it('INPUT-07 여러 줄은 줄마다 순서대로 추가하고, 빈 줄은 건너뛰며, 저장은 한 번이다', async () => {
    const { vm, app, files } = await widget();
    vm.add('보고서\n\n• 장보기\n');
    await app.session.whenSaved();
    expect(titles(vm.todoItems)).toEqual(['보고서', '장보기']);
    expect(writesOf(files, TASKS_FILE)).toBe(1);
  });
});

describe('할 일 조작', () => {
  it('INPUT-11 이름을 바꾸던 중 동그라미를 누르면 이름을 먼저 저장하고 상태를 바꾼다', async () => {
    const { vm, app, id } = await widget();
    vm.add('초안');
    const target = id('초안');
    vm.startRename(target);
    vm.updateDraft('보고서');
    vm.cycle(target);
    expect(vm.renaming).toBeNull();
    expect(app.session.items[0]).toMatchObject({ title: '보고서', status: 'doing' });
  });

  it('INPUT-12 우클릭 메뉴는 할 일·하는 중·끝낸 일 중 지금 상태에 체크하고, 고르면 그 상태로 바꾸고 닫힌다', async () => {
    const { vm, app, id } = await widget();
    vm.add('장보기');
    const target = id('장보기');
    vm.openContextMenu(target, 40, 80);
    expect(vm.contextMenu).toEqual({ itemId: target, x: 40, y: 80 });
    expect(vm.statusChoices(target)).toEqual([
      { status: 'todo', label: '할 일', checked: true },
      { status: 'doing', label: '하는 중', checked: false },
      { status: 'done', label: '끝낸 일', checked: false },
    ]);
    vm.setStatus(target, 'done');
    expect(vm.contextMenu).toBeNull();
    expect(app.session.items[0]?.status).toBe('done');
    expect(vm.statusChoices(target).map((choice) => choice.checked)).toEqual([false, false, true]);
  });

  it('INPUT-12 우클릭 메뉴를 열면 ⋯ 메뉴와 확인 판은 닫힌다', async () => {
    const { vm, id } = await widget();
    vm.add('장보기');
    await vm.openMoreMenu();
    vm.openContextMenu(id('장보기'), 0, 0);
    expect([vm.menu.open, vm.contextMenu !== null]).toEqual([false, true]);
    vm.closeContextMenu();
    vm.openReset();
    expect(vm.confirmingReset).toBe(true);
    vm.openContextMenu(id('장보기'), 0, 0);
    expect([vm.confirmingReset, vm.contextMenu !== null]).toEqual([false, true]);
  });

  it('INPUT-13 이름 바꾸기를 시작하면 지금 제목으로 칸을 열고 우클릭 메뉴를 닫는다', async () => {
    const { vm, id } = await widget();
    vm.add('초안');
    vm.openContextMenu(id('초안'), 0, 0);
    vm.startRename(id('초안'));
    expect(vm.renaming).toEqual({ id: id('초안'), draft: '초안' });
    expect(vm.contextMenu).toBeNull();
  });

  it('INPUT-14 정리 규칙으로 저장하고, 두 번 불러도 한 번만 저장한다', async () => {
    const { vm, app, files, id } = await widget();
    vm.add('초안');
    await app.session.whenSaved();
    const before = writesOf(files, TASKS_FILE);
    vm.startRename(id('초안'));
    vm.commitRename('  보고서\n초안  ');
    vm.commitRename('다른 제목');
    await app.session.whenSaved();
    expect(titles(vm.todoItems)).toEqual(['보고서 초안']);
    expect(writesOf(files, TASKS_FILE)).toBe(before + 1);
  });

  it('INPUT-14 정리한 뒤 빈 제목이면 바뀌지 않고 칸이 닫힌다', async () => {
    const { vm, id } = await widget();
    vm.add('초안');
    vm.startRename(id('초안'));
    vm.commitRename('   ');
    expect([vm.renaming, titles(vm.todoItems)]).toEqual([null, ['초안']]);
  });

  it('INPUT-15 취소하면 입력한 내용을 버리고 저장하지 않는다', async () => {
    const { vm, app, files, id } = await widget();
    vm.add('초안');
    await app.session.whenSaved();
    const before = files.writes.length;
    vm.startRename(id('초안'));
    vm.updateDraft('보고서');
    vm.cancelRename();
    await app.session.whenSaved();
    expect([vm.renaming, titles(vm.todoItems), files.writes.length]).toEqual([null, ['초안'], before]);
  });

  it('INPUT-17 삭제는 확인 없이 바로 지운다', async () => {
    const { vm, id } = await widget();
    vm.add('장보기\n보고서');
    vm.openContextMenu(id('장보기'), 0, 0);
    vm.remove(id('장보기'));
    expect([titles(vm.todoItems), vm.contextMenu]).toEqual([['보고서'], null]);
  });
});

describe('초기화', () => {
  it('INPUT-18 확인 판에 전체 개수를 묻고, 취소하면 그대로, 모두 지우기를 누르면 상태와 관계없이 지운다', async () => {
    const { vm, app, files, id } = await widget();
    vm.add('보고서\n장보기\n은행');
    app.session.setStatus(id('은행'), 'done');
    await flush();
    const settingsBefore = writesOf(files, SETTINGS_FILE);
    vm.openReset();
    expect([vm.confirmingReset, vm.resetQuestion]).toEqual([true, '할 일 3개를 모두 지울까요?']);
    vm.cancelReset();
    expect([vm.confirmingReset, vm.itemCount]).toEqual([false, 3]);
    vm.openReset();
    vm.confirmReset();
    await flush();
    expect([vm.confirmingReset, vm.itemCount]).toEqual([false, 0]);
    expect(writesOf(files, SETTINGS_FILE)).toBe(settingsBefore);
  });

  it('INPUT-18 ⋯ 메뉴의 초기화를 누르면 메뉴를 닫고 확인 판을 연다', async () => {
    const { vm } = await widget();
    vm.add('보고서');
    await vm.openMoreMenu();
    vm.menu.reset();
    expect([vm.menu.open, vm.confirmingReset]).toEqual([false, true]);
  });

  it('INPUT-19 할 일이 없으면 초기화를 고를 수 없고 확인 판도 열리지 않는다', async () => {
    const { vm } = await widget();
    expect(vm.menu.resetEnabled).toBe(false);
    vm.openReset();
    expect(vm.confirmingReset).toBe(false);
    vm.add('보고서');
    expect(vm.menu.resetEnabled).toBe(true);
  });
});

describe('📌', () => {
  it('WND-09 누르면 맨 위 고정을 바꿔 저장하고, 툴팁도 바뀐다', async () => {
    const { vm, window, app } = await widget();
    expect([vm.pinned, vm.pinTooltip]).toEqual([true, '맨 위 고정 끄기']);
    await vm.togglePin();
    expect([vm.pinned, vm.pinTooltip, window.pinned, app.settings.current.pinned]).toEqual([false, '맨 위에 고정', false, false]);
  });

  it('WND-09 창에 적용하지 못하면 표시를 되돌린다', async () => {
    const { vm, window, reports, app } = await widget();
    window.failPinned = true;
    await vm.togglePin();
    expect([vm.pinned, app.settings.current.pinned, reports]).toEqual([true, true, ['pin']]);
  });
});

describe('안내 줄', () => {
  it('START-09 할 일 저장 실패를 안내 줄에 보인다', async () => {
    const { vm, app, files } = await widget();
    files.failWrites = true;
    vm.add('보고서');
    await app.session.whenSaved();
    expect(vm.notice).toEqual({ messages: ['저장하지 못했어요. 다음 변경 때 다시 시도해요'], action: null });
  });

  it('START-05 자동 실행을 바꾸지 못하면 안내 줄에 보이고, 체크는 실제 상태다', async () => {
    const { vm, autoStart } = await widget();
    autoStart.failEnable = true;
    await vm.openMoreMenu();
    await vm.menu.toggleAutoStart();
    expect(vm.menu.autoStartChecked).toBe(false);
    expect(vm.notice).toEqual({ messages: ['자동 실행 설정을 바꾸지 못했어요'], action: null });
  });

  it('UPD-03 새 버전이 있으면 "새 버전이 있어요"와 누를 수 있는 "업데이트"를 보인다', async () => {
    const { vm, app } = await widget();
    expect(vm.notice).toBeNull();
    await app.updates.check();
    expect(vm.notice).toEqual({ messages: ['새 버전이 있어요'], action: '업데이트' });
  });

  it('UPD-04 UPD-07 누르면 설치하는 동안 다시 누를 수 없고, 실패하면 다시 시도할 수 있다', async () => {
    const { vm, app, updater } = await widget();
    await app.updates.check();
    updater.failInstall = new Error('받지 못했어요');
    vm.installUpdate();
    expect(vm.notice).toEqual({ messages: ['업데이트하는 중이에요'], action: null });
    await flush();
    expect(vm.notice).toEqual({ messages: ['업데이트하지 못했어요'], action: '업데이트' });
    expect(updater.installs).toBe(1);
  });

  it('START-09 UPD-03 새 버전에서 만든 파일이면 그 안내 옆에 업데이트 버튼을 함께 보인다', async () => {
    const { vm, app } = await widget({ tasks: '{"version":3,"tasks":[]}' });
    expect(vm.notice).toEqual({ messages: ['새 버전에서 만든 파일이에요. 업데이트해 주세요'], action: null });
    await app.updates.check();
    expect(vm.notice).toEqual({ messages: ['새 버전에서 만든 파일이에요. 업데이트해 주세요'], action: '업데이트' });
  });
});

describe('창과 메뉴', () => {
  it('WND-10 메뉴와 확인 판은 한 번에 하나만 열리고, 창이 포커스를 잃으면 모두 닫힌다', async () => {
    const { vm } = await widget();
    vm.add('보고서');
    await vm.openMoreMenu();
    expect(vm.anyPopupOpen).toBe(true);
    vm.closePopups();
    expect([vm.anyPopupOpen, vm.menu.open, vm.contextMenu, vm.confirmingReset]).toEqual([false, false, null, false]);
  });

  it('WND-03 크기를 바꾸기 시작하면 열린 메뉴를 닫고 이름 바꾸기를 저장한다', async () => {
    const { vm, id } = await widget();
    vm.add('초안');
    await vm.menu.show();
    vm.startRename(id('초안'));
    vm.updateDraft('보고서');
    expect(vm.menu.open).toBe(true);
    await vm.startResize('East', { screenX: 0, screenY: 0 });
    expect([vm.menu.open, vm.renaming, titles(vm.todoItems)]).toEqual([false, null, ['보고서']]);
  });

  it('WND-02 정리하면 창 이동 신호와 서비스 알림을 그만 받는다', async () => {
    const { vm, window } = await widget();
    expect(window.movedListeners).toBe(1);
    vm.dispose();
    expect(window.movedListeners).toBe(0);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm vitest run src/presentation/widget-view-model.test.ts`
Expected: FAIL — `Failed to resolve import "./widget-view-model.svelte.ts"`

- [ ] **Step 3: 구현**

`src/presentation/widget-view-model.svelte.ts`:

```ts
import type { RunningApp } from '../application/launch.ts';
import { pickNotice } from '../application/notices.ts';
import type { PointerStart } from '../application/ports/window-controller.ts';
import type { ResizeEdge } from '../domain/resize.ts';
import type { TodoItem } from '../domain/todo-item.ts';
import type { TodoStatus } from '../domain/todo-status.ts';
import type { MessageKey } from './i18n/keys.ts';
import type { Translate } from './i18n/translator.ts';
import { MoreMenuViewModel } from './more-menu-view-model.svelte.ts';
import { type Report, reportToConsole } from './report.ts';
import { WindowViewModel } from './window-view-model.svelte.ts';

export type SectionName = 'done' | 'todo';

/** 우클릭한 할 일과 그 자리(이벤트의 clientX·clientY). */
export interface ContextMenuState {
  readonly itemId: string;
  readonly x: number;
  readonly y: number;
}

/** 이름 바꾸기 칸. draft는 칸에 지금 쓰여 있는 글이다. */
export interface RenameState {
  readonly id: string;
  readonly draft: string;
}

/** 안내 줄: 안내 문구들과, 있으면 누를 수 있는 `update.action` 글 (START-09). */
export interface NoticeView {
  readonly messages: string[];
  readonly action: string | null;
}

export interface StatusChoice {
  readonly status: TodoStatus;
  readonly label: string;
  readonly checked: boolean;
}

export interface WidgetDeps {
  app: RunningApp;
  t: Translate;
  report?: Report;
}

const STATUS_KEYS: Readonly<Record<TodoStatus, MessageKey>> = { todo: 'status.todo', doing: 'status.doing', done: 'status.done' };
const STATUSES: readonly TodoStatus[] = ['todo', 'doing', 'done'];

/**
 * 위젯 화면 상태. 할 일 목록·헤더·안내 줄·이름 바꾸기·우클릭 메뉴·초기화 확인·📌·섹션 접기를 들고, 동작은 application 서비스에 맡긴다.
 * 서비스는 Svelte 상태가 아니다. 서비스가 바뀌었다고 알리면 #version을 올려, 그 값을 읽는 getter들이 다시 계산되게 한다 (D1).
 */
export class WidgetViewModel {
  readonly t: Translate;
  readonly menu: MoreMenuViewModel;
  readonly window: WindowViewModel;
  pinned = $state(true);
  doneExpanded = $state(false);
  todoExpanded = $state(true);
  renaming = $state<RenameState | null>(null);
  contextMenu = $state<ContextMenuState | null>(null);
  confirmingReset = $state(false);
  readonly #app: RunningApp;
  readonly #report: Report;
  readonly #stops: Array<() => void>;
  #version = $state(0);

  constructor(deps: WidgetDeps) {
    const { app } = deps;
    this.#app = app;
    this.t = deps.t;
    this.#report = deps.report ?? reportToConsole;
    const saved = app.settings.current;
    this.pinned = saved.pinned;
    this.doneExpanded = saved.doneExpanded;
    this.todoExpanded = saved.todoExpanded;
    this.window = new WindowViewModel({ placement: app.placement, report: this.#report });
    this.menu = new MoreMenuViewModel({ app, report: this.#report, hasItems: () => this.itemCount > 0, onReset: () => this.openReset() });
    const bump = (): void => {
      this.#version++;
    };
    this.#stops = [app.session.onChange(bump), app.updates.onChange(bump), app.autoStart.onChange(bump)];
  }

  get itemCount(): number {
    this.#track();
    return this.#app.session.items.length;
  }

  /** 끝낸 일 섹션. 최근에 끝낸 것이 위다 (LIST-04, LIST-05). */
  get doneItems(): TodoItem[] {
    this.#track();
    return this.#app.session.doneSection();
  }

  /** 할 일 섹션. 하는 중이 위다 (LIST-02, LIST-03). */
  get todoItems(): TodoItem[] {
    this.#track();
    return this.#app.session.todoSection();
  }

  /** 보이는 섹션. 위에서부터 끝낸 일, 할 일이고 항목이 없는 섹션은 뺀다 (LIST-01). */
  get sections(): SectionName[] {
    const shown: SectionName[] = [];
    if (this.doneItems.length > 0)
      shown.push('done');
    if (this.todoItems.length > 0)
      shown.push('todo');
    return shown;
  }

  /** LIST-10 */
  get isEmpty(): boolean {
    return this.itemCount === 0;
  }

  /** LIST-06 */
  get remainingText(): string {
    this.#track();
    const remaining = this.#app.session.remainingCount;
    return remaining > 0 ? this.t('header.remaining', remaining) : this.t('header.allDone');
  }

  /** WND-09 */
  get pinTooltip(): string {
    return this.t(this.pinned ? 'pin.on' : 'pin.off');
  }

  /** LIST-07 */
  get doneToggleText(): string {
    return this.t(this.doneExpanded ? 'section.doneHide' : 'section.doneShow');
  }

  /** INPUT-18: N은 지금 전체 할 일 개수다. */
  get resetQuestion(): string {
    return this.t('reset.question', this.itemCount);
  }

  /** 우선순위가 가장 높은 안내 하나 (START-09, UPD-03·04·07). */
  get notice(): NoticeView | null {
    this.#track();
    const { session, autoStart, updates } = this.#app;
    const line = pickNotice({ saveFailed: session.saveFailed, fileProblem: session.fileProblem, autoStartFailed: autoStart.failed, update: updates.state });
    if (!line)
      return null;
    return { messages: line.messages.map((key) => this.t(key)), action: line.action ? this.t('update.action') : null };
  }

  get anyPopupOpen(): boolean {
    return this.menu.open || this.contextMenu !== null || this.confirmingReset;
  }

  /** 우클릭 메뉴의 상태 항목. 지금 상태에 체크한다 (INPUT-12). */
  statusChoices(itemId: string): StatusChoice[] {
    const item = this.#find(itemId);
    return STATUSES.map((status) => ({ status, label: this.t(STATUS_KEYS[status]), checked: item?.status === status }));
  }

  /** 입력칸의 한 줄이나 붙여 넣은 여러 줄을 추가한다. 추가했으면 true (INPUT-02, INPUT-03, INPUT-07, INPUT-20). */
  add(text: string): boolean {
    return this.#app.session.add(text);
  }

  /** 동그라미: 이름 바꾸기 칸이 열려 있으면 먼저 저장하고 상태를 한 단계 바꾼다 (INPUT-11). */
  cycle(id: string): void {
    this.commitRename();
    this.#app.session.cycle(id);
  }

  setStatus(id: string, status: TodoStatus): void {
    this.contextMenu = null;
    this.#app.session.setStatus(id, status);
  }

  /** INPUT-17 */
  remove(id: string): void {
    this.contextMenu = null;
    if (this.renaming?.id === id)
      this.renaming = null;
    this.#app.session.remove(id);
  }

  /** 다른 칸이 열려 있으면 먼저 저장하고, 이 할 일의 이름 바꾸기 칸을 연다 (INPUT-13). */
  startRename(id: string): void {
    this.contextMenu = null;
    this.commitRename();
    const item = this.#find(id);
    if (item)
      this.renaming = { id, draft: item.title };
  }

  updateDraft(draft: string): void {
    if (this.renaming)
      this.renaming = { ...this.renaming, draft };
  }

  /** 칸을 닫고 저장한다. Enter와 포커스 이탈이 겹쳐도 한 번만 저장한다. 빈 제목은 TASK-12대로 바뀌지 않는다 (INPUT-14). */
  commitRename(text?: string): void {
    const current = this.renaming;
    if (!current)
      return;
    this.renaming = null;
    this.#app.session.rename(current.id, text ?? current.draft);
  }

  /** INPUT-15 */
  cancelRename(): void {
    this.renaming = null;
  }

  /** LIST-07, LIST-09 */
  toggleDone(): void {
    this.doneExpanded = !this.doneExpanded;
    void this.#app.settings.update({ doneExpanded: this.doneExpanded });
  }

  /** LIST-08, LIST-09 */
  toggleTodo(): void {
    this.todoExpanded = !this.todoExpanded;
    void this.#app.settings.update({ todoExpanded: this.todoExpanded });
  }

  /** 표시를 바로 바꾸고, 창에 적용하지 못하면 되돌린다 (WND-09). */
  async togglePin(): Promise<void> {
    const next = !this.pinned;
    this.pinned = next;
    try {
      await this.#app.placement.setPinned(next);
    } catch (error) {
      this.pinned = !next;
      this.#report('pin', error);
    }
  }

  /** WND-10 */
  async openMoreMenu(): Promise<void> {
    this.commitRename();
    this.contextMenu = null;
    this.confirmingReset = false;
    await this.menu.show();
  }

  /** INPUT-12 */
  openContextMenu(itemId: string, x: number, y: number): void {
    this.commitRename();
    this.menu.close();
    this.confirmingReset = false;
    this.contextMenu = { itemId, x, y };
  }

  closeContextMenu(): void {
    this.contextMenu = null;
  }

  /** INPUT-18, INPUT-19 */
  openReset(): void {
    if (this.itemCount === 0)
      return;
    this.confirmingReset = true;
  }

  cancelReset(): void {
    this.confirmingReset = false;
  }

  /** TASK-14. settings.json은 바꾸지 않는다 (INPUT-18). */
  confirmReset(): void {
    this.confirmingReset = false;
    this.#app.session.clear();
  }

  /** 바깥을 누르거나 창이 포커스를 잃으면 메뉴와 확인 판을 모두 닫는다(확인 판은 취소, D10). 투명도 미리 보기는 이때 저장한다. */
  closePopups(): void {
    this.menu.close();
    this.contextMenu = null;
    this.confirmingReset = false;
  }

  /** UPD-04, UPD-07 */
  installUpdate(): void {
    this.#app.updates.install().catch((error: unknown) => this.#report('update', error));
  }

  /** 가장자리를 끌기 시작했다. 메뉴를 닫고 이름 바꾸기를 저장한 뒤 바로 크기 조절을 시작한다 (WND-03). */
  startResize(edge: ResizeEdge, start: PointerStart): Promise<void> {
    this.closePopups();
    this.commitRename();
    return this.window.resize(edge, start);
  }

  dispose(): void {
    for (const stop of this.#stops)
      stop();
    this.#app.placement.dispose();
    this.#app.updates.dispose();
  }

  #track(): void {
    void this.#version;
  }

  #find(id: string): TodoItem | undefined {
    return this.#app.session.items.find((item) => item.id === id);
  }
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm vitest run src/presentation/widget-view-model.test.ts`
Expected: PASS (30 tests)

Run: Global Constraints의 Task 끝 검사
Expected: 모두 통과. `pnpm spec:check:strict`의 "테스트 없는 자동 테스트 항목"에서 LIST-01·06·07·08·10, INPUT-02·03·07·11~15·17~20이 빠진다.

- [ ] **Step 5: 커밋**

```bash
git add src/presentation/widget-view-model.svelte.ts src/presentation/widget-view-model.test.ts
git commit -m "feat: 목록·안내 줄·이름 바꾸기·우클릭 메뉴·초기화·📌를 드는 위젯 ViewModel을 더함"
```

---
### Task 10: 컴포넌트 테스트 도구, 입력칸, 할 일 줄

**spec:** INPUT-01·02·03·04·05·07·10(입력칸), INPUT-11·13·14·15·16(할 일 줄과 이름 바꾸기 칸)

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml` (dev 의존성 두 개)
- Modify: `vite.config.ts` (`svelteTesting`, 개발 서버 감시 범위)
- Create: `src/presentation/components/Icon.svelte`, `src/presentation/components/AddInput.svelte`, `src/presentation/components/TaskRow.svelte`
- Test: `src/presentation/components/AddInput.test.ts`, `src/presentation/components/TaskRow.test.ts`

**Interfaces:**
- Consumes: `WidgetViewModel`(Task 9), `isCommitEnter`·`joinLines`·`insertText`(Task 7), `hasLineBreak` (`src/domain/paste.ts`), `createTestApp`(Task 8)
- Produces:
  - `Icon.svelte` props `{ name: IconName; size: number }`, `type IconName = 'pin' | 'unpin' | 'more' | 'down' | 'right' | 'check'`(`<script module>`에서 내보낸다)
  - `AddInput.svelte` props `{ vm: WidgetViewModel }`
  - `TaskRow.svelte` props `{ vm: WidgetViewModel; item: TodoItem }`. 우클릭하면 `vm.openContextMenu(item.id, clientX, clientY)`

- [ ] **Step 1: dev 의존성 더하기 (D2)**

```bash
corepack enable
pnpm add -D -E @testing-library/svelte@5.4.2 happy-dom@20.14.5
grep -n "lockfileVersion" pnpm-lock.yaml
git diff --stat package.json pnpm-lock.yaml
```

Expected:
- `lockfileVersion: '9.0'`
- `package.json` devDependencies에 `"@testing-library/svelte": "5.4.2"`, `"happy-dom": "20.14.5"` 두 줄만 더해진다.

- [ ] **Step 2: Vite 설정 바꾸기**

`vite.config.ts` 전체:

```ts
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // svelteTesting: 테스트 라이브러리도 Vite가 컴파일하게 한다(라이브러리 안에 runes 파일이 있다).
  // 테스트 뒤 정리는 컴포넌트 테스트 파일이 afterEach(cleanup)로 직접 한다. node 환경 테스트에 DOM 정리를 끼우지 않기 위해서다.
  plugins: [svelte({ configFile: false }), svelteTesting({ autoCleanup: false })],
  clearScreen: false,
  // 개발 서버가 Rust 빌드 결과(src-tauri/target)까지 감시하지 않게 한다 (계획 2에서 넘긴 일).
  server: { port: 1420, strictPort: true, watch: { ignored: ['**/src-tauri/**'] } },
  build: { target: 'es2022' },
  test: {
    include: ['src/**/*.test.ts', 'tools/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 3: 실패하는 컴포넌트 테스트 쓰기**

`src/presentation/components/AddInput.test.ts`:

```ts
// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { createTestApp } from '../../testing/test-app.ts';
import { createTranslator } from '../i18n/translator.ts';
import { WidgetViewModel } from '../widget-view-model.svelte.ts';
import AddInput from './AddInput.svelte';

afterEach(() => cleanup());

async function setup() {
  const test = await createTestApp();
  const vm = new WidgetViewModel({ app: test.app, t: createTranslator('ko'), report: () => undefined });
  const view = render(AddInput, { props: { vm } });
  const input = view.container.querySelector('input') as HTMLInputElement;
  const titles = (): string[] => test.app.session.items.map((item) => item.title);
  return { ...test, vm, input, titles };
}

describe('입력칸', () => {
  it('INPUT-01 입력칸이 비어 있으면 "할 일 추가"를 흐리게 보여 준다', async () => {
    const { input } = await setup();
    expect(input.placeholder).toBe('할 일 추가');
  });

  it('INPUT-02 Enter를 누르면 추가하고 입력칸을 비우며, 포커스는 입력칸에 남는다', async () => {
    const { input, titles } = await setup();
    input.focus();
    await fireEvent.input(input, { target: { value: '보고서 쓰기' } });
    await fireEvent.keyDown(input, { key: 'Enter' });
    expect(titles()).toEqual(['보고서 쓰기']);
    expect(input.value).toBe('');
    expect(document.activeElement).toBe(input);
  });

  it('INPUT-03 빈 입력에서 Enter는 아무것도 하지 않고 입력칸 내용도 그대로다', async () => {
    const { input, titles } = await setup();
    await fireEvent.input(input, { target: { value: '   ' } });
    await fireEvent.keyDown(input, { key: 'Enter' });
    expect(titles()).toEqual([]);
    expect(input.value).toBe('   ');
  });

  it('INPUT-04 Esc를 누르면 입력하던 글자를 지우고 아무것도 추가하지 않는다', async () => {
    const { input, titles } = await setup();
    await fireEvent.input(input, { target: { value: '보고서' } });
    await fireEvent.keyDown(input, { key: 'Escape' });
    expect([input.value, titles()]).toEqual(['', []]);
  });

  it('INPUT-05 조합을 확정하는 Enter로는 추가하지 않고, 확정 뒤 Enter로 마지막 글자까지 정확히 하나 추가한다', async () => {
    const { input, titles } = await setup();
    await fireEvent.compositionStart(input);
    await fireEvent.input(input, { target: { value: '보고서 쓰' } });
    await fireEvent.input(input, { target: { value: '보고서 쓰기' } });
    await fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    expect(titles()).toEqual([]);
    await fireEvent.compositionEnd(input);
    await fireEvent.keyDown(input, { key: 'Enter' });
    await fireEvent.keyDown(input, { key: 'Enter' });
    expect(titles()).toEqual(['보고서 쓰기']);
    expect(input.value).toBe('');
  });

  it('INPUT-07 여러 줄을 붙여 넣으면 줄마다 바로 추가하고, 쓰던 글자는 그대로 남는다', async () => {
    const { input, titles } = await setup();
    await fireEvent.input(input, { target: { value: '쓰던 글' } });
    const notPrevented = await fireEvent.paste(input, { clipboardData: { getData: () => '보고서\n\n- 장보기\n' } });
    expect(notPrevented).toBe(false);
    expect(titles()).toEqual(['보고서', '장보기']);
    expect(input.value).toBe('쓰던 글');
  });

  it('INPUT-10 한 줄 붙여넣기는 막지 않아 입력칸에 그대로 들어가고, 바로 추가하지 않는다', async () => {
    const { input, titles } = await setup();
    const notPrevented = await fireEvent.paste(input, { clipboardData: { getData: () => '보고서' } });
    expect(notPrevented).toBe(true);
    expect(titles()).toEqual([]);
  });
});
```

`src/presentation/components/TaskRow.test.ts`:

```ts
// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { TASKS_FILE } from '../../application/storage/task-repository.ts';
import { createTestApp } from '../../testing/test-app.ts';
import { createTranslator } from '../i18n/translator.ts';
import { WidgetViewModel } from '../widget-view-model.svelte.ts';
import TaskRow from './TaskRow.svelte';

afterEach(() => cleanup());

async function setup(title = '초안') {
  const test = await createTestApp();
  test.app.session.add(title);
  await test.app.session.whenSaved();
  const vm = new WidgetViewModel({ app: test.app, t: createTranslator('ko'), report: () => undefined });
  const item = test.app.session.items[0];
  if (!item)
    throw new Error('할 일이 없어요');
  const view = render(TaskRow, { props: { vm, item } });
  const field = (): HTMLTextAreaElement | null => view.container.querySelector('textarea');
  const startRename = async (): Promise<HTMLTextAreaElement> => {
    await fireEvent.dblClick(view.container.querySelector('.text') as HTMLElement);
    const opened = field();
    if (!opened)
      throw new Error('이름 바꾸기 칸이 없어요');
    return opened;
  };
  const current = () => test.app.session.items[0];
  const taskWrites = () => test.files.writes.filter((name) => name === TASKS_FILE).length;
  return { ...test, vm, view, field, startRename, current, taskWrites };
}

describe('할 일 줄', () => {
  it('INPUT-11 동그라미를 누르면 상태가 한 단계 바뀌고, 툴팁은 "상태 바꾸기"다', async () => {
    const { view, current } = await setup();
    const mark = view.container.querySelector('.mark') as HTMLButtonElement;
    expect(mark.title).toBe('상태 바꾸기');
    await fireEvent.click(mark);
    expect(current()?.status).toBe('doing');
  });

  it('INPUT-11 이름을 바꾸던 중 동그라미를 누르면 이름을 먼저 저장한다', async () => {
    const { view, startRename, current } = await setup();
    const field = await startRename();
    await fireEvent.input(field, { target: { value: '보고서' } });
    await fireEvent.click(view.container.querySelector('.mark') as HTMLButtonElement);
    expect(current()).toMatchObject({ title: '보고서', status: 'doing' });
  });

  it('INPUT-13 제목을 더블클릭하면 이름 바꾸기 칸이 열려 포커스를 받고 글자 전체가 선택된다', async () => {
    const { startRename } = await setup();
    const field = await startRename();
    expect(document.activeElement).toBe(field);
    expect([field.value, field.selectionStart, field.selectionEnd]).toEqual(['초안', 0, 2]);
  });

  it('INPUT-14 Enter로 저장하고, Enter와 포커스 이탈이 같이 일어나도 한 번만 저장한다', async () => {
    const { startRename, field, current, app, taskWrites } = await setup();
    const before = taskWrites();
    const opened = await startRename();
    await fireEvent.input(opened, { target: { value: '보고서 초안' } });
    await fireEvent.keyDown(opened, { key: 'Enter' });
    await fireEvent.blur(opened);
    await app.session.whenSaved();
    expect([current()?.title, field(), taskWrites()]).toEqual(['보고서 초안', null, before + 1]);
  });

  it('INPUT-14 조합 중 Enter로는 저장하지 않고, 확정 뒤 Enter로 마지막 글자까지 저장한다', async () => {
    const { startRename, current } = await setup();
    const opened = await startRename();
    await fireEvent.compositionStart(opened);
    await fireEvent.input(opened, { target: { value: '보고서 쓰기' } });
    await fireEvent.keyDown(opened, { key: 'Enter', isComposing: true });
    expect(current()?.title).toBe('초안');
    await fireEvent.compositionEnd(opened);
    await fireEvent.keyDown(opened, { key: 'Enter' });
    expect(current()?.title).toBe('보고서 쓰기');
  });

  it('INPUT-14 다른 곳을 클릭해 포커스가 떠나면 저장한다', async () => {
    const { startRename, current } = await setup();
    const opened = await startRename();
    await fireEvent.input(opened, { target: { value: '보고서' } });
    await fireEvent.blur(opened);
    expect(current()?.title).toBe('보고서');
  });

  it('INPUT-14 정리한 뒤 빈 제목이면 원래 제목으로 돌아간다', async () => {
    const { startRename, current, field, view } = await setup();
    const opened = await startRename();
    await fireEvent.input(opened, { target: { value: '   ' } });
    await fireEvent.keyDown(opened, { key: 'Enter' });
    expect([current()?.title, field(), view.container.querySelector('.text')?.textContent]).toEqual(['초안', null, '초안']);
  });

  it('INPUT-15 Esc를 누르면 입력한 내용을 버리고 저장하지 않는다', async () => {
    const { startRename, current, field, taskWrites } = await setup();
    const before = taskWrites();
    const opened = await startRename();
    await fireEvent.input(opened, { target: { value: '보고서' } });
    await fireEvent.keyDown(opened, { key: 'Escape' });
    expect([current()?.title, field(), taskWrites()]).toEqual(['초안', null, before]);
  });

  it('INPUT-16 여러 줄을 붙여 넣으면 한 줄로 합쳐 커서 자리에 넣고, 커서를 그 뒤에 두며, 바로 추가하지 않는다', async () => {
    const { startRename, app, field } = await setup();
    const opened = await startRename();
    opened.setSelectionRange(2, 2);
    const notPrevented = await fireEvent.paste(opened, { clipboardData: { getData: () => 'A\nB' } });
    expect(notPrevented).toBe(false);
    expect([opened.value, opened.selectionStart]).toEqual(['초안A B', 5]);
    expect([app.session.items.length, field()]).toEqual([1, opened]);
  });

  it('INPUT-12 이름 바꾸기 중에 우클릭하면 할 일 메뉴를 열지 않고 OS 기본 메뉴를 둔다', async () => {
    const { startRename, vm } = await setup();
    const opened = await startRename();
    const notPrevented = await fireEvent.contextMenu(opened);
    expect([notPrevented, vm.contextMenu, vm.renaming !== null]).toEqual([true, null, true]);
  });

  it('INPUT-14 칸에 줄바꿈을 넣는 입력은 막는다', async () => {
    const { startRename } = await setup();
    const opened = await startRename();
    const event = new InputEvent('beforeinput', { inputType: 'insertLineBreak', cancelable: true, bubbles: true });
    opened.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});
```

- [ ] **Step 4: 실패 확인**

Run: `pnpm vitest run src/presentation/components`
Expected: FAIL — `Failed to resolve import "./AddInput.svelte"`, `"./TaskRow.svelte"`

- [ ] **Step 5: 구현**

`src/presentation/components/Icon.svelte` (시안 `<symbol>` 그대로, D7):

```svelte
<script lang="ts" module>
  export type IconName = 'pin' | 'unpin' | 'more' | 'down' | 'right' | 'check';
</script>

<script lang="ts">
  let { name, size }: { name: IconName; size: number } = $props();
</script>

{#if name === 'pin' || name === 'unpin'}
  <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
    <path
      d="M9.6 1.6l4.8 4.8-1.3.5-2.6 2.6-.3 2.8-1.1 1.1L6.4 10.7 2.6 14.5 1.5 14.5 1.5 13.4 5.3 9.6 2.6 6.9l1.1-1.1 2.8-.3 2.6-2.6z"
      fill="none"
      stroke="currentColor"
      stroke-width="1.3"
      stroke-linejoin="round"
    />
    {#if name === 'unpin'}
      <path d="M1.5 1.5l13 13" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
    {/if}
  </svg>
{:else if name === 'more'}
  <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
    <circle cx="3" cy="8" r="1.25" fill="currentColor" />
    <circle cx="8" cy="8" r="1.25" fill="currentColor" />
    <circle cx="13" cy="8" r="1.25" fill="currentColor" />
  </svg>
{:else if name === 'down'}
  <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden="true">
    <path d="M1.5 3.5L5 7l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
{:else if name === 'right'}
  <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden="true">
    <path d="M3.5 1.5L7 5 3.5 8.5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
{:else}
  <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden="true">
    <path d="M2 6.3l2.6 2.6L10 3.4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
{/if}

<style>
  svg {
    display: block;
  }
</style>
```

`src/presentation/components/AddInput.svelte` (시안 `.adder`, `.plus`, `.ph`):

```svelte
<script lang="ts">
  import { hasLineBreak } from '../../domain/paste.ts';
  import { isCommitEnter } from '../input/enter-key.ts';
  import type { WidgetViewModel } from '../widget-view-model.svelte.ts';

  let { vm }: { vm: WidgetViewModel } = $props();

  let text = $state('');

  function onKeydown(event: KeyboardEvent & { currentTarget: HTMLInputElement }): void {
    if (event.isComposing)
      return;
    if (event.key === 'Escape') {
      text = ''; // INPUT-04
      return;
    }
    if (!isCommitEnter(event))
      return;
    event.preventDefault();
    // 바인딩을 기다리지 않고 칸의 실제 글을 읽는다. IME가 마지막 글자를 막 확정했어도 빠지지 않는다 (INPUT-05).
    if (vm.add(event.currentTarget.value))
      text = ''; // INPUT-02. 추가하지 않았으면 그대로 둔다 (INPUT-03)
  }

  /** 여러 줄이면 막고 줄마다 바로 추가한다. 쓰던 글자는 그대로 둔다 (INPUT-07). 한 줄은 OS 기본 붙여넣기 (INPUT-10). */
  function onPaste(event: ClipboardEvent): void {
    const pasted = event.clipboardData?.getData('text/plain') ?? '';
    if (!hasLineBreak(pasted))
      return;
    event.preventDefault();
    vm.add(pasted);
  }
</script>

<div class="adder">
  <span class="plus" aria-hidden="true">+</span>
  <input
    class="field"
    type="text"
    bind:value={text}
    placeholder={vm.t('input.placeholder')}
    aria-label={vm.t('input.placeholder')}
    spellcheck="false"
    autocomplete="off"
    onkeydown={onKeydown}
    onpaste={onPaste}
  />
</div>

<style>
  .adder {
    display: flex;
    align-items: center;
    border-top: 1px solid var(--line);
    margin-top: 12px;
    padding-top: 10px;
  }

  .plus {
    font-size: 16px;
    line-height: 20px;
    color: var(--hint);
    margin: 0 10px 0 2px;
  }

  .field {
    flex: 1;
    min-width: 0;
    margin: 0;
    padding: 0;
    border: 0;
    outline: none;
    background: transparent;
    font-size: 14.5px;
    line-height: 20px;
    color: var(--ink);
    caret-color: var(--ink);
  }

  .field::placeholder {
    color: var(--hint);
    opacity: 1;
  }
</style>
```

`src/presentation/components/TaskRow.svelte` (시안 `.row`, `.mark`, `.ring`, `.core`, `.text`, `.text.editing`):

```svelte
<script lang="ts">
  import { hasLineBreak } from '../../domain/paste.ts';
  import type { TodoItem } from '../../domain/todo-item.ts';
  import { isCommitEnter } from '../input/enter-key.ts';
  import { insertText, joinLines } from '../input/rename-paste.ts';
  import type { WidgetViewModel } from '../widget-view-model.svelte.ts';

  let { vm, item }: { vm: WidgetViewModel; item: TodoItem } = $props();

  const editing = $derived(vm.renaming?.id === item.id);

  /** 칸 높이를 내용에 맞춘다. 긴 제목도 칸 안에서 줄을 바꿔 전부 보인다 (LIST-11, D17). */
  function fitHeight(node: HTMLTextAreaElement): void {
    node.style.height = '0px';
    node.style.height = `${node.scrollHeight}px`;
  }

  /** 칸이 열리면 포커스를 받고 글자 전체를 고른다 (INPUT-13). */
  function startEditing(node: HTMLTextAreaElement): void {
    fitHeight(node);
    node.focus();
    node.select();
  }

  function onKeydown(event: KeyboardEvent & { currentTarget: HTMLTextAreaElement }): void {
    if (event.isComposing)
      return;
    if (event.key === 'Escape') {
      event.preventDefault();
      vm.cancelRename(); // INPUT-15
      return;
    }
    if (isCommitEnter(event)) {
      event.preventDefault();
      vm.commitRename(event.currentTarget.value); // INPUT-14
    }
  }

  /** Enter가 칸에 줄바꿈을 넣지 않게 한다. IME 조합 입력은 그대로 둔다 (D3). */
  function onBeforeInput(event: InputEvent): void {
    if (event.inputType === 'insertLineBreak' || event.inputType === 'insertParagraph')
      event.preventDefault();
  }

  function onInput(event: Event & { currentTarget: HTMLTextAreaElement }): void {
    fitHeight(event.currentTarget);
    vm.updateDraft(event.currentTarget.value);
  }

  /** 여러 줄은 줄바꿈을 공백으로 바꿔 커서 자리에 넣고 커서를 그 뒤에 둔다. 한 줄은 OS 기본 붙여넣기 (INPUT-16). */
  function onPaste(event: ClipboardEvent & { currentTarget: HTMLTextAreaElement }): void {
    const pasted = event.clipboardData?.getData('text/plain') ?? '';
    if (!hasLineBreak(pasted))
      return;
    event.preventDefault();
    const field = event.currentTarget;
    const next = insertText(field.value, field.selectionStart, field.selectionEnd, joinLines(pasted));
    field.value = next.value;
    field.setSelectionRange(next.caret, next.caret);
    fitHeight(field);
    vm.updateDraft(next.value);
  }

  /** 이름 바꾸기 중에는 할 일 메뉴 대신 OS 기본 메뉴(잘라내기·복사·붙여넣기)를 둔다 (D25, v1.4 TextBox). */
  function onContextMenu(event: MouseEvent): void {
    if (editing)
      return;
    event.preventDefault();
    vm.openContextMenu(item.id, event.clientX, event.clientY);
  }
</script>

<div class="row" class:doing={item.status === 'doing'} class:done={item.status === 'done'} role="presentation" oncontextmenu={onContextMenu}>
  <!-- 동그라미는 포커스를 가져가지 않는다. 이름 바꾸기 칸이 열려 있으면 vm.cycle이 먼저 저장한다 (INPUT-11). -->
  <button
    type="button"
    class="mark"
    tabindex="-1"
    title={vm.t('item.changeStatus')}
    aria-label={vm.t('item.changeStatus')}
    onmousedown={(event) => event.preventDefault()}
    onclick={() => vm.cycle(item.id)}
  >
    <span class="ring"></span>
    <span class="core"></span>
  </button>
  {#if editing}
    <textarea
      class="text editing"
      rows="1"
      spellcheck="false"
      value={vm.renaming?.draft ?? item.title}
      use:startEditing
      onkeydown={onKeydown}
      onbeforeinput={onBeforeInput}
      oninput={onInput}
      onpaste={onPaste}
      onblur={(event) => vm.commitRename(event.currentTarget.value)}
    ></textarea>
  {:else}
    <span class="text" role="presentation" ondblclick={() => vm.startRename(item.id)}>{item.title}</span>
  {/if}
</div>

<style>
  .row {
    display: flex;
    align-items: flex-start;
    padding: 8px 10px;
    margin: 1px 0;
    border-radius: 10px;
  }

  .row.doing {
    background: rgba(var(--doingbg), var(--a));
  }

  .mark {
    all: unset;
    flex: none;
    display: grid;
    place-items: center;
    width: 18px;
    height: 18px;
    margin: 1px 10px 0 0;
    cursor: pointer;
  }

  .ring {
    grid-area: 1 / 1;
    width: 16px;
    height: 16px;
    border: 2px solid var(--todo);
    border-radius: 50%;
  }

  .mark:hover .ring {
    opacity: 0.7;
  }

  .core {
    grid-area: 1 / 1;
    display: none;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--accent);
  }

  .row.doing .ring {
    border-color: var(--accent);
  }

  .row.doing .core {
    display: block;
  }

  .row.done .ring {
    border-color: var(--done);
    background: var(--done);
  }

  .text {
    flex: 1;
    min-width: 0;
    font-size: 14.5px;
    line-height: 20px;
    overflow-wrap: anywhere;
  }

  .row.done .text {
    color: var(--muted);
    text-decoration: line-through;
  }

  /* v1.4처럼 칸 테두리·배경 없이 커서와 선택 영역만 보인다. */
  .text.editing {
    display: block;
    margin: 0;
    padding: 0;
    border: 0;
    outline: none;
    background: transparent;
    resize: none;
    overflow: hidden;
    font: inherit;
    font-size: 14.5px;
    line-height: 20px;
    color: var(--ink);
    caret-color: var(--ink);
    text-decoration: none;
  }
</style>
```

- [ ] **Step 6: 통과 확인**

Run: `pnpm vitest run src/presentation/components`
Expected: PASS (18 tests)

`mount(...) is not available on the server` 같은 오류가 나면 happy-dom 환경에서도 Svelte 서버 코드가 쓰인 것이다. 설정을 짐작해 바꾸지 말고, 오류 전문과 함께 controller에게 알린다(개발 판단으로 기록한다).

Run: Global Constraints의 Task 끝 검사
Expected: 모두 통과. `svelte-check --fail-on-warnings`가 a11y 경고 없이 통과한다(이벤트를 받는 `div`·`span`은 `role="presentation"`이다).

- [ ] **Step 7: 커밋**

```bash
git add package.json pnpm-lock.yaml vite.config.ts src/presentation/components
git commit -m "feat: 입력칸과 할 일 줄 컴포넌트를 IME·붙여넣기·포커스 테스트와 함께 더함"
```

---

### Task 11: 메뉴와 확인 판 컴포넌트

**spec:** WND-10(⋯ 메뉴 항목 순서와 위치, 방향키), WND-11·12(투명도 줄), INPUT-12(우클릭 메뉴), INPUT-18·19(초기화 확인 판, 비활성)

**Files:**
- Create: `src/presentation/components/Menu.svelte`, `src/presentation/components/MoreMenu.svelte`, `src/presentation/components/ContextMenu.svelte`, `src/presentation/components/TransparencySlider.svelte`, `src/presentation/components/ResetConfirm.svelte`
- Test: `src/presentation/components/menus.test.ts`

**Interfaces:**
- Consumes: `WidgetViewModel`(Task 9), `placeMoreMenu`·`placeContextMenu`·`MENU_SHADOW`·`Anchor`·`Size`·`Position`·`moveHighlight`(Task 7), `Icon.svelte`(Task 10), `MAX_TRANSPARENCY_PERCENT`, `SHADOW_MARGIN`
- Produces:
  - `Menu.svelte` props `{ entries: MenuEntry[]; place: (size: Size) => Promise<Position>; onclose: () => void }`. `<script module>`에서 `MenuEntry`(`{ kind: 'item'; label; checkable?; checked?; disabled?; select }` | `{ kind: 'separator' }` | `{ kind: 'control'; content: Snippet }`)를 내보낸다. 처음에는 숨긴 채 그려 크기를 잰 뒤 `place`가 준 자리에 보이고 포커스를 받는다.
  - `MoreMenu.svelte` props `{ vm; anchor: Anchor }` (anchor는 stage 기준 ⋯ 버튼 위치)
  - `ContextMenu.svelte` props `{ vm; target: ContextMenuState; stage: HTMLElement }`
  - `TransparencySlider.svelte` props `{ label: string; percent: number; onchange: (percent: number) => void; onwheelstep: (up: boolean) => void }`
  - `ResetConfirm.svelte` props `{ vm; stage: HTMLElement }`

- [ ] **Step 1: 실패하는 컴포넌트 테스트 쓰기**

`src/presentation/components/menus.test.ts`:

```ts
// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { flush } from '../../testing/fake-timer.ts';
import { createTestApp } from '../../testing/test-app.ts';
import { createTranslator } from '../i18n/translator.ts';
import { WidgetViewModel } from '../widget-view-model.svelte.ts';
import ContextMenu from './ContextMenu.svelte';
import MoreMenu from './MoreMenu.svelte';
import ResetConfirm from './ResetConfirm.svelte';

afterEach(() => cleanup());

async function setup() {
  const test = await createTestApp();
  const vm = new WidgetViewModel({ app: test.app, t: createTranslator('ko'), report: () => undefined });
  return { ...test, vm };
}

const items = (container: HTMLElement): HTMLButtonElement[] => [...container.querySelectorAll<HTMLButtonElement>('.mi')];
const labels = (container: HTMLElement): string[] => items(container).map((item) => item.textContent?.trim() ?? '');

describe('⋯ 메뉴', () => {
  it('WND-10 자동 실행(체크), 투명도와 % 값과 슬라이더, 구분선, 초기화, 종료 순이다', async () => {
    const { vm } = await setup();
    await vm.openMoreMenu();
    const { container } = render(MoreMenu, { props: { vm, anchor: { top: 26, bottom: 54, right: 292 } } });
    await flush();
    expect(labels(container)).toEqual(['컴퓨터 켤 때 자동 실행', '초기화', '종료']);
    const children = [...(container.querySelector('.menu')?.children ?? [])].map((el) => el.className.split(' ')[0]);
    expect(children).toEqual(['mi', 'mctl', 'msep', 'mi', 'mi']);
    expect(container.querySelector('.mctl')?.textContent).toContain('투명도');
    expect(container.querySelector('.mctl')?.textContent).toContain('0%');
    expect(container.querySelector('input[type="range"]')).not.toBeNull();
  });

  it('WND-10 INPUT-19 방향키는 고를 수 있는 항목 사이를 돌고(비활성 초기화는 건너뜀), Enter로 고른다', async () => {
    const { vm, autoStart } = await setup();
    await vm.openMoreMenu();
    const { container } = render(MoreMenu, { props: { vm, anchor: { top: 26, bottom: 54, right: 292 } } });
    await flush();
    const menu = container.querySelector('.menu') as HTMLElement;
    expect(document.activeElement).toBe(menu);
    expect(items(container)[1]?.getAttribute('aria-disabled')).toBe('true');
    await fireEvent.keyDown(menu, { key: 'ArrowDown' });
    await fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(items(container)[2]?.classList.contains('hl')).toBe(true);
    await fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(items(container)[0]?.classList.contains('hl')).toBe(true);
    await fireEvent.keyDown(menu, { key: 'Enter' });
    await flush();
    expect([autoStart.enabled, vm.menu.open]).toEqual([true, false]);
  });

  it('WND-10 Esc를 누르면 닫는다', async () => {
    const { vm } = await setup();
    await vm.openMoreMenu();
    const { container } = render(MoreMenu, { props: { vm, anchor: { top: 26, bottom: 54, right: 292 } } });
    await flush();
    await fireEvent.keyDown(container.querySelector('.menu') as HTMLElement, { key: 'Escape' });
    expect(vm.menu.open).toBe(false);
  });

  it('WND-12 슬라이더를 움직이면 % 값과 카드 불투명도에 바로 보인다', async () => {
    const { vm } = await setup();
    await vm.openMoreMenu();
    const { container } = render(MoreMenu, { props: { vm, anchor: { top: 26, bottom: 54, right: 292 } } });
    await flush();
    const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
    await fireEvent.input(slider, { target: { value: '30' } });
    expect(container.querySelector('.pct')?.textContent).toBe('30%');
    expect(vm.menu.cardOpacity).toBe(0.7);
    slider.dispatchEvent(new WheelEvent('wheel', { deltaY: -3, deltaMode: 1, cancelable: true }));
    await flush();
    expect(container.querySelector('.pct')?.textContent).toBe('32%');
  });
});

describe('우클릭 메뉴', () => {
  it('INPUT-12 할 일·하는 중·끝낸 일(지금 상태에 체크)·이름 바꾸기·삭제 순이고, 고르면 바로 바뀐다', async () => {
    const { vm, app } = await setup();
    vm.add('장보기');
    const itemId = app.session.items[0]?.id ?? '';
    vm.openContextMenu(itemId, 100, 120);
    const { container } = render(ContextMenu, { props: { vm, target: { itemId, x: 100, y: 120 }, stage: document.body } });
    await flush();
    expect(labels(container)).toEqual(['할 일', '하는 중', '끝낸 일', '이름 바꾸기', '삭제']);
    expect(items(container).map((item) => item.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false', null, null]);
    expect(container.querySelector('.msep')).not.toBeNull();
    await fireEvent.click(items(container)[1] as HTMLButtonElement);
    expect([app.session.items[0]?.status, vm.contextMenu]).toEqual(['doing', null]);
  });
});

describe('초기화 확인 판', () => {
  it('INPUT-18 개수를 묻고, 바깥을 누르면 아무것도 지우지 않고 닫으며, 모두 지우기를 누르면 지운다', async () => {
    const { vm, app } = await setup();
    vm.add('보고서\n장보기');
    vm.openReset();
    const { container } = render(ResetConfirm, { props: { vm, stage: document.body } });
    expect(container.querySelector('.q')?.textContent).toBe('할 일 2개를 모두 지울까요?');
    expect(container.querySelector('.w')?.textContent).toBe('지운 뒤에는 되돌릴 수 없어요.');
    const buttons = [...container.querySelectorAll('button')].map((button) => button.textContent);
    expect(buttons).toEqual(['취소', '모두 지우기']);
    await fireEvent.click(container.querySelector('.confirm') as HTMLElement);
    expect(vm.confirmingReset).toBe(true);
    await fireEvent.click(container.querySelector('.overlay') as HTMLElement);
    expect([vm.confirmingReset, app.session.items.length]).toEqual([false, 2]);
    vm.openReset();
    await fireEvent.click(container.querySelector('.danger') as HTMLElement);
    expect([vm.confirmingReset, app.session.items.length]).toEqual([false, 0]);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm vitest run src/presentation/components/menus.test.ts`
Expected: FAIL — `Failed to resolve import "./ContextMenu.svelte"`

- [ ] **Step 3: 구현**

`src/presentation/components/Menu.svelte` (시안 `.menu`, `.mi`, `.chk`, `.msep`, `.mctl`; v1.4 6장):

```svelte
<script lang="ts" module>
  import type { Snippet } from 'svelte';

  export interface MenuItemEntry {
    kind: 'item';
    label: string;
    /** 체크 표시가 있을 수 있는 항목(자동 실행, 상태). */
    checkable?: boolean;
    checked?: boolean;
    disabled?: boolean;
    select: () => void;
  }

  export interface MenuSeparator {
    kind: 'separator';
  }

  /** 눌러도 메뉴가 닫히지 않고 방향키로 고르지 않는 줄(투명도). */
  export interface MenuControl {
    kind: 'control';
    content: Snippet;
  }

  export type MenuEntry = MenuItemEntry | MenuSeparator | MenuControl;
</script>

<script lang="ts">
  import { untrack } from 'svelte';
  import type { Position, Size } from '../menu/menu-placement.ts';
  import { moveHighlight } from '../menu/menu-navigation.ts';
  import Icon from './Icon.svelte';

  let { entries, place, onclose }: { entries: MenuEntry[]; place: (size: Size) => Promise<Position>; onclose: () => void } = $props();

  let element: HTMLDivElement | null = $state(null);
  let position = $state<Position | null>(null);
  let highlighted = $state<number | null>(null);

  const selectable = $derived(entries.map((entry) => entry.kind === 'item' && entry.disabled !== true));

  // 숨긴 채 그려 크기를 잰 뒤, 자리를 정해 보이고 키보드를 받게 포커스를 둔다 (WND-10, D6).
  $effect(() => {
    const el = element;
    if (!el)
      return;
    let cancelled = false;
    void untrack(() => place({ width: el.offsetWidth, height: el.offsetHeight })).then((next) => {
      if (cancelled)
        return;
      position = next;
      el.focus();
    });
    return () => {
      cancelled = true;
    };
  });

  function choose(entry: MenuEntry | undefined): void {
    if (entry?.kind !== 'item' || entry.disabled === true)
      return;
    entry.select();
  }

  function onKeydown(event: KeyboardEvent): void {
    // 투명도 슬라이더에 포커스가 있으면 방향키와 Space는 슬라이더가 쓴다. Esc는 그대로 메뉴를 닫는다 (리뷰 M11).
    if (event.target instanceof HTMLInputElement && event.key !== 'Escape' && event.key !== 'Enter')
      return;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        highlighted = moveHighlight(selectable, highlighted, 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        highlighted = moveHighlight(selectable, highlighted, -1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        choose(highlighted === null ? undefined : entries[highlighted]);
        break;
      case 'Escape':
        event.preventDefault();
        onclose();
        break;
    }
  }
</script>

<div
  class="menu"
  role="menu"
  tabindex="-1"
  bind:this={element}
  style:left="{position?.left ?? 0}px"
  style:top="{position?.top ?? 0}px"
  style:visibility={position ? 'visible' : 'hidden'}
  onkeydown={onKeydown}
>
  {#each entries as entry, index (index)}
    {#if entry.kind === 'separator'}
      <div class="msep" role="separator"></div>
    {:else if entry.kind === 'control'}
      <div class="mctl">{@render entry.content()}</div>
    {:else}
      <button
        type="button"
        class="mi"
        class:hl={highlighted === index}
        class:disabled={entry.disabled === true}
        role={entry.checkable ? 'menuitemcheckbox' : 'menuitem'}
        aria-checked={entry.checkable ? entry.checked === true : undefined}
        aria-disabled={entry.disabled === true ? 'true' : undefined}
        tabindex="-1"
        onpointerenter={() => (highlighted = entry.disabled === true ? null : index)}
        onpointerleave={() => (highlighted = null)}
        onclick={() => choose(entry)}
      >
        <span class="chk">
          {#if entry.checked}
            <Icon name="check" size={12} />
          {/if}
        </span>
        {entry.label}
      </button>
    {/if}
  {/each}
</div>

<style>
  .menu {
    position: absolute;
    z-index: 5;
    min-width: 150px;
    padding: 5px;
    border: 1px solid var(--line);
    border-radius: 12px;
    background: #fff;
    box-shadow: 0 3px 12px rgba(var(--shadow), 0.14);
    font-size: 13.5px;
    line-height: 18px;
    color: var(--ink);
    outline: none;
  }

  .mi {
    all: unset;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    width: 100%;
    padding: 7px 10px 7px 8px;
    border-radius: 8px;
    white-space: nowrap;
    cursor: default;
  }

  .mi.hl {
    background: var(--hover);
  }

  .mi.disabled {
    opacity: 0.45;
  }

  .chk {
    flex: none;
    display: grid;
    align-items: center;
    width: 22px;
    color: var(--accent);
  }

  .msep {
    height: 1px;
    margin: 5px 8px;
    background: var(--line);
  }

  .mctl {
    padding: 7px 10px 6px 8px;
  }
</style>
```

`src/presentation/components/TransparencySlider.svelte` (시안 `.mctl .inner`, `.slider`; D23):

```svelte
<script lang="ts">
  import { MAX_TRANSPARENCY_PERCENT } from '../../domain/opacity.ts';
  import { WheelSteps } from '../input/wheel-steps.ts';

  let { label, percent, onchange, onwheelstep }: { label: string; percent: number; onchange: (percent: number) => void; onwheelstep: (up: boolean) => void } = $props();

  const wheel = new WheelSteps();

  /**
   * 휠 한 칸에 2%. 메뉴가 스크롤되지 않게 기본 동작을 막는다 (WND-12). passive가 아니어야 막을 수 있다.
   * WebKit(macOS)은 "자연스러운 스크롤"이면 deltaY를 뒤집고 webkitDirectionInvertedFromDevice로 알려 준다. 그 값으로 실제 방향을 되찾는다.
   * WebView2(Windows)에는 이 값이 없고, 휠 방향을 뒤집지도 않는다.
   */
  function wheelStep(node: HTMLElement): { destroy: () => void } {
    const handler = (event: WheelEvent): void => {
      event.preventDefault();
      const inverted = (event as WheelEvent & { webkitDirectionInvertedFromDevice?: boolean }).webkitDirectionInvertedFromDevice === true;
      const legacy = (event as WheelEvent & { wheelDeltaY?: number }).wheelDeltaY;
      const steps = wheel.steps({ deltaY: event.deltaY, deltaMode: event.deltaMode, invertedFromDevice: inverted, wheelDeltaY: legacy });
      for (let i = 0; i < Math.abs(steps); i++)
        onwheelstep(steps > 0);
    };
    node.addEventListener('wheel', handler, { passive: false });
    return { destroy: () => node.removeEventListener('wheel', handler) };
  }
</script>

<div class="inner">
  <div class="top">
    <span>{label}</span>
    <span class="pct">{percent}%</span>
  </div>
  <input
    class="slider"
    type="range"
    min="0"
    max={MAX_TRANSPARENCY_PERCENT}
    step="1"
    value={percent}
    aria-label={label}
    style:--fill="{(percent / MAX_TRANSPARENCY_PERCENT) * 100}%"
    oninput={(event) => onchange(Number(event.currentTarget.value))}
    use:wheelStep
  />
</div>

<style>
  .inner {
    width: 170px;
    margin-left: 22px;
  }

  .top {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .pct {
    font-size: 12.5px;
    color: var(--muted);
  }

  .slider {
    -webkit-appearance: none;
    appearance: none;
    display: block;
    width: 100%;
    height: 20px;
    margin: 6px 0 0;
    background: transparent;
    cursor: pointer;
  }

  .slider:focus {
    outline: none;
  }

  .slider::-webkit-slider-runnable-track {
    height: 4px;
    border-radius: 2px;
    background: linear-gradient(to right, var(--accent) var(--fill), var(--line) var(--fill));
  }

  .slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    margin-top: -5px;
    border: 2px solid var(--accent);
    border-radius: 50%;
    background: #fff;
  }

  .slider:hover::-webkit-slider-thumb {
    background: rgb(var(--doingbg));
  }
</style>
```

`src/presentation/components/MoreMenu.svelte`:

```svelte
<script lang="ts">
  import { type Anchor, MENU_SHADOW, type Position, type Size, placeMoreMenu } from '../menu/menu-placement.ts';
  import type { WidgetViewModel } from '../widget-view-model.svelte.ts';
  import Menu, { type MenuEntry } from './Menu.svelte';
  import TransparencySlider from './TransparencySlider.svelte';

  let { vm, anchor }: { vm: WidgetViewModel; anchor: Anchor } = $props();

  /** WND-10 항목 순서. */
  const entries: MenuEntry[] = $derived([
    { kind: 'item', label: vm.t('menu.autoStart'), checkable: true, checked: vm.menu.autoStartChecked, select: () => void vm.menu.toggleAutoStart() },
    { kind: 'control', content: transparency },
    { kind: 'separator' },
    { kind: 'item', label: vm.t('menu.reset'), disabled: !vm.menu.resetEnabled, select: () => vm.menu.reset() },
    { kind: 'item', label: vm.t('menu.quit'), select: () => vm.menu.quit() },
  ]);

  /** ⋯ 버튼 아래(모자라면 위)에 오른쪽 끝을 맞추고, 창 밖으로 나가면 창을 늘린다 (WND-10). */
  async function place(size: Size): Promise<Position> {
    const token = vm.window.popupToken;
    const room = await vm.window.room();
    const position = placeMoreMenu(anchor, size, vm.window.baseHeight, room);
    await vm.window.fitPopup(token, { top: position.top, bottom: position.top + size.height }, MENU_SHADOW);
    return position;
  }
</script>

{#snippet transparency()}
  <TransparencySlider
    label={vm.t('menu.transparency')}
    percent={vm.menu.transparency}
    onchange={(percent) => vm.menu.setTransparency(percent)}
    onwheelstep={(up) => vm.menu.wheel(up)}
  />
{/snippet}

<Menu {entries} {place} onclose={() => vm.menu.close()} />
```

`src/presentation/components/ContextMenu.svelte`:

```svelte
<script lang="ts">
  import { MENU_SHADOW, type Position, type Size, placeContextMenu } from '../menu/menu-placement.ts';
  import type { ContextMenuState, WidgetViewModel } from '../widget-view-model.svelte.ts';
  import Menu, { type MenuEntry } from './Menu.svelte';

  let { vm, target, stage }: { vm: WidgetViewModel; target: ContextMenuState; stage: HTMLElement } = $props();

  /** INPUT-12 항목 순서. */
  const entries: MenuEntry[] = $derived([
    ...vm.statusChoices(target.itemId).map(
      (choice): MenuEntry => ({ kind: 'item', label: choice.label, checkable: true, checked: choice.checked, select: () => vm.setStatus(target.itemId, choice.status) }),
    ),
    { kind: 'separator' },
    { kind: 'item', label: vm.t('item.rename'), select: () => vm.startRename(target.itemId) },
    { kind: 'item', label: vm.t('item.delete'), select: () => vm.remove(target.itemId) },
  ]);

  /** 판 왼쪽 위가 커서 자리다. 창 밖으로 나가면 창을 늘린다 (D6, WND-10). */
  async function place(size: Size): Promise<Position> {
    const token = vm.window.popupToken;
    const box = stage.getBoundingClientRect();
    const room = await vm.window.room();
    const position = placeContextMenu({ x: target.x - box.left, y: target.y - box.top }, size, { width: box.width, height: vm.window.baseHeight }, room);
    await vm.window.fitPopup(token, { top: position.top, bottom: position.top + size.height }, MENU_SHADOW);
    return position;
  }
</script>

<Menu {entries} {place} onclose={() => vm.closeContextMenu()} />
```

`src/presentation/components/ResetConfirm.svelte` (시안 `.overlay`, `.confirm`, `.pill`; v1.4 3.5):

```svelte
<script lang="ts">
  import { untrack } from 'svelte';
  import { SHADOW_MARGIN } from '../../domain/window-geometry.ts';
  import type { WidgetViewModel } from '../widget-view-model.svelte.ts';

  let { vm, stage }: { vm: WidgetViewModel; stage: HTMLElement } = $props();

  let overlay: HTMLDivElement | null = $state(null);

  // 판이 카드보다 크면 덮개가 판만큼 커진다. 그때는 창을 늘려 판이 잘리지 않게 한다 (WND-10).
  $effect(() => {
    const el = overlay;
    if (!el)
      return;
    const box = stage.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    untrack(() => void vm.window.fitPopup(vm.window.popupToken, { top: rect.top - box.top, bottom: rect.bottom - box.top }, { top: 0, bottom: SHADOW_MARGIN }));
  });

  /** 판 바깥(옅게 덮인 부분)을 누르면 취소다 (INPUT-18). */
  function onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget)
      vm.cancelReset();
  }
</script>

<div class="overlay" role="presentation" bind:this={overlay} onclick={onOverlayClick}>
  <div class="confirm" role="dialog" aria-modal="true" aria-labelledby="reset-question">
    <div class="q" id="reset-question">{vm.resetQuestion}</div>
    <div class="w">{vm.t('reset.warning')}</div>
    <div class="btns">
      <button type="button" class="pill" onclick={() => vm.cancelReset()}>{vm.t('reset.cancel')}</button>
      <button type="button" class="pill danger" onclick={() => vm.confirmReset()}>{vm.t('reset.confirm')}</button>
    </div>
  </div>
</div>

<style>
  /* 카드 전체를 덮는다. 판이 카드보다 크면 판만큼 커진다. 덮개는 투명도와 관계없이 흰색 70%다(v1.4 M:188). */
  .overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 6;
    display: flex;
    align-items: center;
    min-height: 100%;
    padding: 12px 16px;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.7);
  }

  .confirm {
    width: 100%;
    padding: 14px 14px 14px 16px;
    border: 1px solid var(--line);
    border-radius: 14px;
    background: #fff;
    box-shadow: 0 3px 14px rgba(var(--shadow), 0.16);
  }

  .q {
    font-size: 14px;
    font-weight: 600;
    line-height: 19px;
  }

  .w {
    margin-top: 4px;
    font-size: 12.5px;
    line-height: 17px;
    color: var(--muted);
  }

  .btns {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 6px;
    margin-top: 14px;
  }

  .pill {
    padding: 7px 14px;
    border: 0;
    border-radius: 9px;
    background: rgb(var(--foldbg));
    font: inherit;
    font-size: 13px;
    line-height: 18px;
    color: var(--ink);
    cursor: pointer;
  }

  .pill:hover {
    background: var(--hover);
  }

  .pill.danger {
    background: var(--danger);
    color: #fff;
    font-weight: 600;
  }

  .pill.danger:hover {
    background: var(--danger-hover);
  }
</style>
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm vitest run src/presentation/components`
Expected: PASS (Task 10의 18개 포함 24 tests)

Run: Global Constraints의 Task 끝 검사
Expected: 모두 통과

- [ ] **Step 5: 커밋**

```bash
git add src/presentation/components
git commit -m "feat: ⋯ 메뉴·우클릭 메뉴·투명도 슬라이더·초기화 확인 판을 v1.4 카드 모양으로 더함"
```

---
### Task 12: 위젯 화면 조립

**spec:** WND-01(카드·그림자), WND-02(헤더 끌기는 왼쪽 버튼만), WND-03(크기 조절 가장자리, 내용 맞추기), WND-09·10(헤더 버튼과 툴팁), LIST-01·07·08·10·13~16(섹션), START-09·UPD-03·04(안내 줄과 누름 글자), I18N-02(대화 상자·메뉴 막대 문구), INPUT-11(첫 클릭, P1)

**Files:**
- Create: `src/presentation/components/Header.svelte`, `src/presentation/components/TaskSections.svelte`, `src/presentation/components/NoticeLine.svelte`, `src/presentation/components/ResizeEdges.svelte`
- Modify (다시 씀): `src/presentation/App.svelte`
- Modify: `src/main.ts`, `src/application/launch.ts`(주석만), `src-tauri/tauri.conf.json`(`acceptFirstMouse`)
- Test: `src/presentation/components/NoticeLine.test.ts`, `src/tauri-config.test.ts`

**Interfaces:**
- Consumes: Task 1(`createTranslator`, `screenLanguage`), Task 2(`fontStack`, `theme.css`), Task 6(`setTrayLabels`), Task 7(`sectionListHeights`, `sameListHeights`, `Anchor`), Task 9(`WidgetViewModel`), Task 10·11의 컴포넌트, `createLocaleProvider`(`src/adapters/tauri/locale.ts`)
- Produces:
  - `App.svelte` props `{ vm: WidgetViewModel; startedAt: number }`
  - `Header.svelte` props `{ vm; onmore: (button: HTMLElement) => void }`
  - `TaskSections.svelte` props `{ vm; available: number }` (섹션들이 쓸 수 있는 높이, CSS px)
  - `NoticeLine.svelte` props `{ vm }`
  - `ResizeEdges.svelte` props `{ onresize: (edge: ResizeEdge, event: PointerEvent) => void }`

- [ ] **Step 1: 실패하는 테스트 쓰기**

`src/presentation/components/NoticeLine.test.ts`:

```ts
// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { flush } from '../../testing/fake-timer.ts';
import { createTestApp } from '../../testing/test-app.ts';
import { createTranslator } from '../i18n/translator.ts';
import { WidgetViewModel } from '../widget-view-model.svelte.ts';
import NoticeLine from './NoticeLine.svelte';

afterEach(() => cleanup());

describe('안내 줄', () => {
  it('START-09 알릴 일이 없으면 보이지 않는다', async () => {
    const { app } = await createTestApp();
    const vm = new WidgetViewModel({ app, t: createTranslator('ko'), report: () => undefined });
    const { container } = render(NoticeLine, { props: { vm } });
    expect(container.querySelector('.notice')).toBeNull();
  });

  it('UPD-03 UPD-04 "새 버전이 있어요 · 업데이트"를 보이고, 업데이트를 누르면 설치한다', async () => {
    const { app, updater } = await createTestApp();
    const vm = new WidgetViewModel({ app, t: createTranslator('ko'), report: () => undefined });
    await app.updates.check();
    const { container } = render(NoticeLine, { props: { vm } });
    expect(container.querySelector('.notice')?.textContent).toContain('새 버전이 있어요');
    expect(container.querySelector('.notice .sep')?.textContent).toBe('·');
    expect(container.querySelector('.action')?.textContent).toBe('업데이트');
    await fireEvent.click(container.querySelector('.action') as HTMLButtonElement);
    await flush();
    expect(updater.installs).toBe(1);
  });
});
```

`src/tauri-config.test.ts`의 `describe('Tauri 설정', …)` 안 끝에 더한다(P1):

```ts
  it('INPUT-11 다른 앱을 쓰다가 위젯을 처음 눌러도 바로 동작한다 (macOS acceptFirstMouse, PM 결정 2026-10-06)', () => {
    expect(mainWindow.acceptFirstMouse).toBe(true);
  });
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm vitest run src/presentation/components/NoticeLine.test.ts src/tauri-config.test.ts`
Expected: FAIL — `Failed to resolve import "./NoticeLine.svelte"`, `expected undefined to be true`

- [ ] **Step 3: 헤더·안내 줄·가장자리 쓰기**

`src/presentation/components/Header.svelte` (시안 `.header`, `.iconbtn`):

```svelte
<script lang="ts">
  import type { WidgetViewModel } from '../widget-view-model.svelte.ts';
  import Icon from './Icon.svelte';

  let { vm, onmore }: { vm: WidgetViewModel; onmore: (button: HTMLElement) => void } = $props();

  /** 버튼이 아닌 헤더를 왼쪽 버튼으로 누르면 OS 기본 끌기로 창을 옮긴다 (WND-02, 계획 2에서 넘긴 일). */
  function onPointerDown(event: PointerEvent): void {
    if (event.button === 0)
      vm.window.startMove();
  }

  /** 버튼을 누른 것은 끌기가 아니다. */
  function stop(event: PointerEvent): void {
    event.stopPropagation();
  }
</script>

<header class="header" role="presentation" onpointerdown={onPointerDown}>
  <div class="titles">
    <div class="title">{vm.t('app.title')}</div>
    <div class="remaining">{vm.remainingText}</div>
  </div>
  <button
    type="button"
    class="iconbtn"
    class:pin-on={vm.pinned}
    class:pin-off={!vm.pinned}
    title={vm.pinTooltip}
    aria-label={vm.pinTooltip}
    aria-pressed={vm.pinned}
    onpointerdown={stop}
    onclick={() => void vm.togglePin()}
  >
    <Icon name={vm.pinned ? 'pin' : 'unpin'} size={15} />
  </button>
  <button
    type="button"
    class="iconbtn"
    class:active={vm.menu.open}
    title={vm.t('menu.more')}
    aria-label={vm.t('menu.more')}
    aria-haspopup="menu"
    onpointerdown={stop}
    onclick={(event) => onmore(event.currentTarget)}
  >
    <Icon name="more" size={15} />
  </button>
</header>

<style>
  .header {
    display: flex;
    align-items: flex-start;
    margin-bottom: 4px;
  }

  .titles {
    flex: 1;
    min-width: 0;
  }

  .title {
    font-size: 16px;
    font-weight: 700;
    line-height: 21px;
  }

  .remaining {
    margin-top: 2px;
    font-size: 12.5px;
    line-height: 17px;
    color: var(--muted);
  }

  .iconbtn {
    all: unset;
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    color: var(--muted);
    cursor: pointer;
  }

  .iconbtn:hover,
  .iconbtn.active {
    background: var(--hover);
  }

  .iconbtn.pin-on {
    color: var(--ink);
  }

  .iconbtn.pin-off {
    color: var(--hint);
  }
</style>
```

`src/presentation/components/NoticeLine.svelte` (시안 `.notice`, `.action`, `.sep`):

```svelte
<script lang="ts">
  import type { WidgetViewModel } from '../widget-view-model.svelte.ts';

  let { vm }: { vm: WidgetViewModel } = $props();
</script>

{#if vm.notice}
  <!-- 안내 하나. 글이 길면 줄을 바꾼다(두 줄 안에 들어가게 문구를 짧게 둔다, D18). -->
  <div class="notice" role="status">
    {#each vm.notice.messages as message, index (index)}
      {#if index > 0}<span class="sep">·</span>{/if}{message}
    {/each}
    {#if vm.notice.action}
      <span class="sep">·</span><button type="button" class="action" onclick={() => vm.installUpdate()}>{vm.notice.action}</button>
    {/if}
  </div>
{/if}

<style>
  .notice {
    margin-top: 8px;
    font-size: 12.5px;
    line-height: 17px;
    color: var(--accent);
    overflow-wrap: anywhere;
  }

  .sep {
    margin: 0 3px;
    color: var(--hint);
  }

  .action {
    all: unset;
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 2px;
    cursor: pointer;
  }

  .action:hover {
    color: var(--accent-hover);
  }
</style>
```

`src/presentation/components/ResizeEdges.svelte` (카드 바로 둘레 10px 그림자 여백의 바깥 8px. 모서리 14px):

```svelte
<script lang="ts">
  import type { ResizeEdge } from '../../domain/resize.ts';

  let { onresize }: { onresize: (edge: ResizeEdge, event: PointerEvent) => void } = $props();

  /** 왼쪽 버튼으로 누르면 창 밖에서도 pointer를 받게 잡고 바로 크기 조절을 시작한다 (WND-03). */
  function start(edge: ResizeEdge) {
    return (event: PointerEvent & { currentTarget: HTMLElement }): void => {
      if (event.button !== 0)
        return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      onresize(edge, event);
    };
  }
</script>

<div class="edge north" role="presentation" onpointerdown={start('North')}></div>
<div class="edge south" role="presentation" onpointerdown={start('South')}></div>
<div class="edge east" role="presentation" onpointerdown={start('East')}></div>
<div class="edge west" role="presentation" onpointerdown={start('West')}></div>
<div class="edge north-east" role="presentation" onpointerdown={start('NorthEast')}></div>
<div class="edge north-west" role="presentation" onpointerdown={start('NorthWest')}></div>
<div class="edge south-east" role="presentation" onpointerdown={start('SouthEast')}></div>
<div class="edge south-west" role="presentation" onpointerdown={start('SouthWest')}></div>

<style>
  /* 카드 둘레 그림자 여백(10) 안에만 있다. 창을 메뉴용으로 늘려도 카드 둘레에 남는다.
     macOS는 alpha가 0인 픽셀의 클릭을 뒤 앱으로 넘기므로, 눈에 거의 안 보이지만 0이 아닌 배경을 둔다 (계획 4 PM 확인). */
  .edge {
    position: absolute;
    z-index: 1;
    background: rgba(0, 0, 0, 0.01);
  }

  .north {
    top: 0;
    left: 14px;
    right: 14px;
    height: 8px;
    cursor: ns-resize;
  }

  .south {
    bottom: 0;
    left: 14px;
    right: 14px;
    height: 8px;
    cursor: ns-resize;
  }

  .east {
    top: 14px;
    bottom: 14px;
    right: 0;
    width: 8px;
    cursor: ew-resize;
  }

  .west {
    top: 14px;
    bottom: 14px;
    left: 0;
    width: 8px;
    cursor: ew-resize;
  }

  .north-east {
    top: 0;
    right: 0;
    width: 14px;
    height: 14px;
    cursor: nesw-resize;
  }

  .north-west {
    top: 0;
    left: 0;
    width: 14px;
    height: 14px;
    cursor: nwse-resize;
  }

  .south-east {
    bottom: 0;
    right: 0;
    width: 14px;
    height: 14px;
    cursor: nwse-resize;
  }

  .south-west {
    bottom: 0;
    left: 0;
    width: 14px;
    height: 14px;
    cursor: nesw-resize;
  }
</style>
```

- [ ] **Step 4: 섹션 쓰기**

`src/presentation/components/TaskSections.svelte` (시안 `.done-sec`, `.fold`, `.todo-sec`, `.sechead`, `.dot`, `.empty`; P2: 섹션 간격 12):

```svelte
<script lang="ts">
  import { untrack } from 'svelte';
  import { type ListHeights, type SectionMeasure, sameListHeights, sectionListHeights } from '../layout/section-heights.ts';
  import type { WidgetViewModel } from '../widget-view-model.svelte.ts';
  import Icon from './Icon.svelte';
  import TaskRow from './TaskRow.svelte';

  let { vm, available }: { vm: WidgetViewModel; available: number } = $props();

  let doneSection: HTMLElement | null = $state(null);
  let doneScroll: HTMLElement | null = $state(null);
  let doneRows: HTMLElement | null = $state(null);
  let todoSection: HTMLElement | null = $state(null);
  let todoScroll: HTMLElement | null = $state(null);
  let todoRows: HTMLElement | null = $state(null);
  let heights = $state<ListHeights>({ done: null, todo: null });

  /** 섹션 하나를 잰다. 목록 상자는 지금 최대 높이로 줄어 있을 수 있어, 목록 말고의 높이(chrome)는 상자 높이를 빼서 구한다. */
  function measure(section: HTMLElement | null, scroll: HTMLElement | null, rows: HTMLElement | null): SectionMeasure | null {
    if (!section)
      return null;
    const marginTop = Number.parseFloat(getComputedStyle(section).marginTop) || 0;
    const first = rows?.firstElementChild;
    return {
      chrome: section.offsetHeight + marginTop - (scroll?.offsetHeight ?? 0),
      content: rows?.offsetHeight ?? 0,
      firstRow: first ? first.getBoundingClientRect().height + 2 : 0,
      expanded: scroll !== null,
    };
  }

  /** 쓸 수 있는 높이를 섹션에 나눈다 (LIST-13~15). 섹션은 각자 스크롤한다 (LIST-16). */
  function relayout(): void {
    const next = sectionListHeights(available, {
      done: measure(doneSection, doneScroll, doneRows),
      todo: measure(todoSection, todoScroll, todoRows),
    });
    if (!sameListHeights(next, heights))
      heights = next;
  }

  // 쓸 수 있는 높이, 목록, 접힘이 바뀌면 다시 나눈다. DOM이 바뀐 뒤에 돈다.
  $effect(() => {
    void available;
    void vm.doneItems;
    void vm.todoItems;
    void doneScroll;
    void todoScroll;
    untrack(relayout);
  });

  // 긴 제목이 줄을 바꾸거나 이름 바꾸기 칸이 커지면 줄 높이가 바뀐다.
  $effect(() => {
    const rows = [doneRows, todoRows].filter((el): el is HTMLElement => el !== null);
    if (rows.length === 0)
      return;
    const observer = new ResizeObserver(() => untrack(relayout));
    for (const el of rows)
      observer.observe(el);
    return () => observer.disconnect();
  });
</script>

{#if vm.isEmpty}
  <div class="empty">{vm.t('list.empty')}</div>
{/if}
{#if vm.sections.includes('done')}
  <section class="done-sec" bind:this={doneSection}>
    <button type="button" class="fold" aria-expanded={vm.doneExpanded} onclick={() => vm.toggleDone()}>
      <span class="dot green"></span>
      <span class="label">{vm.t('status.done')}</span>
      <span class="count">{vm.doneItems.length}</span>
      <span class="right">{vm.doneToggleText}</span>
    </button>
    {#if vm.doneExpanded}
      <div class="scroll list" bind:this={doneScroll} style:max-height={heights.done === null ? null : `${heights.done}px`}>
        <div class="rows" bind:this={doneRows}>
          {#each vm.doneItems as item (item.id)}
            <TaskRow {vm} {item} />
          {/each}
        </div>
      </div>
    {/if}
  </section>
{/if}
{#if vm.sections.includes('todo')}
  <section class="todo-sec" bind:this={todoSection}>
    <button type="button" class="sechead" aria-expanded={vm.todoExpanded} onclick={() => vm.toggleTodo()}>
      <span class="dot orange"></span>
      <span class="label">{vm.t('status.todo')}</span>
      <span class="count">{vm.todoItems.length}</span>
      <span class="right"><Icon name={vm.todoExpanded ? 'down' : 'right'} size={10} /></span>
    </button>
    {#if vm.todoExpanded}
      <div class="scroll list" bind:this={todoScroll} style:max-height={heights.todo === null ? null : `${heights.todo}px`}>
        <div class="rows" bind:this={todoRows}>
          {#each vm.todoItems as item (item.id)}
            <TaskRow {vm} {item} />
          {/each}
        </div>
      </div>
    {/if}
  </section>
{/if}

<style>
  .empty {
    margin: 14px 0 6px;
    text-align: center;
    font-size: 13.5px;
    line-height: 18px;
    color: var(--muted);
  }

  .done-sec {
    margin-top: 8px;
  }

  /* hover 배경 없음 (v1.4 M:148). 배경은 투명도를 따른다 (WND-13). */
  .fold {
    all: unset;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    width: 100%;
    padding: 8px 10px;
    border-radius: 10px;
    background: rgba(var(--foldbg), var(--a));
    font-size: 13px;
    line-height: 18px;
    color: var(--muted);
    cursor: pointer;
  }

  .done-sec .list {
    margin-top: 4px;
  }

  /* 줄 묶음도 flex로 쌓는다. 줄의 위아래 margin 1이 겹치거나 밖으로 빠지지 않아, 줄 사이가 v1.4처럼 2이고 높이를 정확히 잰다 (D16, 리뷰 I1). */
  .rows {
    display: flex;
    flex-direction: column;
  }

  /* v1.4 값 12 (PM 결정 P2). 제목 줄의 -3 margin이 상자를 끌어올려 끝낸 일 섹션과의 사이는 9로 보인다(시안과 같다). */
  .todo-sec {
    margin-top: 12px;
  }

  /* 바깥 음수 여백을 안쪽 여백으로 상쇄해, 줄 높이 24는 그대로 두고 hover 배경만 넓게 칠한다 (v1.4 T:127). */
  .sechead {
    all: unset;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    width: calc(100% + 12px);
    margin: -3px -6px 3px;
    padding: 3px 6px;
    border-radius: 8px;
    font-size: 13px;
    line-height: 18px;
    color: var(--muted);
    cursor: pointer;
  }

  .sechead:hover {
    background: var(--hover);
  }

  .dot {
    flex: none;
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .dot.green {
    background: var(--done);
  }

  .dot.orange {
    background: var(--accent);
  }

  .label {
    margin-left: 7px;
    font-weight: 600;
  }

  .count {
    margin-left: 5px;
  }

  .right {
    display: flex;
    align-items: center;
    margin-left: auto;
    padding-left: 8px;
    white-space: nowrap;
  }
</style>
```

- [ ] **Step 5: App 다시 쓰기**

`src/presentation/App.svelte` 전체:

```svelte
<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { SHADOW_MARGIN } from '../domain/window-geometry.ts';
  import AddInput from './components/AddInput.svelte';
  import ContextMenu from './components/ContextMenu.svelte';
  import Header from './components/Header.svelte';
  import MoreMenu from './components/MoreMenu.svelte';
  import NoticeLine from './components/NoticeLine.svelte';
  import ResetConfirm from './components/ResetConfirm.svelte';
  import ResizeEdges from './components/ResizeEdges.svelte';
  import TaskSections from './components/TaskSections.svelte';
  import type { Anchor } from './menu/menu-placement.ts';
  import type { WidgetViewModel } from './widget-view-model.svelte.ts';

  let { vm, startedAt }: { vm: WidgetViewModel; startedAt: number } = $props();

  let stage: HTMLElement | null = $state(null);
  let card: HTMLElement | null = $state(null);
  let body: HTMLElement | null = $state(null);
  /** 섹션들이 쓸 수 있는 높이. 카드 최대 높이에서 헤더·안내 줄·입력칸·안쪽 여백을 뺀다. */
  let available = $state(Number.POSITIVE_INFINITY);
  let moreAnchor = $state<Anchor | null>(null);

  /** 카드를 재서 섹션이 쓸 높이를 정하고(LIST-13~15), 창 높이로 쓸 값(카드 + 위아래 그림자 여백)을 돌려준다(WND-03). */
  function measureCard(): number {
    if (!card || !body)
      return 0;
    const cardHeight = card.getBoundingClientRect().height;
    const cap = vm.window.resizing ? window.innerHeight - 2 * SHADOW_MARGIN : vm.window.maxCardHeight;
    const next = cap - (cardHeight - body.getBoundingClientRect().height);
    if (!(Math.abs(next - available) <= 0.5))
      available = next;
    return Math.ceil(cardHeight) + 2 * SHADOW_MARGIN;
  }

  onMount(() => {
    // 숨긴 창에서는 ResizeObserver가 오지 않을 수 있다. 처음 크기는 바로 재서 창을 맞추고 보인다 (D19).
    void vm.window.showFirst(measureCard(), performance.now() - startedAt);
    const observer = new ResizeObserver(() => vm.window.contentResized(measureCard()));
    if (card)
      observer.observe(card);
    return () => {
      observer.disconnect();
      vm.dispose();
    };
  });

  // 끄기를 시작하거나 놓아 최대 높이가 바뀌면 다시 잰다 (WND-03).
  $effect(() => {
    void vm.window.resizing;
    void vm.window.maxCardHeight;
    untrack(() => vm.window.contentResized(measureCard()));
  });

  // 메뉴와 확인 판이 모두 닫히면 늘린 창을 되돌린다 (WND-10).
  $effect(() => {
    if (!vm.anyPopupOpen)
      untrack(() => void vm.window.clearPopup());
  });

  /** WebView 기본 메뉴(새로 고침 등)는 막는다. 입력칸·이름 바꾸기 칸에서는 OS 기본 메뉴(잘라내기·복사·붙여넣기)를 그대로 둔다 (D25). */
  function onWindowContextMenu(event: MouseEvent): void {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
      return;
    event.preventDefault();
  }

  function openMore(button: HTMLElement): void {
    if (!stage)
      return;
    const box = stage.getBoundingClientRect();
    const rect = button.getBoundingClientRect();
    moreAnchor = { top: rect.top - box.top, bottom: rect.bottom - box.top, right: rect.right - box.left };
    void vm.openMoreMenu();
  }
</script>

<!-- 창이 포커스를 잃으면(macOS에서 늘린 투명 부분을 누르면 클릭이 뒤 앱으로 가서 이렇게 된다) 메뉴와 확인 판을 닫는다 (D10). -->
<svelte:window onblur={() => vm.closePopups()} oncontextmenu={onWindowContextMenu} />

<div class="frame" style:padding-top="{vm.window.lift}px">
  <div class="stage" bind:this={stage}>
    <div class="shell">
      <main
        class="card"
        class:fill={vm.window.resizing}
        style:--a={vm.menu.cardOpacity}
        style:max-height={vm.window.resizing ? null : `${vm.window.maxCardHeight}px`}
        bind:this={card}
      >
        <Header {vm} onmore={openMore} />
        <div class="body" bind:this={body}>
          <TaskSections {vm} {available} />
        </div>
        <NoticeLine {vm} />
        <AddInput {vm} />
        {#if vm.confirmingReset && stage}
          <ResetConfirm {vm} {stage} />
        {/if}
      </main>
      <ResizeEdges onresize={(edge, event) => void vm.startResize(edge, event)} />
    </div>
    {#if vm.menu.open || vm.contextMenu}
      <!-- 메뉴 바깥 클릭을 받아 닫는다(Windows처럼 투명 부분의 클릭이 창에 오는 경우, D10). -->
      <div class="backdrop" role="presentation" onpointerdown={() => vm.closePopups()}></div>
    {/if}
    {#if vm.menu.open && moreAnchor}
      <MoreMenu {vm} anchor={moreAnchor} />
    {/if}
    {#if vm.contextMenu && stage}
      <ContextMenu {vm} target={vm.contextMenu} {stage} />
    {/if}
  </div>
</div>

<style>
  .stage {
    position: relative;
  }

  /* 카드 둘레 투명 여백: 그림자와 크기 조절 가장자리 자리 (window.md 용어 "크기와 좌표"). */
  .shell {
    position: relative;
    padding: 10px;
  }

  /* 둥근 카드, 테두리 없음, 옅은 그림자 (WND-01). 배경과 그림자만 불투명도(--a)를 따른다 (WND-13). */
  .card {
    position: relative;
    display: flex;
    flex-direction: column;
    padding: 16px 18px 12px;
    border-radius: 18px;
    background: rgba(var(--card), var(--a));
    box-shadow: 0 3px 12px rgba(var(--shadow), calc(0.16 * var(--a)));
  }

  /* 끄는 동안 카드가 창을 채우고 입력칸은 아래에 붙는다 (WND-03, v1.4 MC:64-91). 그 밖에는 최대 높이 - 20이 상한이다(v1.4 MC:89). */
  .card.fill {
    height: calc(100vh - 20px);
  }

  /* 섹션을 flex로 쌓는다. margin이 겹치지 않아 v1.4 간격 그대로이고 높이를 정확히 잰다 (D16). */
  /*
   * 카드가 최대 높이에 닿으면 섹션 영역이 줄고 넘친 부분은 잘린다. 헤더·안내 줄·입력칸은 줄지 않아 늘 보인다(v1.4 DockPanel, 리뷰 I3).
   * 좌우 -6 margin과 6 padding: 할 일 제목 줄 hover 배경(좌우 6 넓게 칠함)이 잘리지 않게 한다.
   */
  .body {
    display: flex;
    flex: 0 1 auto;
    flex-direction: column;
    min-height: 0;
    margin: 0 -6px;
    padding: 0 6px;
    overflow: hidden;
  }

  .card.fill .body {
    flex: 1 1 auto;
  }

  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 4;
  }
</style>
```

- [ ] **Step 6: composition root 바꾸기**

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
import { createLocaleProvider } from './adapters/tauri/locale.ts';
import { createTauriProcess } from './adapters/tauri/process.ts';
import { setTrayLabels } from './adapters/tauri/tray.ts';
import { createWindowController, tauriWindowApi } from './adapters/tauri/window-controller.ts';
import { createTauriUpdater, tauriUpdaterApi } from './adapters/updater/tauri-updater.ts';
import { screenLanguage } from './application/language.ts';
import { launchApp } from './application/launch.ts';
import App from './presentation/App.svelte';
import { createTranslator } from './presentation/i18n/translator.ts';
import { fontStack } from './presentation/theme/fonts.ts';
import './presentation/theme/theme.css';
import { WidgetViewModel } from './presentation/widget-view-model.svelte.ts';

/** composition root. adapter를 만들어 application에 넘기고, 실행되면 화면을 붙인다. 흐름은 launchApp이 정한다. */
async function main(): Promise<void> {
  const startedAt = performance.now();
  const target = document.getElementById('app');
  if (!target)
    throw new Error('#app 요소가 없어요');

  // 화면 언어는 켤 때 한 번 정한다 (I18N-01). 글꼴은 언어와 OS로 고른다 (I18N-06).
  const [platform, language] = await Promise.all([loadPlatformInfo(invoke), screenLanguage(createLocaleProvider(invoke))]);
  const t = createTranslator(language);
  document.documentElement.lang = language;
  document.documentElement.style.setProperty('--font-ui', fontStack(platform.os, language));
  // 메뉴 막대 메뉴 글 (MAC-04, I18N-02). 실패해도 위젯은 뜨고 메뉴는 영어 기본값으로 남는다.
  setTrayLabels(invoke, { open: t('tray.open'), quit: t('menu.quit') }).catch((error: unknown) => {
    console.error('메뉴 막대 문구를 바꾸지 못했어요', error);
  });

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
    // STORE-10 대화 상자 문구도 사전에서 꺼낸다 (I18N-02).
    texts: { appTitle: t('app.title'), cannotOpen: t('error.cannotOpen') },
  });

  if (result.kind === 'running')
    mount(App, { target, props: { vm: new WidgetViewModel({ app: result, t }), startedAt } });
}

main().catch((error: unknown) => {
  // 창이 숨은 채로 남지 않게 Rust 대비책(SHOW_FALLBACK_DELAY)이 창을 띄운다. 원인은 개발자 도구에서 본다.
  console.error('TodoWidget을 시작하지 못했어요', error);
});
```

`src/application/launch.ts`의 `LaunchTexts` 설명 주석을 바꾼다(동작은 그대로):

```ts
/** STORE-10 대화 상자 문구. composition root가 화면 언어 사전(`app.title`, `error.cannotOpen`)에서 꺼내 넘긴다 (I18N-02). */
```

- [ ] **Step 7: 첫 클릭 바로 동작 (PM 결정 P1)**

`src-tauri/tauri.conf.json`의 `app.windows[0]`에서 `"resizable": false` 다음에 더한다(앞 줄 끝에 쉼표):

```json
        "resizable": false,
        "acceptFirstMouse": true
```

- [ ] **Step 8: 통과 확인**

Run: `pnpm vitest run`
Expected: PASS. 시험 화면 테스트 `src/presentation/app.test.ts`("Svelte 컴포넌트로 컴파일된다")도 그대로 통과한다.

Run: Global Constraints의 Task 끝 검사
Expected: 모두 통과. `svelte-check --fail-on-warnings`에 "Unused CSS selector"나 a11y 경고가 없어야 한다.

- [ ] **Step 9: 개발 빌드로 띄워 보기 (개발 확인, 화면 캡처 없음)**

실제 데이터 폴더를 쓰지 않게 임시 폴더를 준다. 개발 빌드는 자동 실행을 건드리지 않는다(START-07). 켤 때 GitHub에 업데이트 확인 요청(`latest.json` 읽기)이 한 번 나간다. 허용된 요청이다(Global Constraints "실행 안전"). 안내 줄의 "업데이트"는 누르지 않는다.

```bash
DATA=$(mktemp -d) && echo "$DATA" && TODOWIDGET_DATA_DIR="$DATA" pnpm tauri dev
```

눈으로 본다(캡처하지 않는다).
- 카드가 시안 1번 모습이고, 빈 목록에서 창이 내용만큼 작다.
- 할 일을 몇 개 더하면 창이 커지고, 지우면 줄어든다.
- ⋯ 메뉴가 버튼 아래 오른쪽 끝에 맞춰 뜨고, 창이 메뉴만큼 늘었다가 닫으면 돌아온다.
- 개발자 도구 콘솔(Cmd+Option+I)에 오류가 없다.

끝나면 터미널에서 Ctrl+C로 끄고 `rm -rf "$DATA"`.

- [ ] **Step 10: 커밋**

```bash
git add src/presentation/App.svelte src/presentation/components src/main.ts src/application/launch.ts src-tauri/tauri.conf.json src/tauri-config.test.ts
git commit -m "feat: 시험 화면을 시안과 같은 위젯 화면으로 바꾸고 문구·글꼴·메뉴 막대 문구를 사전에서 꺼냄"
```

---

### Task 13: I18N-02 하드코딩 문구 검사와 네트워크 우회 검사

**spec:** I18N-02(자동 검사, D8), PRIV-01(`invoke('plugin:updater|…')`·`invoke('plugin:http|…')` 우회)

**Files:**
- Create: `tools/architecture/copy.ts`
- Modify: `tools/architecture/rules.ts` (`lineAt` 내보내기, `NETWORK_PATTERN`)
- Modify: `spec/behavior/i18n.md` (PM 결정 P3: 변경 이력, I18N-02 결과에 한 줄)
- Test: `src/architecture.test.ts`

**Interfaces:**
- Consumes: `SourceFile`, `Violation`, `collectSources`
- Produces: `checkCopy(files: readonly SourceFile[]): Violation[]`, `looksLikeCopy(value: string): boolean`, `COPY_CHECK_DIR`, `DICTIONARY_FILES`; `lineAt(text: string, index: number): number`(rules.ts에서 내보냄)

- [ ] **Step 1: 실패하는 테스트 쓰기**

`src/architecture.test.ts`:
- 맨 위 import에 `import { checkCopy, looksLikeCopy } from '../tools/architecture/copy.ts';`를 더한다.
- `describe('네트워크 사용 제한', …)` 안에서 `'PRIV-01 실제 소스가 …'` 앞에 더한다:

```ts
  it('PRIV-01 invoke로 updater·http plugin 명령을 바로 불러도 네트워크로 본다', () => {
    const violations = checkArchitecture([
      file('src/adapters/tauri/x.ts', "await invoke('plugin:updater|check');"),
      file('src/presentation/y.ts', 'await invoke("plugin:http|fetch", args);'),
      file('src/adapters/updater/z.ts', "await invoke('plugin:updater|check');"),
    ]);
    expect(violations.map((v) => v.path)).toEqual(['src/adapters/tauri/x.ts', 'src/presentation/y.ts']);
    expect(violations[0]?.message).toBe("네트워크는 src/adapters/updater/에서만 써요 (PRIV-01): 'plugin:updater|");
  });
```

- 파일 맨 끝에 더한다:

```ts
describe('하드코딩 문구 검사', () => {
  it('I18N-02 문구로 보이는 문자열을 가려낸다', () => {
    expect(['할 일', 'Add a task', "Can't save", 'Löschen', '{n}개 남음'].map(looksLikeCopy)).toEqual([true, true, true, true, true]);
    expect(['', '⋯', '·', '%', '+', 'keydown', 'app.title', 'text/plain', 'row doing', '0px', '{n}', 'plugin:x'].map(looksLikeCopy)).toEqual(
      new Array(12).fill(false),
    );
  });

  it('I18N-02 템플릿 글자, 보이는 속성의 고정 글, 문구 같은 문자열 리터럴을 찾는다', () => {
    const svelte = [
      '<script lang="ts">',
      "  const label = '할 일';",
      '</script>',
      '<button title="Menu">Add</button>',
      '<input placeholder="{x} tasks" />',
    ].join('\n');
    const violations = checkCopy([
      file('src/presentation/A.svelte', svelte),
      file('src/presentation/b.ts', "export const hint = 'Add a task';\nexport const left = `${n}개 남음`;"),
    ]);
    expect(violations.map((v) => `${v.path}:${v.line}`)).toEqual([
      'src/presentation/A.svelte:2',
      'src/presentation/A.svelte:4',
      'src/presentation/A.svelte:4',
      'src/presentation/A.svelte:5',
      'src/presentation/b.ts:1',
      'src/presentation/b.ts:2',
    ]);
    expect(violations[0]?.message).toBe('화면 문구는 사전에서 꺼내요 (I18N-02): 할 일');
  });

  it('I18N-02 기호, 기술 문자열, CSS 클래스, 주석, 스타일, 개발자용 문장, 사전 파일, presentation 밖은 통과한다', () => {
    const svelte = [
      '<script lang="ts">',
      '  // 한국어 주석은 괜찮다',
      "  import Icon from './Icon.svelte';",
      "  const key = 'app.title';",
      "  const classes = 'row doing';",
      "  console.error('창을 보이지 못했어요', error);",
      "  window.addEventListener('wheel', onWheel);",
      '  /* 할 일 */',
      '</script>',
      '<!-- 할 일 -->',
      '<span class="sep">·</span><span class="plus">+</span>{vm.t(\'app.title\')}<span>{n}%</span>',
      '<div style:padding-top="{lift}px" class="row {status}" onclick={() => a > b}></div>',
      '<style>.a::after { content: "할 일"; }</style>',
    ].join('\n');
    expect(
      checkCopy([
        file('src/presentation/B.svelte', svelte),
        file('src/presentation/i18n/ko.ts', "export const ko = { 'app.title': '할 일' };"),
        file('src/presentation/c.ts', "throw new Error('ViewModel이 없어요');\nconst url = `${base}/x`;"),
        file('src/application/d.ts', "const label = '할 일';"),
      ]),
    ).toEqual([]);
  });

  it('I18N-02 실제 화면 코드에는 사전 밖의 화면 문구가 없다', () => {
    const root = fileURLToPath(new URL('..', import.meta.url));
    expect(checkCopy(collectSources(root))).toEqual([]);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm vitest run src/architecture.test.ts`
Expected: FAIL — `Failed to resolve import "../tools/architecture/copy.ts"`

- [ ] **Step 3: 구현**

`tools/architecture/rules.ts`:
- `NETWORK_PATTERN`을 바꾼다:

```ts
const NETWORK_PATTERN =
  /\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\bEventSource\b|@tauri-apps\/plugin-(?:http|websocket|upload|updater)|['"`]plugin:(?:http|updater|websocket|upload)\|/g;
```

- 맨 아래 `function lineAt`을 `export function lineAt`으로 바꾼다.

`tools/architecture/copy.ts`:

```ts
import { lineAt, type SourceFile, type Violation } from './rules.ts';

/** I18N-02 자동 검사 대상: presentation 층의 .svelte·.ts 제품 코드(테스트 파일은 collectSources가 뺀다). */
export const COPY_CHECK_DIR = 'src/presentation/';

/** 문구를 두는 곳이라 검사하지 않는 사전 파일. */
export const DICTIONARY_FILES: readonly string[] = [
  'src/presentation/i18n/ko.ts',
  'src/presentation/i18n/en.ts',
  'src/presentation/i18n/de.ts',
  'src/presentation/i18n/zh-hans.ts',
];

/** 값이 화면에 보이는 템플릿 속성. */
const VISIBLE_ATTRIBUTES: ReadonlySet<string> = new Set(['title', 'placeholder', 'aria-label', 'alt']);

/** 글자(문자)가 하나라도 있는지. 기호(⋯ 📌 % · +)와 숫자는 글자가 아니다. */
const LETTER = /\p{L}/u;
/** ASCII 밖의 글자(한글, 한자, ä). 기술 문자열에는 쓰지 않으므로 늘 문구로 본다. */
const NON_ASCII_LETTER = /(?![\u0000-\u007f])\p{L}/u;
/** 공백 없는 기술 낱말: 이벤트·키 이름, 사전 키, 경로, CSS 값 하나, {n}. */
const TECHNICAL_TOKEN = /^[A-Za-z0-9_.:/#@%+{}()|-]*$/;
/** 소문자 낱말을 공백으로 이은 CSS 클래스 목록. */
const CLASS_LIST = /^[a-z0-9_-]+(?: [a-z0-9_-]+)+$/;
/** 화면에 보이지 않는 개발자용 문장: console.*(…)와 new Error(…)의 첫 인자. */
const DEVELOPER_MESSAGE_BEFORE = /(?:\bconsole\.(?:error|warn|info|log|debug)|\bnew\s+Error)\(\s*$/;

/**
 * 문구로 보이는 문자열인지 (I18N-02, 설계 문서 7장의 예외 목록).
 * 예외: 글자가 없는 것, 공백 없는 기술 낱말, 소문자 CSS 클래스 목록. ASCII 밖의 글자가 있으면 늘 문구다.
 */
export function looksLikeCopy(value: string): boolean {
  if (!LETTER.test(value))
    return false;
  if (NON_ASCII_LETTER.test(value))
    return true;
  const trimmed = value.trim();
  return !TECHNICAL_TOKEN.test(trimmed) && !CLASS_LIST.test(trimmed);
}

/** presentation의 화면 문구가 사전 밖에 직접 쓰여 있는 곳 (I18N-02). */
export function checkCopy(files: readonly SourceFile[]): Violation[] {
  return files
    .filter((file) => file.path.startsWith(COPY_CHECK_DIR) && !DICTIONARY_FILES.includes(file.path))
    .flatMap((file) => (file.path.endsWith('.svelte') ? scanSvelte(file) : scanCode(file, 0, file.text.length)));
}

function violation(file: SourceFile, index: number, text: string): Violation {
  return { path: file.path, line: lineAt(file.text, index), message: `화면 문구는 사전에서 꺼내요 (I18N-02): ${text.trim()}` };
}

/** 줄 끝(다음 줄바꿈) 위치. */
function lineEnd(text: string, from: number, to: number): number {
  const end = text.indexOf('\n', from);
  return end < 0 || end > to ? to : end;
}

/** 따옴표 문자열의 닫는 따옴표 위치. 줄이 끝나면 거기서 멈춘다. */
function quoteEnd(text: string, open: number, to: number): number {
  const quote = text[open];
  let i = open + 1;
  while (i < to && text[i] !== quote && text[i] !== '\n') {
    if (text[i] === '\\')
      i++;
    i++;
  }
  return Math.min(i, to);
}

/**
 * 코드(.ts, <script>, 템플릿의 {…})에서 문자열 리터럴을 검사한다. 주석은 건너뛴다.
 * 한계: 정규식 리터럴 안의 따옴표는 문자열 시작으로 잘못 읽는다(presentation 코드에는 없다).
 */
function scanCode(file: SourceFile, from: number, to: number): Violation[] {
  const text = file.text;
  const found: Violation[] = [];
  let i = from;
  while (i < to) {
    const c = text[i];
    const next = text[i + 1];
    if (c === '/' && next === '/') {
      i = lineEnd(text, i, to);
      continue;
    }
    if (c === '/' && next === '*') {
      const end = text.indexOf('*/', i + 2);
      i = end < 0 || end >= to ? to : end + 2;
      continue;
    }
    if (c === "'" || c === '"') {
      const end = quoteEnd(text, i, to);
      const value = text.slice(i + 1, end);
      const developer = DEVELOPER_MESSAGE_BEFORE.test(text.slice(Math.max(from, i - 40), i));
      if (!developer && looksLikeCopy(value))
        found.push(violation(file, i, value));
      i = end + 1;
      continue;
    }
    if (c === '`') {
      i = scanTemplate(file, i, to, found);
      continue;
    }
    i++;
  }
  return found;
}

/** `…${…}…`. 고정된 글 조각을 그대로 이어(값 자리는 비운다) 검사하고, ${…} 안의 코드는 scanCode로 본다. 닫는 ` 다음 위치를 돌려준다. */
function scanTemplate(file: SourceFile, open: number, to: number, found: Violation[]): number {
  const text = file.text;
  let i = open + 1;
  let chunk = '';
  while (i < to && text[i] !== '`') {
    if (text[i] === '\\') {
      chunk += text.slice(i, i + 2);
      i += 2;
      continue;
    }
    if (text[i] === '$' && text[i + 1] === '{') {
      const close = braceEnd(text, i + 1, to);
      found.push(...scanCode(file, i + 2, close));
      i = close + 1;
      continue;
    }
    chunk += text[i];
    i++;
  }
  if (looksLikeCopy(chunk))
    found.push(violation(file, open, chunk));
  return i + 1;
}

/** open 위치의 `{`에 맞는 `}` 위치. 문자열·템플릿·주석 안의 괄호는 세지 않는다. */
function braceEnd(text: string, open: number, to: number): number {
  let depth = 0;
  let i = open;
  while (i < to) {
    const c = text[i];
    if (c === "'" || c === '"') {
      i = quoteEnd(text, i, to) + 1;
      continue;
    }
    if (c === '`') {
      i = scanTemplate({ path: '', text }, i, to, []);
      continue;
    }
    if (c === '/' && text[i + 1] === '/') {
      i = lineEnd(text, i, to);
      continue;
    }
    if (c === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      i = end < 0 || end >= to ? to : end + 2;
      continue;
    }
    if (c === '{')
      depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0)
        return i;
    }
    i++;
  }
  return to;
}

/** .svelte: <script>는 코드로, <style>과 <!-- -->는 건너뛰고, 템플릿은 글자·속성·{…}를 본다. */
function scanSvelte(file: SourceFile): Violation[] {
  const text = file.text;
  const found: Violation[] = [];
  let i = 0;
  while (i < text.length) {
    if (text.startsWith('<!--', i)) {
      const end = text.indexOf('-->', i + 4);
      i = end < 0 ? text.length : end + 3;
      continue;
    }
    const block = /^<(script|style)\b[^>]*>/.exec(text.slice(i, i + 200));
    if (block) {
      const tag = block[1] ?? '';
      const bodyStart = i + block[0].length;
      const close = text.indexOf(`</${tag}>`, bodyStart);
      const bodyEnd = close < 0 ? text.length : close;
      if (tag === 'script')
        found.push(...scanCode(file, bodyStart, bodyEnd));
      i = close < 0 ? text.length : close + tag.length + 3;
      continue;
    }
    if (text[i] === '{') {
      const close = braceEnd(text, i, text.length);
      found.push(...scanCode(file, i + 1, close));
      i = close + 1;
      continue;
    }
    if (text[i] === '<') {
      i = scanTag(file, i, found);
      continue;
    }
    const start = i;
    while (i < text.length && text[i] !== '<' && text[i] !== '{')
      i++;
    const run = text.slice(start, i);
    // 템플릿 글자는 화면에 보인다. 기호·숫자가 아니면 모두 문구다.
    if (LETTER.test(run))
      found.push(violation(file, start + (run.length - run.trimStart().length), run));
  }
  return found;
}

/** `<태그 …>`: 보이는 속성의 고정 글과 {…} 안의 코드를 검사하고, `>` 다음 위치를 돌려준다. */
function scanTag(file: SourceFile, open: number, found: Violation[]): number {
  const text = file.text;
  let i = open + 1;
  while (i < text.length && !/[\s/>]/.test(text[i] ?? '>'))
    i++;
  while (i < text.length && text[i] !== '>') {
    const c = text[i] ?? '';
    if (/[\s/]/.test(c)) {
      i++;
      continue;
    }
    if (c === '{') {
      const close = braceEnd(text, i, text.length);
      found.push(...scanCode(file, i + 1, close));
      i = close + 1;
      continue;
    }
    const nameStart = i;
    while (i < text.length && !/[\s=>/]/.test(text[i] ?? '>'))
      i++;
    const name = text.slice(nameStart, i);
    if (text[i] !== '=')
      continue;
    i++;
    const quote = text[i];
    if (quote === '"' || quote === "'") {
      i = scanAttributeValue(file, i, VISIBLE_ATTRIBUTES.has(name), found);
    } else if (quote === '{') {
      const close = braceEnd(text, i, text.length);
      found.push(...scanCode(file, i + 1, close));
      i = close + 1;
    } else {
      const valueStart = i;
      while (i < text.length && !/[\s>]/.test(text[i] ?? '>'))
        i++;
      const value = text.slice(valueStart, i);
      if (VISIBLE_ATTRIBUTES.has(name) && LETTER.test(value))
        found.push(violation(file, valueStart, value));
    }
  }
  return i + 1;
}

/** 따옴표 속성 값. {…}는 코드로 보고, 보이는 속성이면 남은 고정 글에 글자가 있는지 본다. 닫는 따옴표 다음 위치를 돌려준다. */
function scanAttributeValue(file: SourceFile, open: number, visible: boolean, found: Violation[]): number {
  const text = file.text;
  const quote = text[open];
  let i = open + 1;
  let literal = '';
  while (i < text.length && text[i] !== quote) {
    if (text[i] === '{') {
      const close = braceEnd(text, i, text.length);
      found.push(...scanCode(file, i + 1, close));
      i = close + 1;
      continue;
    }
    literal += text[i];
    i++;
  }
  if (visible && LETTER.test(literal))
    found.push(violation(file, open, literal));
  return i + 1;
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm vitest run src/architecture.test.ts`
Expected: PASS. 실제 소스 검사(`I18N-02 실제 화면 코드에는 …`)가 걸리면, 걸린 줄을 사전 키로 바꾼다. 기술 문자열인데 걸렸으면 D8의 예외에 해당하는지 보고, 해당하지 않으면 코드를 바꾼다(예외 목록을 늘리려면 PM에게 알린다).

- [ ] **Step 5: spec 문장 더하기 (PM 결정 P3)**

`spec/behavior/i18n.md`:
- 변경 이력 맨 아래에 더한다:

```markdown
- 2026-10-06: I18N-02 자동 검사의 예외(글자 없는 기호·숫자, 공백 없는 기술 낱말, 소문자 CSS 클래스 목록, 주석·스타일, 개발자용 오류 문장, 사전 파일)를 적었다. 동작은 바뀌지 않는다 (PM 승인 2026-10-06, 계획 5 개발 결정 D8)
```

- I18N-02의 `- 결과:` 줄에서 `그 파일들의 문자열 리터럴은 사전 키가 아니면 검사에 걸린다.` 바로 뒤에 다음 문장을 넣는다(같은 줄):

```markdown
다만 화면에 보이지 않는 기술 문자열은 예외다: 글자가 없는 기호·숫자, 공백 없는 기술 낱말(이벤트 이름, 사전 키, 경로), 소문자 CSS 클래스 목록, 주석과 스타일, 개발자용 오류 문장(`console.*`·`new Error`의 첫 인자), 사전 파일. 자세한 규칙은 설계 문서 7장에 있다.
```

Run: `pnpm spec:check`
Expected: `통과`

- [ ] **Step 6: 끝 검사와 커밋**

Run: Global Constraints의 Task 끝 검사
Expected: 모두 통과

```bash
git add tools/architecture/copy.ts tools/architecture/rules.ts src/architecture.test.ts spec/behavior/i18n.md
git commit -m "test: 화면 문구 하드코딩 검사와 invoke로 plugin 명령을 부르는 네트워크 우회 검사를 더함"
```

---
### Task 14: 문서 정리

**spec:** (문서만)

**Files:**
- Modify: `docs/superpowers/specs/2026-10-03-cross-platform-design.md` (변경 이력, 5.1, 5.2, 5.4, 5.5, 7장, 13장)
- Modify: `docs/superpowers/reports/2026-10-03-plan2-risk-check.md` ("다음 계획으로 넘기는 일" 표의 계획 5 줄과 "번들 아이콘 정리" 줄)
- Modify: `docs/superpowers/plans/2026-10-04-v2-adapters-and-platform.md` ("계획 5로 넘기는 일")
- Modify: `CLAUDE.md` (문서 지도)

- [ ] **Step 1: 설계 문서 고치기**

변경 이력 맨 아래에 더한다:

```markdown
- 2026-10-06: 계획 5 반영 — ViewModel은 runes를 쓰는 `.svelte.ts` class(5.1), 화면 언어를 고르는 `screenLanguage`와 창 높이 `setHeight`(5.2), `src/presentation/theme/`(5.4), presentation 테스트 도구(5.5), I18N-02 자동 검사 예외(7장), 계획 5 개발 결정(13.2)
```

5.1의 `- ViewModel은 Svelte에 의존하지 않는다. View 프레임워크는 바꿀 수 있는 세부 사항이다.` 줄을 바꾼다:

```markdown
- ViewModel은 Svelte 5 runes(`$state`)를 쓰는 class이고 `.svelte.ts` 파일이다(`src/presentation/*-view-model.svelte.ts`). `svelte` 패키지를 import하지 않는다. 동작 규칙은 ViewModel과 순수 TS 도우미(`src/presentation/input/`, `layout/`, `menu/`)에 두고, 컴포넌트는 그리기·DOM 이벤트 연결·크기 재기만 한다. View 프레임워크를 바꾸면 `$state` 선언을 다른 알림 방식으로 바꾸면 된다(계획 5 개발 결정 D1).
- 화면 문구 하드코딩도 같은 구조 테스트가 막는다(I18N-02, `tools/architecture/copy.ts`). 예외는 7장에 적는다.
```

5.2 표의 `WindowController` 줄 "하는 일" 칸을 바꾼다:

```markdown
| `WindowController` | 위치, 크기, 창 높이만 바꾸기(내용 맞추기·메뉴용 늘리기), 맨 위 고정, 보이기·숨긴 채 두기, 끌어 옮기기, 크기 조절, 모니터 영역 | `src/application/ports/window-controller.ts` | `src/adapters/tauri/window-controller.ts` / `FakeWindowController` |
```

5.2 아래 목록의 `LocaleProvider`는 아직 application이 쓰지 않는다(화면 언어 고르기는 계획 5). 문장을 `LocaleProvider`는 켤 때 `screenLanguage`(`src/application/language.ts`)가 한 번 읽는다(I18N-01).로 바꾼다.

5.4 표의 `src/presentation/theme/` 줄을 바꾼다:

```markdown
| `src/presentation/theme/` | 겉모양 CSS 변수(`theme.css`, 시안 값)와 OS·언어별 글꼴. 글꼴 이름은 `theme.css`의 `--font-{macos,windows}-{ko,en,zh}` 변수에 있고, `fonts.ts`가 OS와 화면 언어로 변수를 고른다 |
```

5.5 표의 presentation 줄을 바꾼다:

```markdown
| presentation | Vitest node 환경으로 ViewModel과 순수 도우미. DOM 이벤트 연결이 핵심인 컴포넌트만 `@testing-library/svelte` + `happy-dom`(파일 첫 줄 `// @vitest-environment happy-dom`) | 목록·안내 줄·메뉴·창 높이 상태, 섹션 높이 나누기, 메뉴 자리, Enter·IME·붙여넣기·포커스 |
```

7장 맨 아래에 더한다:

```markdown
- I18N-02 자동 검사(`tools/architecture/copy.ts`)는 presentation의 `.svelte`·`.ts`에서 템플릿 글자, `title`·`placeholder`·`aria-label`·`alt`의 고정 글, 문구처럼 보이는 문자열 리터럴을 찾는다. 예외(계획 1이 미뤄 둔 목록, 계획 5 개발 결정 D8, PM 승인 2026-10-06):
  - 글자가 없는 기호·숫자(⋯ · % +)
  - 공백 없는 기술 낱말(이벤트 이름, 키 이름, 사전 키, 경로, CSS 값 하나, `{n}`)
  - 소문자 낱말을 공백으로 이은 CSS 클래스 목록
  - 주석, `<style>`, `console.*(…)`·`new Error(…)`의 첫 인자(개발자용 문장)
  - 사전 파일 `src/presentation/i18n/{ko,en,de,zh-hans}.ts`
  - ASCII 밖의 글자(한글·한자·움라우트)가 있으면 늘 문구로 본다. 소문자 영어 한 낱말 문구는 놓칠 수 있어 체크리스트 I18N-07에서 본다.
- 글꼴 이름은 `theme.css` 변수에 둔다. 다른 언어로 쓴 제목도 깨지지 않게 화면 언어 글꼴 뒤에 다른 언어 글꼴을 둔다(I18N-06).
- 독일어 문구는 최소 폭 280에서 안내 줄이 두 줄 안에 들어가게 짧게 쓴다(계획 5 개발 결정 D18).
```

13장 맨 끝(13.1 다음)에 절을 더한다. 표는 이 계획 맨 위 "개발 결정" 표의 D1~D27을 결정·이유 두 칸으로 옮긴다(틀렸을 때 비용 칸은 계획 문서에만 둔다). 그 아래에 다음 표를 더한다:

```markdown
### 13.2 계획 5 개발 결정 (2026-10-06)

계획 5(`docs/superpowers/plans/2026-10-06-v2-presentation.md`) "개발 결정" 표에서 옮겼다.

(D1~D27 표)

**쓴 라이브러리**

| 라이브러리 | 고른 이유 |
|---|---|
| `@testing-library/svelte` 5.4.2 (dev) | Svelte 5 공식 권장 컴포넌트 테스트 도구다. 실제 DOM 이벤트를 흘려 IME·붙여넣기·포커스를 본다 |
| `happy-dom` 20.14.5 (dev) | jsdom보다 가볍고 빠르다. 컴포넌트 테스트 파일에서만 켠다 |
```

`(D1~D27 표)` 자리에는 계획 맨 위 표의 27줄을 `| 결정 | 이유 |` 표로 그대로 붙인다(문장을 줄이지 않는다).

12장 표의 `macOS 창` 줄 결과 칸 끝의 `그림자는 잘 안 보여 계획 5 디자인에서 v1.4에 맞춘다` 다음에 `→ 계획 5에서 v1.4 그림자 값으로 맞췄다(Task 15 확인 2번)`를 붙인다.

- [ ] **Step 2: 앞 계획 문서와 CLAUDE.md**

`docs/superpowers/reports/2026-10-03-plan2-risk-check.md` "다음 계획으로 넘기는 일" 표에서 "계획" 칸이 `계획 5`인 일곱 줄의 칸을 다음으로 바꾼다:

| 항목 | 바꿀 "계획" 칸 |
|---|---|
| 시험 화면(`App.svelte`, …)을 실제 화면으로 바꾼다 | `계획 5 — 완료 (계획 5 Task 12)` |
| 그림자와 메뉴 막대 아이콘 디자인을 v1.4 기준으로 맞춘다 | `계획 5 — 완료 (계획 5 Task 6, 12)` |
| 헤더 끌기는 왼쪽 버튼만 받는다 | `계획 5 — 완료 (계획 5 Task 12)` |
| 템플릿 아이콘 정리 | `계획 5 — 완료 (계획 5 Task 6)` |
| vite `server.watch.ignored: ['**/src-tauri/**']` | `계획 5 — 완료 (계획 5 Task 10)` |
| PERF-01, PERF-03을 실제 화면으로 다시 잰다 … | `계획 5 — 완료 (계획 5 Task 15)` |
| MAC-03, MAC-05, MAC-07의 전체 화면 동작을 HEAD 빌드로 … | `계획 5 — 완료 (계획 5 Task 15)` |

같은 표의 `번들 아이콘 정리` 줄 "계획" 칸 `계획 6`을 `계획 6 — 완료 (계획 5 Task 6에서 함께)`로 바꾼다.

`docs/superpowers/plans/2026-10-04-v2-adapters-and-platform.md` "### 계획 5로 넘기는 일"의 각 줄 끝에 붙인다:

| 줄 | 붙일 글 |
|---|---|
| 시험 화면을 실제 화면으로 바꾼다 … | ` — 완료 (계획 5 Task 12)` |
| 문구를 I18N 사전으로 옮긴다: … | ` — 완료 (계획 5 Task 6, 12)` |
| 📌는 실패하면 표시를 되돌린다 | ` — 완료 (계획 5 Task 9)` |
| 창 높이를 내용에 맞춰 줄인다(WND-03) … | ` — 완료 (계획 5 Task 3, 8, 12)` |
| `LocaleProvider`로 화면 언어를 고른다 | ` — 완료 (계획 5 Task 1, 12)` |
| PERF-01을 다시 잰다 … | ` — 완료 (계획 5 Task 4, 15)` |
| 시작이 3초를 넘긴 뒤 STORE-10이 나면 … | ` — 완료 (계획 5 Task 5)` |
| `quit()`에서 `exit()`가 실패하면 … | ` — 완료 (계획 5 Task 4)` |
| 구독 해제 함수와 `placement.dispose()`를 쓰지 않는다 | ` — 완료 (계획 5 Task 9, 12. 화면을 떼면 ViewModel이 정리한다)` |
| Windows 레지스트리를 읽을 때도 쓰기 권한으로 연다 | ` — 완료 (계획 5 Task 5)` |
| 구조 규칙이 `invoke('plugin:updater|...')` … | ` — 완료 (계획 5 Task 13)` |

`CLAUDE.md` 문서 지도의 계획 4 줄 아래에 더한다:

```markdown
| 계획 5 (화면) | `docs/superpowers/plans/2026-10-06-v2-presentation.md` |
```

- [ ] **Step 3: 검사와 커밋**

Run: `pnpm spec:check`
Expected: `통과`

```bash
git add docs CLAUDE.md
git commit -m "docs: 계획 5 결과를 설계 문서와 앞 계획 문서에 반영함"
```

---

### Task 15: PM 직접 확인(macOS release), PERF 다시 재기, CI, 실행 기록

**spec (직접 확인):** WND-01·02·03·09·10·12·13, LIST-10·11·12·16, INPUT-01·06·12·13·16·17·18·19, START-01·04·08·09, STORE-10, I18N-06·07, MAC-02·03·04·05·06·07·09·12, PERF-01·02·03·04·07

**Files:**
- Modify: 이 계획 문서 (끝에 "실행 기록" 절)
- 확인용 스크립트는 저장소에 넣지 않는다(세션 scratchpad에 둔다)

이 Task의 PM 확인과 push는 controller가 PM과 직접 한다(계획 4 실행 기록 R2와 같다).

- [ ] **Step 1: 확인 스크립트 만들기**

데이터 폴더를 `/tmp/todowidget-pm-check`로 고정한다. 빈 변수나 다른 실행 방법 때문에 실제 폴더를 쓰는 일을 막는다(계획 4 R15). 처음 켜기 전에 `settings.json`을 만들어 두어, release 빌드가 로그인 항목을 저절로 등록하지 않게 한다(D24).

세션 scratchpad에 `pm-check.sh`로 저장하고 `chmod +x`한다:

```bash
#!/bin/bash
# TodoWidget 계획 5 PM 확인용. 데이터 폴더는 늘 아래 고정 폴더다. 실제 폴더(~/Library/Application Support/TodoWidget)를 쓰지 않는다.
set -euo pipefail
REPO="/Users/hoyoungjeon/dev/todo/todo-widget"
APP="$REPO/src-tauri/target/release/bundle/macos/TodoWidget.app"
BIN="$APP/Contents/MacOS/todo-widget"
DATA="/tmp/todowidget-pm-check"
LOG="$DATA-probe.log"

running() { pgrep -f "$BIN" >/dev/null 2>&1; }

# 앱을 켜는 모든 명령이 먼저 부른다. settings.json이 있으면 처음 실행이 아니라 로그인 항목을 저절로 등록하지 않는다 (D24, START-02).
prepare() {
  mkdir -p "$DATA"
  [ -f "$DATA/settings.json" ] || echo '{}' > "$DATA/settings.json"
}

# 다른 TodoWidget이 떠 있으면 두 번 실행 방지 때문에 새로 켠 앱이 바로 끝나 확인·측정이 틀린다.
none_running() {
  if pgrep -x todo-widget >/dev/null 2>&1; then
    echo "다른 TodoWidget이 떠 있어요. 끄고 다시 하세요(두 번 실행 방지 때문에 새 창이 뜨지 않아요)." >&2
    exit 1
  fi
}

case "${1:-}" in
  build)
    (cd "$REPO" && pnpm tauri build --bundles app)
    ;;
  start)
    none_running
    prepare
    open -n --env TODOWIDGET_DATA_DIR="$DATA" "$APP"
    ;;
  again)
    prepare
    open -n --env TODOWIDGET_DATA_DIR="$DATA" "$APP"
    ;;
  check)
    # 확인 19번 직전: 시험용 위젯이 떠 있어야 Spotlight·Finder로 켜도 실제 폴더를 쓰지 않는다.
    if running; then echo "시험용 위젯이 떠 있어요. 다시 실행해도 돼요."; else echo "떠 있지 않아요. start 먼저 하세요." >&2; exit 1; fi
    ;;
  kill)
    pkill -f "$BIN" || true
    ;;
  lock)
    chmod 000 "$DATA/tasks.json"
    ;;
  unlock)
    chmod 644 "$DATA/tasks.json"
    ;;
  broken)
    printf '{ 깨진 파일' > "$DATA/tasks.json"
    ;;
  newer)
    printf '{"version":3,"tasks":[]}' > "$DATA/tasks.json"
    ;;
  fresh)
    rm -f "$DATA"/tasks*.json
    ;;
  many)
    for i in $(seq 1 30); do printf '할 일 %d\n' "$i"; done | pbcopy
    echo "30줄을 클립보드에 넣었어요. 위젯 입력칸에 붙여 넣으세요."
    ;;
  probe)
    # PERF-01: Rust 시작부터 첫 화면을 그리고 창을 보일 때까지(probe 기준). 10번 잰다. 켤 때마다 업데이트 확인 요청이 한 번 나간다.
    none_running
    prepare
    : > "$LOG"
    for i in $(seq 1 10); do
      TODOWIDGET_DATA_DIR="$DATA" TODOWIDGET_PROBE=1 "$BIN" 2>>"$LOG" &
      sleep 3
      pkill -f "$BIN" || true
      sleep 1
    done
    grep -o 'shown [0-9]*ms' "$LOG" | awk '{print $2}' | sed 's/ms//' | sort -n | awk '{a[NR]=$1} END {print "횟수", NR, "중앙값", (NR%2 ? a[(NR+1)/2] : (a[NR/2]+a[NR/2+1])/2) "ms", "최솟값", a[1] "ms", "최댓값", a[NR] "ms"}'
    ;;
  cpu)
    # PERF-03: 앱 프로세스의 누적 CPU 시간을 60초 간격으로 두 번 읽어 1분 평균을 낸다. 재는 동안 마우스를 위젯 위에 두지 않는다.
    running || { echo "위젯이 떠 있지 않아요" >&2; exit 1; }
    pid=$(pgrep -f "$BIN" | head -1)
    secs() { ps -o time= -p "$pid" | awk -F: '{print $1*60+$2}'; }
    a=$(secs); sleep 60; b=$(secs)
    echo "todo-widget 1분 CPU 시간 $(echo "$b - $a" | bc)초 → 평균 $(echo "scale=2; ($b - $a) / 60 * 100" | bc)%"
    echo "WebKit 프로세스는 활동 상태 보기에서 'TodoWidget' 아래 항목을 함께 본다(PERF-03·04)."
    ;;
  mem)
    # PERF-04: 앱 프로세스의 footprint. WebKit 세 프로세스는 활동 상태 보기에서 함께 더한다.
    running || { echo "위젯이 떠 있지 않아요" >&2; exit 1; }
    footprint "$(pgrep -f "$BIN" | head -1)" | tail -5
    ;;
  cleanup)
    if running; then
      echo "위젯을 먼저 ⋯ → 종료로 끄세요. 자동 실행 체크가 켜져 있으면 끄고 종료하세요." >&2
      exit 1
    fi
    rm -rf "$DATA" "$LOG"
    echo "정리했어요. 시스템 설정 → 일반 → 로그인 항목에 TodoWidget이 없는지 보세요."
    ;;
  *)
    echo "사용법: $0 build|start|again|check|kill|lock|unlock|broken|newer|fresh|many|probe|cpu|mem|cleanup" >&2
    exit 1
    ;;
esac
```

Run: `./pm-check.sh build`
Expected: `src-tauri/target/release/bundle/macos/TodoWidget.app`이 생긴다.

- [ ] **Step 2: 시작 전에 PM에게 알리고 동의받기**

PM에게 다음을 먼저 말한다.
- **경고: 로그인 항목이 켜진 채로 Mac을 재시동하면, 로그인 항목은 데이터 폴더 지정 없이 위젯을 켜서 실제 폴더(`~/Library/Application Support/TodoWidget/`)를 쓴다.** 계획 4 확인 때 실제로 이렇게 됐다. 그래서 확인 16번(자동 실행 체크)에서 켠 뒤에는 바로 끄고, 확인이 끝날 때까지 재시동하지 않는다.
- 데이터 폴더는 `/tmp/todowidget-pm-check`로 고정이다. 미리 `settings.json`을 만들어 두어 처음 켤 때 로그인 항목이 저절로 생기지 않는다.
- 확인 22·23번에서 시스템 설정 → 일반 → 언어 및 지역 → 선호하는 언어의 순서를 잠깐 바꾼다. 끝나면 원래대로 돌린다.
- 시작 전에 시스템 설정 → 일반 → 로그인 항목에 TodoWidget이 없는지 함께 본다. 남아 있으면 데이터 폴더에 `settings.json`이 있어 켤 때마다 `refresh()`가 그 자리에서 다시 등록하므로, 먼저 그 항목을 끄고 시작한다(리뷰 M10).
- 확인 7번의 `many`는 클립보드를 30줄로 덮어쓴다. 클립보드에 필요한 것이 있으면 먼저 옮겨 둔다.
- 위젯을 켤 때마다 GitHub에 업데이트 확인 요청(`latest.json`을 읽기만 한다)이 한 번 나간다. `probe`는 10번 켜므로 10번이다. 받기·설치는 누르지 않는 한 일어나지 않는다(PM 결정 2026-10-06, 리뷰 I7).
- 화면 캡처는 하지 않는다. 결과는 말로 알려 주면 개발이 적는다.
- 약 60분 걸린다(PM 결정 P4).

동의하지 않으면 Step 3을 하지 않고 Step 4로 간다.

- [ ] **Step 3: PM 직접 확인**

`./pm-check.sh start`로 켜고 PM과 차례로 본다. 결과(통과/실패와 한 줄 설명)는 Step 6의 실행 기록 표에 적는다. 실패하면 그 자리에서 고칠지, 기록하고 넘길지 PM과 정한다. 고치면 다시 `build`하고 그 항목부터 다시 본다.

| # | spec | 확인 |
|---|---|---|
| 1 | PERF-01, LIST-10, MAC-12 | 켤 때 흰 화면이 먼저 보이지 않고 곧바로 카드가 보인다. 빈 목록이면 "할 일을 추가해 보세요"가 보이고 창이 내용만큼 작다. 시스템 설정 → 일반 → 정보의 macOS 버전을 적는다 |
| 2 | WND-01 | 둥근 카드, 테두리와 제목 표시줄 없음, 카드 밖은 비치고 둘레에 옅은 그림자. 시안 1번(`docs/design/widget-mockup.html`을 브라우저로 연다)과 나란히 놓고 색·크기·간격이 같다. 시안과 다른 곳은 v1.4 값을 쓴 두 곳뿐이다(PM 재확인 2026-10-06, P2): 헤더 아래가 4px 넓고, 줄 사이가 2px(시안 1px)이다 |
| 3 | INPUT-06, INPUT-01 | 입력칸이 비면 "할 일 추가"가 흐리다. 아래 셋을 따로 적는다(D3). **(a)** 한글 두벌식으로 "보고서 쓰기"를 쓰고 마지막 "기"를 조합 중인 채 **Enter를 한 번** 누르면 "보고서 쓰기"가 정확히 1개 추가되고 입력칸이 빈다. Enter를 두 번 눌러야 추가되면 실패다. **(b)** 중국어 병음으로 "xie"를 조합 중에 Enter를 누르면 라틴 글자 "xie"가 입력칸에 확정되기만 하고 할 일은 추가되지 않는다. **(c)** 이어서 바로 다음 글자를 입력해도 끊기거나 마지막 글자가 빠지거나 두 번 들어가지 않는다. (a)가 실패하면 `isCommitEnter`를 `isComposing`만 보는 계획 2 규칙으로 돌리고(keyCode 229 조건과 그 테스트를 뺀다) 다시 빌드해 (a)(b)를 다시 본다. 그러고 나서 (b)가 실패하면 둘이 부딪히는 것이므로 PM에게 묻는다. 어느 쪽이든 controller에게 알린다. **(d)** 한글을 조합하는 중 Esc를 누르면 입력칸·이름 바꾸기 칸의 글이 사라지지 않는다 |
| 4 | LIST-11 | 아주 긴 제목을 추가하면 말줄임 없이 여러 줄로 보이고, 창도 그만큼 커진다 |
| 5 | LIST-12 | 동그라미를 눌러 할 일(회색 빈 원) → 하는 중(주황 점, 주황 배경) → 끝낸 일(초록 원, 흐린 제목, 취소선)로 바뀐다. 끝낸 일 제목 줄 점은 초록, 할 일 제목 줄 점은 주황 |
| 6 | PERF-02, LIST-07·08·09 | 추가·상태 변경·접기가 바로 보인다. 끝낸 일 "펼치기"/"접기", 할 일 ⌄/›가 바뀐다. `./pm-check.sh kill` 뒤 `start`로 다시 켜도 접힘 상태가 그대로다 |
| 7 | LIST-16 | `./pm-check.sh many` 후 입력칸에 붙여 넣는다. 30개가 순서대로 추가되고 창이 최대 높이에서 멈추며, 섹션이 각자 얇은 스크롤바로 스크롤된다. 끝낸 일도 몇 개 만들어 펼치면 두 섹션이 나눠 쓴다 |
| 8 | WND-03 | 여덟 방향 가장자리·모서리를 끌면 카드가 따라온다. 폭은 280보다 좁아지지 않는다. 할 일이 적을 때 크게 끌고 놓으면 내용만큼 줄어든다. 다시 켜도 폭·최대 높이·위치가 그대로다 |
| 9 | WND-10 | ⋯ 메뉴가 버튼 바로 아래에 오른쪽 끝을 맞춰 뜬다. 항목이 적어 창이 짧을 때 메뉴가 잘리지 않는다(창이 투명하게 늘어난다). 위젯을 화면 맨 아래로 옮기고 열면 버튼 위로 뜨고, 그때 카드가 깜빡이거나 움직이지 않는다(D11). 늘어난 투명 부분이나 다른 앱을 누르면 메뉴가 닫힌다(D10). ↓↑ 방향키로 항목을 고르고 Enter로 실행, Esc로 닫는다. 메뉴가 열린 채 ⋯를 다시 누르면 닫히고 다시 열리지 않는다. 메뉴가 열린 채 할 일 동그라미를 누르면 메뉴만 닫히고 상태는 그대로다. 투명도 슬라이더를 우클릭해도 기본 메뉴(다시 로드)가 뜨지 않는다. 입력칸에 쓰다가 ⋯ 메뉴로 투명도를 바꾸고 닫은 뒤 바로 타이핑하면 입력칸에 들어간다 |
| 10 | WND-12 | 투명도 슬라이더를 끌거나, 누른 자리로 바로 가거나, 휠을 굴리면 카드 배경과 % 값이 바로 바뀐다. 마우스 휠 한 칸은 정확히 2%다(빨리 여러 칸 굴려도 칸마다 2%, D26). 트랙패드로 위아래로 쓸면 조금씩 바뀌고(한 번 쓸기에 끝까지 가지 않는다, D26), 가로로 쓸면 바뀌지 않는다. 손가락·휠을 실제로 위로 움직이면 더 투명해진다. 시스템 설정 → 트랙패드(마우스) → 스크롤 및 확대/축소의 "자연스러운 스크롤"을 켠 채와 끈 채 둘 다 같은 방향이다(PM 결정 P6). 메뉴를 닫고 `kill` → `start`로 다시 켜도 그 투명도다 |
| 11 | WND-13 | 투명도 40%에서 카드·끝낸 일 제목 줄·하는 중 배경이 비치고, 글자와 동그라미는 선명하며, 그림자도 옅어진다 |
| 12 | INPUT-12·13·16·17 | 할 일을 우클릭(또는 Control+클릭)하면 판 왼쪽 위가 커서 자리에 메뉴가 뜨고 지금 상태에 주황 체크가 있다. 상태를 고르면 바뀐다. "이름 바꾸기"와 제목 더블클릭은 테두리 없이 글자 전체가 선택된다. 그 칸에 두 줄 글을 붙여 넣으면 한 줄로 들어간다. 그 칸과 입력칸에서 우클릭하면 OS 기본 메뉴(잘라내기·복사·붙여넣기)가 뜨고 할 일 메뉴는 뜨지 않는다(D25). 이름을 바꾸던 중 다른 앱을 누르면 이름이 저장된다(INPUT-14, D10). "삭제"는 확인 없이 지운다. 끝낸 일을 이름 바꾸면 칸 글자가 진하고 취소선이 없다 |
| 13 | INPUT-18·19 | ⋯ → 초기화를 누르면 옅은 흰 막 위에 "할 일 N개를 모두 지울까요?" 판이 뜬다. 바깥을 누르면 아무것도 지우지 않고 닫힌다. "모두 지우기"를 누르면 다 지운다. 할 일이 없으면 초기화가 흐리고 눌리지 않는다. 확인 판이 열린 채 가장자리를 끌면 크기가 바뀌지 않고 판만 닫힌다. 판이 뜨면 취소 버튼에 포커스가 있어, Enter나 Esc를 누르면 아무것도 지우거나 추가하지 않고 닫힌다 |
| 14 | WND-02 | 헤더를 왼쪽 버튼으로 끌면 창이 따라온다. 오른쪽 버튼으로는 끌리지 않는다. 옮기고 1초 뒤 `kill` → `start`로 다시 켜면 그 자리다 |
| 15 | WND-09 | 📌를 끄면 사선 그은 흐린 압정이 되고 다른 창에 가려진다. 툴팁이 "맨 위에 고정"/"맨 위 고정 끄기"로 바뀐다. 다시 켜도 그 상태다 |
| 16 | START-04 | **로그인 항목이 잠깐 생긴다.** ⋯ 메뉴에서 "컴퓨터 켤 때 자동 실행"을 눌러 켜면 다음에 열 때 체크가 있고 시스템 설정 → 일반 → 로그인 항목에 TodoWidget이 생긴다. 바로 다시 눌러 끄고, 로그인 항목에서 사라졌는지 본다. 이 사이에 재시동하지 않는다 |
| 17 | START-09 | 위젯을 끄고 `./pm-check.sh broken` 후 켜면 "저장 파일에 문제가 있어 백업해 두었어요"가 주황 글로 보인다. 끄고 `newer` 후 켜면 "새 버전에서 만든 파일이에요. 업데이트해 주세요"가 보인다. 끝나면 끄고 `fresh` |
| 18 | STORE-10 | 할 일을 하나 더하고 끈 뒤 `lock` 후 켜면 빈 창 없이 "할 일 파일을 열 수 없어요" 대화 상자만 맨 앞에 뜨고, 확인을 누르면 아무것도 남지 않는다. 끝나면 `unlock` |
| 19 | MAC-02, MAC-05, START-01 | Dock과 Cmd+Tab에 없다. 먼저 `./pm-check.sh check`로 시험용 위젯이 떠 있는지 본다(리뷰 M10). 다른 창으로 가린 뒤 `./pm-check.sh again`, Spotlight(Cmd+Space, "TodoWidget"), 응용 프로그램 폴더 대신 Finder에서 빌드한 앱을 더블클릭해 다시 실행하면 새 창 없이 기존 위젯이 앞으로 오고, 활성 상태 보기에 위젯 프로세스가 하나뿐이다. Spotlight와 Finder로 켜는 것은 이미 떠 있을 때만 한다(떠 있지 않을 때 이렇게 켜면 실제 데이터 폴더를 쓴다) |
| 20 | MAC-03, PERF-07 | 메뉴 막대 아이콘이 하는 중 동그라미 모양이다. 시스템 설정 → 모양을 밝게·어둡게 바꿔도 잘 보인다. 위젯을 가린 뒤 아이콘을 누르면 곧바로 앞으로 온다 |
| 21 | MAC-04 | 메뉴 막대 아이콘을 우클릭하면 "열기"·"종료"(한국어)가 뜬다. "열기"는 앞으로 가져오고, "종료"는 위젯과 아이콘을 함께 없앤다. 끈 뒤 다시 `start` |
| 22 | I18N-06, MAC-09 | 선호하는 언어 맨 위를 English, Deutsch, 简体中文 순으로 바꿀 때마다 `kill` → `start`. 영어·독일어는 시스템 글꼴(SF Pro), 중국어는 PingFang SC, 한국어는 Apple SD Gothic Neo로 보인다(텍스트 편집기에서 같은 글꼴로 쓴 글과 비교). 영어 화면에서 "보고서 쓰기", 한국어 화면에서 "写报告" 제목이 깨지지 않는다. 메뉴 막대 메뉴도 그 언어다 |
| 23 | I18N-07 | 독일어로 두고 창 폭을 가장 좁게(280) 줄인 뒤 헤더, 섹션 제목 줄, ⋯ 메뉴, 우클릭 메뉴, 초기화 확인 판, 안내 줄(`newer`로 띄운다), 입력칸 안내가 잘리거나 겹치지 않는다. 끝나면 선호 언어를 원래대로 돌린다 |
| 24 | MAC-06 | Mission Control로 데스크톱을 하나 더 만들어 Control+←/→로 오가면 위젯이 두 데스크톱에서 같은 자리에 보인다 |
| 25 | MAC-07 | 다른 앱(Safari)을 전체 화면으로 두고 📌를 켠 채, 끈 채 각각 그 화면으로 가면 위젯이 보이지 않는다. 일반 데스크톱으로 오면 다시 보인다 |
| 26 | INPUT-11 (P1) | 다른 앱을 누른 뒤, 위젯의 동그라미를 한 번 누르면 바로 상태가 바뀐다(두 번 누를 필요 없다) |
| 27 | START-08 | ⋯ → 종료로 위젯과 메뉴 막대 아이콘이 사라지고, 활성 상태 보기에 프로세스가 남지 않는다 |

- [ ] **Step 4: PERF 다시 재기 (개발, PM은 마우스를 위젯 위에 두지 않는다)**

1. PERF-01: 위젯을 끈 상태에서 `./pm-check.sh probe`. 중앙값이 500ms 이하인지 본다. 처음 실행(빌드 직후)은 macOS 검사 때문에 느리므로, probe 전에 `start`로 한 번 켜고 끈다. 계획 2(빈 시험 화면)는 중앙값 428ms였다.
2. PERF-03: `./pm-check.sh start`로 켜고 2분 기다린 뒤 `./pm-check.sh cpu`를 두 번 한다. 활동 상태 보기의 CPU 열(TodoWidget과 그 WebKit 프로세스)도 함께 본다. 1분 평균 1% 미만이 기준이다.
3. PERF-04: `./pm-check.sh mem`과 활동 상태 보기의 메모리 열로 관련 프로세스 합이 120MB 이하인지 본다.

결과가 기준과 크게 다르면 PM과 다시 정한다(설계 문서 11장 첫 줄). 이 계획에서 숫자 기준을 바꾸지 않는다.

정리: 위젯을 ⋯ → 종료로 끄고 `./pm-check.sh cleanup`. 시스템 설정 → 일반 → 로그인 항목에 TodoWidget이 없는지 본다. `sfltool dumpbtm`에 `disabled` 기록 한 줄이 남을 수 있다. 다른 앱 기록까지 지우는 명령밖에 없으므로 지우지 않는다(계획 2 보고서 Step 6).

- [ ] **Step 5: push와 CI (PM 결정 P5: 직전에 다시 확인받는다)**

PM에게 push를 확인받은 뒤 `git push origin feat/cross-platform`을 한다. CI의 두 job(`REL-01 검사 (macos-latest)`, `REL-01 검사 (windows-latest)`)이 모두 통과해야 한다. Windows job에서 특히 본다.
- 앱 crate Windows 빌드와 clippy(`platform/windows.rs`의 `set_tray_labels`, `tauri.conf.json`)
- `real_registry_round_trip`(WIN-03, Task 5의 읽기 권한 변경)
- 컴포넌트 테스트(happy-dom)와 I18N-02 검사가 Windows 경로 구분자에서도 통과하는지(`collectSources`는 `/`로 바꾼다)
- `pnpm privacy:check`

실패하면 고치고 같은 방식으로 PM 확인 뒤 다시 push한다.

- [ ] **Step 6: 실행 기록 쓰기**

이 문서 끝에 "## 실행 기록 (날짜)" 절을 더한다. 계획 4 실행 기록과 같은 꼴이다.
- 계획과 달라진 곳
- PM 직접 확인 결과 표(위 27줄의 번호·항목·결과)
- PERF 측정 결과(PERF-01 10번 값과 중앙값, PERF-03 1분 평균, PERF-04 합계)
- CI 결과(run 번호, 두 job)
- 개발 판단 표(실행 중에 정한 것, 틀렸을 때의 비용)
- 계획 6으로 넘기는 일: 이 계획의 "넣지 않는 것" 표, 계획 4 실행 기록의 "계획 6으로 넘기는 일", 그리고 확인 중 새로 나온 것

```bash
git add docs/superpowers/plans/2026-10-06-v2-presentation.md
git commit -m "docs: 계획 5 실행 기록"
```

이 커밋도 push는 PM 확인 뒤에 한다.

---

## 셀프 리뷰 기록 (계획 작성 때)

- **spec 연결:** `pnpm spec:check:strict`가 2026-10-06에 "테스트 없는 자동 테스트 항목"으로 낸 32개 중 계획 5 몫(I18N-02·03·04·05, INPUT-01·02·03·04·05·07·10~20, LIST-01·06·07·08·10, WND-10)에 모두 테스트 이름이 있다(Task 1, 7~13). 남는 것은 PERF-05, REL-02·03·05·10(계획 6)이다. 직접 확인 중 macOS에서 볼 수 있는 화면 관련 항목과 MAC-02·03·05·06·07은 Task 15의 27줄에 있다. PERF-06과 UPD-09는 이 계획 밖이다("넣지 않는 것").
- **앞 계획에서 넘긴 일:** 계획 4 "계획 5로 넘기는 일" 11줄과 계획 2 표의 계획 5 줄 7개에 모두 Task가 있다(Task 14 Step 2 표). 계획 2의 "번들 아이콘 정리"(계획 6)는 아이콘을 새로 만드는 Task 6에서 함께 한다.
- **자리 표시 검사:** "TBD", "나중에", "적절히" 같은 말이 없다. 모든 코드 Step에 전체 코드가 있다. Task 14 Step 1의 "(D1~D27 표)"는 계획 맨 위 표를 그대로 옮기라는 지시이고 옮길 내용이 이 문서에 있다.
- **타입 일치:**
  - `WindowController.setHeight(height, raise)`: Task 3(port, adapter, fake) → `WindowPlacement.fitToContent/expand/restore`(Task 3) → `WindowViewModel`(Task 8).
  - `WindowPlacement.maxHeight`, `height`, `roomAround()`, `show()`, `startMove()`: Task 3에서 만들고 Task 8에서 쓴다.
  - `Translate`(Task 1)는 `WidgetViewModel.t`(Task 9)와 `main.ts`(Task 12)가 같은 이름으로 쓴다.
  - `popupExtent(popup, windowHeight, allowance)`, `MENU_SHADOW`, `Anchor`, `Size`, `Position`, `Room`(Task 7)은 Task 8·11·12가 같은 이름으로 쓴다.
  - `WidgetViewModel`의 `menu`, `window`, `statusChoices`, `openMoreMenu`, `openContextMenu`, `closeContextMenu`, `startResize`(Task 9)는 Task 10~12 컴포넌트가 같은 이름으로 쓴다.
  - `createTestApp()`(Task 8)은 Task 9~12 테스트가 쓴다.
  - `StartupResult.ready.autoStartDone`(Task 4)은 `launchApp`이 쓰지 않으므로 다른 Task에 영향이 없다.
- **실험으로 확인한 것 (2026-10-06):**
  - 저장소 사본(scratchpad)에 이 계획의 코드를 모두 적용해 보았다(컴포넌트 테스트 파일과 `vite.config.ts`의 `svelteTesting`은 의존성을 설치하지 않아 빼고). node 환경 Vitest 61개 파일·432개 테스트 통과(I18N-02 실제 소스 검사 포함), `svelte-check --fail-on-warnings` 오류·경고 0, `vite build` 성공, `cargo fmt --check`·`cargo clippy -D warnings`(macOS 앱 crate 포함, Windows 대상 core·windows crate) 통과, `todowidget-core` 테스트 33개 통과. 이때 찾은 `popupExtent`의 `-0`과 `run_key.rs` 한 줄의 rustfmt 줄 나눔은 이 문서에 고쳐 두었다.
  - node 환경 Vitest에서 `.svelte.ts` class의 `$state`·`$derived`가 바뀐 값을 돌려준다(scratchpad 실험).
  - `pnpm tauri icon`이 SVG를 바로 읽어 icns·ico·PNG와 `--png 36`을 만든다.
  - tray-icon 0.25는 이미지 높이를 18pt로 맞춘다. `include_image!`는 컴파일 때 PNG를 읽어 feature가 필요 없다. `MenuItem::set_text`, `MenuItem`의 Send·Sync가 있다.
  - `@testing-library/svelte` 5.4.2의 `svelteTesting()`은 `autoCleanup`을 끌 수 있고, 테스트 라이브러리를 Vite가 컴파일하게 한다(`ssr.noExternal`).
- **리뷰 반영 (2026-10-06, `plan5-review.md` Important I1~I7, Minor M1~M11):**
  - I1 줄 묶음 `.rows`를 flex column으로(줄 사이 2px, 높이 정확히 잼). I3 카드 최대 높이와 섹션 영역 `overflow: hidden`(입력칸은 늘 보임). I5 D3 문장을 사실대로, 확인 3번을 (a)(b)(c)로 나누고 실패하면 돌아갈 규칙을 적음. I6 확인 스크립트 `prepare()`·`none_running()`.
  - I2 P2를 실제 측정으로 다시 적고 PM 재확인(v1.4 값). I4 휠: `deltaY` 0 무시, 픽셀 단위는 50px마다 한 칸(D26), 방향은 PM 결정 P6(실제 방향, spec WND-12 한 문장, Task 7 Step 0). I7 업데이트 확인 요청은 허용, 받기·설치는 금지(PM 결정).
  - M1 popup 세대 번호(D27), M2 늘리기 실패 때 `lift` 되돌림, M3 OS 종료 요청의 거부 처리(Task 4), M4 아이콘 16개 모두 다시 만듦, M5 입력칸·이름 칸의 OS 기본 우클릭 메뉴(D25, controller 판단), M6 D10과 확인 12번, M7 두 테스트를 이름대로, M8 spec 연결 표, M9 모니터마다의 작업 영역(`ScreenLayout.workAreas`, Tauri `Monitor.workArea`)과 우클릭 메뉴 위아래 뒤집기, M10 확인 Step 2·19번, M11 메뉴가 슬라이더의 방향키·Space를 가로채지 않음.
  - 반영한 코드를 저장소 사본에 다시 적용해 돌렸다: node 환경 Vitest 62개 파일·438개 테스트 통과, `svelte-check --fail-on-warnings` 0, `tsc`(core) 통과.
- **확인하지 못한 것 (실행 때 본다):**
  - happy-dom 20 + Vitest 5에서 컴포넌트 테스트가 Svelte의 client 코드로 도는지. 설치하지 않아 돌려 보지 못했다. 안 되면 Task 10 Step 6대로 controller에게 알린다.
  - happy-dom의 `textarea.select()`·`setSelectionRange`, `WheelEvent`, 이벤트 init의 `isComposing`. 테스트가 이것에 기댄다.
  - WKWebView에서 창이 key window를 잃을 때 `window` `blur`가 오는지(D10). Task 15 확인 9번에서 본다.

## 실행 기록 (2026-10-06 ~ 2026-10-07)

- subagent 방식으로 실행했다(구현·수정·리뷰 모두 Opus). Task마다 리뷰했고, 브랜치 전체 리뷰와 수정 한 번을 PM 직접 확인 **앞에** 했다. PM이 고친 뒤의 코드를 한 번만 보게 하려는 것이다. PM 확인 중 나온 문제는 그 자리에서 고치고 새 빌드로 다시 봤다. 확인 중 고친 커밋(`1ebbed2..1147cab`)은 한 묶음으로 다시 리뷰했다.
- 끝난 상태: 자동 테스트 523개(68 파일), typecheck, spec:check, privacy:check, cargo fmt·clippy·test 통과.

### 계획과 달라진 곳

- **자동 실행 체크 (Task 4).** 계획은 `launchApp`이 켤 때 등록(`autoStartDone`)을 기다리지 않는다고 했다. 그 사이 ⋯ 메뉴에서 체크를 바꾸면, 늦게 끝난 켤 때 등록이 사용자가 끈 자동 실행을 다시 켤 수 있다(START-03). `AutoStartControl`이 켤 때 등록을 먼저 기다리게 했다. 체크를 읽을 때(`isEnabled`)도 기다린다.
- **크기 조절 뒤 높이 (Task 8).** 끄는 동안 본 마지막 내용 높이를 기억했다가, 놓은 뒤 한 번 더 내용에 맞춘다. 계획 코드대로면 메뉴를 열었다 닫을 때 끌기 전 높이로 돌아가 카드가 잘렸다.
- **I18N-02 검사 (Task 13).** template literal의 `${…}`를 `{n}`으로 읽어, `${n} tasks left` 같은 영어 문구도 잡는다. `label`·`aria-*`·버튼 `value`도 본다.
- **문서 줄 (Task 14).** 측정 전에 "완료 (Task 15)"로 적은 줄을 "Task 15 PM 확인 대기"로 바꿨다가, Task 15 결과로 다시 고쳤다(`4171574`).
- **최종 리뷰 수정 (PM 확인 전).** 확인 판이 열린 채 크기 조절, 끝낸 일 이름 바꾸기 칸 모양, 조합 중 Esc(keyCode 229), 투명도 줄 우클릭, App 통합 테스트, 메뉴 위치 세 가지, 대비책 창 띄우기를 메인 스레드에서, `#track()` 빠짐, 켜기 전 체크, Control+클릭, 포커스 돌려주기, 확인 판 처음 포커스.
- **PM 확인 중 고친 것 (모두 다시 확인해 통과).**
  - 메뉴가 창 원래 높이에서 잘렸다. `body`의 `overflow: hidden`이 늘린 창 안의 판을 잘랐다. `html`에만 둔다(`7193118`, `924bc6c`).
  - macOS에서 메뉴 방향키가 듣지 않았다. WKWebView는 `visibility: hidden`인 요소의 `focus()`를 버린다. 판을 보인 뒤에 포커스를 준다(`586bc72`).
  - 위로 연 메뉴에서 카드가 튀었다. 창을 올린 뒤에 내용을 밀고, 되돌린 뒤에 올린다(`d041a79`). 한 프레임 깜빡임은 남아 PM이 알려진 한계로 정했다(D11).
  - 한글 조합 중 Esc가 쓰던 글을 지웠다. 두 번 잘못 고쳤다(keyCode 229, 100ms 창). 계측 빌드로 실제 순서를 찾았다. WKWebView 한글 입력기는 composition 이벤트를 보내지 않고, `insertReplacementText` 입력 뒤에 keyCode 27 Esc를 보낸다. 입력기 편집 뒤 첫 keydown이 Esc면 거른다(`a719d97`, 계측 코드는 지웠다). 결과: 조합 중 첫 Esc는 글을 지키고 두 번째 Esc가 비운다.
  - 할 일 섹션 제목 줄을 10px 안으로 넣었다(PM 결정, `0dadf0c`). v1.4와 다른 점이다.
  - 확인 판 ←·→: 처음에는 두 번 눌러야 옮겨 갔다. WebKit은 마우스로 연 뒤 script로 준 포커스에 테두리를 그리지 않고, 첫 키가 포커스를 잡는 데 쓰였다. 키를 창 전체에서 받고, 포커스가 있는 버튼에 주황 테두리를 늘 그린다(`5aa8bba`). PM 요청으로 끝에서 반대쪽으로 돈다(`459920e`).
  - 크기 조절: 300보다 짧은 위젯을 끌기 시작하면 300으로 튀었다(`84187ac`). 그 뒤 내용보다 짧게 끌렸다가 놓으면 돌아왔다. PM 결정으로 끄는 동안 높이 하한을 `min(내용 높이, 300)`으로 둔다(`1147cab`, WND-03).
- **PM 확인 절차.**
  - 계획 4처럼 데이터 폴더를 `/tmp/todowidget-pm-check`로 고정한 스크립트를 썼다.
  - 언어 확인(22·23)은 시스템 선호 언어를 바꾸지 않았다. 앱마다 언어를 주는 `open -n --env TODOWIDGET_DATA_DIR=… TodoWidget.app --args -AppleLanguages '(de)'`로 켰다. PM이 시스템 설정을 바꾸고 되돌리는 일을 줄이려는 것이다. 메뉴 막대 문구까지 같은 길로 바뀌는 것을 봤다.
  - 화면 캡처는 하지 않았다. PM이 본 결과를 말로 받았다.

### PM 직접 확인 (macOS 26.5, release 빌드, 2026-10-06 ~ 2026-10-07)

| # | 항목 | 결과 |
|---|---|---|
| 1 | PERF-01, LIST-10, MAC-12 | 통과 |
| 2 | WND-01 | 통과 |
| 3 | INPUT-06, INPUT-01 | (a)(b)(c)·흐린 안내 통과. (d) 조합 중 Esc는 처음에 글을 지웠다. `a719d97` 뒤 통과. 조합이 끝난 뒤 Esc는 입력칸을 비운다(INPUT-04 그대로, PM 결정) |
| 4 | LIST-11 | 통과 |
| 5 | LIST-12 | 통과 |
| 6 | PERF-02, LIST-07·08·09 | 통과. 끝낸 일 "펼치기"/"접기", 할 일 ⌄/›는 v1.4대로 둔다(PM 결정). 할 일 제목 줄 정렬은 10px로 고친 뒤 통과 |
| 7 | LIST-16 | 통과 |
| 8 | WND-03 | 통과 |
| 9 | WND-10 | 메뉴 잘림, 방향키가 처음에 실패했다. 고친 뒤 통과. 위로 열 때 한 프레임 깜빡임은 알려진 한계(PM 결정). 투명도 줄을 방향키가 건너뛰는 것은 의도대로 |
| 10 | WND-12 | 통과 (자연스러운 스크롤 켬·끔 모두 같은 방향, 다시 켠 뒤 투명도 유지) |
| 11 | WND-13 | 통과 |
| 12 | INPUT-12·13·16·17 | 통과 |
| 13 | INPUT-18·19 | 마우스 경로 통과. 키보드는 두 번 눌러야 옮겨 갔다. `5aa8bba`·`459920e` 뒤 통과(처음 포커스 취소, ←·→ 끝에서 돎, Enter, Esc) |
| 14 | WND-02 | 통과 |
| 15 | WND-09 | 통과 |
| 16 | START-04 | 통과. 켜면 로그인 항목이 생기고, 끄면 사라졌다 |
| 17 | START-09 | 통과 |
| 18 | STORE-10 | 통과 |
| 19 | MAC-02, MAC-05, START-01 | 통과 (터미널 다시 실행·Spotlight·Finder 모두 기존 위젯이 앞으로, 프로세스 1개) |
| 20 | MAC-03, PERF-07 | 가린 뒤 아이콘을 누르면 앞으로 온다 — 통과. 아이콘 모양·밝게/어둡게는 PM 요청으로 건너뜀 |
| 21 | MAC-04 | 통과 |
| 22 | I18N-06, MAC-09 | 통과 (en·de·zh-Hans, 앱마다 언어로 켬) |
| 23 | I18N-07 | 통과. 독일어 좁은 폭에서 확인 판 버튼이 위아래로 줄바꿈되는 것은 그대로 둔다(PM 결정) |
| 24 | MAC-06 | 통과 |
| 25 | MAC-07 | 통과 |
| 26 | INPUT-11 (P1) | 통과 |
| 27 | START-08 | 통과. 프로세스가 남지 않았다 |

확인이 끝난 뒤 시험 폴더를 지웠다. 실제 데이터 폴더(`~/Library/Application Support/TodoWidget/`)는 확인 내내 만들어지지 않았다.

### PERF 측정 (`1147cab` release 빌드, 실제 화면)

| 항목 | 값 | 기준 | 결과 |
|---|---|---|---|
| PERF-01 시작 (probe 10번) | 531 447 470 479 457 467 498 453 470 519 ms, 중앙값 470ms | 500ms 이하 | 통과. 계획 2 빈 시험 화면은 428ms였다. 여유는 30ms쯤이다 |
| PERF-03 가만히 있을 때 CPU | 켠 뒤 2분, 마우스를 올리지 않음. 앱 1분 CPU 0.01초·0초(0%), WebKit 프로세스 약 4분 누적 0.4초(약 0.1%) | 1% 미만 | 통과 |
| PERF-04 메모리 | phys_footprint 앱 24MB + WebKit GPU 13MB + Networking 6.3MB + WebContent 18MB ≈ 61MB | 120MB 이하 | 통과. RSS 합 약 162MB는 공유 페이지를 포함한 값이다 |

### CI 결과

- 2026-10-07 push(`879a8a0..4171574`), run 37483795719: macOS job(2분 29초)·Windows job(3분 17초) 모두 통과.
- Windows job에서 확인한 것: 컴포넌트 테스트(happy-dom)를 포함한 68 파일, I18N-02 검사(Windows 경로), 앱 crate Windows 빌드와 clippy(`set_tray_labels`, 새 아이콘), `real_registry_round_trip`(WIN-03, 읽기 권한 변경), PRIV-01 네트워크 crate 검사.
- 이 실행 기록 커밋은 그 뒤에 push한다.

### 개발 판단 (실행 중, 모두 되돌릴 수 있음)

| # | 판단 | 틀렸을 때의 비용 |
|---|---|---|
| R1 | 자동 실행 체크가 켤 때 등록을 기다린다(계획 글보다 START-03을 따름) | 켠 직후 체크 바꾸기가 OS 호출 시간만큼 늦다 |
| R2 | Windows 정밀 터치패드의 휠 방향은 되찾을 수 없다(WebView2에 `webkitDirectionInvertedFromDevice`가 없음). 알려진 한계로 두고 Windows PC 확인에 넣는다 | 방향을 뒤집어 쓰는 Windows 터치패드 사용자는 반대로 움직인다 |
| R3 | 계획 순서대로 크기 조절이 메뉴를 닫고 바로 시작한다(pointer를 즉시 들어야 함, 계획 4 R7). 메뉴로 늘린 창에서 끄는 경우는 최종 리뷰에서 고쳤다 | 없음 (고침) |
| R4 | 크기 조절 뒤 내용 높이를 한 번 더 맞춘다 | 크기 조절마다 IPC 한 번 |
| R5 | 투명도 줄에서 누른 Enter는 메뉴 항목을 고르지 않는다 | 투명도 줄에서 Enter가 아무것도 하지 않는다 |
| R6 | I18N-02 검사가 template literal 구멍을 `{n}`으로 읽는다 | 앞으로 기술용 template 문자열이 잘못 걸릴 수 있다 |
| R7 | 측정 전 "완료" 줄을 "확인 대기"로 두었다가 결과로 고침 | 없음 (문서만) |
| R8 | 브랜치 전체 리뷰와 수정 한 번을 PM 확인 앞에 둔다 | 없음 |
| R9 | 최종 리뷰 수정은 반드시 고칠 것 8개와 권한 2개를 한 번에 보냄 | 수정 diff가 조금 커짐 |
| R10 | 최종 리뷰의 "그대로 둠" minor(IPC 전 lift, 여러 줄 이름 붙여넣기 되돌리기, ⋯ 종료에 Rust 대비 시간 없음, `room()` 보고 없음)는 넘김 | 드문 한 프레임 튐, 되돌리기 없음, 이론상 ⋯ 종료 멈춤 |
| R11 | ⋯ → 초기화 → 취소 길에서 입력칸으로 포커스가 돌아오지 않는 것은 그대로 둠(회귀 아님). PM 확인에서 문제로 나오지 않았다 | 취소 뒤 입력칸을 한 번 눌러야 쓴다 |
| R12 | 헤더·가장자리의 ctrlKey 거르기가 OS를 가리지 않는다 | Windows에서 Ctrl+끌기가 되지 않는다. Windows PC에서 확인 |
| R13 | IME Esc는 입력기 편집(`insertReplacementText`·`insertCompositionText`) 뒤 첫 keydown이 Esc면 거른다 | 맞춤법 자동 바꾸기 같은 다른 편집 뒤에도 Esc 한 번이 먹힌다(다시 누르면 된다) |
| R14 | 확인 판 키는 창 전체에서 받고, 포커스 테두리를 늘 그린다 | 겉모양만 (PM이 괜찮다고 함) |

### 계획 6으로 넘기는 일

- 이 계획의 "넣지 않는 것" 표 그대로:
  - 업데이트 서명 실제 키, endpoint 저장소 이름, `updater:default`를 `allow-check`와 `allow-download-and-install`로 좁히기, 설치 중 확인이 업데이트 정보를 바꾸지 않게 하기(출시 전 필수), 네트워크 crate 목록 넓히기(hyper-util, minreq, tungstenite)
  - `probe.rs`(`TODOWIDGET_PROBE`) 정리, 쓰지 않는 crate-type 정리
  - PERF-06(로그인 직후 자동 실행). 시험 폴더로는 잴 수 없다
  - UPD-04 실제 설치, UPD-09. 출시된 이전 버전이 있어야 한다
- Windows PC 확인 (Windows PC가 생기면):
  - WIN-02·07·08·09, 혼합 배율 첫 크기(계획 4 R12), Run 값이 문자열이 아닐 때
  - WebView2에서 ⋯ 버튼이 포커스를 가져가, 메뉴를 닫은 뒤 입력이 입력칸에 가지 않을 수 있다(`mousedown` `preventDefault` 후보)
  - Ctrl+끌기(R12), 정밀 터치패드 휠 방향(R2)
  - Windows 한글·병음 IME(INPUT-05, 계획 2 보고서). Esc 거르기는 macOS WKWebView에서만 확인했다
- 확인 중 새로 나온 것:
  - 위로 연 메뉴의 한 프레임 깜빡임(D11, 알려진 한계). 메뉴를 별도 popup 창으로 띄우는 방법은 계획 6 이후 후보다
  - 메뉴 막대 아이콘 모양과 밝게/어둡게 보기(확인 20에서 건너뜀). 출시 전 REL 체크리스트에서 다시 본다
  - ⋯ → 종료에 Rust 대비 시간이 없다(R10). 출시 전에 다시 본다
  - I18N-07 체크리스트에 "영어로 남은 문구가 없는지" 줄을 더할지 본다
