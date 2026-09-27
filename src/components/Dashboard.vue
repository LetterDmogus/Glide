<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { 
  FolderOpen, Trash2, FileText, BookOpen, GraduationCap, 
  ScrollText, FileCode2, Clock, Search, LayoutGrid, List
} from 'lucide-vue-next'

export interface RecentProject {
  path: string
  name: string
  lastOpened: number
  isGlide: boolean
}

const emit = defineEmits<{
  'open-folder': []
  'open-project-path': [path: string]
  'create-project': [preset?: string]
}>()

const recents = ref<RecentProject[]>([])
const searchQuery = ref('')
const viewMode = ref<'grid' | 'table'>('grid')
const canvasRef = ref<HTMLCanvasElement | null>(null)
let animId: number | null = null

function loadRecents() {
  try {
    const raw = localStorage.getItem('glide_recent_projects')
    if (raw) {
      recents.value = JSON.parse(raw)
    }
  } catch {
    recents.value = []
  }
}

function removeRecent(path: string, e: Event) {
  e.stopPropagation()
  recents.value = recents.value.filter(r => r.path !== path)
  localStorage.setItem('glide_recent_projects', JSON.stringify(recents.value))
}

function formatTimeAgo(timestamp: number) {
  if (!timestamp) return ''
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString()
}

// Preset Quick Templates
const quickPresets = [
  {
    id: 'academic',
    title: 'Academic Report',
    subtitle: 'Laporan Tugas Akhir / Skripsi',
    dimensions: 'A4 • 12pt • 1.5 spacing',
    icon: GraduationCap,
    action: 'create'
  },
  {
    id: 'paper',
    title: 'Journal Paper',
    subtitle: 'Makalah & Artikel Ilmiah',
    dimensions: 'A4 • Two Columns • IEEE',
    icon: ScrollText,
    action: 'create'
  },
  {
    id: 'internship',
    title: 'Internship / PKL',
    subtitle: 'Laporan Praktik Kerja Lapangan',
    dimensions: 'A4 • Standar Formal 4-4-3-3',
    icon: BookOpen,
    action: 'create'
  },
  {
    id: 'blank',
    title: 'Blank Project',
    subtitle: 'Dokumen Kosong Bersih',
    dimensions: 'A4 • Custom Config',
    icon: FileCode2,
    action: 'create'
  },
  {
    id: 'open-folder',
    title: 'Open Existing...',
    subtitle: 'Buka Folder Proyek',
    dimensions: 'Browse Workspace Directory',
    icon: FolderOpen,
    action: 'open'
  }
]

// ── Highly Optimized Canvas Star Rain Animation ──────────────────
interface Star {
  x: number
  y: number
  length: number
  speed: number
  opacity: number
  width: number
}

function initStarRain() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  let width = (canvas.width = canvas.parentElement?.clientWidth || 800)
  let height = (canvas.height = 180)

  const stars: Star[] = []
  const maxStars = 20

  for (let i = 0; i < maxStars; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      length: Math.random() * 25 + 30,
      speed: Math.random() * 1.5 + 0.8,
      opacity: Math.random() * 0.7 + 0.3,
      width: Math.random() * 1.2 + 0.6
    })
  }

  function render() {
    ctx!.clearRect(0, 0, width, height)

    for (let i = 0; i < stars.length; i++) {
      const s = stars[i]
      s.y += s.speed
      s.x += s.speed * 0.5

      if (s.y > height || s.x > width + 50) {
        s.y = -s.length
        s.x = Math.random() * (width + 200) - 100
      }

      let fadeFactor = 1
      if (s.y > height * 0.6) {
        fadeFactor = Math.max(0, 1 - (s.y - height * 0.6) / (height * 0.4))
      }

      const currentOpacity = s.opacity * fadeFactor
      if (currentOpacity <= 0.01) continue

      const tailX = s.x - s.length * 0.4
      const tailY = s.y - s.length * 0.9

      const grad = ctx!.createLinearGradient(s.x, s.y, tailX, tailY)
      grad.addColorStop(0, `rgba(167, 139, 250, ${currentOpacity})`)
      grad.addColorStop(1, 'rgba(124, 106, 247, 0)')

      ctx!.beginPath()
      ctx!.strokeStyle = grad
      ctx!.lineWidth = s.width
      ctx!.moveTo(s.x, s.y)
      ctx!.lineTo(tailX, tailY)
      ctx!.stroke()
    }

    animId = requestAnimationFrame(render)
  }

  const handleResize = () => {
    if (!canvas || !canvas.parentElement) return
    width = canvas.width = canvas.parentElement.clientWidth
  }
  window.addEventListener('resize', handleResize)

  render()
}

