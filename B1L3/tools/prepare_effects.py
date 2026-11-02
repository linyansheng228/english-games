"""Create original, offline WAV feedback effects; no third-party recordings."""
from pathlib import Path
import wave
import numpy as np

RATE = 44100
FOLDER = Path(__file__).resolve().parents[1] / 'assets' / 'audio'
FOLDER.mkdir(parents=True, exist_ok=True)

def save(name, signal):
    signal = signal / max(1., np.max(np.abs(signal))) * .65
    with wave.open(str(FOLDER / name), 'wb') as file:
        file.setnchannels(1)
        file.setsampwidth(2)
        file.setframerate(RATE)
        file.writeframes((signal * 32767).astype('<i2').tobytes())

t = np.arange(int(RATE * .85)) / RATE
chime = np.zeros_like(t)
for onset, frequency in [(0, 659.25), (.12, 830.61), (.24, 987.77), (.36, 1318.51)]:
    u = np.maximum(0, t - onset)
    env = (t >= onset) * np.minimum(u / .012, 1) * np.exp(-u * 7)
    chime += .32 * env * (np.sin(2*np.pi*frequency*u) + .18*np.sin(4*np.pi*frequency*u))
save('correct.wav', chime)

# A short rough, descending meow. Moving formants make the vowel change to 'ow'.
t = np.arange(int(RATE * 1.05)) / RATE
f0 = np.interp(t, [0,.13,.4,.75,1.05], [250,390,330,195,140])
f0 *= 1 + .018*np.sin(2*np.pi*31*t)
phase = 2*np.pi*np.cumsum(f0) / RATE
formant1 = np.interp(t, [0,.5,1.05], [780,680,430])
formant2 = np.interp(t, [0,.5,1.05], [1900,1500,800])
meow = np.zeros_like(t)
for harmonic in range(1,32):
    frequency = harmonic*f0
    weight = (.3*np.exp(-((frequency-formant1)/300)**2) +
              .2*np.exp(-((frequency-formant2)/420)**2) + .15/harmonic)
    meow += weight*np.sin(harmonic*phase)
envelope = np.minimum(t/.06,1)*np.minimum((1.05-t)/.18,1)
roughness = .8 + .2*np.sin(2*np.pi*47*t)
save('unhappy-cat.wav', meow*envelope*roughness)
