mod hotkeys;
mod modules;
mod sidecar;
mod traffic_lights;
mod window;

use modules::pty::PtyState;
use sidecar::SidecarState;
use tauri::Manager;

const WINDOW_LABEL: &str = "main";

#[tauri::command]
fn get_sidecar_connection(state: tauri::State<'_, SidecarState>) -> sidecar::SidecarConnection {
    state.connection()
}

#[tauri::command]
fn restart_sidecar(app: tauri::AppHandle) -> Result<(), String> {
    sidecar::restart_sidecar(&app)
}

#[tauri::command]
fn set_traffic_lights_visible(window: tauri::WebviewWindow, visible: bool) -> Result<(), String> {
    traffic_lights::set_visible(&window, visible)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(SidecarState::new())
        .manage(PtyState::default())
        .invoke_handler(tauri::generate_handler![
            get_sidecar_connection,
            restart_sidecar,
            set_traffic_lights_visible,
            modules::pty::pty_open,
            modules::pty::pty_write,
            modules::pty::pty_resize,
            modules::pty::pty_close,
            modules::pty::pty_close_all,
            modules::pty::pty_has_foreground_job,
            modules::pty::pty_has_foreground_process,
            modules::pty::pty_shell_name,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            if let Err(error) = sidecar::start_sidecar(app.handle()) {
                eprintln!("Failed to start agent server: {error}");
            }
            hotkeys::register_hotkeys(app.handle())?;

            let _ = modules::pty::pty_close_all(app.state::<PtyState>());

            if let Some(window) = app.get_webview_window(WINDOW_LABEL) {
                let _ = window.set_theme(None);
                let _ = window.show();
                let _ = window.set_focus();
                let _ = traffic_lights::set_visible(&window, true);
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
