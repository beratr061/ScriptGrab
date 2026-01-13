//! Export functionality for ScriptGrab
//! Requirements: 5.1, 5.2, 5.3, 5.4, 5.5

use crate::models::{AppError, ExportFormat, Transcript};
use std::fs;

/// Format time in SRT format (HH:MM:SS,mmm)
fn format_srt_time(seconds: f64) -> String {
    let total_seconds = seconds.max(0.0);
    let hours = (total_seconds / 3600.0).floor() as u32;
    let minutes = ((total_seconds % 3600.0) / 60.0).floor() as u32;
    let secs = (total_seconds % 60.0).floor() as u32;
    let millis = ((total_seconds % 1.0) * 1000.0).round() as u32;
    
    // Handle millisecond overflow (e.g., 999.9999... -> 1000)
    let (secs, millis) = if millis >= 1000 {
        (secs + 1, millis - 1000)
    } else {
        (secs, millis)
    };
    
    format!(
        "{:02}:{:02}:{:02},{:03}",
        hours, minutes, secs, millis
    )
}

/// Export transcript to plain text format
/// Requirements: 5.2 - Generate plain text without timestamps
pub fn export_to_txt(transcript: &Transcript) -> String {
    transcript
        .segments
        .iter()
        .map(|s| s.text.as_str())
        .collect::<Vec<_>>()
        .join(" ")
}

/// Export transcript to SRT subtitle format
/// Requirements: 5.3 - Generate valid subtitle format with sequential numbering and timestamps
pub fn export_to_srt(transcript: &Transcript) -> String {
    transcript
        .segments
        .iter()
        .enumerate()
        .map(|(index, segment)| {
            let number = index + 1;
            let start_time = format_srt_time(segment.start);
            let end_time = format_srt_time(segment.end);
            format!("{}\n{} --> {}\n{}", number, start_time, end_time, segment.text)
        })
        .collect::<Vec<_>>()
        .join("\n\n")
}

/// Export transcript to JSON format
/// Requirements: 5.4 - Include all segment data with word-level timestamps
pub fn export_to_json(transcript: &Transcript) -> Result<String, AppError> {
    serde_json::to_string_pretty(transcript)
        .map_err(|e| AppError::StorageError(format!("JSON serialization failed: {}", e)))
}

/// Export transcript to specified format
/// Requirements: 5.1 - Provide export options for TXT, SRT, and JSON formats
pub fn export_transcript(transcript: &Transcript, format: ExportFormat) -> Result<String, AppError> {
    match format {
        ExportFormat::Txt => Ok(export_to_txt(transcript)),
        ExportFormat::Srt => Ok(export_to_srt(transcript)),
        ExportFormat::Json => export_to_json(transcript),
    }
}

/// Get file extension for export format
fn get_extension(format: ExportFormat) -> &'static str {
    match format {
        ExportFormat::Txt => "txt",
        ExportFormat::Srt => "srt",
        ExportFormat::Json => "json",
    }
}

/// Export transcript to file
/// Requirements: 5.5 - Open native save dialog with appropriate file extension
#[tauri::command]
pub async fn export_transcript_to_file(
    transcript: Transcript,
    format: ExportFormat,
    output_path: String,
) -> Result<(), String> {
    // Generate content based on format
    let content = export_transcript(&transcript, format).map_err(|e| e.to_string())?;
    
    // Write to file
    fs::write(&output_path, content)
        .map_err(|e| format!("Failed to write file: {}", e))?;
    
    Ok(())
}

