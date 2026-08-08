import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close:    () => ipcRenderer.invoke('window:close'),

  // File system & Project
  openFolder:  (showHidden = false) => ipcRenderer.invoke('dialog:openFolder', showHidden),
  loadProject: (path: string, showHidden = false) => ipcRenderer.invoke('project:load', path, showHidden),
  readFile:    (path: string) => ipcRenderer.invoke('fs:readFile', path),
  searchProject: (path: string, query: string, options?: { regex?: boolean; caseSensitive?: boolean }) => ipcRenderer.invoke('search:project', path, query, options),
  writeFile:   (path: string, content: string) => ipcRenderer.invoke('fs:writeFile', path, content),
  readDir:     (path: string) => ipcRenderer.invoke('fs:readDir', path),
  createFile:  (filePath: string, content?: string) => ipcRenderer.invoke('fs:createFile', filePath, content),
  createDir:   (dirPath: string) => ipcRenderer.invoke('fs:createDir', dirPath),
  deleteItem:  (itemPath: string) => ipcRenderer.invoke('fs:deleteItem', itemPath),
  renameItem:  (oldPath: string, newPath: string) => ipcRenderer.invoke('fs:renameItem', oldPath, newPath),
  copyFile:    (srcPath: string, destPath: string) => ipcRenderer.invoke('fs:copyFile', srcPath, destPath),
  listImages:  (path: string) => ipcRenderer.invoke('fs:listImages', path),

  // Bibliography
  readBib:     (projectDir: string) => ipcRenderer.invoke('bib:read', projectDir),
  saveBib:     (projectDir: string, entries: any[]) => ipcRenderer.invoke('bib:save', projectDir, entries),

  // External OS Terminal (PowerShell / CMD)
  openTerminal: (cwd?: string, shellType?: 'powershell' | 'cmd' | 'gitbash') => ipcRenderer.invoke('system:openTerminal', cwd, shellType),

  // Typst PDF Build & Preview
  checkTypstStatus: () => ipcRenderer.invoke('typst:checkStatus'),
  savePdfDialog: (defaultName?: string) => ipcRenderer.invoke('dialog:savePdf', defaultName),
  buildPdf:       (projectDir: string, outputPdfPath: string) => ipcRenderer.invoke('typst:build', projectDir, outputPdfPath),
  previewPdf:     (projectDir: string) => ipcRenderer.invoke('typst:preview', projectDir),

  // Pandoc DOCX Export
  saveDocxDialog: (defaultName?: string) => ipcRenderer.invoke('dialog:saveDocxDialog', defaultName),
  buildDocx:      (projectDir: string, outputDocxPath: string) => ipcRenderer.invoke('pandoc:buildDocx', projectDir, outputDocxPath),

  // Skills & AI Rules Manager
  listSkills:   (projectPath?: string) => ipcRenderer.invoke('skills:list', projectPath),
  installSkill: (projectPath: string, skillName: string) => ipcRenderer.invoke('skills:install', projectPath, skillName),

  // File System Watcher Listener (Targeted per file di tab)
  watchFiles: (filePaths: string[]) => ipcRenderer.invoke('watcher:watchFiles', filePaths),
  onFileChanged: (callback: (data: { eventType: string; fullPath: string }) => void) => {
    const handler = (_e: any, data: any) => callback(data)
    ipcRenderer.on('fs:file-changed', handler)
    return () => ipcRenderer.removeListener('fs:file-changed', handler)
  }
})
