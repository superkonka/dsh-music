#!/usr/bin/env python3
"""Demucs vocal-separation wrapper for dsh-music karaoke.

Usage: python separate.py <input_audio> <cache_dir>

Runs demucs two-stem separation (vocals + accompaniment), moves the
accompaniment to <cache_dir>/no_vocals.wav, and prints its path.

Uses os._exit so the process terminates even if torch leaves
non-daemon threads behind.
"""
import sys
import os
import shutil
from pathlib import Path


def main():
    if len(sys.argv) != 3:
        print("usage: separate.py <input> <cache_dir>", file=sys.stderr, flush=True)
        os._exit(2)

    input_path = sys.argv[1]
    cache_dir = Path(sys.argv[2])
    cache_dir.mkdir(parents=True, exist_ok=True)

    import demucs.separate
    demucs.separate.main([
        "--two-stems=vocals",
        "-n", "htdemucs",
        "--shifts=1",
        "-o", str(cache_dir),
        input_path,
    ])

    stem = Path(input_path).stem
    src = cache_dir / "htdemucs" / stem / "no_vocals.wav"
    if not src.exists():
        found = list(cache_dir.rglob("no_vocals.wav"))
        src = found[0] if found else None

    if src is None:
        print("no_vocals.wav not found", file=sys.stderr, flush=True)
        os._exit(1)

    dst = cache_dir / "no_vocals.wav"
    shutil.move(str(src), str(dst))
    shutil.rmtree(str(cache_dir / "htdemucs"), ignore_errors=True)
    print(str(dst), flush=True)
    os._exit(0)


if __name__ == "__main__":
    main()
