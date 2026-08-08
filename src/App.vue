<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, defineAsyncComponent } from 'vue'
import TitleBar from './components/TitleBar.vue'
import FileExplorer from './components/FileExplorer.vue'
import EditorPanel from './components/EditorPanel.vue'
import MediaPanel from './components/MediaPanel.vue'
import PreviewPanel from './components/PreviewPanel.vue'
import SettingsView from './components/SettingsView.vue'
import ProjectSearch from './components/ProjectSearch.vue'

// Lazy Load / Defer Heavy Secondary Components to Reclaim Initial RAM
const Dashboard = defineAsyncComponent(() => import('./components/Dashboard.vue'))
const CreateProjectModal = defineAsyncComponent(() => import('./components/CreateProjectModal.vue'))
const CommandPalette = defineAsyncComponent(() => import('./components/CommandPalette.vue'))
const ConfirmModal = defineAsyncComponent(() => import('./components/ConfirmModal.vue'))
const MendeleyGuideModal = defineAsyncComponent(() => import('./components/MendeleyGuideModal.vue'))
const SkillsView = defineAsyncComponent(() => import('./components/SkillsView.vue'))
import AiInlinePopup from './components/AiInlinePopup.vue'
import { 
  TerminalSquare, Folder, FileText, FileSearchCorner, LayoutDashboard, Settings, Bot
} from 'lucide-vue-next'
import type { FileNode } from './components/FileExplorer.vue'
import type { GlideConfig, GlideSection } from './electron.d'

export interface TabItem {
  path: string
  name: string
  isPreview: boolean
  isDirty?: boolean
  isAiChat?: boolean
  errorMsg?: string
}

// ── Custom Modal Dialog State ──────────────────────────────────────
const dialogState = ref<{
  show: boolean
  title: string
  message: string
  type: 'confirm' | 'alert' | 'success' | 'error'
  onConfirm?: () => void
  onCancel?: () => void
}>({
  show: false,
  title: 'Konfirmasi',
  message: '',
  type: 'alert'
})

function showAlert(message: string, title: string = 'Pemberitahuan', type: 'alert' | 'success' | 'error' = 'alert') {
  dialogState.value = {
    show: true,
    title,
    message,
    type,
    onConfirm: () => { dialogState.value.show = false },
    onCancel: () => { dialogState.value.show = false }
  }
}

function showConfirm(message: string, title: string = 'Konfirmasi'): Promise<boolean> {
  return new Promise((resolve) => {
    dialogState.value = {
      show: true,
      title,
      message,
      type: 'confirm',
      onConfirm: () => {
        dialogState.value.show = false
        resolve(true)
      },
      onCancel: () => {
        dialogState.value.show = false
        resolve(false)
      }
    }
  })
}

// ── State ──────────────────────────────────────────────────────
const showDashboard        = ref(false)
const showCreateModal      = ref(false)
const showCommandPalette   = ref(false)
const showMendeleyGuide    = ref(false)
const showSkillsModal      = ref(false)
const showSettings         = ref(false)
const showProjectSearch    = ref(false)
const showSidebar          = ref(true)
const showTerminal   = ref(false)
const showPreview    = ref(true) // Split view preview side-by-side
const showHiddenFiles = ref(localStorage.getItem('glide_show_hidden_files') === 'true')
const projectPath    = ref<string | undefined>(undefined)
const activeFile     = ref<string | undefined>(undefined)
const fileContent    = ref<string>('')
const fileTree       = ref<FileNode[]>([])
const isGlide        = ref(false)
const glideConfig    = ref<GlideConfig | null>(null)
const glideSections  = ref<GlideSection[]>([])

// Panel sizes state for resizable panels
const sidebarWidth  = ref(240)
const previewWidth  = ref(450)

interface AppSettings {
  accent: string
  editorFontSize: number
  terminalFontSize: number
  lineWrapping: boolean
  sidebarWidth: number
  previewWidth: number
  terminalHeight: number
}

const defaultSettings: AppSettings = {
  accent: '#7c6af7',
  editorFontSize: 13,
  terminalFontSize: 13,
  lineWrapping: true,
  sidebarWidth: 240,
  previewWidth: 450,
  terminalHeight: 200
}
const savedSettings = localStorage.getItem('glide_app_settings')
const settings = ref<AppSettings>({ ...defaultSettings, ...(savedSettings ? JSON.parse(savedSettings) : {}) })
const showSettingsModal = () => { showSettings.value = true }
function applyGlobalAccentColor(color: string) {
  if (!color) return
  document.documentElement.style.setProperty('--accent', color)
}

const showTerminalModal = ref(false)

function openExternalTerminal() {
  // Di Windows, tampilkan pilihan terminal (PowerShell, CMD, Git Bash)
  if (navigator.userAgent.includes('Windows')) {
    showTerminalModal.value = true
  } else {
    window.electronAPI?.openTerminal?.(projectPath.value)
  }
}

function launchTerminalChoice(shellType: 'powershell' | 'cmd' | 'gitbash') {
  showTerminalModal.value = false
  window.electronAPI?.openTerminal?.(projectPath.value, shellType)
}

