import type { VoiceCommand, ImageParamKey } from '../../types';

const OLLAMA_URL = (import.meta.env.VITE_OLLAMA_URL as string | undefined) ?? 'http://localhost:11434';
const OLLAMA_MODEL = (import.meta.env.VITE_OLLAMA_MODEL as string | undefined) ?? 'qwen2.5:0.5b';

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
 */
function parseCommandFallback(input: string): VoiceCommand | null {
  const t = input.toLowerCase();

  // gain
  const gainSet = t.match(/(?:set\s+)?gain\s+(?:to\s+)?(\d+)/);
  if (gainSet) return { parameter: 'gain', action: 'set', value: Number(gainSet[1]) };

  if (t.match(/max(?:imum)?\s+gain/)) return { parameter: 'gain', action: 'set', value: 100 };
  if (t.match(/min(?:imum)?\s+gain/)) return { parameter: 'gain', action: 'set', value: 0 };
  if (t.match(/reset\s+gain/)) return { parameter: 'gain', action: 'set', value: 50 };

  const gainInc = t.match(/(?:increase|raise|boost)\s+gain\s+(?:by\s+)?(\d+)/);
  if (gainInc) return { parameter: 'gain', action: 'increase', value: Number(gainInc[1]) };

  const gainDec = t.match(/(?:decrease|lower|reduce)\s+gain\s+(?:by\s+)?(\d+)/);
  if (gainDec) return { parameter: 'gain', action: 'decrease', value: Number(gainDec[1]) };

  // zoom
  if (t.includes('zoom in')) return { parameter: 'zoom', action: 'increase', value: 0.5 };
  if (t.includes('zoom out')) return { parameter: 'zoom', action: 'decrease', value: 0.5 };

  const zoomSet = t.match(/(?:set\s+)?zoom\s+(?:to\s+)?(\d+(?:\.\d+)?)/);
  if (zoomSet) return { parameter: 'zoom', action: 'set', value: Number(zoomSet[1]) };
  if (t.match(/max(?:imum)?\s+zoom/)) return { parameter: 'zoom', action: 'set', value: 5.0 };
  if (t.match(/reset\s+zoom/)) return { parameter: 'zoom', action: 'set', value: 1.0 };

  const zoomInc = t.match(/(?:increase|raise)\s+zoom\s+(?:by\s+)?(\d+(?:\.\d+)?)/);
  if (zoomInc) return { parameter: 'zoom', action: 'increase', value: Number(zoomInc[1]) };

  const zoomDec = t.match(/(?:decrease|lower|reduce)\s+zoom\s+(?:by\s+)?(\d+(?:\.\d+)?)/);
  if (zoomDec) return { parameter: 'zoom', action: 'decrease', value: Number(zoomDec[1]) };

  // width
  if (t.match(/full\s+width/)) return { parameter: 'width', action: 'set', value: 100 };
  if (t.match(/reset\s+width/)) return { parameter: 'width', action: 'set', value: 100 };

  const widthSet = t.match(/(?:set\s+)?width\s+(?:to\s+)?(\d+)/);
  if (widthSet) return { parameter: 'width', action: 'set', value: Number(widthSet[1]) };

  const widthInc = t.match(/(?:increase|expand|wider)\s+width\s+(?:by\s+)?(\d+)/);
  if (widthInc) return { parameter: 'width', action: 'increase', value: Number(widthInc[1]) };

  const widthDec = t.match(/(?:decrease|shrink|narrow)\s+width\s+(?:by\s+)?(\d+)/);
  if (widthDec) return { parameter: 'width', action: 'decrease', value: Number(widthDec[1]) };

  return null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Sends a transcript to Ollama and returns a structured VoiceCommand.
 * Falls back to regex parsing if the LLM is unreachable or returns invalid JSON.
 */
export async function parseCommand(transcript: string): Promise<VoiceCommand | null> {
  const prompt = `${SYSTEM_PROMPT}\n\nCommand: "${transcript}"\nJSON:`;

  try {
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        options: {
          temperature: 0.0,
          num_predict: 64,
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new Error(`Ollama HTTP ${response.status}`);
    }

    const data = (await response.json()) as { response: string };
    const jsonText = extractJson(data.response);
    const parsed: unknown = JSON.parse(jsonText);

    if (!isValidCommand(parsed)) {
      throw new Error(`Unexpected JSON shape: ${jsonText}`);
    }

    return parsed;
  } catch {
    // Graceful fallback – LLM unavailable or returned bad JSON
    return parseCommandFallback(transcript);
  }
}

/** Returns true if Ollama is reachable. Used for UI status indicator. */
export async function checkOllamaHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(3_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
