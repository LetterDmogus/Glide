<script setup lang="ts">
import { ref, computed } from 'vue'
import { 
  Settings2, BookMarked, Plus, 
  Trash2, RefreshCw, ChevronRight, ChevronDown,
  FileText, ShieldCheck
} from 'lucide-vue-next'
import type { GlideConfig, GlideSection } from '../electron.d'

interface SubHeading {
  level: number
  title: string
  raw: string
  line: number
}

const props = defineProps<{
  projectPath?: string
  isGlide: boolean
  config: GlideConfig | null
  sections: GlideSection[]
  activeFile?: string
}>()

const emit = defineEmits<{
  'open-file': [filePath: string]
  'open-heading': [data: { filePath: string; headingText: string; line: number }]
  'open-config': []
  'open-bib': []
  'open-cover': []
  'create-section': [title: string]
  'delete-section': [filePath: string]
  'refresh': []
  'validate': []
}>()

// ── State for Adding New Chapter ───────────────────────────────────
const isAddingChapter = ref(false)
const newChapterTitle = ref('')
const chapterInputRef = ref<HTMLInputElement | null>(null)

function startAddChapter() {
  isAddingChapter.value = true
  newChapterTitle.value = ''
  setTimeout(() => {
    chapterInputRef.value?.focus()
  }, 50)
}

function cancelAddChapter() {
  isAddingChapter.value = false
  newChapterTitle.value = ''
}

function submitAddChapter() {
  const trimmed = newChapterTitle.value.trim()
  if (!trimmed) return
  emit('create-section', trimmed)
  cancelAddChapter()
}

defineExpose({
  startAddChapter
})

// ── Expanded Chapters Set (for level 2 subbab) ─────────────────────
const expandedChapters = ref<Set<string>>(new Set())

function toggleChapterFold(path: string, e?: Event) {
  if (e) e.stopPropagation()
  if (expandedChapters.value.has(path)) {
    expandedChapters.value.delete(path)
  } else {
    expandedChapters.value.add(path)
  }
}

// ── Helpers & Heading Parsing ──────────────────────────────────────
const coverSection = computed(() => {
  return props.sections.find(s => s.name === 'cover.typ')
})

const chapterSections = computed(() => {
  return props.sections.filter(s => s.name !== 'cover.typ')
})

function parseSubheadings(content?: string): SubHeading[] {
  if (!content) return []
  const list: SubHeading[] = []
  const lines = content.split(/\r?\n/)
  
  lines.forEach((line, idx) => {
    // Cari level 2: == Subbab atau level 3: === Sub-subbab
    const match = line.match(/^(={2,3})\s+(.+)$/)
    if (match) {
      list.push({
        level: match[1].length,
        title: match[2].trim(),
        raw: line.trim(),
        line: idx + 1
      })
    }
  })
  return list
}

function getDisplayTitle(sec: GlideSection): string {
  if (sec.content) {
    const headingMatch = sec.content.match(/^=\s+(.+)$/m)
    if (headingMatch && headingMatch[1]) {
      return headingMatch[1].trim()
    }
  }
  const clean = sec.name.replace(/\.typ$/i, '').replace(/^\d+[-_]?/, '')
  const words = clean.split(/[-_]/).filter(Boolean)
  if (words.length > 0) {
    return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }
  return sec.name
}

function isCurrentActive(path: string): boolean {
  if (!props.activeFile) return false
  const normA = props.activeFile.replace(/\\/g, '/')
  const normB = path.replace(/\\/g, '/')
  return normA === normB
}

function handleChapterClick(sec: GlideSection) {
  emit('open-file', sec.path)
  // Auto-expand saat bab dibuka jika punya subbab
  const subs = parseSubheadings(sec.content)
  if (subs.length > 0 && !expandedChapters.value.has(sec.path)) {
    expandedChapters.value.add(sec.path)
  }
}

function handleSubheadingClick(sec: GlideSection, sub: SubHeading) {
  emit('open-heading', {
    filePath: sec.path,
    headingText: sub.raw,
    line: sub.line
  })
}
</script>

