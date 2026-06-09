use tauri::{AppHandle, Manager};

pub const WINDOW_LABEL: &str = "main";

pub fn toggle_window(app: &AppHandle) {
    let Some(window) = app.get_webview_window(WINDOW_LABEL) else {
        return;
    };

    match window.is_visible() {
        Ok(true) => {
            let _ = window.hide();
        }
        Ok(false) => {
            let _ = window.show();
            let _ = window.set_focus();
        }
        Err(_) => {
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
}
