<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { aiSettings } from '../utils/settings'
import { 
  Sparkles, X, Check, ArrowDownRight, CornerDownLeft, RefreshCw,
  FileText, Scissors, RotateCcw, AlertTriangle, Bug, Search
} from 'lucide-vue-next'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const props = defineProps<{
  selectedText: string
  position: { top: number; left: number }
  explainError?: string
}>()

const emit = defineEmits<{
  'close': []
  'replace': [newText: string]
  'insert-below': [newText: string]
  'search-project': [query: string]
}>()

const customPrompt = ref('')
const isGenerating = ref(false)
const errorMessage = ref<string | null>(null)
const chatMessages = ref<ChatMessage[]>([])
const chatContainer = ref<HTMLDivElement | null>(null)

async function scrollToBottom() {
  await nextTick()
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }
}

async function sendAiMessage(instruction: string, userFacingLabel?: string) {
  if (!aiSettings.value.apiKey) {
    errorMessage.value = 'Groq API Key belum diisi. Atur di Settings -> Experimental.'
    return
  }

  isGenerating.value = true
  errorMessage.value = null

  const promptText = userFacingLabel || instruction
  chatMessages.value.push({ role: 'user', content: promptText })
  await scrollToBottom()

  const model = aiSettings.value.modelName || 'llama-3.3-70b-versatile'

  const systemPrompt = `Anda adalah asisten penyunting teks akademik profesional untuk editor Glide yang berbasis Typst.

Anda BOLEH menggunakan sintaks Typst dasar berikut dalam output jika diperlukan:
- _teks_ untuk italic
- *teks* untuk bold
- #text(fill: rgb("#ff0000"))[teks] untuk warna teks
- \\ untuk baris baru (line break)
- #v(1em) untuk spasi vertikal, #h(1em) untuk spasi horizontal

JANGAN gunakan sintaks Typst yang kompleks (fungsi kustom, layout, grid, dll).
Untuk tugas penyuntingan teks biasa: kembalikan HANYA teks hasil akhirnya tanpa kalimat pengantar.
Untuk tugas penjelasan error Typst: berikan penjelasan singkat dan solusi yang jelas dalam Bahasa Indonesia.`

  // Persiapkan daftar messages untuk API dengan menyertakan maksimal 5 pesan terakhir (memori berkelanjutan)
  const apiMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt }
  ]

  if (props.selectedText) {
    apiMessages.push({
      role: 'system',
      content: `Context Selected Text:\n"""\n${props.selectedText}\n"""`
    })
  }

  // Ambil maksimal 5 pesan terbaru dari chatMessages (termasuk pesan user yang baru di-push)
  const recentHistory = chatMessages.value.slice(-5)
  for (const msg of recentHistory) {
    apiMessages.push({
      role: msg.role,
      content: msg.content
    })
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiSettings.value.apiKey.trim()}`
      },
      body: JSON.stringify({
        model: model.trim(),
        messages: apiMessages,
        temperature: 0.5,
        max_tokens: 2048
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data?.error?.message || `Groq API Error (${response.status})`)
    }

    const outputText = data?.choices?.[0]?.message?.content
    if (outputText) {
      chatMessages.value.push({ role: 'assistant', content: outputText.trim() })
      await scrollToBottom()
    } else {
      throw new Error('Tidak ada respons teks yang dihasilkan dari AI.')
    }
  } catch (err: any) {
    errorMessage.value = err.message || 'Gagal berkomunikasi dengan Groq AI.'
  } finally {
    isGenerating.value = false
  }
}

function handleQuickAction(action: 'longer' | 'shorter' | 'rewrite') {
  if (action === 'longer') {
    sendAiMessage('Perpanjang dan lengkapi paragraf/teks berikut agar penjelasan akademiknya lebih mendalam dan komprehensif.', 'Make Longer')
  } else if (action === 'shorter') {
    sendAiMessage('Ringkas teks berikut menjadi lebih padat, efektif, dan langsung pada inti pembahasan.', 'Make Shorter')
  } else if (action === 'rewrite') {
    sendAiMessage('Tulis ulang (rewrite) teks berikut menggunakan tata bahasa Indonesia baku & gaya penulisan jurnal akademik yang profesional.', 'Rewrite Academic')
  }
}

function handleCustomSubmit() {
  const text = customPrompt.value.trim()
  if (!text || isGenerating.value) return
  customPrompt.value = ''
  sendAiMessage(text)
}

function getLastAssistantContent(): string {
  const reversed = [...chatMessages.value].reverse()
  const lastAss = reversed.find(m => m.role === 'assistant')
  return lastAss ? lastAss.content : ''
}

onMounted(() => {
  if (props.explainError) {
    const fullPrompt = `Tolong jelaskan error pratinjau Typst berikut dan berikan cara memperbaikinya:\n\n\`\`\`\n${props.explainError}\n\`\`\``
    sendAiMessage(fullPrompt)
  }
})
</script>

