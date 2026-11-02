"""Normalize the complete CC0 single-meow recording; no syllables are cut off."""
from pathlib import Path
import numpy as np
import soundfile as sf

folder = Path(__file__).resolve().parents[1] / 'assets' / 'audio'
audio, rate = sf.read(folder / 'clear-meow-source.mp3')
audio *= .88 / max(.001, np.max(np.abs(audio)))
sf.write(folder / 'clear-meow.wav', audio, rate, subtype='PCM_16')
