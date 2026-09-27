<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { 
  FolderOpen, FileText, ChevronRight, ChevronDown,
  RefreshCw, FilePlus, FolderPlus, Settings2, BookMarked
} from 'lucide-vue-next'

export interface FileNode {
  name: string
  path: string
  type: 'file' | 'dir'
  children?: FileNode[]
  expanded?: boolean
}

const props = defineProps<{
  projectPath?: string
  tree?: FileNode[]
  activeFile?: string
  showHidden?: boolean
}>()

const emit = defineEmits<{
  'preview-file': [path: string]
  'open-file': [path: string]
  'open-folder': []
  'refresh': []
  'toggle-hidden': []
  'create-file': [fullPath: string]
  'create-folder': [fullPath: string]
  'delete-item': [path: string]
  'rename-item': [oldPath: string, newPath: string]
  'move-item': [srcPath: string, destDir: string]
  'upload-image': [targetDir: string, files: FileList]
  'open-config': []
  'open-bib': []
}>()

const expandedDirs = ref<Set<string>>(new Set())
const dragOverDirPath = ref<string | null>(null)

// ── Multi-selection State (Shift + Click & Ctrl/Cmd + Click) ──
const selectedPaths = ref<Set<string>>(new Set())
const lastSelectedPath = ref<string | null>(null)

// Flatten visible tree nodes to calculate range for Shift + Click
function getFlattenedVisibleNodes(): string[] {
  const list: string[] = []
  function traverse(nodes?: FileNode[]) {
    if (!nodes) return
    for (const n of nodes) {
      list.push(n.path)
      if (n.type === 'dir' && expandedDirs.value.has(n.path) && n.children) {
        traverse(n.children)
      }
    }
  }
  traverse(props.tree)
  return list
}

function handleNodeClick(e: MouseEvent, node: FileNode) {
  const path = node.path

  if (e.shiftKey && lastSelectedPath.value) {
    // Shift + Click: Range Selection
    const visibleList = getFlattenedVisibleNodes()
    const fromIdx = visibleList.indexOf(lastSelectedPath.value)
    const toIdx = visibleList.indexOf(path)

    if (fromIdx !== -1 && toIdx !== -1) {
      const start = Math.min(fromIdx, toIdx)
      const end = Math.max(fromIdx, toIdx)
      const range = visibleList.slice(start, end + 1)

      // Pertahankan seleksi awal atau buat seleksi range baru
      selectedPaths.value = new Set(range)
    } else {
      selectedPaths.value.add(path)
      lastSelectedPath.value = path
    }
  } else if (e.ctrlKey || e.metaKey) {
    // Ctrl / Cmd + Click: Toggle individual selection
    if (selectedPaths.value.has(path)) {
      selectedPaths.value.delete(path)
    } else {
      selectedPaths.value.add(path)
      lastSelectedPath.value = path
    }
  } else {
    // Regular Click: Single selection
    selectedPaths.value = new Set([path])
    lastSelectedPath.value = path
    if (node.type === 'dir') {
      toggleDir(node)
    } else {
      emit('preview-file', path)
    }
  }
}

const createInputRef = ref<HTMLInputElement | null>(null)

// Inline create state
const creatingItem = ref<{
  targetDir: string
  type: 'file' | 'dir'
  name: string
} | null>(null)

// Inline rename state
const renamingItem = ref<{
  path: string
  name: string
} | null>(null)

// Context Menu State
const contextMenu = ref<{
  show: boolean
  x: number
  y: number
  node: FileNode | null
}>({
  show: false,
  x: 0,
  y: 0,
  node: null
})

const isDraggingOver = ref(false)

function toggleDir(node: FileNode) {
  if (expandedDirs.value.has(node.path)) {
    expandedDirs.value.delete(node.path)
  } else {
    expandedDirs.value.add(node.path)
  }
}