<template>
  <div 
    class="ai-floating-popup"
    :style="{ top: `${position.top}px`, left: `${position.left}px` }"
    @click.stop
  >
    <!-- Header -->
    <div class="popup-header">
      <div class="header-tag">
        <Bug v-if="explainError" :size="13" class="icon-error" />
        <Sparkles v-else-if="aiSettings.enabled" :size="13" class="icon-accent" />
        <Search v-else :size="13" class="icon-accent" />
        <span>{{ explainError ? 'Explain Error' : (aiSettings.enabled ? 'Glide AI' : 'Selection Actions') }}</span>
      </div>
      <div class="header-right-actions">
        <button 
          v-if="selectedText" 
          class="header-search-btn" 
          @click="emit('search-project', selectedText); emit('close')" 
          title="Cari kemunculan kata ini di seluruh proyek"
        >
          <Search :size="12" />
          <span>Cari di Proyek</span>
        </button>
        <button class="close-btn" @click="emit('close')" title="Tutup">
          <X :size="13" />
        </button>
      </div>
    </div>

    <div v-if="aiSettings.enabled || explainError" class="popup-body">
      <!-- Error Preview Box (Jika mode Explain Error) -->
      <div v-if="explainError" class="error-preview-box">
        <pre>{{ explainError }}</pre>
      </div>

      <!-- Quick Actions (Jika belum ada pesan dan bukan mode error) -->
      <div v-if="chatMessages.length === 0 && !explainError" class="quick-actions">
        <button class="action-chip" @click="handleQuickAction('longer')">
          <FileText :size="12" />
          <span>Make Longer</span>
        </button>
        <button class="action-chip" @click="handleQuickAction('shorter')">
          <Scissors :size="12" />
          <span>Make Shorter</span>
        </button>
        <button class="action-chip" @click="handleQuickAction('rewrite')">
          <RotateCcw :size="12" />
          <span>Rewrite Academic</span>
        </button>
      </div>

      <!-- Chat History Container (Scrollable) -->
      <div v-if="chatMessages.length > 0" ref="chatContainer" class="chat-history custom-scroll">
        <div 
          v-for="(msg, idx) in chatMessages" 
          :key="idx" 
          class="chat-bubble"
          :class="msg.role"
        >
          <div class="bubble-header">
            <span class="sender-name">{{ msg.role === 'user' ? 'Anda' : 'Glide AI' }}</span>
          </div>
          <pre class="bubble-content">{{ msg.content }}</pre>
        </div>

        <div v-if="isGenerating" class="loading-inline">
          <RefreshCw :size="13" class="spin icon-accent" />
          <span>Sedang mengetik...</span>
        </div>
      </div>

      <div v-if="errorMessage" class="error-banner">
        <AlertTriangle :size="13" />
        <span>{{ errorMessage }}</span>
      </div>

      <!-- Footer Area: Result Action Buttons & Persistent Prompt Input -->
      <div class="popup-footer">
        <div v-if="getLastAssistantContent() && !explainError" class="result-actions">
          <button class="btn btn-primary" @click="emit('replace', getLastAssistantContent())">
            <Check :size="13" />
            <span>Ganti Teks</span>
          </button>
          <button class="btn btn-secondary" @click="emit('insert-below', getLastAssistantContent())">
            <ArrowDownRight :size="13" />
            <span>Tempel di Bawah</span>
          </button>
        </div>

        <div class="custom-prompt-row">
          <input 
            type="text" 
            v-model="customPrompt" 
            :placeholder="chatMessages.length > 0 ? 'Ketik balasan atau pertanyaan lanjutan...' : (explainError ? 'Tanyakan lebih lanjut tentang error...' : 'Instruksi khusus... (tekan Enter)')" 
            class="prompt-input"
            :disabled="isGenerating"
            @keydown.enter="handleCustomSubmit"
          />
          <button class="send-btn" @click="handleCustomSubmit" :disabled="!customPrompt.trim() || isGenerating">
            <CornerDownLeft :size="13" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ai-floating-popup {
  position: absolute;
  z-index: 5000;
  width: 380px;
  max-width: 90vw;
  max-height: 80vh;
  background: #161826;
  border: 1px solid var(--border-focus);
  border-radius: 10px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6);
  color: #e2e8f0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: system-ui, -apple-system, sans-serif;
  animation: popupFade 0.15s ease-out;
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #11131f;
  color: var(--accent-light);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.header-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--accent-light);
}

