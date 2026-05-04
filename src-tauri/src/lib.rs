use serde::Serialize;
use serde_json::Value;
use std::{thread, time::Duration};
#[cfg(desktop)]
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager, RunEvent, WindowEvent};

#[derive(Debug, Serialize)]
struct HermesApiResponse {
    status: u16,
    body: String,
}

#[tauri::command]
async fn hermes_api_request(
    method: String,
    url: String,
    body: Option<Value>,
) -> Result<HermesApiResponse, String> {
    let client = reqwest::Client::new();
    let method = method.trim().to_uppercase();
    let builder = match method.as_str() {
        "GET" => client.get(&url),
        "POST" => {
            let builder = client.post(&url);
            match body {
                Some(body) => builder.json(&body),
                None => builder,
            }
        }
        _ => return Err(format!("Unsupported Hermes API method: {method}")),
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

#[tauri::command]
async fn show_hall_window(app: AppHandle) -> Result<(), String> {
    show_hall(&app)
}

#[tauri::command]
async fn show_pet_window(app: AppHandle) -> Result<(), String> {
    show_pet(&app)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let handle = app.handle().clone();

            #[cfg(desktop)]
            {
                let mut tray = TrayIconBuilder::with_id("hermes-guild")
                    .tooltip("Hermes Guild")
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
            show_hall_window,
            show_pet_window
        ])
        .on_window_event(|window, event| {
            if window.label() != "main" {
                return;
            }

            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = show_pet(window.app_handle());
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building Hermes Guild");

    app.run(|app_handle, event| {
        if matches!(event, RunEvent::Reopen { .. }) {
            let _ = show_hall(app_handle);
        }
    });
}
