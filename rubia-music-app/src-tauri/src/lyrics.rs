use crate::{
    domain::{LyricLine, MusicTrack},
    providers::ProviderRegistry,
};
use reqwest::{Client, StatusCode};
use serde::Deserialize;
use std::{
    path::{Path, PathBuf},
    time::Duration,
};
use tauri::{AppHandle, Manager};

const USER_AGENT: &str = "RubiaMusic/0.1.6 (https://github.com/rubia-music)";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LrcLibRecord {
    track_name: String,
    artist_name: String,
    duration: f64,
    synced_lyrics: Option<String>,
    plain_lyrics: Option<String>,
    #[serde(default)]
    instrumental: bool,
}

pub async fn get(
    app: &AppHandle,
    providers: &ProviderRegistry,
    track: &MusicTrack,
) -> Result<Vec<LyricLine>, String> {
    let cache_path = cache_path(app, track)?;
    if let Some(lines) = read_cache(&cache_path).await {
        tracing::debug!(target: "rubia_music_app::lyrics", track_id = %track.id, lines = lines.len(), "lyrics cache hit");
        return Ok(lines);
    }

    match providers.lyrics(track).await {
        Ok(lines) if !lines.is_empty() => {
            save_cache(&cache_path, &lines).await;
            return Ok(lines);
        }
        Ok(_) => {
            tracing::warn!(target: "rubia_music_app::lyrics", track_id = %track.id, "platform returned empty lyrics; trying fallback")
        }
        Err(error) => {
            tracing::warn!(target: "rubia_music_app::lyrics", track_id = %track.id, %error, "platform lyrics failed; trying fallback")
        }
    }

    let lines = fetch_fallback(track).await?;
    save_cache(&cache_path, &lines).await;
    Ok(lines)
}

async fn fetch_fallback(track: &MusicTrack) -> Result<Vec<LyricLine>, String> {
    let client = Client::builder()
        .timeout(Duration::from_secs(15))
        .user_agent(USER_AGENT)
        .build()
        .map_err(|error| format!("创建歌词客户端失败：{error}"))?;
    tracing::debug!(target: "rubia_music_app::lyrics", name = %track.name, artist = %track.artist, "searching fallback lyrics");
    let response = client
        .get("https://lrclib.net/api/search")
        .query(&[
            ("track_name", track.name.as_str()),
            ("artist_name", track.artist.as_str()),
        ])
        .send()
        .await
        .map_err(|error| format!("保底歌词请求失败：{error}"))?;
    if response.status() == StatusCode::TOO_MANY_REQUESTS {
        return Err("保底歌词服务请求过于频繁，请稍后再试".into());
    }
    let records: Vec<LrcLibRecord> = response
        .error_for_status()
        .map_err(|error| format!("保底歌词服务异常：{error}"))?
        .json()
        .await
        .map_err(|error| format!("保底歌词响应解析失败：{error}"))?;
    let record = choose_record(records, track)
        .ok_or_else(|| "当前平台和保底服务均未找到歌词".to_string())?;
    if record.instrumental {
        return Err("这是一首纯音乐，暂无歌词".into());
    }

    if let Some(lrc) = record
        .synced_lyrics
        .as_deref()
        .filter(|value| !value.trim().is_empty())
    {
        let lines = parse_lrc(lrc);
        if !lines.is_empty() {
            tracing::info!(target: "rubia_music_app::lyrics", name = %track.name, lines = lines.len(), "downloaded synced fallback lyrics");
            return Ok(lines);
        }
    }
    if let Some(plain) = record
        .plain_lyrics
        .as_deref()
        .filter(|value| !value.trim().is_empty())
    {
        let lines = approximate_plain_lyrics(
            plain,
            track.duration_seconds.max(record.duration.round() as u64),
        );
        if !lines.is_empty() {
            tracing::warn!(target: "rubia_music_app::lyrics", name = %track.name, lines = lines.len(), "using approximate timeline for plain fallback lyrics");
            return Ok(lines);
        }
    }
    Err("找到了歌曲记录，但没有可用歌词".into())
}

