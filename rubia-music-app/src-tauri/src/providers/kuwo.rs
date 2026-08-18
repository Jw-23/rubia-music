use crate::domain::MusicTrack;
use reqwest::Client;
use serde_json::{json, Value};
use std::time::Duration;

pub struct KuwoProvider {
    client: Client,
}

impl KuwoProvider {
    pub fn new() -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(15))
            .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36")
            .build()
            .expect("failed to create HTTP client");
        Self { client }
    }

    pub async fn search(&self, query: &str, page: u32, limit: u32) -> Result<Vec<MusicTrack>, String> {
        let page = page.saturating_sub(1);
        let url = format!(
            "https://search.kuwo.cn/r.s?client=kt&all={}&pn={page}&rn={limit}&uid=794762570&ver=kwplayer_ar_9.2.2.1&vipver=1&show_copyright_off=1&newver=1&ft=music&cluster=0&strategy=2012&encoding=utf8&rformat=json&vermerge=1&mobi=1&issubtitle=1",
            urlencoding::encode(query)
        );
        let body: Value = self.client.get(url).send().await.map_err(network_error)?
            .error_for_status().map_err(network_error)?
            .json().await.map_err(network_error)?;
        let items = body.get("abslist").and_then(Value::as_array).cloned().unwrap_or_default();
        Ok(items.into_iter().filter_map(parse_track).collect())
    }

    pub async fn resolve_url(&self, track: &MusicTrack, quality: &str) -> Result<String, String> {
        let bitrate = match quality {
            "flac24bit" => "2000kflac",
            "flac" => "1000kflac",
            "320k" => "320kmp3",
            _ => "128kmp3",
        };
        let url = format!(
            "https://antiserver.kuwo.cn/anti.s?type=convert_url3&rid=MUSIC_{}&format=mp3|aac&response=url&br={bitrate}",
            urlencoding::encode(&track.id)
        );
        let value: Value = self.client.get(url).send().await.map_err(network_error)?
            .error_for_status().map_err(network_error)?
            .json().await.map_err(network_error)?;
        value.get("url").and_then(Value::as_str).filter(|url| url.starts_with("http"))
            .map(str::to_owned).ok_or_else(|| "平台没有返回可播放地址，请导入自定义源".into())
    }
}

fn network_error(error: reqwest::Error) -> String { format!("网络请求失败：{error}") }

fn text(value: &Value, key: &str) -> String {
    value.get(key).and_then(Value::as_str).unwrap_or_default()
        .replace("&amp;", "&").replace("&quot;", "\"").replace("&#39;", "'")
}

fn parse_track(value: Value) -> Option<MusicTrack> {
    let id = text(&value, "MUSICRID").replace("MUSIC_", "");
    if id.is_empty() { return None; }
    let duration_seconds = text(&value, "DURATION").parse().unwrap_or_default();
    let quality_info = text(&value, "N_MINFO");
    let mut qualities = Vec::new();
    for (needle, quality) in [("bitrate:4000", "flac24bit"), ("bitrate:2000", "flac"), ("bitrate:320", "320k"), ("bitrate:128", "128k")] {
        if quality_info.contains(needle) { qualities.push(quality.to_owned()); }
    }
    if qualities.is_empty() { qualities.push("128k".into()); }
    Some(MusicTrack {
        id: id.clone(),
        name: text(&value, "SONGNAME"),
        artist: text(&value, "ARTIST").replace('&', "、"),
        album: text(&value, "ALBUM"),
        duration_seconds,
        source: "kw".into(),
        artwork_url: None,
        qualities,
        source_data: json!({
            "songmid": id,
            "albumId": text(&value, "ALBUMID"),
            "albumName": text(&value, "ALBUM"),
        }),
    })
}
