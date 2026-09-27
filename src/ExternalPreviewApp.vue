<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import PreviewPanel from './components/PreviewPanel.vue'

const pages = ref<string[]>([])
const loading = ref(false)
const error = ref<string | undefined>(undefined)
const projectDir = ref<string | undefined>(undefined)

const isMaximized = ref(false)
let unlistenMax: (() => void) | null = null
let unlistenData: (() => void) | null = null

onMounted(async () => {
  if (window.electronAPI?.isMaximized) {
    isMaximized.value = await window.electronAPI.isMaximized()
  }
  if (window.electronAPI?.onMaximizedChange) {
    unlistenMax = window.electronAPI.onMaximizedChange((isMax) => {
      isMaximized.value = isMax
    })
  }

  // Ambil data cache awal yang sudah disiapkan Electron
  if (window.electronAPI?.getPreviewInitialData) {
    const initData = await window.electronAPI.getPreviewInitialData()
    if (initData) {
      pages.value = initData.pages || []
      loading.value = !!initData.loading
      error.value = initData.error
      projectDir.value = initData.projectDir
    }
  }

  // Selalu minta main window untuk kompilasi/kirim ulang data terkini
  window.electronAPI?.requestPreviewRefresh?.()

  // Terima data live sync dari main window
  if (window.electronAPI?.onPreviewWindowData) {
    unlistenData = window.electronAPI.onPreviewWindowData((data) => {
      pages.value = data.pages || []
      loading.value = !!data.loading
      error.value = data.error
      projectDir.value = data.projectDir
    })
  }
})

onBeforeUnmount(() => {
  if (unlistenMax) unlistenMax()
  if (unlistenData) unlistenData()
})

function minimize() { window.electronAPI?.minimize() }
function maximize() { window.electronAPI?.maximize() }
function close() { window.electronAPI?.close() }

function handleRefresh() {
  window.electronAPI?.requestPreviewRefresh?.()
}

function handleBuildPdf() {
  window.electronAPI?.requestPreviewBuildPdf?.()
}

function handleExplainError(err: string) {
  window.electronAPI?.requestPreviewExplainError?.(err)
}
</script>

<template>
  <div class="external-preview-app">
    <!-- Clean Minimalist Custom Titlebar -->
    <header class="ext-titlebar">
      <div class="ext-brand">
        <img src="/GlideIcon.png" alt="Glide" class="ext-logo-img" />
        <span class="ext-title">Glide — Live Preview</span>
      </div>
      <div class="ext-window-controls">
        <button class="ext-ctrl-btn minimize" @click="minimize" title="Minimize">
          <svg width="11" height="1" viewBox="0 0 11 1">
            <rect width="11" height="1" fill="currentColor"/>
          </svg>
        </button>
        <button class="ext-ctrl-btn maximize" @click="maximize" :title="isMaximized ? 'Restore Down' : 'Maximize'">
          <svg v-if="isMaximized" width="10" height="10" viewBox="0 0 10 10">
            <path d="M2.5 2.5V0.5H9.5V7.5H7.5" fill="none" stroke="currentColor" stroke-width="1"/>
            <rect x="0.5" y="2.5" width="7" height="7" fill="none" stroke="currentColor" stroke-width="1"/>
          </svg>
          <svg v-else width="10" height="10" viewBox="0 0 10 10">
            <rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1"/>
          </svg>
        </button>
        <button class="ext-ctrl-btn close" @click="close" title="Close Preview Window">
          <svg width="11" height="11" viewBox="0 0 11 11">
            <path d="M1 1L10 10M10 1L1 10" stroke="currentColor" stroke-width="1.2"/>
          </svg>
        </button>
      </div>
    </header>

    <!-- Main Live Preview Panel -->
    <main class="ext-preview-main">
      <PreviewPanel
        :pages="pages"
        :loading="loading"
        :error="error"
        :project-dir="projectDir"
        :is-external="true"
        @refresh="handleRefresh"
        @build-pdf="handleBuildPdf"
        @explain-error="handleExplainError"
      />
    </main>
  </div>
</template>

<style scoped>
.external-preview-app {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-base);
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

.ext-titlebar {
  height: 34px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0 0 14px;
  -webkit-app-region: drag;
  user-select: none;
  flex-shrink: 0;
}

.ext-brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ext-logo-img {
  width: 16px;
  height: 16px;
  object-fit: contain;
  border-radius: 3px;
  display: block;
}

.ext-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
}

.ext-window-controls {
  display: flex;
  align-items: center;
  height: 100%;
  -webkit-app-region: no-drag;
}

.ext-ctrl-btn {
  width: 44px;
  height: 100%;
  background: transparent;
  border: none;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.ext-ctrl-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.ext-ctrl-btn.close:hover {
  background: #e81123;
  color: #ffffff;
}

.ext-preview-main {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
}
</style>
