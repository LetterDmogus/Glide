import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'
import * as yaml from 'js-yaml'
import pty from '@lydell/node-pty'
import os from 'node:os'
import https from 'node:https'
import { isGlideProject, loadGlideConfig, getGlideSections, ensureThemeInProject } from './project.ts'
import { compileTypstToPdf, compileTypstToSvgPages } from './typst.ts'
import { compileGlideToDocx } from './docx.ts'
import { listAvailableSkills, installSkillToProject } from './skills.ts'
import { validateProjectStructure } from './validator.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export function getAppResourcePath(...subPaths: string[]): string {
  if (app.isPackaged) {
    // Mode Production: extraResources berada di process.resourcesPath
    const resourcePath = path.join(process.resourcesPath, ...subPaths)
    return resourcePath
  }
  // Mode Development
  return path.join(process.env.APP_ROOT, ...subPaths)
}

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

// ── Chromium Memory & Hardware Optimizations ───────────────────
app.commandLine.appendSwitch('disable-site-isolation-trials')
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=256')
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache')

let win: BrowserWindow | null
// Map multi-session terminal: id -> pty.IPty
const ptySessions = new Map<string, pty.IPty>()
const activeFileWatchers = new Map<string, any>()

ipcMain.handle('watcher:watchFiles', async (_e, filePaths: string[]) => {
  // Tutup watcher lama yang tidak ada di daftar filePaths baru
  const newPathSet = new Set((filePaths || []).map(p => path.normalize(p)))
  for (const [watchedPath, watcher] of activeFileWatchers.entries()) {
    if (!newPathSet.has(watchedPath)) {
      try { watcher.close() } catch {}
      activeFileWatchers.delete(watchedPath)
    }
  }

  // Pasang watcher khusus untuk file yang ada di tab saja
  const fsSync = await import('node:fs')
  for (const p of newPathSet) {
    if (!activeFileWatchers.has(p)) {
      try {
        let debounceTimer: any = null
        const w = fsSync.watch(p, (eventType) => {
          if (debounceTimer) clearTimeout(debounceTimer)
          debounceTimer = setTimeout(() => {
            win?.webContents.send('fs:file-changed', { eventType, fullPath: p })
          }, 150)
        })
        activeFileWatchers.set(p, w)
      } catch {}
    }
  }
  return true
})

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    backgroundColor: '#0f1117',
    icon: path.join(process.env.APP_ROOT, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
      plugins: true,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }

  // Disable Electron default zoom shortcuts (Ctrl +, Ctrl -, Ctrl 0) & Reset Zoom
  win.webContents.on('did-finish-load', () => {
    win?.webContents.setZoomFactor(1.0)
    win?.webContents.setZoomLevel(0)
    win?.webContents.setVisualZoomLevelLimits(1, 1)
  })

  win.webContents.on('zoom-changed', (e) => {
    e.preventDefault()
  })

  // Prevent zoom key combos inside window
  win.webContents.on('before-input-event', (event, input) => {
    if ((input.control || input.meta) && (input.key === '-' || input.key === '=' || input.key === '+' || input.key === '0')) {
      event.preventDefault()
    }
  })

  // Window Maximize / Unmaximize State Listeners
  win.on('maximize', () => {
    win?.webContents.send('window:maximized-change', true)
  })

  win.on('unmaximize', () => {
    win?.webContents.send('window:maximized-change', false)
  })

  win.on('closed', () => {
    win = null
    if (previewWin) {
      previewWin.close()
      previewWin = null
    }
  })
}

// ── External Preview Window State & Handlers ─────────────────────
let previewWin: BrowserWindow | null = null
let cachedPreviewData: { pages: string[]; loading: boolean; error?: string; projectDir?: string } | null = null

