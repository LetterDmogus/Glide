<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, defineAsyncComponent, nextTick } from 'vue'
import TitleBar from './components/TitleBar.vue'
import FileExplorer from './components/FileExplorer.vue'
import DocumentOutline from './components/DocumentOutline.vue'
import TabBar from './components/TabBar.vue'
import EditorPanel from './components/EditorPanel.vue'
import MediaPanel from './components/MediaPanel.vue'
import PlanEditor from './components/PlanEditor.vue'
import PreviewPanel from './components/PreviewPanel.vue'
import SettingsView from './components/SettingsView.vue'
import ProjectSearch from './components/ProjectSearch.vue'
import TerminalChoiceModal from './components/TerminalChoiceModal.vue'

// Lazy Load / Defer Heavy Secondary Components to Reclaim Initial RAM
const Dashboard = defineAsyncComponent(() => import('./components/Dashboard.vue'))
const CreateProjectModal = defineAsyncComponent(() => import('./components/CreateProjectModal.vue'))
const CommandPalette = defineAsyncComponent(() => import('./components/CommandPalette.vue'))
const ConfirmModal = defineAsyncComponent(() => import('./components/ConfirmModal.vue'))
const MendeleyGuideModal = defineAsyncComponent(() => import('./components/MendeleyGuideModal.vue'))
const SkillsView = defineAsyncComponent(() => import('./components/SkillsView.vue'))
import AiInlinePopup from './components/AiInlinePopup.vue'
import { compilerSettings } from './utils/settings'
import { 
  TerminalSquare, Folder, Settings, SquareCode, BookOpen,
  Loader2, CheckCircle2, AlertTriangle, FileText, X, Activity, Cpu
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
const createModalPreset    = ref<string | undefined>(undefined)

function openCreateProjectModal(preset?: string) {
  createModalPreset.value = preset
  showCreateModal.value = true
}
const showCommandPalette   = ref(false)
const showMendeleyGuide    = ref(false)
const showSkillsModal      = ref(false)

// ── Project Structure Validator State (Floating Toast & Report File) ──
const validatorToast = ref<{
  show: boolean
  status: 'validating' | 'healthy' | 'issues' | 'error'
  title: string
  sub: string
  reportPath?: string
} | null>(null)
let validatorToastTimer: any = null

async function runProjectValidator() {
  if (!projectPath.value) {
    showAlert('Silakan buka folder proyek terlebih dahulu sebelum menjalankan validator.', 'Validator Proyek', 'error')
    return
  }

  if (validatorToastTimer) clearTimeout(validatorToastTimer)
  validatorToast.value = {
    show: true,
    status: 'validating',
    title: 'Validating Project Structure...',
    sub: 'Memeriksa bab, konfigurasi, sitasi, dan aset gambar'
  }

  try {
    const report = await window.electronAPI?.runValidator?.(projectPath.value)
    if (!report) {
      validatorToast.value = {
        show: true,
        status: 'error',
        title: 'Validasi Gagal',
        sub: 'Tidak dapat memperoleh hasil analisis proyek.'
      }
      validatorToastTimer = setTimeout(() => { validatorToast.value = null }, 5000)
      return
    }

    if (report.passed && report.issues.length === 0) {
      validatorToast.value = {
        show: true,
        status: 'healthy',
        title: 'Project Structure is Healthy! (100%)',
        sub: 'Semua file bab, config, dan sitasi tertata dengan baik.'
      }
      validatorToastTimer = setTimeout(() => { validatorToast.value = null }, 6000)
    } else {
      // Buat file validation-report.md di folder proyek agar user bisa membaca & memperbaiki langsung
      const dateStr = new Date(report.timestamp).toLocaleString('id-ID')
      const issuesMd = report.issues.map((issue, idx) => {
        const badge = issue.type === 'error' ? '❌ **[ERROR]**' : (issue.type === 'warning' ? '⚠️ **[WARN]**' : 'ℹ️ **[INFO]**')
        const fileRef = issue.file ? `\n   - **File:** \`${issue.file}\`${issue.line ? ` (Baris ${issue.line})` : ''}` : ''
        const suggestion = issue.suggestion ? `\n   - **Saran:** ${issue.suggestion}` : ''
        return `${idx + 1}. ${badge} **[${issue.category.toUpperCase()}]** ${issue.message}${fileRef}${suggestion}`
      }).join('\n\n')

      const reportContent = `# 🛡️ Project Validation Report

> **Waktu Pemeriksaan:** ${dateStr}  
> **Status:** ${report.passed ? '✅ Lolos dengan Catatan' : '❌ Perlu Perbaikan'}  
> **Health Score:** ${report.score}/100  
> **Ringkasan:** ${report.errorCount} Error, ${report.warningCount} Warning, ${report.infoCount} Info  

---

## 📋 Temuan & Catatan

${issuesMd || '_Tidak ada isu terdeteksi._'}

---
*Laporan ini dibuat otomatis oleh Glide Project Validator.*
`
      const reportFilePath = `${projectPath.value}/validation-report.md`
      await window.electronAPI?.createFile?.(reportFilePath, reportContent)
      await refreshFileTree()

      const issueSummary = `${report.errorCount > 0 ? report.errorCount + ' Error' : ''}${report.errorCount > 0 && report.warningCount > 0 ? ', ' : ''}${report.warningCount > 0 ? report.warningCount + ' Warning' : ''}` || 'Catatan terdeteksi'

      validatorToast.value = {
        show: true,
        status: 'issues',
        title: `Validation: ${issueSummary} (Score: ${report.score}%)`,
        sub: 'Laporan telah dibuat di validation-report.md',
        reportPath: reportFilePath
      }
    }
  } catch (err: any) {
    validatorToast.value = {
      show: true,
      status: 'error',
      title: 'Validasi Error',
      sub: err.message || 'Terjadi kesalahan saat memvalidasi proyek.'
    }
    validatorToastTimer = setTimeout(() => { validatorToast.value = null }, 5000)
  }
}

function openValidationReport() {
  if (validatorToast.value?.reportPath) {
    openFile(validatorToast.value.reportPath)
    validatorToast.value = null
  }
}

function onValidatorToastClick() {
  if (validatorToast.value?.reportPath) {
    openValidationReport()
  }
}

// ── Real-time Resource Monitor State ──
const systemMetrics = ref<{
  totalCpu: number
  totalMemoryMB: number
  processes: Array<{ pid: number; type: string; cpuPercent: number; memoryMB: number }>
}>({
  totalCpu: 0,
  totalMemoryMB: 0,
  processes: []
})
const showMetricsPopover = ref(false)
let metricsTimer: any = null

async function updateSystemMetrics() {
  try {
    const res = await window.electronAPI?.getSystemMetrics?.()
    if (res?.success) {
      systemMetrics.value = {
        totalCpu: res.totalCpu,
        totalMemoryMB: res.totalMemoryMB,
        processes: res.processes || []
      }
    }
  } catch {
    // ignore
  }
}

const showSettings         = ref(false)
const showProjectSearch    = ref(false)
const showSidebar          = ref(true)
const sidebarViewMode      = ref<'outline' | 'files'>((localStorage.getItem('glide_sidebar_view_mode') as 'outline' | 'files') || 'outline')

function setSidebarView(mode: 'outline' | 'files') {
  if (showSidebar.value && sidebarViewMode.value === mode) {
    showSidebar.value = false
  } else {
    showSidebar.value = true
    sidebarViewMode.value = mode
    localStorage.setItem('glide_sidebar_view_mode', mode)
  }
}

const showEditor           = ref(true)
const showTerminal   = ref(false)
const showPreview    = ref(true) // Split view preview side-by-side
const isPreviewDetached = ref(false) // True when preview is popped out to external window
const isPreviewSwapped = ref(localStorage.getItem('glide_preview_swapped') === 'true') // True: Preview in center/left, Editor on right
const showHiddenFiles = ref(localStorage.getItem('glide_show_hidden_files') === 'true')

function toggleSwapPanels() {
  isPreviewSwapped.value = !isPreviewSwapped.value
  localStorage.setItem('glide_preview_swapped', String(isPreviewSwapped.value))
}
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
  let newWidth: number
  if (isPreviewSwapped.value) {
    // Saat swapped, preview berada di kiri (setelah sidebar jika sidebar terbuka)
    const offsetLeft = showSidebar.value ? sidebarWidth.value + 48 : 48
    newWidth = e.clientX - offsetLeft
  } else {
    // Normal: preview berada di sisi kanan layar
    newWidth = window.innerWidth - e.clientX
  }
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
    checkAndPromptTypstInstall()
  }
}

