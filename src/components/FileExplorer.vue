<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { 
  FolderOpen, FileText, ChevronRight, ChevronDown,
  RefreshCw, FilePlus, FolderPlus, Settings, FileCode, FileImage, 
  FileJson, Trash2, Upload, Edit2, Copy
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
  'upload-image': [targetDir: string, files: FileList]
}>()

const expandedDirs = ref<Set<string>>(new Set())

// Inline creation state
const creatingItem = ref<{
  targetDir: string
  type: 'file' | 'dir'
  name: string
} | null>(null)

const createInputRef = ref<HTMLInputElement | null>(null)

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
  if (lower.endsWith('.typ')) return { icon: FileCode, color: '#4fc3f7' }
  if (lower.endsWith('.md')) return { icon: FileText, color: '#7c6af7' }
  if (lower.endsWith('.yaml') || lower.endsWith('.yml')) return { icon: Settings, color: '#fbbf24' }
  if (lower.endsWith('.json')) return { icon: FileJson, color: '#fbbf24' }
  if (lower.endsWith('.pdf')) return { icon: FileText, color: '#f87171' }
  if (['.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif'].some(ext => lower.endsWith(ext))) {
    return { icon: FileImage, color: '#4ade80' }
  }
  return { icon: FileText, color: '#8b8fa8' }
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
  contextMenu.value = {
    show: true,
    x: e.clientX,
    y: e.clientY,
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

  closeContextMenu()

  if (action === 'new-file') startCreating(baseDir, 'file')
  if (action === 'new-folder') startCreating(baseDir, 'dir')
  if (action === 'rename' && targetNode) startRenaming(targetNode)
  if (action === 'delete' && targetNode) emit('delete-item', targetNode.path)
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

// Drag & Drop Handler
function onDragOver(e: DragEvent) {
  e.preventDefault()
  isDraggingOver.value = true
}

function onDragLeave(e: DragEvent) {
  e.preventDefault()
  isDraggingOver.value = false
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  isDraggingOver.value = false
  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    const targetDir = props.projectPath ? `${props.projectPath}/images` : ''
    emit('upload-image', targetDir, e.dataTransfer.files)
  }
}
</script>

<template>
  <aside 
    class="file-explorer" 
    :class="{ 'drag-over': isDraggingOver }"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
    @contextmenu.prevent="onContextMenu($event, null)"
  >
    <!-- Header -->
    <div class="explorer-header">
      <span class="explorer-title">EXPLORER</span>
      <div class="explorer-actions">
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
    <div v-else class="tree-container">
      <div class="project-root" @contextmenu.stop="onContextMenu($event, null)">
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
            :creating-item="creatingItem"
            :renaming-item="renamingItem"
            @preview-file="emit('preview-file', $event)"
            @open-file="emit('open-file', $event)"
            @toggle-dir="toggleDir"
            @context-menu="onContextMenu"
            @submit-create="submitCreate"
            @cancel-create="cancelCreate"
            @submit-rename="submitRename"
            @cancel-rename="cancelRename"
            :get-file-icon-meta="getFileIconMeta"
          />
        </template>
        <div v-else-if="!creatingItem" class="empty-dir">
          <span>Folder kosong</span>
        </div>
      </div>
    </div>

    <!-- Context Menu Dropdown -->
    <div 
      v-if="contextMenu.show" 
      class="context-menu" 
      :style="{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }"
      @click.stop
    >
      <button class="context-item" @click="handleContextAction('new-file')">
        <FilePlus :size="13" />
        <span>New File...</span>
      </button>
      <button class="context-item" @click="handleContextAction('new-folder')">
        <FolderPlus :size="13" />
        <span>New Folder...</span>
      </button>
      <button class="context-item" @click="handleContextAction('upload')">
        <Upload :size="13" />
        <span>Upload Gambar...</span>
      </button>
      <div class="context-divider"></div>
      <button v-if="projectPath" class="context-item" @click="copyProjectPath">
        <Copy :size="13" />
        <span>Copy Project Path</span>
      </button>
      <button class="context-item" @click="emit('toggle-hidden'); closeContextMenu()">
        <span class="hidden-toggle">{{ showHidden ? '✓' : '○' }}</span>
        <span>Show Hidden Files</span>
      </button>
      <div v-if="contextMenu.node" class="context-divider"></div>
      <button v-if="contextMenu.node && contextMenu.node.type === 'file' && isImageFile(contextMenu.node.name)" class="context-item" @click="copyGlideFigureTag">
        <span>Copy Glide Figure Tag</span>
      </button>
      <button v-if="contextMenu.node" class="context-item" @click="copyNodePath(false)">
        <span>{{ contextMenu.node.type === 'dir' ? 'Copy Folder Path' : 'Copy Path' }}</span>
      </button>
      <button v-if="contextMenu.node" class="context-item" @click="copyNodePath(true)">
        <span>{{ contextMenu.node.type === 'dir' ? 'Copy Folder Relative Path' : 'Copy Relative Path' }}</span>
      </button>
      <div v-if="contextMenu.node" class="context-divider"></div>
      <button v-if="contextMenu.node" class="context-item" @click="handleContextAction('rename')">
        <Edit2 :size="13" />
        <span>Rename...</span>
      </button>
      <button v-if="contextMenu.node" class="context-item danger" @click="handleContextAction('delete')">
        <Trash2 :size="13" />
        <span>Delete</span>
      </button>
    </div>
  </aside>