function handlePresetClick(preset: typeof quickPresets[0]) {
  if (preset.action === 'open') {
    emit('open-folder')
  } else {
    emit('create-project', preset.id)
  }
}

onMounted(() => {
  loadRecents()
  initStarRain()
})

onBeforeUnmount(() => {
  if (animId) cancelAnimationFrame(animId)
})
</script>

<template>
  <div class="welcome-dashboard custom-scroll">
    <!-- Hero Canvas Star Rain Effect -->
    <div class="hero-canvas-wrapper">
      <canvas ref="canvasRef" class="star-canvas"></canvas>
    </div>

    <!-- Main Content Container -->
    <div class="dashboard-inner-container">
      <!-- Title & Version Header (Restored) -->
      <header class="welcome-hero-header">
        <div class="header-main-row">
          <h1 class="app-brand-title">Glide</h1>
          <span class="app-version-pill">Version 2.2 Preview</span>
        </div>
        <p class="app-intro-text">
          Aplikasi ini masih pada fase pengembangan, ekspektasi akan ada banyak bug. Jika kamu menemukan bug atau memiliki saran pengembangan, silakan contact email <a href="mailto:floatycandy@gmail.com" class="link-author">floatycandy@gmail.com</a>. Kontribusi kamu sangat berharga, terima kasih!
        </p>
      </header>
    
      <!-- Start Gliding Section (Identical Layout & Spacing to Recent Section) -->
      <section class="start-panel">
        <div class="section-header">
          <h2 class="section-title">Start Gliding!</h2>
        </div>

        <div class="quick-start-panel">
          <div class="preset-grid">
            <div 
              v-for="preset in quickPresets" 
              :key="preset.id"
              class="preset-card"
              :class="{ 'card-open-dir': preset.action === 'open' }"
              @click="handlePresetClick(preset)"
            >
              <div class="preset-icon-stage">
                <component :is="preset.icon" :size="26" class="preset-icon" />
              </div>
              <div class="preset-info">
                <div class="preset-name">{{ preset.title }}</div>
                <div class="preset-dimensions">{{ preset.dimensions }}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Recent Documents Section -->
      <section class="recents-panel">
        <div class="recents-header">
          <div class="recents-title-row">
            <h2 class="section-title">Recent</h2>
            <span v-if="recents.length > 0" class="recents-count">({{ recents.length }})</span>
          </div>

          <div class="recents-controls">
            <!-- Search input -->
            <div v-if="recents.length > 3" class="recent-search-wrap">
              <Search :size="13" class="search-icon" />
              <input 
                type="text" 
                v-model="searchQuery" 
                placeholder="Filter recent projects..." 
                class="search-input"
              />
            </div>

            <!-- View Mode Switcher (Grid Panel vs List Table) -->
            <div v-if="recents.length > 0" class="view-mode-toggle">
              <button 
                class="view-toggle-btn" 
                :class="{ active: viewMode === 'grid' }"
                @click="viewMode = 'grid'"
                title="Panel View"
              >
                <LayoutGrid :size="14" />
              </button>
              <button 
                class="view-toggle-btn" 
                :class="{ active: viewMode === 'table' }"
                @click="viewMode = 'table'"
                title="List View"
              >
                <List :size="14" />
              </button>
            </div>
          </div>
        </div>

        <div 
          v-if="recents.length > 0 && viewMode === 'grid'" 
          class="recents-cards-grid"
        >
          <div 
            v-for="item in recents.filter(r => !searchQuery || r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.path.toLowerCase().includes(searchQuery.toLowerCase()))" 
            :key="item.path"
            class="recent-panel-card"
            @click="emit('open-project-path', item.path)"
          >
            <div class="card-preview-stage">
              <FileText :size="36" class="card-stage-icon" />
              <button 
                class="card-del-badge" 
                @click="removeRecent(item.path, $event)"
                title="Remove from recents"
              >
                <Trash2 :size="13" />
              </button>
            </div>

            <div class="card-meta-row">
              <span class="card-project-title" :title="item.name">{{ item.name }}</span>
              <span class="card-project-date">{{ formatTimeAgo(item.lastOpened) }}</span>
            </div>
            <span class="card-project-sub" :title="item.path">{{ item.path }}</span>
          </div>
        </div>

        <div v-else-if="recents.length > 0 && viewMode === 'table'" class="recents-table">
          <div class="table-header-row">
            <span class="col-name">NAME</span>
            <span class="col-path">LOCATION</span>
            <span class="col-date">LAST OPENED</span>
            <span class="col-action"></span>
          </div>

          <div class="table-body">
            <div 
              v-for="item in recents.filter(r => !searchQuery || r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.path.toLowerCase().includes(searchQuery.toLowerCase()))" 
              :key="item.path"
              class="table-row"
              @click="emit('open-project-path', item.path)"
            >
              <div class="col-name cell-name">
                <div class="file-icon-wrap">
                  <FileText :size="15" />
                </div>
                <span class="name-text">{{ item.name }}</span>
              </div>

              <div class="col-path cell-path" :title="item.path">
                <span>{{ item.path }}</span>
              </div>

              <div class="col-date cell-date">
                <Clock :size="12" />
                <span>{{ formatTimeAgo(item.lastOpened) }}</span>
              </div>

              <div class="col-action cell-action">
                <button 
                  class="btn-row-del" 
                  @click="removeRecent(item.path, $event)"
                  title="Remove from recents"
                >
                  <Trash2 :size="13" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="recents-empty-state">
          <div class="empty-icon-box">
            <FolderOpen :size="32" />
          </div>
          <div class="empty-text">
            <h3>No recent projects</h3>
            <p>Create a new document or open an existing directory to begin writing.</p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.welcome-dashboard {
  flex: 1;
  height: 100%;
  background: var(--bg-base);
  color: var(--text-primary);
  display: flex;
  justify-content: center;
  overflow-y: auto;
  padding: 40px 48px 80px 48px;
  position: relative;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

/* ─── Canvas Star Rain Header ──────────────────────────────────── */
.hero-canvas-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 160px;
  background: linear-gradient(180deg, rgba(15, 17, 23, 0.9) 0%, rgba(15, 17, 23, 0) 100%);
  pointer-events: none;
  z-index: 1;
}

