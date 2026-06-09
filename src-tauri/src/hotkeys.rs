use crate::window::toggle_window;
use tauri::AppHandle;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

pub fn register_hotkeys(app: &AppHandle) -> tauri::Result<()> {
    let app_handle = app.clone();
    let shortcut: Shortcut = match "CommandOrControl+Shift+A".parse() {
        Ok(value) => value,
        Err(error) => {
            return Err(tauri::Error::Io(std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                error.to_string(),
            )));
        }
    };

    app.global_shortcut()
        .on_shortcut(shortcut, move |_, _, event| {
            if event.state == ShortcutState::Pressed {
                toggle_window(&app_handle);
            }
        })
        .map_err(|error| {
            tauri::Error::Io(std::io::Error::new(
                std::io::ErrorKind::Other,
                error.to_string(),
            ))
        })?;

    Ok(())
}