function getFileIconMeta(name: string) {
  const lower = name.toLowerCase()
  if (lower.endsWith('.typ')) return { name: 'article', class: 'mat-icon-typst' }
  if (lower.endsWith('.md')) return { name: 'edit_note', class: 'mat-icon-markdown' }
  if (lower.endsWith('.yaml') || lower.endsWith('.yml')) return { name: 'settings', class: 'mat-icon-config' }
  if (lower.endsWith('.json')) return { name: 'data_object', class: 'mat-icon-json' }
  if (lower.endsWith('.pdf')) return { name: 'picture_as_pdf', class: 'mat-icon-pdf' }
  if (lower.endsWith('.bib')) return { name: 'menu_book', class: 'mat-icon-bib' }
  if (['.py', '.js', '.ts', '.jsx', '.tsx', '.html', '.css', '.rs', '.cpp', '.c'].some(ext => lower.endsWith(ext))) {
    return { name: 'code', class: 'mat-icon-code' }
  }
  if (['.sh', '.bat', '.ps1', '.bash'].some(ext => lower.endsWith(ext))) {
    return { name: 'terminal', class: 'mat-icon-typst' }
  }
  if (['.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif'].some(ext => lower.endsWith(ext))) {
    return { name: 'image', class: 'mat-icon-image' }
  }
  if (['.mp4', '.webm', '.mov'].some(ext => lower.endsWith(ext))) {
    return { name: 'movie', class: 'mat-icon-code' }
  }
  return { name: 'description', class: 'mat-icon-default' }
}

function startCreating(targetPath: string, type: 'file' | 'dir') {
  let targetDir = targetPath || props.projectPath || ''
  
  if (targetPath && targetPath.includes('.')) {
    const parts = targetPath.split(/[\\/]/)
    if (parts[parts.length - 1].includes('.')) {
      targetDir = parts.slice(0, -1).join('/')
    }
  }

  creatingItem.value = {
    targetDir,
    type,
    name: ''
  }
  if (targetDir) expandedDirs.value.add(targetDir)
  nextTick(() => {
    createInputRef.value?.focus()
  })
}

function submitCreate() {
  if (!creatingItem.value) return
  const { targetDir, type, name } = creatingItem.value
  const trimmed = name.trim()
  creatingItem.value = null

  if (trimmed) {
    const fullPath = `${targetDir}/${trimmed}`
    if (type === 'file') {
      emit('create-file', fullPath)
    } else {
      emit('create-folder', fullPath)
    }
  }
}

function cancelCreate() {
  creatingItem.value = null
}

function startRenaming(node: FileNode) {
  renamingItem.value = {
    path: node.path,
    name: node.name
  }
}

function submitRename() {
  if (!renamingItem.value) return
  const { path: oldPath, name } = renamingItem.value
  const trimmed = name.trim()
  renamingItem.value = null

  if (trimmed && trimmed !== oldPath.split(/[\\/]/).pop()) {
    const parentDir = oldPath.split(/[\\/]/).slice(0, -1).join('/')
    const newPath = `${parentDir}/${trimmed}`
    emit('rename-item', oldPath, newPath)
  }
}

function cancelRename() {
  renamingItem.value = null
}

function onContextMenu(e: MouseEvent, node: FileNode | null) {
  e.preventDefault()
  e.stopPropagation()

  if (node) {
    // Jika node yang di-klik kanan belum ada di kumpulan seleksi, jadikan dia satu-satunya yang terseleksi
    if (!selectedPaths.value.has(node.path)) {
      selectedPaths.value = new Set([node.path])
      lastSelectedPath.value = node.path
    }
  } else {
    // Klik kanan di area kosong
    selectedPaths.value.clear()
    lastSelectedPath.value = null
  }

  // Dynamic viewport clamping: jika klik di dekat batas bawah atau kanan, posisikan popup agar naik ke atas / ke kiri
  const isMulti = selectedPaths.value.size > 1
  const menuHeight = node ? (isMulti ? 140 : 280) : 160 // perkiraan tinggi menu adaptif
  const menuWidth = 200 // perkiraan lebar menu
  const viewportHeight = window.innerHeight
  const viewportWidth = window.innerWidth

  let posX = e.clientX
  let posY = e.clientY

  if (posY + menuHeight > viewportHeight - 10) {
    posY = Math.max(10, posY - menuHeight)
  }

  if (posX + menuWidth > viewportWidth - 10) {
    posX = Math.max(10, viewportWidth - menuWidth - 10)
  }

  contextMenu.value = {
    show: true,
    x: posX,
    y: posY,
    node
  }
}

function closeContextMenu() {
  contextMenu.value.show = false
}

function isImageFile(fileName: string): boolean {
  if (!fileName) return false
  const lower = fileName.toLowerCase()
  return ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'].some(ext => lower.endsWith(ext))
}

