use serde::Serialize;
use serde_json::{json, Value};
use std::{
    collections::hash_map::DefaultHasher,
    fs,
    hash::{Hash, Hasher},
    path::{Path, PathBuf},
    process::Command,
    thread,
    time::{Duration, UNIX_EPOCH},
};
#[cfg(desktop)]
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager, RunEvent, WebviewUrl, WebviewWindowBuilder, WindowEvent};

const PANEL_WINDOWS: [&str; 3] = ["appearance", "companions", "settings"];

#[derive(Debug, Serialize)]
struct HermesApiResponse {
    status: u16,
    body: String,
}

#[derive(Debug, Serialize)]
struct HermesCliResponse {
    status: i32,
    stdout: String,
    stderr: String,
}

#[tauri::command]
async fn hermes_api_request(
    method: String,
    url: String,
    body: Option<Value>,
    headers: Option<std::collections::HashMap<String, String>>,
) -> Result<HermesApiResponse, String> {
    let client = reqwest::Client::new();
    let method = method.trim().to_uppercase();
    let builder = match method.as_str() {
        "GET" => client.get(&url),
        "POST" => with_optional_json(client.post(&url), body),
        "PUT" => with_optional_json(client.put(&url), body),
        "PATCH" => with_optional_json(client.patch(&url), body),
        "DELETE" => with_optional_json(client.delete(&url), body),
        _ => return Err(format!("Unsupported Hermes API method: {method}")),
    };

    let builder = match headers {
        Some(headers) => headers.into_iter().fold(builder, |request, (name, value)| {
            request.header(name, value)
        }),
        None => builder,
    };

    let response = builder
        .send()
        .await
        .map_err(|error| format!("Hermes API request failed: {error}"))?;
    let status = response.status().as_u16();
    let body = response
        .text()
        .await
        .map_err(|error| format!("Hermes API response read failed: {error}"))?;

    Ok(HermesApiResponse { status, body })
}

#[tauri::command]
async fn hermes_profile_list() -> Result<HermesCliResponse, String> {
    let output = Command::new("hermes")
        .args(["profile", "list"])
        .output()
        .map_err(|error| format!("Failed to run hermes profile list: {error}"))?;

    Ok(HermesCliResponse {
        status: output.status.code().unwrap_or(-1),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
    })
}

#[tauri::command]
async fn hermes_profile_route_status() -> Result<HermesCliResponse, String> {
    let output = Command::new("hermes")
        .args(["-p", "default", "--help"])
        .output()
        .map_err(|error| format!("Failed to run hermes profile route probe: {error}"))?;

    Ok(HermesCliResponse {
        status: output.status.code().unwrap_or(-1),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
    })
}

#[tauri::command]
async fn hermes_profile_run(
    profile: String,
    input: String,
    instructions: Option<String>,
) -> Result<HermesCliResponse, String> {
    let prompt = match instructions {
        Some(instructions) if !instructions.trim().is_empty() => {
            format!("{}\n\n{}", instructions.trim(), input)
        }
        _ => input,
    };
    let output = Command::new("hermes")
        .args(["-p", profile.trim(), "-z", prompt.as_str()])
        .output()
        .map_err(|error| format!("Failed to run hermes selected profile task: {error}"))?;

    Ok(HermesCliResponse {
        status: output.status.code().unwrap_or(-1),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
    })
}

#[tauri::command]
async fn hermes_profile_details(profile_id: String, profile_name: String) -> Result<Value, String> {
    let hermes_home = std::env::var("HERMES_HOME")
        .map(PathBuf::from)
        .unwrap_or_else(|_| {
            let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
            PathBuf::from(home).join(".hermes")
        });
    let profile_home = resolve_profile_home(&hermes_home, &profile_id, &profile_name);
    Ok(profile_details_payload(
        &profile_home,
        &profile_id,
        &profile_name,
    ))
}

fn resolve_profile_home(hermes_home: &Path, profile_id: &str, profile_name: &str) -> PathBuf {
    let key = if profile_name.trim().is_empty() {
        profile_id.trim()
    } else {
        profile_name.trim()
    };
    if key == "default" || profile_id.trim() == "default" {
        return hermes_home.to_path_buf();
    }
    hermes_home.join("profiles").join(key)
}

