<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount, nextTick } from 'vue'
import { 
  RefreshCw, AlertCircle, Eye, Download, Bug, Filter, Layers 
} from 'lucide-vue-next'
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

// Active Section Filter
const selectedFilter = ref<string>('all')

// Cache Blob URLs hanya untuk halaman yang aktif/terlihat
const blobUrls = ref<Record<number, string>>({})
const visiblePages = ref<Set<number>>(new Set())
const scrollContainer = ref<HTMLDivElement | null>(null)
const pageRefs = ref<Record<number, HTMLDivElement | null>>({})

let observer: IntersectionObserver | null = null

// Setup IntersectionObserver untuk Virtual Lazy Loading
function setupObserver() {
  if (observer) observer.disconnect()

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const pageIdx = Number(entry.target.getAttribute('data-page-index'))
        if (isNaN(pageIdx)) return

        if (entry.isIntersecting) {
          visiblePages.value.add(pageIdx)
          loadPageBlob(pageIdx)
        } else {
          // Unload SVG dari memori GPU jika halaman terlalu jauh dari viewport
          visiblePages.value.delete(pageIdx)
          revokePageBlob(pageIdx)
        }
      })
    },
    {
      root: scrollContainer.value,
      rootMargin: '300px 0px 300px 0px', // Buffer 300px atas & bawah agar scroll tetap mulus
      threshold: 0.01
    }
  )

  // Observe elemen halaman
  nextTick(() => {
    Object.values(pageRefs.value).forEach((el) => {
      if (el) observer?.observe(el)
    })
  })
}

async function loadPageBlob(pageIdx: number) {
  if (blobUrls.value[pageIdx]) return // Sudah ada di memori

  const pagePath = props.pages[pageIdx]
  if (!pagePath) return

  try {
    const content = await window.electronAPI?.readFile?.(pagePath)
    if (content) {
      const blob = new Blob([content], { type: 'image/svg+xml' })
      blobUrls.value[pageIdx] = URL.createObjectURL(blob)
    } else {
      let clean = pagePath.replace(/\\/g, '/')
      if (!clean.startsWith('/')) clean = '/' + clean
      blobUrls.value[pageIdx] = `file://${clean}?t=${Date.now()}`
    }
  } catch {
    let clean = pagePath.replace(/\\/g, '/')
    if (!clean.startsWith('/')) clean = '/' + clean
    blobUrls.value[pageIdx] = `file://${clean}?t=${Date.now()}`
  }
}

function revokePageBlob(pageIdx: number) {
  if (blobUrls.value[pageIdx]) {
    if (blobUrls.value[pageIdx].startsWith('blob:')) {
      URL.revokeObjectURL(blobUrls.value[pageIdx])
    }
    delete blobUrls.value[pageIdx]
  }
}

function clearAllBlobs() {
  Object.values(blobUrls.value).forEach((url) => {
    if (url.startsWith('blob:')) URL.revokeObjectURL(url)
  })
  blobUrls.value = {}
  visiblePages.value.clear()
}

// Section Filtering Logic
const filteredPageIndices = computed<number[]>(() => {
  if (selectedFilter.value === 'all' || !props.pages.length) {
    return props.pages.map((_, i) => i)
  }

  // Jika filter per bagian (contoh: cover vs content)
  if (selectedFilter.value === 'cover') {
    return [0] // Halaman 1
  }

  const numPages = props.pages.length
  if (selectedFilter.value === 'main') {
    return Array.from({ length: numPages - 1 }, (_, i) => i + 1)
  }

  return props.pages.map((_, i) => i)
})