function updateSettings(next: AppSettings) {
  settings.value = next
  sidebarWidth.value = next.sidebarWidth
  previewWidth.value = next.previewWidth
  applyGlobalAccentColor(next.accent)
  localStorage.setItem('glide_app_settings', JSON.stringify(next))
}

watch(() => settings.value.accent, (newColor) => {
  applyGlobalAccentColor(newColor)
}, { immediate: true })

// Dragging state
const isDraggingSidebar = ref(false)
const isDraggingPreview = ref(false)
const isDraggingTerminal = ref(false)

// Preview & Build State
const previewPages   = ref<string[]>([])
const previewLoading = ref(false)
const previewError   = ref<string | undefined>(undefined)

const editorRef = ref<InstanceType<typeof EditorPanel> | null>(null)

// Multi-tab Management
const openTabs       = ref<TabItem[]>([])
const restoringTabs = ref(false)

function tabsStorageKey(path: string) {
  return `glide_open_tabs:${path}`
}

function persistOpenTabs() {
  if (!projectPath.value || restoringTabs.value) return
  localStorage.setItem(tabsStorageKey(projectPath.value), JSON.stringify({
    activePath: activeFile.value,
    tabs: openTabs.value.map(({ path, name, isPreview }) => ({ path, name, isPreview }))
  }))
}

async function restoreOpenTabs(dirPath: string) {
  const raw = localStorage.getItem(tabsStorageKey(dirPath))
  if (!raw) return

  try {
    const saved = JSON.parse(raw) as { activePath?: string; tabs?: Array<{ path: string; name: string; isPreview?: boolean }> }
    const validTabs: TabItem[] = []
    for (const tab of saved.tabs || []) {
      const content = await window.electronAPI?.readFile?.(tab.path)
      if (content !== null && content !== undefined) {
        validTabs.push({ path: tab.path, name: tab.name, isPreview: !!tab.isPreview, isDirty: false })
      }
    }
    openTabs.value = validTabs
    const active = validTabs.find(tab => tab.path === saved.activePath) || validTabs[0]
    if (active) await fetchFileContent(active.path)
  } catch (error) {
    console.warn('Failed to restore open tabs:', error)
  }
}

const projectName = computed(() =>
  projectPath.value ? projectPath.value.split(/[\\/]/).pop() : undefined
)

const PlanEditor = defineAsyncComponent(() => import('./components/PlanEditor.vue'))

const isMediaFile = computed(() => {
  if (!activeFile.value) return false
  const lower = activeFile.value.toLowerCase()
  const mediaExts = [
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp',
    '.mp4', '.webm', '.ogg', '.mov',
    '.mp3', '.wav', '.flac', '.aac',
    '.pdf'
  ]
  return mediaExts.some(ext => lower.endsWith(ext))
})

const isMarkdownFile = computed(() => {
  if (!activeFile.value) return false
  return activeFile.value.toLowerCase().endsWith('.md')
})

const searchQueryForProject = ref('')

function triggerSearchInProject(queryText: string) {
  searchQueryForProject.value = queryText
  showProjectSearch.value = true
}

function openWikiFile(relPath: string) {
  if (!projectPath.value || !relPath) return
  const fullPath = relPath.startsWith('/') || relPath.includes(':') 
    ? relPath 
    : `${projectPath.value}/${relPath}`
  openFile(fullPath)
}

const currentTabItem = computed(() => {
  return openTabs.value.find(tab => tab.path === activeFile.value)
})

const isAiTab = computed(() => {
  return currentTabItem.value?.isAiChat ?? false
})

function openAiExplainTab(errorMsg: string) {
  const tabId = 'ai-explain-error-' + Date.now()
  const newTab: TabItem = {
    path: tabId,
    name: 'AI Explain Error',
    isPreview: false,
    isDirty: false,
    isAiChat: true,
    errorMsg
  }
  openTabs.value.push(newTab)
  activeFile.value = tabId
}

// ── Resizable Drag Handlers ─────────────────────────────────────
function startSidebarDrag() {
  isDraggingSidebar.value = true
  document.addEventListener('mousemove', onSidebarDrag)
  document.addEventListener('mouseup', stopDrag)
}

function onSidebarDrag(e: MouseEvent) {
  if (!isDraggingSidebar.value) return
  // Activity bar is 48px
  const newWidth = e.clientX - 48
  if (newWidth >= 140 && newWidth <= 600) {
    sidebarWidth.value = newWidth
  }
}

function startPreviewDrag() {
  isDraggingPreview.value = true
  document.addEventListener('mousemove', onPreviewDrag)
  document.addEventListener('mouseup', stopDrag)
}

function onPreviewDrag(e: MouseEvent) {
  if (!isDraggingPreview.value) return
  const newWidth = window.innerWidth - e.clientX
  if (newWidth >= 250 && newWidth <= window.innerWidth - 300) {
    previewWidth.value = newWidth
  }
}

function stopDrag() {
  isDraggingSidebar.value = false
  isDraggingPreview.value = false
  isDraggingTerminal.value = false
  document.removeEventListener('mousemove', onSidebarDrag)
  document.removeEventListener('mousemove', onPreviewDrag)
}

