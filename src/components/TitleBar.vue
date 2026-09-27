<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { 
  Undo2, Redo2, Search, Menu,
  PanelLeft, PanelRight, SquareCode, ArrowLeftRight
} from 'lucide-vue-next'

defineProps<{ 
  projectName?: string
  showSidebar?: boolean
  showEditor?: boolean
  showTerminal?: boolean
  showPreview?: boolean
  isPreviewSwapped?: boolean
}>()

const emit = defineEmits<{
  'open-folder': []
  'create-project': []
  'close-folder': []
  'open-bib': []
  'save-file': []
  'reveal-in-explorer': []
  'toggle-sidebar': []
  'toggle-editor': []
  'toggle-terminal': []
  'toggle-preview': []
  'swap-panels': []
  'export-pdf': []
  'export-docx': []
  'open-mendeley-guide': []
  'open-skills-store': []
  'open-validator': []
  'nav-back': []
  'nav-forward': []
  'editor-undo': []
  'editor-redo': []
  'editor-cut': []
  'editor-copy': []
  'editor-paste': []
  'editor-select-all': []
  'editor-find': []
  'open-palette': []
}>()

const isMaximized = ref(false)
let unlistenMaximized: (() => void) | null = null

onMounted(async () => {
  if (window.electronAPI?.isMaximized) {
    isMaximized.value = await window.electronAPI.isMaximized()
  }
  if (window.electronAPI?.onMaximizedChange) {
    unlistenMaximized = window.electronAPI.onMaximizedChange((isMax) => {
      isMaximized.value = isMax
    })
  }
})

onBeforeUnmount(() => {
  if (unlistenMaximized) unlistenMaximized()
})

function minimize() { window.electronAPI?.minimize() }
function maximize() { window.electronAPI?.maximize() }
function close()    { window.electronAPI?.close() }

const activeMenu = ref<string | null>(null)
const showMenubar = ref(true)

function toggleMenubar() {
  showMenubar.value = !showMenubar.value
  if (!showMenubar.value) {
    activeMenu.value = null
  }
}

interface MenuItem {
  label: string
  action?: string
  shortcut?: string
}

interface MenuGroup {
  label: string
  items: MenuItem[]
}

const menus: MenuGroup[] = [
  {
    label: 'File',
    items: [
      { label: 'New GLD Project...', action: 'create-project', shortcut: 'Ctrl+N' },
      { label: 'Open Folder...', action: 'open-folder', shortcut: 'Ctrl+O' },
      { label: 'Save', action: 'save-file', shortcut: 'Ctrl+S' },
      { label: 'Reveal in File Explorer', action: 'reveal-in-explorer', shortcut: 'Shift+Alt+R' },
      { label: 'Open Bibliography', action: 'open-bib' },
      { label: 'Close Folder', action: 'close-folder' },
      { label: '—' },
      { label: 'Exit', action: 'exit' }
    ]
  },
  {
    label: 'Edit',
    items: [
      { label: 'Undo', action: 'undo', shortcut: 'Ctrl+Z' },
      { label: 'Redo', action: 'redo', shortcut: 'Ctrl+Y' },
      { label: '—' },
      { label: 'Cut', action: 'cut', shortcut: 'Ctrl+X' },
      { label: 'Copy', action: 'copy', shortcut: 'Ctrl+C' },
      { label: 'Paste', action: 'paste', shortcut: 'Ctrl+V' },
      { label: '—' },
      { label: 'Find', action: 'find', shortcut: 'Ctrl+F' }
    ]
  },
  {
    label: 'Selection',
    items: [
      { label: 'Select All', action: 'select-all', shortcut: 'Ctrl+A' }
    ]
  },
  {
    label: 'View',
    items: [
      { label: 'Toggle Primary Side Bar', action: 'toggle-sidebar', shortcut: 'Ctrl+B' },
      { label: 'Toggle PDF Live Preview', action: 'toggle-preview', shortcut: 'Ctrl+P' },
      { label: 'Swap Editor & Preview Position', action: 'swap-panels', shortcut: 'Ctrl+Shift+X' },
      { label: 'Open in External Terminal', action: 'open-terminal', shortcut: 'Ctrl+`' }
    ]
  },
  {
    label: 'Run',
    items: [
      { label: 'Export PDF...', action: 'export-pdf', shortcut: 'Ctrl+Shift+E' },
      { label: 'Export Docx', action: 'export-docx', shortcut: 'Ctrl+Shift+W' },
      { label: '—' },
      { label: 'Validate Project', action: 'open-validator' }
    ]
  },
  {
    label: 'Extensions',
    items: [
      { label: 'Extensions & Plugins Hub...', action: 'open-skills-store' },
      { label: 'Mendeley Integration Guide', action: 'open-mendeley-guide' }
    ]
  }
]

