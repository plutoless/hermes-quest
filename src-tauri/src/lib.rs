use serde::Serialize;
use serde_json::Value;

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![hermes_api_request])
        .run(tauri::generate_context!())
        .expect("error while running Hermes Guild");
}
