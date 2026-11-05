# 音效來源與授權

## clear-meow.wav（目前答對音效）

- 原作：Cat meowing for food 3
- 作者：Sadiquecat
- 原作頁：https://freesound.org/s/730100/
- 授權：CC0 1.0 Universal
- 授權全文：https://creativecommons.org/publicdomain/zero/1.0/
- 來源：https://cdn.freesound.org/previews/730/730100_5287430-hq.mp3
- 修改：保留完整單聲貓叫（約 1.24 秒），調整峰值至 0.88，轉為 PCM WAV。
- 保留 clear-meow-source.mp3，處理腳本為 tools/prepare_clear_meow.py。

## room-music.wav（背景音樂）

- 本遊戲原創器樂旋律，24 秒循環，沒有取樣外部音樂或錄音。
- 由 tools/prepare_music.py 製作。
- 低音量播放；朗讀與音效期間降低音量；可透過遊戲中的開關關閉。

## happy-cat.wav（舊版素材，目前未使用）

- 原作：cat meow soft comfortable happy attention 2
- 作者：jerry.berumen
- 原作頁：https://freesound.org/people/jerry.berumen/sounds/768909/
- 授權：Creative Commons Attribution 4.0 International（CC BY 4.0）
- 授權全文：https://creativecommons.org/licenses/by/4.0/
- 來源：https://cdn.freesound.org/previews/768/768909_6753194-hq.mp3
- 修改：取原始預覽 1.95–3.10 秒，調整音量，首尾各加 25ms 淡入淡出，轉為 WAV。
- 若再使用此舊版音效，須保留本段作者署名、原作與授權連結。

## applause-cheers.mp3

- 原作：Audience Clapping.wav
- 作者：Zeraora
- 原作頁：https://freesound.org/people/Zeraora/sounds/429422/
- 授權：CC0 1.0 Universal
- 授權全文：https://creativecommons.org/publicdomain/zero/1.0/
- 來源：https://cdn.freesound.org/previews/429/429422_7347459-hq.mp3
- 未修改 MP3 預覽，包含觀眾歡呼與掌聲，長約 8.6 秒。

## 其他音檔

- unhappy-cat.wav：專案原創合成音效，由 tools/prepare_effects.py 製作。
- question-1.mp3 至 question-6.mp3：六句英文題目的自然語音音檔，由 tools/prepare_voice.py 製作。
- challenge/：Challenge 目前可生成的句子錄音。使用同一個腳本的 `--challenge` 選項，以和 Basic 相同的 Jenny 美式女聲及語速製作。
- correct.wav：舊版和弦提示音，保留作為開發素材；遊戲已改用 happy-cat.wav。