function toggleMenu(label: string) {
  activeMenu.value = activeMenu.value === label ? null : label
}

function closeMenu() {
  activeMenu.value = null
}

function handleItemClick(item: MenuItem) {
  closeMenu()
  if (!item.action) return

  switch (item.action) {
    case 'open-folder':
      emit('open-folder')
      break
    case 'create-project':
      emit('create-project')
      break
    case 'close-folder':
      emit('close-folder')
      break
    case 'open-bib':
      emit('open-bib')
      break
    case 'save-file':
      emit('save-file')
      break
    case 'reveal-in-explorer':
      emit('reveal-in-explorer')
      break
    case 'toggle-sidebar':
      emit('toggle-sidebar')
      break
    case 'toggle-terminal':
    case 'open-terminal':
      emit('toggle-terminal')
      break
    case 'toggle-preview':
      emit('toggle-preview')
      break
    case 'swap-panels':
      emit('swap-panels')
      break
    case 'export-pdf':
      emit('export-pdf')
      break
    case 'export-docx':
      emit('export-docx')
      break
    case 'open-mendeley-guide':
      emit('open-mendeley-guide')
      break
    case 'open-skills-store':
      emit('open-skills-store')
      break
    case 'open-validator':
      emit('open-validator')
      break
    case 'undo':
      emit('editor-undo')
      break
    case 'redo':
      emit('editor-redo')
      break
    case 'cut':
      emit('editor-cut')
      break
    case 'copy':
      emit('editor-copy')
      break
    case 'paste':
      emit('editor-paste')
      break
    case 'select-all':
      emit('editor-select-all')
      break
    case 'find':
      emit('editor-find')
      break
    case 'exit':
      close()
      break
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    if (!target.closest('.menubar')) {
      closeMenu()
    }
  })
}
</script>

