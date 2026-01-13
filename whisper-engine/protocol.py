"""
ScriptGrab Whisper Engine - JSON Protocol Module

Defines the JSON stdout protocol for communication with the Tauri backend.

Message Types:
- progress: Real-time progress updates during transcription
- segment: Individual transcript segments with word-level timestamps
- complete: Final completion message with metadata
- error: Error messages for failure cases
"""

import json
import sys
from dataclasses import dataclass, asdict
from typing import List, Optional


@dataclass
class Word:
    """Represents a single word with timestamps."""
    word: str
    start: float
    end: float
    
    def to_dict(self) -> dict:
        return {
            "word": self.word,
            "start": round(self.start, 3),
            "end": round(self.end, 3)
        }


@dataclass
class Segment:
    """Represents a transcript segment with word-level timestamps."""
    id: str
    start: float
    end: float
    text: str
    words: List[Word]
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "start": round(self.start, 3),
            "end": round(self.end, 3),
            "text": self.text,
            "words": [w.to_dict() for w in self.words]
        }


class ProtocolEmitter:
    """
    Handles JSON protocol message emission to stdout.
    
    All messages are flushed immediately to ensure real-time communication
    with the Tauri backend.
    """
    
    @staticmethod
    def _emit(message: dict) -> None:
        """Emit a JSON message to stdout."""
        print(json.dumps(message), flush=True)
    
    @staticmethod
    def progress(percent: int, status: str) -> None:
        """
        Emit a progress message.
        
        Args:
            percent: Progress percentage (0-100)
            status: Human-readable status message
        
        Output format:
            {"type": "progress", "percent": N, "status": "..."}
        """
        ProtocolEmitter._emit({
            "type": "progress",
            "percent": max(0, min(100, percent)),
            "status": status
        })
    
    @staticmethod
    def segment(segment_data: Segment) -> None:
        """
        Emit a segment message.
        
        Args:
            segment_data: Segment object with id, timestamps, text, and words
        
        Output format:
            {"type": "segment", "data": {...}}
        """
        ProtocolEmitter._emit({
            "type": "segment",
            "data": segment_data.to_dict()
        })
    
    @staticmethod
    def segment_dict(segment_dict: dict) -> None:
        """
        Emit a segment message from a dictionary.
        
        Args:
            segment_dict: Dictionary with segment data
        
        Output format:
            {"type": "segment", "data": {...}}
        """
        ProtocolEmitter._emit({
            "type": "segment",
            "data": segment_dict
        })
    
    @staticmethod
    def complete(language: str, duration: float) -> None:
        """
        Emit a completion message.
        
        Args:
            language: Detected language code (e.g., "en", "tr")
            duration: Total audio duration in seconds
        
        Output format:
            {"type": "complete", "language": "...", "duration": N}
        """
        ProtocolEmitter._emit({
            "type": "complete",
            "language": language,
            "duration": round(duration, 3)
        })
    
    @staticmethod
    def error(message: str) -> None:
        """
        Emit an error message.
        
        Args:
            message: Error description
        
        Output format:
            {"type": "error", "message": "..."}
        """
        ProtocolEmitter._emit({
            "type": "error",
            "message": message
        })


# Convenience functions for direct import
emit_progress = ProtocolEmitter.progress
emit_segment = ProtocolEmitter.segment
emit_segment_dict = ProtocolEmitter.segment_dict
emit_complete = ProtocolEmitter.complete
emit_error = ProtocolEmitter.error