fn profile_details_payload(profile_home: &Path, profile_id: &str, profile_name: &str) -> Value {
    const MAX_TEXT_BYTES: usize = 4096;
    let soul_path = profile_home.join("SOUL.md");
    let (soul_text, soul_truncated) = read_text_bounded(&soul_path, MAX_TEXT_BYTES);
    json!({
        "ok": true,
        "profile_id": profile_id,
        "profile_name": profile_name,
        "source": if profile_home.exists() { "local-state" } else { "unavailable" },
        "path": profile_home.to_string_lossy(),
        "loaded_at": now_millis_string(),
        "soul_md": {
            "source": if soul_path.is_file() { "local-state" } else { "unavailable" },
            "path": soul_path.to_string_lossy(),
            "text": soul_text,
            "truncated": soul_truncated,
            "unavailable_reason": if soul_path.is_file() { Value::Null } else { json!("SOUL.md not found for this profile.") },
        },
        "skills": directory_items_section(&profile_home.join("skills"), 50, "Profile skills directory not found."),
        "sessions": sessions_section(&profile_home.join("sessions")),
    })
}

fn read_text_bounded(path: &Path, max_bytes: usize) -> (String, bool) {
    let Ok(bytes) = fs::read(path) else {
        return (String::new(), false);
    };
    let truncated = bytes.len() > max_bytes;
    let bounded = &bytes[..bytes.len().min(max_bytes)];
    (String::from_utf8_lossy(bounded).to_string(), truncated)
}

fn directory_items_section(path: &Path, limit: usize, unavailable_reason: &str) -> Value {
    let Ok(entries) = fs::read_dir(path) else {
        return json!({
            "source": "unavailable",
            "path": path.to_string_lossy(),
            "items": [],
            "unavailable_reason": unavailable_reason,
        });
    };
    let mut items = entries
        .filter_map(Result::ok)
        .filter(|entry| entry.path().is_file() || entry.path().is_dir())
        .map(|entry| {
            let path = entry.path();
            let name = if path.is_file() {
                path.file_stem()
            } else {
                path.file_name()
            }
            .and_then(|value| value.to_str())
            .unwrap_or("skill")
            .to_string();
            json!({
                "id": slug_from_name(&name),
                "name": name,
                "source": "local-state",
                "path": path.to_string_lossy(),
            })
        })
        .collect::<Vec<_>>();
    items.sort_by_key(|item| item["name"].as_str().unwrap_or("").to_string());
    items.truncate(limit);
    json!({ "source": "local-state", "path": path.to_string_lossy(), "items": items })
}

fn sessions_section(path: &Path) -> Value {
    let Ok(entries) = fs::read_dir(path) else {
        return json!({
            "source": "unavailable",
            "path": path.to_string_lossy(),
            "items": [],
            "unavailable_reason": "Profile sessions directory not found.",
        });
    };
    let mut entries = entries
        .filter_map(Result::ok)
        .filter(|entry| entry.path().is_file())
        .collect::<Vec<_>>();
    entries.sort_by_key(|entry| {
        entry
            .metadata()
            .and_then(|metadata| metadata.modified())
            .ok()
            .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
            .map(|duration| std::cmp::Reverse(duration.as_secs()))
    });
    let items = entries
        .into_iter()
        .take(25)
        .map(|entry| {
            let path = entry.path();
            let id = path.file_stem().and_then(|value| value.to_str()).unwrap_or("session").to_string();
            let metadata = session_metadata(&path);
            json!({
                "id": id,
                "title": metadata.get("title").and_then(Value::as_str).unwrap_or_else(|| path.file_stem().and_then(|value| value.to_str()).unwrap_or("session")),
                "source": "local-state",
                "path": path.to_string_lossy(),
                "updated_at": modified_millis_string(&path),
                "message_count": metadata.get("message_count").cloned().unwrap_or(Value::Null),
            })
        })
        .collect::<Vec<_>>();
    json!({ "source": "local-state", "path": path.to_string_lossy(), "items": items })
}

fn session_metadata(path: &Path) -> Value {
    if path.extension().and_then(|value| value.to_str()) != Some("json") {
        return json!({});
    }
    let (text, _) = read_text_bounded(path, 4096);
    let Ok(payload) = serde_json::from_str::<Value>(&text) else {
        return json!({});
    };
    let title = payload
        .get("title")
        .and_then(Value::as_str)
        .or_else(|| payload.get("name").and_then(Value::as_str));
    let message_count = payload
        .get("messages")
        .and_then(Value::as_array)
        .map(|messages| messages.len());
    json!({
        "title": title,
        "message_count": message_count,
    })
}