async function copyGlideFigureTag() {
  const node = contextMenu.value.node
  if (!node) return

  let relPath = node.path
  if (props.projectPath) {
    const normalizedPath = node.path.replace(/\\/g, '/')
    const normalizedRoot = props.projectPath.replace(/\\/g, '/').replace(/\/$/, '')
    if (normalizedPath.startsWith(`${normalizedRoot}/`)) {
      relPath = normalizedPath.slice(normalizedRoot.length + 1)
    }
  }

  // Ambil nama file tanpa ekstensi untuk dijadikan caption
  const rawName = node.name.split('.')[0].replace(/[-_]/g, ' ')
  const caption = rawName.charAt(0).toUpperCase() + rawName.slice(1)

  const figureTag = `#glide-figure("${relPath}", [${caption}], width: 70%)`

  await navigator.clipboard.writeText(figureTag)
  closeContextMenu()
}

async function copyNodePath(relative = false) {
  const node = contextMenu.value.node
  if (!node) return

  const fullPath = node.path
  let value = fullPath
  const root = props.projectPath

  if (relative && root) {
    const normalizedPath = fullPath.replace(/\\/g, '/')
    const normalizedRoot = root.replace(/\\/g, '/').replace(/\/$/, '')
    if (normalizedPath === normalizedRoot) {
      value = '.'
    } else if (normalizedPath.startsWith(`${normalizedRoot}/`)) {
      value = normalizedPath.slice(normalizedRoot.length + 1)
    }
  }

  await navigator.clipboard.writeText(value)
  closeContextMenu()
}

async function copyProjectPath() {
  if (!props.projectPath) return
  await navigator.clipboard.writeText(props.projectPath)
  closeContextMenu()
}

async function copyMultiplePaths() {
  if (selectedPaths.value.size === 0) return
  const lines = Array.from(selectedPaths.value).join('\n')
  await navigator.clipboard.writeText(lines)
  closeContextMenu()
}

async function revealInExplorer(path?: string) {
  const targetPath = path || contextMenu.value.node?.path || props.projectPath
  if (targetPath && window.electronAPI?.showItemInFolder) {
    await window.electronAPI.showItemInFolder(targetPath)
  }
  closeContextMenu()
}

if (typeof window !== 'undefined') {
  window.addEventListener('click', closeContextMenu)
}

function handleContextAction(action: 'new-file' | 'new-folder' | 'rename' | 'delete' | 'upload') {
  const targetNode = contextMenu.value.node
  let baseDir = props.projectPath || ''
  
  if (targetNode) {
    if (targetNode.type === 'dir') {
      baseDir = targetNode.path
    } else {
      baseDir = targetNode.path.split(/[\\/]/).slice(0, -1).join('/')
    }
  }

  const isMulti = selectedPaths.value.size > 1
  const pathsToDelete = Array.from(selectedPaths.value)

  closeContextMenu()

  if (action === 'new-file') startCreating(baseDir, 'file')
  if (action === 'new-folder') startCreating(baseDir, 'dir')
  if (action === 'rename' && targetNode && !isMulti) startRenaming(targetNode)
  if (action === 'delete') {
    if (isMulti) {
      pathsToDelete.forEach(p => emit('delete-item', p))
      selectedPaths.value.clear()
    } else if (targetNode) {
      emit('delete-item', targetNode.path)
    }
  }
  if (action === 'upload') triggerImageUploadPicker(baseDir)
}

function triggerImageUploadPicker(targetDir: string) {
  const input = document.createElement('input')
  input.type = 'file'
  input.multiple = true
  input.accept = 'image/*'
  input.onchange = (e: any) => {
    if (e.target.files && e.target.files.length > 0) {
      emit('upload-image', targetDir, e.target.files)
    }
  }
  input.click()
}

// ── Drag & Drop Handlers (Internal & External File/Folder Drops) ──
function onRootDragOver(e: DragEvent) {
  e.preventDefault()
  if (e.dataTransfer) {
    const isInternal = e.dataTransfer.types.includes('application/glide-path')
    e.dataTransfer.dropEffect = isInternal ? 'move' : 'copy'
  }
  isDraggingOver.value = true
  if (props.projectPath) {
    dragOverDirPath.value = props.projectPath
  }
}

