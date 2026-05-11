import type { VoiceCommand, ImageParamKey } from '../../types';

// ─── Config ───────────────────────────────────────────────────────────────────

type LlmProvider = 'ollama' | 'foundry';

const PROVIDER     = ((import.meta.env.VITE_LLM_PROVIDER as string | undefined) ?? 'ollama') as LlmProvider;
const OLLAMA_URL   = (import.meta.env.VITE_OLLAMA_URL   as string | undefined) ?? 'http://localhost:11434';
const OLLAMA_MODEL = (import.meta.env.VITE_OLLAMA_MODEL as string | undefined) ?? 'phi4-mini';
const FOUNDRY_URL  = (import.meta.env.VITE_FOUNDRY_URL  as string | undefined) ?? 'http://localhost:5764';
const FOUNDRY_MODEL= (import.meta.env.VITE_FOUNDRY_MODEL as string | undefined) ?? 'phi-3.5-mini-instruct';

// ─── Prompt ───────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You control image display parameters. Convert voice commands to JSON.

Available parameters:
  gain  : integer 0-100  (image brightness)
  width : integer 0-100  (display width %)
  zoom  : float   0.5-5.0 (zoom level)

Actions: "set" (absolute), "increase" (add), "decrease" (subtract)

Examples:
"set gain to 80"         -> {"parameter":"gain","action":"set","value":80}
"increase zoom by 0.5"   -> {"parameter":"zoom","action":"increase","value":0.5}
"decrease width by 10"   -> {"parameter":"width","action":"decrease","value":10}
"zoom in"                -> {"parameter":"zoom","action":"increase","value":0.5}
"zoom out"               -> {"parameter":"zoom","action":"decrease","value":0.5}
"maximum gain"           -> {"parameter":"gain","action":"set","value":100}
"reset gain"             -> {"parameter":"gain","action":"set","value":50}
"full width"             -> {"parameter":"width","action":"set","value":100}

