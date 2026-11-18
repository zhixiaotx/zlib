// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use reqwest::header::{HeaderMap, HeaderName, HeaderValue, CONTENT_TYPE, SET_COOKIE};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Duration;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MirrorHttpResponse {
  status: u16,
  ok: bool,
  final_url: String,
  content_type: String,
  body: String,
  set_cookies: Vec<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MirrorDownloadResult {
  ok: bool,
  is_html: bool,
  status: u16,
  final_url: String,
  content_type: String,
  saved_path: String,
  body_preview: String,
}

fn build_header_map(headers: &HashMap<String, String>) -> HeaderMap {
  let mut map = HeaderMap::new();
  map.insert(
    HeaderName::from_static("user-agent"),
    HeaderValue::from_static("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"),
  );
  for (k, v) in headers {
    if let (Ok(name), Ok(val)) = (
      HeaderName::from_bytes(k.as_bytes()),
      HeaderValue::from_str(v),
    ) {
      map.insert(name, val);
    }
  }
  map
}

#[tauri::command]
async fn mirror_http_request(
  url: String,
  method: String,
  headers: HashMap<String, String>,
  body: Option<String>,
) -> Result<MirrorHttpResponse, String> {
  let client = reqwest::Client::builder()
    .timeout(Duration::from_secs(20))
    .build()
    .map_err(|e| e.to_string())?;

  let req_method = reqwest::Method::from_bytes(method.to_uppercase().as_bytes())
    .unwrap_or(reqwest::Method::GET);

  let mut req = client
    .request(req_method, &url)
    .headers(build_header_map(&headers));

  if let Some(b) = body {
    if !b.is_empty() {
      req = req.body(b);
    }
  }

  let resp = req.send().await.map_err(|e| e.to_string())?;
  let status = resp.status().as_u16();
  let ok = resp.status().is_success();
  let final_url = resp.url().to_string();
  let content_type = resp
    .headers()
    .get(CONTENT_TYPE)
    .and_then(|v| v.to_str().ok())
    .unwrap_or("")
    .to_string();
  let set_cookies = resp
    .headers()
    .get_all(SET_COOKIE)
    .iter()
    .filter_map(|v| v.to_str().ok().map(|s| s.to_string()))
    .collect();
  let text = resp.text().await.map_err(|e| e.to_string())?;

  Ok(MirrorHttpResponse {
    status,
    ok,
    final_url,
    content_type,
    body: text,
    set_cookies,
  })
}

#[tauri::command]
async fn mirror_download_file(
  url: String,
  headers: HashMap<String, String>,
  filename: String,
) -> Result<MirrorDownloadResult, String> {
  let client = reqwest::Client::builder()
    .timeout(Duration::from_secs(60))
    .build()
    .map_err(|e| e.to_string())?;

  let resp = client
    .get(&url)
    .headers(build_header_map(&headers))
    .send()
    .await
    .map_err(|e| e.to_string())?;

  let status = resp.status().as_u16();
  let final_url = resp.url().to_string();
  let content_type = resp
    .headers()
    .get(CONTENT_TYPE)
    .and_then(|v| v.to_str().ok())
    .unwrap_or("")
    .to_string();

  if !resp.status().is_success() || content_type.contains("text/html") {
    let body_text = resp.text().await.unwrap_or_default();
    let preview: String = body_text.chars().take(400).collect();
    return Ok(MirrorDownloadResult {
      ok: false,
      is_html: true,
      status,
      final_url,
      content_type,
      saved_path: String::new(),
      body_preview: preview,
    });
  }

  let bytes = resp.bytes().await.map_err(|e| e.to_string())?;
  let safe_name: String = filename
    .chars()
    .map(|c| match c {
      '\\' | '/' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
      _ => c,
    })
    .collect();
  let target_dir = tauri::api::path::download_dir()
    .unwrap_or_else(std::env::temp_dir)
    .join("ZLibraryDownloads");
  std::fs::create_dir_all(&target_dir).map_err(|e| e.to_string())?;
  let dest_path = target_dir.join(if safe_name.is_empty() {
    "zlib-book.bin".to_string()
  } else {
    safe_name
  });

  std::fs::write(&dest_path, &bytes).map_err(|e| e.to_string())?;

  Ok(MirrorDownloadResult {
    ok: true,
    is_html: false,
    status,
    final_url,
    content_type,
    saved_path: dest_path.to_string_lossy().to_string(),
    body_preview: String::new(),
  })
}

fn spawn_open_target(target: &str) -> Result<(), String> {
  #[cfg(target_os = "windows")]
  {
    std::process::Command::new("cmd")
      .args(["/C", "start", "", target])
      .spawn()
      .map_err(|e| e.to_string())?;
    return Ok(());
  }
  #[cfg(target_os = "macos")]
  {
    std::process::Command::new("open")
      .arg(target)
      .spawn()
      .map_err(|e| e.to_string())?;
    return Ok(());
  }
  #[cfg(target_os = "linux")]
  {
    std::process::Command::new("xdg-open")
      .arg(target)
      .spawn()
      .map_err(|e| e.to_string())?;
    return Ok(());
  }
}

#[tauri::command]
fn open_download_folder() -> Result<String, String> {
  let target_dir = tauri::api::path::download_dir()
    .unwrap_or_else(std::env::temp_dir)
    .join("ZLibraryDownloads");
  std::fs::create_dir_all(&target_dir).map_err(|e| e.to_string())?;
  let path_str = target_dir.to_string_lossy().to_string();

  #[cfg(target_os = "windows")]
  {
    std::process::Command::new("explorer")
      .arg(&path_str)
      .spawn()
      .map_err(|e| e.to_string())?;
    return Ok(path_str);
  }
  #[cfg(not(target_os = "windows"))]
  {
    spawn_open_target(&path_str)?;
    return Ok(path_str);
  }
}

#[tauri::command]
fn open_local_book(path: Option<String>, fallback_url: Option<String>) -> Result<String, String> {
  if let Some(p) = path {
    let trimmed = p.trim().to_string();
    if !trimmed.is_empty() && std::path::Path::new(&trimmed).exists() {
      spawn_open_target(&trimmed)?;
      return Ok(trimmed);
    }
  }
  if let Some(url) = fallback_url {
    let trimmed = url.trim().to_string();
    if !trimmed.is_empty() {
      spawn_open_target(&trimmed)?;
      return Ok(trimmed);
    }
  }
  Err("未在本地磁盘找到该书籍文件，请先重新导出下载或手动导入本地文件".to_string())
}

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      mirror_http_request,
      mirror_download_file,
      open_download_folder,
      open_local_book
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