function onRootDragLeave(e: DragEvent) {
  e.preventDefault()
  const rect = (e.currentTarget as HTMLElement)?.getBoundingClientRect()
  if (rect) {
    if (e.clientX <= rect.left || e.clientX >= rect.right || e.clientY <= rect.top || e.clientY >= rect.bottom) {
      isDraggingOver.value = false
      if (dragOverDirPath.value === props.projectPath) {
        dragOverDirPath.value = null
      }
    }
  }
}

function onRootDrop(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  isDraggingOver.value = false
  dragOverDirPath.value = null

  // 1. Cek apakah ini pemindahan item internal (Move)
  const raw = e.dataTransfer?.getData('application/glide-path')
  if (raw && props.projectPath) {
    let paths: string[]
    try {
      const parsed = JSON.parse(raw)
      paths = Array.isArray(parsed) ? parsed : [parsed]
    } catch {
      paths = [raw]
    }
    const filtered = paths.filter(p => p !== props.projectPath && !props.projectPath!.startsWith(p + '/'))
    filtered.forEach(p => emit('move-item', p, props.projectPath!))
    selectedPaths.value.clear()
    return
  }

  // 2. Jika bukan internal, berarti upload file eksternal dari OS (Copy)
  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    const targetDir = props.projectPath || ''
    emit('upload-image', targetDir, e.dataTransfer.files)
  }
}

function onNodeDragStart(e: DragEvent, node: FileNode) {
  if (!e.dataTransfer) return

  // Jika node yang di-drag bagian dari multi-seleksi, encode semua yang terpilih
  let paths: string[]
  if (selectedPaths.value.size > 1 && selectedPaths.value.has(node.path)) {
    paths = Array.from(selectedPaths.value)
  } else {
    // Single drag: pastikan node ini jadi satu-satunya yang terseleksi
    paths = [node.path]
    selectedPaths.value = new Set([node.path])
    lastSelectedPath.value = node.path
  }

  e.dataTransfer.setData('application/glide-path', JSON.stringify(paths))
  e.dataTransfer.setData('text/plain', paths.join('\n'))
  e.dataTransfer.effectAllowed = 'move'
}

function onNodeDragOver(e: DragEvent, node: FileNode) {
  const isInternal = e.dataTransfer?.types.includes('application/glide-path')
  if (!isInternal) return

  e.preventDefault()
  e.stopPropagation()

  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
  if (node.type === 'dir') dragOverDirPath.value = node.path
}

function onNodeDragLeave(_e: DragEvent, node: FileNode) {
  if (dragOverDirPath.value === node.path) dragOverDirPath.value = null
}

function onNodeDrop(e: DragEvent, node: FileNode) {
  const raw = e.dataTransfer?.getData('application/glide-path')
  if (!raw) return

  e.preventDefault()
  e.stopPropagation()
  dragOverDirPath.value = null
  isDraggingOver.value = false

  const targetDir = node.type === 'dir'
    ? node.path
    : node.path.replace(/[\\/][^\\/]+$/, '')

  // Decode: bisa single string path (lama) atau JSON array
  let paths: string[]
  try {
    const parsed = JSON.parse(raw)
    paths = Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    paths = [raw]
  }

  // Jangan pindahkan folder ke dalam dirinya sendiri
  const filtered = paths.filter(p => !targetDir.startsWith(p + '/') && p !== targetDir)
  filtered.forEach(p => emit('move-item', p, targetDir))

  // Clear seleksi setelah pindah
  selectedPaths.value.clear()
}
</script>