<template>
  <div class="titlebar">
    <!-- Left: App Logo + Burger Menu Toggle + Horizontal Menu Bar -->
    <div class="titlebar-left">
      <!-- App Logo Image -->
      <div class="titlebar-logo-container">
        <img src="/GlideIcon.png" alt="Glide" class="titlebar-logo-img" />
      </div>

      <!-- Burger Toggle Button (Show/Hide Horizontal Menubar) -->
      <button 
        class="burger-btn titlebar-drag-exclude" 
        :class="{ active: showMenubar }"
        @click="toggleMenubar"
        title="Toggle Main Menu Bar"
      >
        <Menu :size="15" />
      </button>

      <!-- Horizontal Menu Bar (Click-only Toggle) -->
      <nav v-show="showMenubar" class="menubar">
        <div
          v-for="menu in menus"
          :key="menu.label"
          class="menu-item"
          :class="{ active: activeMenu === menu.label }"
          @click.stop="toggleMenu(menu.label)"
        >
          <span>{{ menu.label }}</span>

          <!-- Dropdown -->
          <div v-if="activeMenu === menu.label" class="menu-dropdown" @click.stop>
            <template v-for="item in menu.items" :key="item.label">
              <div v-if="item.label === '—'" class="menu-separator" />
              <button v-else class="menu-dropdown-item" @click="handleItemClick(item)">
                <span>{{ item.label }}</span>
                <span v-if="item.shortcut" class="menu-item-shortcut">{{ item.shortcut }}</span>
              </button>
            </template>
          </div>
        </div>
      </nav>
    </div>

    <!-- Center: Undo/Redo + Search/Command Bar -->
    <div class="titlebar-center titlebar-drag-exclude">
      <button class="nav-btn" title="Undo (Ctrl+Z)" @click="emit('editor-undo')">
        <Undo2 :size="14" />
      </button>
      <button class="nav-btn" title="Redo (Ctrl+Y)" @click="emit('editor-redo')">
        <Redo2 :size="14" />
      </button>

      <div class="command-bar titlebar-drag-exclude" @click="emit('open-palette')">
        <Search :size="12" class="command-bar-icon" />
        <span class="command-bar-text">{{ projectName || 'Cari file atau ketik > command...' }}</span>
        <kbd class="command-bar-hint">Ctrl+P</kbd>
      </div>
    </div>

    <!-- Right: Layout buttons + Window Controls -->
    <div class="titlebar-right titlebar-drag-exclude">
      <!-- Layout toggle buttons -->
      <div class="layout-buttons">
        <button 
          class="layout-btn" 
          :class="{ active: showSidebar }" 
          @click="emit('toggle-sidebar')" 
          title="Toggle Primary Side Bar (Ctrl+B)"
        >
          <PanelLeft :size="15" />
        </button>
        <button 
          class="layout-btn" 
          :class="{ active: showEditor }" 
          @click="emit('toggle-editor')" 
          title="Toggle Code Editor (Agent Mode View)"
        >
          <SquareCode :size="15" />
        </button>
        <button 
          class="layout-btn" 
          :class="{ active: showPreview }" 
          @click="emit('toggle-preview')" 
          title="Toggle PDF Live Preview (Ctrl+P)"
        >
          <PanelRight :size="15" />
        </button>
        <button 
          class="layout-btn" 
          :class="{ active: isPreviewSwapped }" 
          @click="emit('swap-panels')" 
          :title="isPreviewSwapped ? 'Swap Panels: Move Code Editor to Left, Preview to Right' : 'Swap Panels: Move Preview to Center/Left, Code Editor to Right'"
        >
          <ArrowLeftRight :size="14" />
        </button>
      </div>

      <!-- Divider -->
      <div class="titlebar-divider" />

      <!-- Window controls -->
      <div class="window-controls">
        <button class="ctrl-btn minimize" @click="minimize" title="Minimize">
          <svg width="11" height="1" viewBox="0 0 11 1">
            <rect width="11" height="1" fill="currentColor"/>
          </svg>
        </button>
        <button class="ctrl-btn maximize" @click="maximize" :title="isMaximized ? 'Restore Down' : 'Maximize'">
          <!-- Restore Icon (2 overlapping squares saat isMaximized) -->
          <svg v-if="isMaximized" width="10" height="10" viewBox="0 0 10 10">
            <path d="M2.5 2.5V0.5H9.5V7.5H7.5" fill="none" stroke="currentColor" stroke-width="1"/>
            <rect x="0.5" y="2.5" width="7" height="7" fill="none" stroke="currentColor" stroke-width="1"/>
          </svg>
          <!-- Maximize Icon (1 square saat normal windowed) -->
          <svg v-else width="10" height="10" viewBox="0 0 10 10">
            <rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1"/>
          </svg>
        </button>
        <button class="ctrl-btn close" @click="close" title="Close">
          <svg width="11" height="11" viewBox="0 0 11 11">
            <line x1="0.5" y1="0.5" x2="10.5" y2="10.5" stroke="currentColor" stroke-width="1.2"/>
            <line x1="10.5" y1="0.5" x2="0.5" y2="10.5" stroke="currentColor" stroke-width="1.2"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.titlebar {
  height: 30px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: stretch;
  flex-shrink: 0;
  user-select: none;
  -webkit-app-region: drag;
  position: relative;
  z-index: 100;
}

