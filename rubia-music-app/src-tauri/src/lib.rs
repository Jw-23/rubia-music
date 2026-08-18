mod commands;
mod domain;
mod providers;

use providers::ProviderRegistry;

#[cfg(debug_assertions)]
fn init_tracing() {
    use tracing_subscriber::EnvFilter;

    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("rubia_music_app=debug"));
    let _ = tracing_subscriber::fmt()
        .with_env_filter(filter)
        .with_target(true)
        .with_thread_ids(true)
        .try_init();
}

#[cfg(not(debug_assertions))]
fn init_tracing() {}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    init_tracing();
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(ProviderRegistry::new())
        .manage(commands::SourceHttpClient::new())
        .invoke_handler(tauri::generate_handler![
            commands::search_music,
            commands::resolve_music_url,
            commands::get_music_lyrics,
            commands::source_http_request,
            commands::load_source_settings,
            commands::save_source_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