<template>
  <aside 
    class="file-explorer" 
    :class="{ 'drag-over': isDraggingOver }"
    @dragover="onRootDragOver"
    @dragleave="onRootDragLeave"
    @drop="onRootDrop"
    @contextmenu.prevent="onContextMenu($event, null)"
  >
    <!-- Header -->
    <div class="explorer-header">
      <span class="explorer-title">EXPLORER</span>
      <div class="explorer-actions">
        <!-- Quick Config -->
        <button class="icon-btn" @click="emit('open-config')" title="Konfigurasi Dokumen (config.yaml)">
          <Settings2 :size="14" />
        </button>

        <!-- Quick Bib -->
        <button class="icon-btn" @click="emit('open-bib')" title="Daftar Pustaka (bibliography.yaml)">
          <BookMarked :size="14" />
        </button>

        <button class="icon-btn" @click="startCreating(activeFile || projectPath || '', 'file')" title="New File">
          <FilePlus :size="14" />
        </button>
        <button class="icon-btn" @click="startCreating(activeFile || projectPath || '', 'dir')" title="New Folder">
          <FolderPlus :size="14" />
        </button>
        <button class="icon-btn" @click="emit('refresh')" title="Refresh">
          <RefreshCw :size="14" />
        </button>
      </div>
    </div>

    <!-- No project open -->
    <div v-if="!projectPath" class="no-project">
      <div class="no-project-icon">
        <FolderOpen :size="36" />
      </div>
      <p>Tidak ada project terbuka</p>
      <button class="open-btn" @click="emit('open-folder')">
        <FolderOpen :size="14" />
        Buka Folder...
      </button>
    </div>

    <!-- File tree -->
    <div 
      v-else 
      class="tree-container"
      @dragover="onRootDragOver"
      @drop="onRootDrop"
    >
      <div 
        class="project-root" 
        :class="{ 'drag-target-dir': dragOverDirPath === projectPath }"
        @dragover.stop="onRootDragOver"
        @drop.stop="onRootDrop"
        @contextmenu.stop="onContextMenu($event, null)"
      >
        <FolderOpen :size="14" class="folder-icon" />
        <span class="project-name">{{ projectPath.split(/[\\/]/).pop() }}</span>
      </div>
      <div class="tree">
        <!-- Root inline creation -->
        <div 
          v-if="creatingItem && creatingItem.targetDir === projectPath" 
          class="inline-create-row"
        >
          <FolderOpen v-if="creatingItem.type === 'dir'" :size="14" class="folder-icon" />
          <FileText v-else :size="14" style="color: var(--accent);" />
          <input 
            ref="createInputRef"
            v-model="creatingItem.name"
            class="inline-create-input"
            :placeholder="creatingItem.type === 'dir' ? 'Nama Folder...' : 'Nama File... (contoh: bab1.typ)'"
            @keydown.enter="submitCreate"
            @keydown.esc="cancelCreate"
            @blur="submitCreate"
          />
        </div>

        <template v-if="tree && tree.length > 0">
          <TreeNode 
            v-for="node in tree" 
            :key="node.path" 
            :node="node"
            :active-file="activeFile"
            :expanded-dirs="expandedDirs"
            :selected-paths="selectedPaths"
            :creating-item="creatingItem"
            :renaming-item="renamingItem"
            :drag-over-dir-path="dragOverDirPath"
            @node-click="handleNodeClick"
            @open-file="emit('open-file', $event)"
            @context-menu="onContextMenu"
            @submit-create="submitCreate"
            @cancel-create="cancelCreate"
            @submit-rename="submitRename"
            @cancel-rename="cancelRename"
            @node-drag-start="onNodeDragStart"
            @node-drag-over="onNodeDragOver"
            @node-drag-leave="onNodeDragLeave"
            @node-drop="onNodeDrop"
            :get-file-icon-meta="getFileIconMeta"
          />
        </template>
        <div v-else-if="!creatingItem" class="empty-dir">
          <span>Folder kosong</span>
        </div>
      </div>
    </div>

    <!-- Context Menu Dropdown (Clean Text-Only with Keyboard Shortcuts) -->
    <div 
      v-if="contextMenu.show" 
      class="context-menu" 
      :style="{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }"
      @click.stop
    >
      <!-- Mode Multi-Selection (Jika > 1 file/folder terseleksi) -->
      <template v-if="selectedPaths.size > 1">
        <button class="context-item" @click="revealInExplorer(Array.from(selectedPaths)[0])">
          <span class="context-label">Reveal in File Explorer</span>
          <span class="context-shortcut">Shift+Alt+R</span>
        </button>
        <button class="context-item" @click="copyMultiplePaths">
          <span class="context-label">Copy Paths ({{ selectedPaths.size }} items)</span>
        </button>
        <div class="context-divider"></div>
        <button class="context-item danger" @click="handleContextAction('delete')">
          <span class="context-label">Delete {{ selectedPaths.size }} Items</span>
          <span class="context-shortcut">Delete</span>
        </button>
      </template>

      <!-- Mode Single Selection / Context Normal -->
      <template v-else>
        <button class="context-item" @click="handleContextAction('new-file')">
          <span class="context-label">New File...</span>
        </button>
        <button class="context-item" @click="handleContextAction('new-folder')">
          <span class="context-label">New Folder...</span>
        </button>
        <button class="context-item" @click="handleContextAction('upload')">
          <span class="context-label">Upload Image...</span>
        </button>

        <div class="context-divider"></div>

        <button v-if="projectPath && !contextMenu.node" class="context-item" @click="revealInExplorer(projectPath)">
          <span class="context-label">Reveal in File Explorer</span>
          <span class="context-shortcut">Shift+Alt+R</span>
        </button>
        <button v-if="projectPath" class="context-item" @click="copyProjectPath">
          <span class="context-label">Copy Project Path</span>
        </button>
        <button class="context-item" @click="emit('toggle-hidden'); closeContextMenu()">
          <span class="context-label">{{ showHidden ? 'Hide Hidden Files' : 'Show Hidden Files' }}</span>
          <span class="context-shortcut">{{ showHidden ? '✓' : '' }}</span>
        </button>

        <template v-if="contextMenu.node">
          <div class="context-divider"></div>
          <button class="context-item" @click="revealInExplorer(contextMenu.node.path)">
            <span class="context-label">Reveal in File Explorer</span>
            <span class="context-shortcut">Shift+Alt+R</span>
          </button>
          <button v-if="contextMenu.node.type === 'file' && isImageFile(contextMenu.node.name)" class="context-item" @click="copyGlideFigureTag">
            <span class="context-label">Copy Glide Figure Tag</span>
          </button>
          <button class="context-item" @click="copyNodePath(false)">
            <span class="context-label">{{ contextMenu.node.type === 'dir' ? 'Copy Folder Path' : 'Copy Path' }}</span>
            <span class="context-shortcut">Shift+Alt+C</span>
          </button>
          <button class="context-item" @click="copyNodePath(true)">
            <span class="context-label">{{ contextMenu.node.type === 'dir' ? 'Copy Folder Relative Path' : 'Copy Relative Path' }}</span>
          </button>

          <div class="context-divider"></div>

          <button class="context-item" @click="handleContextAction('rename')">
            <span class="context-label">Rename...</span>
            <span class="context-shortcut">F2</span>
          </button>
          <button class="context-item danger" @click="handleContextAction('delete')">
            <span class="context-label">Delete</span>
            <span class="context-shortcut">Delete</span>
          </button>
        </template>
      </template>
    </div>
  </aside>
