#!/usr/bin/env python3
"""
ScriptGrab Whisper Engine - Python Sidecar for Audio Transcription

This module provides the core transcription functionality using OpenAI's Whisper model
with word-level timestamps via whisper-timestamped.

JSON stdout protocol:
- Progress: {"type": "progress", "percent": N, "status": "..."}
- Segment: {"type": "segment", "data": {...}}
- Complete: {"type": "complete", "language": "...", "duration": N}
- Error: {"type": "error", "message": "..."}
"""

import sys
import os
import argparse
from pathlib import Path
from typing import Optional
from contextlib import redirect_stdout, redirect_stderr
import io

# Redirect all non-JSON output to stderr
# This is critical for Tauri sidecar communication
class StderrRedirector:
    """Redirects stdout writes to stderr for non-protocol messages."""
    def __init__(self):
        self._original_stdout = sys.stdout
        self._original_stderr = sys.stderr
        
    def write(self, text):
        # Write to stderr instead of stdout
        self._original_stderr.write(text)
        self._original_stderr.flush()
        
    def flush(self):
        self._original_stderr.flush()

# Capture any output during imports
_import_buffer = io.StringIO()

# Suppress all warnings and redirect output during imports
import warnings
warnings.filterwarnings("ignore")

# Suppress tqdm and other progress bars
os.environ["TQDM_DISABLE"] = "1"

# Temporarily redirect stdout during imports to prevent non-JSON output
_original_stdout = sys.stdout
sys.stdout = StderrRedirector()

try:
    import whisper_timestamped as whisper
finally:
    # Restore stdout for our JSON protocol
    sys.stdout = _original_stdout

from protocol import (
    emit_progress,
    emit_segment_dict,
    emit_complete,
    emit_error
)


def format_segment(segment: dict, segment_index: int) -> dict:
    """
    Format a whisper segment into the expected output format.
    
    Args:
        segment: Raw segment from whisper-timestamped
        segment_index: Index of the segment for ID generation
        
    Returns:
        Formatted segment dictionary with id, start, end, text, and words
    """
    segment_id = f"seg_{segment_index:04d}"
    
    words = []
    if "words" in segment:
        for word_data in segment["words"]:
            words.append({
                "word": word_data.get("text", "").strip(),
                "start": round(word_data.get("start", 0.0), 3),
                "end": round(word_data.get("end", 0.0), 3)
            })
    
    return {
        "id": segment_id,
        "start": round(segment.get("start", 0.0), 3),
        "end": round(segment.get("end", 0.0), 3),
        "text": segment.get("text", "").strip(),
        "words": words
    }


def get_audio_duration(audio_path: str) -> float:
    """
    Get the duration of an audio file using whisper's audio loading.
    
    Args:
        audio_path: Path to the audio file
        
    Returns:
        Duration in seconds
    """
    try:
        audio = whisper.load_audio(audio_path)
        # Audio is loaded at 16kHz sample rate
        duration = len(audio) / 16000.0
        return duration
    except Exception:
        return 0.0


class TranscriptionProgressCallback:
    """Callback class to track transcription progress."""
    
    def __init__(self, total_duration: float):
        self.total_duration = total_duration
        self.last_percent = 0
    
    def __call__(self, current_time: float) -> None:
        """Called during transcription with current timestamp."""
        if self.total_duration > 0:
            percent = int((current_time / self.total_duration) * 100)
            percent = min(percent, 99)  # Reserve 100% for completion
            
            # Only emit if percent changed significantly
            if percent > self.last_percent:
                self.last_percent = percent
                emit_progress(percent, f"Transcribing... {percent}%")


def transcribe_audio(
    audio_path: str,
    model_size: str = "base",
    device: Optional[str] = None
) -> None:
    """
    Transcribe an audio file using Whisper with word-level timestamps.
    
    Emits progress, segment, and completion messages via stdout JSON protocol.
    
    Args:
        audio_path: Path to the audio/video file
        model_size: Whisper model size (tiny, base, small, medium, large)
        device: Device to use (cpu, cuda, or None for auto-detect)
    """
    try:
        # Validate file exists
        if not Path(audio_path).exists():
            emit_error(f"File not found: {audio_path}")
            sys.exit(1)
        
        # Step 1: Load audio and get duration
        emit_progress(5, "Loading audio file...")
        total_duration = get_audio_duration(audio_path)
        
        if total_duration <= 0:
            emit_error("Could not determine audio duration")
            sys.exit(1)
        
        # Step 2: Load model
        emit_progress(10, f"Loading Whisper {model_size} model...")
        
        # Auto-detect device if not specified
        if device is None:
            import torch
            device = "cuda" if torch.cuda.is_available() else "cpu"
        
        # Suppress model loading output
        _stderr_redirector = StderrRedirector()
        _temp_stdout = sys.stdout
        sys.stdout = _stderr_redirector
        try:
            model = whisper.load_model(model_size, device=device)
        finally:
            sys.stdout = _temp_stdout
            
        emit_progress(20, "Model loaded, starting transcription...")
        
        # Step 3: Transcribe with word-level timestamps
        audio = whisper.load_audio(audio_path)
        
        # Suppress transcription output
        _temp_stdout2 = sys.stdout
        sys.stdout = _stderr_redirector
        try:
            result = whisper.transcribe(
                model,
                audio,
                language=None,  # Auto-detect language
                vad=False,  # Disable VAD to avoid silero dependency issues
                detect_disfluencies=False,
                compute_word_confidence=False
            )
        finally:
            sys.stdout = _temp_stdout2
        
        # Step 4: Process and emit segments
        emit_progress(90, "Processing segments...")
        
        detected_language = result.get("language", "unknown")
        segments = result.get("segments", [])
        
        for idx, segment in enumerate(segments):
            formatted_segment = format_segment(segment, idx)
            emit_segment_dict(formatted_segment)
        
        # Step 5: Complete
        emit_progress(100, "Transcription complete")
        emit_complete(detected_language, total_duration)
        
    except KeyboardInterrupt:
        emit_error("Transcription cancelled by user")
        sys.exit(130)
    except Exception as e:
        emit_error(str(e))
        sys.exit(1)


def main():
    """Main entry point for the whisper engine CLI."""
    parser = argparse.ArgumentParser(
        description="ScriptGrab Whisper Engine - Audio Transcription Sidecar"
    )
    parser.add_argument(
        "audio_path",
        type=str,
        help="Path to the audio or video file to transcribe"
    )
    parser.add_argument(
        "--model",
        type=str,
        default="base",
        choices=["tiny", "base", "small", "medium", "large"],
        help="Whisper model size (default: base)"
    )
    parser.add_argument(
        "--device",
        type=str,
        default=None,
        choices=["cpu", "cuda"],
        help="Device to use for inference (default: auto-detect)"
    )
    
    args = parser.parse_args()
    
    transcribe_audio(
        audio_path=args.audio_path,
        model_size=args.model,
        device=args.device
    )


if __name__ == "__main__":
    main()