function createPreviewWindow() {
  if (previewWin) {
    if (previewWin.isMinimized()) previewWin.restore()
    previewWin.focus()
    return
  }

  previewWin = new BrowserWindow({
    width: 900,
    height: 850,
    minWidth: 480,
    minHeight: 500,
    frame: false,
    show: true,
    backgroundColor: '#0f1117',
    icon: path.join(process.env.APP_ROOT, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
      plugins: true,
    },
  })

  // Gunakan hash navigation (#preview) agar aman baik di dev server maupun file:// production
  if (VITE_DEV_SERVER_URL) {
    previewWin.loadURL(`${VITE_DEV_SERVER_URL}#preview`)
  } else {
    previewWin.loadFile(path.join(RENDERER_DIST, 'index.html'), { hash: 'preview' })
  }

  previewWin.webContents.on('did-fail-load', (_e, errorCode, errorDescription) => {
    console.error('External preview window failed to load:', errorCode, errorDescription)
  })

  previewWin.webContents.on('did-finish-load', () => {
    previewWin?.webContents.setZoomFactor(1.0)
    previewWin?.webContents.setZoomLevel(0)
    previewWin?.webContents.setVisualZoomLevelLimits(1, 1)

    // Kirim data cache saat window selesai loading DOM
    if (cachedPreviewData) {
      previewWin?.webContents.send('previewWindow:data', cachedPreviewData)
    }
  })

  previewWin.on('maximize', () => {
    previewWin?.webContents.send('window:maximized-change', true)
  })

  previewWin.on('unmaximize', () => {
    previewWin?.webContents.send('window:maximized-change', false)
  })

  previewWin.on('closed', () => {
    previewWin = null
    win?.webContents.send('previewWindow:closed')
  })
}

ipcMain.handle('previewWindow:open', () => {
  createPreviewWindow()
  return true
})

ipcMain.handle('previewWindow:close', () => {
  if (previewWin) {
    previewWin.close()
    previewWin = null
  }
  return true
})

ipcMain.handle('previewWindow:isOpen', () => {
  return previewWin !== null && !previewWin.isDestroyed()
})

ipcMain.handle('previewWindow:sync', (_e, data: { pages: string[]; loading: boolean; error?: string; projectDir?: string }) => {
  cachedPreviewData = data
  if (previewWin && !previewWin.isDestroyed()) {
    previewWin.webContents.send('previewWindow:data', data)
  }
  return true
})

ipcMain.handle('previewWindow:getInitialData', () => {
  return cachedPreviewData
})

// Forward relay events dari preview window ke main window
ipcMain.handle('previewWindow:requestRefresh', () => {
  win?.webContents.send('previewWindow:requestRefresh')
  return true
})

ipcMain.handle('previewWindow:requestBuildPdf', () => {
  win?.webContents.send('previewWindow:requestBuildPdf')
  return true
})

ipcMain.handle('previewWindow:requestExplainError', (_e, errorMsg: string) => {
  win?.webContents.send('previewWindow:requestExplainError', errorMsg)
  return true
})

// ── Window controls IPC (mendukung main window maupun preview window) ──
ipcMain.handle('window:minimize', (e) => {
  const targetWin = BrowserWindow.fromWebContents(e.sender) || win
  targetWin?.minimize()
})
ipcMain.handle('window:maximize', (e) => {
  const targetWin = BrowserWindow.fromWebContents(e.sender) || win
  if (targetWin?.isMaximized()) targetWin.unmaximize()
  else targetWin?.maximize()
})
ipcMain.handle('window:isMaximized', (e) => {
  const targetWin = BrowserWindow.fromWebContents(e.sender) || win
  return targetWin?.isMaximized() || false
})
ipcMain.handle('window:close', (e) => {
  const targetWin = BrowserWindow.fromWebContents(e.sender) || win
  targetWin?.close()
})

// ── Terminal Multi-Session PTY IPC ─────────────────────────────────
ipcMain.handle('terminal:open', (_e, id: string, cwd?: string) => {
  if (ptySessions.has(id)) {
    const existing = ptySessions.get(id)
    existing?.kill()
    ptySessions.delete(id)
  }

  const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash'
  const workDir = cwd && cwd.trim() ? cwd : os.homedir()

  try {
    const proc = pty.spawn(shell, [], {
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      cwd: workDir,
      env: process.env as Record<string, string>
    })

    proc.onData((data: string) => {
      win?.webContents.send(`terminal:data:${id}`, data)
    })

    ptySessions.set(id, proc)
    return true
  } catch (err) {
    console.error(`Failed to spawn PTY shell for session ${id}:`, err)
    return false
  }
})

ipcMain.on('terminal:input', (_e, id: string, data: string) => {
  const proc = ptySessions.get(id)
  if (proc) {
    proc.write(data)
  }
})

