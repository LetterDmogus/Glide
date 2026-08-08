export interface GlideConfig {
  title: string
  author: string
  theme: string
  margin_top: string
  margin_bottom: string
  margin_left: string
  margin_right: string
  line_spacing: number
  font_size: string
  font_family: string
  page_number_style: string
  text_align: string
  heading_align: string
  paragraph_spacing: string
  heading_spacing: string
  first_line_indent: string
  list_indent: string
  citation_style: string
  [key: string]: any
}

export interface GlideSection {
  name: string
  path: string
  layout: string
  content: string
  metadata: Record<string, any>
  isPdf?: boolean
}

export interface ProjectLoadResult {
  path: string
  tree: any[]
  isGlide: boolean
  config: GlideConfig | null
  sections: GlideSection[]
}

export interface TypstBuildResult {
  success: boolean
  error?: string
}

export interface TypstPreviewResult {
  success: boolean
  pages?: string[]
  error?: string
}

interface ElectronAPI {
  minimize: () => Promise<void>
  maximize: () => Promise<void>
  close:    () => Promise<void>
  openFolder:  (showHidden?: boolean) => Promise<ProjectLoadResult | null>
  loadProject: (path: string, showHidden?: boolean) => Promise<ProjectLoadResult>
  readFile:    (path: string) => Promise<string | null>
  searchProject: (path: string, query: string, options?: { regex?: boolean; caseSensitive?: boolean }) => Promise<Array<{ path: string; line: number; text: string }>>
  writeFile:   (path: string, content: string) => Promise<boolean>
  readDir:     (path: string) => Promise<any[]>
  createFile:  (filePath: string, content?: string) => Promise<boolean>
  createDir:   (dirPath: string) => Promise<boolean>
  deleteItem:  (itemPath: string) => Promise<boolean>
  renameItem:  (oldPath: string, newPath: string) => Promise<boolean>
  copyFile:    (srcPath: string, destPath: string) => Promise<boolean>
  listImages:  (path: string) => Promise<{ name: string; path: string }[]>
  readBib:     (projectDir: string) => Promise<any[]>
  saveBib:     (projectDir: string, entries: any[]) => Promise<boolean>
  openTerminal: (cwd?: string, shellType?: 'powershell' | 'cmd' | 'gitbash') => Promise<boolean>
  checkTypstStatus:  () => Promise<{ installed: boolean; version?: string; type: 'cli' | 'builtin'; error?: string }>
  savePdfDialog:     (defaultName?: string) => Promise<string | null>
  buildPdf:          (projectDir: string, outputPdfPath: string) => Promise<TypstBuildResult>
  previewPdf:        (projectDir: string) => Promise<TypstPreviewResult>
  saveDocxDialog:    (defaultName?: string) => Promise<string | null>
  buildDocx:         (projectDir: string, outputDocxPath: string) => Promise<TypstBuildResult>
  listSkills:        (projectPath?: string) => Promise<{ name: string; title: string; description: string; isInstalled?: boolean }[]>
  installSkill:      (projectPath: string, skillName: string) => Promise<{ success: boolean; error?: string }>
  watchFiles:        (filePaths: string[]) => Promise<boolean>
  onFileChanged:     (callback: (data: { eventType: string; fullPath: string }) => void) => () => void
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
