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
    approved.first().is_some_and(|flag| flag & 1 == 1)
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
        Ok(self.item.status() == LoginItemStatus::Enabled)
    }

    fn enable(&self) -> Result<(), String> {
        self.item.register()?;
        match self.item.status() {
            LoginItemStatus::Enabled => Ok(()),
            LoginItemStatus::RequiresApproval => Err("시스템 설정 → 일반 → 로그인 항목에서 허용해야 해요".to_string()),
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
        assert!(windows(FakeRunKey::with(Some("\"a.exe\""), Some(&ENABLED)))
            .is_enabled()
            .unwrap());
        assert!(!windows(FakeRunKey::with(Some("\"a.exe\""), Some(&DISABLED)))
            .is_enabled()
            .unwrap());
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
        let v14 = windows(FakeRunKey::with(
            Some(r#""C:\Program Files\TodoWidget\TodoWidget.exe""#),
            None,
        ));
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
        let auto_start = windows(FakeRunKey {
            fail: true,
            ..FakeRunKey::default()
        });
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
            Self {
                status: Mutex::new(status),
                after_register: LoginItemStatus::Enabled,
                calls: Mutex::default(),
                fail: false,
            }
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
        for (status, expected) in [
            (Enabled, true),
            (RequiresApproval, false),
            (NotRegistered, false),
            (NotFound, false),
        ] {
            assert_eq!(
                LoginItemAutoStart::new(FakeLoginItem::new(status))
                    .is_enabled()
                    .unwrap(),
                expected,
                "{status:?}"
            );
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
        assert_eq!(
            LoginItemAutoStart::new(refused).enable(),
            Err("Operation not permitted".to_string())
        );
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
        for status in [
            LoginItemStatus::NotRegistered,
            LoginItemStatus::RequiresApproval,
            LoginItemStatus::NotFound,
        ] {
            let auto_start = LoginItemAutoStart::new(FakeLoginItem::new(status));
            auto_start.refresh().unwrap();
            assert!(auto_start.item.calls().is_empty(), "{status:?}");
        }
    }
}