/* ── Left ────────────────────────── */
.titlebar-left {
  display: flex;
  align-items: center;
  -webkit-app-region: no-drag;
  flex-shrink: 0;
}

.burger-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.15s, color 0.15s;
  margin-left: 4px;
  margin-right: 4px;
}
.burger-btn:hover, .burger-btn.active {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.titlebar-logo-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-left: 8px;
  padding-right: 2px;
  height: 100%;
}

.titlebar-logo-img {
  width: 18px;
  height: 18px;
  object-fit: contain;
  border-radius: 3px;
}

/* Menu bar */
.menubar {
  display: flex;
  align-items: stretch;
  height: 100%;
}
.menu-item {
  position: relative;
  display: flex;
  align-items: center;
  padding: 0 8px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.1s, color 0.1s;
  height: 100%;
}
.menu-item:hover,
.menu-item.active {
  background: var(--bg-hover);
  color: var(--text-primary);
}

/* Dropdown */
.menu-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 200px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 6px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  padding: 4px;
  z-index: 1000;
  animation: menuIn 0.1s var(--ease-out);
}
@keyframes menuIn {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.menu-dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 6px 10px;
  text-align: left;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.1s;
}
.menu-dropdown-item:hover { background: var(--bg-hover); color: var(--accent); }
.menu-item-shortcut {
  font-size: 10px;
  color: var(--text-muted);
  font-family: 'JetBrains Mono', monospace;
}
.menu-separator {
  height: 1px;
  background: var(--border);
  margin: 3px 6px;
}

/* ── Center ──────────────────────── */
.titlebar-center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0 8px;
  -webkit-app-region: no-drag;
  max-width: 640px;
  margin: 0 auto;
}
.nav-btn {
  width: 26px; height: 26px;
  border: none; background: transparent;
  color: var(--text-muted);
  border-radius: 5px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.15s, color 0.15s;
  flex-shrink: 0;
}
.nav-btn:hover { background: var(--bg-hover); color: var(--text-primary); }

/* Command / Search bar */
.command-bar {
  flex: 1;
  height: 22px;
  background: var(--bg-base);
  border: 1px solid var(--border);
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  max-width: 520px;
}
.command-bar:hover {
  border-color: var(--border-focus);
  background: var(--bg-elevated);
}
.command-bar-icon { color: var(--text-muted); flex-shrink: 0; }
.command-bar-text {
  flex: 1;
  font-size: 12px;
  color: var(--text-secondary);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.command-bar-hint {
  font-size: 10px;
  color: var(--text-muted);
  background: var(--bg-overlay);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 1px 5px;
  font-family: 'JetBrains Mono', monospace;
  flex-shrink: 0;
}

/* ── Right ───────────────────────── */
.titlebar-right {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  -webkit-app-region: no-drag;
  gap: 2px;
  padding-left: 8px;
}

.layout-buttons {
  display: flex;
  align-items: center;
}
.layout-btn {
  width: 30px; height: 26px;
  border: none; background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.15s, color 0.15s;
  border-radius: 4px;
}
.layout-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
.layout-btn.active { color: var(--accent); background: var(--accent-soft); }

.titlebar-divider {
  width: 1px;
  height: 16px;
  background: var(--border);
  margin: 0 4px;
}

/* Window controls */
.window-controls {
  display: flex;
  align-items: stretch;
  height: 100%;
}
.ctrl-btn {
  width: 46px;
  height: 100%;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s;
}
.ctrl-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
.ctrl-btn.close:hover { background: #c42b1c; color: #fff; }
</style>
