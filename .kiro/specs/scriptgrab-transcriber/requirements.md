# Requirements Document

## Introduction

ScriptGrab, OpenAI Whisper modelini kullanarak ses ve video dosyalarını yerel donanım gücüyle (CPU/GPU) metne çeviren, Windows için geliştirilmiş ultra performanslı bir masaüstü uygulamasıdır. Tauri v2 (Rust) backend, React + TypeScript frontend ve Python sidecar mimarisi kullanır.

## Glossary

- **ScriptGrab**: Ana masaüstü transkript uygulaması
- **Whisper_Engine**: Python tabanlı OpenAI Whisper modelini çalıştıran sidecar uygulama
- **Transcript**: Ses/video dosyasından çıkarılan metin ve zaman damgaları
- **Sidecar**: Tauri uygulamasıyla birlikte çalışan harici yürütülebilir dosya
- **Segment**: Transkriptteki zaman damgalı tek bir metin parçası
- **Waveform**: Ses dosyasının görsel dalga formu temsili
- **Word_Level_Sync**: Metindeki kelimelerin ses dosyasındaki konumlarıyla eşleştirilmesi

## Requirements

### Requirement 1: Dosya Yükleme ve Format Desteği

**User Story:** Bir kullanıcı olarak, farklı formatlardaki ses ve video dosyalarımı sürükle-bırak veya dosya seçici ile yüklemek istiyorum, böylece transkript işlemini başlatabilirim.

#### Acceptance Criteria

1. WHEN a user drags and drops a file onto the drop zone, THE ScriptGrab SHALL validate the file format and display the file name
2. WHEN a user clicks the file picker button, THE ScriptGrab SHALL open the native Windows file dialog with supported format filters
3. THE ScriptGrab SHALL support .mp3, .wav, .m4a, .mp4, and .mkv file formats
4. IF a user uploads an unsupported file format, THEN THE ScriptGrab SHALL display an error message indicating supported formats
5. WHEN a valid file is uploaded, THE ScriptGrab SHALL display file metadata (name, duration, size)

### Requirement 2: Transkript İşleme

**User Story:** Bir kullanıcı olarak, yüklediğim ses/video dosyasının otomatik olarak metne çevrilmesini istiyorum, böylece içeriği okuyabilir ve düzenleyebilirim.

#### Acceptance Criteria

1. WHEN the application starts, THE ScriptGrab SHALL check if FFmpeg is available on the system
2. IF FFmpeg is not found, THEN THE ScriptGrab SHALL display an error message with installation instructions
3. WHEN a valid file is uploaded, THE Whisper_Engine SHALL start processing the audio automatically
4. WHILE the transcription is in progress, THE ScriptGrab SHALL display real-time progress percentage and status messages
5. THE Whisper_Engine SHALL detect the spoken language automatically
6. WHEN transcription completes, THE ScriptGrab SHALL display the full transcript with timestamps
7. THE ScriptGrab SHALL generate word-level timestamps for each segment
8. IF the Whisper_Engine encounters an error, THEN THE ScriptGrab SHALL display a descriptive error message and allow retry

### Requirement 3: Ses Oynatıcı ve Dalga Formu

**User Story:** Bir kullanıcı olarak, transkript metnini takip ederken ses dosyasını görsel dalga formuyla birlikte dinlemek istiyorum, böylece içeriği daha iyi anlayabilirim.

#### Acceptance Criteria

1. WHEN transcription completes, THE ScriptGrab SHALL display an interactive waveform visualization
2. THE ScriptGrab SHALL provide play, pause, and seek controls for audio playback
3. WHILE audio is playing, THE ScriptGrab SHALL highlight the current segment in the transcript
4. WHEN a user clicks on a word in the transcript, THE ScriptGrab SHALL seek the audio to that word's timestamp
5. THE ScriptGrab SHALL display current playback time and total duration

### Requirement 4: Transkript Düzenleme

**User Story:** Bir kullanıcı olarak, hatalı çevrilen kelimeleri düzeltmek istiyorum, böylece doğru bir transkript elde edebilirim.

#### Acceptance Criteria