function saveRecentProject(pPath: string, isGld: boolean) {
  try {
    const pName = pPath.split(/[\\/]/).pop() || pPath
    const raw = localStorage.getItem('glide_recent_projects')
    let list: any[] = raw ? JSON.parse(raw) : []
    list = list.filter(item => item.path !== pPath)
    list.unshift({
      path: pPath,
      name: pName,
      lastOpened: Date.now(),
      isGlide: isGld
    })
    if (list.length > 10) list = list.slice(0, 10)
    localStorage.setItem('glide_recent_projects', JSON.stringify(list))
  } catch (e) {
    console.error('Failed to save recent project:', e)
  }
}

// ── File & Tab Handling ──────────────────────────────────────────
async function loadProjectByPath(dirPath: string) {
  const result = await window.electronAPI?.loadProject?.(dirPath, showHiddenFiles.value)
  if (result) {
    projectPath.value = result.path
    fileTree.value = result.tree || []
    isGlide.value = result.isGlide
    glideConfig.value = result.config
    glideSections.value = result.sections || []
    showDashboard.value = false
    localStorage.setItem('glide_last_project', result.path)
    saveRecentProject(result.path, result.isGlide)
    restoringTabs.value = true
    await restoreOpenTabs(result.path)
    restoringTabs.value = false

    if (result.isGlide) {
      triggerPreview()
    }
  }
}

async function openFolder() {
  const result = await window.electronAPI?.openFolder?.(showHiddenFiles.value)
  if (result) {
    projectPath.value = result.path
    fileTree.value = result.tree || []
    isGlide.value = result.isGlide
    glideConfig.value = result.config
    glideSections.value = result.sections || []
    openTabs.value = []
    activeFile.value = undefined
    fileContent.value = ''
    showDashboard.value = false
    localStorage.setItem('glide_last_project', result.path)
    saveRecentProject(result.path, result.isGlide)
    restoringTabs.value = true
    await restoreOpenTabs(result.path)
    restoringTabs.value = false

    if (result.isGlide) {
      triggerPreview()
    }
  }
}

function closeCurrentFolder() {
  projectPath.value = undefined
  openTabs.value = []
  activeFile.value = undefined
  fileContent.value = ''
  showDashboard.value = true
  localStorage.removeItem('glide_last_project')
}

async function refreshFileTree() {
  if (!projectPath.value) return
  const result = await window.electronAPI?.loadProject?.(projectPath.value, showHiddenFiles.value)
  if (result) {
    fileTree.value = result.tree || []
    isGlide.value = result.isGlide
    glideConfig.value = result.config
    glideSections.value = result.sections || []
  }
}

async function toggleHiddenFiles() {
  showHiddenFiles.value = !showHiddenFiles.value
  localStorage.setItem('glide_show_hidden_files', String(showHiddenFiles.value))
  await refreshFileTree()
}

async function createNewFile(fullPath: string) {
  if (!fullPath) return
  const success = await window.electronAPI?.createFile?.(fullPath, '')
  if (success) {
    await refreshFileTree()
    openFile(fullPath)
  }
}

async function createNewFolder(fullPath: string) {
  if (!fullPath) return
  const success = await window.electronAPI?.createDir?.(fullPath)
  if (success) {
    await refreshFileTree()
  }
}

async function openOrCreateBibliography() {
  if (!projectPath.value) return
  const bibPath = `${projectPath.value}/bibliography.yaml`
  
  const existing = await window.electronAPI?.readFile?.(bibPath)
  if (existing === null || existing === undefined) {
    const defaultBib = `# ╔══════════════════════════════════════════════╗
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
`
    await window.electronAPI?.createFile?.(bibPath, defaultBib)
    await refreshFileTree()
  }
  
  openFile(bibPath)
}

async function deleteFileOrFolder(pathToDelete: string) {
  const name = pathToDelete.split(/[\\/]/).pop()

  // Cek apakah file/folder yang mau dihapus sedang aktif di editor
  if (activeFile.value) {
    const norm = (p: string) => p.replace(/\\/g, '/')
    const isActive = norm(activeFile.value) === norm(pathToDelete) ||
                     norm(activeFile.value).startsWith(norm(pathToDelete) + '/')
    if (isActive) {
      showAlert(`File "${name}" sedang dibuka di editor.\nTutup tab-nya terlebih dahulu sebelum menghapus.`, 'Perhatian', 'error')
      return
    }
  }

  const confirmed = await showConfirm(`Apakah Anda yakin ingin menghapus "${name}"?`, 'Hapus File / Folder')
  if (!confirmed) return

  const success = await window.electronAPI?.deleteItem?.(pathToDelete)
  if (success) {
    // Close any open tabs for the deleted path (non-active tabs)
    const normalizedPath = pathToDelete.replace(/\\/g, '/')
    const tabsToClose = openTabs.value.filter(t => {
      const tNorm = t.path.replace(/\\/g, '/')
      return tNorm === normalizedPath || tNorm.startsWith(normalizedPath + '/')
    })
    for (const t of tabsToClose) {
      await closeTab(t.path, undefined, true)
    }

    await refreshFileTree()
    if (projectPath.value) triggerPreview()
  }
}