.star-canvas {
  width: 100%;
  height: 100%;
}

.dashboard-inner-container {
  max-width: 960px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 32px;
  padding-bottom: 60px;
  position: relative;
  z-index: 2;
}

/* ─── Restored Hero Title & Version Info ────────────────────────── */
.welcome-hero-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.header-main-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.app-brand-title {
  font-size: 32px;
  font-weight: 300;
  color: #ffffff;
  margin: 0;
  letter-spacing: -0.02em;
}

.app-version-pill {
  font-size: 13px;
  color: var(--text-muted);
  font-weight: 400;
}

.app-intro-text {
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary);
  margin: 0;
  max-width: 800px;
}

.link-author {
  color: var(--accent);
  text-decoration: none;
}

.link-author:hover {
  text-decoration: underline;
}

/* ─── Start Gliding Section (Identical to Recent Panel) ────────── */
.start-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* ─── Quick Start Preset Panel (Adobe Flat Style) ───────────────── */
.quick-start-panel {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 18px 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}

.preset-card {
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.preset-card:hover {
  background: var(--bg-elevated);
}

.preset-icon-stage {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  color: var(--text-secondary);
  transition: color 0.15s;
}


.preset-name {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 3px;
}

.preset-dimensions {
  font-size: 11px;
  color: var(--text-muted);
}

/* ─── Recent Section ───────────────────────────────────────────── */
.recents-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 20px;
}