1. WHEN a user clicks on a transcript segment, THE ScriptGrab SHALL enable inline editing mode
2. WHEN a user modifies text and clicks outside or presses Enter, THE ScriptGrab SHALL save the changes
3. WHEN a user presses Ctrl+F, THE ScriptGrab SHALL display a search input field
4. WHEN a user searches for text, THE ScriptGrab SHALL highlight all matching words in the transcript
5. WHEN search results exist, THE ScriptGrab SHALL allow navigation between matches with next/previous buttons

### Requirement 5: Dışa Aktarma

**User Story:** Bir kullanıcı olarak, transkripti farklı formatlarda dışa aktarmak istiyorum, böylece diğer uygulamalarda kullanabilirim.

#### Acceptance Criteria

1. THE ScriptGrab SHALL provide export options for TXT, SRT, and JSON formats
2. WHEN a user selects TXT export, THE ScriptGrab SHALL generate plain text without timestamps
3. WHEN a user selects SRT export, THE ScriptGrab SHALL generate valid subtitle format with sequential numbering and timestamps
4. WHEN a user selects JSON export, THE ScriptGrab SHALL include all segment data with word-level timestamps
5. WHEN export is triggered, THE ScriptGrab SHALL open native save dialog with appropriate file extension

### Requirement 6: Geçmiş Kayıtlar

**User Story:** Bir kullanıcı olarak, önceki transkriptlerime erişmek istiyorum, böylece tekrar işlem yapmadan içeriğe ulaşabilirim.

#### Acceptance Criteria

1. WHEN a transcription completes, THE ScriptGrab SHALL save the transcript to local storage with metadata
2. THE ScriptGrab SHALL display a history list in the sidebar showing file name and date
3. WHEN a user clicks on a history item, THE ScriptGrab SHALL load the saved transcript and audio reference
4. WHEN a user deletes a history item, THE ScriptGrab SHALL remove it from storage and update the list
5. THE ScriptGrab SHALL sort history items by date in descending order

### Requirement 7: Kullanıcı Arayüzü ve Animasyonlar

**User Story:** Bir kullanıcı olarak, modern ve akıcı bir arayüz deneyimi istiyorum, böylece uygulamayı keyifle kullanabilirim.

#### Acceptance Criteria

1. THE ScriptGrab SHALL use a dark theme with Zinc-950 background and Indigo-600 accent colors
2. WHILE in idle state, THE ScriptGrab SHALL display an animated background using React Bits components (Hyperspeed, Threads, or Magnet Lines)
3. WHILE processing, THE ScriptGrab SHALL display decrypted text animation (React Bits DecryptedText) for status messages
4. WHEN transcript appears, THE ScriptGrab SHALL apply blur reveal animation (React Bits BlurText or FadeContent) to text
5. WHEN sidebar items load, THE ScriptGrab SHALL apply staggered fade-in animation
6. THE ScriptGrab SHALL maintain responsive layout with fixed 250px sidebar
7. THE ScriptGrab SHALL use React Bits SplitText for animated headings
8. THE ScriptGrab SHALL use React Bits GradientText for accent text elements

### Requirement 8: Sistem Entegrasyonu

**User Story:** Bir kullanıcı olarak, uygulamanın Windows sistemiyle entegre çalışmasını istiyorum, böylece arka planda çalışmaya devam edebilsin.

#### Acceptance Criteria

1. THE ScriptGrab SHALL display a system tray icon when running
2. WHEN a user closes the main window, THE ScriptGrab SHALL optionally minimize to system tray
3. WHEN a user clicks the tray icon, THE ScriptGrab SHALL restore the main window
4. THE ScriptGrab SHALL use native Windows file dialogs for file operations
5. IF a transcription is in progress and user attempts to close, THEN THE ScriptGrab SHALL display a confirmation dialog

### Requirement 9: Ayarlar

**User Story:** Bir kullanıcı olarak, uygulama davranışlarını özelleştirmek istiyorum, böylece kendi tercihlerime göre kullanabilirim.

#### Acceptance Criteria

1. THE ScriptGrab SHALL provide a settings panel accessible from the sidebar
2. THE ScriptGrab SHALL allow selection of Whisper model size (base, small, medium)
3. THE ScriptGrab SHALL allow toggling minimize to tray behavior
4. THE ScriptGrab SHALL allow setting default export format
5. WHEN settings are changed, THE ScriptGrab SHALL persist them to local storage
