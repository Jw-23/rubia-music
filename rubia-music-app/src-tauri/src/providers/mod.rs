mod kuwo;

use crate::domain::MusicTrack;
use kuwo::KuwoProvider;

pub struct ProviderRegistry {
    kuwo: KuwoProvider,
}

impl ProviderRegistry {
    pub fn new() -> Self {
        Self { kuwo: KuwoProvider::new() }
    }

    pub async fn search(&self, query: &str, page: u32, limit: u32) -> Result<Vec<MusicTrack>, String> {
        self.kuwo.search(query, page, limit).await
    }

    pub async fn resolve_url(&self, track: &MusicTrack, quality: &str) -> Result<String, String> {
        match track.source.as_str() {
            "kw" => self.kuwo.resolve_url(track, quality).await,
            source => Err(format!("暂不支持源：{source}")),
        }
    }
}
