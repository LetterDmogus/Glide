<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { 
  Table, Image, Heading1, Heading2, MessageSquare, 
  Code, List, ListOrdered, Quote, Layout, BookOpen
} from 'lucide-vue-next'

export interface SnippetItem {
  trigger: string
  label: string
  desc: string
  icon: any
  snippet: string
}

const props = defineProps<{
  query: string
  position: { top: number; left: number }
}>()

const emit = defineEmits<{
  'select': [snippet: string, triggerLength: number]
  'close': []
}>()

const selectedIndex = ref(0)

const snippetsList: SnippetItem[] = [
  {
    trigger: ':bab',
    label: 'Bab Utama (glide-bab)',
    desc: '#glide-bab untuk format Bab & Daftar Isi otomatis',
    icon: Heading1,
    snippet: `#glide-bab(toc: [BAB I PENDAHULUAN])[\n  BAB I \\ \n  PENDAHULUAN\n]\n`
  },
  {
    trigger: ':fig',
    label: 'Gambar (glide-figure)',
    desc: '#glide-figure gambar & caption standar Glide',
    icon: Image,
    snippet: `#glide-figure("images/sample.png", [Keterangan Gambar di sini], width: 70%)\n`
  },
  {
    trigger: ':table',
    label: 'Tabel (glide-table)',
    desc: '#glide-table wrapper tabel akademik',
    icon: Table,
    snippet: `#glide-table(caption: [Daftar Sampel Data])[\n  #table(\n    columns: (1fr, 1fr),\n    align: (left, center),\n    [*Header 1*], [*Header 2*],\n    [Data A1], [Data B1]\n  )\n]\n`
  },
  {
    trigger: ':field',
    label: 'Field : Value (glide-field)',
    desc: '#glide-field baris teratur (Judul : Isian)',
    icon: Layout,
    snippet: `#glide-field("Nama Dokumen", "Laporan Hasil Akhir")\n`
  },
  {
    trigger: ':h2',
    label: 'Sub Heading (==)',
    desc: '== Sub Judul Section',
    icon: Heading2,
    snippet: `== Sub Judul Section\n`
  },
  {
    trigger: ':note',
    label: 'Kotak Catatan (Callout)',
    desc: 'Kotak highlight informasi (#rect)',
    icon: MessageSquare,
    snippet: `#rect(fill: rgb("f0f4f8"), inset: 10pt, radius: 4pt, width: 100%)[\n  *Catatan:* Tuliskan informasi penting di sini.\n]\n`
  },
  {
    trigger: ':bib',
    label: 'Daftar Pustaka (glide-bib)',
    desc: '#glide-bib render bibliography.yaml',
    icon: BookOpen,
    snippet: `#glide-bib("bibliography.yaml")\n`
  },
  {
    trigger: ':code',
    label: 'Code Block',
    desc: 'Blok kode dengan syntax highlight',
    icon: Code,
    snippet: `\`\`\`typst\n// Tulis kode program di sini\n\`\`\`\n`
  },
  {
    trigger: ':list',
    label: 'Bullet List',
    desc: '- Daftar poin bullet',
    icon: List,
    snippet: `- Poin pertama\n- Poin kedua\n`
  },
  {
    trigger: ':enum',
    label: 'Numbered List',
    desc: '1. Daftar poin nomor',
    icon: ListOrdered,
    snippet: `1. Langkah pertama\n2. Langkah kedua\n`
  },
  {
    trigger: ':quote',
    label: 'Kutipan (Blockquote)',
    desc: '#quote blok kutipan teks',
    icon: Quote,
    snippet: `#quote(block: true)[\n  "Tuliskan kalimat kutipan atau sitasi di sini."\n]\n`
  }
]

const filteredSnippets = computed(() => {
  const q = props.query.toLowerCase()
  if (!q || q === ':') return snippetsList
  return snippetsList.filter(s => 
    s.trigger.toLowerCase().includes(q) || 
    s.label.toLowerCase().includes(q)
  )
})

function selectCurrent() {
  const items = filteredSnippets.value
  if (items.length > 0 && selectedIndex.value < items.length) {
    const item = items[selectedIndex.value]
    emit('select', item.snippet, props.query.length)
  }
}

const itemRefs = ref<HTMLElement[]>([])

function scrollToActive() {
  nextTick(() => {
    const el = itemRefs.value[selectedIndex.value]
    if (el) {
      el.scrollIntoView({ block: 'nearest' })
    }
  })
}

function handleKeyDown(e: KeyboardEvent) {
  const max = filteredSnippets.value.length - 1
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedIndex.value = selectedIndex.value < max ? selectedIndex.value + 1 : 0
    scrollToActive()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedIndex.value = selectedIndex.value > 0 ? selectedIndex.value - 1 : max
    scrollToActive()
  } else if (e.key === 'Enter' || e.key === 'Tab') {
    e.preventDefault()
    selectCurrent()
  } else if (e.key === 'Escape') {
    emit('close')
  }
}

defineExpose({
  handleKeyDown
})
</script>

<template>
  <div 
    class="symbol-palette" 
    :style="{ top: `${position.top}px`, left: `${position.left}px` }"
  >
    <div 
      v-for="(item, idx) in filteredSnippets" 
      :key="item.trigger"
      ref="itemRefs"
      class="palette-row"
      :class="{ active: idx === selectedIndex }"
      @mouseenter="selectedIndex = idx"
      @click="selectCurrent"
    >
      <component :is="item.icon" :size="14" class="row-icon" />
      <div class="row-info">
        <span class="row-label">{{ item.label }}</span>
        <span class="row-desc">{{ item.desc }}</span>
      </div>
      <code class="row-trigger">{{ item.trigger }}</code>
    </div>

    <div v-if="filteredSnippets.length === 0" class="palette-empty">
      Tidak ada shortcut cocok
    </div>
  </div>
</template>

<style scoped>
.symbol-palette {
  position: absolute;
  z-index: 2500;
  width: 320px;
  max-height: 240px;
  overflow-y: auto;
  background: var(--bg-elevated);
  border: 1px solid rgba(0, 0, 0, 0.5);
  border-radius: 3px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  padding: 4px;
  animation: popIn 0.1s var(--ease-out);
}

@keyframes popIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

.palette-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.1s;
}

.palette-row.active {
  background: var(--bg-hover);
}

.row-icon {
  color: var(--accent);
  flex-shrink: 0;
}

.row-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.row-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.row-desc {
  font-size: 10.5px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.row-trigger {
  font-size: 10.5px;
  color: var(--accent);
  background: var(--bg-surface);
  border: 1px solid var(--border);
  padding: 1px 5px;
  border-radius: 3px;
  font-family: 'JetBrains Mono', monospace;
  flex-shrink: 0;
}

.palette-empty {
  padding: 10px;
  text-align: center;
  font-size: 11px;
  color: var(--text-muted);
}
</style>