async function renameItem(oldPath: string, newPath: string) {
  const success = await window.electronAPI?.renameItem?.(oldPath, newPath)
  if (success) {
    // Update open tabs if renamed item is in openTabs
    const tab = openTabs.value.find(t => t.path === oldPath)
    if (tab) {
      tab.path = newPath
      tab.name = newPath.split(/[\\/]/).pop() || newPath
    }
    if (activeFile.value === oldPath) {
      activeFile.value = newPath
    }
    await refreshFileTree()
    if (isGlide.value) triggerPreview()
  }
}

async function uploadImages(targetDir: string, files: FileList) {
  const destFolder = targetDir || `${projectPath.value}/images`
  let count = 0
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const srcPath = (file as any).path
    if (srcPath) {
      const destPath = `${destFolder}/${file.name}`
      const ok = await window.electronAPI?.copyFile?.(srcPath, destPath)
      if (ok) count++
    }
  }
  if (count > 0) {
    await refreshFileTree()
  }
}

async function fetchFileContent(filePath: string) {
  activeFile.value = filePath
  
  const lower = filePath.toLowerCase()
  const isMedia = [
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp',
    '.mp4', '.webm', '.ogg', '.mov',
    '.mp3', '.wav', '.flac', '.aac',
    '.pdf'
  ].some(ext => lower.endsWith(ext))

  if (isMedia) {
    fileContent.value = ''
    return
  }

  const content = await window.electronAPI?.readFile?.(filePath)
  if (content === null || content === undefined) {
    // File missing/deleted from disk
    const fileName = filePath.split(/[\\/]/).pop() || filePath
    showAlert(`⚠️ File "${fileName}" tidak ditemukan di disk. Tab akan ditutup.`)
    closeTab(filePath, undefined, true)
    return
  }
  fileContent.value = content
}

async function previewFile(filePath: string) {
  const fileName = filePath.split(/[\\/]/).pop() || filePath
  const existingIndex = openTabs.value.findIndex(t => t.path === filePath)

  if (existingIndex !== -1) {
    await fetchFileContent(filePath)
  } else {
    const previewIndex = openTabs.value.findIndex(t => t.isPreview)
    if (previewIndex !== -1) {
      openTabs.value[previewIndex] = { path: filePath, name: fileName, isPreview: true, isDirty: false }
    } else {
      openTabs.value.push({ path: filePath, name: fileName, isPreview: true, isDirty: false })
    }
    await fetchFileContent(filePath)
  }
}

async function openFile(filePath: string) {
  const fileName = filePath.split(/[\\/]/).pop() || filePath
  const existingTab = openTabs.value.find(t => t.path === filePath)

  if (existingTab) {
    existingTab.isPreview = false
  } else {
    const previewIndex = openTabs.value.findIndex(t => t.isPreview)
    if (previewIndex !== -1) {
      openTabs.value[previewIndex] = { path: filePath, name: fileName, isPreview: false, isDirty: false }
    } else {
      openTabs.value.push({ path: filePath, name: fileName, isPreview: false, isDirty: false })
    }
  }
  await fetchFileContent(filePath)
}

function selectTab(tab: TabItem) {
  fetchFileContent(tab.path)
}

async function closeTab(tabPath: string, event?: Event, forceClose: boolean = false) {
  if (event) event.stopPropagation()
  const index = openTabs.value.findIndex(t => t.path === tabPath)
  if (index === -1) return

  const targetTab = openTabs.value[index]

  // Prompt confirmation if file is unsaved (isDirty) and not forceClose
  if (targetTab.isDirty && !forceClose) {
    const confirmClose = await showConfirm(`File "${targetTab.name}" belum disimpan.\nApakah Anda yakin ingin menutup tanpa menyimpan?`, 'Tutup File Unsaved')
    if (!confirmClose) return
  }

  openTabs.value.splice(index, 1)

  if (activeFile.value === tabPath) {
    if (openTabs.value.length > 0) {
      const nextIndex = Math.min(index, openTabs.value.length - 1)
      fetchFileContent(openTabs.value[nextIndex].path)
    } else {
      activeFile.value = undefined
      fileContent.value = ''
    }
  }
}
function onEditorChange(content: string) {
  fileContent.value = content
  if (activeFile.value) {
    const currentTab = openTabs.value.find(t => t.path === activeFile.value)
    if (currentTab) {
      currentTab.isPreview = false
      currentTab.isDirty = true
    }
  }
}

async function saveFile(content?: string) {
  const textToSave = content !== undefined ? content : fileContent.value
  if (!activeFile.value || isMediaFile.value) return
  const success = await window.electronAPI?.writeFile?.(activeFile.value, textToSave)
  if (success) {
    const currentTab = openTabs.value.find(t => t.path === activeFile.value)
    if (currentTab) currentTab.isDirty = false

    if (projectPath.value) {
      triggerPreview()
    }
  }
}

// ── Typst Build & Preview (Debounced to save RAM & CPU) ───────────
let previewTimer: any = null

async function triggerPreview() {
  if (!projectPath.value) return
  if (previewTimer) clearTimeout(previewTimer)

  previewTimer = setTimeout(async () => {
    previewLoading.value = true
    previewError.value = undefined

    const res = await window.electronAPI?.previewPdf?.(projectPath.value!)
    previewLoading.value = false

    if (res?.success && res.pages) {
      previewPages.value = res.pages
    } else {
      previewError.value = res?.error || 'Gagal menderender dokumen Typst.'
    }
  }, 300)
}

