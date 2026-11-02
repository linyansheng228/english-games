"""Original 24-second instrumental loop, written for this teaching game."""
from pathlib import Path
import wave
import numpy as np

RATE = 32000
BEAT = .75
DURATION = 32 * BEAT
music = np.zeros(round(DURATION * RATE))

def note(midi, beat, beats, gain):
    start = round(beat * BEAT * RATE)
    length = min(round(beats * BEAT * RATE), len(music)-start)
    t = np.arange(length) / RATE
    frequency = 440 * 2**((midi-69)/12)
    # Gentle plucked keys; every note fades to zero before the loop seam.
    envelope = np.minimum(t/.018, 1) * np.exp(-t*2.5) * np.minimum((length/RATE-t)/.09,1)
    sound = np.sin(2*np.pi*frequency*t) + .22*np.sin(4*np.pi*frequency*t) + .06*np.sin(6*np.pi*frequency*t)
    music[start:start+length] += sound * envelope * gain

chords = [(48,52,55),(45,48,52),(41,45,48),(43,47,50)] * 2
melody = [72,76,79,76, 72,71,69,76, 77,76,72,69, 71,74,79,71,
          72,76,79,81, 76,72,69,72, 77,76,72,69, 71,74,71,67]
for bar, chord in enumerate(chords):
    note(chord[0]-12, bar*4, 3.7, .09)
    for beat in range(4):
        note(chord[beat%3],bar*4+beat, .8, .07)
        note(melody[bar*4+beat],bar*4+beat+.12, .7, .105)
music *= .75 / max(.001, np.max(np.abs(music)))
target = Path(__file__).resolve().parents[1] / 'assets' / 'audio' / 'room-music.wav'
with wave.open(str(target), 'wb') as output:
    output.setnchannels(1)
    output.setsampwidth(2)
    output.setframerate(RATE)
    output.writeframes((music*32767).astype('<i2').tobytes())
print(target.name, DURATION, 'seconds, original looping instrumental')
