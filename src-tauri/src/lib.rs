pub mod export;
pub mod ffmpeg;
pub mod file_handler;
pub mod models;
pub mod sidecar;
pub mod storage;
pub mod tray;

use std::sync::Arc;
use tauri::{Manager, Emitter};
use sidecar::SidecarManager;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Start a transcription job
/// 
/// Requirements: 2.3
#[tauri::command]
async fn start_transcription(
    app: tauri::AppHandle,
    state: tauri::State<'_, Arc<SidecarManager>>,
    file_path: String,
    model_size: models::ModelSize,
) -> Result<String, String> {
    state
        .start_transcription(app, file_path, model_size)
        .await
        .map_err(|e| e.to_string())
}

/// Cancel an active transcription job
/// 
/// Requirements: 2.8
#[tauri::command]
async fn cancel_transcription(
    state: tauri::State<'_, Arc<SidecarManager>>,
    job_id: String,
) -> Result<(), String> {
    state
        .cancel_transcription(&job_id)
        .await
        .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // Initialize the sidecar manager as managed state
            let sidecar_manager = Arc::new(SidecarManager::new());
            app.manage(sidecar_manager);

            // Setup system tray
            // Requirements: 8.1
            if let Err(e) = tray::setup_tray(app.handle()) {
                eprintln!("Failed to setup system tray: {}", e);
            }

            // Setup window close handler for minimize to tray behavior
            // Requirements: 8.2, 8.5
            let main_window = app.get_webview_window("main");
            if let Some(window) = main_window {
                let app_handle = app.handle().clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        // Prevent default close behavior
                        api.prevent_close();
                        
                        let app_clone = app_handle.clone();
                        tauri::async_runtime::spawn(async move {
                            // Check if minimize to tray is enabled
                            let minimize_to_tray = tray::is_minimize_to_tray_enabled();
                            
                            // Check if there are active transcription jobs
                            let has_active_jobs = tray::has_active_transcription(&app_clone).await;
                            
                            if has_active_jobs {
                                // Emit event to frontend to show confirmation dialog
                                // Requirements: 8.5
                                let _ = app_clone.emit(tray::CLOSE_CONFIRMATION_EVENT, ());
                            } else if minimize_to_tray {
                                // Minimize to tray instead of closing
                                // Requirements: 8.2
                                tray::hide_main_window(&app_clone);
                            } else {
                                // No active jobs and minimize to tray disabled, quit
                                app_clone.exit(0);
                            }
                        });
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            ffmpeg::check_ffmpeg,
            file_handler::get_file_metadata,
            file_handler::validate_file,
            start_transcription,
            cancel_transcription,
            export::export_transcript_to_file,
            export::export_with_dialog,
            storage::get_history,
            storage::delete_history_item,
            storage::load_history_item,
            storage::save_transcript,
            storage::get_settings,
            storage::save_settings,
            tray::has_active_jobs,
            tray::confirm_quit,
            tray::minimize_to_tray,
            tray::show_from_tray,
            tray::get_minimize_to_tray_enabled
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
