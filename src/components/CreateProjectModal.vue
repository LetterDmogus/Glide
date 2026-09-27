<script setup lang="ts">
import { ref, computed } from 'vue'
import { 
  FolderOpen, X, GraduationCap, ScrollText, BookOpen, 
  FileCode2, Settings2, ChevronDown, ChevronRight
} from 'lucide-vue-next'

const props = defineProps<{
  initialPreset?: string
}>()

const emit = defineEmits<{
  'close': []
  'created': [projectDir: string]
}>()

// Presets Definition
interface DocPreset {
  id: string
  title: string
  subtitle: string
  icon: any
  tag: string
  defaultTitle: string
  layout: 'academic' | 'paper' | 'internship' | 'blank'
  fontFamily: string
  fontSize: string
  lineSpacing: number
  margins: { top: string; bottom: string; left: string; right: string }
  desc: string
}

const presets: DocPreset[] = [
  {
    id: 'academic',
    title: 'Academic Report',
    subtitle: 'Laporan Tugas Akhir / Skripsi',
    icon: GraduationCap,
    tag: 'Standard',
    defaultTitle: 'Laporan Tugas Akhir',
    layout: 'academic',
    fontFamily: 'Times New Roman',
    fontSize: '12pt',
    lineSpacing: 1.5,
    margins: { top: '4cm', bottom: '3cm', left: '4cm', right: '3cm' },
    desc: 'Format baku perguruan tinggi Indonesia dengan margin 4-4-3-3 cm, Times New Roman 12pt, dan spasi 1.5.'
  },
  {
    id: 'paper',
    title: 'Journal Paper',
    subtitle: 'Makalah & Artikel Ilmiah',
    icon: ScrollText,
    tag: 'Research',
    defaultTitle: 'Paper Ilmiah dan Riset',
    layout: 'paper',
    fontFamily: 'Times New Roman',
    fontSize: '10pt',
    lineSpacing: 1.15,
    margins: { top: '2.5cm', bottom: '2.5cm', left: '2cm', right: '2cm' },
    desc: 'Format 2 kolom untuk jurnal ilmiah, conference paper, dan publikasi riset.'
  },
  {
    id: 'internship',
    title: 'Internship / PKL',
    subtitle: 'Laporan Praktik Kerja Lapangan',
    icon: BookOpen,
    tag: 'Vocational',
    defaultTitle: 'Laporan Praktik Kerja Lapangan (PKL)',
    layout: 'internship',
    fontFamily: 'Times New Roman',
    fontSize: '12pt',
    lineSpacing: 1.5,
    margins: { top: '4cm', bottom: '3cm', left: '4cm', right: '3cm' },
    desc: 'Struktur laporan magang / PKL dengan bab pelaksanaan, profil instansi, dan pembahasan kerja.'
  },
  {
    id: 'blank',
    title: 'Blank Project',
    subtitle: 'Dokumen Kosong Bersih',
    icon: FileCode2,
    tag: 'Custom',
    defaultTitle: 'Dokumen Baru',
    layout: 'blank',
    fontFamily: 'Times New Roman',
    fontSize: '12pt',
    lineSpacing: 1.5,
    margins: { top: '3cm', bottom: '3cm', left: '3cm', right: '3cm' },
    desc: 'Proyek kosong dengan file konfigurasi minimal untuk fleksibilitas penuh.'
  }
]

const selectedPresetId = ref<string>(props.initialPreset || 'academic')
const selectedPreset = computed(() => presets.find(p => p.id === selectedPresetId.value) || presets[0])

// Form Fields (Dynamic right panel)
const title = ref(selectedPreset.value.defaultTitle)
const author = ref('Nama Penyusun')
const targetDir = ref('')
const theme = ref('default')

// Basic Layout options
const customMarginLeft = ref(selectedPreset.value.margins.left)
const customMarginTop = ref(selectedPreset.value.margins.top)
const customMarginRight = ref(selectedPreset.value.margins.right)
const customMarginBottom = ref(selectedPreset.value.margins.bottom)
const customLineSpacing = ref(selectedPreset.value.lineSpacing)

// Advanced Config options
const showAdvanced = ref(false)
const customFontFamily = ref(selectedPreset.value.fontFamily)
const customFontSize = ref(selectedPreset.value.fontSize)
const customTextAlign = ref('justify')
const customPageNumberStyle = ref('decimal')
const customCitationStyle = ref('ieee')
const customParagraphSpacing = ref('1em')
const customFirstLineIndent = ref('1cm')

