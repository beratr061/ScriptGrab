//! File Handler Module
//! Requirements: 1.1, 1.3, 1.4, 1.5
//!
//! This module provides functionality for file validation and metadata extraction.

use std::path::Path;
use std::process::Command;
use crate::models::{AppError, FileInfo};

/// Supported file extensions for transcription
/// Requirements: 1.3 - Support .mp3, .wav, .m4a, .mp4, .mkv
pub const SUPPORTED_EXTENSIONS: &[&str] = &[".mp3", ".wav", ".m4a", ".mp4", ".mkv"];

/// Validates if a file format is supported for transcription
/// Requirements: 1.1, 1.3, 1.4
///
/// # Arguments
/// * `file_path` - Path to the file to validate
///
/// # Returns
/// * `true` if the file extension is supported (case-insensitive)
/// * `false` otherwise
pub fn validate_file_format(file_path: &str) -> bool {
    let path = Path::new(file_path);
    
    match path.extension() {
        Some(ext) => {
            let ext_lower = format!(".{}", ext.to_string_lossy().to_lowercase());
            SUPPORTED_EXTENSIONS.contains(&ext_lower.as_str())
        }
        None => false,
    }
}

/// Gets the file extension from a path (lowercase, with dot)
pub fn get_file_extension(file_path: &str) -> Option<String> {
    let path = Path::new(file_path);
    path.extension()
        .map(|ext| format!(".{}", ext.to_string_lossy().to_lowercase()))
}

/// Extracts the file name from a path
pub fn get_file_name(file_path: &str) -> String {
    let path = Path::new(file_path);
    path.file_name()
        .map(|name| name.to_string_lossy().to_string())
        .unwrap_or_else(|| file_path.to_string())
}

/// Gets file size in bytes
fn get_file_size(file_path: &str) -> Result<u64, AppError> {
    let metadata = std::fs::metadata(file_path)
        .map_err(|_| AppError::FileNotFound(file_path.to_string()))?;
    Ok(metadata.len())
}

/// Gets media duration using FFprobe
/// Returns duration in seconds
fn get_media_duration(file_path: &str) -> Result<f64, AppError> {
    // Try ffprobe in PATH first
    let output = Command::new("ffprobe")
        .args([
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            file_path,
        ])
        .output();

    match output {
        Ok(output) if output.status.success() => {
            let duration_str = String::from_utf8_lossy(&output.stdout);
            duration_str
                .trim()
                .parse::<f64>()
                .map_err(|_| AppError::InvalidInput("Could not parse duration".to_string()))
        }
        _ => {
            // Try ffprobe in app directory
            if let Some(app_dir) = get_app_directory() {
                #[cfg(target_os = "windows")]
                let ffprobe_path = app_dir.join("ffprobe.exe");
                
                #[cfg(not(target_os = "windows"))]
                let ffprobe_path = app_dir.join("ffprobe");

                if ffprobe_path.exists() {
                    let output = Command::new(&ffprobe_path)
                        .args([
                            "-v", "error",
                            "-show_entries", "format=duration",
                            "-of", "default=noprint_wrappers=1:nokey=1",
                            file_path,
                        ])
                        .output()
                        .map_err(|e| AppError::SidecarError(e.to_string()))?;

                    if output.status.success() {
                        let duration_str = String::from_utf8_lossy(&output.stdout);
                        return duration_str
                            .trim()
                            .parse::<f64>()
                            .map_err(|_| AppError::InvalidInput("Could not parse duration".to_string()));
                    }
                }
            }
            
            // Return 0 if we can't get duration (FFprobe not available)
            // The actual duration will be determined during transcription
            Ok(0.0)
        }
    }
}

/// Gets the application directory
fn get_app_directory() -> Option<std::path::PathBuf> {
    std::env::current_exe()
        .ok()?
        .parent()
        .map(|p| p.to_path_buf())
}

