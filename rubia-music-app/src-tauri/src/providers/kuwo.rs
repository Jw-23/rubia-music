use crate::domain::{LyricLine, MusicTrack};
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
        let tracks: Vec<_> = items.into_iter().filter_map(parse_track).collect();
        tracing::debug!(
            target: "rubia_music_app::artwork",
            tracks = tracks.len(),
            with_artwork = tracks.iter().filter(|track| track.artwork_url.is_some()).count(),
            first_artwork = ?tracks.first().and_then(|track| track.artwork_url.as_deref()),
            "parsed search artwork"
        );
        Ok(tracks)
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

    pub async fn lyrics(&self, track: &MusicTrack) -> Result<Vec<LyricLine>, String> {
        let url = format!(
            "http://m.kuwo.cn/newh5/singles/songinfoandlrc?musicId={}",
            urlencoding::encode(&track.id)
        );
        let body: Value = self.client.get(url).send().await.map_err(network_error)?
            .error_for_status().map_err(network_error)?
            .json().await.map_err(network_error)?;
        let lines = body.pointer("/data/lrclist").and_then(Value::as_array)
            .ok_or_else(|| "平台没有返回歌词".to_string())?;
        let mut lyrics: Vec<_> = lines.iter().filter_map(|line| {
            let text = line.get("lineLyric")?.as_str()?.trim();
            let time_seconds = line.get("time")?.as_str()?.parse::<f64>().ok()?;
            (!text.is_empty()).then(|| LyricLine { time_seconds, text: text.to_owned() })
        }).collect();
        lyrics.sort_by(|left, right| left.time_seconds.total_cmp(&right.time_seconds));
        if lyrics.is_empty() { Err("暂无歌词".into()) } else { Ok(lyrics) }
    }
}

fn network_error(error: reqwest::Error) -> String { format!("网络请求失败：{error}") }

fn text(value: &Value, key: &str) -> String {
    value.get(key).and_then(Value::as_str).unwrap_or_default()
        .replace("&amp;", "&").replace("&quot;", "\"").replace("&#39;", "'")
}

fn artwork_url(value: &Value) -> Option<String> {
    let path = text(value, "web_albumpic_short");
    if path.is_empty() { return None; }
    // Kuwo prefixes this field with its original size (for example `120/`).
    // Replace that segment instead of appending another size directory.
    let normalized = path.split_once('/')
        .filter(|(size, _)| size.chars().all(|character| character.is_ascii_digit()))
        .map(|(_, rest)| rest)
        .unwrap_or(path.as_str());
    Some(format!("https://img1.kuwo.cn/star/albumcover/500/{normalized}"))
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
    let artwork_url = artwork_url(&value);
    Some(MusicTrack {
        id: id.clone(),
        name: text(&value, "SONGNAME"),
        artist: text(&value, "ARTIST").replace('&', "、"),
        album: text(&value, "ALBUM"),
        duration_seconds,
        source: "kw".into(),
        artwork_url: artwork_url.clone(),
        qualities,
        source_data: json!({
            "songmid": id,
            "albumId": text(&value, "ALBUMID"),
            "albumName": text(&value, "ALBUM"),
            "picUrl": artwork_url,
        }),
    })
}
