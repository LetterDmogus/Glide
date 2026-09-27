<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { 
  RefreshCw, AlertCircle, Eye, Download, Bug, Layers,
  ZoomIn, ZoomOut, Moon, Sun, ExternalLink
} from 'lucide-vue-next'
import { aiSettings } from '../utils/settings'

const props = defineProps<{
  pages: string[]
  loading: boolean
  error?: string
  projectDir?: string
  isExternal?: boolean
}>()

const emit = defineEmits<{
  'refresh': []
  'build-pdf': []
  'explain-error': [errorMsg: string]
  'popout': []
}>()

// ── Persisted State Management (Zoom, Dark Paper, Last Active Page) ──
const STORAGE_KEY_ZOOM = 'glide_preview_zoom'
const STORAGE_KEY_DARK_PAPER = 'glide_preview_dark_paper'
const STORAGE_KEY_LAST_PAGE = 'glide_preview_last_page'

const savedZoom = parseFloat(localStorage.getItem(STORAGE_KEY_ZOOM) || '1.0')
const zoomLevel = ref<number>(isNaN(savedZoom) ? 1.0 : Math.min(2.5, Math.max(0.5, savedZoom)))

const containerWidth = ref<number>(800)
const calculatedColumns = ref<number>(1)

const savedDarkPaper = localStorage.getItem(STORAGE_KEY_DARK_PAPER) === 'true'
const isDarkPaper = ref<boolean>(savedDarkPaper)

const savedLastPage = parseInt(localStorage.getItem(STORAGE_KEY_LAST_PAGE) || '0', 10)
const lastActivePageIndex = ref<number>(isNaN(savedLastPage) ? 0 : savedLastPage)

watch(zoomLevel, (val) => {
  localStorage.setItem(STORAGE_KEY_ZOOM, val.toString())
  updateAutoColumns()
})

watch(isDarkPaper, (val) => {
  localStorage.setItem(STORAGE_KEY_DARK_PAPER, val ? 'true' : 'false')
})

watch(lastActivePageIndex, (val) => {
  localStorage.setItem(STORAGE_KEY_LAST_PAGE, val.toString())
})

function toggleDarkPaper() {
  isDarkPaper.value = !isDarkPaper.value
}

// Menghitung kolom otomatis ala Word: Berdasarkan lebar container efektif & zoom
function updateAutoColumns() {
  // Titik tengah yang seimbang (Sweet Spot):
  // Di layar Full HD 1080p (lebar ~1920px), jika base ~430px:
  // - Pada zoom 100% (1.0x): 2 halaman butuh ~880px -> di jendela fullscreen akan nyaman menjadi 2 halaman jika dikehendaki, 
  //   atau 1 halaman saat zoom 100%-110% tanpa harus zoom terlalu besar (150%+).
  // - Menyesuaikan ambang acuan ke 430px agar peralihan ke 1 halaman terasa natural pada zoom normal baca (100%-110%).
  const scaledPageWidth = 430 * zoomLevel.value
  const availableWidth = containerWidth.value - 40
  
  if (availableWidth >= scaledPageWidth * 3 + 48) {
    calculatedColumns.value = 3
  } else if (availableWidth >= scaledPageWidth * 2 + 24) {
    calculatedColumns.value = 2
  } else {
    calculatedColumns.value = 1
  }
}

function zoomIn() {
  zoomLevel.value = Math.min(2.5, +(zoomLevel.value + 0.05).toFixed(2))
}

function zoomOut() {
  zoomLevel.value = Math.max(0.25, +(zoomLevel.value - 0.05).toFixed(2))
}

function resetZoom() {
  zoomLevel.value = 1.0
}

function handleWheel(e: WheelEvent) {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault()
    if (e.deltaY < 0) {
      zoomIn()
    } else if (e.deltaY > 0) {
      zoomOut()
    }
  }
}

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
          // Simpan halaman paling awal yang sedang aktif terlihat
          const minVisible = Math.min(...Array.from(visiblePages.value))
          if (!isNaN(minVisible) && minVisible >= 0) {
            lastActivePageIndex.value = minVisible
          }
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

  const pagePathOrContent = props.pages[pageIdx]
  if (!pagePathOrContent) return

  // Jika berupa raw SVG (dari In-Memory WASM compiler)
  if (pagePathOrContent.trim().startsWith('<svg') || pagePathOrContent.startsWith('data:image/svg+xml')) {
    if (pagePathOrContent.startsWith('data:image/svg+xml')) {
      blobUrls.value[pageIdx] = pagePathOrContent
    } else {
      const blob = new Blob([pagePathOrContent], { type: 'image/svg+xml' })
      blobUrls.value[pageIdx] = URL.createObjectURL(blob)
    }
    return
  }

  // Jika berupa path file di disk (Native CLI mode)
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const content = await window.electronAPI?.readFile?.(pagePathOrContent)
      if (content) {
        const blob = new Blob([content], { type: 'image/svg+xml' })
        blobUrls.value[pageIdx] = URL.createObjectURL(blob)
        return
      }
    } catch {
      // Menunggu file selesai ditulis
    }
    await new Promise(resolve => setTimeout(resolve, 100))
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

