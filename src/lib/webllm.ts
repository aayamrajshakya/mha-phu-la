/**
 * WebLLM singleton engine manager.
 *
 * Wraps @mlc-ai/web-llm's CreateMLCEngine so only one model instance
 * ever loads per page session, regardless of how many components call it.
 *
 * State machine: idle → loading → ready | error | unsupported
 */

export type LLMStatus = 'idle' | 'loading' | 'ready' | 'error' | 'unsupported'

export interface LLMState {
  status: LLMStatus
  progress: number   // 0–1
  error: string | null
}

type Listener = (state: LLMState) => void

// ---------------------------------------------------------------------------
// Model config
// ---------------------------------------------------------------------------
const MODEL_ID = 'Llama-3.2-1B-Instruct-q4f16_1-MLC'

// ---------------------------------------------------------------------------
// Module-level singleton
// ---------------------------------------------------------------------------
let _engine: import('@mlc-ai/web-llm').MLCEngine | null = null
let _state: LLMState = { status: 'idle', progress: 0, error: null }
const _listeners = new Set<Listener>()

function setState(next: Partial<LLMState>) {
  _state = { ..._state, ...next }
  _listeners.forEach(fn => fn(_state))
}

export function subscribeToLLM(fn: Listener): () => void {
  _listeners.add(fn)
  fn(_state) // emit current state immediately
  return () => _listeners.delete(fn)
}

export function getLLMState(): LLMState {
  return _state
}

/** Start loading the model. Safe to call multiple times — idempotent. */
export async function initLLM(): Promise<void> {
  if (_state.status === 'loading' || _state.status === 'ready') return
  if (_state.status === 'unsupported') return

  // Check for WebGPU support
  if (typeof navigator === 'undefined' || !('gpu' in navigator)) {
    setState({ status: 'unsupported', error: 'WebGPU not supported in this browser' })
    return
  }

  setState({ status: 'loading', progress: 0, error: null })

  try {
    const { CreateMLCEngine } = await import('@mlc-ai/web-llm')
    _engine = await CreateMLCEngine(MODEL_ID, {
      initProgressCallback: (report) => {
        setState({ progress: report.progress })
      },
    })
    setState({ status: 'ready', progress: 1 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    // GPU-related failures mean WebGPU isn't usable here — treat as unsupported
    const isGpuError = /gpu|webgpu|compatible/i.test(msg)
    setState({ status: isGpuError ? 'unsupported' : 'error', error: msg })
  }
}

/**
 * Run a single-turn inference.
 * Returns null if model isn't ready.
 */
export async function runInference(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 200,
): Promise<string | null> {
  if (!_engine || _state.status !== 'ready') return null

  try {
    const reply = await _engine.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.4,
    })
    return reply.choices[0]?.message?.content ?? null
  } catch {
    return null
  }
}
