//! Storage Module for ScriptGrab
//! JSON file-based storage for transcripts and settings
//! Requirements: 6.1, 6.3, 9.5

use crate::models::{AppError, HistoryItem, Settings, StoredTranscript};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use uuid::Uuid;

/// Storage manager for handling transcript and settings persistence
pub struct StorageManager {
    storage_dir: PathBuf,
}

/// Index file structure for tracking all stored transcripts
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct TranscriptIndex {
    pub items: Vec<HistoryItem>,
}

impl StorageManager {
    /// Create a new storage manager with the given base directory
    pub fn new(storage_dir: PathBuf) -> Self {
        Self { storage_dir }
    }

    /// Get the default storage directory (app data directory)
    pub fn default_storage_dir() -> Result<PathBuf, AppError> {
        let base_dirs = directories::BaseDirs::new()
            .ok_or_else(|| AppError::StorageError("Cannot determine base directories".to_string()))?;
        
        let storage_dir = base_dirs.data_local_dir().join("ScriptGrab");
        Ok(storage_dir)
    }

    /// Ensure storage directories exist
    pub fn ensure_directories(&self) -> Result<(), AppError> {
        let transcripts_dir = self.storage_dir.join("transcripts");
        fs::create_dir_all(&transcripts_dir)
            .map_err(|e| AppError::StorageError(format!("Failed to create transcripts directory: {}", e)))?;
        Ok(())
    }

    /// Get the path to the transcript index file
    fn index_path(&self) -> PathBuf {
        self.storage_dir.join("transcript_index.json")
    }

    /// Get the path to the settings file
    fn settings_path(&self) -> PathBuf {
        self.storage_dir.join("settings.json")
    }

    /// Get the path to a transcript file by ID
    fn transcript_path(&self, id: &str) -> PathBuf {
        self.storage_dir.join("transcripts").join(format!("{}.json", id))
    }

    // ============================================
    // Transcript Index Operations
    // ============================================

    /// Load the transcript index
    pub fn load_index(&self) -> Result<TranscriptIndex, AppError> {
        let path = self.index_path();
        if !path.exists() {
            return Ok(TranscriptIndex::default());
        }

        let content = fs::read_to_string(&path)
            .map_err(|e| AppError::StorageError(format!("Failed to read index: {}", e)))?;
        
        serde_json::from_str(&content)
            .map_err(|e| AppError::StorageError(format!("Failed to parse index: {}", e)))
    }

    /// Save the transcript index
    fn save_index(&self, index: &TranscriptIndex) -> Result<(), AppError> {
        let path = self.index_path();
        let content = serde_json::to_string_pretty(index)
            .map_err(|e| AppError::StorageError(format!("Failed to serialize index: {}", e)))?;
        
        fs::write(&path, content)
            .map_err(|e| AppError::StorageError(format!("Failed to write index: {}", e)))
    }

    // ============================================
    // Transcript Operations
    // ============================================

    /// Save a transcript to storage
    /// Requirements: 6.1
    pub fn save_transcript(&self, transcript: &StoredTranscript) -> Result<(), AppError> {
        self.ensure_directories()?;

        // Save the transcript file
        let transcript_path = self.transcript_path(&transcript.id);
        let content = serde_json::to_string_pretty(transcript)
            .map_err(|e| AppError::StorageError(format!("Failed to serialize transcript: {}", e)))?;
        
        fs::write(&transcript_path, content)
            .map_err(|e| AppError::StorageError(format!("Failed to write transcript: {}", e)))?;

        // Update the index
        let mut index = self.load_index()?;
        
        // Remove existing entry if present (for updates)
        index.items.retain(|item| item.id != transcript.id);
        
        // Add new history item
        let history_item = HistoryItem {
            id: transcript.id.clone(),
            file_name: transcript.file_name.clone(),
            file_path: transcript.file_path.clone(),
            date: transcript.created_at.clone(),
            duration: transcript.duration,
            language: transcript.language.clone(),
        };
        index.items.push(history_item);
        
        // Sort by date descending (newest first)
        // Requirements: 6.5
        index.items.sort_by(|a, b| b.date.cmp(&a.date));
        
        self.save_index(&index)
    }