</template>

<script lang="ts">
import { defineComponent, h } from 'vue'
export const TreeNode = defineComponent({
  name: 'TreeNode',
  props: ['node', 'activeFile', 'expandedDirs', 'selectedPaths', 'getFileIconMeta', 'creatingItem', 'renamingItem', 'dragOverDirPath'],
  emits: [
    'node-click', 'open-file', 'context-menu', 
    'submit-create', 'cancel-create', 'submit-rename', 'cancel-rename',
    'node-drag-start', 'node-drag-over', 'node-drag-leave', 'node-drop'
  ],
  setup(props, { emit }) {
    return () => {
      const node = props.node
      const isDir = node.type === 'dir'
      const isExpanded = props.expandedDirs.has(node.path)
      const isSelected = props.selectedPaths && props.selectedPaths.has(node.path)
      const isActive = props.activeFile === node.path || isSelected
      const isRenaming = props.renamingItem && props.renamingItem.path === node.path
      const isDragTarget = props.dragOverDirPath === node.path

      const chevronIcon = isDir
        ? (isExpanded ? h(ChevronDown, { size: 12, class: 'chevron-icon' }) : h(ChevronRight, { size: 12, class: 'chevron-icon' }))
        : null

      let label
      if (isRenaming) {
        const meta = !isDir ? props.getFileIconMeta(node.name) : null
        const icon = isDir ? h(FolderOpen, { size: 14, class: 'folder-icon' }) : h(meta.icon, { size: 14, style: { color: meta.color } })
        
        label = h('div', { class: 'inline-create-row' }, [
          icon,
          h('input', {
            class: 'inline-create-input',
            autofocus: true,
            value: props.renamingItem.name,
            onInput: (e: any) => { props.renamingItem.name = e.target.value },
            onKeydown: (e: KeyboardEvent) => {
              if (e.key === 'Enter') emit('submit-rename')
              if (e.key === 'Escape') emit('cancel-rename')
            },
            onBlur: () => emit('submit-rename')
          })
        ])
      } else if (isDir) {
        const folderIcon = h('span', { class: 'g-material-icon', style: { color: '#60a5fa', fontSize: '15px', marginRight: '3px' } }, isExpanded ? 'folder_open' : 'folder')
        label = h('span', { class: 'node-label' }, [
          chevronIcon,
          folderIcon,
          h('span', { class: 'folder-name' }, node.name)
        ])
      } else {
        const meta = props.getFileIconMeta(node.name)
        const fileIcon = h('span', { class: ['g-material-icon', meta.class] }, meta.name)

        label = h('span', { class: 'node-label' }, [
          fileIcon,
          h('span', { class: 'file-name' }, node.name)
        ])
      }

      const self = h('div', {
        class: [
          'tree-node', 
          isDir ? 'is-dir' : 'is-file', 
          isActive ? 'active' : '',
          isDragTarget ? 'drag-target-dir' : ''
        ],
        draggable: !isRenaming,
        onDragstart: (e: DragEvent) => emit('node-drag-start', e, node),
        onDragover: (e: DragEvent) => emit('node-drag-over', e, node),
        onDragleave: (e: DragEvent) => emit('node-drag-leave', e, node),
        onDrop: (e: DragEvent) => emit('node-drop', e, node),
        onClick: (e: MouseEvent) => {
          if (!isRenaming) {
            emit('node-click', e, node)
          }
        },
        onDblclick: () => {
          if (!isDir && !isRenaming) emit('open-file', node.path)
        },
        onContextmenu: (e: MouseEvent) => {
          emit('context-menu', e, node)
        }
      }, label)

      const childrenNodes: any[] = []

      // If creating item inside this directory
      if (isDir && isExpanded) {
        if (props.creatingItem && props.creatingItem.targetDir === node.path) {
          const createIcon = props.creatingItem.type === 'dir'
            ? h(FolderOpen, { size: 14, class: 'folder-icon' })
            : h(FileText, { size: 14, style: { color: 'var(--accent)' } })

          const inlineInput = h('div', { class: 'inline-create-row' }, [
            createIcon,
            h('input', {
              class: 'inline-create-input',
              autofocus: true,
              value: props.creatingItem.name,
              placeholder: props.creatingItem.type === 'dir' ? 'Nama Folder...' : 'Nama File...',
              onInput: (e: any) => { props.creatingItem.name = e.target.value },
              onKeydown: (e: KeyboardEvent) => {
                if (e.key === 'Enter') emit('submit-create')
                if (e.key === 'Escape') emit('cancel-create')
              },
              onBlur: () => emit('submit-create')
            })
          ])
          childrenNodes.push(inlineInput)
        }

        if (node.children) {
          node.children.forEach((child: any) => {
            childrenNodes.push(h(TreeNode, {
              node: child,
              activeFile: props.activeFile,
              expandedDirs: props.expandedDirs,
              selectedPaths: props.selectedPaths,
              creatingItem: props.creatingItem,
              renamingItem: props.renamingItem,
              dragOverDirPath: props.dragOverDirPath,
              getFileIconMeta: props.getFileIconMeta,
              onNodeClick: (e: MouseEvent, n: any) => emit('node-click', e, n),
              onOpenFile: (p: string) => emit('open-file', p),
              onContextMenu: (e: MouseEvent, n: any) => emit('context-menu', e, n),
              onSubmitCreate: () => emit('submit-create'),
              onCancelCreate: () => emit('cancel-create'),
              onSubmitRename: () => emit('submit-rename'),
              onCancelRename: () => emit('cancel-rename'),
              onNodeDragStart: (e: DragEvent, n: any) => emit('node-drag-start', e, n),
              onNodeDragOver: (e: DragEvent, n: any) => emit('node-drag-over', e, n),
              onNodeDragLeave: (e: DragEvent, n: any) => emit('node-drag-leave', e, n),
              onNodeDrop: (e: DragEvent, n: any) => emit('node-drop', e, n)
            }))
          })
        }
      }

      if (isDir && isExpanded && childrenNodes.length > 0) {
        const childrenContainer = h('div', { class: 'tree-children' }, childrenNodes)
        return h('div', [self, childrenContainer])
      }

      return self
    }
  }
})
</script>

