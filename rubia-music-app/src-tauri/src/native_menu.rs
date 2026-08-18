#![cfg(desktop)]

use tauri::{
    App, AppHandle, Emitter, Manager,
    menu::{
        AboutMetadataBuilder, Menu, MenuBuilder, MenuItem, MenuItemBuilder, Submenu, SubmenuBuilder,
    },
};

const MENU_EVENT: &str = "rubia://menu";

fn item(app: &App, id: &str, text: &str, accelerator: &str) -> tauri::Result<MenuItem<tauri::Wry>> {
    MenuItemBuilder::with_id(id, text)
        .accelerator(accelerator)
        .build(app)
}

#[cfg(target_os = "macos")]
fn application_menu(app: &App) -> tauri::Result<Submenu<tauri::Wry>> {
    let settings = item(app, "settings", "设置…", "CmdOrCtrl+,")?;
    let metadata = AboutMetadataBuilder::new()
        .name(Some("Rubia Music"))
        .version(Some(app.package_info().version.to_string()))
        .comments(Some("一款注重体验与可扩展音乐源的桌面播放器"))
        .build();
    SubmenuBuilder::new(app, "Rubia Music")
        .about_with_text("关于 Rubia Music", Some(metadata))
        .separator()
        .item(&settings)
        .separator()
        .services()
        .separator()
        .hide_with_text("隐藏 Rubia Music")
        .hide_others_with_text("隐藏其他")
        .show_all_with_text("全部显示")
        .separator()
        .quit_with_text("退出 Rubia Music")
        .build()
}

#[cfg(not(target_os = "macos"))]
fn file_menu(app: &App) -> tauri::Result<Submenu<tauri::Wry>> {
    let settings = item(app, "settings", "设置…", "CmdOrCtrl+,")?;
    SubmenuBuilder::new(app, "文件")
        .item(&settings)
        .separator()
        .close_window_with_text("关闭窗口")
        .quit_with_text("退出 Rubia Music")
        .build()
}

pub fn build(app: &App) -> tauri::Result<Menu<tauri::Wry>> {
    let play_pause = item(app, "play-pause", "播放或暂停", "Space")?;
    let next = item(app, "play-next", "下一首", "CmdOrCtrl+Right")?;
    let home = item(app, "view-home", "首页", "CmdOrCtrl+1")?;
    let search = item(app, "view-search", "搜索", "CmdOrCtrl+F")?;
    let favorites = item(app, "view-favorites", "收藏", "CmdOrCtrl+2")?;
    let playlists = item(app, "view-playlists", "歌单", "CmdOrCtrl+3")?;
    let recent = item(app, "view-recent", "最近播放", "CmdOrCtrl+4")?;
    let help = item(app, "open-help", "Rubia Music 帮助", "CmdOrCtrl+?")?;

    let edit = SubmenuBuilder::new(app, "编辑")
        .undo_with_text("撤销")
        .redo_with_text("重做")
        .separator()
        .cut_with_text("剪切")
        .copy_with_text("复制")
        .paste_with_text("粘贴")
        .select_all_with_text("全选")
        .build()?;
    let controls = SubmenuBuilder::new(app, "控制")
        .item(&play_pause)
        .item(&next)
        .build()?;
    let view = SubmenuBuilder::new(app, "显示")
        .item(&home)
        .item(&search)
        .separator()
        .item(&favorites)
        .item(&playlists)
        .item(&recent)
        .separator()
        .fullscreen_with_text("进入全屏幕")
        .build()?;
    let window = SubmenuBuilder::new(app, "窗口")
        .minimize_with_text("最小化")
        .close_window_with_text("关闭窗口")
        .build()?;
    let help_menu = SubmenuBuilder::new(app, "帮助").item(&help).build()?;

    let builder = MenuBuilder::new(app);
    #[cfg(target_os = "macos")]
    let builder = builder.item(&application_menu(app)?);
    #[cfg(not(target_os = "macos"))]
    let builder = builder.item(&file_menu(app)?);
    builder
        .item(&edit)
        .item(&controls)
        .item(&view)
        .item(&window)
        .item(&help_menu)
        .build()
}

pub fn handle_event(app: &AppHandle, id: &str) {
    if matches!(
        id,
        "settings"
            | "play-pause"
            | "play-next"
            | "view-home"
            | "view-search"
            | "view-favorites"
            | "view-playlists"
            | "view-recent"
            | "open-help"
    ) {
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.show();
            let _ = window.unminimize();
            let _ = window.set_focus();
        }
        if let Err(error) = app.emit(MENU_EVENT, id) {
            tracing::warn!(target: "rubia_music_app::menu", %id, %error, "failed to emit menu event");
        }
    }
}