    /// Load a transcript by ID
    /// Requirements: 6.3
    pub fn load_transcript(&self, id: &str) -> Result<StoredTranscript, AppError> {
        let path = self.transcript_path(id);
        if !path.exists() {
            return Err(AppError::StorageError(format!("Transcript not found: {}", id)));
        }

        let content = fs::read_to_string(&path)
            .map_err(|e| AppError::StorageError(format!("Failed to read transcript: {}", e)))?;
        
        serde_json::from_str(&content)
            .map_err(|e| AppError::StorageError(format!("Failed to parse transcript: {}", e)))
    }

    /// Delete a transcript by ID
    /// Requirements: 6.4
    pub fn delete_transcript(&self, id: &str) -> Result<(), AppError> {
        // Remove the transcript file
        let path = self.transcript_path(id);
        if path.exists() {
            fs::remove_file(&path)
                .map_err(|e| AppError::StorageError(format!("Failed to delete transcript: {}", e)))?;
        }

        // Update the index
        let mut index = self.load_index()?;
        index.items.retain(|item| item.id != id);
        self.save_index(&index)
    }

    /// Get all history items (sorted by date descending)
    /// Requirements: 6.2, 6.5
    pub fn get_history(&self) -> Result<Vec<HistoryItem>, AppError> {
        let index = self.load_index()?;
        Ok(index.items)
    }

    // ============================================
    // Settings Operations
    // ============================================

    /// Load settings from storage
    /// Requirements: 9.5
    pub fn load_settings(&self) -> Result<Settings, AppError> {
        let path = self.settings_path();
        if !path.exists() {
            return Ok(Settings::default());
        }

        let content = fs::read_to_string(&path)
            .map_err(|e| AppError::StorageError(format!("Failed to read settings: {}", e)))?;
        
        serde_json::from_str(&content)
            .map_err(|e| AppError::StorageError(format!("Failed to parse settings: {}", e)))
    }

    /// Save settings to storage
    /// Requirements: 9.5
    pub fn save_settings(&self, settings: &Settings) -> Result<(), AppError> {
        self.ensure_directories()?;
        
        let path = self.settings_path();
        let content = serde_json::to_string_pretty(settings)
            .map_err(|e| AppError::StorageError(format!("Failed to serialize settings: {}", e)))?;
        
        fs::write(&path, content)
            .map_err(|e| AppError::StorageError(format!("Failed to write settings: {}", e)))
    }
}

/// Generate a new unique ID for transcripts
pub fn generate_id() -> String {
    Uuid::new_v4().to_string()
}

/// Get current timestamp in ISO 8601 format
pub fn current_timestamp() -> String {
    Utc::now().to_rfc3339()
}

// ============================================
// Tauri Commands
// ============================================

/// Get the default storage manager
pub fn get_storage_manager() -> Result<StorageManager, String> {
    let storage_dir = StorageManager::default_storage_dir()
        .map_err(|e| e.to_string())?;
    Ok(StorageManager::new(storage_dir))
}

/// Get all history items
/// Requirements: 6.2
#[tauri::command]
pub async fn get_history() -> Result<Vec<HistoryItem>, String> {
    let storage = get_storage_manager()?;
    storage.get_history().map_err(|e| e.to_string())
}

/// Delete a history item by ID
/// Requirements: 6.4
#[tauri::command]
pub async fn delete_history_item(id: String) -> Result<(), String> {
    let storage = get_storage_manager()?;
    storage.delete_transcript(&id).map_err(|e| e.to_string())
}

/// Load a history item (transcript) by ID
/// Requirements: 6.3
#[tauri::command]
pub async fn load_history_item(id: String) -> Result<StoredTranscript, String> {
    let storage = get_storage_manager()?;
    storage.load_transcript(&id).map_err(|e| e.to_string())
}

/// Save a transcript to storage
/// Requirements: 6.1
#[tauri::command]
pub async fn save_transcript(transcript: StoredTranscript) -> Result<(), String> {
    let storage = get_storage_manager()?;
    storage.save_transcript(&transcript).map_err(|e| e.to_string())
}

/// Get application settings
/// Requirements: 9.5
#[tauri::command]
pub async fn get_settings() -> Result<Settings, String> {
    let storage = get_storage_manager()?;
    storage.load_settings().map_err(|e| e.to_string())
}