<style scoped>
.file-explorer {
  width: 100%;
  height: 100%;
  flex-shrink: 0;
  background: var(--bg-surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}
.file-explorer.drag-over {
  border: 2px dashed var(--accent);
  background: rgba(124, 106, 247, 0.05);
}
.explorer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
}
.explorer-title {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--text-muted);
}
.explorer-actions {
  display: flex;
  gap: 2px;
  opacity: 1;
  transition: opacity 0.2s;
}
.icon-btn {
  width: 22px; height: 22px;
  border: none; background: transparent;
  color: var(--text-secondary);
  border-radius: 4px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.15s, color 0.15s;
}
.icon-btn:hover { background: var(--bg-hover); color: var(--text-primary); }

/* Context Menu (VS Code style text-only with shortcuts) */
.context-menu {
  position: fixed;
  z-index: 1000;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  padding: 4px;
  min-width: 190px;
}
.context-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  padding: 5px 10px;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 11.5px;
  font-family: inherit;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.12s, color 0.12s;
  text-align: left;
}
.context-label {
  flex: 1;
  white-space: nowrap;
}
.context-shortcut {
  font-size: 10px;
  color: var(--text-muted);
  font-family: inherit;
  margin-left: auto;
  white-space: nowrap;
}
.context-item:hover {
  background: var(--accent);
  color: #ffffff;
}
.context-item:hover .context-shortcut {
  color: rgba(255, 255, 255, 0.8);
}
.context-item.danger:hover {
  background: var(--error);
  color: #ffffff;
}
.context-item.danger:hover .context-shortcut {
  color: rgba(255, 255, 255, 0.85);
}
.context-divider {
  height: 1px;
  background: var(--border);
  margin: 4px 0;
}

