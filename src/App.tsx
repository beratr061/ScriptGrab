import { useState, useCallback, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useFFmpegCheck } from "./hooks/useFFmpegCheck";
import { FFmpegMissingModal } from "./components/FFmpegMissingModal";
import { CloseConfirmationModal } from "./components/CloseConfirmationModal";
import { ToastContainer, toast } from "./components/Toast";
import { ErrorModal } from "./components/ErrorModal";
import Layout from "./components/Layout";
import Sidebar from "./components/Sidebar";
import DropZone from "./components/DropZone";
import ProcessingView from "./components/ProcessingView";
import TranscriptViewer from "./components/TranscriptViewer";
import AudioPlayer, { type AudioPlayerRef } from "./components/AudioPlayer";
import SearchBar from "./components/SearchBar";
import SettingsPanel from "./components/SettingsPanel";
import { useAppStore } from "./store/appStore";
import { createQueueItems, getNextPendingItem } from "./lib/queue";
import type { StoredTranscript, Transcript } from "./types";
import "./App.css";

function App() {
  const { isChecking, isAvailable, result, checkFFmpeg } = useFFmpegCheck();
  const [showFFmpegModal, setShowFFmpegModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalData, setErrorModalData] = useState<{
    title: string;
    message: string;
    details?: string;
    onRetry?: () => void;
  }>({ title: '', message: '' });
  
  // Get state and actions from store
  const {
    currentView,
    currentFile,
    transcript,
    isProcessing,
    progress,
    statusMessage,
    settings,
    queue,
    setCurrentView,
    setFile,
    setProcessing,
    setProgress,
    resetProcessing,
    updateSegmentText,
    updateSettings,
    addToQueue,
    updateQueueItem,
  } = useAppStore();
  
  // Track current playback time for transcript sync
  const [currentTime, setCurrentTime] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  
  // Audio player ref for seeking from transcript
  const audioPlayerRef = useRef<AudioPlayerRef>(null);
  
  // Track current job ID for event filtering
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  // Load settings from backend on application startup - Requirements: 9.5
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await invoke<typeof settings>('get_settings');
        updateSettings(savedSettings);
      } catch (error) {
        console.error('Failed to load settings on startup:', error);
      }
    };
    loadSettings();
  }, [updateSettings]);

  // Listen for close confirmation event from backend - Requirements: 8.5
  useEffect(() => {
    const unlisten = listen('close_confirmation_request', () => {
      setShowCloseConfirmation(true);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Keyboard shortcut for search (Ctrl+F) - Requirement 4.3
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+F to open search - Requirement 4.3
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        if (currentView === "result" && transcript) {
          setIsSearchVisible(true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentView, transcript]);

  // Handle search query change
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Handle navigation to search match
  const handleNavigateToMatch = useCallback((_segmentIndex: number, timestamp: number) => {
    // Seek audio to the match timestamp
    if (audioPlayerRef.current) {
      audioPlayerRef.current.seekTo(timestamp);
    }
    setCurrentTime(timestamp);
    
    // Scroll to the segment (the TranscriptViewer will highlight based on currentTime)
    // The segment will be highlighted automatically via the currentTime prop
  }, []);

  // Close search bar
  const handleCloseSearch = useCallback(() => {
    setIsSearchVisible(false);
    setSearchQuery("");
  }, []);

  // Show modal when FFmpeg is not available (after initial check)
  const shouldShowModal = !isChecking && isAvailable === false;

  const handleRetry = async () => {
    await checkFFmpeg();
  };

  const handleFileDrop = useCallback(async (filePath: string) => {
    console.log('File dropped:', filePath);
    
    // Extract file name from path
    const fileName = filePath.split(/[/\\]/).pop() || filePath;
    
    // Set file info and switch to processing view
    setFile({
      name: fileName,
      path: filePath,
      size: 0, // Will be updated when we get metadata
      duration: 0,
    });
    setCurrentView('processing');
    setProcessing(true);
    setProgress(0, 'Transkript başlatılıyor...');
    
    try {
      // Start transcription via Tauri command using model size from settings
      const jobId = await invoke<string>('start_transcription', {
        filePath,
        modelSize: settings.modelSize,
      });
      setCurrentJobId(jobId);
    } catch (error) {
      console.error('Failed to start transcription:', error);
      resetProcessing();
      setCurrentView('idle');
      // Show error toast - Requirements: 2.8
      toast.error(
        'Transkript Başlatılamadı',
        error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu'
      );
    }
  }, [setFile, setCurrentView, setProcessing, setProgress, resetProcessing, settings.modelSize]);

  const handleHistorySelect = useCallback((id: string, storedTranscript: StoredTranscript) => {
    console.log('History item selected:', id);
    
    // Set file info from stored transcript
    setFile({
      name: storedTranscript.fileName,
      path: storedTranscript.filePath,
      size: 0,
      duration: storedTranscript.duration,
    });
    
    // Convert StoredTranscript to Transcript format for the viewer
    const transcript: Transcript = {
      segments: storedTranscript.segments,
      language: storedTranscript.language,
      duration: storedTranscript.duration,
    };
    
    // Set transcript and switch to result view
    useAppStore.getState().setTranscript(transcript);
    setCurrentView('result');
  }, [setFile, setCurrentView]);

  const handleSettingsClick = useCallback(() => {
    setShowSettings(true);
  }, []);

  // Handle transcription cancellation
  const handleCancelTranscription = useCallback(async () => {
    if (currentJobId) {
      try {
        await invoke('cancel_transcription', { jobId: currentJobId });
      } catch (error) {
        console.error('Failed to cancel transcription:', error);
      }
    }
    setCurrentJobId(null);
    resetProcessing();
    setCurrentView('idle');
  }, [currentJobId, resetProcessing, setCurrentView]);

  // Handle transcription completion
  const handleTranscriptionComplete = useCallback((transcript: Transcript) => {
    console.log('Transcription complete:', transcript);
    setCurrentJobId(null);
    
    // Update queue item status to completed
    const processingItem = queue.find(item => item.status === 'processing');
    if (processingItem) {
      updateQueueItem(processingItem.id, { status: 'completed', progress: 100 });
    }
    
    // TODO: Save to history (Task 17)
  }, [queue, updateQueueItem]);

  // Handle word click in transcript - seek audio to timestamp
  const handleWordClick = useCallback((timestamp: number) => {
    console.log('Word clicked, seeking to:', timestamp);
    // Seek audio player to the clicked word's timestamp
    if (audioPlayerRef.current) {
      audioPlayerRef.current.seekTo(timestamp);
    }
    setCurrentTime(timestamp);
  }, []);

  // Handle segment edit - Requirement 4.1, 4.2
  const handleSegmentEdit = useCallback((segmentId: string, newText: string) => {
    console.log('Segment edited:', segmentId, newText);
    updateSegmentText(segmentId, newText);
  }, [updateSegmentText]);

  // Handle transcription error
  const handleTranscriptionError = useCallback((message: string) => {
    console.error('Transcription error:', message);
    setCurrentJobId(null);
    
    // Update queue item status to error
    const processingItem = queue.find(item => item.status === 'processing');
    if (processingItem) {
      updateQueueItem(processingItem.id, { status: 'error' });
    }
    
    // Show error modal with retry option - Requirements: 2.8
    setErrorModalData({
      title: 'Transkript Hatası',
      message: 'Transkript işlemi sırasında bir hata oluştu.',
      details: message,
      onRetry: currentFile ? () => {
        setShowErrorModal(false);
        handleFileDrop(currentFile.path);
      } : undefined,
    });
    setShowErrorModal(true);
  }, [currentFile, queue, updateQueueItem]);

  // Handle close confirmation - Requirements: 8.5
  const handleConfirmQuit = useCallback(async () => {
    try {
      await invoke('confirm_quit');
    } catch (error) {
      console.error('Failed to quit:', error);
    }
  }, []);

  // Handle minimize to tray from close confirmation - Requirements: 8.2
  const handleMinimizeToTray = useCallback(async () => {
    try {
      await invoke('minimize_to_tray');
      setShowCloseConfirmation(false);
    } catch (error) {
      console.error('Failed to minimize to tray:', error);
    }
  }, []);

  // Handle close confirmation cancel
  const handleCloseConfirmationCancel = useCallback(() => {
    setShowCloseConfirmation(false);
  }, []);

  // Handle audio time update - sync transcript with audio playback
  const handleAudioTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  // Handle audio seek - update current time when user seeks in waveform
  const handleAudioSeek = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  // Handle multiple files drop - add to queue
  const handleMultipleFilesDrop = useCallback((filePaths: string[]) => {
    console.log('Multiple files dropped:', filePaths);
    const queueItems = createQueueItems(filePaths);
    addToQueue(queueItems);
  }, [addToQueue]);

  // Handle processing next item in queue
  const handleProcessNext = useCallback(async () => {
    const nextItem = getNextPendingItem(queue);
    if (!nextItem) return;

    console.log('Processing next queue item:', nextItem.fileName);
    
    // Update queue item status to processing
    updateQueueItem(nextItem.id, { status: 'processing', progress: 0 });
    
    // Set file info and switch to processing view
    setFile({
      name: nextItem.fileName,
      path: nextItem.filePath,
      size: 0,
      duration: 0,
    });
    setCurrentView('processing');
    setProcessing(true);
    setProgress(0, 'Transkript başlatılıyor...');
    
    try {
      const jobId = await invoke<string>('start_transcription', {
        filePath: nextItem.filePath,
        modelSize: settings.modelSize,
      });
      setCurrentJobId(jobId);
    } catch (error) {
      console.error('Failed to start transcription:', error);
      updateQueueItem(nextItem.id, { status: 'error' });
      resetProcessing();
      setCurrentView('idle');
      // Show error toast - Requirements: 2.8
      toast.error(
        'Kuyruk İşleme Hatası',
        `${nextItem.fileName} dosyası işlenemedi`
      );
    }
  }, [queue, updateQueueItem, setFile, setCurrentView, setProcessing, setProgress, settings.modelSize, resetProcessing]);

  // Loading state while checking FFmpeg
  if (isChecking) {
    return (
      <main className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-zinc-400">Sistem kontrol ediliyor...</p>
        </div>
      </main>
    );
  }

  return (
    <>
      {/* Toast Notifications - Requirements: 2.8 */}
      <ToastContainer />

      {/* FFmpeg Missing Modal */}
      <FFmpegMissingModal
        isOpen={shouldShowModal || showFFmpegModal}
        onClose={() => setShowFFmpegModal(false)}
        onRetry={handleRetry}
      />

      {/* Close Confirmation Modal - Requirements: 8.5 */}
      <CloseConfirmationModal
        isOpen={showCloseConfirmation}
        onClose={handleCloseConfirmationCancel}
        onConfirmQuit={handleConfirmQuit}
        onMinimizeToTray={handleMinimizeToTray}
        minimizeToTrayEnabled={settings.minimizeToTray}
      />

      {/* Error Modal - Requirements: 2.8 */}
      <ErrorModal
        isOpen={showErrorModal}
        title={errorModalData.title}
        message={errorModalData.message}
        details={errorModalData.details}
        onClose={() => setShowErrorModal(false)}
        onRetry={errorModalData.onRetry}
        showRetry={!!errorModalData.onRetry}
      />

      {/* Settings Panel - Requirements: 9.1, 9.2, 9.3, 9.4 */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* Main Layout */}
      <Layout
        sidebar={
          <Sidebar
            onHistorySelect={handleHistorySelect}
            onSettingsClick={handleSettingsClick}
            onProcessNext={handleProcessNext}
            isProcessing={isProcessing}
          />
        }
      >
        {/* Main Content Area */}
        <div className="h-full flex flex-col">
          {/* FFmpeg Status Bar */}
          <div className="flex items-center justify-end gap-2 px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
            {isAvailable ? (
              <>
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs text-zinc-400">
                  FFmpeg hazır
                  {result?.location && (
                    <span className="text-zinc-600 ml-1">
                      ({result.location === 'PATH' ? 'PATH' : 'Yerel'})
                    </span>
                  )}
                </span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-xs text-zinc-400">FFmpeg bulunamadı</span>
                <button
                  onClick={() => setShowFFmpegModal(true)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 underline ml-1"
                >
                  Kurulum
                </button>
              </>
            )}
          </div>

          {/* Main Content - View Routing */}
          <div className="flex-1">
            {currentView === 'idle' && (
              <DropZone
                onFileDrop={handleFileDrop}
                onMultipleFilesDrop={handleMultipleFilesDrop}
                isProcessing={isProcessing}
                allowMultiple={true}
              />
            )}
            
            {currentView === 'processing' && currentFile && (
              <ProcessingView
                fileName={currentFile.name}
                progress={progress}
                status={statusMessage}
                jobId={currentJobId || undefined}
                onCancel={handleCancelTranscription}
                onComplete={handleTranscriptionComplete}
                onError={handleTranscriptionError}
              />
            )}
            
            {currentView === 'result' && transcript && (
              <div className="h-full flex flex-col relative">
                {/* Search Bar - Requirements: 4.3, 4.4, 4.5 */}
                <SearchBar
                  segments={transcript.segments}
                  onSearchChange={handleSearchChange}
                  onNavigateToMatch={handleNavigateToMatch}
                  isVisible={isSearchVisible}
                  onClose={handleCloseSearch}
                />
                
                {/* Audio Player - Requirements: 3.1, 3.2, 3.5 */}
                {currentFile && (
                  <div className="px-6 py-4 border-b border-zinc-800">
                    <AudioPlayer
                      ref={audioPlayerRef}
                      audioPath={currentFile.path}
                      onTimeUpdate={handleAudioTimeUpdate}
                      onSeek={handleAudioSeek}
                    />
                  </div>
                )}
                
                {/* Transcript Viewer - synced with audio */}
                <div className="flex-1 overflow-hidden">
                  <TranscriptViewer
                    transcript={transcript}
                    currentTime={currentTime}
                    searchQuery={searchQuery}
                    onWordClick={handleWordClick}
                    onSegmentEdit={handleSegmentEdit}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </Layout>
    </>
  );
}

export default App;
