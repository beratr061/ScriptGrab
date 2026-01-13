//! ScriptGrab Data Models
//! Requirements: 2.1, 2.2, 2.8

use serde::{Deserialize, Serialize};

// ============================================
// Export Format Enum
// ============================================

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ExportFormat {
    Txt,
    Srt,
    Json,
}

// ============================================
// Core Transcript Types
// ============================================

/// Represents a single word with its timestamp
/// Requirements: 2.7 (word-level timestamps)
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Word {
    pub word: String,
    pub start: f64,
    pub end: f64,
}

/// Represents a transcript segment with text and timestamps
/// Requirements: 2.6 (timestamps)
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Segment {
    pub id: String,
    pub start: f64,
    pub end: f64,
    pub text: String,
    pub words: Vec<Word>,
}

/// Complete transcript data structure
/// Requirements: 2.6, 2.7
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Transcript {
    pub segments: Vec<Segment>,
    pub language: String,
    pub duration: f64,
}

// ============================================
// File and Metadata Types
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub duration: f64,
}

// ============================================
// History Types
// ============================================

/// History item for saved transcripts
/// Requirements: 6.1 (save transcript with metadata)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryItem {
    pub id: String,
    #[serde(rename = "fileName")]
    pub file_name: String,
    #[serde(rename = "filePath")]
    pub file_path: String,
    pub date: String,
    pub duration: f64,
    pub language: String,
}

/// Stored transcript with full metadata
/// Requirements: 6.1
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoredTranscript {
    pub id: String,
    #[serde(rename = "fileName")]
    pub file_name: String,
    #[serde(rename = "filePath")]
    pub file_path: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    pub duration: f64,
    pub language: String,
    #[serde(rename = "modelSize")]
    pub model_size: ModelSize,
    pub segments: Vec<Segment>,
}

// ============================================
// Queue Types
// ============================================

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum QueueItemStatus {
    Pending,
    Processing,
    Completed,
    Error,
}

/// Queue item for batch processing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueueItem {
    pub id: String,
    #[serde(rename = "filePath")]
    pub file_path: String,
    #[serde(rename = "fileName")]
    pub file_name: String,
    pub status: QueueItemStatus,
    pub progress: f64,
    #[serde(rename = "addedAt")]
    pub added_at: String,
}

// ============================================
// Settings Types
// ============================================

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ModelSize {
    Base,
    Small,
    Medium,
}

impl Default for ModelSize {
    fn default() -> Self {
        ModelSize::Base
    }
}

/// Application settings
/// Requirements: 5.1 (export formats), 9.1-9.5
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    #[serde(rename = "modelSize")]
    pub model_size: ModelSize,
    #[serde(rename = "minimizeToTray")]
    pub minimize_to_tray: bool,
    #[serde(rename = "defaultExportFormat")]
    pub default_export_format: ExportFormat,
    #[serde(rename = "autoCheckUpdates")]
    pub auto_check_updates: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Settings {
            model_size: ModelSize::Base,
            minimize_to_tray: false,
            default_export_format: ExportFormat::Txt,
            auto_check_updates: true,
        }
    }
}

// ============================================
// Sidecar Message Types (Python -> Rust -> Frontend)
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum SidecarMessage {
    Progress { percent: u32, status: String },
    Segment { data: Segment },
    Complete { language: String, duration: f64 },
    Error { message: String },
}

// ============================================
// Model Info Types
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelInfo {
    pub name: ModelSize,
    pub size: String,
    pub downloaded: bool,
}

// ============================================
// Error Types
// ============================================

/// Application error types
/// Requirements: 2.1, 2.2, 2.8
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "message")]
pub enum AppError {
    FileNotFound(String),
    UnsupportedFormat(String),
    TranscriptionFailed(String),
    StorageError(String),
    ModelNotFound(String),
    ModelDownloadFailed(String),
    SidecarError(String),
    FFmpegNotFound,
    InvalidInput(String),
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AppError::FileNotFound(path) => write!(f, "File not found: {}", path),
            AppError::UnsupportedFormat(ext) => write!(f, "Unsupported format: {}", ext),
            AppError::TranscriptionFailed(msg) => write!(f, "Transcription failed: {}", msg),
            AppError::StorageError(msg) => write!(f, "Storage error: {}", msg),
            AppError::ModelNotFound(model) => write!(f, "Model not found: {}", model),
            AppError::ModelDownloadFailed(msg) => write!(f, "Model download failed: {}", msg),
            AppError::SidecarError(msg) => write!(f, "Sidecar error: {}", msg),
            AppError::FFmpegNotFound => write!(
                f,
                "FFmpeg not found. Please install FFmpeg or ensure ffmpeg.exe is in the application directory."
            ),
            AppError::InvalidInput(msg) => write!(f, "Invalid input: {}", msg),
        }
    }
}

impl std::error::Error for AppError {}

impl From<AppError> for String {
    fn from(error: AppError) -> Self {
        error.to_string()
    }
}

// ============================================
// Transcript Data for Commands
// ============================================

/// Transcript data structure for Tauri commands
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptData {
    pub transcript: Transcript,
    #[serde(rename = "fileName")]
    pub file_name: String,
    #[serde(rename = "filePath")]
    pub file_path: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_export_format_serialization() {
        let format = ExportFormat::Srt;
        let json = serde_json::to_string(&format).unwrap();
        assert_eq!(json, "\"srt\"");
        
        let parsed: ExportFormat = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed, ExportFormat::Srt);
    }

    #[test]
    fn test_model_size_serialization() {
        let size = ModelSize::Medium;
        let json = serde_json::to_string(&size).unwrap();
        assert_eq!(json, "\"medium\"");
        
        let parsed: ModelSize = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed, ModelSize::Medium);
    }

    #[test]
    fn test_settings_default() {
        let settings = Settings::default();
        assert_eq!(settings.model_size, ModelSize::Base);
        assert!(!settings.minimize_to_tray);
        assert_eq!(settings.default_export_format, ExportFormat::Txt);
        assert!(settings.auto_check_updates);
    }

    #[test]
    fn test_app_error_display() {
        let error = AppError::FFmpegNotFound;
        let msg = error.to_string();
        assert!(msg.contains("FFmpeg not found"));
    }

    #[test]
    fn test_sidecar_message_serialization() {
        let progress = SidecarMessage::Progress {
            percent: 50,
            status: "Processing...".to_string(),
        };
        let json = serde_json::to_string(&progress).unwrap();
        assert!(json.contains("\"type\":\"progress\""));
        assert!(json.contains("\"percent\":50"));
    }
}