async function scrollToPage(pageIdx: number) {
  lastActivePageIndex.value = pageIdx
  // Preload blob halaman target secara langsung sebelum melompat
  await loadPageBlob(pageIdx)
  visiblePages.value.add(pageIdx)
  
  const targetEl = pageRefs.value[pageIdx]
  if (targetEl) {
    targetEl.scrollIntoView({ behavior: 'auto', block: 'start' })
  }
}

let hasRestoredScroll = false

watch(() => props.pages, (newPages) => {
  // Hanya reload jika proses compile sudah selesai atau jumlah halaman berubah
  clearAllBlobs()
  nextTick(() => {
    setupObserver()
    if (!hasRestoredScroll && newPages.length > 0 && lastActivePageIndex.value > 0) {
      const targetIdx = Math.min(lastActivePageIndex.value, newPages.length - 1)
      scrollToPage(targetIdx)
      hasRestoredScroll = true
    }
  })
}, { immediate: true })

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (scrollContainer.value) {
    containerWidth.value = scrollContainer.value.clientWidth
    updateAutoColumns()

    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          containerWidth.value = entry.contentRect.width
          updateAutoColumns()
        }
      }
    })
    resizeObserver.observe(scrollContainer.value)
  }
})

onBeforeUnmount(() => {
  if (observer) observer.disconnect()
  if (resizeObserver) resizeObserver.disconnect()
  clearAllBlobs()
})
</script>