/// Show save dialog and export transcript
/// Requirements: 5.5 - Open native save dialog with appropriate file extension
#[tauri::command]
pub async fn export_with_dialog(
    app: tauri::AppHandle,
    transcript: Transcript,
    format: ExportFormat,
    default_name: String,
) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    
    let extension = get_extension(format);
    let file_name = format!("{}.{}", default_name, extension);
    
    // Create save dialog
    let file_path = app
        .dialog()
        .file()
        .set_file_name(&file_name)
        .add_filter(
            match format {
                ExportFormat::Txt => "Text Files",
                ExportFormat::Srt => "Subtitle Files",
                ExportFormat::Json => "JSON Files",
            },
            &[extension],
        )
        .blocking_save_file();
    
    match file_path {
        Some(path) => {
            let path_str = path.to_string();
            
            // Generate content based on format
            let content = export_transcript(&transcript, format).map_err(|e| e.to_string())?;
            
            // Write to file
            fs::write(&path_str, content)
                .map_err(|e| format!("Failed to write file: {}", e))?;
            
            Ok(Some(path_str))
        }
        None => Ok(None), // User cancelled
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{Segment, Word};

    fn create_test_transcript() -> Transcript {
        Transcript {
            segments: vec![
                Segment {
                    id: "seg1".to_string(),
                    start: 0.0,
                    end: 3.5,
                    text: "Hello world.".to_string(),
                    words: vec![
                        Word { word: "Hello".to_string(), start: 0.0, end: 0.8 },
                        Word { word: "world.".to_string(), start: 0.9, end: 1.5 },
                    ],
                },
                Segment {
                    id: "seg2".to_string(),
                    start: 3.6,
                    end: 6.2,
                    text: "This is a test.".to_string(),
                    words: vec![
                        Word { word: "This".to_string(), start: 3.6, end: 3.9 },
                        Word { word: "is".to_string(), start: 4.0, end: 4.2 },
                        Word { word: "a".to_string(), start: 4.3, end: 4.4 },
                        Word { word: "test.".to_string(), start: 4.5, end: 5.0 },
                    ],
                },
            ],
            language: "en".to_string(),
            duration: 6.2,
        }
    }

    #[test]
    fn test_export_to_txt() {
        let transcript = create_test_transcript();
        let txt = export_to_txt(&transcript);
        
        assert_eq!(txt, "Hello world. This is a test.");
        assert!(!txt.contains("-->"));
        assert!(!txt.contains(":"));
    }

    #[test]
    fn test_export_to_srt() {
        let transcript = create_test_transcript();
        let srt = export_to_srt(&transcript);
        
        // Check sequential numbering
        assert!(srt.starts_with("1\n"));
        assert!(srt.contains("2\n"));
        
        // Check timestamp format
        assert!(srt.contains("00:00:00,000 --> 00:00:03,500"));
        assert!(srt.contains("00:00:03,600 --> 00:00:06,200"));
        
        // Check text content
        assert!(srt.contains("Hello world."));
        assert!(srt.contains("This is a test."));
    }

    #[test]
    fn test_export_to_json() {
        let transcript = create_test_transcript();
        let json = export_to_json(&transcript).unwrap();
        
        // Should be valid JSON
        let parsed: Transcript = serde_json::from_str(&json).unwrap();
        
        assert_eq!(parsed.language, "en");
        assert_eq!(parsed.duration, 6.2);
        assert_eq!(parsed.segments.len(), 2);
    }

    #[test]
    fn test_format_srt_time() {
        assert_eq!(format_srt_time(0.0), "00:00:00,000");
        assert_eq!(format_srt_time(3.5), "00:00:03,500");
        assert_eq!(format_srt_time(65.123), "00:01:05,123");
        assert_eq!(format_srt_time(3661.5), "01:01:01,500");
    }

    #[test]
    fn test_format_srt_time_edge_cases() {
        // Test millisecond rounding
        assert_eq!(format_srt_time(0.9999), "00:00:01,000");
        
        // Test negative (should clamp to 0)
        assert_eq!(format_srt_time(-1.0), "00:00:00,000");
    }

    #[test]
    fn test_get_extension() {
        assert_eq!(get_extension(ExportFormat::Txt), "txt");
        assert_eq!(get_extension(ExportFormat::Srt), "srt");
        assert_eq!(get_extension(ExportFormat::Json), "json");
    }
}
