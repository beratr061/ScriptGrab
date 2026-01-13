# Implementation Plan: ScriptGrab Transcriber

## Overview

Bu plan, mevcut Tauri v2 + React + TypeScript altyapısını kullanarak ScriptGrab transkript uygulamasını adım adım geliştirir. Her görev önceki görevlerin üzerine inşa edilir ve entegre bir şekilde çalışır.

## Mevcut Altyapı

- Tauri v2 (Rust backend)
- React 19 + TypeScript (Frontend)
- Vite (Build tool)
- Temel proje yapısı hazır

## Tasks

- [x] 1. Proje Bağımlılıkları ve Yapılandırma
  - [x] 1.1 Frontend bağımlılıklarını ekle (Tailwind CSS, Framer Motion, Wavesurfer.js, Zustand)
    - `npm install tailwindcss @tailwindcss/vite framer-motion wavesurfer.js zustand uuid`
    - `npm install -D @types/uuid`
    - Tailwind CSS yapılandırması (vite.config.ts, tailwind.config.js, index.css)
    - React Bits bileşenlerini kopyala (src/components/reactbits/)
      - DecryptedText, BlurText, SplitText, GradientText
      - Hyperspeed, Threads, MagnetLines (background)
      - FadeContent, Stagger animasyonları
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.6, 7.7, 7.8_
  - [x] 1.2 Rust bağımlılıklarını ekle (Cargo.toml)
    - `tauri-plugin-shell` (sidecar için)
    - `tauri-plugin-dialog` (dosya seçici için)
    - `tauri-plugin-fs` (dosya işlemleri için)
    - `tokio` (async runtime)
    - `uuid`, `chrono` (ID ve tarih yönetimi)
    - _Requirements: 1.2, 8.4_
  - [x] 1.3 Tauri yapılandırmasını güncelle (tauri.conf.json)
    - Pencere boyutu (1200x800), başlık, minimum boyut
    - Sidecar tanımı (whisper-engine)
    - Plugin izinleri (shell, dialog, fs)
    - _Requirements: 7.6, 8.1_

- [x] 2. Temel Veri Modelleri ve Tipler
  - [x] 2.1 TypeScript tip tanımlarını oluştur (src/types/index.ts)
    - `Transcript`, `Segment`, `Word`, `HistoryItem`, `QueueItem`, `Settings` interfaces
    - Export format enum'ları
    - _Requirements: 2.6, 2.7, 5.1, 6.1_
  - [x] 2.2 Rust struct tanımlarını oluştur (src-tauri/src/models.rs)
    - Serde serialize/deserialize ile aynı tipler
    - `AppError` enum tanımı (FFmpegNotFound dahil)
    - _Requirements: 2.1, 2.2, 2.8_
  - [x] 2.3 Property test: JSON Export Round-Trip
    - **Property 10: JSON Export Round-Trip**
    - **Validates: Requirements 5.4**

- [x] 3. FFmpeg ve Sistem Kontrolleri
  - [x] 3.1 FFmpeg kontrol fonksiyonunu implement et (src-tauri/src/ffmpeg.rs)
    - PATH'te ffmpeg kontrolü
    - Uygulama dizininde ffmpeg.exe kontrolü
    - `check_ffmpeg` Tauri command
    - _Requirements: 2.1, 2.2_
  - [x] 3.2 Property test: FFmpeg Availability Check
    - **Property 1: FFmpeg Availability Check**
    - **Validates: Requirements 2.1, 2.2**
  - [x] 3.3 Frontend'de FFmpeg durumu gösterimi
    - Uygulama açılışında kontrol
    - Hata durumunda kurulum talimatları modalı
    - _Requirements: 2.2_