/// Gets file metadata including name, path, size, and duration
/// Requirements: 1.5 - Display file metadata (name, duration, size)
///
/// # Arguments
/// * `file_path` - Path to the file
///
/// # Returns
/// * `FileInfo` with file metadata
/// * Error if file doesn't exist or format is unsupported
pub fn get_file_metadata_internal(file_path: &str) -> Result<FileInfo, AppError> {
    // Check if file exists
    if !Path::new(file_path).exists() {
        return Err(AppError::FileNotFound(file_path.to_string()));
    }

    // Validate file format
    if !validate_file_format(file_path) {
        let ext = get_file_extension(file_path).unwrap_or_else(|| "unknown".to_string());
        return Err(AppError::UnsupportedFormat(ext));
    }

    // Get file name
    let name = get_file_name(file_path);

    // Get file size
    let size = get_file_size(file_path)?;

    // Get duration (may be 0 if FFprobe is not available)
    let duration = get_media_duration(file_path).unwrap_or(0.0);

    Ok(FileInfo {
        name,
        path: file_path.to_string(),
        size,
        duration,
    })
}

/// Tauri command to get file metadata
/// Requirements: 1.5 - Display file metadata (name, duration, size)
///
/// # Arguments
/// * `file_path` - Path to the file
///
/// # Returns
/// * `FileInfo` with file metadata
/// * Error string if file doesn't exist or format is unsupported
#[tauri::command]
pub async fn get_file_metadata(file_path: String) -> Result<FileInfo, String> {
    get_file_metadata_internal(&file_path).map_err(|e| e.to_string())
}

/// Tauri command to validate file format
/// Requirements: 1.1, 1.3, 1.4
///
/// # Arguments
/// * `file_path` - Path to the file to validate
///
/// # Returns
/// * `true` if format is supported, `false` otherwise
#[tauri::command]
pub async fn validate_file(file_path: String) -> bool {
    validate_file_format(&file_path)
}

/// Get supported formats as a comma-separated string
pub fn get_supported_formats_string() -> String {
    SUPPORTED_EXTENSIONS
        .iter()
        .map(|ext| ext.trim_start_matches('.').to_uppercase())
        .collect::<Vec<_>>()
        .join(", ")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_file_format_supported() {
        assert!(validate_file_format("audio.mp3"));
        assert!(validate_file_format("audio.wav"));
        assert!(validate_file_format("audio.m4a"));
        assert!(validate_file_format("video.mp4"));
        assert!(validate_file_format("video.mkv"));
    }

    #[test]
    fn test_validate_file_format_case_insensitive() {
        assert!(validate_file_format("audio.MP3"));
        assert!(validate_file_format("audio.Mp3"));
        assert!(validate_file_format("audio.WAV"));
        assert!(validate_file_format("video.MKV"));
    }

    #[test]
    fn test_validate_file_format_unsupported() {
        assert!(!validate_file_format("document.txt"));
        assert!(!validate_file_format("image.jpg"));
        assert!(!validate_file_format("program.exe"));
        assert!(!validate_file_format("archive.zip"));
    }

    #[test]
    fn test_validate_file_format_no_extension() {
        assert!(!validate_file_format("noextension"));
        assert!(!validate_file_format(""));
    }

    #[test]
    fn test_validate_file_format_with_path() {
        assert!(validate_file_format("/path/to/audio.mp3"));
        assert!(validate_file_format("C:\\Users\\test\\audio.wav"));
        assert!(validate_file_format("./relative/path/video.mp4"));
    }

    #[test]
    fn test_get_file_extension() {
        assert_eq!(get_file_extension("audio.mp3"), Some(".mp3".to_string()));
        assert_eq!(get_file_extension("audio.MP3"), Some(".mp3".to_string()));
        assert_eq!(get_file_extension("noext"), None);
    }

    #[test]
    fn test_get_file_name() {
        assert_eq!(get_file_name("/path/to/audio.mp3"), "audio.mp3");
        assert_eq!(get_file_name("audio.mp3"), "audio.mp3");
        assert_eq!(get_file_name("C:\\Users\\test\\video.mp4"), "video.mp4");
    }

    #[test]
    fn test_get_supported_formats_string() {
        let formats = get_supported_formats_string();
        assert!(formats.contains("MP3"));
        assert!(formats.contains("WAV"));
        assert!(formats.contains("M4A"));
        assert!(formats.contains("MP4"));
        assert!(formats.contains("MKV"));
    }
}

#[cfg(test)]
mod property_tests {
    use super::*;
    use proptest::prelude::*;

