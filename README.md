# Local Voice Control

A React application for controlling image parameters (gain, width, zoom) using voice commands — **100% local**, no cloud APIs.

## Stack

| Layer | Technology |
|---|---|
| UI | React 18 + TypeScript + MUI v5 |
| State | Zustand v5 |
| Speech-to-Text | [Sherpa-ONNX](https://github.com/k2-fsa/sherpa-onnx) (WASM, runs in browser) |
| Command parsing | [Ollama](https://ollama.com) **or** [Foundry Local](https://learn.microsoft.com/en-us/azure/foundry-local/) (configurable, local LLM) |
| Container runtime | Rancher Desktop or any Docker-compatible runtime (Ollama only) |

---

## Quick Start

### 1. Install Node.js dependencies

```powershell
npm install
```

### 2. Download Sherpa-ONNX WASM + English model

```powershell
.\scripts\setup.ps1
```

This downloads the English zipformer streaming-ASR WASM bundle from the [k2-fsa GitHub releases](https://github.com/k2-fsa/sherpa-onnx/releases) into `public/sherpa-onnx/`. The model is bundled inside the `.data` file — no separate ONNX files are needed.

### 3. Configure the LLM provider

Copy `.env.example` to `.env` and choose a provider:

#### Option A — Ollama (Docker)

```powershell
npm run ollama:up        # docker compose up -d
npm run ollama:pull      # pulls qwen2.5:0.5b (~400 MB)
```

Recommended models (install with `ollama pull <model>`):

| Model | Size | Notes |
|---|---|---|
| `phi4-mini` | 2.5 GB | Best JSON accuracy for this task |
| `qwen2.5:1.5b` | 1 GB | Fast, good JSON |
| `gemma3:1b` | 815 MB | Lightweight |

Set in `.env` (see .env.example):
```env
VITE_LLM_PROVIDER=ollama
VITE_OLLAMA_MODEL=phi4-mini
```

#### Option B — Foundry Local (Windows ML)

Install [Foundry Local](https://learn.microsoft.com/en-us/azure/foundry-local/), then run:

```bash
foundry model run qwen2.5-1.5b
```

This starts the OpenAI-compatible REST server at `http://localhost:5764`.

Set in `.env`:
```env
VITE_LLM_PROVIDER=foundry
VITE_FOUNDRY_MODEL=qwen2.5-1.5b
```

> If the LLM is offline the app falls back to a built-in regex parser that handles the most common command patterns.

### 4. Run the app

```powershell
npm run dev
```

Open http://localhost:5173

---

## Usage

1. Click **⚙** (settings icon) in the Voice Control panel
2. Click **Initialize** to load the ASR model
3. Wait for the ASR status to change from *Loading…* to **Ready**
4. Click the **microphone button** to start/stop recording
5. Speak a command — the live transcript appears while you speak
6. After a natural pause, the final transcript is sent to the LLM for parsing
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
  └── LlmService ─┬─► Ollama  POST /api/generate        (localhost:11434)
                  └─► Foundry POST /v1/chat/completions  (localhost:5764)
                           │  (LLM parses text → JSON command)
                           ▼
                      VoiceCommand → Zustand applyCommand()
```

---

## File structure

```
local-voice-control/
├── public/
│   ├── sherpa-onnx/          ← WASM + bundled English model (gitignored, downloaded by setup.ps1)
│   └── models/               ← reserved for future separate model files
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
│   │   └── llm/llmService.ts     ← supports Ollama + Foundry Local
│   ├── store/imageStore.ts
│   ├── types/index.ts
│   ├── workers/sherpa.worker.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── theme.ts
├── docker-compose.yml        ← Ollama service (optional)
├── scripts/setup.ps1         ← WASM downloader
└── .env.example
```

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `VITE_LLM_PROVIDER` | `ollama` | `ollama` or `foundry` |
| `VITE_OLLAMA_URL` | `http://localhost:11434` | Ollama base URL |
| `VITE_OLLAMA_MODEL` | `phi4-mini` | Ollama model tag |
| `VITE_FOUNDRY_URL` | `http://localhost:5764` | Foundry Local REST URL |
| `VITE_FOUNDRY_MODEL` | `phi-3.5-mini-instruct` | Foundry model alias |

---

## Troubleshooting

| Issue | Fix |
|---|---|
| ASR stays on "Loading…" | Check browser console. Verify files exist in `public/sherpa-onnx/` (run `setup.ps1`). |
| "ASR initialization timed out" | Model files may be missing. Re-run `setup.ps1`. |
| Microphone permission denied | Browser needs HTTPS or localhost. Allow microphone in browser settings. |
| LLM: offline (Ollama) | Run `npm run ollama:up` and `npm run ollama:pull`. |
| LLM: offline (Foundry) | Run `foundry model run <model-alias>` to start the REST server. |
| Commands not recognized | Check the Command Log for the raw transcript. Try rephrasing using the examples above. |