.header-right-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-search-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(124, 106, 247, 0.15);
  border: 1px solid var(--border-focus);
  color: #fff;
  border-radius: 4px;
  padding: 3px 8px;
  font-size: 10.5px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}

.header-search-btn:hover {
  background: var(--accent);
}

.close-btn {
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
}
.close-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

.popup-body {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  overflow: hidden;
}

.quick-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.action-chip {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: 5px 9px;
  font-size: 11.5px;
  color: #cbd5e1;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: background 0.15s, border-color 0.15s;
}
.action-chip:hover {
  background: var(--accent-soft);
  border-color: var(--border-focus);
  color: var(--accent-light);
}

.custom-prompt-row {
  display: flex;
  gap: 6px;
}

.prompt-input {
  flex: 1;
  background: #0d0f18;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 6px 10px;
  color: #f8fafc;
  font-size: 12px;
}
.prompt-input:focus {
  border-color: var(--accent);
  outline: none;
}

.send-btn {
  background: var(--accent);
  border: none;
  color: #fff;
  border-radius: 6px;
  padding: 0 10px;
  cursor: pointer;
}
.send-btn:hover:not(:disabled) {
  filter: brightness(1.1);
}
.send-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  font-size: 12.5px;
  color: #94a3b8;
}

.result-body {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.result-preview {
  max-height: 180px;
  overflow-y: auto;
  background: #0d0f18;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  padding: 8px 10px;
}

.result-preview pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  font-size: 12px;
  line-height: 1.5;
  color: #e2e8f0;
}

.result-actions {
  display: flex;
  gap: 6px;
}

.btn {
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 11.5px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  border: none;
}

.btn-primary {
  background: var(--accent);
  color: #fff;
  flex: 1;
}
.btn-primary:hover {
  filter: brightness(1.1);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
}
.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.12);
}

.btn-icon {
  background: rgba(255, 255, 255, 0.06);
  color: #94a3b8;
}
.btn-icon:hover {
  color: #fff;
}

.error-banner {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fca5a5;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.error-preview-box {
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 6px;
  padding: 8px 10px;
  max-height: 90px;
  overflow-y: auto;
}
.error-preview-box pre {
  margin: 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  color: #fca5a5;
  white-space: pre-wrap;
  word-break: break-word;
}

.chat-history {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-height: 100px;
  max-height: 280px;
  overflow-y: auto;
  padding-right: 4px;
}

.popup-footer {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: auto;
  padding-top: 4px;
}

.chat-bubble {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 11.5px;
  line-height: 1.45;
}

.chat-bubble.user {
  background: rgba(255, 255, 255, 0.06);
  align-self: flex-end;
  border-bottom-right-radius: 2px;
  max-width: 90%;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.chat-bubble.assistant {
  background: #0d0f18;
  align-self: flex-start;
  border-bottom-left-radius: 2px;
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.bubble-header {
  display: flex;
  align-items: center;
  gap: 4px;
}

.sender-name {
  font-size: 10px;
  font-weight: 600;
  color: #94a3b8;
}

.bubble-content {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  font-size: 11.5px;
  color: #e2e8f0;
}

.loading-inline {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #94a3b8;
  padding: 4px 6px;
}

.icon-accent { color: var(--accent); }
.icon-error { color: #f87171; }
.spin { animation: spin 1s linear infinite; }

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes popupFade {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