- [x] 4. Dosya Validasyonu ve Yükleme
  - [x] 4.1 Dosya format validasyonu implement et (src/lib/validation.ts)
    - Desteklenen formatlar: .mp3, .wav, .m4a, .mp4, .mkv
    - Case-insensitive kontrol
    - _Requirements: 1.1, 1.3, 1.4_
  - [x] 4.2 Property test: File Format Validation
    - **Property 2: File Format Validation**
    - **Validates: Requirements 1.1, 1.3, 1.4**
  - [x] 4.3 Dosya metadata okuma (src-tauri/src/file_handler.rs)
    - Dosya adı, boyut, süre bilgisi
    - `get_file_metadata` Tauri command
    - _Requirements: 1.5_

- [x] 5. Checkpoint - Temel Altyapı Testi
  - Tüm testlerin geçtiğinden emin ol
  - FFmpeg kontrolü çalışıyor mu?
  - Dosya validasyonu doğru mu?

- [x] 6. UI Temel Bileşenleri
  - [x] 6.1 Layout ve tema yapısını oluştur (src/components/Layout.tsx)
    - Dark tema (Zinc-950 background, Indigo-600 accent)
    - 250px sabit sidebar + ana içerik alanı
    - _Requirements: 7.1, 7.6_
  - [x] 6.2 Sidebar bileşenini oluştur (src/components/Sidebar.tsx)
    - Geçmiş listesi alanı
    - Ayarlar butonu
    - Staggered fade-in animasyonu
    - _Requirements: 6.2, 7.5_
  - [x] 6.3 DropZone bileşenini oluştur (src/components/DropZone.tsx)
    - Sürükle-bırak desteği
    - Dosya seçici butonu
    - React Bits animasyonlu arka plan (Hyperspeed veya Threads)
    - _Requirements: 1.1, 1.2, 7.2_

- [x] 7. State Management
  - [x] 7.1 Zustand store oluştur (src/store/appStore.ts)
    - `currentView`, `currentFile`, `transcript`, `queue`, `settings` state'leri
    - Actions: setFile, setTranscript, addToQueue, updateSettings
    - _Requirements: 2.3, 2.4, 6.1, 9.5_

- [x] 8. Python Sidecar (Whisper Engine)
  - [x] 8.1 Python proje yapısını oluştur (whisper-engine/)
    - `engine.py` ana dosya
    - `requirements.txt` (whisper-timestamped, torch)
    - JSON stdout protokolü
    - _Requirements: 2.3, 2.5, 2.7_
  - [x] 8.2 Progress ve segment çıktı formatını implement et
    - `{"type": "progress", "percent": N, "status": "..."}`
    - `{"type": "segment", "data": {...}}`
    - `{"type": "complete", "language": "...", "duration": N}`
    - _Requirements: 2.4, 2.5, 2.6_
  - [x] 8.3 PyInstaller ile exe oluşturma scripti
    - `build.py` veya `build.bat`
    - Sidecar olarak Tauri'ye entegrasyon
    - _Requirements: 2.3_

- [x] 9. Transkript İşleme Backend
  - [x] 9.1 Sidecar yönetimi implement et (src-tauri/src/sidecar.rs)
    - Sidecar spawn ve kill
    - stdout/stderr okuma
    - Event emit (transcription_progress, transcription_complete)
    - _Requirements: 2.3, 2.4, 2.8_
  - [x] 9.2 `start_transcription` command implement et
    - Dosya yolu ve model boyutu parametreleri
    - Job ID döndürme
    - _Requirements: 2.3_
  - [x] 9.3 `cancel_transcription` command implement et
    - Sidecar process'i sonlandırma
    - _Requirements: 2.8_

- [x] 10. Checkpoint - Transkript İşleme Testi
  - Sidecar başlatılabiliyor mu?
  - Progress event'leri frontend'e ulaşıyor mu?
  - Hata durumları düzgün handle ediliyor mu?

