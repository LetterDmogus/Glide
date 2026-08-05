<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { 
  Search, FileText, FileCode, Settings, FileImage, 
  Download, Eye, TerminalSquare, FolderOpen, PlusCircle, Save
} from 'lucide-vue-next'
import type { FileNode } from './FileExplorer.vue'

export interface CommandItem {
  id: string
  label: string
  category: 'file' | 'command'
  icon: any
  shortcut?: string
  action: () => void
  path?: string
}

const props = defineProps<{
  tree: FileNode[]
  projectPath?: string
}>()

const emit = defineEmits<{
  'close': []
  'open-file': [path: string]
  'create-project': []
  'open-folder': []
  'open-bib': []
  'save-file': []
  'toggle-preview': []
  'toggle-terminal': []
  'export-pdf': []
  'export-docx': []
  'search-project': []
  'open-settings': []
}>()

const searchQuery = ref('')
const selectedIndex = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)

// Flatten file tree to linear array of files
function flattenFiles(nodes: FileNode[]): { name: string; path: string }[] {
  if (!Array.isArray(nodes)) return []
  let list: { name: string; path: string }[] = []
  for (const n of nodes) {
    if (!n) continue
    if (n.type === 'file' && n.name && n.path) {
      list.push({ name: n.name, path: n.path })
    } else if (n.type === 'dir' && Array.isArray(n.children)) {
      list = list.concat(flattenFiles(n.children))
    }
  }
  return list
}

// Built-in commands list
const commandsList: CommandItem[] = [
  {
    id: 'cmd-save',
    label: 'File: Save Current File',
    category: 'command',
    icon: Save,
    shortcut: 'Ctrl+S',
    action: () => emit('save-file')
  },
  {
    id: 'cmd-export-pdf',
    label: 'Run: Export PDF (Save Dialog)...',
    category: 'command',
    icon: Download,
    shortcut: 'Ctrl+Shift+E',
    action: () => emit('export-pdf')
  },
  {
    id: 'cmd-export-docx',
    label: 'Run: Export Word (.docx) [Experimental - Requires pdf2docx]...',
    category: 'command',
    icon: Download,
    shortcut: 'Ctrl+Shift+W',
    action: () => emit('export-docx')
  },
  {
    id: 'cmd-toggle-preview',
    label: 'View: Toggle Live Preview',
    category: 'command',
    icon: Eye,
    shortcut: 'Ctrl+P',
    action: () => emit('toggle-preview')
  },
  {
    id: 'cmd-open-terminal',
    label: 'View: Open in External Terminal',
    category: 'command',
    icon: TerminalSquare,
    shortcut: 'Ctrl+`',
    action: () => emit('toggle-terminal')
  },
  {
    id: 'cmd-open-folder',
    label: 'File: Open Folder...',
    category: 'command',
    icon: FolderOpen,
    shortcut: 'Ctrl+O',
    action: () => emit('open-folder')
  },
  {
    id: 'cmd-create-project',
    label: 'File: New GLD Project Wizard...',
    category: 'command',
    icon: PlusCircle,
    shortcut: 'Ctrl+N',
    action: () => emit('create-project')
  },
  {
    id: 'cmd-open-bib',
    label: 'File: Open Bibliography (bibliography.yaml)',
    category: 'command',
    icon: Settings,
    action: () => emit('open-bib')
  },
  {
    id: 'cmd-search-project',
    label: 'Edit: Find in Project...',
    category: 'command',
    icon: Search,
    shortcut: 'Ctrl+Shift+F',
    action: () => emit('search-project')
  },
  {
    id: 'cmd-open-settings',
    label: 'Preferences: Open Settings',
    category: 'command',
    icon: Settings,
    shortcut: 'Ctrl+,',
    action: () => emit('open-settings')
  }
]

