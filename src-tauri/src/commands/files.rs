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
    DataDirInfo {
        path: dir.root().display().to_string(),
        separator: std::path::MAIN_SEPARATOR.to_string(),
    }
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
