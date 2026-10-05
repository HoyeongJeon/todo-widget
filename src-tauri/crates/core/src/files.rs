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
    match env_value {
        Some(value) if !value.is_empty() => Some(PathBuf::from(value)),
        _ => os_data_dir.map(|dir| dir.join(APP_FOLDER)),
    }
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
    /// 그 밖의 디스크 오류(권한, 잠금, 디스크 가득 참 등). 문구는 `message`만이다.
    /// 경로는 TypeScript가 `displayPath`로 따로 보여 주므로(STORE-10) 겹치지 않게 넣지 않는다. `path`는 디버깅과 테스트용이다.
    Io { path: String, message: String },
}

impl fmt::Display for FileError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            FileError::InvalidName(name) => write!(f, "쓸 수 없는 파일 이름이에요: {name}"),
            FileError::AlreadyExists(path) => write!(f, "이미 있는 파일이에요: {path}"),
            FileError::Io { message, .. } => f.write_str(message),
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

    fn path(&self, name: &str) -> Result<PathBuf, FileError> {
        let plain = !name.is_empty() && name != "." && name != ".." && !name.contains(['/', '\\', ':']);
        if plain {
            Ok(self.root.join(name))
        } else {
            Err(FileError::InvalidName(name.to_string()))
        }
    }

    fn io_error(path: &Path, error: io::Error) -> FileError {
        FileError::Io {
            path: path.display().to_string(),
            message: error.to_string(),
        }
    }

    /// 없으면 `None`. UTF-8이 아닌 바이트는 바꿔 읽는다. 그런 파일은 TypeScript가 깨진 파일(STORE-08)로 본다.
    pub fn read(&self, name: &str) -> Result<Option<String>, FileError> {
        let path = self.path(name)?;
        match fs::read(&path) {
            Ok(bytes) => Ok(Some(String::from_utf8_lossy(&bytes).into_owned())),
            Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(None),
            Err(error) => Err(Self::io_error(&path, error)),
        }
    }

    /// 임시 파일에 쓰고 디스크에 내린 뒤 원본과 바꾼다. 중간에 실패해도 원본은 그대로다 (STORE-02). 폴더가 없으면 만든다.
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

    /// 있는지 확인하지 못하면 오류.
    pub fn exists(&self, name: &str) -> Result<bool, FileError> {
        let path = self.path(name)?;
        path.try_exists().map_err(|e| Self::io_error(&path, e))
    }

    /// `to`가 이미 있으면 덮어쓰지 않고 실패한다 (STORE-08 백업 이름).
    pub fn rename_new(&self, from: &str, to: &str) -> Result<(), FileError> {
        let source = self.path(from)?;
        let target = self.path(to)?;
        if target.try_exists().map_err(|e| Self::io_error(&target, e))? {
            return Err(FileError::AlreadyExists(target.display().to_string()));
        }
        fs::rename(&source, &target).map_err(|e| Self::io_error(&source, e))
    }

    /// `to`가 이미 있으면 덮어쓰지 않고 실패한다 (STORE-12 v1 백업).
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
        let mut names: Vec<String> = fs::read_dir(data.root())
            .unwrap()
            .map(|e| e.unwrap().file_name().to_string_lossy().into_owned())
            .collect();
        names.sort();
        names
    }

    /// STORE-02 폴더가 없으면 만들고, 쓴 뒤에는 임시 파일이 남지 않는다
    #[test]
    fn write_atomic_creates_folder_and_leaves_no_temp_file() {
        let (_temp, data) = dir();
        data.write_atomic("tasks.json", "{\"version\":2}").unwrap();
        data.write_atomic("tasks.json", "{\"version\":2,\"tasks\":[]}").unwrap();
        assert_eq!(
            data.read("tasks.json").unwrap().as_deref(),
            Some("{\"version\":2,\"tasks\":[]}")
        );
        assert_eq!(names(&data), vec!["tasks.json"]);
    }

    /// STORE-02 쓰다가 실패해도 원본은 그대로다
    #[test]
    fn write_atomic_keeps_original_on_failure() {
        let (_temp, data) = dir();
        data.write_atomic("tasks.json", "원본").unwrap();
        // 임시 파일 자리에 폴더를 두어 임시 파일 쓰기가 실패하게 한다.
        fs::create_dir(data.root().join(".tasks.json.tmp")).unwrap();
        assert!(matches!(
            data.write_atomic("tasks.json", "새 내용"),
            Err(FileError::Io { .. })
        ));
        assert_eq!(data.read("tasks.json").unwrap().as_deref(), Some("원본"));
    }

    /// STORE-02 한글은 그대로 UTF-8로 쓴다
    #[test]
    fn write_atomic_writes_utf8() {
        let (_temp, data) = dir();
        data.write_atomic("tasks.json", "보고서 초안").unwrap();
        assert_eq!(
            fs::read(data.root().join("tasks.json")).unwrap(),
            "보고서 초안".as_bytes()
        );
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

    /// STORE-10 디스크 오류 문구는 OS 오류 내용만이다. 경로는 대화 상자가 따로 한 번 보여 준다
    #[test]
    fn io_error_text_is_os_message_only() {
        let (_temp, data) = dir();
        fs::create_dir_all(data.root().join("tasks.json")).unwrap();
        let error = data.read("tasks.json").unwrap_err();
        let FileError::Io { path, message } = &error else {
            panic!("디스크 오류여야 해요: {error:?}");
        };
        assert!(path.ends_with("tasks.json"));
        assert_eq!(error.to_string(), *message);
        assert!(!error.to_string().contains(path.as_str()));
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
        data.write_atomic("tasks.broken-20261003-090000.json", "먼저 있던 백업")
            .unwrap();
        assert!(matches!(
            data.rename_new("tasks.json", "tasks.broken-20261003-090000.json"),
            Err(FileError::AlreadyExists(_))
        ));
        assert_eq!(data.read("tasks.json").unwrap().as_deref(), Some("깨짐"));
        data.rename_new("tasks.json", "tasks.broken-20261003-090000-2.json")
            .unwrap();
        assert_eq!(data.read("tasks.json").unwrap(), None);
        assert_eq!(
            data.read("tasks.broken-20261003-090000-2.json").unwrap().as_deref(),
            Some("깨짐")
        );
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
        data.write_atomic("tasks.v1-backup-20261003-090000.json", "먼저")
            .unwrap();
        assert!(matches!(
            data.copy_new("tasks.json", "tasks.v1-backup-20261003-090000.json"),
            Err(FileError::AlreadyExists(_))
        ));
        assert_eq!(
            data.read("tasks.v1-backup-20261003-090000.json").unwrap().as_deref(),
            Some("먼저")
        );
        data.copy_new("tasks.json", "tasks.v1-backup-20261003-090000-2.json")
            .unwrap();
        assert_eq!(
            data.read("tasks.v1-backup-20261003-090000-2.json").unwrap().as_deref(),
            Some("[]")
        );
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
            assert!(
                matches!(data.write_atomic(name, "x"), Err(FileError::InvalidName(_))),
                "{name}"
            );
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
        assert_eq!(
            resolve_data_dir(Some(OsString::new()), Some(base.clone())),
            Some(base.join("TodoWidget"))
        );
        assert_eq!(
            resolve_data_dir(None, Some(base.clone())),
            Some(base.join("TodoWidget"))
        );
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