/// Save application settings
/// Requirements: 9.5
#[tauri::command]
pub async fn save_settings(settings: Settings) -> Result<(), String> {
    let storage = get_storage_manager()?;
    storage.save_settings(&settings).map_err(|e| e.to_string())
}

// ============================================
// Tests
// ============================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{ExportFormat, ModelSize, Segment, Word};
    use tempfile::TempDir;

    fn create_test_storage() -> (StorageManager, TempDir) {
        let temp_dir = TempDir::new().unwrap();
        let storage = StorageManager::new(temp_dir.path().to_path_buf());
        (storage, temp_dir)
    }

    fn create_test_transcript(id: &str) -> StoredTranscript {
        StoredTranscript {
            id: id.to_string(),
            file_name: "test.mp3".to_string(),
            file_path: "/path/to/test.mp3".to_string(),
            created_at: current_timestamp(),
            duration: 120.5,
            language: "en".to_string(),
            model_size: ModelSize::Base,
            segments: vec![Segment {
                id: "seg_001".to_string(),
                start: 0.0,
                end: 3.5,
                text: "Hello world".to_string(),
                words: vec![
                    Word { word: "Hello".to_string(), start: 0.0, end: 0.8 },
                    Word { word: "world".to_string(), start: 0.9, end: 1.5 },
                ],
            }],
        }
    }

    #[test]
    fn test_save_and_load_transcript() {
        let (storage, _temp) = create_test_storage();
        let transcript = create_test_transcript("test_id_1");

        // Save
        storage.save_transcript(&transcript).unwrap();

        // Load
        let loaded = storage.load_transcript("test_id_1").unwrap();
        assert_eq!(loaded.id, transcript.id);
        assert_eq!(loaded.file_name, transcript.file_name);
        assert_eq!(loaded.segments.len(), transcript.segments.len());
    }

    #[test]
    fn test_delete_transcript() {
        let (storage, _temp) = create_test_storage();
        let transcript = create_test_transcript("test_id_2");

        storage.save_transcript(&transcript).unwrap();
        
        // Verify it exists
        assert!(storage.load_transcript("test_id_2").is_ok());

        // Delete
        storage.delete_transcript("test_id_2").unwrap();

        // Verify it's gone
        assert!(storage.load_transcript("test_id_2").is_err());
    }

    #[test]
    fn test_get_history() {
        let (storage, _temp) = create_test_storage();
        
        let transcript1 = create_test_transcript("id_1");
        let transcript2 = create_test_transcript("id_2");

        storage.save_transcript(&transcript1).unwrap();
        storage.save_transcript(&transcript2).unwrap();

        let history = storage.get_history().unwrap();
        assert_eq!(history.len(), 2);
    }

    #[test]
    fn test_save_and_load_settings() {
        let (storage, _temp) = create_test_storage();
        
        let settings = Settings {
            model_size: ModelSize::Medium,
            minimize_to_tray: true,
            default_export_format: ExportFormat::Srt,
            auto_check_updates: false,
        };

        storage.save_settings(&settings).unwrap();
        let loaded = storage.load_settings().unwrap();

        assert_eq!(loaded.model_size, settings.model_size);
        assert_eq!(loaded.minimize_to_tray, settings.minimize_to_tray);
        assert_eq!(loaded.default_export_format, settings.default_export_format);
        assert_eq!(loaded.auto_check_updates, settings.auto_check_updates);
    }

    #[test]
    fn test_default_settings() {
        let (storage, _temp) = create_test_storage();
        
        // Without saving, should return defaults
        let settings = storage.load_settings().unwrap();
        assert_eq!(settings.model_size, ModelSize::Base);
        assert!(!settings.minimize_to_tray);
    }
}


// ============================================
// Property-Based Tests
// ============================================

#[cfg(test)]
mod property_tests {
    use super::*;
    use crate::models::{ExportFormat, ModelSize, Segment, Word};
    use proptest::prelude::*;
    use tempfile::TempDir;

    // Arbitrary generators for test data
    fn arb_model_size() -> impl Strategy<Value = ModelSize> {
        prop_oneof![
            Just(ModelSize::Base),
            Just(ModelSize::Small),
            Just(ModelSize::Medium),
        ]
    }

