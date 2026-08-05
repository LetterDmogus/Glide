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
