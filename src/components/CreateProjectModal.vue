<script setup lang="ts">
import { ref } from 'vue'
import { FolderOpen, Sparkles, X } from 'lucide-vue-next'

const emit = defineEmits<{
  'close': []
  'created': [projectDir: string]
}>()

const title = ref('Laporan Tugas Akhir')
const author = ref('Nama Penyusun')
const targetDir = ref('')
const theme = ref('default')

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
    errorMsg.value = 'Silakan pilih folder lokasi proyek.'
    return
  }
  if (!title.value.trim()) {
    errorMsg.value = 'Judul proyek tidak boleh kosong.'
    return
  }

  isCreating.value = true
  errorMsg.value = null

  try {
    const pDir = targetDir.value
    // Create config.yaml
    const configYaml = `# ╔══════════════════════════════════════════════╗
# ║          GLD Next — Konfigurasi Proyek       ║
# ╚══════════════════════════════════════════════╝

title: "${title.value.replace(/"/g, '\\"')}"
author: "${author.value.replace(/"/g, '\\"')}"
theme: "${theme.value}"

# ── Tata Letak (Standar Formal Indonesia: Kiri 4cm, sisanya 3cm) ──
margin_top: "4cm"
margin_bottom: "3cm"
margin_left: "4cm"
margin_right: "3cm"

# ── Tipografi ─────────────────────────────────────────────────────
font_family: "Times New Roman"
font_size: "12pt"
line_spacing: 1.5
paragraph_spacing: "1em"
heading_spacing: "1em"
text_align: "justify"
first_line_indent: "1cm"
list_indent: "1cm"

# ── Penomoran Halaman ─────────────────────────────────────────────
page_number_style: "decimal"

# ── Metadata PDF ──────────────────────────────────────────────────
subject: ""
keywords: ""
`
    // Create cover.typ
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

    // Create 01-pendahuluan.typ
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
Tujuan dari penulisan laporan ini adalah untuk memberikan dokumentasi teknis yang terstruktur.
`

    // Create bibliography.yaml
    const bibYaml = `# ╔══════════════════════════════════════════════╗
# ║        Daftar Pustaka (Bibliography)         ║
# ╚══════════════════════════════════════════════╝
# Format sitasi Typst berbasis YAML / Hayagriva
# Cara memanggil sitasi di dokumen .typ: @fajar2026 atau #cite("fajar2026")

fajar2026:
  type: article
  title: "Perancangan Editor Dokumen Modern Berbasis Typst dan Electron"
  author: "Fajar, Ahmad"
  date: 2026
  journal: "Jurnal Teknologi Informasi dan Rekayasa Perangkat Lunak"
  url: "https://example.com/fajar2026"

glide2026:
  type: book
  title: "Panduan Penulisan Dokumen Formal Indonesia"
  author: "Tim Glide"
  date: 2026
  publisher: "Glide Press"
`

    // Create files
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
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-card">
      <!-- Modal Header -->
      <div class="modal-header">
        <div class="header-title-box">
          <Sparkles :size="18" class="icon-accent" />
          <h2>Buat Proyek GLD Baru</h2>
        </div>
        <button class="close-btn" @click="emit('close')">
          <X :size="16" />
        </button>
      </div>

      <!-- Modal Body Form -->
      <div class="modal-body">
        <div v-if="errorMsg" class="error-banner">
          {{ errorMsg }}
        </div>

        <div class="form-group">
          <label>Lokasi Folder Proyek</label>
          <div class="folder-picker">
            <input 
              type="text" 
              v-model="targetDir" 
              placeholder="Pilih atau masukkan path folder lokasi..."
              readonly
            />
            <button type="button" class="btn-browse" @click="browseFolder">
              <FolderOpen :size="14" />
              Pilih...
            </button>
          </div>
        </div>

        <div class="form-group">
          <label>Judul Dokumen / Laporan</label>
          <input 
            type="text" 
            v-model="title" 
            placeholder="misal: Laporan Tugas Akhir Sistem Kasir POS"
          />
        </div>

        <div class="form-group">
          <label>Nama Penulis / Penyusun</label>
          <input 
            type="text" 
            v-model="author" 
            placeholder="misal: Ahmad Fajar"
          />
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="modal-footer">
        <button type="button" class="btn-cancel" @click="emit('close')">Batal</button>
        <button type="button" class="btn-submit" @click="handleCreate" :disabled="isCreating">
          {{ isCreating ? 'Memproses...' : 'Inisialisasi Proyek' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal-card {
  width: 100%;
  max-width: 500px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 12px 36px rgba(0,0,0,0.6);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: modalIn 0.15s var(--ease-out);
}

@keyframes modalIn {
  from { opacity: 0; transform: scale(0.96); }
  to   { opacity: 1; transform: scale(1); }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.header-title-box {
  display: flex;
  align-items: center;
  gap: 10px;
}

.icon-accent { color: var(--accent); }

.modal-header h2 {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.close-btn {
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: color 0.15s, background 0.15s;
}

.close-btn:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.error-banner {
  padding: 10px 14px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid var(--error);
  color: #ff9999;
  font-size: 12px;
  border-radius: 6px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.form-group input[type="text"] {
  background: var(--bg-base);
  border: 1px solid var(--border);
  color: var(--text-primary);
  font-size: 13px;
  font-family: inherit;
  padding: 8px 12px;
  border-radius: 6px;
  outline: none;
  transition: border-color 0.15s;
}

.form-group input[type="text"]:focus {
  border-color: var(--accent);
}

.folder-picker {
  display: flex;
  gap: 8px;
}

.folder-picker input {
  flex: 1;
}

.btn-browse {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  font-size: 12px;
  font-family: inherit;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s, color 0.15s;
}

.btn-browse:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.modal-footer {
  padding: 14px 20px;
  background: var(--bg-base);
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.btn-cancel {
  padding: 8px 16px;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-secondary);
  font-size: 12px;
  font-family: inherit;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.btn-cancel:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.btn-submit {
  padding: 8px 18px;
  background: var(--accent);
  border: 1px solid var(--accent);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  border-radius: 6px;
  cursor: pointer;
  transition: opacity 0.15s;
}

.btn-submit:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
