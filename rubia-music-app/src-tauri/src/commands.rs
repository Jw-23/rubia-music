use crate::{
    domain::{LyricLine, MusicTrack, SourceHttpRequest, SourceHttpResponse},
    lyrics,
    providers::ProviderRegistry,
};
use reqwest::{Client, Method};
use std::{collections::HashMap, time::Duration};
use tauri::{AppHandle, Manager, State};

pub struct SourceHttpClient(pub Client);

impl SourceHttpClient {
    pub fn new() -> Self {
        Self(
            Client::builder()
                .build()
                .expect("failed to create source HTTP client"),
        )
    }
}

#[tauri::command]
pub async fn search_music(
    query: String,
    page: Option<u32>,
    limit: Option<u32>,
    providers: State<'_, ProviderRegistry>,
) -> Result<Vec<MusicTrack>, String> {
    let query = query.trim();
    if query.is_empty() {
        return Ok(Vec::new());
    }
    providers
        .search(query, page.unwrap_or(1), limit.unwrap_or(30).min(50))
        .await
}

#[tauri::command]
pub async fn resolve_music_url(
    track: MusicTrack,
    quality: Option<String>,
    providers: State<'_, ProviderRegistry>,
) -> Result<String, String> {
    providers
        .resolve_url(&track, quality.as_deref().unwrap_or("320k"))
        .await
}

#[tauri::command]
pub async fn get_music_lyrics(
    app: AppHandle,
    track: MusicTrack,
    providers: State<'_, ProviderRegistry>,
) -> Result<Vec<LyricLine>, String> {
    lyrics::get(&app, &providers, &track).await
}

#[tauri::command]
pub async fn source_http_request(
    request: SourceHttpRequest,
    client: State<'_, SourceHttpClient>,
) -> Result<SourceHttpResponse, String> {
    let timeout = request.timeout_ms.unwrap_or(60_000).clamp(100, 60_000);
    tracing::debug!(target: "rubia_music_app::music_source", method = %request.method, url = %request.url, timeout_ms = timeout, "sending source HTTP request");
    let method = Method::from_bytes(request.method.to_uppercase().as_bytes())
        .map_err(|_| "无效的 HTTP 方法".to_string())?;
    let mut builder = client
        .inner()
        .0
        .request(method, &request.url)
        .timeout(Duration::from_millis(timeout));
    for (name, value) in request.headers {
        builder = builder.header(name, value);
    }
    if let Some(body) = request.body {
        builder = builder.body(body);
    }
    let response = builder.send().await.map_err(|e| {
        tracing::error!(target: "rubia_music_app::music_source", error = ?e, "source HTTP transport failed");
        e.to_string()
    })?;
    let status = response.status();
    let headers: HashMap<_, _> = response
        .headers()
        .iter()
        .filter_map(|(key, value)| value.to_str().ok().map(|v| (key.to_string(), v.to_owned())))
        .collect();
    let raw = response.bytes().await.map_err(|e| e.to_string())?.to_vec();
    let body = String::from_utf8_lossy(&raw).into_owned();
    let bytes = raw.len();
    if status.is_success() {
        tracing::debug!(target: "rubia_music_app::music_source", status = status.as_u16(), bytes, "source HTTP request completed");
    } else {
        tracing::warn!(target: "rubia_music_app::music_source", status = status.as_u16(), bytes, response_body = %body.chars().take(500).collect::<String>(), "source HTTP returned an error status");
    }
    Ok(SourceHttpResponse {
        status_code: status.as_u16(),
        status_message: status.canonical_reason().unwrap_or_default().into(),
        headers,
        body,
        bytes,
        raw,
    })
}

#[tauri::command]
pub async fn load_source_settings(app: AppHandle) -> Result<serde_json::Value, String> {
    let path = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("sources.json");
    if !path.exists() {
        return Ok(serde_json::json!({ "sources": [], "activeSourceId": null }));
    }
    let bytes = tokio::fs::read(path).await.map_err(|e| e.to_string())?;
    serde_json::from_slice(&bytes).map_err(|e| format!("音源配置损坏：{e}"))
}

#[tauri::command]
pub async fn save_source_settings(
    app: AppHandle,
    settings: serde_json::Value,
) -> Result<(), String> {
    let directory = app.path().app_data_dir().map_err(|e| e.to_string())?;
    tokio::fs::create_dir_all(&directory)
        .await
        .map_err(|e| e.to_string())?;
    let path = directory.join("sources.json");
    let temporary = directory.join("sources.json.tmp");
    let bytes = serde_json::to_vec(&settings).map_err(|e| e.to_string())?;
    tokio::fs::write(&temporary, bytes)
        .await
        .map_err(|e| e.to_string())?;
    tokio::fs::rename(temporary, path)
        .await
        .map_err(|e| e.to_string())
}