// Filtered items based on query (Commands or Files)
const filteredItems = computed<CommandItem[]>(() => {
  const q = searchQuery.value.trim().toLowerCase()
  
  if (q.startsWith('>')) {
    // Command Mode
    const filterText = q.slice(1).trim()
    if (!filterText) return commandsList
    return commandsList.filter(c => c.label.toLowerCase().includes(filterText))
  }

  // File Search Mode + Commands Fallback
  const allFiles = flattenFiles(props.tree)
  const fileItems: CommandItem[] = allFiles.map(f => {
    const ext = f.name.toLowerCase()
    let icon = FileText
    if (ext.endsWith('.typ')) icon = FileCode
    else if (ext.endsWith('.yaml') || ext.endsWith('.yml')) icon = Settings
    else if (['.png', '.jpg', '.jpeg', '.svg'].some(e => ext.endsWith(e))) icon = FileImage

    return {
      id: `file-${f.path}`,
      label: f.name,
      path: f.path,
      category: 'file',
      icon,
      action: () => emit('open-file', f.path)
    }
  })

  if (!q) {
    return [...fileItems, ...commandsList]
  }

  const matchedFiles = fileItems.filter(f => 
    f.label.toLowerCase().includes(q) || (f.path && f.path.toLowerCase().includes(q))
  )
  const matchedCmds = commandsList.filter(c => c.label.toLowerCase().includes(q))
  return [...matchedFiles, ...matchedCmds]
})

function executeSelected() {
  const items = filteredItems.value
  if (items.length > 0 && selectedIndex.value < items.length) {
    const item = items[selectedIndex.value]
    emit('close')
    item.action()
  }
}

function handleKeyDown(e: KeyboardEvent) {
  const max = filteredItems.value.length - 1
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedIndex.value = selectedIndex.value < max ? selectedIndex.value + 1 : 0
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedIndex.value = selectedIndex.value > 0 ? selectedIndex.value - 1 : max
  } else if (e.key === 'Enter') {
    e.preventDefault()
    executeSelected()
  } else if (e.key === 'Escape') {
    emit('close')
  }
}

onMounted(() => {
  nextTick(() => {
    inputRef.value?.focus()
  })
})
</script>

<template>
  <div class="palette-overlay" @click.self="emit('close')">
    <div class="palette-card" @click.stop>
      <!-- Input Header -->
      <div class="palette-input-wrapper">
        <Search :size="16" class="search-icon" />
        <input
          ref="inputRef"
          v-model="searchQuery"
          type="text"
          class="palette-input"
          autofocus
          placeholder="Ketik nama file untuk membuka, atau ketik '>' untuk jalankan command..."
          @keydown="handleKeyDown"
        />
      </div>

      <!-- Results List -->
      <div v-if="filteredItems.length > 0" class="palette-results">
        <div
          v-for="(item, idx) in filteredItems"
          :key="item.id"
          class="palette-item"
          :class="{ active: idx === selectedIndex }"
          @mouseenter="selectedIndex = idx"
          @click="executeSelected"
        >
          <component :is="item.icon" :size="15" class="item-icon" />
          <div class="item-text">
            <span class="item-label">{{ item.label }}</span>
            <span v-if="item.path" class="item-path">{{ item.path }}</span>
          </div>
          <kbd v-if="item.shortcut" class="item-shortcut">{{ item.shortcut }}</kbd>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="palette-empty">
        <span>Tidak ada file atau perintah yang cocok</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.palette-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
  z-index: 3000;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 50px;
}

.palette-card {
  width: 100%;
  max-width: 600px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.6);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: paletteIn 0.1s var(--ease-out);
}

@keyframes paletteIn {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.palette-input-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-surface);
}

.search-icon {
  color: var(--accent);
  flex-shrink: 0;
}

.palette-input {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 13px;
  font-family: inherit;
  outline: none;
}

.palette-results {
  max-height: 360px;
  overflow-y: auto;
  padding: 4px;
}

.palette-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.1s;
}

.palette-item.active {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.item-icon {
  color: var(--text-muted);
  flex-shrink: 0;
}

.palette-item.active .item-icon {
  color: var(--accent);
}

.item-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.item-label {
  font-size: 12.5px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-path {
  font-size: 10.5px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-shortcut {
  font-size: 10px;
  color: var(--text-muted);
  background: var(--bg-base);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 1px 5px;
  font-family: 'JetBrains Mono', monospace;
  flex-shrink: 0;
}

.palette-empty {
  padding: 20px;
  text-align: center;
  color: var(--text-muted);
  font-size: 12px;
}
</style>
