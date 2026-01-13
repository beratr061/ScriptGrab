//! ScriptGrab Sidecar Management Module
//! 
//! Handles spawning, managing, and communicating with the whisper-engine sidecar process.
//! 
//! Requirements: 2.3, 2.4, 2.8

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use tauri::{AppHandle, Emitter};
use tauri_plugin_shell::{ShellExt, process::CommandChild};
use serde::Serialize;
use uuid::Uuid;

use crate::models::{AppError, ModelSize, Segment, SidecarMessage};

// ============================================
// Types
// ============================================

/// Represents an active transcription job
#[derive(Debug)]
pub struct TranscriptionJob {
    pub id: String,
    pub file_path: String,
    pub model_size: ModelSize,
    pub child: Option<CommandChild>,
}

/// Event payload for transcription progress
#[derive(Debug, Clone, Serialize)]
pub struct TranscriptionProgressPayload {
    pub job_id: String,
    pub percent: u32,
    pub status: String,
}

/// Event payload for transcription segment
#[derive(Debug, Clone, Serialize)]
pub struct TranscriptionSegmentPayload {
    pub job_id: String,
    pub segment: Segment,
}

/// Event payload for transcription completion
#[derive(Debug, Clone, Serialize)]
pub struct TranscriptionCompletePayload {
    pub job_id: String,
    pub language: String,
    pub duration: f64,
}

/// Event payload for transcription error
#[derive(Debug, Clone, Serialize)]
pub struct TranscriptionErrorPayload {
    pub job_id: String,
    pub message: String,
}

// ============================================
// Sidecar Manager
// ============================================

/// Manages active transcription jobs and sidecar processes
pub struct SidecarManager {
    jobs: Arc<Mutex<HashMap<String, TranscriptionJob>>>,
}