/* No project state */
.no-project {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 20px;
  text-align: center;
  color: var(--text-muted);
}
.no-project-icon { opacity: 0.3; }
.no-project p { font-size: 12px; }
.open-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  background: var(--accent-soft);
  border: 1px solid var(--border-focus);
  color: var(--accent);
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-family: inherit;
  transition: background 0.15s;
}
.open-btn:hover { background: rgba(124, 106, 247, 0.25); }

/* Tree */
.tree-container { flex: 1; overflow-y: auto; }
.project-root {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 12px;
  border-bottom: 1px solid var(--border);
}
.folder-icon { color: var(--accent); }
.project-name { color: var(--text-primary); }
.tree { padding: 4px 0; }
.empty-dir {
  padding: 12px 16px;
  color: var(--text-muted);
  font-size: 11px;
}
</style>

<style>
/* Global tree node styles & Inline Create Row */
.tree-node {
  display: flex;
  align-items: center;
  padding: 3px 12px 3px 16px;
  cursor: pointer;
  border-radius: 0;
  transition: background 0.10s;
  min-height: 24px;
  user-select: none;
}
.tree-node:hover { background: var(--bg-hover); }
.tree-node.active { 
  background: var(--accent-soft); 
  border-left: 2px solid var(--accent);
}
.tree-node.active .file-name,
.tree-node.active .folder-name { 
  color: #ffffff; 
}
.tree-node.drag-target-dir {
  background: rgba(124, 106, 247, 0.25) !important;
  outline: 1px dashed var(--accent);
  outline-offset: -1px;
}
.node-label {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  overflow: hidden;
}
.chevron-icon { color: var(--text-muted); flex-shrink: 0; }
.file-name, .folder-name {
  font-size: 12.5px;
  color: var(--text-primary);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.folder-name { color: var(--text-secondary); font-weight: 500; }
.tree-children { 
  position: relative;
  margin-left: 20px;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  transition: border-color 0.15s ease;
}

.tree-children:hover {
  border-left-color: rgba(124, 106, 247, 0.35);
}
.is-dir > .node-label { color: var(--text-secondary); }

/* Inline creation row */
.inline-create-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 12px 2px 16px;
  min-height: 26px;
  width: 100%;
}
.inline-create-input {
  flex: 1;
  background: var(--bg-base);
  border: 1px solid var(--accent);
  color: var(--text-primary);
  font-size: 12px;
  font-family: inherit;
  padding: 2px 6px;
  border-radius: 4px;
  outline: none;
}
</style>