fn modified_millis_string(path: &Path) -> String {
    path.metadata()
        .and_then(|metadata| metadata.modified())
        .ok()
        .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_millis().to_string())
        .unwrap_or_else(|| "0".to_string())
}

fn now_millis_string() -> String {
    std::time::SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis().to_string())
        .unwrap_or_else(|_| "0".to_string())
}

fn slug_from_name(name: &str) -> String {
    let slug = name
        .trim()
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() || matches!(character, '.' | '_' | '-') {
                character.to_ascii_lowercase()
            } else {
                '-'
            }
        })
        .collect::<String>()
        .trim_matches('-')
        .to_string();
    if slug.is_empty() {
        "item".to_string()
    } else {
        slug
    }
}

fn with_optional_json(
    builder: reqwest::RequestBuilder,
    body: Option<Value>,
) -> reqwest::RequestBuilder {
    match body {
        Some(body) => builder.json(&body),
        None => builder,
    }
}

fn show_hall(app: &AppHandle) -> Result<(), String> {
    let main = app
        .get_webview_window("main")
        .ok_or_else(|| "Main window is unavailable".to_string())?;

    main.show()
        .map_err(|error| format!("Failed to show Hall window: {error}"))?;
    main.unminimize()
        .map_err(|error| format!("Failed to unminimize Hall window: {error}"))?;
    main.set_focus()
        .map_err(|error| format!("Failed to focus Hall window: {error}"))?;

    if let Some(pet) = app.get_webview_window("pet") {
        let _ = pet.hide();
    }

    Ok(())
}

fn show_pet(app: &AppHandle) -> Result<(), String> {
    if let Some(main) = app.get_webview_window("main") {
        let _ = main.hide();
    }

    let pet = app
        .get_webview_window("pet")
        .ok_or_else(|| "Pet window is unavailable".to_string())?;
    pet.show()
        .map_err(|error| format!("Failed to show Pet window: {error}"))?;
    pet.set_focus()
        .map_err(|error| format!("Failed to focus Pet window: {error}"))?;

    Ok(())
}

fn is_panel_window(label: &str) -> bool {
    PANEL_WINDOWS.contains(&label)
}

fn show_panel(app: &AppHandle, panel: &str) -> Result<(), String> {
    if !is_panel_window(panel) {
        return Err(format!("Unsupported Hermes panel window: {panel}"));
    }

    let panel_window = app
        .get_webview_window(panel)
        .ok_or_else(|| format!("{panel} window is unavailable"))?;
    panel_window
        .show()
        .map_err(|error| format!("Failed to show {panel} window: {error}"))?;
    panel_window
        .unminimize()
        .map_err(|error| format!("Failed to unminimize {panel} window: {error}"))?;
    panel_window
        .set_focus()
        .map_err(|error| format!("Failed to focus {panel} window: {error}"))?;

    Ok(())
}

fn hide_panel(app: &AppHandle, panel: &str) -> Result<(), String> {
    if !is_panel_window(panel) {
        return Err(format!("Unsupported Hermes panel window: {panel}"));
    }

    let panel_window = app
        .get_webview_window(panel)
        .ok_or_else(|| format!("{panel} window is unavailable"))?;
    panel_window
        .hide()
        .map_err(|error| format!("Failed to hide {panel} window: {error}"))
}

fn companion_window_label(companion_id: &str) -> String {
    let mut hasher = DefaultHasher::new();
    companion_id.hash(&mut hasher);
    format!("companion-{}-{:x}", slug_from_name(companion_id), hasher.finish())
}

fn percent_encode_query(value: &str) -> String {
    value
        .bytes()
        .map(|byte| {
            if byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'.' | b'_' | b'~') {
                (byte as char).to_string()
            } else {
                format!("%{byte:02X}")
            }
        })
        .collect::<String>()
}

fn is_companion_window(label: &str) -> bool {
    label.starts_with("companion-")
}

