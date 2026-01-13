/**
 * SearchBar Component
 * Provides search functionality with Ctrl+F keyboard shortcut
 * Requirements: 4.3, 4.4, 4.5
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { SearchResults } from "../lib/search";
import {
  searchTranscript,
  getNextMatchIndex,
  getPreviousMatchIndex,
  getMatchAtIndex,
} from "../lib/search";
import type { Segment } from "../types";

interface SearchBarProps {
  segments: Segment[];
  onSearchChange: (query: string) => void;
  onNavigateToMatch: (segmentIndex: number, timestamp: number) => void;
  isVisible: boolean;
  onClose: () => void;
}

const SearchBar: React.FC<SearchBarProps> = ({
  segments,
  onSearchChange,
  onNavigateToMatch,
  isVisible,
  onClose,
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when search bar becomes visible
  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isVisible]);

  // Perform search when query changes
  useEffect(() => {
    if (query.trim()) {
      const searchResults = searchTranscript(segments, query);
      setResults(searchResults);
      setCurrentMatchIndex(0);
      onSearchChange(query);
      
      // Navigate to first match if exists
      if (searchResults.matches.length > 0) {
        const firstMatch = searchResults.matches[0];
        onNavigateToMatch(firstMatch.segmentIndex, firstMatch.word.start);
      }
    } else {
      setResults(null);
      setCurrentMatchIndex(0);
      onSearchChange("");
    }
  }, [query, segments, onSearchChange, onNavigateToMatch]);

  // Handle keyboard shortcuts - Requirement 4.5
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (results && results.matches.length > 0) {
          // Navigate to next match on Enter
          const nextIndex = e.shiftKey
            ? getPreviousMatchIndex(currentMatchIndex, results.totalCount)
            : getNextMatchIndex(currentMatchIndex, results.totalCount);
          
          setCurrentMatchIndex(nextIndex);
          const match = getMatchAtIndex(results, nextIndex);
          if (match) {
            onNavigateToMatch(match.segmentIndex, match.word.start);
          }
        }
      }
    },
    [results, currentMatchIndex, onClose, onNavigateToMatch]
  );

  // Navigate to next match - Requirement 4.5
  const handleNextMatch = useCallback(() => {
    if (results && results.matches.length > 0) {
      const nextIndex = getNextMatchIndex(currentMatchIndex, results.totalCount);
      setCurrentMatchIndex(nextIndex);
      const match = getMatchAtIndex(results, nextIndex);
      if (match) {
        onNavigateToMatch(match.segmentIndex, match.word.start);
      }
    }
  }, [results, currentMatchIndex, onNavigateToMatch]);

  // Navigate to previous match - Requirement 4.5
  const handlePreviousMatch = useCallback(() => {
    if (results && results.matches.length > 0) {
      const prevIndex = getPreviousMatchIndex(currentMatchIndex, results.totalCount);
      setCurrentMatchIndex(prevIndex);
      const match = getMatchAtIndex(results, prevIndex);
      if (match) {
        onNavigateToMatch(match.segmentIndex, match.word.start);
      }
    }
  }, [results, currentMatchIndex, onNavigateToMatch]);

  // Clear search
  const handleClear = useCallback(() => {
    setQuery("");
    setResults(null);
    setCurrentMatchIndex(0);
    onSearchChange("");
    inputRef.current?.focus();
  }, [onSearchChange]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className="absolute top-0 right-0 z-50 p-4"
        >
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-2">
            {/* Search Icon */}
            <svg
              className="w-4 h-4 text-zinc-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>

            {/* Search Input */}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ara... (Esc: kapat)"
              className="bg-transparent text-zinc-200 placeholder-zinc-500 outline-none w-48 text-sm"
            />

            {/* Results Count */}
            {results && (
              <span className="text-xs text-zinc-500 whitespace-nowrap">
                {results.totalCount > 0
                  ? `${currentMatchIndex + 1}/${results.totalCount}`
                  : "0 sonuç"}
              </span>
            )}

            {/* Navigation Buttons - Requirement 4.5 */}
            {results && results.totalCount > 0 && (
              <>
                <button
                  onClick={handlePreviousMatch}
                  className="p-1 hover:bg-zinc-800 rounded transition-colors"
                  title="Önceki (Shift+Enter)"
                >
                  <svg
                    className="w-4 h-4 text-zinc-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 15l7-7 7 7"
                    />
                  </svg>
                </button>
                <button
                  onClick={handleNextMatch}
                  className="p-1 hover:bg-zinc-800 rounded transition-colors"
                  title="Sonraki (Enter)"
                >
                  <svg
                    className="w-4 h-4 text-zinc-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </>
            )}

            {/* Clear Button */}
            {query && (
              <button
                onClick={handleClear}
                className="p-1 hover:bg-zinc-800 rounded transition-colors"
                title="Temizle"
              >
                <svg
                  className="w-4 h-4 text-zinc-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1 hover:bg-zinc-800 rounded transition-colors ml-1"
              title="Kapat (Esc)"
            >
              <svg
                className="w-4 h-4 text-zinc-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SearchBar;
