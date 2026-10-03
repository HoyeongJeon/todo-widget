# spec 폴더 안내

**변경 이력**
- 2026-10-03: 처음 작성 (v2.0 기준)
- 2026-10-03: 파일 목록에서 가벼움 기준에 prefix(PERF)를 함께 적었다

## 이 폴더가 기준이다

`spec/`은 v2.0이 지금 실제로 어떻게 동작해야 하는지를 정하는 **기준 문서**다. 코드와 이 폴더의 내용이 다르면 코드가 틀린 것이다.

`docs/superpowers/specs/`는 설계 시점의 기록으로 남겨 둔다. 바뀐 결정은 설계 문서가 아니라 여기 반영한다.

## 파일 목록

| 파일 | 다루는 것 | prefix |
|---|---|---|
| `spec/00-principles.md` | 제품 원칙, 개발 원칙, 가벼움 기준(PERF), 범위 밖 목록, 다음 버전 후보 | `PRIV`, `PERF` |
| `spec/behavior/tasks.md` | 할 일, 상태 3가지와 규칙, 남은 개수 | `TASK` |
| `spec/behavior/list.md` | 섹션, 정렬, 접기, 빈 화면 | `LIST` |
| `spec/behavior/input.md` | 추가, 여러 줄 붙여넣기, 이름 바꾸기, 삭제, 초기화 | `INPUT` |
| `spec/behavior/window.md` | 크기 조절, 이동, 맨 위 고정, 투명도, 위치 복원 | `WND` |
| `spec/behavior/startup.md` | 시작, 자동 실행, 두 번 실행, 종료 | `START` |
| `spec/behavior/storage.md` | 저장 형식, 안전한 저장, 깨진 파일과 저장 실패 | `STORE` |
| `spec/behavior/i18n.md` | 언어 선택 규칙, 문구 목록 | `I18N` |
| `spec/behavior/update.md` | 업데이트 확인, 안내, 적용 | `UPD` |
| `spec/platform/windows.md` | 공통 행동을 Windows에서 어떻게 구현하는지 (adapter) | `WIN` |
| `spec/platform/macos.md` | 공통 행동을 macOS에서 어떻게 구현하는지 (adapter) | `MAC` |
| `spec/release.md` | 빌드, 배포, 서명 키, 버전 규칙, 출시 순서 | `REL` |
| `spec/checklists/windows.md`, `spec/checklists/macos.md` | OS별 직접 확인 체크리스트. 위 파일들의 "직접 확인" 항목을 같은 ID로 올린다 | (prefix 없음) |

## 요구사항 형식

요구사항 하나는 이렇게 쓴다. `조건`과 `동작`은 필요할 때만 쓰고, `결과`와 `확인`은 반드시 쓴다.

    ### TASK-09 이미 끝낸 일을 다시 끝낸 일로 지정하면 아무것도 바뀌지 않는다
    - 조건: 상태 `done`, 끝낸 시각 `2026-10-03T09:00:00+09:00`
    - 동작: 상태를 `done`으로 지정한다
    - 결과: 끝낸 시각은 그대로 `2026-10-03T09:00:00+09:00`이고, 저장도 화면 갱신도 일어나지 않는다
    - 확인: 자동 테스트

`확인` 값은 둘 중 하나다.
- **자동 테스트**: 테스트 코드로 확인한다. 테스트가 이 ID를 가리켜야 한다.
- **직접 확인**: 사람이 실제 기기에서 눈으로 보고 확인한다. `spec/checklists/`에 같은 ID로 올려야 한다.

## 테스트에서 ID를 쓰는 법

- TypeScript: 테스트 이름 앞에 ID를 적는다. 예: `it('TASK-09 이미 끝낸 일을 다시 끝낸 일로 지정하면 아무것도 바뀌지 않는다', ...)`.
- Rust: 테스트 함수 위 주석에 ID를 적는다. 예:
  ```rust
  /// STORE-02 저장은 원본을 깨뜨리지 않는다
  #[test]
  fn keeps_original_file_on_write_failure() { /* ... */ }
  ```

## 바꾸는 순서

동작을 바꾸려면 이 순서로 간다: spec 수정 → PM 승인 → 실패하는 테스트 → 구현 → 리팩터링.

문서마다 맨 위에 변경 이력을 두고, 바꿀 때마다 날짜와 내용을 한 줄 추가한다.

## ID 규칙

한 번 쓴 ID는 지우거나 다른 뜻으로 다시 쓰지 않는다. 요구사항을 없앨 때는 제목을 `(폐기)`로 바꾸고 남겨 둔다.

## 검사 명령

- `pnpm spec:check`: 요구사항 형식, 없는 ID 참조, 체크리스트 누락을 검사한다.
- `pnpm spec:check:strict`: 위 검사에 더해 테스트가 없는 자동 테스트 항목도 실패로 본다. 출시 전에는 strict가 통과해야 한다.
