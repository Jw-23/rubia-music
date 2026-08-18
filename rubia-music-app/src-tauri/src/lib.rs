mod commands;
mod domain;
mod providers;

use providers::ProviderRegistry;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(ProviderRegistry::new())
        .invoke_handler(tauri::generate_handler![
            commands::search_music,
            commands::resolve_music_url,
            commands::source_http_request,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