function selectPreset(preset: DocPreset) {
  selectedPresetId.value = preset.id
  title.value = preset.defaultTitle
  customMarginLeft.value = preset.margins.left
  customMarginTop.value = preset.margins.top
  customMarginRight.value = preset.margins.right
  customMarginBottom.value = preset.margins.bottom
  customLineSpacing.value = preset.lineSpacing
  customFontFamily.value = preset.fontFamily
  customFontSize.value = preset.fontSize
}

const isCreating = ref(false)
const errorMsg = ref<string | null>(null)

async function browseFolder() {
  const result = await window.electronAPI?.openFolder?.()
  if (result) {
    targetDir.value = result.path
  }
}

async function handleCreate() {
  if (!targetDir.value) {
    errorMsg.value = 'Silakan tentukan folder lokasi proyek terlebih dahulu.'
    return
  }
  if (!title.value.trim()) {
    errorMsg.value = 'Judul proyek tidak boleh kosong.'
    return
  }

  isCreating.value = true
  errorMsg.value = null

  try {
    const parentDir = targetDir.value
    const folderName = title.value.trim().replace(/[/\\?%*:|"<>]/g, '').replace(/\s+/g, '-') || 'Proyek-Glide'
    const pDir = `${parentDir}/${folderName}`

    await window.electronAPI?.createDir?.(pDir)

    // Config YAML
    const configYaml = `# ╔══════════════════════════════════════════════╗
# ║          GLD Next — Konfigurasi Proyek       ║
# ╚══════════════════════════════════════════════╝

title: "${title.value.replace(/"/g, '\\"')}"
author: "${author.value.replace(/"/g, '\\"')}"
theme: "${theme.value}"

# ── Tata Letak ──────────────────────────────────────────────────
margin_top: "${customMarginTop.value}"
margin_bottom: "${customMarginBottom.value}"
margin_left: "${customMarginLeft.value}"
margin_right: "${customMarginRight.value}"

# ── Tipografi ─────────────────────────────────────────────────────
font_family: "${customFontFamily.value}"
font_size: "${customFontSize.value}"
line_spacing: ${customLineSpacing.value}
paragraph_spacing: "${customParagraphSpacing.value}"
heading_spacing: "1em"
text_align: "${customTextAlign.value}"
first_line_indent: "${customFirstLineIndent.value}"
list_indent: "1cm"
citation_style: "${customCitationStyle.value}"

# ── Penomoran Halaman ─────────────────────────────────────────────
page_number_style: "${customPageNumberStyle.value}"

# ── Metadata PDF ──────────────────────────────────────────────────
subject: "${selectedPreset.value.title}"
keywords: "Glide, Typst, Document"
`

    // Cover Typst
    const coverTyp = `---
layout: "cover"
---
#align(center)[
  #set text(size: 14pt, weight: "bold")
  ${title.value.toUpperCase()}

  #v(5em)

  #set text(size: 12pt, weight: "bold")
  Disusun oleh: \\
  ${author.value}

  #v(6em)

  PROGRAM STUDI REKAYASA PERANGKAT LUNAK \\
  TAHUN AJARAN 2026
]
`

    // Section Intro
    const pendahuluanTyp = `---
layout: "main"
---
= PENDAHULUAN

== Latar Belakang
Tuliskan latar belakang masalah penulisan dokumen atau laporan Anda di sini.

== Rumusan Masalah
1. Bagaimana cara merancang dokumen secara otomatis menggunakan Glide 2.0?
2. Bagaimana efisiensi kompilasi Typst dibandingkan metode konvensional?

== Tujuan Penulisan
Tujuan dari penulisan dokumen ini adalah untuk memberikan laporan teknis yang sistematis dan formal.
`

    // Bibliography YAML
    const bibYaml = `# ╔══════════════════════════════════════════════╗
# ║        Daftar Pustaka (Bibliography)         ║
# ╚══════════════════════════════════════════════╝

fajar2026:
  type: article
  title: "Perancangan Editor Dokumen Modern Berbasis Typst dan Electron"
  author: "Fajar, Ahmad"
  date: 2026
  journal: "Jurnal Teknologi Informasi dan Rekayasa Perangkat Lunak"

glide2026:
  type: book
  title: "Panduan Penulisan Dokumen Formal Indonesia"
  author: "Tim Glide"
  date: 2026
  publisher: "Glide Press"
`

    await window.electronAPI?.createFile?.(`${pDir}/config.yaml`, configYaml)
    await window.electronAPI?.createFile?.(`${pDir}/bibliography.yaml`, bibYaml)
    await window.electronAPI?.createFile?.(`${pDir}/cover.typ`, coverTyp)
    await window.electronAPI?.createFile?.(`${pDir}/sections/01-pendahuluan.typ`, pendahuluanTyp)
    await window.electronAPI?.createDir?.(`${pDir}/images`)

    isCreating.value = false
    emit('created', pDir)
  } catch (err: any) {
    isCreating.value = false
    errorMsg.value = err.message || 'Gagal membuat proyek GLD baru.'
  }
}
</script>

<template>
  <div class="adobe-modal-backdrop" @click.self="emit('close')">
    <div class="adobe-dialog-window">
      <!-- Top Title Bar -->
      <header class="dialog-titlebar">
        <span class="dialog-window-title">New Document</span>
        <button class="dialog-close-btn" @click="emit('close')">
          <X :size="16" />
        </button>
      </header>

      <!-- Main Two-Column Layout -->
      <div class="dialog-main-split">
        <!-- Left Panel: Presets Browser -->
        <div class="presets-browser-panel">
          <div class="browser-header">
            <span class="browser-category-label">RECENT & BLANK DOCUMENT PRESETS</span>
          </div>

          <div class="presets-flow-grid custom-scroll">
            <div 
              v-for="preset in presets"
              :key="preset.id"
              class="preset-item-card"
              :class="{ active: selectedPresetId === preset.id }"
              @click="selectPreset(preset)"
            >
              <div class="preset-preview-box">
                <component :is="preset.icon" :size="32" class="preset-preview-icon" />
                <span class="preset-tag-pill">{{ preset.tag }}</span>
              </div>
              <div class="preset-card-details">
                <span class="preset-card-title">{{ preset.title }}</span>
                <span class="preset-card-dim">{{ preset.subtitle }}</span>
              </div>
            </div>
          </div>

          <div class="preset-description-bar">
            <p>{{ selectedPreset.desc }}</p>
          </div>
        </div>

        <!-- Right Panel: Preset Details / Document Inspector -->
        <div class="preset-inspector-panel custom-scroll">
          <div class="inspector-header">
            <span class="inspector-title">PRESET DETAILS</span>
          </div>

          <div class="inspector-fields">
            <div v-if="errorMsg" class="inspector-error-banner">
              {{ errorMsg }}
            </div>

            <!-- Project Title -->
            <div class="field-item">
              <label class="field-label">Document Title</label>
              <input 
                type="text" 
                v-model="title" 
                placeholder="Document title..."
                class="inspector-input"
              />
            </div>

            <!-- Author -->
            <div class="field-item">
              <label class="field-label">Author / Student Name</label>
              <input 
                type="text" 
                v-model="author" 
                placeholder="Your name..."
                class="inspector-input"
              />
            </div>

            <!-- Location Directory -->
            <div class="field-item">
              <label class="field-label">Save Location</label>
              <div class="folder-input-row">
                <input 
                  type="text" 
                  v-model="targetDir" 
                  placeholder="Select directory..."
                  readonly
                  class="inspector-input readonly"
                />
                <button class="btn-browse-folder" @click="browseFolder">
                  <FolderOpen :size="14" />
                </button>
              </div>
            </div>

            <div class="inspector-divider"></div>

            <!-- Page Specifications (Read-only summary) -->
            <div class="grid-two-cols">
              <div class="field-item">
                <label class="field-label">Paper Size</label>
                <input type="text" value="A4 (210 × 297 mm)" readonly class="inspector-input readonly" />
              </div>
              <div class="field-item">
                <label class="field-label">Line Spacing</label>
                <select v-model="customLineSpacing" class="inspector-select">
                  <option :value="1.0">1.0 (Single)</option>
                  <option :value="1.15">1.15 (Compact)</option>
                  <option :value="1.5">1.5 (Standard Academic)</option>
                  <option :value="2.0">2.0 (Double)</option>
                </select>
              </div>
            </div>

            <!-- Margins Group -->
            <div class="field-item">
              <label class="field-label">Margins</label>
              <div class="margin-quad-grid">
                <div class="margin-cell">
                  <span class="margin-axis">Top</span>
                  <input type="text" v-model="customMarginTop" class="margin-input" />
                </div>
                <div class="margin-cell">
                  <span class="margin-axis">Bottom</span>
                  <input type="text" v-model="customMarginBottom" class="margin-input" />
                </div>
                <div class="margin-cell">
                  <span class="margin-axis">Left</span>
                  <input type="text" v-model="customMarginLeft" class="margin-input" />
                </div>
                <div class="margin-cell">
                  <span class="margin-axis">Right</span>
                  <input type="text" v-model="customMarginRight" class="margin-input" />
                </div>
              </div>
            </div>

            <!-- Advanced Configuration Collapsible Toggle -->
            <div class="advanced-toggle-wrapper">
              <button 
                type="button" 
                class="btn-toggle-advanced" 
                @click="showAdvanced = !showAdvanced"
              >
                <div class="toggle-label-wrap">
                  <Settings2 :size="13" />
                  <span>Advanced Options</span>
                </div>
                <ChevronDown v-if="showAdvanced" :size="14" />
                <ChevronRight v-else :size="14" />
              </button>
            </div>

            <!-- Advanced Form Section (Collapsible) -->
            <div v-if="showAdvanced" class="advanced-fields-box">
              <!-- Font Family & Font Size -->
              <div class="grid-two-cols">
                <div class="field-item">
                  <label class="field-label">Font Family</label>
                  <input 
                    type="text" 
                    v-model="customFontFamily" 
                    placeholder="e.g. Times New Roman"
                    class="inspector-input"
                  />
                </div>
                <div class="field-item">
                  <label class="field-label">Font Size</label>
                  <select v-model="customFontSize" class="inspector-select">
                    <option value="10pt">10pt</option>
                    <option value="11pt">11pt</option>
                    <option value="12pt">12pt (Academic)</option>
                    <option value="14pt">14pt</option>
                  </select>
                </div>
              </div>

              <!-- Text Alignment & Page Number Style -->
              <div class="grid-two-cols">
                <div class="field-item">
                  <label class="field-label">Text Alignment</label>
                  <select v-model="customTextAlign" class="inspector-select">
                    <option value="justify">Justify (Rata Kanan Kiri)</option>
                    <option value="left">Left (Rata Kiri)</option>
                  </select>
                </div>
                <div class="field-item">
                  <label class="field-label">Page Number Style</label>
                  <select v-model="customPageNumberStyle" class="inspector-select">
                    <option value="decimal">1, 2, 3 (Decimal)</option>
                    <option value="roman">i, ii, iii (Roman)</option>
                  </select>
                </div>
              </div>

              <!-- Citation Style & Paragraph Spacing -->
              <div class="grid-two-cols">
                <div class="field-item">
                  <label class="field-label">Citation Style</label>
                  <select v-model="customCitationStyle" class="inspector-select">
                    <option value="ieee">IEEE</option>
                    <option value="apa">APA</option>
                    <option value="harvard">Harvard</option>
                    <option value="chicago">Chicago</option>
                  </select>
                </div>
                <div class="field-item">
                  <label class="field-label">First Line Indent</label>
                  <input 
                    type="text" 
                    v-model="customFirstLineIndent" 
                    placeholder="e.g. 1cm"
                    class="inspector-input"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Actions inside Right Panel -->
          <div class="inspector-actions">
            <button class="btn-dialog-cancel" @click="emit('close')">
              Cancel
            </button>
            <button class="btn-dialog-create" @click="handleCreate" :disabled="isCreating">
              {{ isCreating ? 'Creating...' : 'Create' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.adobe-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(6px);
  z-index: 2500;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.adobe-dialog-window {
  width: 900px;
  max-width: 95vw;
  height: 580px;
  max-height: 90vh;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.65);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: dialogScaleIn 0.15s cubic-bezier(0.16, 1, 0.3, 1);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: var(--text-primary);
}

@keyframes dialogScaleIn {
  from { opacity: 0; transform: scale(0.97); }
  to   { opacity: 1; transform: scale(1); }
}

/* ── Title Bar ── */
.dialog-titlebar {
  height: 42px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  flex-shrink: 0;
}

.dialog-window-title {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-muted);
  letter-spacing: 0.02em;
}

.dialog-close-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s, background 0.15s;
}

.dialog-close-btn:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

/* ── Split Layout ── */
.dialog-main-split {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 310px;
  overflow: hidden;
}

/* ── Left Browser Panel ── */
.presets-browser-panel {
  background: var(--bg-base);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 20px;
  overflow: hidden;
}

.browser-header {
  margin-bottom: 16px;
}

.browser-category-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--text-muted);
}