</template>

<script lang="ts">
import { defineComponent, h } from 'vue'
export const TreeNode = defineComponent({
  name: 'TreeNode',
  props: ['node', 'activeFile', 'expandedDirs', 'getFileIconMeta', 'creatingItem', 'renamingItem'],
  emits: ['preview-file', 'open-file', 'toggle-dir', 'context-menu', 'submit-create', 'cancel-create', 'submit-rename', 'cancel-rename'],
  setup(props, { emit }) {
    return () => {
      const node = props.node
      const isDir = node.type === 'dir'
      const isExpanded = props.expandedDirs.has(node.path)
      const isActive = props.activeFile === node.path
      const isRenaming = props.renamingItem && props.renamingItem.path === node.path

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
        label = h('span', { class: 'node-label' }, [
          chevronIcon,
          h('span', { class: 'folder-name' }, node.name)
        ])
      } else {
        const meta = props.getFileIconMeta(node.name)
        label = h('span', { class: 'node-label' }, [
          h(meta.icon, { size: 14, style: { color: meta.color, flexShrink: 0 } }),
          h('span', { class: 'file-name' }, node.name)
        ])
      }

      const self = h('div', {
        class: ['tree-node', isDir ? 'is-dir' : 'is-file', isActive ? 'active' : ''],
        onClick: () => {
          if (!isRenaming) {
            if (isDir) emit('toggle-dir', node)
            else emit('preview-file', node.path)
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
              creatingItem: props.creatingItem,
              renamingItem: props.renamingItem,
              getFileIconMeta: props.getFileIconMeta,
              onPreviewFile: (p: string) => emit('preview-file', p),
              onOpenFile: (p: string) => emit('open-file', p),
              onToggleDir: (n: any) => emit('toggle-dir', n),
              onContextMenu: (e: MouseEvent, n: any) => emit('context-menu', e, n),
              onSubmitCreate: () => emit('submit-create'),
              onCancelCreate: () => emit('cancel-create'),
              onSubmitRename: () => emit('submit-rename'),
              onCancelRename: () => emit('cancel-rename')
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
  opacity: 0;
  transition: opacity 0.2s;
}
.explorer-header:hover .explorer-actions { opacity: 1; }
.icon-btn {
  width: 22px; height: 22px;
  border: none; background: transparent;
  color: var(--text-secondary);
  border-radius: 4px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.15s, color 0.15s;
}
.icon-btn:hover { background: var(--bg-hover); color: var(--text-primary); }

/* Context Menu */
.context-menu {
  position: fixed;
  z-index: 1000;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  padding: 4px;
  min-width: 160px;
}
.context-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 10px;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.15s;
}
.context-item:hover {
  background: var(--bg-hover);
  color: var(--accent);
}
.context-item.danger:hover {
  background: rgba(239, 68, 68, 0.15);
  color: var(--error);
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
.tree-node.active {background: var(--accent-soft); }
.tree-node.active .file-name { color: white; }
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
.tree-children { padding-left: 12px; }
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