async function checkAndPromptTypstInstall() {
  try {
    const status = await window.electronAPI?.checkTypstStatus?.()
    if (!status || status.type !== 'cli') {
      const confirmInstall = await showConfirm(
        'Typst CLI is not installed on your system PATH.\n\nWould you like to install Typst CLI now for maximum compilation speed?',
        'Install Typst CLI'
      )
      if (confirmInstall) {
        openExternalTerminal()
      }
    }
  } catch (err) {
    console.warn('Failed to check Typst CLI status:', err)
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
    checkAndPromptTypstInstall()
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

async function openOrCreateConfig() {
  if (!projectPath.value) return
  const configPath = `${projectPath.value}/config.yaml`
  const existing = await window.electronAPI?.readFile?.(configPath)
  if (existing === null || existing === undefined) {
    const glidePath = `${projectPath.value}/glide.yaml`
    const existingGlide = await window.electronAPI?.readFile?.(glidePath)
    if (existingGlide !== null && existingGlide !== undefined) {
      openFile(glidePath)
      return
    }
    const defaultCfg = `# ╔══════════════════════════════════════════════╗
# ║          Konfigurasi Dokumen Glide           ║
# ╚══════════════════════════════════════════════╝

title: "${projectName.value || 'Dokumen Tugas'}"
author: "Penulis"
theme: "default"

margin_top: "3cm"
margin_bottom: "3cm"
margin_left: "4cm"
margin_right: "3cm"

font_family: "'Times New Roman', serif"
font_size: "12pt"
line_spacing: 1.5
text_align: "justify"
citation_style: "apa"
`
    await window.electronAPI?.createFile?.(configPath, defaultCfg)
    await refreshFileTree()
  }
  openFile(configPath)
}

async function revealCurrentInExplorer() {
  const target = activeFile.value || projectPath.value
  if (target && window.electronAPI?.showItemInFolder) {
    await window.electronAPI.showItemInFolder(target)
  }
}

async function openOrCreateCover() {
  if (!projectPath.value) return
  const coverPath = `${projectPath.value}/cover.typ`
  const existing = await window.electronAPI?.readFile?.(coverPath)
  if (existing === null || existing === undefined) {
    const docTitle = (glideConfig.value?.title || projectName.value || 'JUDUL DOKUMEN').toUpperCase()
    const docAuthor = glideConfig.value?.author || 'Nama Penulis'
    const defaultCover = `---
layout: "cover"
---
#align(center)[
  #set text(size: 16pt, weight: "bold")
  ${docTitle}

  #v(5em)

  #set text(size: 12pt, weight: "bold")
  Disusun oleh: \\
  ${docAuthor}

  #v(6em)

  #datetime.today().year().display()
]
`
    await window.electronAPI?.createFile?.(coverPath, defaultCover)
    await refreshFileTree()
  }
  openFile(coverPath)
}

async function createNewSection(sectionTitle: string) {
  if (!projectPath.value || !sectionTitle.trim()) return
  const sectionsDir = `${projectPath.value}/sections`
  await window.electronAPI?.createDir?.(sectionsDir)

  const existingNums = glideSections.value
    .map(s => {
      const match = s.name.match(/^(\d+)/)
      return match ? parseInt(match[1], 10) : 0
    })
    .filter(n => n > 0)

  const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : (glideSections.value.filter(s => s.name !== 'cover.typ').length + 1)
  const paddedNum = String(nextNum).padStart(2, '0')

  const slug = sectionTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'bab'
  const fileName = `${paddedNum}_${slug}.typ`
  const filePath = `${sectionsDir}/${fileName}`

  const headingTitle = sectionTitle.trim().toUpperCase()
  const content = `---
layout: "main"
---
= ${headingTitle}

Tulis isi ${sectionTitle.trim()} di sini...
`
  const success = await window.electronAPI?.createFile?.(filePath, content)
  if (success) {
    await refreshFileTree()
    openFile(filePath)
    if (isGlide.value) triggerPreview()
  }
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

async function moveItem(srcPath: string, destDir: string) {
  if (!srcPath || !destDir) return

  const cleanSrc = srcPath.replace(/\\/g, '/')
  const cleanDestDir = destDir.replace(/\\/g, '/').replace(/\/$/, '')
  const itemName = cleanSrc.split('/').pop() || ''
  const currentParent = cleanSrc.split('/').slice(0, -1).join('/')

  // Jika dipindah ke folder yang sama, abaikan
  if (cleanDestDir === currentParent) return

  // Cegah memindahkan folder ke dalam dirinya sendiri
  if (cleanDestDir === cleanSrc || cleanDestDir.startsWith(`${cleanSrc}/`)) {
    showAlert(`⚠️ Tidak dapat memindahkan folder "${itemName}" ke dalam dirinya sendiri.`, 'Peringatan', 'error')
    return
  }

  const newPath = `${cleanDestDir}/${itemName}`

  // Cek apakah item dengan nama yang sama sudah ada di target
  const targetDirTree = await window.electronAPI?.readDir?.(cleanDestDir)
  const existingNode = Array.isArray(targetDirTree) ? targetDirTree.find(node => node.name.toLowerCase() === itemName.toLowerCase()) : null

  if (existingNode) {
    const shouldOverwrite = await showConfirm(
      `File atau folder bernama "${itemName}" sudah ada di folder tujuan.\nApakah Anda ingin menimpa (overwrite) file tersebut?`,
      'Nama File Duplikat'
    )
    if (!shouldOverwrite) return
    // Hapus target lama terlebih dahulu jika user setuju menimpa
    await window.electronAPI?.deleteItem?.(newPath)
  }

  const success = await window.electronAPI?.renameItem?.(srcPath, newPath)
  if (success) {
    // Update tab aktif jika file yang dipindah sedang dibuka
    const tab = openTabs.value.find(t => t.path.replace(/\\/g, '/') === cleanSrc)
    if (tab) {
      tab.path = newPath
      tab.name = itemName
    }
    if (activeFile.value && activeFile.value.replace(/\\/g, '/') === cleanSrc) {
      activeFile.value = newPath
    }
    await refreshFileTree()
    if (isGlide.value) triggerPreview()
  } else {
    showAlert(`Gagal memindahkan "${itemName}". Periksa izin akses folder.`, 'Error', 'error')
  }
}

async function uploadImages(targetDir: string, files: FileList) {
  const destFolder = targetDir || (propsPath() ? `${propsPath()}/images` : '')
  if (!destFolder) return

  let count = 0
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const srcPath = (file as any).path
    if (srcPath) {
      const destPath = `${destFolder}/${file.name}`

      // Cek tabrakan nama file eksternal
      const existing = await window.electronAPI?.readFile?.(destPath)
      if (existing !== null && existing !== undefined) {
        const replace = await showConfirm(
          `File "${file.name}" sudah ada di folder tujuan.\nApakah Anda ingin menggantinya?`,
          'File Sudah Ada'
        )
        if (!replace) continue
      }

      const ok = await window.electronAPI?.copyFile?.(srcPath, destPath)
      if (ok) count++
    }
  }
  if (count > 0) {
    await refreshFileTree()
    if (isGlide.value) triggerPreview()
  }
}

function propsPath() {
  return projectPath.value || ''
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

async function handleOpenHeading(data: { filePath: string; headingText: string; line: number }) {
  await openFile(data.filePath)
  nextTick(() => {
    editorRef.value?.jumpToText(data.headingText)
  })
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

function syncToExternalPreview() {
  if (window.electronAPI?.syncPreviewWindow) {
    window.electronAPI.syncPreviewWindow({
      pages: JSON.parse(JSON.stringify(previewPages.value || [])),
      loading: previewLoading.value,
      error: previewError.value,
      projectDir: projectPath.value
    })
  }
}

async function triggerPreview() {
  if (!projectPath.value) return
  if (previewTimer) clearTimeout(previewTimer)

  previewTimer = setTimeout(async () => {
    previewLoading.value = true
    previewError.value = undefined
    syncToExternalPreview()

    const mode = compilerSettings.value.rendererMode || 'cli'
    const res = await window.electronAPI?.previewPdf?.(projectPath.value!, mode)
    previewLoading.value = false

    if (res?.success && res.pages) {
      previewPages.value = res.pages
    } else {
      previewError.value = res?.error || 'Gagal menderender dokumen Typst.'
    }
    syncToExternalPreview()
  }, 300)
}

// Re-render jika user mengubah Renderer Engine di Settings (CLI <-> WASM)
watch(() => compilerSettings.value.rendererMode, () => {
  if (projectPath.value) {
    triggerPreview()
  }
})

async function popoutPreview() {
  if (window.electronAPI?.openPreviewWindow) {
    try {
      isPreviewDetached.value = true
      showPreview.value = false
      syncToExternalPreview()
      
      const success = await window.electronAPI.openPreviewWindow()
      if (success) {
        setTimeout(() => { syncToExternalPreview() }, 100)
        setTimeout(() => { syncToExternalPreview() }, 400)
        setTimeout(() => { syncToExternalPreview() }, 800)
      } else {
        dockPreview()
        showAlert('Gagal membuka jendela preview eksternal.', 'Pop-out Preview', 'error')
      }
    } catch (err: any) {
      console.error('Error opening external preview window:', err)
      dockPreview()
      showAlert(`Gagal membuka jendela preview eksternal:\n${err?.message || err}`, 'Pop-out Preview', 'error')
    }
  }
}

function dockPreview() {
  isPreviewDetached.value = false
  showPreview.value = true
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
let unwatchPreviewClose: (() => void) | null = null
let unwatchPreviewRefresh: (() => void) | null = null
let unwatchPreviewBuild: (() => void) | null = null
let unwatchPreviewExplain: (() => void) | null = null

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

const updateAvailableInfo = ref<{
  latestVersion: string
  releaseUrl: string
  releaseName: string
} | null>(null)

function openExternalRelease(url?: string) {
  if (url && window.electronAPI?.openExternal) {
    window.electronAPI.openExternal(url)
  }
}

onMounted(() => {
  const lastProject = localStorage.getItem('glide_last_project')
  if (lastProject) {
    loadProjectByPath(lastProject)
  }

  // Silent Check for Updates on App Launch
  setTimeout(async () => {
    try {
      const res = await window.electronAPI?.checkUpdate?.()
      if (res?.isUpdateAvailable) {
        updateAvailableInfo.value = {
          latestVersion: res.latestVersion || '',
          releaseUrl: res.releaseUrl || 'https://github.com/LetterDmogus/Glide/releases',
          releaseName: res.releaseName || res.latestVersion || ''
        }
      }
    } catch {
      // Ignore background check failure
    }
  }, 3000)

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

  // Listeners dari External Preview Window
  if (window.electronAPI?.onPreviewWindowClosed) {
    unwatchPreviewClose = window.electronAPI.onPreviewWindowClosed(() => {
      dockPreview()
    })
  }

  if (window.electronAPI?.onPreviewRequestRefresh) {
    unwatchPreviewRefresh = window.electronAPI.onPreviewRequestRefresh(() => {
      syncToExternalPreview()
      triggerPreview()
    })
  }

  if (window.electronAPI?.onPreviewRequestBuildPdf) {
    unwatchPreviewBuild = window.electronAPI.onPreviewRequestBuildPdf(() => {
      triggerBuildPdf()
    })
  }

  if (window.electronAPI?.onPreviewRequestExplainError) {
    unwatchPreviewExplain = window.electronAPI.onPreviewRequestExplainError((err) => {
      openAiExplainTab(err)
    })
  }

  // Polling Resource Monitor setiap 2 detik
  updateSystemMetrics()
  metricsTimer = setInterval(updateSystemMetrics, 2000)
})

onBeforeUnmount(() => {
  if (metricsTimer) clearInterval(metricsTimer)
  if (unwatchFileEvents) unwatchFileEvents()
  if (unwatchPreviewClose) unwatchPreviewClose()
  if (unwatchPreviewRefresh) unwatchPreviewRefresh()
  if (unwatchPreviewBuild) unwatchPreviewBuild()
  if (unwatchPreviewExplain) unwatchPreviewExplain()
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
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault()
    saveFile()
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
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'x') {
    e.preventDefault()
    toggleSwapPanels()
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
  if (e.shiftKey && e.altKey && e.key.toLowerCase() === 'r') {
    e.preventDefault()
    revealCurrentInExplorer()
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
      :show-editor="showEditor"
      :show-terminal="showTerminal"
      :show-preview="showPreview"
      :is-preview-swapped="isPreviewSwapped"
      @open-folder="openFolder"
      @create-project="showCreateModal = true"
      @close-folder="closeCurrentFolder"
      @open-bib="openOrCreateBibliography"
      @save-file="() => saveFile()"
      @reveal-in-explorer="revealCurrentInExplorer"
      @toggle-sidebar="showSidebar = !showSidebar"
      @toggle-editor="showEditor = !showEditor"
      @toggle-terminal="openExternalTerminal"
      @toggle-preview="showPreview = !showPreview"
      @swap-panels="toggleSwapPanels"
      @export-pdf="triggerBuildPdf"
      @export-docx="triggerBuildDocx"
      @open-mendeley-guide="showMendeleyGuide = true"
      @open-skills-store="showSkillsModal = true"
      @open-validator="runProjectValidator"
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
          <!-- Outline / Struktur Dokumen Tab -->
          <button 
            class="activity-btn" 
            :class="{ active: showSidebar && sidebarViewMode === 'outline' }"
            @click="setSidebarView('outline')"
            title="Struktur Dokumen (Bab & Pengaturan)"
          >
            <BookOpen :size="20" />
          </button>

          <!-- File Explorer Tab -->
          <button 
            class="activity-btn" 
            :class="{ active: showSidebar && sidebarViewMode === 'files' }"
            @click="setSidebarView('files')"
            title="File Explorer (Ctrl+B)"
          >
            <Folder :size="20" />
          </button>

          <button class="activity-btn" @click="showProjectSearch = true" title="Search in Project">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
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
          <!-- Resource Monitor Mini Gauge & Trigger -->
          <div class="metrics-trigger-wrapper">
            <button 
              class="activity-btn metrics-btn" 
              :class="{ active: showMetricsPopover }"
              @click="showMetricsPopover = !showMetricsPopover"
              title="Glide Resource Monitor (CPU & RAM)"
            >
              <Cpu :size="18" />
              <span class="metrics-mini-badge" :class="{ 'metrics-warning': systemMetrics.totalMemoryMB > 500 }">
                {{ systemMetrics.totalMemoryMB }}M
              </span>
            </button>

            <!-- Resource Monitor Breakdown Popover -->
            <Transition name="panel-fade">
              <div v-if="showMetricsPopover" class="metrics-popover" @click.stop>
                <div class="metrics-popover-header">
                  <div class="metrics-popover-title">
                    <Activity :size="13" class="icon-accent" />
                    <span>RESOURCE MONITOR</span>
                  </div>
                  <button class="metrics-popover-close" @click="showMetricsPopover = false" title="Tutup">
                    <X :size="12" />
                  </button>
                </div>

                <div class="metrics-stats-summary">
                  <div class="metric-card">
                    <span class="metric-label">TOTAL RAM</span>
                    <span class="metric-val" :class="{ 'metric-high': systemMetrics.totalMemoryMB > 500 }">
                      {{ systemMetrics.totalMemoryMB }} <span class="metric-unit">MB</span>
                    </span>
                  </div>
                  <div class="metric-card">
                    <span class="metric-label">TOTAL CPU</span>
                    <span class="metric-val" :class="{ 'metric-high': systemMetrics.totalCpu > 40 }">
                      {{ systemMetrics.totalCpu }} <span class="metric-unit">%</span>
                    </span>
                  </div>
                </div>

                <div class="metrics-process-list">
                  <div class="metrics-process-head">PROCESS BREAKDOWN</div>
                  <div 
                    v-for="proc in systemMetrics.processes" 
                    :key="proc.pid" 
                    class="metrics-process-row"
                  >
                    <div class="metrics-proc-name">
                      <span class="proc-type">{{ proc.type }}</span>
                      <span class="proc-pid">PID {{ proc.pid }}</span>
                    </div>
                    <div class="metrics-proc-usage">
                      <span class="proc-cpu">{{ proc.cpuPercent }}% CPU</span>
                      <span class="proc-ram">{{ proc.memoryMB }} MB</span>
                    </div>
                  </div>
                </div>
              </div>
            </Transition>
          </div>

          <button class="activity-btn" title="Settings" @click="showSettingsModal">
            <Settings :size="20" />
          </button>
        </div>
      </div>

      <!-- Sidebar with Minimal Header, Views & Drag Handle -->
      <Transition name="sidebar-slide">
        <div 
          v-if="showSidebar" 
          class="sidebar-wrapper" 
          :style="{ width: `${sidebarWidth}px` }"
        >
          <!-- Document Outline View -->
          <div v-show="sidebarViewMode === 'outline'" class="sidebar-view-pane">
            <DocumentOutline
              :project-path="projectPath"
              :is-glide="isGlide"
              :config="glideConfig"
              :sections="glideSections"
              :active-file="activeFile"
              @open-file="openFile"
              @open-heading="handleOpenHeading"
              @open-config="openOrCreateConfig"
              @open-bib="openOrCreateBibliography"
              @open-cover="openOrCreateCover"
              @create-section="createNewSection"
              @delete-section="deleteFileOrFolder"
              @refresh="refreshFileTree"
              @validate="runProjectValidator"
              @switch-to-files="sidebarViewMode = 'files'"
            />
          </div>

          <!-- File Explorer View -->
          <div v-show="sidebarViewMode === 'files'" class="sidebar-view-pane">
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
              @move-item="moveItem"
              @delete-item="deleteFileOrFolder"
              @upload-image="uploadImages"
              @toggle-hidden="toggleHiddenFiles"
              @open-config="openOrCreateConfig"
              @open-bib="openOrCreateBibliography"
            />
          </div>
          <!-- Resize Handle Right -->
          <div class="resize-handle handle-right" @mousedown="startSidebarDrag"></div>
        </div>
      </Transition>

      <!-- Main editor area + terminal OR Dashboard -->
      <Dashboard
        v-if="!projectPath"
        @open-folder="openFolder"
        @open-project-path="loadProjectByPath"
        @create-project="openCreateProjectModal"
      />

      <div v-else class="main-area">
        <!-- Multi Tab Bar Component -->
        <TabBar
          :open-tabs="openTabs"
          :active-file="activeFile"
          @select-tab="selectTab"
          @close-tab="closeTab"
          @pin-tab="(tab) => tab.isPreview = false"
        />

        <!-- Split View Content: Editor / Media / AI Tab vs Live Preview -->
        <div class="split-workspace" :class="{ 'swapped-panels': isPreviewSwapped }">
          <!-- Main Workspace: MediaPanel vs AiTab vs EditorPanel -->
          <div v-if="showEditor" class="editor-container">
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

          <!-- Side-by-Side / Full Width Resizable Live Preview Panel -->
          <Transition name="preview-fade">
            <div 
              v-if="showPreview" 
              class="preview-wrapper" 
              :style="showEditor ? { width: `${previewWidth}px` } : { flex: 1, width: '100%' }"
            >
              <!-- Resize Handle (di kiri jika preview di kanan, di kanan jika preview di kiri) -->
              <div 
                v-if="showEditor" 
                class="resize-handle" 
                :class="isPreviewSwapped ? 'handle-right' : 'handle-left'" 
                @mousedown="startPreviewDrag"
              ></div>
              <PreviewPanel
                :pages="previewPages"
                :loading="previewLoading"
                :error="previewError"
                :project-dir="projectPath"
                :is-external="false"
                @refresh="triggerPreview"
                @build-pdf="triggerBuildPdf"
                @explain-error="openAiExplainTab"
                @popout="popoutPreview"
              />
            </div>
          </Transition>

          <!-- Placeholder when both Editor and Preview are toggled off -->
          <div v-if="!showEditor && !showPreview" class="empty-panels-placeholder">
            <div class="empty-placeholder-card">
              <div class="empty-icon-wrap">
                <SquareCode :size="32" class="icon-muted" />
              </div>
              <h3>No panels are currently open</h3>
              <p>Re-open the Code Editor or Live Preview using the toggle buttons in the top right bar.</p>
              <div class="empty-actions">
                <button class="panel-btn primary" @click="showEditor = true">
                  <span>Open Code Editor</span>
                </button>
                <button class="panel-btn primary" @click="showPreview = true">
                  <span>Open Live Preview</span>
                </button>
              </div>
            </div>
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

    <!-- Terminal Selection Modal (Windows Component) -->
    <TerminalChoiceModal
      v-if="showTerminalModal"
      @select="launchTerminalChoice"
      @close="showTerminalModal = false"
    />

    <!-- Skills & AI Rules Store View -->
    <SkillsView
      v-if="showSkillsModal"
      :project-path="projectPath"
      @close="showSkillsModal = false"
      @skill-installed="() => { if (projectPath) loadProjectByPath(projectPath); }"
      @run-validator="runProjectValidator"
    />

    <!-- Mendeley Guide Modal -->
    <MendeleyGuideModal
      v-if="showMendeleyGuide"
      @close="showMendeleyGuide = false"
    />

    <!-- Create Project Modal -->
    <CreateProjectModal
      v-if="showCreateModal"
      :initial-preset="createModalPreset"
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

    <!-- Project Structure Validator Floating Toast Banner (Windows Style) -->
    <Transition name="panel-fade">
      <div 
        v-if="validatorToast?.show" 
        class="win-toast-banner validator-toast-banner"
        :class="{
          'toast-status-loading': validatorToast.status === 'validating',
          'toast-status-healthy': validatorToast.status === 'healthy',
          'toast-status-issues': validatorToast.status === 'issues',
          'toast-status-error': validatorToast.status === 'error',
          'toast-clickable': !!validatorToast.reportPath
        }"
        @click="onValidatorToastClick"
        :title="validatorToast.reportPath ? 'Klik untuk membuka laporan' : ''"
      >
        <div class="win-toast-header">
          <div class="win-toast-app-info">
            <span class="win-toast-app-title">GLIDE PROJECT VALIDATOR</span>
          </div>
          <button 
            class="win-toast-close" 
            @click.stop="validatorToast = null" 
            title="Tutup"
            aria-label="Tutup"
          >
            <X :size="13" />
          </button>
        </div>

        <div class="win-toast-body">
          <div class="validator-toast-icon">
            <Loader2 v-if="validatorToast.status === 'validating'" class="spin" :size="20" />
            <CheckCircle2 v-else-if="validatorToast.status === 'healthy'" :size="20" />
            <AlertTriangle v-else :size="20" />
          </div>

          <div class="win-toast-content">
            <div class="win-toast-title">{{ validatorToast.title }}</div>
            <div class="win-toast-sub">{{ validatorToast.sub }}</div>
          </div>
        </div>

        <div v-if="validatorToast.reportPath" class="win-toast-footer">
          <span class="win-toast-hint">
            <FileText :size="12" /> Klik untuk membaca laporan
          </span>
        </div>
      </div>
    </Transition>

    <!-- Update Available Floating Toast Banner -->
    <Transition name="panel-fade">
      <div v-if="updateAvailableInfo" class="update-toast-banner">
        <div class="update-toast-content">
          <span class="update-toast-title">🚀 Glide {{ updateAvailableInfo.latestVersion }} Available</span>
          <span class="update-toast-sub">A new release is available on GitHub.</span>
        </div>
        <div class="update-toast-actions">
          <button class="toast-btn primary" @click="openExternalRelease(updateAvailableInfo.releaseUrl)">
            Update Now
          </button>
          <button class="toast-btn secondary" @click="updateAvailableInfo = null">
            Dismiss
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>


