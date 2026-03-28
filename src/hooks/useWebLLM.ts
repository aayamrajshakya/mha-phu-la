'use client'

import { useState, useEffect } from 'react'
import { LLMState, getLLMState, subscribeToLLM, initLLM, runInference } from '@/lib/webllm'

export interface UseWebLLMReturn {
  status: LLMState['status']
  progress: number
  error: string | null
  load: () => void
  run: (system: string, user: string, maxTokens?: number) => Promise<string | null>
}

export function useWebLLM(): UseWebLLMReturn {
  const [state, setState] = useState<LLMState>(getLLMState)

  useEffect(() => {
    return subscribeToLLM(setState)
  }, [])

  return {
    status: state.status,
    progress: state.progress,
    error: state.error,
    load: initLLM,
    run: runInference,
  }
}