async function triggerBuildPdf() {
  if (!projectPath.value) return
  const defaultName = `${projectName.value || 'laporan'}.pdf`
  const savePath = await window.electronAPI?.savePdfDialog?.(defaultName)
  if (!savePath) return

  previewLoading.value = true
  const res = await window.electronAPI?.buildPdf?.(projectPath.value, savePath)
  previewLoading.value = false

  if (res?.success) {
    showAlert(`✅ PDF Berhasil Dibuat:\n${savePath}`, 'Export PDF', 'success')
  } else {
    showAlert(`❌ Gagal Membuat PDF:\n${res?.error}`, 'Error Export PDF', 'error')
  }
}

async function triggerBuildDocx() {
  if (!projectPath.value) return
  const defaultName = `${projectName.value || 'laporan'}.docx`
  const savePath = await window.electronAPI?.saveDocxDialog?.(defaultName)
  if (!savePath) return

  previewLoading.value = true
  const res = await window.electronAPI?.buildDocx?.(projectPath.value, savePath)
  previewLoading.value = false

  if (res?.success) {
    showAlert(`✅ Dokumen Word Berhasil Dibuat:\n${savePath}`, 'Export Word (.docx)', 'success')
  } else {
    showAlert(`❌ Gagal Membuat Dokumen Word:\n${res?.error}`, 'Error Export Word', 'error')
  }
}

// ── Auto Restore Last Opened Project & Real-Time Targeted File Watcher (AI CLI Live Sync) ──
let unwatchFileEvents: (() => void) | null = null

// Kirim daftar file tab terbuka ke Electron main process untuk dipantau secara spesifik
watch(
  openTabs,
  (tabs) => {
    const validPaths = (tabs || [])
      .filter(t => !t.isAiChat && t.path && !t.path.startsWith('ai-explain-'))
      .map(t => t.path)
    window.electronAPI?.watchFiles?.(validPaths)
  },
  { deep: true, immediate: true }
)

onMounted(() => {
  const lastProject = localStorage.getItem('glide_last_project')
  if (lastProject) {
    loadProjectByPath(lastProject)
  }

  // Live Sync saat file yang ada di tab terbuka diubah oleh AI CLI eksternal
  if (window.electronAPI?.onFileChanged) {
    unwatchFileEvents = window.electronAPI.onFileChanged(async ({ fullPath }) => {
      if (!fullPath) return

      // Jika file yang diubah sedang aktif dibuka di editor
      const cleanFullPath = fullPath.replace(/\\/g, '/')
      if (activeFile.value && activeFile.value.replace(/\\/g, '/') === cleanFullPath) {
        const currentTab = openTabs.value.find(t => t.path === activeFile.value)
        // Hanya update isi jika user tidak sedang memiliki un-saved local draft
        if (!currentTab || !currentTab.isDirty) {
          const freshContent = await window.electronAPI?.readFile?.(activeFile.value)
          if (freshContent !== null && freshContent !== undefined) {
            fileContent.value = freshContent
          }
        }
      }

      // Segarkan pratinjau Typst otomatis
      if (projectPath.value) {
        triggerPreview()
      }
    })
  }
})

onBeforeUnmount(() => {
  if (unwatchFileEvents) unwatchFileEvents()
})

watch([openTabs, activeFile], persistOpenTabs, { deep: true })

// ── Editor Menu Actions ──────────────────────────────────────────
function handleEditorUndo() { editorRef.value?.triggerUndo() }
function handleEditorRedo() { editorRef.value?.triggerRedo() }
function handleEditorCut()  { document.execCommand('cut') }
function handleEditorCopy() { document.execCommand('copy') }
function handleEditorPaste() { document.execCommand('paste') }
function handleEditorSelectAll() { editorRef.value?.triggerSelectAll() }
function handleEditorFind() { editorRef.value?.triggerFind() }
function openProjectSearchFile(path: string) {
  showProjectSearch.value = false
  openFile(path)
}

// ── Keyboard shortcuts ──────────────────────────────────────────
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === '`') {
    window.electronAPI?.openTerminal?.(projectPath.value)
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
    e.preventDefault()
    showCreateModal.value = true
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
    e.preventDefault()
    showSidebar.value = !showSidebar.value
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
    e.preventDefault()
    showCommandPalette.value = !showCommandPalette.value
  }
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'e') {
    e.preventDefault()
    triggerBuildPdf()
  }
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
    e.preventDefault()
    showProjectSearch.value = true
    showCommandPalette.value = false
  }
  if ((e.ctrlKey || e.metaKey) && e.key === ',') {
    e.preventDefault()
    showSettings.value = true
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
    e.preventDefault()
    if (activeFile.value) closeTab(activeFile.value)
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'Tab') {
    e.preventDefault()
    if (openTabs.value.length < 2) return
    const currentIndex = openTabs.value.findIndex(t => t.path === activeFile.value)
    if (currentIndex === -1) {
      fetchFileContent(openTabs.value[0].path)
      return
    }
    if (e.shiftKey) {
      const prevIndex = (currentIndex - 1 + openTabs.value.length) % openTabs.value.length
      fetchFileContent(openTabs.value[prevIndex].path)
    } else {
      const nextIndex = (currentIndex + 1) % openTabs.value.length
      fetchFileContent(openTabs.value[nextIndex].path)
    }
  }
})
</script>

