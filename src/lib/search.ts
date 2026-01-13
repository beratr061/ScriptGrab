/**
 * Search functionality for transcript text
 * Requirements: 4.3, 4.4, 4.5
 */

import type { Segment, Word } from "../types";

// ============================================
// Search Result Types
// ============================================

/**
 * Represents a single search match position
 */
export interface SearchMatch {
  segmentId: string;
  segmentIndex: number;
  wordIndex: number;
  word: Word;
  matchStart: number; // Character position within the word
  matchEnd: number;
}

/**
 * Search results with navigation state
 */
export interface SearchResults {
  query: string;
  matches: SearchMatch[];
  totalCount: number;
}

// ============================================
// Search Functions
// ============================================

/**
 * Searches for all occurrences of a query in transcript segments
 * Property 7: Search Function Completeness
 * 
 * @param segments - Array of transcript segments to search
 * @param query - Search query string (case-insensitive)
 * @returns SearchResults with all matching positions
 * 
 * Requirements: 4.4 - highlight all matching words in the transcript
 */
export function searchTranscript(
  segments: Segment[],
  query: string
): SearchResults {
  const matches: SearchMatch[] = [];
  
  // Empty query returns no matches
  if (!query || query.trim() === "") {
    return { query: "", matches: [], totalCount: 0 };
  }
  
  const normalizedQuery = query.toLowerCase();
  
  for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex++) {
    const segment = segments[segmentIndex];
    
    // Search in words if available
    if (segment.words && segment.words.length > 0) {
      for (let wordIndex = 0; wordIndex < segment.words.length; wordIndex++) {
        const word = segment.words[wordIndex];
        const normalizedWord = word.word.toLowerCase();
        
        // Find all occurrences of query in this word
        let searchPos = 0;
        while (searchPos < normalizedWord.length) {
          const matchStart = normalizedWord.indexOf(normalizedQuery, searchPos);
          if (matchStart === -1) break;
          
          matches.push({
            segmentId: segment.id,
            segmentIndex,
            wordIndex,
            word,
            matchStart,
            matchEnd: matchStart + normalizedQuery.length,
          });
          
          // Move past this match to find overlapping matches
          searchPos = matchStart + 1;
        }
      }
    } else {
      // Fallback: search in segment text directly
      const normalizedText = segment.text.toLowerCase();
      let searchPos = 0;
      let wordIndex = 0;
      
      while (searchPos < normalizedText.length) {
        const matchStart = normalizedText.indexOf(normalizedQuery, searchPos);
        if (matchStart === -1) break;
        
        matches.push({
          segmentId: segment.id,
          segmentIndex,
          wordIndex: wordIndex++,
          word: {
            word: segment.text.substring(matchStart, matchStart + query.length),
            start: segment.start,
            end: segment.end,
          },
          matchStart: 0,
          matchEnd: query.length,
        });
        
        searchPos = matchStart + 1;
      }
    }
  }
  
  return {
    query,
    matches,
    totalCount: matches.length,
  };
}

/**
 * Checks if a specific word matches the search query
 * Used for highlighting in the UI
 * 
 * @param word - Word to check
 * @param query - Search query (case-insensitive)
 * @returns true if the word contains the query
 */
export function wordMatchesQuery(word: Word, query: string): boolean {
  if (!query || query.trim() === "") return false;
  return word.word.toLowerCase().includes(query.toLowerCase());
}

/**
 * Gets the match at a specific index for navigation
 * Requirements: 4.5 - navigation between matches
 * 
 * @param results - Search results
 * @param index - Current match index
 * @returns The match at the given index, or null if out of bounds
 */
export function getMatchAtIndex(
  results: SearchResults,
  index: number
): SearchMatch | null {
  if (index < 0 || index >= results.matches.length) {
    return null;
  }
  return results.matches[index];
}

/**
 * Gets the next match index (wraps around)
 * Requirements: 4.5 - next button navigation
 * 
 * @param currentIndex - Current match index
 * @param totalMatches - Total number of matches
 * @returns Next index (wraps to 0 if at end)
 */
export function getNextMatchIndex(
  currentIndex: number,
  totalMatches: number
): number {
  if (totalMatches === 0) return -1;
  return (currentIndex + 1) % totalMatches;
}

/**
 * Gets the previous match index (wraps around)
 * Requirements: 4.5 - previous button navigation
 * 
 * @param currentIndex - Current match index
 * @param totalMatches - Total number of matches
 * @returns Previous index (wraps to end if at start)
 */
export function getPreviousMatchIndex(
  currentIndex: number,
  totalMatches: number
): number {
  if (totalMatches === 0) return -1;
  return currentIndex <= 0 ? totalMatches - 1 : currentIndex - 1;
}

/**
 * Finds all positions where query appears in segment text
 * This is the core function for Property 7: Search Function Completeness
 * 
 * @param segmentText - The text to search in
 * @param query - The search query (case-insensitive)
 * @returns Array of starting positions where query appears
 */
export function findAllPositions(segmentText: string, query: string): number[] {
  const positions: number[] = [];
  
  if (!query || query.trim() === "" || !segmentText) {
    return positions;
  }
  
  const normalizedText = segmentText.toLowerCase();
  const normalizedQuery = query.toLowerCase();
  
  let searchPos = 0;
  while (searchPos < normalizedText.length) {
    const matchPos = normalizedText.indexOf(normalizedQuery, searchPos);
    if (matchPos === -1) break;
    
    positions.push(matchPos);
    searchPos = matchPos + 1;
  }
  
  return positions;
}