ipcMain.handle('terminal:resize', (_e, id: string, cols: number, rows: number) => {
  const proc = ptySessions.get(id)
  if (proc && cols > 0 && rows > 0) {
    try {
      proc.resize(cols, rows)
    } catch (err) {
      console.error(`Failed to resize PTY session ${id}:`, err)
    }
  }
})

ipcMain.handle('system:openTerminal', async (_e, cwd?: string, shellType: 'powershell' | 'cmd' | 'gitbash' = 'powershell') => {
  const { exec, spawn } = await import('node:child_process')
  const targetDir = cwd && cwd.trim() ? cwd : os.homedir()

  try {
    if (os.platform() === 'win32') {
      const safePath = targetDir.replace(/'/g, "''")
      if (shellType === 'cmd') {
        exec(`start cmd /k "cd /d \"${targetDir}\""`, { cwd: targetDir })
      } else if (shellType === 'gitbash') {
        const gitBashPaths = [
          'C:\\Program Files\\Git\\git-bash.exe',
          'C:\\Program Files (x86)\\Git\\git-bash.exe',
          process.env.LOCALAPPDATA + '\\Programs\\Git\\git-bash.exe'
        ]
        let found = false
        const fsSync = await import('node:fs')
        for (const p of gitBashPaths) {
          if (fsSync.existsSync(p)) {
            spawn(p, [`--cd=${targetDir}`], { detached: true, stdio: 'ignore' }).unref()
            found = true
            break
          }
        }
        // Fallback to powershell if Git Bash is not installed
        if (!found) {
          exec(`start powershell -NoExit -Command "Set-Location -LiteralPath '${safePath}'"`, { cwd: targetDir })
        }
      } else {
        // Default PowerShell
        exec(`start powershell -NoExit -Command "Set-Location -LiteralPath '${safePath}'"`, { cwd: targetDir })
      }
    } else if (os.platform() === 'darwin') {
      const child = spawn('open', ['-a', 'Terminal', targetDir], { detached: true, stdio: 'ignore' })
      child.unref()
    } else {
      const child = spawn('x-terminal-emulator', [], { cwd: targetDir, detached: true, stdio: 'ignore' })
      child.unref()
    }
  } catch (err) {
    console.error('Failed to open external terminal:', err)
  }
  return true
})

// ── Typst PDF Build & Preview IPC ─────────────────────────────
ipcMain.handle('dialog:savePdf', async (_e, defaultName?: string) => {
  const result = await dialog.showSaveDialog(win!, {
    title: 'Simpan Dokumen PDF',
    defaultPath: defaultName || 'output.pdf',
    filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
  })
  if (result.canceled || !result.filePath) return null
  return result.filePath
})

ipcMain.handle('dialog:saveDocxDialog', async (_e, defaultName?: string) => {
  const result = await dialog.showSaveDialog(win!, {
    title: 'Simpan Dokumen Microsoft Word (.docx)',
    defaultPath: defaultName || 'laporan.docx',
    filters: [{ name: 'Word Documents', extensions: ['docx'] }]
  })
  if (result.canceled || !result.filePath) return null
  return result.filePath
})

ipcMain.handle('typst:checkStatus', async () => {
  const { exec } = await import('node:child_process')
  return new Promise<{ installed: boolean; version?: string; type: 'cli' | 'builtin'; error?: string }>((resolve) => {
    // Cek dulu apakah CLI typst terpasang di sistem PATH
    exec('typst --version', (err, stdout) => {
      if (!err && stdout && stdout.trim()) {
        resolve({
          installed: true,
          version: stdout.trim(),
          type: 'cli'
        })
      } else {
        // Fallback: Glide 2.0 menyertakan WASM Built-in Compiler
        resolve({
          installed: true,
          version: 'Typst WASM Compiler (Built-in v0.11+)',
          type: 'builtin'
        })
      }
    })
  })
})

ipcMain.handle('typst:build', async (_e, projectDir: string, outputPdfPath: string) => {
  return await compileTypstToPdf(folderPathOrRoot(projectDir), getAppResourcePath(), outputPdfPath)
})

ipcMain.handle('pandoc:buildDocx', async (_e, projectDir: string, outputDocxPath: string) => {
  return await compileGlideToDocx(folderPathOrRoot(projectDir), getAppResourcePath(), outputDocxPath)
})

// ── Skills & AI Rules Manager IPC ──────────────────────────────
ipcMain.handle('skills:list', async (_e, projectPath?: string) => {
  return await listAvailableSkills(getAppResourcePath(), projectPath)
})

ipcMain.handle('skills:install', async (_e, projectPath: string, skillName: string) => {
  return await installSkillToProject(getAppResourcePath(), projectPath, skillName)
})

ipcMain.handle('validator:run', async (_e, projectDir: string) => {
  return await validateProjectStructure(folderPathOrRoot(projectDir))
})

ipcMain.handle('validator:install', async (_e, projectDir: string) => {
  const { installValidatorPluginFiles } = await import('./validator.ts')
  return await installValidatorPluginFiles(folderPathOrRoot(projectDir))
})

ipcMain.handle('typst:preview', async (_e, projectDir: string, rendererMode: 'cli' | 'wasm' = 'cli') => {
  return await compileTypstToSvgPages(folderPathOrRoot(projectDir), getAppResourcePath(), rendererMode)
})

function folderPathOrRoot(dirPath: string): string {
  return dirPath && dirPath.trim() ? dirPath : process.cwd()
}

// ── File System & Project IPC ──────────────────────────────────
ipcMain.handle('dialog:openFolder', async (_e, showHidden = false) => {
  const result = await dialog.showOpenDialog(win!, {
    properties: ['openDirectory'],
    title: 'Buka Folder Project Glide'
  })
  if (result.canceled || !result.filePaths.length) return null
  const folderPath = result.filePaths[0]
  
  const isGlide = await isGlideProject(folderPath)
  if (isGlide) {
    await ensureThemeInProject(folderPath, getAppResourcePath())
  }

  const tree = await buildFileTree(folderPath, 0, showHidden)
  const config = isGlide ? await loadGlideConfig(folderPath) : null
  const sections = isGlide ? await getGlideSections(folderPath) : []
  
  return { path: folderPath, tree, isGlide, config, sections }
})

ipcMain.handle('project:load', async (_e, folderPath: string, showHidden = false) => {
  const isGlide = await isGlideProject(folderPath)
  if (isGlide) {
    await ensureThemeInProject(folderPath, getAppResourcePath())
  }

  const config = isGlide ? await loadGlideConfig(folderPath) : null
  const sections = isGlide ? await getGlideSections(folderPath) : []
  const tree = await buildFileTree(folderPath, 0, showHidden)
  return { path: folderPath, tree, isGlide, config, sections }
})

ipcMain.handle('fs:readFile', async (_e, filePath: string) => {
  try {
    return await fs.readFile(filePath, 'utf-8')
  } catch {
    return null
  }
})

ipcMain.handle('search:project', async (_e, projectDir: string, query: string, options: { regex?: boolean; caseSensitive?: boolean } = {}) => {
  const results: Array<{ path: string; line: number; text: string }> = []
  if (!projectDir || !query.trim()) return results
  const ignored = new Set(['.git', 'node_modules', 'dist', 'dist-electron', '.gld_temp', '__pycache__', '.venv'])
  let matcher: RegExp
  try {
    matcher = options.regex
      ? new RegExp(query, options.caseSensitive ? 'g' : 'gi')
      : new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), options.caseSensitive ? 'g' : 'gi')
  } catch {
    return results
  }

  async function visit(dir: string) {
    if (results.length >= 500) return
    let entries
    try { entries = await fs.readdir(dir, { withFileTypes: true }) } catch { return }
    for (const entry of entries) {
      if (results.length >= 500 || ignored.has(entry.name)) continue
      if (!options.caseSensitive && entry.name.startsWith('.') && entry.isDirectory()) continue
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await visit(fullPath)
      } else {
        try {
          const content = await fs.readFile(fullPath, 'utf8')
          if (content.includes('\0')) continue
          content.split(/\r?\n/).forEach((line, index) => {
            matcher.lastIndex = 0
            if (matcher.test(line) && results.length < 500) {
              results.push({ path: fullPath, line: index + 1, text: line.trim().slice(0, 240) })
            }
          })
        } catch { /* inaccessible or binary file */ }
      }
    }
  }
  await visit(projectDir)
  return results
})

