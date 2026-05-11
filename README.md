# Local Voice Control

A React application for controlling image parameters (gain, width, zoom) using voice commands — **100% local**, no cloud APIs.

## Stack

| Layer | Technology |
|---|---|
| UI | React 18 + TypeScript + MUI v5 |
| State | Zustand v5 |
| Speech-to-Text | [Sherpa-ONNX](https://github.com/k2-fsa/sherpa-onnx) (WASM, runs in browser) |
| Command parsing | [Ollama](https://ollama.com) + `qwen2.5:0.5b` (local LLM via Docker) |
| Container runtime | Rancher Desktop (or any Docker-compatible runtime) |

---

## Quick Start

### 1. Install Node.js dependencies

```powershell
npm install
```

### 2. Download Sherpa-ONNX WASM + model files

```powershell
.\scripts\setup.ps1
```

This will:
- Download the Sherpa-ONNX streaming-ASR WASM files → `public/sherpa-onnx/`
- Download the `sherpa-onnx-streaming-zipformer-en-2023-06-26` model → `public/models/`
- Create a `.env` from `.env.example`

#### Manual download (if the script fails)

1. Go to [Sherpa-ONNX Releases](https://github.com/k2-fsa/sherpa-onnx/releases)
2. Download the **wasm-streaming-asr** tar for the latest version
3. Extract and copy `sherpa-onnx-streaming-asr.js` and `sherpa-onnx-streaming-asr.wasm` to `public/sherpa-onnx/`
4. Download an English streaming model from the [asr-models tag](https://github.com/k2-fsa/sherpa-onnx/releases/tag/asr-models)
5. Copy `encoder-*.onnx`, `decoder-*.onnx`, `joiner-*.onnx`, `tokens.txt` to `public/models/`

### 3. Start Ollama (local LLM)

```powershell
npm run ollama:up      # docker compose up -d
npm run ollama:pull    # pulls qwen2.5:0.5b (~400 MB)
```

Requires Rancher Desktop (or Docker) to be running.

### 4. Configure environment (optional)

Copy `.env.example` to `.env` and adjust paths / model names if needed.

### 5. Run the app

```powershell
npm run dev
```

Open http://localhost:5173

---

## Usage

1. Click **⚙** (settings icon) in the Voice Control panel
2. Verify the file paths match your downloaded files, then click **Initialize**
3. Wait for the ASR status to change from *Loading…* to **Ready**
4. Click the **microphone button** to start/stop recording
5. Speak a command — the live transcript is shown while you speak
6. After a natural pause, the final transcript is sent to Ollama for parsing
7. The matched command is applied and logged in the **Command Log**

### Supported voice commands (examples)

| Voice | Action |
|---|---|
| "set gain to 80" | gain → 80 |
| "increase gain by 20" | gain += 20 |
| "zoom in" / "zoom out" | zoom ± 0.5 |
| "set zoom to 2.5" | zoom → 2.5 |
| "decrease width by 10" | width -= 10 |
| "full width" | width → 100 |
| "maximum gain" | gain → 100 |
| "reset zoom" | zoom → 1.0 |

> If Ollama is offline, a built-in regex parser handles the most common patterns.

---

## Architecture

```
Browser
  │
  ├── React UI (MUI)
  │     └── Zustand store (params, ASR status, command log)
  │
  ├── AudioCapture  ──► ScriptProcessorNode @ 16 kHz
  │                        │
  │                        ▼
  ├── SherpaService ──► Web Worker
  │                        │  (loads sherpa-onnx WASM, runs streaming ASR)
  │                        ▼
  │                   Transcript (final)
  │                        │
  └── OllamaService ──► POST /api/generate (localhost:11434)
                           │  (qwen2.5:0.5b parses text → JSON)
                           ▼
                      VoiceCommand → Zustand applyCommand()
```

---

## File structure

```
local-voice-control/
├── public/
│   ├── sherpa-onnx/          ← WASM files (gitignored, downloaded by setup.ps1)
│   └── models/               ← ONNX model files (gitignored, downloaded by setup.ps1)
├── src/
│   ├── components/
│   │   ├── AppLayout.tsx
│   │   ├── ImageParametersPanel.tsx
│   │   ├── ImagePreview.tsx
│   │   ├── VoiceControlPanel.tsx
│   │   ├── CommandLog.tsx
│   │   └── AsrInitDialog.tsx
│   ├── hooks/
│   │   └── useVoiceControl.ts
│   ├── services/
│   │   ├── asr/audioCapture.ts
│   │   ├── asr/sherpaService.ts
│   │   └── llm/ollamaService.ts
│   ├── store/imageStore.ts
│   ├── types/index.ts
│   ├── workers/sherpa.worker.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── theme.ts
├── docker-compose.yml        ← Ollama service
├── scripts/setup.ps1         ← Model/WASM downloader
└── .env.example
```

---

## Troubleshooting

| Issue | Fix |
|---|---|
| ASR stays on "Loading…" | Check browser console for WASM fetch errors. Verify files in `public/sherpa-onnx/`. |
| "Sherpa-ONNX initialization timed out" | Model files may be missing or paths wrong. Open the ⚙ dialog and verify URLs. |
| Microphone permission denied | Browser needs HTTPS or localhost. Allow microphone in browser settings. |
| LLM: offline | Start Ollama with `npm run ollama:up` and pull a model with `npm run ollama:pull`. |
| Commands not recognized | Try the fallback phrases listed in the examples table above. |