fn choose_record(records: Vec<LrcLibRecord>, track: &MusicTrack) -> Option<LrcLibRecord> {
    let expected_name = normalize(&track.name);
    let expected_artist = normalize(&track.artist);
    records
        .into_iter()
        .filter(|record| {
            record.synced_lyrics.is_some() || record.plain_lyrics.is_some() || record.instrumental
        })
        .max_by_key(|record| {
            let name = normalize(&record.track_name);
            let artist = normalize(&record.artist_name);
            let mut score = 0_i64;
            if name == expected_name {
                score += 100;
            } else if name.contains(&expected_name) || expected_name.contains(&name) {
                score += 45;
            }
            if artist == expected_artist {
                score += 70;
            } else if artist.contains(&expected_artist) || expected_artist.contains(&artist) {
                score += 30;
            }
            if track.duration_seconds > 0 {
                score += (30
                    - (record.duration - track.duration_seconds as f64)
                        .abs()
                        .round() as i64)
                    .max(0);
            }
            if record
                .synced_lyrics
                .as_deref()
                .is_some_and(|value| !value.is_empty())
            {
                score += 20;
            }
            score
        })
}

fn parse_lrc(input: &str) -> Vec<LyricLine> {
    let mut lines = Vec::new();
    for raw_line in input.lines() {
        let mut rest = raw_line.trim();
        let mut timestamps = Vec::new();
        while let Some(after_open) = rest.strip_prefix('[') {
            let Some(close) = after_open.find(']') else {
                break;
            };
            let tag = &after_open[..close];
            let Some((minutes, seconds)) = tag.split_once(':') else {
                break;
            };
            let (Ok(minutes), Ok(seconds)) = (minutes.parse::<f64>(), seconds.parse::<f64>())
            else {
                break;
            };
            timestamps.push(minutes * 60.0 + seconds);
            rest = &after_open[close + 1..];
        }
        let text = rest.trim();
        if text.is_empty() {
            continue;
        }
        for time_seconds in timestamps.iter().copied() {
            lines.push(LyricLine {
                time_seconds,
                text: text.to_owned(),
            });
        }
    }
    lines.sort_by(|left, right| left.time_seconds.total_cmp(&right.time_seconds));
    lines
}

fn approximate_plain_lyrics(input: &str, duration_seconds: u64) -> Vec<LyricLine> {
    let text: Vec<_> = input
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .collect();
    let usable_duration = duration_seconds.saturating_sub(8).max(1) as f64;
    let interval = usable_duration / text.len().max(1) as f64;
    text.into_iter()
        .enumerate()
        .map(|(index, line)| LyricLine {
            time_seconds: index as f64 * interval,
            text: line.to_owned(),
        })
        .collect()
}

fn normalize(value: &str) -> String {
    value
        .chars()
        .filter(|character| character.is_alphanumeric())
        .flat_map(char::to_lowercase)
        .collect()
}

fn cache_path(app: &AppHandle, track: &MusicTrack) -> Result<PathBuf, String> {
    let directory = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join("lyrics");
    let safe = |value: &str| {
        value
            .chars()
            .map(|character| {
                if character.is_ascii_alphanumeric() || matches!(character, '-' | '_') {
                    character
                } else {
                    '_'
                }
            })
            .collect::<String>()
    };
    Ok(directory.join(format!("{}_{}.json", safe(&track.source), safe(&track.id))))
}

async fn read_cache(path: &Path) -> Option<Vec<LyricLine>> {
    let bytes = tokio::fs::read(path).await.ok()?;
    serde_json::from_slice::<Vec<LyricLine>>(&bytes)
        .ok()
        .filter(|lines| !lines.is_empty())
}

async fn save_cache(path: &Path, lines: &[LyricLine]) {
    let result = async {
        let directory = path
            .parent()
            .ok_or_else(|| "歌词缓存路径无效".to_string())?;
        tokio::fs::create_dir_all(directory)
            .await
            .map_err(|error| error.to_string())?;
        let temporary = path.with_extension("json.tmp");
        let bytes = serde_json::to_vec(lines).map_err(|error| error.to_string())?;
        tokio::fs::write(&temporary, bytes)
            .await
            .map_err(|error| error.to_string())?;
        tokio::fs::rename(temporary, path)
            .await
            .map_err(|error| error.to_string())
    }
    .await;
    if let Err(error) = result {
        tracing::warn!(target: "rubia_music_app::lyrics", %error, "failed to persist lyrics cache");
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_multiple_lrc_timestamps() {
        let lines = parse_lrc("[00:01.50][00:03.00]Hello\n[00:04]World");
        assert_eq!(lines.len(), 3);
        assert_eq!(lines[0].time_seconds, 1.5);
        assert_eq!(lines[1].text, "Hello");
        assert_eq!(lines[2].text, "World");
    }
}
