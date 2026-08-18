use crate::{domain::{MusicTrack, SourceHttpRequest, SourceHttpResponse}, providers::ProviderRegistry};
use reqwest::{Client, Method};
use std::{collections::HashMap, time::Duration};
use tauri::State;

#[tauri::command]
pub async fn search_music(query: String, page: Option<u32>, limit: Option<u32>, providers: State<'_, ProviderRegistry>) -> Result<Vec<MusicTrack>, String> {
    let query = query.trim();
    if query.is_empty() { return Ok(Vec::new()); }
    providers.search(query, page.unwrap_or(1), limit.unwrap_or(30).min(50)).await
}

#[tauri::command]
pub async fn resolve_music_url(track: MusicTrack, quality: Option<String>, providers: State<'_, ProviderRegistry>) -> Result<String, String> {
    providers.resolve_url(&track, quality.as_deref().unwrap_or("320k")).await
}

#[tauri::command]
pub async fn source_http_request(request: SourceHttpRequest) -> Result<SourceHttpResponse, String> {
    let timeout = request.timeout_ms.unwrap_or(60_000).clamp(100, 60_000);
    let client = Client::builder().timeout(Duration::from_millis(timeout)).build().map_err(|e| e.to_string())?;
    let method = Method::from_bytes(request.method.to_uppercase().as_bytes()).map_err(|_| "无效的 HTTP 方法".to_string())?;
    let mut builder = client.request(method, &request.url);
    for (name, value) in request.headers { builder = builder.header(name, value); }
    if let Some(body) = request.body { builder = builder.body(body); }
    let response = builder.send().await.map_err(|e| e.to_string())?;
    let status = response.status();
    let headers: HashMap<_, _> = response.headers().iter().filter_map(|(key, value)| value.to_str().ok().map(|v| (key.to_string(), v.to_owned()))).collect();
    let body = response.text().await.map_err(|e| e.to_string())?;
    Ok(SourceHttpResponse { status_code: status.as_u16(), status_message: status.canonical_reason().unwrap_or_default().into(), headers, body })
}