fn show_companion(app: &AppHandle, companion_id: &str) -> Result<(), String> {
    let label = companion_window_label(companion_id);
    if let Some(window) = app.get_webview_window(&label) {
        window
            .show()
            .map_err(|error| format!("Failed to show companion window: {error}"))?;
        window
            .unminimize()
            .map_err(|error| format!("Failed to unminimize companion window: {error}"))?;
        window
            .set_focus()
            .map_err(|error| format!("Failed to focus companion window: {error}"))?;
        return Ok(());
    }

    let url = format!("/?mode=pet&companion={}", percent_encode_query(companion_id));
    WebviewWindowBuilder::new(app, label, WebviewUrl::App(url.into()))
        .title(format!("Hermes Companion: {companion_id}"))
        .inner_size(460.0, 420.0)
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .skip_taskbar(true)
        .visible(true)
        .shadow(false)
        .build()
        .map_err(|error| format!("Failed to create companion window: {error}"))?;

    Ok(())
}

fn hide_companion(app: &AppHandle, companion_id: &str) -> Result<(), String> {
    let label = companion_window_label(companion_id);
    let Some(window) = app.get_webview_window(&label) else {
        return Ok(());
    };
    window
        .hide()
        .map_err(|error| format!("Failed to hide companion window: {error}"))
}

#[tauri::command]
async fn show_hall_window(app: AppHandle) -> Result<(), String> {
    show_hall(&app)
}

#[tauri::command]
async fn show_pet_window(app: AppHandle) -> Result<(), String> {
    show_pet(&app)
}

#[tauri::command]
async fn show_panel_window(app: AppHandle, panel: String) -> Result<(), String> {
    show_panel(&app, &panel)
}

#[tauri::command]
async fn hide_panel_window(app: AppHandle, panel: String) -> Result<(), String> {
    hide_panel(&app, &panel)
}

#[tauri::command]
async fn show_companion_window(app: AppHandle, companion_id: String) -> Result<(), String> {
    show_companion(&app, &companion_id)
}

#[tauri::command]
async fn hide_companion_window(app: AppHandle, companion_id: String) -> Result<(), String> {
    hide_companion(&app, &companion_id)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let handle = app.handle().clone();

            #[cfg(desktop)]
            {
                let mut tray = TrayIconBuilder::with_id("hermes")
                    .tooltip("Hermes")
                    .show_menu_on_left_click(false)
                    .on_tray_icon_event(|tray, event| {
                        let should_open_hall = matches!(
                            event,
                            TrayIconEvent::Click {
                                button: MouseButton::Left,
                                button_state: MouseButtonState::Up,
                                ..
                            } | TrayIconEvent::DoubleClick {
                                button: MouseButton::Left,
                                ..
                            }
                        );

                        if should_open_hall {
                            let _ = show_hall(tray.app_handle());
                        }
                    });

                if let Some(icon) = app.default_window_icon() {
                    tray = tray.icon(icon.clone());
                }

                let _tray = tray.build(app)?;
            }

            let monitor_handle = handle.clone();
            thread::spawn(move || loop {
                thread::sleep(Duration::from_millis(500));
                let Some(main) = monitor_handle.get_webview_window("main") else {
                    continue;
                };

                if main.is_minimized().unwrap_or(false) {
                    let _ = show_pet(&monitor_handle);
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            hermes_api_request,
            hermes_profile_list,
            hermes_profile_route_status,
            hermes_profile_run,
            hermes_profile_details,
            show_hall_window,
            show_pet_window,
            show_panel_window,
            hide_panel_window,
            show_companion_window,
            hide_companion_window
        ])
        .on_window_event(|window, event| {
            if is_panel_window(window.label()) || is_companion_window(window.label()) {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window.hide();
                }
                return;
            }

            if window.label() != "main" {
                return;
            }

            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = show_pet(window.app_handle());
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building Hermes");

    app.run(|app_handle, event| {
        if matches!(event, RunEvent::Reopen { .. }) {
            let _ = show_hall(app_handle);
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn companion_window_label_is_stable_and_scoped() {
        let first = companion_window_label("builder-profile");
        let second = companion_window_label("builder-profile");
        let other = companion_window_label("reviewer profile");

        assert_eq!(first, second);
        assert!(first.starts_with("companion-builder-profile-"));
        assert!(other.starts_with("companion-reviewer-profile-"));
        assert_ne!(first, other);
        assert!(is_companion_window(&first));
        assert!(!is_companion_window("companions"));
    }

    #[test]
    fn companion_query_param_is_percent_encoded() {
        assert_eq!(percent_encode_query("builder-profile"), "builder-profile");
        assert_eq!(percent_encode_query("reviewer profile/中文"), "reviewer%20profile%2F%E4%B8%AD%E6%96%87");
    }
}
