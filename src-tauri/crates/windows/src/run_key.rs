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
        CURRENT_USER
            .create(RUN)
            .and_then(|key| key.set_string(&self.name, value))
            .map_err(message)
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

        CURRENT_USER
            .create(APPROVED)
            .unwrap()
            .set_bytes(&value.0, Type::Bytes, &[3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
            .unwrap();
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
