<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { RefreshCw, AlertCircle, Eye, Download, Bug } from 'lucide-vue-next'
import { aiSettings } from '../utils/settings'

const props = defineProps<{
  pages: string[]
  loading: boolean
  error?: string
  projectDir?: string
}>()

const emit = defineEmits<{
  'refresh': []
  'build-pdf': []
  'explain-error': [errorMsg: string]
}>()

// Object URL Cache for Memory Leak Prevention
const blobUrls = ref<string[]>([])

async function loadBlobUrls(paths: string[]) {
  // Revoke old blob URLs from memory to force Chromium to free RAM instantly
  blobUrls.value.forEach(url => URL.revokeObjectURL(url))
  blobUrls.value = []

  const newUrls: string[] = []
  for (const pagePath of paths) {
    try {
      const content = await window.electronAPI?.readFile?.(pagePath)
      if (content) {
        const blob = new Blob([content], { type: 'image/svg+xml' })
        newUrls.push(URL.createObjectURL(blob))
      } else {
        // Fallback to direct file URL
        let clean = pagePath.replace(/\\/g, '/')
        if (!clean.startsWith('/')) clean = '/' + clean
        newUrls.push(`file://${clean}?t=${Date.now()}`)
      }
    } catch {
      let clean = pagePath.replace(/\\/g, '/')
      if (!clean.startsWith('/')) clean = '/' + clean
      newUrls.push(`file://${clean}?t=${Date.now()}`)
    }
  }
  blobUrls.value = newUrls
}

watch(() => props.pages, (newPages) => {
  if (newPages && newPages.length > 0) {
    loadBlobUrls(newPages)
  } else {
    blobUrls.value.forEach(url => URL.revokeObjectURL(url))
    blobUrls.value = []
  }
}, { immediate: true })

onBeforeUnmount(() => {
  blobUrls.value.forEach(url => URL.revokeObjectURL(url))
})
</script>

<template>
  <div class="preview-panel">
    <!-- Header Controls -->
    <div class="preview-header">
      <div class="header-left">
        <span class="preview-title">Preview</span>
        <span v-if="pages.length > 0" class="page-count">{{ pages.length }} Halaman</span>
      </div>

      <div class="header-actions">
        <button class="preview-btn" @click="emit('refresh')" :disabled="loading" title="Refresh Preview">
          <RefreshCw :size="12" :class="{ 'spin': loading }" />
          <span>Refresh</span>
        </button>
        <button class="preview-btn primary" @click="emit('build-pdf')" title="Export PDF">
          <Download :size="12" />
          <span>Build PDF</span>
        </button>
      </div>
    </div>

    <!-- Preview Content Area -->
    <div class="preview-body">
      <!-- Loading State -->
      <div v-if="loading && pages.length === 0" class="state-container">
        <RefreshCw :size="32" class="spin icon-muted" />
        <p>Menderender pratinjau Typst...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="state-container error-state">
        <AlertCircle :size="36" class="icon-error" />
        <h3>Gagal Menampilkan Pratinjau</h3>
        <pre class="error-log">{{ error }}</pre>
        <button v-if="aiSettings.enabled" class="explain-btn" @click="emit('explain-error', error)">
          <Bug :size="13" />
          <span>Explain Error dengan AI</span>
        </button>
      </div>

      <!-- Pages View -->
      <div v-else-if="pages.length > 0" class="pages-container">
        <div v-for="(page, idx) in pages" :key="page" class="page-card">
          <div class="page-shadow">
            <img :src="blobUrls[idx] || ''" :alt="`Halaman ${idx + 1}`" loading="lazy" />
          </div>
          <span class="page-number">Halaman {{ idx + 1 }}</span>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="state-container">
        <Eye :size="36" class="icon-muted" />
        <p>Belum ada pratinjau. Klik "Refresh" atau buka proyek Glide.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.preview-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #282c34;
  color: var(--text-primary);
  border-left: 1px solid var(--border);
  overflow: hidden;
}

.preview-header {
  height: 36px;
  background-color: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.preview-icon { color: var(--accent); }

.preview-title {
  font-size: 12px;
  font-weight: 600;
}

.page-count {
  font-size: 10px;
  color: var(--text-secondary);
  background: var(--bg-elevated);
  padding: 1px 6px;
  border-radius: 4px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.preview-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  border-radius: 4px;
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.preview-btn:hover:not(:disabled) {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.preview-btn.primary {
  background: var(--accent);
  color: #fff;
}

.preview-btn.primary:hover:not(:disabled) {
  opacity: 0.9;
}

.preview-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

.preview-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  justify-content: center;
}

.pages-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  width: 100%;
  max-width: 820px;
}

.page-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.page-shadow {
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
  border-radius: 2px;
  overflow: hidden;
  width: 100%;
  aspect-ratio: 1 / 1.4142; /* Standard A4 Ratio */
}

.page-shadow img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.page-number {
  font-size: 11px;
  color: var(--text-primary);
}

.state-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--text-muted);
  font-size: 13px;
  text-align: center;
  height: 100%;
  width: 100%;
}

.error-state {
  color: var(--error);
  padding: 20px;
  max-width: 600px;
}

.icon-muted { opacity: 0.3; }
.icon-error { color: var(--error); }

.error-log {
  background: rgba(248, 113, 113, 0.1);
  border: 1px solid var(--error);
  padding: 12px;
  border-radius: 6px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: #ff9999;
  text-align: left;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 240px;
  overflow-y: auto;
  width: 100%;
}

.explain-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: rgba(248, 113, 113, 0.12);
  border: 1px solid rgba(248, 113, 113, 0.35);
  border-radius: 6px;
  color: #fca5a5;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.explain-btn:hover {
  background: rgba(248, 113, 113, 0.22);
  border-color: rgba(248, 113, 113, 0.6);
  color: #fff;
}
</style>