function scrollToPage(pageIdx: number) {
  const targetEl = pageRefs.value[pageIdx]
  if (targetEl) {
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

watch(() => props.pages, () => {
  clearAllBlobs()
  nextTick(() => setupObserver())
}, { immediate: true })

onBeforeUnmount(() => {
  if (observer) observer.disconnect()
  clearAllBlobs()
})
</script>

<template>
  <div class="preview-panel">
    <!-- Header Controls -->
    <div class="preview-header">
      <div class="header-left">
        <span class="preview-title">Preview</span>
        <span v-if="pages.length > 0" class="page-count">{{ pages.length }} Halaman</span>
        
        <!-- Filter Section Dropdown -->
        <div v-if="pages.length > 1" class="filter-wrapper">
          <Filter :size="11" class="icon-muted" />
          <select v-model="selectedFilter" class="filter-select">
            <option value="all">Semua Halaman ({{ pages.length }})</option>
            <option value="cover">Cover / Sampul (Hal 1)</option>
            <option value="main">Isi Dokumen (Hal 2-{{ pages.length }})</option>
          </select>
        </div>
      </div>

      <div class="header-actions">
        <button class="preview-btn" @click="emit('refresh')" :disabled="loading" title="Refresh Preview">
          <RefreshCw :size="12" :class="{ 'spin': loading }" />
          <span class="btn-text">Refresh</span>
        </button>
        <button class="preview-btn primary" @click="emit('build-pdf')" title="Export PDF">
          <Download :size="12" />
          <span class="btn-text">Build PDF</span>
        </button>
      </div>
    </div>

    <!-- Main Workspace Area -->
    <div class="preview-wrapper-main">
      <!-- Preview Content Area -->
      <div ref="scrollContainer" class="preview-body custom-scroll">
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

        <!-- Virtualized Pages View -->
        <div v-else-if="filteredPageIndices.length > 0" class="pages-container">
          <div 
            v-for="pageIdx in filteredPageIndices" 
            :key="pageIdx"
            :ref="el => { pageRefs[pageIdx] = el as HTMLDivElement }"
            :data-page-index="pageIdx"
            class="page-card"
          >
            <div class="page-shadow">
              <!-- Render hanya ketika halaman masuk ke viewport -->
              <img 
                v-if="blobUrls[pageIdx]" 
                :src="blobUrls[pageIdx]" 
                :alt="`Halaman ${pageIdx + 1}`" 
                loading="lazy" 
              />
              <div v-else class="page-skeleton">
                <RefreshCw :size="18" class="spin icon-muted" />
                <span>Memuat Halaman {{ pageIdx + 1 }}...</span>
              </div>
            </div>
            <span class="page-number">Halaman {{ pageIdx + 1 }} dari {{ pages.length }}</span>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="state-container">
          <Eye :size="36" class="icon-muted" />
          <p>Belum ada pratinjau. Klik "Refresh" atau buka proyek Glide.</p>
        </div>
      </div>

      <!-- Jump-to-Page Quick Scroller Sidebar -->
      <div v-if="pages.length > 1 && !error" class="page-scroller-bar custom-scroll">
        <div class="scroller-title" title="Lompat ke Halaman">
          <Layers :size="11" />
        </div>
        <button 
          v-for="pageIdx in filteredPageIndices" 
          :key="pageIdx"
          class="scroller-item"
          :class="{ active: visiblePages.has(pageIdx) }"
          @click="scrollToPage(pageIdx)"
          :title="`Lompat ke Halaman ${pageIdx + 1}`"
        >
          {{ pageIdx + 1 }}
        </button>
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
  padding: 0 8px;
  flex-shrink: 0;
  gap: 6px;
  container-type: inline-size;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1;
}

.preview-title {
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.page-count {
  font-size: 10px;
  color: var(--text-secondary);
  background: var(--bg-elevated);
  padding: 1px 5px;
  border-radius: 4px;
  flex-shrink: 0;
}

.filter-wrapper {
  display: flex;
  align-items: center;
  gap: 3px;
  background: var(--bg-base);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 2px 4px;
  min-width: 0;
  flex: 1;
  max-width: 170px;
}

.filter-select {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 10.5px;
  font-family: inherit;
  outline: none;
  cursor: pointer;
  width: 100%;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}
.filter-select option {
  background: #1e222b;
  color: #e2e8f0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.preview-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 4px 8px;
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

/* Sembunyikan teks tombol ketika lebar header < 400px (Container Query) */
@container (max-width: 400px) {
  .btn-text {
    display: none;
  }
  .preview-btn {
    padding: 5px 6px;
  }
  .filter-wrapper {
    max-width: 110px;
  }
}

.preview-wrapper-main {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
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
  position: relative;
}

.page-shadow img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.page-skeleton {
  width: 100%;
  height: 100%;
  background: #1e222b;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-muted);
  font-size: 11px;
}

.page-number {
  font-size: 11px;
  color: var(--text-secondary);
}

/* Page Scroller Bar */
.page-scroller-bar {
  width: 34px;
  background: var(--bg-surface);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 0;
  gap: 4px;
  overflow-y: auto;
  flex-shrink: 0;
}

.scroller-title {
  color: var(--text-muted);
  padding-bottom: 4px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 2px;
}

.scroller-item {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.scroller-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.scroller-item.active {
  background: var(--accent);
  color: #fff;
  font-weight: 600;
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

.icon-muted { opacity: 0.4; }
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

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
</style>