ipcMain.handle('fs:writeFile', async (_e, filePath: string, content: string) => {
  try {
    await fs.writeFile(filePath, content, 'utf-8')
    return true
  } catch {
    return false
  }
})

ipcMain.handle('fs:readDir', async (_e, dirPath: string) => {
  try {
    return await buildFileTree(dirPath)
  } catch {
    return []
  }
})

ipcMain.handle('fs:createFile', async (_e, filePath: string, content: string = '') => {
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, content, 'utf-8')
    return true
  } catch {
    return false
  }
})

ipcMain.handle('fs:createDir', async (_e, dirPath: string) => {
  try {
    await fs.mkdir(dirPath, { recursive: true })
    return true
  } catch {
    return false
  }
})

ipcMain.handle('fs:deleteItem', async (_e, itemPath: string) => {
  try {
    const stat = await fs.stat(itemPath)
    if (stat.isDirectory()) {
      await fs.rm(itemPath, { recursive: true, force: true })
    } else {
      await fs.unlink(itemPath)
    }
    return true
  } catch {
    return false
  }
})

ipcMain.handle('fs:copyFile', async (_e, srcPath: string, destPath: string) => {
  try {
    await fs.mkdir(path.dirname(destPath), { recursive: true })
    await fs.copyFile(srcPath, destPath)
    return true
  } catch {
    return false
  }
})