- [x] 11. ProcessingView Bileşeni
  - [x] 11.1 ProcessingView oluştur (src/components/ProcessingView.tsx)
    - Progress bar
    - React Bits DecryptedText animasyonu (status mesajları)
    - React Bits GradientText (yüzde gösterimi)
    - İptal butonu
    - _Requirements: 2.4, 7.3_
  - [x] 11.2 Tauri event listener'ları ekle
    - `transcription_progress` dinleme
    - `transcription_complete` dinleme
    - `transcription_error` dinleme
    - _Requirements: 2.4, 2.8_

- [x] 12. TranscriptViewer Bileşeni
  - [x] 12.1 TranscriptViewer oluştur (src/components/TranscriptViewer.tsx)
    - Segment listesi görünümü
    - Word-level timestamp gösterimi
    - React Bits BlurText/FadeContent reveal animasyonu
    - React Bits SplitText başlık animasyonu
    - _Requirements: 2.6, 7.4, 7.7_
  - [x] 12.2 Segment highlight ve tıklama
    - Aktif segment vurgulama
    - Kelimeye tıklayınca timestamp döndürme
    - _Requirements: 3.3, 3.4_
  - [x] 12.3 Property test: Word Timestamps Within Segment Bounds
    - **Property 3: Word Timestamps Within Segment Bounds**
    - **Validates: Requirements 2.7**
  - [x] 12.4 Property test: Segment Lookup by Timestamp
    - **Property 6: Segment Lookup by Timestamp**
    - **Validates: Requirements 3.3**

- [x] 13. Audio Player ve Waveform
  - [x] 13.1 AudioPlayer bileşeni oluştur (src/components/AudioPlayer.tsx)
    - Wavesurfer.js entegrasyonu
    - Play, pause, seek kontrolleri
    - Waveform görselleştirme
    - _Requirements: 3.1, 3.2, 3.5_
  - [x] 13.2 Transcript-Audio senkronizasyonu
    - `onTimeUpdate` callback ile aktif segment güncelleme
    - Kelimeye tıklayınca audio seek
    - _Requirements: 3.3, 3.4_

- [x] 14. Transkript Düzenleme
  - [x] 14.1 Inline editing implement et
    - Segment'e tıklayınca edit modu
    - Enter veya dışarı tıklayınca kaydet
    - _Requirements: 4.1, 4.2_
  - [x] 14.2 Arama fonksiyonu implement et (src/lib/search.ts)
    - Ctrl+F ile arama kutusu
    - Case-insensitive arama
    - Sonuçlar arası navigasyon
    - _Requirements: 4.3, 4.4, 4.5_
  - [x] 14.3 Property test: Search Function Completeness
    - **Property 7: Search Function Completeness**
    - **Validates: Requirements 4.4**

- [x] 15. Checkpoint - UI ve Düzenleme Testi
  - Transkript görüntüleniyor mu?
  - Audio-transcript senkronizasyonu çalışıyor mu?
  - Düzenleme ve arama fonksiyonları çalışıyor mu?

- [x] 16. Dışa Aktarma
  - [x] 16.1 Export fonksiyonlarını implement et (src/lib/export.ts)
    - TXT export (sadece metin)
    - SRT export (timestamp formatı)
    - JSON export (tam veri)
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [x] 16.2 Property test: TXT Export Content Preservation
    - **Property 8: TXT Export Content Preservation**
    - **Validates: Requirements 5.2**
  - [x] 16.3 Property test: SRT Export Format Validity
    - **Property 9: SRT Export Format Validity**
    - **Validates: Requirements 5.3**
  - [x] 16.4 Export Tauri command implement et (src-tauri/src/export.rs)
    - Native save dialog
    - Dosya yazma
    - _Requirements: 5.5_