<template>
  <div id="app-shell" :style="{ '--accent': settings.accent, '--accent-soft': `${settings.accent}26` }">
    <!-- Titlebar dengan Menu View & Export Fungsional -->
    <TitleBar 
      :project-name="projectName" 
      :show-sidebar="showSidebar"
      :show-terminal="showTerminal"
      :show-preview="showPreview"
      @open-folder="openFolder"
      @create-project="showCreateModal = true"
      @close-folder="closeCurrentFolder"
      @open-bib="openOrCreateBibliography"
      @save-file="() => saveFile()"
      @toggle-sidebar="showSidebar = !showSidebar"
      @toggle-terminal="openExternalTerminal"
      @toggle-preview="showPreview = !showPreview"
      @export-pdf="triggerBuildPdf"
      @export-docx="triggerBuildDocx"
      @open-mendeley-guide="showMendeleyGuide = true"
      @open-skills-store="showSkillsModal = true"
      @open-palette="showCommandPalette = true"
      @editor-undo="handleEditorUndo"
      @editor-redo="handleEditorRedo"
      @editor-cut="handleEditorCut"
      @editor-copy="handleEditorCopy"
      @editor-paste="handleEditorPaste"
      @editor-select-all="handleEditorSelectAll"
      @editor-find="handleEditorFind"
    />

    <!-- Activity Bar + Main Content -->
    <div class="workspace">
      <!-- Activity Bar -->
      <div class="activity-bar">
        <div class="activity-top">
          <button 
            class="activity-btn" 
            :class="{ active: showSidebar }"
            @click="showSidebar = !showSidebar"
            title="File Explorer (Ctrl+B)"
          >
            <Folder :size="20" />
          </button>
          <button class="activity-btn" @click="showProjectSearch = true" title="Search in Project">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </button>

          <!-- Dashboard Button -->
          <button 
            class="activity-btn" 
            :class="{ active: showDashboard || !projectPath }" 
            @click="showDashboard = !showDashboard" 
            title="Project Dashboard"
          >
            <LayoutDashboard :size="20" />
          </button>

          <!-- Toggle Preview Button -->
          <button 
            class="activity-btn" 
            :class="{ active: showPreview }" 
            @click="showPreview = !showPreview" 
            title="Toggle Live Preview (Ctrl+P)"
          >
            <FileSearchCorner :size="20" />
          </button>

          <!-- Open in Terminal Button -->
          <button 
            class="activity-btn" 
            @click="openExternalTerminal" 
            title="Open in Terminal (Ctrl+`)"
          >
            <TerminalSquare :size="20" />
          </button>
        </div>
        <div class="activity-bottom">
          <button class="activity-btn" title="Settings" @click="showSettingsModal">
            <Settings :size="20" />
          </button>
        </div>
      </div>

      <!-- Sidebar (File Explorer) with custom width & Drag Handle -->
      <div 
        v-show="showSidebar" 
        class="sidebar-wrapper" 
        :style="{ width: `${sidebarWidth}px` }"
      >
        <FileExplorer
          :project-path="projectPath"
          :tree="fileTree"
          :active-file="activeFile"
          :show-hidden="showHiddenFiles"
          @preview-file="previewFile"
          @open-file="openFile"
          @open-folder="openFolder"
          @refresh="refreshFileTree"
          @create-file="createNewFile"
          @create-folder="createNewFolder"
          @rename-item="renameItem"
          @delete-item="deleteFileOrFolder"
          @upload-image="uploadImages"
          @toggle-hidden="toggleHiddenFiles"
        />
        <!-- Resize Handle Right -->
        <div class="resize-handle handle-right" @mousedown="startSidebarDrag"></div>
      </div>

      <!-- Main editor area + terminal OR Dashboard -->
      <Dashboard
        v-if="!projectPath || showDashboard"
        @open-folder="openFolder"
        @open-project-path="loadProjectByPath"
        @create-project="showCreateModal = true"
      />

      <div v-else class="main-area">
        <!-- Multi Tab Bar -->
        <div class="tab-bar">
          <template v-if="openTabs.length > 0">
            <div 
              v-for="tab in openTabs" 
              :key="tab.path"
              class="tab"
              :class="{ active: activeFile === tab.path, preview: tab.isPreview, dirty: tab.isDirty }"
              @click="selectTab(tab)"
              @dblclick="tab.isPreview = false"
            >
              <Bot v-if="tab.isAiChat" :size="12" class="icon-accent" />
              <FileText v-else :size="12" />
              <span class="tab-title" :class="{ italic: tab.isPreview }">{{ tab.name }}</span>
              <button class="tab-close" @click="closeTab(tab.path, $event)" :title="tab.isDirty ? 'Belum disimpan' : 'Tutup'">
                <span v-if="tab.isDirty" class="dirty-dot">●</span>
                <span v-else class="close-x">×</span>
              </button>
            </div>
          </template>
          <div v-else class="tab-empty">
            Belum ada file terbuka
          </div>
        </div>

        <!-- Split View Content: Editor / Media / AI Tab vs Live Preview -->
        <div class="split-workspace">
          <!-- Main Workspace: MediaPanel vs AiTab vs EditorPanel -->
          <div class="editor-container">
            <div v-if="isAiTab" class="ai-tab-panel">
              <AiInlinePopup
                :selected-text="''"
                :position="{ top: 0, left: 0 }"
                :explain-error="currentTabItem?.errorMsg"
                class="ai-tab-popup-full"
                @close="activeFile && closeTab(activeFile, $event)"
                @replace="() => {}"
                @insert-below="() => {}"
              />
            </div>
            <MediaPanel
              v-else-if="activeFile && isMediaFile"
              :file-path="activeFile"
            />
            <PlanEditor
              v-else-if="activeFile && isMarkdownFile"
              :file-path="activeFile"
              :content="fileContent"
              @change="onEditorChange"
              @save="saveFile"
              @open-file="openWikiFile"
            />
            <EditorPanel
              v-else
              ref="editorRef"
              :file-path="activeFile"
              :content="fileContent"
              :font-size="settings.editorFontSize"
              :line-wrapping="settings.lineWrapping"
              @change="onEditorChange"
              @save="saveFile"
              @search-project="triggerSearchInProject"
            />
          </div>

          <!-- Side-by-Side Resizable Live Preview Panel -->
          <div 
            v-if="showPreview" 
            class="preview-wrapper" 
            :style="{ width: `${previewWidth}px` }"
          >
            <!-- Resize Handle Left -->
            <div class="resize-handle handle-left" @mousedown="startPreviewDrag"></div>
            <PreviewPanel
              :pages="previewPages"
              :loading="previewLoading"
              :error="previewError"
              :project-dir="projectPath"
              @refresh="triggerPreview"
              @build-pdf="triggerBuildPdf"
              @explain-error="openAiExplainTab"
            />
          </div>
        </div>
      </div>
    </div>

    <SettingsView v-if="showSettings" :settings="settings" @update="updateSettings" @close="showSettings = false" />
    <ProjectSearch 
      v-if="showProjectSearch" 
      :project-path="projectPath" 
      :initial-query="searchQueryForProject" 
      @close="showProjectSearch = false" 
      @open="openProjectSearchFile" 
    />

    <!-- Terminal Selection Modal (Windows) -->
    <div v-if="showTerminalModal" class="terminal-modal-overlay" @click.self="showTerminalModal = false">
      <div class="terminal-modal-card">
        <div class="terminal-modal-header">
          <TerminalSquare :size="16" class="icon-accent" />
          <h3>Pilih Terminal External</h3>
        </div>
        <p class="terminal-modal-desc">Buka direktori proyek aktif di terminal Windows pilihan Anda:</p>
        
        <div class="terminal-options-list">
          <button class="terminal-opt-btn" @click="launchTerminalChoice('powershell')">
            <span class="opt-title">PowerShell</span>
            <span class="opt-sub">powershell.exe (Rekomendasi Default)</span>
          </button>
          
          <button class="terminal-opt-btn" @click="launchTerminalChoice('cmd')">
            <span class="opt-title">Command Prompt</span>
            <span class="opt-sub">cmd.exe (Windows Standard)</span>
          </button>

          <button class="terminal-opt-btn" @click="launchTerminalChoice('gitbash')">
            <span class="opt-title">Git Bash</span>
            <span class="opt-sub">git-bash.exe (Unix Emulation)</span>
          </button>
        </div>

        <button class="terminal-cancel-btn" @click="showTerminalModal = false">Batal</button>
      </div>
    </div>

    <!-- Skills & AI Rules Store View -->
    <SkillsView
      v-if="showSkillsModal"
      :project-path="projectPath"
      @close="showSkillsModal = false"
      @skill-installed="() => { if (projectPath) loadProjectByPath(projectPath); }"
    />

    <!-- Mendeley Guide Modal -->
    <MendeleyGuideModal
      v-if="showMendeleyGuide"
      @close="showMendeleyGuide = false"
    />

    <!-- Create Project Modal -->
    <CreateProjectModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="(pDir) => { showCreateModal = false; loadProjectByPath(pDir); }"
    />

    <!-- Command Palette -->
    <CommandPalette
      v-if="showCommandPalette"
      :tree="fileTree"
      :project-path="projectPath"
      @close="showCommandPalette = false"
      @open-file="openFile"
      @open-bib="openOrCreateBibliography"
      @create-project="showCreateModal = true"
      @open-folder="openFolder"
      @save-file="() => saveFile()"
      @toggle-preview="showPreview = !showPreview"
      @toggle-terminal="openExternalTerminal"
      @export-pdf="triggerBuildPdf"
      @export-docx="triggerBuildDocx"
      @search-project="showProjectSearch = true; showCommandPalette = false"
      @open-settings="showSettings = true; showCommandPalette = false"
    />

    <!-- Custom Dialog Modal (Alert / Confirm) -->
    <ConfirmModal
      v-if="dialogState.show"
      :title="dialogState.title"
      :message="dialogState.message"
      :type="dialogState.type"
      @confirm="dialogState.onConfirm?.()"
      @cancel="dialogState.onCancel?.()"
    />
  </div>
