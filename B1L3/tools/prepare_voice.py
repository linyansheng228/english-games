"""Build local natural English audio; only needed when changing sentences."""
import asyncio
from pathlib import Path
import edge_tts

SENTENCES = [
    'Lucy is in the box.',
    'Billy is between the box and the chair.',
    'Milo is on the table.',
    'Tommy is under the table.',
    'Sammy and Maggie are in front of the TV.',
    'Puffy is next to the robot dog.',
]

async def main():
    folder = Path(__file__).resolve().parents[1] / 'assets' / 'audio'
    folder.mkdir(parents=True, exist_ok=True)
    for number, sentence in enumerate(SENTENCES, 1):
        target = folder / f'question-{number}.mp3'
        await edge_tts.Communicate(sentence, 'en-US-JennyNeural', rate='-8%').save(str(target))
        print(target.name, target.stat().st_size, flush=True)

if __name__ == '__main__':
    asyncio.run(main())