ipcMain.handle('fs:renameItem', async (_e, oldPath: string, newPath: string) => {
  try {
    await fs.rename(oldPath, newPath)
    return true
  } catch (err: any) {
    // EXDEV = cross-device rename tidak bisa, fallback ke copy + delete
    if (err.code === 'EXDEV') {
      try {
        const stat = await fs.stat(oldPath)
        if (stat.isDirectory()) {
          await fs.cp(oldPath, newPath, { recursive: true })
        } else {
          await fs.copyFile(oldPath, newPath)
        }
        await fs.rm(oldPath, { recursive: true, force: true })
        return true
      } catch (fallbackErr) {
        console.error('[renameItem EXDEV fallback]', fallbackErr)
        return false
      }
    }
    console.error('[renameItem]', err)
    return false
  }
})

// ── Bibliography Handlers ──────────────────────────────────────────
ipcMain.handle('bib:read', async (_e, projectDir: string) => {
  try {
    const bibPath = path.join(projectDir, 'bibliography.yaml')
    const content = await fs.readFile(bibPath, 'utf-8')
    const data = yaml.load(content)
    if (Array.isArray(data)) return data
    if (typeof data === 'object' && data !== null) {
      // If stored as object map key -> entry, convert to array with key as id
      return Object.entries(data).map(([key, val]: [string, any]) => ({
        id: key,
        ...val
      }))
    }
    return []
  } catch {
    return []
  }
})

ipcMain.handle('bib:save', async (_e, projectDir: string, entries: any[]) => {
  try {
    const bibPath = path.join(projectDir, 'bibliography.yaml')
    const yamlStr = yaml.dump(entries)
    await fs.writeFile(bibPath, yamlStr, 'utf-8')
    return true
  } catch {
    return false
  }
})

ipcMain.handle('fs:listImages', async (_e, dirPath: string) => {
  try {
    const imagesDir = path.join(dirPath, 'images')
    const entries = await fs.readdir(imagesDir, { withFileTypes: true })
    const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp']
    return entries
      .filter(e => e.isFile() && validExtensions.includes(path.extname(e.name).toLowerCase()))
      .map(e => ({ name: e.name, path: path.join(imagesDir, e.name) }))
  } catch {
    return []
  }
})