.presets-flow-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 14px;
  overflow-y: auto;
  padding-right: 4px;
}

.preset-item-card {
  background: var(--bg-surface);
  border: 2px solid transparent;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.preset-item-card:hover {
  background: var(--bg-elevated);
}

.preset-item-card.active {
  border-color: var(--accent);
  background: var(--bg-elevated);
}

.preset-preview-box {
  width: 100%;
  height: 100px;
  background: var(--bg-base);
  border-radius: 6px;
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  margin-bottom: 10px;
  color: var(--text-muted);
  transition: color 0.15s;
}

.preset-item-card.active .preset-preview-box {
  color: var(--accent);
}

.preset-tag-pill {
  position: absolute;
  top: 6px;
  right: 6px;
  font-size: 9.5px;
  font-weight: 700;
  padding: 2px 6px;
  background: var(--bg-surface);
  color: var(--text-muted);
  border-radius: 4px;
  border: 1px solid var(--border);
}

.preset-card-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.preset-card-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preset-card-dim {
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preset-description-bar {
  margin-top: 14px;
  padding: 10px 14px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.45;
  color: var(--text-secondary);
}

.preset-description-bar p {
  margin: 0;
}

/* ── Right Inspector Panel ── */
.preset-inspector-panel {
  background: var(--bg-surface);
  padding: 20px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.inspector-header {
  margin-bottom: 18px;
}

.inspector-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--text-muted);
}

.inspector-fields {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.inspector-error-banner {
  padding: 8px 12px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid var(--error);
  color: #fca5a5;
  font-size: 11.5px;
  border-radius: 6px;
}

.field-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-muted);
}