<template>
  <aside class="document-outline">
    <!-- Header: Seragam dengan Explorer Header, Semua Aksi Berada di Satu Baris -->
    <div class="outline-header">
      <span class="outline-title">OUTLINE</span>
      <div class="outline-actions">
        <!-- Quick Config Icon -->
        <button 
          class="icon-btn" 
          @click="emit('open-config')" 
          title="Konfigurasi Dokumen (config.yaml)"
        >
          <Settings2 :size="14" />
        </button>

        <!-- Quick Bib Icon -->
        <button 
          class="icon-btn" 
          @click="emit('open-bib')" 
          title="Daftar Pustaka (bibliography.yaml)"
        >
          <BookMarked :size="14" />
        </button>

        <!-- Validator Icon -->
        <button 
          class="icon-btn" 
          @click="emit('validate')" 
          title="Periksa Struktur & Validasi Dokumen"
        >
          <ShieldCheck :size="14" />
        </button>

        <!-- Add Chapter Icon -->
        <button 
          class="icon-btn" 
          @click="startAddChapter" 
          title="Tambah Bab Baru"
        >
          <Plus :size="14" />
        </button>

        <!-- Refresh Icon -->
        <button 
          class="icon-btn" 
          @click="emit('refresh')" 
          title="Segarkan Struktur"
        >
          <RefreshCw :size="14" />
        </button>
      </div>
    </div>

    <!-- Tree Navigation Body (Word-style navigation pane with guide lines & points) -->
    <div class="outline-tree-container">
      <div class="outline-tree">
        <!-- 1. Halaman Sampul (Cover) Termasuk dalam Urutan List di Atas -->
        <div 
          class="tree-row level-1 cover-row"
          :class="{ active: coverSection ? isCurrentActive(coverSection.path) : false }"
          @click="emit('open-cover')"
        >
          <span class="node-guide-bullet">
            <FileText :size="12" class="cover-icon" />
          </span>
          <span class="node-label">Halaman Sampul</span>
        </div>

        <!-- 2. Daftar Bab (Level 1) & Subbab (Level 2) -->
        <template v-for="(sec, index) in chapterSections" :key="sec.path">
          <!-- Bab Item (Level 1) -->
          <div 
            class="tree-row level-1"
            :class="{ active: isCurrentActive(sec.path) }"
            @click="handleChapterClick(sec)"
          >
            <!-- Folding chevron if has subheadings, or dot guide point -->
            <button 
              v-if="parseSubheadings(sec.content).length > 0"
              class="fold-btn"
              @click.stop="toggleChapterFold(sec.path, $event)"
            >
              <ChevronDown v-if="expandedChapters.has(sec.path)" :size="12" />
              <ChevronRight v-else :size="12" />
            </button>
            <span v-else class="node-guide-bullet dot-point">•</span>

            <!-- Chapter Label -->
            <span class="node-label" :title="getDisplayTitle(sec)">
              {{ sec.chapterNum ? `${sec.chapterNum}. ` : `${index + 1}. ` }}{{ getDisplayTitle(sec) }}
            </span>

            <!-- Delete Chapter Action on Hover -->
            <button 
              class="row-delete-btn"
              title="Hapus Bab"
              @click.stop="emit('delete-section', sec.path)"
            >
              <Trash2 :size="11" />
            </button>
          </div>

          <!-- Subbab (Level 2) List with Guide Lines -->
          <div 
            v-if="parseSubheadings(sec.content).length > 0 && expandedChapters.has(sec.path)"
            class="subheadings-container"
          >
            <div 
              v-for="sub in parseSubheadings(sec.content)" 
              :key="sub.line"
              class="tree-row level-2"
              @click="handleSubheadingClick(sec, sub)"
            >
              <span class="sub-guide-point"></span>
              <span class="node-label sub-label" :title="sub.title">
                {{ sub.title }}
              </span>
            </div>
          </div>
        </template>

        <!-- Inline Add Chapter Row -->
        <div v-if="isAddingChapter" class="inline-add-row">
          <span class="node-guide-bullet">+</span>
          <input
            ref="chapterInputRef"
            v-model="newChapterTitle"
            class="inline-add-input"
            placeholder="Nama bab baru... (Enter)"
            @keydown.enter="submitAddChapter"
            @keydown.esc="cancelAddChapter"
            @blur="cancelAddChapter"
          />
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.document-outline {
  width: 100%;
  height: 100%;
  flex-shrink: 0;
  background: var(--bg-surface);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  user-select: none;
}

