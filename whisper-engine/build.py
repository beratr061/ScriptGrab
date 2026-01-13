#!/usr/bin/env python3
"""
ScriptGrab Whisper Engine - Build Script

This script builds the whisper-engine as a standalone executable using PyInstaller.
The resulting executable can be used as a Tauri sidecar.

Usage:
    python build.py [--onefile] [--debug]

Output:
    dist/whisper-engine.exe (Windows)
    dist/whisper-engine (Linux/macOS)
"""

import os
import sys
import shutil
import platform
import subprocess
from pathlib import Path


def get_platform_suffix() -> str:
    """Get the platform-specific suffix for the sidecar binary."""
    system = platform.system().lower()
    machine = platform.machine().lower()
    
    if system == "windows":
        if machine in ("amd64", "x86_64"):
            return "x86_64-pc-windows-msvc"
        elif machine in ("arm64", "aarch64"):
            return "aarch64-pc-windows-msvc"
    elif system == "darwin":
        if machine in ("arm64", "aarch64"):
            return "aarch64-apple-darwin"
        else:
            return "x86_64-apple-darwin"
    elif system == "linux":
        if machine in ("arm64", "aarch64"):
            return "aarch64-unknown-linux-gnu"
        else:
            return "x86_64-unknown-linux-gnu"
    
    return "unknown"


def build_executable(onefile: bool = True, debug: bool = False) -> bool:
    """
    Build the whisper-engine executable using PyInstaller.
    
    Args:
        onefile: If True, create a single executable file
        debug: If True, include debug information
        
    Returns:
        True if build succeeded, False otherwise
    """
    script_dir = Path(__file__).parent
    engine_path = script_dir / "engine.py"
    
    if not engine_path.exists():
        print(f"Error: engine.py not found at {engine_path}")
        return False
    
    # Base PyInstaller arguments
    args = [
        sys.executable, "-m", "PyInstaller",
        "--name", "whisper-engine",
        "--clean",
        "--noconfirm",
    ]
    
    # Add onefile flag
    if onefile:
        args.append("--onefile")
    else:
        args.append("--onedir")
    
    # Add debug/console options
    if debug:
        args.append("--console")
    else:
        args.append("--console")  # Keep console for stdout communication
    
    # Hidden imports for whisper and torch
    hidden_imports = [
        "whisper_timestamped",
        "whisper",
        "torch",
        "torchaudio",
        "numpy",
        "scipy",
        "ffmpeg",
        "tiktoken",
        "tiktoken_ext",
        "tiktoken_ext.openai_public",
    ]
    
    for imp in hidden_imports:
        args.extend(["--hidden-import", imp])
    
    # Collect whisper assets (tiktoken files, mel filters, etc.)
    args.extend(["--collect-data", "whisper"])
    args.extend(["--collect-data", "tiktoken_ext"])
    
    # Add the main script
    args.append(str(engine_path))
    
    print("Building whisper-engine executable...")
    print(f"Command: {' '.join(args)}")
    
    try:
        result = subprocess.run(args, cwd=script_dir, check=True)
        print("\nBuild completed successfully!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"\nBuild failed with error code: {e.returncode}")
        return False
    except FileNotFoundError:
        print("\nError: PyInstaller not found. Install it with: pip install pyinstaller")
        return False


def copy_to_tauri_binaries(dist_dir: Path) -> bool:
    """
    Copy the built executable to the Tauri binaries directory with proper naming.
    
    Tauri expects sidecars to be named: {name}-{target_triple}[.exe]
    
    Args:
        dist_dir: Path to the PyInstaller dist directory
        
    Returns:
        True if copy succeeded, False otherwise
    """
    script_dir = Path(__file__).parent
    tauri_binaries = script_dir.parent / "src-tauri" / "binaries"
    
    # Determine source executable name
    system = platform.system().lower()
    exe_ext = ".exe" if system == "windows" else ""
    source_name = f"whisper-engine{exe_ext}"
    source_path = dist_dir / source_name
    
    if not source_path.exists():
        print(f"Error: Built executable not found at {source_path}")
        return False
    
    # Create binaries directory if it doesn't exist
    tauri_binaries.mkdir(parents=True, exist_ok=True)
    
    # Determine target name with platform suffix
    platform_suffix = get_platform_suffix()
    target_name = f"whisper-engine-{platform_suffix}{exe_ext}"
    target_path = tauri_binaries / target_name
    
    print(f"\nCopying to Tauri binaries:")
    print(f"  Source: {source_path}")
    print(f"  Target: {target_path}")
    
    try:
        shutil.copy2(source_path, target_path)
        print(f"\nSuccessfully copied to: {target_path}")
        return True
    except Exception as e:
        print(f"\nError copying file: {e}")
        return False


def main():
    """Main entry point for the build script."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Build ScriptGrab Whisper Engine executable"
    )
    parser.add_argument(
        "--onedir",
        action="store_true",
        help="Create a directory with dependencies instead of single file"
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        help="Include debug information in the build"
    )
    parser.add_argument(
        "--no-copy",
        action="store_true",
        help="Don't copy to Tauri binaries directory"
    )
    
    args = parser.parse_args()
    
    # Build the executable
    onefile = not args.onedir
    success = build_executable(onefile=onefile, debug=args.debug)
    
    if not success:
        sys.exit(1)
    
    # Copy to Tauri binaries
    if not args.no_copy:
        script_dir = Path(__file__).parent
        dist_dir = script_dir / "dist"
        
        if not copy_to_tauri_binaries(dist_dir):
            print("\nWarning: Could not copy to Tauri binaries directory")
            print("You may need to copy the executable manually.")
    
    print("\n" + "=" * 50)
    print("Build complete!")
    print("=" * 50)
    
    # Print next steps
    print("\nNext steps:")
    print("1. Ensure the sidecar is configured in tauri.conf.json")
    print("2. Test the executable: dist/whisper-engine --help")


if __name__ == "__main__":
    main()
