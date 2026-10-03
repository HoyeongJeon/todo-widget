# 출시

**변경 이력**
- 2026-10-03: 처음 작성 (v2.0 기준)

빌드, 배포, 서명 키, 버전 규칙, 출시 순서를 적는다. 사용자가 받는 업데이트 동작은 `behavior/update.md`에 있다.

## 출시 절차

```text
코드를 올린다 ──▶ 자동 검사, Windows·macOS (REL-01)

버전 태그 v2.1.0을 올린다
   │
   ▼
strict 검사 (REL-02)
   │
   ▼
Release 초안: Windows NSIS(x64), macOS dmg(universal), latest.json, 업데이트 서명 파일 (REL-03)
   │
   ▼
직접 확인 체크리스트: Windows는 PM, macOS는 개발 (IME 항목은 PM) (REL-04)
   │
   ▼
PM 승인 ──▶ 공개 ──▶ 사용자 위젯이 새 버전을 알아챈다 (UPD-01)
```

## 요구사항

### REL-01 코드를 올릴 때마다 두 OS에서 자동 검사한다
- 동작: 코드를 GitHub에 올리거나 pull request를 연다
- 결과: GitHub Actions가 Windows와 macOS에서 각각 lint(의존 방향 규칙 포함), Vitest, `cargo test`, `pnpm spec:check`, 빌드를 돌린다. 다국어 사전 키 검사(I18N-03)는 Vitest 안에서 돈다. 하나라도 실패하면 검사 전체가 실패로 표시된다
- 확인: 자동 테스트

### REL-02 출시 전에는 strict 검사가 통과해야 한다
- 동작: 버전 태그를 올린다
- 결과: 출시 빌드는 먼저 `pnpm spec:check:strict`를 돌린다. 테스트가 없는 자동 테스트 항목이 하나라도 있으면 실패하고 Release 초안을 만들지 않는다
- 확인: 자동 테스트

### REL-03 버전 태그를 올리면 출시 후보가 초안으로 만들어진다
- 동작: `v2.1.0`처럼 `v`로 시작하는 태그를 올린다
- 결과: GitHub Actions가 Windows NSIS 설치 파일(x64), macOS dmg(universal, Apple Silicon·Intel 겸용), `latest.json`, 업데이트 파일의 서명 파일을 만들어 GitHub Release 초안에 올린다. 초안은 공개되지 않으므로 사용자 위젯의 업데이트 확인(UPD-02)에는 아직 잡히지 않는다
- 확인: 자동 테스트

### REL-04 체크리스트를 마치고 PM이 승인해야 공개한다
- 조건: Release 초안이 만들어졌다
- 결과: 초안의 설치 파일로 `spec/checklists/windows.md`와 `spec/checklists/macos.md`를 모두 마친다. Windows 체크리스트는 PM이 한다. 개발은 Mac에서 하므로 Windows 창을 직접 띄울 수 없기 때문이다. macOS 체크리스트는 개발이 하고, IME 항목(INPUT-06)은 PM이 한다. 체크리스트 맨 아래에 확인한 사람, 날짜, 빌드 버전을 적는다. PM이 승인하면 초안을 공개한다. 체크리스트는 10분 안에 끝나는 분량으로 유지한다
- 확인: 직접 확인

### REL-05 버전은 v2.0.0부터 SemVer를 따른다
- 결과: 새 앱은 2.0.0에서 시작한다. 버그 수정은 패치(2.0.1), 기능 추가는 마이너(2.1.0)를 올린다. 앱에 들어가는 버전(`package.json`, Tauri 설정, `Cargo.toml`)이 모두 같고 태그(`v2.1.0`)와도 같다. 하나라도 다르면 출시 빌드가 실패한다. 업데이트는 앞으로만 간다. 문제가 생기면 이전 버전으로 되돌리지 않고 고친 버전을 바로 낸다
- 확인: 자동 테스트

### REL-06 업데이트 서명 키는 잃어버리지 않게 보관한다
- 결과: 업데이트 서명 키는 개발이 한 번 만든다. 개인 키와 비밀번호는 GitHub Secrets(`TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`)에 넣고, 백업 사본은 PM이 비밀번호 관리자에 보관한다. 개인 키는 저장소에 올리지 않는다. 공개 키는 앱 설정에 들어가 업데이트 서명 검사(UPD-08)에 쓰인다. 키를 잃으면 이미 설치한 위젯이 다음 업데이트를 받지 못해 모두가 한 번 더 직접 설치해야 한다
- 확인: 직접 확인

### REL-07 릴리스 안내에 설치와 교체 방법을 적는다
- 결과: 모든 릴리스 안내와 README에 OS별 첫 실행 경고를 넘기는 법을 적는다. Windows는 SmartScreen에서 "추가 정보" → "실행"(WIN-05), macOS는 시스템 설정 → 개인정보 보호 및 보안 → "그래도 열기"(MAC-11)다. v2.0.0 안내에는 Windows용으로 "기존 위젯을 먼저 종료하세요"와 v1.4로 되돌리는 법(`behavior/storage.md`의 "참고: v1.4로 되돌리기")도 적는다
- 확인: 직접 확인

### REL-08 v2.0 출시 전에 저장소 이름을 `todo-widget`으로 바꾼다
- 결과: v2.0.0을 빌드하기 전에 GitHub 저장소 이름을 `windows-todo-widget`에서 `todo-widget`으로 바꾼다. 바꾸기 직전에 PM 확인을 받는다. 업데이트 주소가 앱에 들어가므로, v2.0.0의 업데이트 주소는 처음부터 새 이름의 `latest.json`을 가리킨다
- 확인: 직접 확인

### REL-09 macOS 빌드는 ad-hoc 서명을 한다
- 결과: macOS 빌드는 ad-hoc 서명만 한다(Tauri 설정의 서명 ID `-`). 실행에 필요한 최소한이다. Apple 유료 인증서와 공증(notarization)은 쓰지 않는다. 그래서 첫 실행 때 MAC-11의 경고가 뜬다
- 확인: 자동 테스트

## v2.0 출시 순서

v2.0.0 한 번만 하는 일이다.

1. 저장소 이름을 `todo-widget`으로 바꾼다(REL-08).
2. 새 이름의 업데이트 주소로 v2.0.0을 빌드한다(REL-03).
3. README를 Windows·macOS 설치 안내로 새로 쓴다(REL-07).
4. 체크리스트를 마치고 PM 승인 뒤 공개한다(REL-04). 지인들에게 새 링크를 보낸다.

v1.4에는 업데이트 기능이 없으므로 v2.0.0은 모두가 한 번 직접 설치한다. 그다음 버전부터 위젯 안에서 업데이트한다.
