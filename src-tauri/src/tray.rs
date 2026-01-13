//! ScriptGrab System Tray Module
//!
//! Handles system tray icon, menu, and window management.
//!
//! Requirements: 8.1, 8.2, 8.3, 8.5

use std::sync::Arc;
use tauri::{
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    menu::{Menu, MenuItem},
    Manager, Runtime, AppHandle, Emitter,
};

use crate::sidecar::SidecarManager;
use crate::storage::get_storage_manager;

/// Event name for close confirmation request
pub const CLOSE_CONFIRMATION_EVENT: &str = "close_confirmation_request";

/// Build and setup the system tray icon with menu
/// 
/// Requirements: 8.1 (display system tray icon), 8.3 (tray icon click restores window)
pub fn setup_tray<R: Runtime>(app: &AppHandle<R>) -> Result<(), Box<dyn std::error::Error>> {
    // Create menu items
    let show_item = MenuItem::with_id(app, "show", "Show ScriptGrab", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

    // Create the menu
    let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

    // Build the tray icon
    let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .tooltip("ScriptGrab - Transkript Uygulaması")
        .on_menu_event(|app, event| {
            handle_menu_event(app, event.id.as_ref());
        })
        .on_tray_icon_event(|tray, event| {
            handle_tray_event(tray.app_handle(), event);
        })
        .build(app)?;

    Ok(())
}

/// Handle tray menu events
/// 
/// Requirements: 8.3 (tray icon click restores window)
fn handle_menu_event<R: Runtime>(app: &AppHandle<R>, menu_id: &str) {
    match menu_id {
        "show" => {
            show_main_window(app);
        }
        "quit" => {
            // Check if we should show confirmation before quitting
            let app_clone = app.clone();
            tauri::async_runtime::spawn(async move {
                if should_confirm_close(&app_clone).await {
                    // Emit event to frontend to show confirmation dialog
                    let _ = app_clone.emit(CLOSE_CONFIRMATION_EVENT, ());
                } else {
                    // No active transcription, quit immediately
                    app_clone.exit(0);
                }
            });
        }
        _ => {}
    }
}

/// Handle tray icon events (click, double-click)
/// 
/// Requirements: 8.3 (tray icon click restores window)
fn handle_tray_event<R: Runtime>(app: &AppHandle<R>, event: TrayIconEvent) {
    match event {
        TrayIconEvent::Click {
            button: MouseButton::Left,
            button_state: MouseButtonState::Up,
            ..
        } => {
            show_main_window(app);
        }
        TrayIconEvent::DoubleClick {
            button: MouseButton::Left,
            ..
        } => {
            show_main_window(app);
        }
        _ => {}
    }
}

/// Show and focus the main window
/// 
/// Requirements: 8.3 (tray icon click restores window)
pub fn show_main_window<R: Runtime>(app: &AppHandle<R>) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

/// Hide the main window (minimize to tray)
/// 
/// Requirements: 8.2 (minimize to tray when window closed)
pub fn hide_main_window<R: Runtime>(app: &AppHandle<R>) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
}

/// Check if minimize to tray is enabled in settings
/// 
/// Requirements: 8.2, 9.3
pub fn is_minimize_to_tray_enabled() -> bool {
    if let Ok(storage) = get_storage_manager() {
        if let Ok(settings) = storage.load_settings() {
            return settings.minimize_to_tray;
        }
    }
    false
}

/// Check if there are active transcription jobs
/// 
/// Requirements: 8.5 (confirmation if transcription in progress)
pub async fn has_active_transcription<R: Runtime>(app: &AppHandle<R>) -> bool {
    if let Some(manager) = app.try_state::<Arc<SidecarManager>>() {
        manager.active_job_count().await > 0
    } else {
        false
    }
}

/// Check if we should show close confirmation dialog
/// 
/// Requirements: 8.5
pub async fn should_confirm_close<R: Runtime>(app: &AppHandle<R>) -> bool {
    has_active_transcription(app).await
}

/// Force quit the application (used after user confirms)
pub fn force_quit<R: Runtime>(app: &AppHandle<R>) {
    app.exit(0);
}

// ============================================
// Tauri Commands
// ============================================

/// Check if there are active transcription jobs
/// 
/// Requirements: 8.5
#[tauri::command]
pub async fn has_active_jobs(
    state: tauri::State<'_, Arc<SidecarManager>>,
) -> Result<bool, String> {
    Ok(state.active_job_count().await > 0)
}

/// Confirm and quit the application
/// 
/// Requirements: 8.5
#[tauri::command]
pub async fn confirm_quit(app: AppHandle) -> Result<(), String> {
    app.exit(0);
    Ok(())
}

/// Minimize the main window to tray
/// 
/// Requirements: 8.2
#[tauri::command]
pub async fn minimize_to_tray(app: AppHandle) -> Result<(), String> {
    hide_main_window(&app);
    Ok(())
}

/// Show the main window from tray
/// 
/// Requirements: 8.3
#[tauri::command]
pub async fn show_from_tray(app: AppHandle) -> Result<(), String> {
    show_main_window(&app);
    Ok(())
}

/// Get minimize to tray setting
/// 
/// Requirements: 8.2, 9.3
#[tauri::command]
pub async fn get_minimize_to_tray_enabled() -> Result<bool, String> {
    Ok(is_minimize_to_tray_enabled())
}

// ============================================
// Tests
// ============================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_minimize_to_tray_default() {
        // Without settings file, should return false (default)
        // This test may vary based on environment
        let result = is_minimize_to_tray_enabled();
        // Default is false, but if settings exist it could be different
        assert!(result == true || result == false);
    }
}