.recents-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.recents-title-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.01em;
}

.recents-count {
  font-size: 13px;
  color: var(--text-muted);
}

.recents-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.recent-search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 10px;
  color: var(--text-muted);
  pointer-events: none;
}

.search-input {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 5px 10px 5px 28px;
  color: var(--text-primary);
  font-size: 12px;
  outline: none;
  width: 190px;
  transition: border-color 0.15s;
}

.search-input:focus {
  border-color: var(--accent);
}

/* View Switcher */
.view-mode-toggle {
  display: flex;
  align-items: center;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 2px;
}

.view-toggle-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  padding: 4px 6px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s, background 0.15s;
}

.view-toggle-btn:hover {
  color: var(--text-primary);
}

.view-toggle-btn.active {
  background: var(--bg-hover);
  color: var(--text-primary);
}

/* ─── Mode 1: Recent Cards Grid ────────────────────────────────── */
.recents-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 14px;
}

.recent-panel-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease;
  position: relative;
}

.recent-panel-card:hover {
  transform: translateY(-2px);
  border-color: var(--accent);
  background: var(--bg-elevated);
}

.card-preview-stage {
  width: 100%;
  height: 110px;
  background: var(--bg-base);
  border: 1px solid var(--border);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
  color: var(--text-muted);
  position: relative;
  transition: color 0.15s;
}

.recent-panel-card:hover .card-preview-stage {
  color: var(--accent);
}

.card-del-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid var(--border);
  color: var(--text-muted);
  padding: 3px;
  border-radius: 4px;
  cursor: pointer;
  opacity: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.15s, color 0.15s, background 0.15s;
}

.recent-panel-card:hover .card-del-badge {
  opacity: 1;
}

.card-del-badge:hover {
  color: var(--error);
  background: rgba(239, 68, 68, 0.2);
}

.card-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 3px;
}

.card-project-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-project-date {
  font-size: 10.5px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.card-project-sub {
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ─── Mode 2: Recents Table ────────────────────────────────────── */
.recents-table {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}

.table-header-row {
  display: grid;
  grid-template-columns: 2fr 3fr 1.5fr 40px;
  padding: 9px 14px;
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.table-body {
  display: flex;
  flex-direction: column;
}

.table-row {
  display: grid;
  grid-template-columns: 2fr 3fr 1.5fr 40px;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background 0.15s;
}

.table-row:last-child {
  border-bottom: none;
}

.table-row:hover {
  background: var(--bg-hover);
}

.cell-name {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
}

.file-icon-wrap {
  color: var(--text-muted);
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.table-row:hover .file-icon-wrap {
  color: var(--accent);
}

.name-text {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cell-path {
  font-size: 11.5px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-right: 14px;
}

.cell-date {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: var(--text-muted);
}

.cell-action {
  display: flex;
  justify-content: flex-end;
}

.btn-row-del {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  opacity: 0;
  padding: 4px;
  border-radius: 4px;
  transition: opacity 0.15s, color 0.15s, background 0.15s;
}

.table-row:hover .btn-row-del {
  opacity: 1;
}

.btn-row-del:hover {
  color: var(--error);
  background: rgba(239, 68, 68, 0.15);
}

/* ─── Empty State ──────────────────────────────────────────────── */
.recents-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  text-align: center;
  gap: 10px;
}

.empty-icon-box {
  color: var(--text-muted);
}

.empty-text h3 {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 3px 0;
}

.empty-text p {
  font-size: 12px;
  color: var(--text-muted);
  margin: 0;
}
</style>