/* Header Seragam dengan FileExplorer */
.outline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  height: 35px;
  box-sizing: border-box;
}

.outline-title {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--text-muted);
}

.outline-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.icon-btn {
  width: 22px;
  height: 22px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.12s ease;
  padding: 0;
}

.icon-btn:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

/* Outline Tree Container (Word Navigation Pane Style) */
.outline-tree-container {
  flex: 1;
  overflow-y: auto;
  padding: 6px 0;
}

.outline-tree {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

/* Tree Rows */
.tree-row {
  display: flex;
  align-items: center;
  padding: 5px 12px;
  cursor: pointer;
  border-radius: 4px;
  margin: 0 4px;
  transition: background 0.12s, color 0.12s;
  position: relative;
  font-size: 12px;
}

/* Level 1: Judul Bab & Sampul - Putih Cerah */
.tree-row.level-1 {
  color: #ffffff;
  font-weight: 500;
}

.tree-row.level-1 .node-label {
  color: #ffffff;
}

.tree-row.level-1:hover {
  background: var(--bg-hover);
  color: #ffffff;
}

.tree-row.level-1:hover .node-label {
  color: #ffffff;
}

.tree-row.active {
  background: var(--accent-soft);
  color: #ffffff;
  font-weight: 600;
}

.tree-row.active .node-label {
  color: #ffffff;
}

.tree-row.active .node-guide-bullet,
.tree-row.active .fold-btn {
  color: var(--accent);
}

.node-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-left: 6px;
}

/* Level 1 & Folding Button */
.fold-btn {
  width: 14px;
  height: 14px;
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border-radius: 3px;
  flex-shrink: 0;
  transition: color 0.12s;
}

.fold-btn:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.1);
}

.node-guide-bullet {
  width: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #94a3b8;
  font-size: 12px;
}

.dot-point {
  font-size: 14px;
  line-height: 1;
  color: #94a3b8;
}

.cover-icon {
  color: #fbbf24;
}

/* Delete Row Hover */
.row-delete-btn {
  opacity: 0;
  width: 18px;
  height: 18px;
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  transition: opacity 0.12s, color 0.12s;
  flex-shrink: 0;
}

.tree-row:hover .row-delete-btn {
  opacity: 1;
}

.row-delete-btn:hover {
  color: var(--error);
  background: rgba(248, 113, 113, 0.15);
}

/* Subbab (Level 2) with Guide Lines - Abu-abu Jelas */
.subheadings-container {
  display: flex;
  flex-direction: column;
  margin-left: 20px;
  padding-left: 6px;
  border-left: 1px solid rgba(255, 255, 255, 0.15);
  gap: 1px;
}

.tree-row.level-2 {
  padding: 4px 8px;
  font-size: 11.5px;
  margin: 0;
  color: #94a3b8;
}

.sub-guide-point {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #64748b;
  flex-shrink: 0;
  transition: background 0.12s;
}

.tree-row.level-2:hover .sub-guide-point {
  background: var(--accent);
}

.sub-label {
  font-size: 11px;
  color: #94a3b8;
  transition: color 0.12s;
}

.tree-row.level-2:hover {
  background: var(--bg-hover);
  color: #ffffff;
}

.tree-row.level-2:hover .sub-label {
  color: #ffffff;
}

/* Inline Add Chapter Row */
.inline-add-row {
  display: flex;
  align-items: center;
  padding: 4px 12px;
  margin: 2px 4px;
  background: var(--bg-base);
  border: 1px solid var(--accent);
  border-radius: 4px;
}

.inline-add-input {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 11.5px;
  font-family: inherit;
  outline: none;
  margin-left: 6px;
}
</style>
