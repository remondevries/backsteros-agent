use tauri::WebviewWindow;

#[cfg(target_os = "macos")]
pub fn set_visible(window: &WebviewWindow, visible: bool) -> Result<(), String> {
    use objc2_app_kit::{NSWindow, NSWindowButton};
    use objc2_foundation::MainThreadMarker;

    let _mtm = MainThreadMarker::new().ok_or("traffic lights must be updated on the main thread")?;
    let ns_window_ptr = window
        .ns_window()
        .map_err(|error| error.to_string())? as *mut NSWindow;
    let ns_window = unsafe { &*ns_window_ptr };

    let alpha = if visible { 1.0 } else { 0.0 };
    for button_type in [
        NSWindowButton::CloseButton,
        NSWindowButton::MiniaturizeButton,
        NSWindowButton::ZoomButton,
    ] {
        if let Some(button) = ns_window.standardWindowButton(button_type) {
            button.setAlphaValue(alpha);
        }
    }

    Ok(())
}

#[cfg(not(target_os = "macos"))]
pub fn set_visible(_window: &WebviewWindow, _visible: bool) -> Result<(), String> {
    Ok(())
}