<template>
  <div class="preview-panel">
    <!-- Header Controls -->
    <div class="preview-header">
      <div class="header-left">
        <span class="preview-title">Preview</span>
        <span v-if="pages.length > 0" class="page-count">{{ pages.length }} {{ pages.length === 1 ? 'Page' : 'Pages' }}</span>
      </div>

      <div class="header-actions">
        <!-- Layout, Theme & Zoom Controls -->
        <div v-if="pages.length > 0 && !error" class="zoom-controls">
          <button 
            class="zoom-btn" 
            :class="{ 'active-toggle': isDarkPaper }" 
            @click="toggleDarkPaper" 
            :title="isDarkPaper ? 'Dark Paper Mode (Active) - Click to restore White Paper' : 'Switch to Dark Paper Mode (Eye Comfort)'"
          >
            <Sun v-if="isDarkPaper" :size="12" />
            <Moon v-else :size="12" />
          </button>
          <div class="control-divider"></div>
          <button class="zoom-btn" @click="zoomOut" title="Zoom Out (Ctrl + Scroll Down)">
            <ZoomOut :size="12" />
          </button>
          <button class="zoom-reset" @click="resetZoom" title="Reset Zoom to 100%">
            {{ Math.round(zoomLevel * 100) }}%
          </button>
          <button class="zoom-btn" @click="zoomIn" title="Zoom In (Ctrl + Scroll Up)">
            <ZoomIn :size="12" />
          </button>
        </div>

        <button class="preview-btn" @click="emit('refresh')" :disabled="loading" title="Refresh Preview">
          <RefreshCw :size="12" :class="{ 'spin': loading }" />
          <span class="btn-text">Refresh</span>
        </button>
        <button class="preview-btn primary" @click="emit('build-pdf')" title="Export PDF">
          <Download :size="12" />
          <span class="btn-text">Build PDF</span>
        </button>

        <!-- Pop-Out to External Window Button (Only in Docked mode) -->
        <button 
          v-if="!isExternal" 
          class="preview-btn icon-only" 
          @click="emit('popout')" 
          title="Open Preview in External Window (Dual Monitor Support)"
        >
          <ExternalLink :size="12" />
        </button>
      </div>
    </div>

    <!-- Main Workspace Area -->
    <div class="preview-wrapper-main">
      <!-- Preview Content Area -->
      <div ref="scrollContainer" class="preview-body custom-scroll" @wheel="handleWheel">
        <!-- Loading State -->
        <div v-if="loading && pages.length === 0" class="state-container">
          <RefreshCw :size="32" class="spin icon-muted" />
          <p>Rendering Typst preview...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="state-container error-state">
          <AlertCircle :size="36" class="icon-error" />
          <h3>Preview Rendering Failed</h3>
          <pre class="error-log">{{ error }}</pre>
          <button v-if="aiSettings.enabled" class="explain-btn" @click="emit('explain-error', error)">
            <Bug :size="13" />
            <span>Explain Error with AI</span>
          </button>
        </div>

        <!-- Virtualized Pages View with Scalable Style & Autonomous Multi-Column Layout -->
        <div 
          v-else-if="pages.length > 0" 
          class="pages-container"
          :class="{ 
            'multi-column-grid': calculatedColumns > 1,
            'dark-paper-mode': isDarkPaper 
          }"
          :style="{ 
            gridTemplateColumns: calculatedColumns > 1 ? `repeat(${calculatedColumns}, minmax(0, 1fr))` : '1fr',
            maxWidth: calculatedColumns === 3 ? '1950px' : (calculatedColumns === 2 ? '1400px' : '820px'),
            transform: `scale(${zoomLevel})`, 
            transformOrigin: 'top center' 
          }"
        >
          <div 
            v-for="(_, pageIdx) in pages" 
            :key="pageIdx"
            :ref="el => { pageRefs[pageIdx] = el as HTMLDivElement }"
            :data-page-index="pageIdx"
            class="page-card"
          >
            <div class="page-shadow">
              <!-- Render only when page enters viewport -->
              <img 
                v-if="blobUrls[pageIdx]" 
                :src="blobUrls[pageIdx]" 
                :alt="`Page ${pageIdx + 1}`" 
                loading="lazy" 
              />
              <div v-else class="page-skeleton">
                <RefreshCw :size="18" class="spin icon-muted" />
                <span>Loading Page {{ pageIdx + 1 }}...</span>
              </div>
            </div>
            <span class="page-number">Page {{ pageIdx + 1 }} of {{ pages.length }}</span>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="state-container">
          <Eye :size="36" class="icon-muted" />
          <p>No preview available. Click "Refresh" or open a Glide project.</p>
        </div>
      </div>

      <!-- Jump-to-Page Quick Scroller Sidebar -->
      <div v-if="pages.length > 1 && !error" class="page-scroller-bar custom-scroll">
        <div class="scroller-title" title="Jump to Page">
          <Layers :size="11" />
        </div>
        <button 
          v-for="(_, pageIdx) in pages" 
          :key="pageIdx"
          class="scroller-item"
          :class="{ active: visiblePages.has(pageIdx) }"
          @click="scrollToPage(pageIdx)"
          :title="`Jump to Page ${pageIdx + 1}`"
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

.zoom-controls {
  display: flex;
  align-items: center;
  background: var(--bg-base);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 1px 3px;
  gap: 2px;
}

.control-divider {
  width: 1px;
  height: 12px;
  background-color: var(--border);
  margin: 0 2px;
}

.zoom-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 3px;
  cursor: pointer;
  padding: 0;
  transition: all 0.15s;
}

.zoom-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.zoom-btn.active-toggle {
  background: var(--accent);
  color: #ffffff;
}

.zoom-reset {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  padding: 0 3px;
  line-height: 1;
}

.zoom-reset:hover {
  color: var(--accent);
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

.preview-btn.icon-only {
  padding: 4px 6px;
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
  transition: max-width 0.2s ease;
}

/* Autonomous Responsive Multi-Column Layout */
.pages-container.multi-column-grid {
  display: grid;
  gap: 20px 24px;
  align-items: start;
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
  transition: background-color 0.25s ease, box-shadow 0.25s ease;
}

.page-shadow img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  transition: filter 0.25s ease;
}

/* ── Dark Paper Mode (Eye Comfort Filter) ── */
.pages-container.dark-paper-mode .page-shadow {
  background: #181a20;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.08);
}

.pages-container.dark-paper-mode .page-shadow img {
  /* Membalik kertas putih ke gelap dan teks hitam ke terang secara seimbang tanpa merusak spektrum warna */
  filter: invert(0.88) hue-rotate(180deg) brightness(0.95) contrast(0.9);
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