- [x] 17. Storage ve Geçmiş
  - [x] 17.1 Storage modülü implement et (src-tauri/src/storage.rs)
    - JSON dosya tabanlı storage
    - Transcript kaydetme/yükleme
    - Settings kaydetme/yükleme
    - _Requirements: 6.1, 6.3, 9.5_
  - [x] 17.2 Property test: Storage Round-Trip
    - **Property 11: Storage Round-Trip**
    - **Validates: Requirements 6.1, 6.3**
  - [x] 17.3 Property test: Settings Persistence Round-Trip
    - **Property 14: Settings Persistence Round-Trip**
    - **Validates: Requirements 9.5**
  - [x] 17.4 History Tauri commands implement et
    - `get_history`, `delete_history_item`, `load_history_item`
    - _Requirements: 6.2, 6.3, 6.4_
  - [x] 17.5 Property test: History Delete Removes Item
    - **Property 12: History Delete Removes Item**
    - **Validates: Requirements 6.4**
  - [x] 17.6 Property test: History Sort Order
    - **Property 13: History Sort Order**
    - **Validates: Requirements 6.5**

- [x] 18. Sidebar Geçmiş Entegrasyonu
  - [x] 18.1 HistoryList bileşeni oluştur (src/components/HistoryList.tsx)
    - Tarih sıralı liste
    - Silme butonu
    - Tıklayınca yükleme
    - _Requirements: 6.2, 6.3, 6.4, 6.5_

- [x] 19. Ayarlar Paneli
  - [x] 19.1 SettingsPanel bileşeni oluştur (src/components/SettingsPanel.tsx)
    - Model boyutu seçimi (base, small, medium)
    - Minimize to tray toggle
    - Default export format seçimi
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  - [x] 19.2 Settings persistence entegrasyonu
    - Değişiklikleri anında kaydet
    - Uygulama açılışında yükle
    - _Requirements: 9.5_

- [x] 20. Checkpoint - Storage ve Ayarlar Testi
  - Geçmiş kayıtları düzgün çalışıyor mu?
  - Ayarlar kalıcı mı?
  - Export fonksiyonları doğru çıktı üretiyor mu?

- [x] 21. System Tray Entegrasyonu
  - [x] 21.1 Tray icon implement et (src-tauri/src/tray.rs)
    - Icon gösterimi
    - Sağ tık menüsü (Show, Quit)
    - _Requirements: 8.1, 8.3_
  - [x] 21.2 Minimize to tray davranışı
    - Pencere kapatıldığında tray'e küçült (ayara bağlı)
    - Tray icon'a tıklayınca pencereyi göster
    - _Requirements: 8.2, 8.3_
  - [x] 21.3 Close confirmation dialog
    - Transkript devam ediyorsa onay iste
    - _Requirements: 8.5_

- [x] 22. Kuyruk Yönetimi (Opsiyonel)
  - [x] 22.1 Queue state ve UI implement et
    - Birden fazla dosya ekleme
    - Sıra görüntüleme
    - _Requirements: (Ek özellik)_
  - [x] 22.2 Property test: Queue FIFO Processing Order
    - **Property 4: Queue FIFO Processing Order**
    - **Validates: (Ek özellik)**
  - [x] 22.3 Property test: Queue Reorder Consistency
    - **Property 5: Queue Reorder Consistency**
    - **Validates: (Ek özellik)**

- [x] 23. Final Entegrasyon
  - [x] 23.1 Tüm bileşenleri App.tsx'te birleştir
    - View routing (idle, processing, result)
    - Global state bağlantıları
    - _Requirements: Tüm_
  - [x] 23.2 Error boundary ve global error handling
    - Toast notifications
    - Error modals
    - _Requirements: 2.8_

- [x] 24. Final Checkpoint
  - Tüm testler geçiyor mu?
  - Uygulama baştan sona çalışıyor mu?
  - Kullanıcı senaryoları test edildi mi?

## Notes

- Tüm görevler zorunludur (property testler dahil)
- Her checkpoint'te kullanıcıya soru sorulabilir
- Property testler minimum 100 iterasyon çalıştırılmalı
- Mevcut Tauri v2 altyapısı korunarak genişletilecek
- Test framework'leri: Vitest + fast-check (Frontend), cargo test + proptest (Rust)