Respond with ONLY valid JSON. No explanation, no markdown, no code block.`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Extract the first JSON object from a potentially noisy response. */
function extractJson(raw: string): string {
  const match = raw.match(/\{[^{}]*\}/);
  return match ? match[0] : raw.trim();
}

const VALID_PARAMS: Set<string> = new Set<ImageParamKey>(['gain', 'width', 'zoom']);
const VALID_ACTIONS = new Set(['set', 'increase', 'decrease']);

function isValidCommand(obj: unknown): obj is VoiceCommand {
  if (typeof obj !== 'object' || obj === null) return false;
  const c = obj as Record<string, unknown>;
  return (
    VALID_PARAMS.has(c.parameter as string) &&
    VALID_ACTIONS.has(c.action as string) &&
    typeof c.value === 'number' &&
    Number.isFinite(c.value)
  );
}

// ─── Fallback regex parser ────────────────────────────────────────────────────

/**
 * Used when Ollama is unavailable or returns an unparseable response.
 * Handles common English voice patterns for gain / width / zoom.
 * The regex uses \b word boundaries and optional filler words ("the", "a", "by")
 * to match natural speech from the ASR engine.
 */
function parseCommandFallback(input: string): VoiceCommand | null {
  const t = input.toLowerCase().replace(/[^a-z0-9.\s]/g, ' ');

  // ─── gain ────────────────────────────────────────────────────────────────────
  const gainSet = t.match(/\bgain\b.*?(\d+)/);
  if (gainSet && t.match(/\bset\b|\bto\b/)) return { parameter: 'gain', action: 'set', value: Number(gainSet[1]) };

  if (t.match(/\bmax(?:imum)?\b.*\bgain\b|\bgain\b.*\bmax(?:imum)?\b/)) return { parameter: 'gain', action: 'set', value: 100 };
  if (t.match(/\bmin(?:imum)?\b.*\bgain\b|\bgain\b.*\bmin(?:imum)?\b/)) return { parameter: 'gain', action: 'set', value: 0 };
  if (t.match(/\breset\b.*\bgain\b|\bgain\b.*\breset\b/)) return { parameter: 'gain', action: 'set', value: 50 };

  const gainInc = t.match(/\b(?:increase|raise|boost)\b.*\bgain\b.*?(\d+)/);
  if (gainInc) return { parameter: 'gain', action: 'increase', value: Number(gainInc[1]) };

  const gainDec = t.match(/\b(?:decrease|lower|reduce|drop)\b.*\bgain\b.*?(\d+)/);
  if (gainDec) return { parameter: 'gain', action: 'decrease', value: Number(gainDec[1]) };

  // ─── zoom ────────────────────────────────────────────────────────────────────
  if (t.match(/\bzoom\s+in\b/)) return { parameter: 'zoom', action: 'increase', value: 0.5 };
  if (t.match(/\bzoom\s+out\b/)) return { parameter: 'zoom', action: 'decrease', value: 0.5 };

  const zoomSet = t.match(/\bzoom\b.*?(\d+(?:\.\d+)?)/);
  if (zoomSet && t.match(/\bset\b|\bto\b/)) return { parameter: 'zoom', action: 'set', value: Number(zoomSet[1]) };
  if (t.match(/\bmax(?:imum)?\b.*\bzoom\b|\bzoom\b.*\bmax(?:imum)?\b/)) return { parameter: 'zoom', action: 'set', value: 5.0 };
  if (t.match(/\breset\b.*\bzoom\b|\bzoom\b.*\breset\b/)) return { parameter: 'zoom', action: 'set', value: 1.0 };

  const zoomInc = t.match(/\b(?:increase|raise)\b.*\bzoom\b.*?(\d+(?:\.\d+)?)/);
  if (zoomInc) return { parameter: 'zoom', action: 'increase', value: Number(zoomInc[1]) };

  const zoomDec = t.match(/\b(?:decrease|lower|reduce)\b.*\bzoom\b.*?(\d+(?:\.\d+)?)/);
  if (zoomDec) return { parameter: 'zoom', action: 'decrease', value: Number(zoomDec[1]) };

  // ─── width ───────────────────────────────────────────────────────────────────
  if (t.match(/\bfull\s+width\b/)) return { parameter: 'width', action: 'set', value: 100 };
  if (t.match(/\breset\b.*\bwidth\b|\bwidth\b.*\breset\b/)) return { parameter: 'width', action: 'set', value: 100 };

  const widthSet = t.match(/\bwidth\b.*?(\d+)/);
  if (widthSet && t.match(/\bset\b|\bto\b/)) return { parameter: 'width', action: 'set', value: Number(widthSet[1]) };

  const widthInc = t.match(/\b(?:increase|expand|widen|wider)\b.*\bwidth\b.*?(\d+)/);
  if (widthInc) return { parameter: 'width', action: 'increase', value: Number(widthInc[1]) };

  const widthDec = t.match(/\b(?:decrease|shrink|narrow)\b.*\bwidth\b.*?(\d+)/);
  if (widthDec) return { parameter: 'width', action: 'decrease', value: Number(widthDec[1]) };

  return null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Sends a transcript to the configured LLM provider and returns a structured VoiceCommand.
 * Falls back to regex parsing if the LLM is unreachable or returns invalid JSON.
 */
export async function parseCommand(transcript: string): Promise<VoiceCommand | null> {
  try {
    return PROVIDER === 'foundry'
      ? await parseWithFoundry(transcript)
      : await parseWithOllama(transcript);
  } catch {
    return parseCommandFallback(transcript);
  }
}

async function parseWithOllama(transcript: string): Promise<VoiceCommand | null> {
  const prompt = `${SYSTEM_PROMPT}\n\nCommand: "${transcript}"\nJSON:`;

  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      options: { temperature: 0.0, num_predict: 64 },
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) throw new Error(`Ollama HTTP ${response.status}`);

  const data = (await response.json()) as { response: string };
  const jsonText = extractJson(data.response);
  const parsed: unknown = JSON.parse(jsonText);
  if (!isValidCommand(parsed)) throw new Error(`Unexpected JSON shape: ${jsonText}`);
  return parsed;
}

async function parseWithFoundry(transcript: string): Promise<VoiceCommand | null> {
  const response = await fetch(`${FOUNDRY_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: FOUNDRY_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Command: "${transcript}"\nJSON:` },
      ],
      temperature: 0.0,
      max_tokens: 64,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) throw new Error(`Foundry HTTP ${response.status}`);

  const data = (await response.json()) as { choices: { message: { content: string } }[] };
  const raw = data.choices?.[0]?.message?.content ?? '';
  const jsonText = extractJson(raw);
  const parsed: unknown = JSON.parse(jsonText);
  if (!isValidCommand(parsed)) throw new Error(`Unexpected JSON shape: ${jsonText}`);
  return parsed;
}

/** Returns true if the configured LLM provider is reachable and ready. */
export async function checkOllamaHealth(): Promise<boolean> {
  return PROVIDER === 'foundry'
    ? checkFoundryHealth()
    : checkOllamaHealthInternal();
}

async function checkOllamaHealthInternal(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(3_000),
    });
    if (!response.ok) return false;
    const data = (await response.json()) as { models: { name: string }[] };
    return data.models.some(
      (m) => m.name === OLLAMA_MODEL || m.name.startsWith(OLLAMA_MODEL.split(':')[0])
    );
  } catch {
    return false;
  }
}

async function checkFoundryHealth(): Promise<boolean> {
  try {
    // Foundry Local exposes GET /v1/models (OpenAI-compatible)
    const response = await fetch(`${FOUNDRY_URL}/v1/models`, {
      signal: AbortSignal.timeout(3_000),
    });
    if (!response.ok) return false;
    const data = (await response.json()) as { data: { id: string }[] };
    return data.data?.some((m) => m.id === FOUNDRY_MODEL || m.id.startsWith(FOUNDRY_MODEL)) ?? false;
  } catch {
    return false;
  }
}
