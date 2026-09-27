import { ref, watch } from 'vue'

export interface AiSettings {
  enabled: boolean
  apiKey: string
  modelName: string
}

const SETTINGS_KEY = 'glide_ai_settings'

const defaultSettings: AiSettings = {
  enabled: false,
  apiKey: '',
  modelName: 'llama-3.3-70b-versatile'
}

function loadSettings(): AiSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY)
    if (saved) {
      return { ...defaultSettings, ...JSON.parse(saved) }
    }
  } catch {
    // Fallback default
  }
  return defaultSettings
}

export const aiSettings = ref<AiSettings>(loadSettings())

watch(aiSettings, (newVal) => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(newVal))
  } catch {
    // Ignore storage errors
  }
}, { deep: true })

// ── Compiler & Renderer Settings (CLI vs WASM In-Memory) ──
export type RendererMode = 'cli' | 'wasm'

export interface CompilerSettings {
  rendererMode: RendererMode
}

const COMPILER_SETTINGS_KEY = 'glide_compiler_settings'

const defaultCompilerSettings: CompilerSettings = {
  rendererMode: 'cli'
}

function loadCompilerSettings(): CompilerSettings {
  try {
    const saved = localStorage.getItem(COMPILER_SETTINGS_KEY)
    if (saved) {
      return { ...defaultCompilerSettings, ...JSON.parse(saved) }
    }
  } catch {
    // Fallback default
  }
  return defaultCompilerSettings
}

export const compilerSettings = ref<CompilerSettings>(loadCompilerSettings())

watch(compilerSettings, (newVal) => {
  try {
    localStorage.setItem(COMPILER_SETTINGS_KEY, JSON.stringify(newVal))
  } catch {
    // Ignore storage errors
  }
}, { deep: true })