    /// Feature: scriptgrab-transcriber, Property 2: File Format Validation
    ///
    /// *For any* file path string, the validation function SHALL return true
    /// if and only if the file extension is one of: .mp3, .wav, .m4a, .mp4, .mkv
    /// (case-insensitive).
    ///
    /// **Validates: Requirements 1.1, 1.3, 1.4**

    // Generate a valid filename without extension
    fn filename_strategy() -> impl Strategy<Value = String> {
        "[a-zA-Z0-9_-]{1,50}".prop_filter("non-empty", |s| !s.is_empty())
    }

    // Generate a supported extension
    fn supported_extension_strategy() -> impl Strategy<Value = &'static str> {
        prop_oneof![
            Just(".mp3"),
            Just(".wav"),
            Just(".m4a"),
            Just(".mp4"),
            Just(".mkv"),
        ]
    }

    // Generate an unsupported extension
    fn unsupported_extension_strategy() -> impl Strategy<Value = &'static str> {
        prop_oneof![
            Just(".exe"),
            Just(".txt"),
            Just(".pdf"),
            Just(".jpg"),
            Just(".png"),
            Just(".zip"),
            Just(".doc"),
            Just(".html"),
            Just(".ogg"),
            Just(".flac"),
        ]
    }

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        #[test]
        fn prop_accepts_supported_extensions_lowercase(
            filename in filename_strategy(),
            ext in supported_extension_strategy()
        ) {
            let file_path = format!("{}{}", filename, ext);
            prop_assert!(validate_file_format(&file_path),
                "Should accept supported extension: {}", file_path);
        }

        #[test]
        fn prop_accepts_supported_extensions_case_insensitive(
            filename in filename_strategy(),
            ext in supported_extension_strategy()
        ) {
            // Test uppercase
            let upper_path = format!("{}{}", filename, ext.to_uppercase());
            prop_assert!(validate_file_format(&upper_path),
                "Should accept uppercase extension: {}", upper_path);
            
            // Test mixed case
            let mixed_ext = ext.chars().enumerate()
                .map(|(i, c)| if i % 2 == 0 { c.to_uppercase().to_string() } else { c.to_lowercase().to_string() })
                .collect::<String>();
            let mixed_path = format!("{}{}", filename, mixed_ext);
            prop_assert!(validate_file_format(&mixed_path),
                "Should accept mixed case extension: {}", mixed_path);
        }

        #[test]
        fn prop_rejects_unsupported_extensions(
            filename in filename_strategy(),
            ext in unsupported_extension_strategy()
        ) {
            let file_path = format!("{}{}", filename, ext);
            prop_assert!(!validate_file_format(&file_path),
                "Should reject unsupported extension: {}", file_path);
        }

        #[test]
        fn prop_rejects_files_without_extension(
            filename in filename_strategy()
        ) {
            prop_assert!(!validate_file_format(&filename),
                "Should reject file without extension: {}", filename);
        }

        #[test]
        fn prop_handles_paths_with_directories(
            dirs in proptest::collection::vec(filename_strategy(), 1..5),
            filename in filename_strategy(),
            ext in supported_extension_strategy()
        ) {
            let path = format!("{}/{}{}", dirs.join("/"), filename, ext);
            prop_assert!(validate_file_format(&path),
                "Should accept file with directory path: {}", path);
        }

        #[test]
        fn prop_get_extension_returns_lowercase(
            filename in filename_strategy(),
            ext in supported_extension_strategy()
        ) {
            // Test with uppercase extension
            let upper_path = format!("{}{}", filename, ext.to_uppercase());
            let extracted = get_file_extension(&upper_path);
            prop_assert_eq!(extracted, Some(ext.to_string()),
                "Extension should be normalized to lowercase");
        }

        #[test]
        fn prop_get_file_name_extracts_correctly(
            dirs in proptest::collection::vec(filename_strategy(), 0..3),
            filename in filename_strategy(),
            ext in supported_extension_strategy()
        ) {
            let expected_name = format!("{}{}", filename, ext);
            let path = if dirs.is_empty() {
                expected_name.clone()
            } else {
                format!("{}/{}", dirs.join("/"), expected_name)
            };
            
            let extracted = get_file_name(&path);
            prop_assert_eq!(extracted, expected_name,
                "Should extract filename from path");
        }
    }
}