    fn arb_export_format() -> impl Strategy<Value = ExportFormat> {
        prop_oneof![
            Just(ExportFormat::Txt),
            Just(ExportFormat::Srt),
            Just(ExportFormat::Json),
        ]
    }

    fn arb_word() -> impl Strategy<Value = Word> {
        (
            "[a-zA-Z]{1,20}",
            0.0f64..1000.0f64,
        ).prop_flat_map(|(word, start)| {
            let end_min = start + 0.1;
            (Just(word), Just(start), end_min..(start + 10.0))
        }).prop_map(|(word, start, end)| Word {
            word,
            start,
            end,
        })
    }

    fn arb_segment() -> impl Strategy<Value = Segment> {
        (
            "[a-zA-Z0-9_]{1,36}",
            0.0f64..1000.0f64,
            "[a-zA-Z ]{1,100}",
            prop::collection::vec(arb_word(), 0..5),
        ).prop_flat_map(|(id, start, text, words)| {
            let end_min = start + 0.5;
            (Just(id), Just(start), end_min..(start + 30.0), Just(text), Just(words))
        }).prop_map(|(id, start, end, text, words)| Segment {
            id,
            start,
            end,
            text,
            words,
        })
    }

    fn arb_stored_transcript() -> impl Strategy<Value = StoredTranscript> {
        (
            "[a-zA-Z0-9_-]{1,36}",
            "[a-zA-Z0-9_]{1,50}\\.(mp3|wav|m4a|mp4|mkv)",
            "/[a-zA-Z0-9_/]{1,100}",
            0.1f64..10000.0f64,
            "[a-z]{2}",
            arb_model_size(),
            prop::collection::vec(arb_segment(), 0..10),
        ).prop_map(|(id, file_name, file_path, duration, language, model_size, segments)| {
            StoredTranscript {
                id,
                file_name,
                file_path,
                created_at: current_timestamp(),
                duration,
                language,
                model_size,
                segments,
            }
        })
    }

    fn arb_settings() -> impl Strategy<Value = Settings> {
        (
            arb_model_size(),
            any::<bool>(),
            arb_export_format(),
            any::<bool>(),
        ).prop_map(|(model_size, minimize_to_tray, default_export_format, auto_check_updates)| {
            Settings {
                model_size,
                minimize_to_tray,
                default_export_format,
                auto_check_updates,
            }
        })
    }

    /// Helper function for approximate floating-point comparison
    /// Handles JSON serialization precision loss
    fn approx_eq(a: f64, b: f64) -> bool {
        const EPSILON: f64 = 1e-10;
        (a - b).abs() < EPSILON
    }

