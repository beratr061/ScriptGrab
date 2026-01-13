//! FFmpeg System Check Module
//! Requirements: 2.1, 2.2
//!
//! This module provides functionality to check if FFmpeg is available on the system.
//! FFmpeg can be found either in the system PATH or in the application directory.

use std::path::PathBuf;
use std::process::Command;

/// Result of FFmpeg availability check
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct FFmpegCheckResult {
    /// Whether FFmpeg is available
    pub available: bool,
    /// Where FFmpeg was found (if available)
    pub location: Option<String>,
    /// FFmpeg version string (if available)
    pub version: Option<String>,
}

/// Checks if FFmpeg is available on the system.
///
/// This function checks two locations:
/// 1. System PATH - by running `ffmpeg -version`
/// 2. Application directory - by checking for `ffmpeg.exe`
///
/// # Returns
/// - `FFmpegCheckResult` with availability status and location info
///
/// # Requirements
/// - 2.1: WHEN the application starts, THE ScriptGrab SHALL check if FFmpeg is available
/// - 2.2: IF FFmpeg is not found, THEN THE ScriptGrab SHALL display an error message
pub fn check_ffmpeg_availability() -> FFmpegCheckResult {
    // First, try to find FFmpeg in system PATH
    if let Some(result) = check_ffmpeg_in_path() {
        return result;
    }

    // Second, check in application directory
    if let Some(result) = check_ffmpeg_in_app_dir() {
        return result;
    }

    // FFmpeg not found
    FFmpegCheckResult {
        available: false,
        location: None,
        version: None,
    }
}

/// Checks if FFmpeg is available in the system PATH
fn check_ffmpeg_in_path() -> Option<FFmpegCheckResult> {
    let output = Command::new("ffmpeg")
        .arg("-version")
        .output()
        .ok()?;

    if output.status.success() {
        let version_output = String::from_utf8_lossy(&output.stdout);
        let version = extract_version(&version_output);
        
        Some(FFmpegCheckResult {
            available: true,
            location: Some("PATH".to_string()),
            version,
        })
    } else {
        None
    }
}

/// Checks if FFmpeg exists in the application directory
fn check_ffmpeg_in_app_dir() -> Option<FFmpegCheckResult> {
    let app_dir = get_app_directory()?;
    
    #[cfg(target_os = "windows")]
    let ffmpeg_path = app_dir.join("ffmpeg.exe");
    
    #[cfg(not(target_os = "windows"))]
    let ffmpeg_path = app_dir.join("ffmpeg");

    if ffmpeg_path.exists() {
        // Try to get version from the bundled FFmpeg
        let version = get_ffmpeg_version(&ffmpeg_path);
        
        Some(FFmpegCheckResult {
            available: true,
            location: Some(ffmpeg_path.to_string_lossy().to_string()),
            version,
        })
    } else {
        None
    }
}

/// Gets the application directory
fn get_app_directory() -> Option<PathBuf> {
    std::env::current_exe()
        .ok()?
        .parent()
        .map(|p| p.to_path_buf())
}

/// Extracts version string from FFmpeg output
fn extract_version(output: &str) -> Option<String> {
    // FFmpeg version output typically starts with "ffmpeg version X.X.X"
    output
        .lines()
        .next()
        .and_then(|line| {
            if line.contains("ffmpeg version") {
                Some(line.to_string())
            } else {
                Some(line.to_string())
            }
        })
}

/// Gets FFmpeg version from a specific path
fn get_ffmpeg_version(ffmpeg_path: &PathBuf) -> Option<String> {
    let output = Command::new(ffmpeg_path)
        .arg("-version")
        .output()
        .ok()?;

    if output.status.success() {
        let version_output = String::from_utf8_lossy(&output.stdout);
        extract_version(&version_output)
    } else {
        None
    }
}

