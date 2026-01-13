/**
 * TranscriptViewer Component
 * Displays transcript segments with word-level timestamps and animations
 * Requirements: 2.6, 3.3, 3.4, 4.1, 4.2, 5.1, 5.2, 5.3, 5.4, 7.4, 7.7
 */

import { useMemo, useCallback, useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Copy, FileText, FileJson, Check, ChevronDown } from "lucide-react";
import FadeContent from "./reactbits/FadeContent";
import SplitText from "./reactbits/SplitText";
import { toast } from "./Toast";
import { exportTranscript, exportToTxt, copyToClipboard, type ExportFormat } from "../lib/export";
import type { Transcript, Segment, Word } from "../types";

// ============================================
// Export Dropdown Component
// ============================================

interface ExportDropdownProps {
  transcript: Transcript;
  baseFilename: string;
}

const ExportDropdown: React.FC<ExportDropdownProps> = ({ transcript, baseFilename }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = (format: ExportFormat) => {
    exportTranscript(transcript, format, baseFilename);
    setIsOpen(false);
    toast.success('Dışa Aktarıldı', `${format.toUpperCase()} dosyası indirildi`);
  };

  const handleCopy = async () => {
    const text = exportToTxt(transcript, false);
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedFormat('text');
      toast.success('Kopyalandı', 'Transkript panoya kopyalandı');
      setTimeout(() => setCopiedFormat(null), 2000);
    } else {
      toast.error('Hata', 'Kopyalama başarısız oldu');
    }
    setIsOpen(false);
  };

  const exportOptions = [
    { format: 'srt-word' as ExportFormat, label: 'SRT Kelime Bazlı', icon: FileText, desc: 'Premiere Pro için ideal', highlight: true },
    { format: 'srt' as ExportFormat, label: 'SRT (Cümle)', icon: FileText, desc: 'Standart altyazı' },
    { format: 'vtt-word' as ExportFormat, label: 'VTT Kelime Bazlı', icon: FileText, desc: 'Web karaoke efekti' },
    { format: 'vtt' as ExportFormat, label: 'VTT (Cümle)', icon: FileText, desc: 'Web video altyazıları' },
    { format: 'txt' as ExportFormat, label: 'TXT (Metin)', icon: FileText, desc: 'Düz metin dosyası' },
    { format: 'json' as ExportFormat, label: 'JSON (Veri)', icon: FileJson, desc: 'Yapılandırılmış veri' },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
      >
        <Download size={16} />
        <span>Dışa Aktar</span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-56 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden"
          >
            {/* Copy to Clipboard */}
            <button
              onClick={handleCopy}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-700/50 transition-colors border-b border-zinc-700"
            >
              {copiedFormat === 'text' ? (
                <Check size={18} className="text-green-500" />
              ) : (
                <Copy size={18} className="text-zinc-400" />
              )}
              <div>
                <p className="text-sm font-medium text-zinc-200">Panoya Kopyala</p>
                <p className="text-xs text-zinc-500">Metni kopyala</p>
              </div>
            </button>

            {/* Export Options */}
            <div className="py-1">
              {exportOptions.map((option) => (
                <button
                  key={option.format}
                  onClick={() => handleExport(option.format)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-zinc-700/50 transition-colors ${
                    option.highlight ? 'bg-indigo-500/10 border-l-2 border-indigo-500' : ''
                  }`}
                >
                  <option.icon size={18} className={option.highlight ? 'text-indigo-400' : 'text-zinc-400'} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium ${option.highlight ? 'text-indigo-300' : 'text-zinc-200'}`}>
                        {option.label}
                      </p>
                      {option.highlight && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-indigo-500/20 text-indigo-300 rounded">
                          ÖNERİLEN
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500">{option.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================
// Utility Functions
// ============================================

/**
 * Finds the segment containing a given timestamp
 * Property 6: Segment Lookup by Timestamp
 * @param segments - Array of transcript segments
 * @param timestamp - Time in seconds to look up
 * @returns The segment containing the timestamp, or null
 */
export function findSegmentByTimestamp(
  segments: Segment[],
  timestamp: number
): Segment | null {
  if (!segments || segments.length === 0) return null;
  
  for (const segment of segments) {
    if (timestamp >= segment.start && timestamp < segment.end) {
      return segment;
    }
  }
  return null;
}

/**
 * Formats seconds to MM:SS or HH:MM:SS format
 */
function formatTimestamp(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
}

// ============================================
// Sub-Components
// ============================================

interface WordSpanProps {
  word: Word;
  isActive: boolean;
  isHighlighted: boolean;
  onClick: (timestamp: number) => void;
}

const WordSpan: React.FC<WordSpanProps> = ({
  word,
  isActive,
  isHighlighted,
  onClick,
}) => {
  return (
    <motion.span
      onClick={() => onClick(word.start)}
      className={`
        word-span cursor-pointer transition-colors duration-200 rounded px-0.5
        ${isActive ? "bg-indigo-600/40 text-white" : ""}
        ${isHighlighted ? "bg-yellow-500/30 text-yellow-200" : ""}
        ${!isActive && !isHighlighted ? "hover:bg-zinc-700/50" : ""}
      `}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      title={`${formatTimestamp(word.start)} - ${formatTimestamp(word.end)}`}
    >
      {word.word}
    </motion.span>
  );
};

interface SegmentItemProps {
  segment: Segment;
  isActive: boolean;
  currentTime: number;
  searchQuery: string;
  onWordClick: (timestamp: number) => void;
  onSegmentEdit?: (segmentId: string, newText: string) => void;
  index: number;
}

const SegmentItem: React.FC<SegmentItemProps> = ({
  segment,
  isActive,
  currentTime,
  searchQuery,
  onWordClick,
  onSegmentEdit,
  index,
}) => {
  // Inline editing state - Requirements: 4.1, 4.2
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(segment.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  // Update editText when segment changes
  useEffect(() => {
    setEditText(segment.text);
  }, [segment.text]);

  // Handle entering edit mode - Requirement 4.1
  const handleSegmentClick = useCallback((e: React.MouseEvent) => {
    // Don't enter edit mode if clicking on a word (for timestamp navigation)
    if ((e.target as HTMLElement).closest('.word-span')) {
      return;
    }
    if (onSegmentEdit) {
      setIsEditing(true);
    }
  }, [onSegmentEdit]);

  // Handle saving edit - Requirement 4.2
  const handleSaveEdit = useCallback(() => {
    if (onSegmentEdit && editText !== segment.text) {
      onSegmentEdit(segment.id, editText);
    }
    setIsEditing(false);
  }, [onSegmentEdit, editText, segment.id, segment.text]);

  // Handle cancel edit
  const handleCancelEdit = useCallback(() => {
    setEditText(segment.text);
    setIsEditing(false);
  }, [segment.text]);

  // Handle key press in edit mode - Requirement 4.2
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  }, [handleSaveEdit, handleCancelEdit]);

  // Handle blur (clicking outside) - Requirement 4.2
  const handleBlur = useCallback(() => {
    handleSaveEdit();
  }, [handleSaveEdit]);
  // Check if a word is currently being spoken
  const isWordActive = useCallback(
    (word: Word) => {
      return currentTime >= word.start && currentTime < word.end;
    },
    [currentTime]
  );

  // Check if a word matches the search query
  const isWordHighlighted = useCallback(
    (word: Word) => {
      if (!searchQuery) return false;
      return word.word.toLowerCase().includes(searchQuery.toLowerCase());
    },
    [searchQuery]
  );

  return (
    <FadeContent
      blur
      duration={0.4}
      delay={index * 0.05}
      direction="up"
      distance={15}
      className="w-full"
    >
      <motion.div
        className={`
          p-4 rounded-lg border transition-all duration-300
          ${
            isActive
              ? "bg-indigo-950/30 border-indigo-600/50 shadow-lg shadow-indigo-900/20"
              : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
          }
          ${onSegmentEdit && !isEditing ? "cursor-text" : ""}
        `}
        layout
        onClick={handleSegmentClick}
      >
        {/* Timestamp */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-mono text-indigo-400">
            {formatTimestamp(segment.start)}
          </span>
          <span className="text-zinc-600">→</span>
          <span className="text-xs font-mono text-zinc-500">
            {formatTimestamp(segment.end)}
          </span>
          {isEditing && (
            <span className="ml-auto text-xs text-indigo-400">
              Düzenleniyor... (Enter: kaydet, Esc: iptal)
            </span>
          )}
        </div>

        {/* Words with individual timestamps or Edit textarea */}
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="w-full bg-zinc-800 text-zinc-200 rounded-md p-2 border border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none leading-relaxed"
            rows={Math.max(2, Math.ceil(editText.length / 60))}
          />
        ) : (
          <div className="text-zinc-200 leading-relaxed">
            {segment.words && segment.words.length > 0 ? (
              segment.words.map((word, wordIndex) => (
                <span key={`${segment.id}-word-${wordIndex}`}>
                  <WordSpan
                    word={word}
                    isActive={isWordActive(word)}
                    isHighlighted={isWordHighlighted(word)}
                    onClick={onWordClick}
                  />
                  {wordIndex < segment.words.length - 1 && " "}
                </span>
              ))
            ) : (
              <span>{segment.text}</span>
            )}
          </div>
        )}
      </motion.div>
    </FadeContent>
  );
};

// ============================================
// Main Component
// ============================================

interface TranscriptViewerProps {
  transcript: Transcript;
  currentTime: number;
  searchQuery?: string;
  baseFilename?: string;
  onWordClick: (timestamp: number) => void;
  onSegmentEdit?: (segmentId: string, newText: string) => void;
}

const TranscriptViewer: React.FC<TranscriptViewerProps> = ({
  transcript,
  currentTime,
  searchQuery = "",
  baseFilename = "transcript",
  onWordClick,
  onSegmentEdit,
}) => {
  // Find the currently active segment based on playback time
  const activeSegment = useMemo(() => {
    return findSegmentByTimestamp(transcript.segments, currentTime);
  }, [transcript.segments, currentTime]);

  // Count search matches
  const searchMatchCount = useMemo(() => {
    if (!searchQuery) return 0;
    const query = searchQuery.toLowerCase();
    let count = 0;
    for (const segment of transcript.segments) {
      for (const word of segment.words || []) {
        if (word.word.toLowerCase().includes(query)) {
          count++;
        }
      }
    }
    return count;
  }, [transcript.segments, searchQuery]);

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      {/* Header with animated title and export button */}
      <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center justify-between">
          <SplitText
            text="Transkript"
            className="text-2xl font-bold text-zinc-100"
            delay={0.03}
            animationFrom={{ opacity: 0, y: 20 }}
            animationTo={{ opacity: 1, y: 0 }}
          />
          
          {/* Export Dropdown */}
          <ExportDropdown transcript={transcript} baseFilename={baseFilename} />
        </div>
        
        {/* Metadata */}
        <div className="flex items-center gap-4 mt-2 text-sm text-zinc-500">
          <span>
            <span className="text-zinc-400">{transcript.segments.length}</span> segment
          </span>
          <span>•</span>
          <span>
            <span className="text-zinc-400">{formatTimestamp(transcript.duration)}</span> süre
          </span>
          <span>•</span>
          <span>
            Dil: <span className="text-zinc-400 uppercase">{transcript.language}</span>
          </span>
          {searchQuery && (
            <>
              <span>•</span>
              <span className="text-yellow-500">
                {searchMatchCount} eşleşme
              </span>
            </>
          )}
        </div>
      </div>

      {/* Segments List */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="space-y-3 max-w-3xl mx-auto">
          {transcript.segments.map((segment, index) => (
            <SegmentItem
              key={segment.id}
              segment={segment}
              isActive={activeSegment?.id === segment.id}
              currentTime={currentTime}
              searchQuery={searchQuery}
              onWordClick={onWordClick}
              onSegmentEdit={onSegmentEdit}
              index={index}
            />
          ))}
        </div>
      </div>

      {/* Footer with current time indicator */}
      <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-500">
            Şu an: <span className="text-indigo-400 font-mono">{formatTimestamp(currentTime)}</span>
          </span>
          {activeSegment && (
            <span className="text-zinc-500">
              Segment: <span className="text-zinc-300">#{transcript.segments.indexOf(activeSegment) + 1}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default TranscriptViewer;