    // Feature: scriptgrab-transcriber, Property 11: Storage Round-Trip
    // *For any* valid transcript with metadata, saving to storage and then loading by ID 
    // SHALL produce an equivalent transcript with identical metadata.
    // **Validates: Requirements 6.1, 6.3**
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]
        #[test]
        fn prop_storage_round_trip(transcript in arb_stored_transcript()) {
            let temp_dir = TempDir::new().unwrap();
            let storage = StorageManager::new(temp_dir.path().to_path_buf());

            // Save transcript
            storage.save_transcript(&transcript).unwrap();

            // Load transcript
            let loaded = storage.load_transcript(&transcript.id).unwrap();

            // Verify equivalence
            prop_assert_eq!(loaded.id, transcript.id);
            prop_assert_eq!(loaded.file_name, transcript.file_name);
            prop_assert_eq!(loaded.file_path, transcript.file_path);
            prop_assert!(approx_eq(loaded.duration, transcript.duration), 
                "Duration mismatch: {} vs {}", loaded.duration, transcript.duration);
            prop_assert_eq!(loaded.language, transcript.language);
            prop_assert_eq!(loaded.model_size, transcript.model_size);
            prop_assert_eq!(loaded.segments.len(), transcript.segments.len());

            // Verify segments with approximate float comparison
            for (loaded_seg, orig_seg) in loaded.segments.iter().zip(transcript.segments.iter()) {
                prop_assert_eq!(&loaded_seg.id, &orig_seg.id);
                prop_assert!(approx_eq(loaded_seg.start, orig_seg.start),
                    "Segment start mismatch: {} vs {}", loaded_seg.start, orig_seg.start);
                prop_assert!(approx_eq(loaded_seg.end, orig_seg.end),
                    "Segment end mismatch: {} vs {}", loaded_seg.end, orig_seg.end);
                prop_assert_eq!(&loaded_seg.text, &orig_seg.text);
                prop_assert_eq!(loaded_seg.words.len(), orig_seg.words.len());
                
                // Verify words with approximate float comparison
                for (loaded_word, orig_word) in loaded_seg.words.iter().zip(orig_seg.words.iter()) {
                    prop_assert_eq!(&loaded_word.word, &orig_word.word);
                    prop_assert!(approx_eq(loaded_word.start, orig_word.start),
                        "Word start mismatch: {} vs {}", loaded_word.start, orig_word.start);
                    prop_assert!(approx_eq(loaded_word.end, orig_word.end),
                        "Word end mismatch: {} vs {}", loaded_word.end, orig_word.end);
                }
            }
        }
    }

    // Feature: scriptgrab-transcriber, Property 14: Settings Persistence Round-Trip
    // *For any* valid settings object, saving and then loading settings 
    // SHALL produce an equivalent settings object.
    // **Validates: Requirements 9.5**
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]
        #[test]
        fn prop_settings_round_trip(settings in arb_settings()) {
            let temp_dir = TempDir::new().unwrap();
            let storage = StorageManager::new(temp_dir.path().to_path_buf());

            // Save settings
            storage.save_settings(&settings).unwrap();

            // Load settings
            let loaded = storage.load_settings().unwrap();

            // Verify equivalence
            prop_assert_eq!(loaded.model_size, settings.model_size);
            prop_assert_eq!(loaded.minimize_to_tray, settings.minimize_to_tray);
            prop_assert_eq!(loaded.default_export_format, settings.default_export_format);
            prop_assert_eq!(loaded.auto_check_updates, settings.auto_check_updates);
        }
    }

    // Feature: scriptgrab-transcriber, Property 12: History Delete Removes Item
    // *For any* history item ID that exists in storage, after deletion, 
    // loading that ID SHALL return null or error.
    // **Validates: Requirements 6.4**
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]
        #[test]
        fn prop_history_delete_removes_item(transcript in arb_stored_transcript()) {
            let temp_dir = TempDir::new().unwrap();
            let storage = StorageManager::new(temp_dir.path().to_path_buf());

            // Save transcript
            storage.save_transcript(&transcript).unwrap();

            // Verify it exists
            prop_assert!(storage.load_transcript(&transcript.id).is_ok());

            // Delete transcript
            storage.delete_transcript(&transcript.id).unwrap();

            // Verify it's gone (loading should fail)
            prop_assert!(storage.load_transcript(&transcript.id).is_err());

            // Verify it's not in history
            let history = storage.get_history().unwrap();
            prop_assert!(!history.iter().any(|h| h.id == transcript.id));
        }
    }

    // Feature: scriptgrab-transcriber, Property 13: History Sort Order
    // *For any* list of history items, the sorted result SHALL be in 
    // descending order by date (newest first).
    // **Validates: Requirements 6.5**
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]
        #[test]
        fn prop_history_sort_order(transcripts in prop::collection::vec(arb_stored_transcript(), 1..10)) {
            let temp_dir = TempDir::new().unwrap();
            let storage = StorageManager::new(temp_dir.path().to_path_buf());

            // Save all transcripts with unique IDs
            let mut unique_transcripts: Vec<StoredTranscript> = Vec::new();
            for (i, mut t) in transcripts.into_iter().enumerate() {
                t.id = format!("unique_id_{}", i);
                // Add small delay to ensure different timestamps
                t.created_at = chrono::Utc::now()
                    .checked_add_signed(chrono::Duration::milliseconds(i as i64 * 10))
                    .unwrap()
                    .to_rfc3339();
                storage.save_transcript(&t).unwrap();
                unique_transcripts.push(t);
            }

            // Get history
            let history = storage.get_history().unwrap();

            // Verify sort order (descending by date)
            for i in 1..history.len() {
                prop_assert!(
                    history[i - 1].date >= history[i].date,
                    "History should be sorted by date descending: {} should be >= {}",
                    history[i - 1].date,
                    history[i].date
                );
            }
        }
    }
}