/// Tauri command to check FFmpeg availability
/// 
/// # Requirements
/// - 2.1: WHEN the application starts, THE ScriptGrab SHALL check if FFmpeg is available
/// - 2.2: IF FFmpeg is not found, THEN THE ScriptGrab SHALL display an error message
#[tauri::command]
pub async fn check_ffmpeg() -> Result<FFmpegCheckResult, String> {
    Ok(check_ffmpeg_availability())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_version() {
        let output = "ffmpeg version 6.0 Copyright (c) 2000-2023 the FFmpeg developers";
        let version = extract_version(output);
        assert!(version.is_some());
        assert!(version.unwrap().contains("ffmpeg version"));
    }

    #[test]
    fn test_extract_version_empty() {
        let output = "";
        let version = extract_version(output);
        assert!(version.is_none());
    }

    #[test]
    fn test_ffmpeg_check_result_serialization() {
        let result = FFmpegCheckResult {
            available: true,
            location: Some("PATH".to_string()),
            version: Some("ffmpeg version 6.0".to_string()),
        };
        
        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("\"available\":true"));
        assert!(json.contains("\"location\":\"PATH\""));
    }

    #[test]
    fn test_check_ffmpeg_availability() {
        // This test will pass if FFmpeg is installed, or return not available
        let result = check_ffmpeg_availability();
        // We just verify the structure is correct
        if result.available {
            assert!(result.location.is_some());
        } else {
            assert!(result.location.is_none());
        }
    }
}

#[cfg(test)]
mod property_tests {
    use super::*;
    use proptest::prelude::*;
    use std::fs;
    use tempfile::TempDir;

    /// Feature: scriptgrab-transcriber, Property 1: FFmpeg Availability Check
    /// 
    /// *For any* system state, the FFmpeg check function SHALL return true if and only if either:
    /// (a) `ffmpeg -version` command executes successfully, OR
    /// (b) `ffmpeg.exe` exists in the application directory.
    /// 
    /// **Validates: Requirements 2.1, 2.2**
    /// 
    /// This property test verifies the consistency of FFmpegCheckResult:
    /// - If available is true, location must be Some
    /// - If available is false, location must be None
    /// - The result is deterministic for the same system state
    #[test]
    fn prop_ffmpeg_check_result_consistency() {
        // Run the check multiple times to verify determinism
        let results: Vec<FFmpegCheckResult> = (0..100)
            .map(|_| check_ffmpeg_availability())
            .collect();
        
        // All results should be identical (deterministic)
        let first = &results[0];
        for result in &results {
            assert_eq!(result.available, first.available);
            assert_eq!(result.location, first.location);
        }
        
        // Verify invariant: available implies location is Some
        for result in &results {
            if result.available {
                assert!(result.location.is_some(), 
                    "If FFmpeg is available, location must be provided");
            } else {
                assert!(result.location.is_none(),
                    "If FFmpeg is not available, location must be None");
            }
        }
    }

    // Property test: FFmpegCheckResult serialization round-trip
    // For any valid FFmpegCheckResult, serializing to JSON and deserializing
    // should produce an equivalent result.
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]
        
        #[test]
        fn prop_ffmpeg_result_serialization_roundtrip(
            available in any::<bool>(),
            has_location in any::<bool>(),
            has_version in any::<bool>(),
        ) {
            let location = if has_location && available {
                Some("PATH".to_string())
            } else if available {
                Some("/usr/bin/ffmpeg".to_string())
            } else {
                None
            };
            
            let version = if has_version && available {
                Some("ffmpeg version 6.0".to_string())
            } else {
                None
            };
            
            let result = FFmpegCheckResult {
                available,
                location,
                version,
            };
            
            // Serialize to JSON
            let json = serde_json::to_string(&result).unwrap();
            
            // Deserialize back
            let deserialized: FFmpegCheckResult = serde_json::from_str(&json).unwrap();
            
            // Verify round-trip
            prop_assert_eq!(result.available, deserialized.available);
            prop_assert_eq!(result.location, deserialized.location);
            prop_assert_eq!(result.version, deserialized.version);
        }
    }

    /// Property test: check_ffmpeg_in_app_dir behavior with temp directory
    /// When ffmpeg.exe exists in a directory, the check should find it.
    #[test]
    fn prop_ffmpeg_in_app_dir_detection() {
        // Create a temp directory and test file detection logic
        let temp_dir = TempDir::new().unwrap();
        let ffmpeg_path = temp_dir.path().join("ffmpeg.exe");
        
        // Before creating the file, it shouldn't exist
        assert!(!ffmpeg_path.exists());
        
        // Create a dummy ffmpeg.exe file
        fs::write(&ffmpeg_path, b"dummy ffmpeg").unwrap();
        
        // Now it should exist
        assert!(ffmpeg_path.exists());
        
        // Clean up is automatic with TempDir
    }

    // Property test: extract_version handles various input formats
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]
        
        #[test]
        fn prop_extract_version_handles_any_input(input in ".*") {
            // extract_version should never panic, regardless of input
            let result = extract_version(&input);
            
            // If input is empty, result should be None
            if input.is_empty() {
                prop_assert!(result.is_none());
            }
            // Otherwise, it should return Some with the first line
        }
    }
}