.inspector-input,
.inspector-select {
  width: 100%;
  background: var(--bg-base);
  border: 1px solid var(--border);
  color: var(--text-primary);
  font-size: 12.5px;
  padding: 7px 10px;
  border-radius: 6px;
  outline: none;
  transition: border-color 0.15s;
}

.inspector-input:focus,
.inspector-select:focus {
  border-color: var(--accent);
}

.inspector-input.readonly {
  background: var(--bg-base);
  color: var(--text-muted);
}

.folder-input-row {
  display: flex;
  gap: 6px;
}

.btn-browse-folder {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  color: var(--text-primary);
  padding: 0 12px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.btn-browse-folder:hover {
  background: var(--bg-hover);
}

.inspector-divider {
  height: 1px;
  background: var(--border);
  margin: 4px 0;
}

.grid-two-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

/* Margins Quad Box */
.margin-quad-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.margin-cell {
  display: flex;
  align-items: center;
  background: var(--bg-base);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 4px 8px;
}

.margin-axis {
  font-size: 10.5px;
  color: var(--text-muted);
  width: 44px;
}

.margin-input {
  width: 100%;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 12px;
  outline: none;
  text-align: right;
}

/* Advanced Toggle */
.advanced-toggle-wrapper {
  margin-top: 4px;
}

.btn-toggle-advanced {
  width: 100%;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 11.5px;
  font-weight: 600;
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.btn-toggle-advanced:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
  border-color: var(--accent-glow);
}

.toggle-label-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.advanced-fields-box {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--bg-base);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 12px;
  animation: dialogScaleIn 0.15s ease-out;
}

/* Actions (Standard Glide Rounded Rectangle Buttons) */
.inspector-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.btn-dialog-cancel {
  padding: 7px 16px;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-secondary);
  border-radius: 6px;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.btn-dialog-cancel:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.btn-dialog-create {
  padding: 7px 20px;
  background: var(--accent);
  border: 1px solid var(--accent);
  color: #ffffff;
  border-radius: 6px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}

.btn-dialog-create:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-dialog-create:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