impl SidecarManager {
    pub fn new() -> Self {
        Self {
            jobs: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Generate a new unique job ID
    pub fn generate_job_id() -> String {
        Uuid::new_v4().to_string()
    }

    /// Start a new transcription job
    /// 
    /// Spawns the whisper-engine sidecar and sets up stdout/stderr handling.
    /// Emits events to the frontend for progress, segments, completion, and errors.
    pub async fn start_transcription(
        &self,
        app: AppHandle,
        file_path: String,
        model_size: ModelSize,
    ) -> Result<String, AppError> {
        let job_id = Self::generate_job_id();
        
        // Validate file exists
        if !std::path::Path::new(&file_path).exists() {
            return Err(AppError::FileNotFound(file_path));
        }

        // Get model size string
        let model_str = match model_size {
            ModelSize::Base => "base",
            ModelSize::Small => "small",
            ModelSize::Medium => "medium",
        };

        // Create the sidecar command
        let shell = app.shell();
        let sidecar_command = shell
            .sidecar("whisper-engine")
            .map_err(|e| AppError::SidecarError(format!("Failed to create sidecar command: {}", e)))?
            .args([&file_path, "--model", model_str]);

        // Spawn the sidecar process
        let (mut rx, child) = sidecar_command
            .spawn()
            .map_err(|e| AppError::SidecarError(format!("Failed to spawn sidecar: {}", e)))?;

        // Store the job
        {
            let mut jobs = self.jobs.lock().await;
            jobs.insert(job_id.clone(), TranscriptionJob {
                id: job_id.clone(),
                file_path: file_path.clone(),
                model_size,
                child: Some(child),
            });
        }

        // Clone values for the async task
        let job_id_clone = job_id.clone();
        let app_clone = app.clone();
        let jobs_clone = self.jobs.clone();

        // Spawn a task to handle sidecar output
        tauri::async_runtime::spawn(async move {
            use tauri_plugin_shell::process::CommandEvent;

            while let Some(event) = rx.recv().await {
                match event {
                    CommandEvent::Stdout(line) => {
                        let line_str = String::from_utf8_lossy(&line);
                        if let Err(e) = handle_sidecar_output(&app_clone, &job_id_clone, &line_str) {
                            eprintln!("Error handling sidecar output: {}", e);
                        }
                    }
                    CommandEvent::Stderr(line) => {
                        let line_str = String::from_utf8_lossy(&line);
                        eprintln!("Sidecar stderr: {}", line_str);
                    }
                    CommandEvent::Error(error) => {
                        let _ = app_clone.emit("transcription_error", TranscriptionErrorPayload {
                            job_id: job_id_clone.clone(),
                            message: error.clone(),
                        });
                    }
                    CommandEvent::Terminated(payload) => {
                        // Clean up the job when process terminates
                        let mut jobs = jobs_clone.lock().await;
                        jobs.remove(&job_id_clone);
                        
                        // If terminated with non-zero exit code, emit error
                        if let Some(code) = payload.code {
                            if code != 0 {
                                let _ = app_clone.emit("transcription_error", TranscriptionErrorPayload {
                                    job_id: job_id_clone.clone(),
                                    message: format!("Process exited with code: {}", code),
                                });
                            }
                        }
                    }
                    _ => {}
                }
            }
        });

        Ok(job_id)
    }

    /// Cancel an active transcription job
    /// 
    /// Kills the sidecar process and removes the job from tracking.
    pub async fn cancel_transcription(&self, job_id: &str) -> Result<(), AppError> {
        let mut jobs = self.jobs.lock().await;
        
        if let Some(mut job) = jobs.remove(job_id) {
            if let Some(child) = job.child.take() {
                child.kill()
                    .map_err(|e| AppError::SidecarError(format!("Failed to kill process: {}", e)))?;
            }
            Ok(())
        } else {
            Err(AppError::SidecarError(format!("Job not found: {}", job_id)))
        }
    }

    /// Check if a job is currently active
    pub async fn is_job_active(&self, job_id: &str) -> bool {
        let jobs = self.jobs.lock().await;
        jobs.contains_key(job_id)
    }

    /// Get the number of active jobs
    pub async fn active_job_count(&self) -> usize {
        let jobs = self.jobs.lock().await;
        jobs.len()
    }
}

impl Default for SidecarManager {
    fn default() -> Self {
        Self::new()
    }
}

// ============================================
// Output Handling
// ============================================

/// Parse and handle a line of output from the sidecar process
fn handle_sidecar_output(
    app: &AppHandle,
    job_id: &str,
    line: &str,
) -> Result<(), AppError> {
    let line = line.trim();
    if line.is_empty() {
        return Ok(());
    }

    // Parse the JSON message
    let message: SidecarMessage = serde_json::from_str(line)
        .map_err(|e| AppError::SidecarError(format!("Failed to parse sidecar output: {} - Line: {}", e, line)))?;

    match message {
        SidecarMessage::Progress { percent, status } => {
            app.emit("transcription_progress", TranscriptionProgressPayload {
                job_id: job_id.to_string(),
                percent,
                status,
            }).map_err(|e| AppError::SidecarError(format!("Failed to emit progress: {}", e)))?;
        }
        SidecarMessage::Segment { data } => {
            app.emit("transcription_segment", TranscriptionSegmentPayload {
                job_id: job_id.to_string(),
                segment: data,
            }).map_err(|e| AppError::SidecarError(format!("Failed to emit segment: {}", e)))?;
        }
        SidecarMessage::Complete { language, duration } => {
            app.emit("transcription_complete", TranscriptionCompletePayload {
                job_id: job_id.to_string(),
                language,
                duration,
            }).map_err(|e| AppError::SidecarError(format!("Failed to emit complete: {}", e)))?;
        }
        SidecarMessage::Error { message } => {
            app.emit("transcription_error", TranscriptionErrorPayload {
                job_id: job_id.to_string(),
                message,
            }).map_err(|e| AppError::SidecarError(format!("Failed to emit error: {}", e)))?;
        }
    }

    Ok(())
}

// ============================================
// Tests
// ============================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_job_id() {
        let id1 = SidecarManager::generate_job_id();
        let id2 = SidecarManager::generate_job_id();
        
        // IDs should be unique
        assert_ne!(id1, id2);
        
        // IDs should be valid UUIDs
        assert!(Uuid::parse_str(&id1).is_ok());
        assert!(Uuid::parse_str(&id2).is_ok());
    }

    #[test]
    fn test_sidecar_manager_new() {
        let manager = SidecarManager::new();
        // Manager should be created successfully
        assert!(Arc::strong_count(&manager.jobs) >= 1);
    }

    #[tokio::test]
    async fn test_active_job_count_empty() {
        let manager = SidecarManager::new();
        assert_eq!(manager.active_job_count().await, 0);
    }

    #[tokio::test]
    async fn test_is_job_active_nonexistent() {
        let manager = SidecarManager::new();
        assert!(!manager.is_job_active("nonexistent-job-id").await);
    }

    #[tokio::test]
    async fn test_cancel_nonexistent_job() {
        let manager = SidecarManager::new();
        let result = manager.cancel_transcription("nonexistent-job-id").await;
        assert!(result.is_err());
    }
}
