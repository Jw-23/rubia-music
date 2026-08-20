mod commands;
mod domain;
mod lyrics;
#[cfg(desktop)]
mod native_menu;
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
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(ProviderRegistry::new())
        .manage(commands::SourceHttpClient::new());
    #[cfg(desktop)]
    let builder = builder
        .setup(|app| {
            app.set_menu(native_menu::build(app)?)?;
            Ok(())
        })
        .on_menu_event(|app, event| native_menu::handle_event(app, event.id().as_ref()));
    builder
        .invoke_handler(tauri::generate_handler![
            commands::search_music,
            commands::resolve_music_url,
            commands::get_music_lyrics,
            commands::source_http_request,
            commands::load_source_settings,
            commands::save_source_settings,
            commands::cache_track,
            commands::cached_track_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
