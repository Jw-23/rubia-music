use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MusicTrack {
    pub id: String,
    pub name: String,
    pub artist: String,
    pub album: String,
    pub duration_seconds: u64,
    pub source: String,
    pub artwork_url: Option<String>,
    pub qualities: Vec<String>,
    pub source_data: serde_json::Value,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceHttpRequest {
    pub url: String,
    #[serde(default = "default_method")]
    pub method: String,
    #[serde(default)]
    pub headers: std::collections::HashMap<String, String>,
    pub body: Option<String>,
    pub timeout_ms: Option<u64>,
}

fn default_method() -> String { "GET".into() }

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceHttpResponse {
    pub status_code: u16,
    pub status_message: String,
    pub headers: std::collections::HashMap<String, String>,
    pub body: String,
}
