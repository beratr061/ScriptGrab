# ScriptGrab Whisper Engine

Python sidecar for audio/video transcription using OpenAI's Whisper model with word-level timestamps.

## Installation

```bash
cd whisper-engine
pip install -r requirements.txt
```

## Usage

```bash
python engine.py <audio_path> [--model MODEL] [--device DEVICE]
```

### Arguments

- `audio_path`: Path to the audio or video file to transcribe
- `--model`: Whisper model size (tiny, base, small, medium, large). Default: base
- `--device`: Device to use (cpu, cuda). Default: auto-detect

### Example

```bash
python engine.py "C:\path\to\audio.mp3" --model small
```

## JSON Output Protocol

The engine communicates via JSON messages on stdout:

### Progress Message
```json
{"type": "progress", "percent": 35, "status": "Transcribing... 35%"}
```

### Segment Message
```json
{
  "type": "segment",
  "data": {
    "id": "seg_0001",
    "start": 0.0,
    "end": 3.5,
    "text": "Hello world",
    "words": [
      {"word": "Hello", "start": 0.0, "end": 0.8},
      {"word": "world", "start": 0.9, "end": 1.5}
    ]
  }
}
```

### Complete Message
```json
{"type": "complete", "language": "en", "duration": 120.5}
```

### Error Message
```json
{"type": "error", "message": "File not found: audio.mp3"}
```

## Building Executable

```bash
python build.py
```

This creates `whisper-engine.exe` in the `dist` folder for use as a Tauri sidecar.