// ── App Update Check (GitHub Releases) ──────────────────────────
ipcMain.handle('app:checkUpdate', async () => {
  return new Promise((resolve) => {
    const currentVersion = app.getVersion()
    const options = {
      hostname: 'api.github.com',
      path: '/repos/LetterDmogus/Glide/releases/latest',
      headers: {
        'User-Agent': 'Glide-Desktop-App',
        'Accept': 'application/vnd.github.v3+json'
      }
    }

    const req = https.get(options, (res) => {
      let rawData = ''
      res.on('data', (chunk) => { rawData += chunk })
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const data = JSON.parse(rawData)
            const latestTag = (data.tag_name || '').replace(/^v/, '')
            const isUpdateAvailable = compareSemver(latestTag, currentVersion) > 0

            resolve({
              success: true,
              currentVersion,
              latestVersion: data.tag_name,
              isUpdateAvailable,
              releaseName: data.name || data.tag_name,
              releaseNotes: data.body || '',
              releaseUrl: data.html_url || 'https://github.com/LetterDmogus/Glide/releases/latest',
              publishedAt: data.published_at
            })
          } else if (res.statusCode === 404) {
            resolve({
              success: true,
              currentVersion,
              latestVersion: `v${currentVersion}`,
              isUpdateAvailable: false,
              message: 'No releases published yet.'
            })
          } else {
            resolve({
              success: false,
              currentVersion,
              error: `GitHub API error: ${res.statusCode}`
            })
          }
        } catch (err: any) {
          resolve({ success: false, currentVersion, error: err.message })
        }
      })
    })

    req.on('error', (e) => {
      resolve({ success: false, currentVersion, error: e.message })
    })

    req.setTimeout(8000, () => {
      req.destroy()
      resolve({ success: false, currentVersion, error: 'Request timeout' })
    })
  })
})

ipcMain.handle('app:getVersion', () => {
  return app.getVersion()
})

ipcMain.handle('system:openExternal', async (_e, url: string) => {
  if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
    await shell.openExternal(url)
    return true
  }
  return false
})

ipcMain.handle('system:showItemInFolder', async (_e, itemPath: string) => {
  if (itemPath && typeof itemPath === 'string') {
    try {
      shell.showItemInFolder(path.normalize(itemPath))
      return true
    } catch (err) {
      console.error('[showItemInFolder error]:', err)
      return false
    }
  }
  return false
})

ipcMain.handle('system:getSystemMetrics', async () => {
  try {
    const metrics = app.getAppMetrics()
    let totalCpu = 0
    let totalMemoryWorkingSetKB = 0
    let totalMemoryPrivateKB = 0

    const processBreakdown = metrics.map(m => {
      const cpuPercent = m.cpu.percentCPUUsage || 0
      totalCpu += cpuPercent
      const workingSetKB = m.memory?.workingSetSize || 0
      const privateKB = m.memory?.privateBytes || 0
      totalMemoryWorkingSetKB += workingSetKB
      totalMemoryPrivateKB += privateKB

      return {
        pid: m.pid,
        type: m.type,
        cpuPercent: Math.round(cpuPercent * 10) / 10,
        memoryMB: Math.round(workingSetKB / 1024)
      }
    })

    return {
      success: true,
      totalCpu: Math.round(totalCpu * 10) / 10,
      totalMemoryMB: Math.round(totalMemoryWorkingSetKB / 1024),
      processes: processBreakdown
    }
  } catch (err: any) {
    return {
      success: false,
      totalCpu: 0,
      totalMemoryMB: 0,
      processes: [],
      error: err.message
    }
  }
})

function compareSemver(v1: string, v2: string): number {
  const p1 = v1.replace(/^v/, '').split('.').map(Number)
  const p2 = v2.replace(/^v/, '').split('.').map(Number)
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const n1 = p1[i] || 0
    const n2 = p2[i] || 0
    if (n1 > n2) return 1
    if (n1 < n2) return -1
  }
  return 0
}

// ── File Tree Builder ───────────────────────────────────────────
async function buildFileTree(dirPath: string, depth = 0, showHidden = false): Promise<any[]> {
  if (depth > 4) return []
  const IGNORE = new Set(['.git', 'node_modules', '__pycache__', '.venv', 'dist', 'dist-electron'])
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    const nodes = await Promise.all(
      entries
        .filter(e => !IGNORE.has(e.name) && (showHidden || !e.name.startsWith('.')))
        .map(async (entry) => {
          const fullPath = path.join(dirPath, entry.name)
          if (entry.isDirectory()) {
            const children = await buildFileTree(fullPath, depth + 1, showHidden)
            return { name: entry.name, path: fullPath, type: 'dir', children }
          }
          return { name: entry.name, path: fullPath, type: 'file' }
        })
    )
    return nodes.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name)
      return a.type === 'dir' ? -1 : 1
    })
  } catch {
    return []
  }
}

app.on('window-all-closed', () => {
  ptySessions.forEach(p => p.kill())
  ptySessions.clear()
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

app.whenReady().then(createWindow)