</template>

<style>
#app-shell {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-base);
}

.workspace {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* Activity Bar */
.activity-bar {
  width: 48px;
  flex-shrink: 0;
  background: var(--bg-surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 6px 0;
  z-index: 10;
}
.activity-top, .activity-bottom {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.activity-btn {
  width: 40px; height: 40px;
  border: none; background: transparent;
  color: var(--text-muted);
  border-radius: 8px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: color 0.15s, background 0.15s;
  position: relative;
}
.activity-btn:hover { color: var(--text-primary); background: var(--bg-hover); }
.activity-btn.active { 
  color: var(--text-primary);
  background: var(--accent-soft);
}
.activity-btn.active::before {
  content: '';
  position: absolute;
  left: 0; top: 25%; height: 50%; width: 2px;
  background: var(--accent);
  border-radius: 0 2px 2px 0;
}

/* Sidebar Wrapper & Resizer */
.sidebar-wrapper {
  position: relative;
  height: 100%;
  flex-shrink: 0;
  display: flex;
}
.resize-handle {
  position: absolute;
  top: 0; bottom: 0;
  width: 5px;
  z-index: 20;
  cursor: col-resize;
  transition: background 0.2s;
}
.resize-handle:hover {
  background: var(--accent);
}
.handle-right {
  right: -2px;
}
.handle-left {
  left: -2px;
}

/* Preview Wrapper */
.preview-wrapper {
  position: relative;
  height: 100%;
  flex-shrink: 0;
  display: flex;
}

/* Main area */
.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.terminal-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  min-height: 100px;
}

.terminal-wrapper > .terminal-panel {
  height: 100%;
}

.terminal-resize-handle {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  height: 5px;
  z-index: 20;
  cursor: row-resize;
  background: transparent;
  pointer-events: auto;
}

.terminal-resize-handle:hover,
.terminal-resize-handle.dragging {
  background: var(--accent);
}

/* Split Workspace (Editor + Live Preview) */
.split-workspace {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.editor-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 250px;
}

/* Tab bar */
.tab-bar {
  display: flex;
  align-items: center;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  height: 36px;
  flex-shrink: 0;
  overflow-x: auto;
}
.tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  height: 100%;
  border-right: 1px solid var(--border);
  font-size: 12.5px;
  color: var(--text-secondary);
  background: var(--bg-surface);
  flex-shrink: 0;
  cursor: pointer;
  user-select: none;
  transition: background 0.1s, color 0.1s;
}
.tab:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
.tab.active {
  color: var(--text-primary);
  background: var(--bg-base);
  border-top: 2px solid var(--accent);
}
.tab-title.italic {
  font-style: italic;
  opacity: 0.85;
}
.tab-close {
  width: 16px; height: 16px;
  border: none; background: transparent;
  color: var(--text-muted); cursor: pointer;
  border-radius: 3px; font-size: 14px;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.15s, color 0.15s;
  line-height: 1;
  margin-left: 4px;
}
.tab-close:hover { background: var(--bg-hover); color: var(--text-primary); }
.dirty-dot {
  color: #fbbf24;
  font-size: 11px;
  line-height: 1;
}
.tab-empty {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 0 16px;
  color: var(--text-muted);
  font-size: 12px;
}
.tab-bar-actions {
  margin-left: auto;
  padding: 0 8px;
  display: flex;
  align-items: center;
  gap: 2px;
}
.icon-btn-sm {
  width: 26px; height: 26px;
  border: none; background: transparent;
  color: var(--text-muted);
  border-radius: 5px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.15s, color 0.15s;
}
.icon-btn-sm:hover { background: var(--bg-hover); color: var(--text-primary); }
.icon-btn-sm.active { color: var(--accent); background: var(--accent-soft); }

.ai-tab-panel {
  flex: 1;
  height: 100%;
  width: 100%;
  display: flex;
  background: var(--bg-base);
  padding: 16px;
  overflow: hidden;
}
.ai-tab-popup-full {
  position: relative !important;
  top: unset !important;
  left: unset !important;
  width: 100% !important;
  max-width: 100% !important;
  height: 100% !important;
  max-height: 100% !important;
  border-radius: 8px !important;
}



/* Terminal Options Modal (Windows) */
.terminal-modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.15s ease-out;
}

.terminal-modal-card {
  width: 360px;
  max-width: 90vw;
  background: #181a26;
  border: 1px solid var(--border-focus);
  border-radius: 10px;
  padding: 18px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.terminal-modal-header {
  display: flex;
  align-items: center;
  gap: 8px;
}
.terminal-modal-header h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--accent-light);
  margin: 0;
}

.terminal-modal-desc {
  font-size: 11.5px;
  color: #94a3b8;
  margin: 0;
  line-height: 1.4;
}

.terminal-options-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}

.terminal-opt-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
}

.terminal-opt-btn:hover {
  background: var(--accent-soft);
  border-color: var(--border-focus);
}

.opt-title {
  font-size: 12px;
  font-weight: 600;
  color: #f1f5f9;
}

.opt-sub {
  font-size: 10.5px;
  color: #94a3b8;
}

.terminal-cancel-btn {
  align-self: flex-end;
  background: transparent;
  border: none;
  color: #64748b;
  font-size: 12px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}
.terminal-cancel-btn:hover {
  color: #f1f5f9;
  background: rgba(255, 255, 255, 0.08);
}
</style>
