import fs from 'node:fs/promises'
import path from 'node:path'
import * as yaml from 'js-yaml'

// ── Inline frontmatter parser (replaces gray-matter, no eval) ──────────────
// Parses YAML frontmatter between --- delimiters from .typ files
function parseFrontmatter(raw: string): { data: Record<string, any>; content: string } {
  const DELIM = '---'
  if (!raw.startsWith(DELIM)) {
    return { data: {}, content: raw }
  }
  const end = raw.indexOf('\n' + DELIM, DELIM.length)
  if (end === -1) {
    return { data: {}, content: raw }
  }
  const yamlStr = raw.slice(DELIM.length, end).trim()
  const content = raw.slice(end + DELIM.length + 1).trimStart()
  try {
    const data = (yaml.load(yamlStr) as Record<string, any>) || {}
    return { data, content }
  } catch {
    return { data: {}, content: raw }
  }
}

export interface GlideConfig {
  title: string
  author: string
  theme: string
  accent_color: string
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
  subject: string
  keywords: string
  citation_style: string
  appendix_label: string
  [key: string]: any
}

const CONFIG_DEFAULTS: GlideConfig = {
  title: 'Laporan Tugas',
  author: 'Nama Penulis',
  theme: 'default',
  accent_color: '#000000',
  margin_top: '3cm',
  margin_bottom: '3cm',
  margin_left: '4cm',
  margin_right: '3cm',
  line_spacing: 1.5,
  font_size: '12pt',
  font_family: "'Times New Roman', serif",
  page_number_style: 'decimal',
  text_align: 'justify',
  heading_align: 'center',
  paragraph_spacing: '1em',
  heading_spacing: '1em',
  first_line_indent: '0pt',
  list_indent: '1cm',
  subject: '',
  keywords: '',
  citation_style: 'apa',
  appendix_label: 'Lampiran',
}

export interface GlideSection {
  name: string
  path: string
  layout: string
  content: string
  metadata: Record<string, any>
  isPdf: boolean
  chapterNum?: number
}

export interface FileNode {
  name: string
  path: string
  isDir: boolean
  children?: FileNode[]
  ext?: string
}

export async function isGlideProject(dirPath: string): Promise<boolean> {
  const hasGlide = await fs.stat(path.join(dirPath, 'glide.yaml')).then(() => true).catch(() => false)
  const hasConfig = await fs.stat(path.join(dirPath, 'config.yaml')).then(() => true).catch(() => false)
  return hasGlide || hasConfig
}

/**
 * Menyalin folder tema bawaan (themes/default) ke .gld_temp/themes/ & themes/ di dalam proyek baru
 */
export async function ensureThemeInProject(projectDir: string, appRoot: string): Promise<void> {
  try {
    const srcThemes = path.join(appRoot, 'themes')
    const dstThemesTemp = path.join(projectDir, '.gld_temp', 'themes')
    const dstThemesLocal = path.join(projectDir, 'themes')

    await copyDirectory(srcThemes, dstThemesTemp)
    await copyDirectory(srcThemes, dstThemesLocal)
  } catch (err) {
    console.error('Failed to copy theme template to project:', err)
  }
}

async function copyDirectory(src: string, dest: string) {
  await fs.mkdir(dest, { recursive: true })
  const entries = await fs.readdir(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath)
    } else {
      await fs.copyFile(srcPath, destPath)
    }
  }
}

export async function loadGlideConfig(dirPath: string): Promise<GlideConfig> {
  // Prefer config.yaml (v1.0 format), fallback to glide.yaml
  let cfgPath = path.join(dirPath, 'config.yaml')
  const hasConfig = await fs.stat(cfgPath).then(() => true).catch(() => false)
  if (!hasConfig) {
    cfgPath = path.join(dirPath, 'glide.yaml')
    const hasGlide = await fs.stat(cfgPath).then(() => true).catch(() => false)
    if (!hasGlide) return { ...CONFIG_DEFAULTS }
  }

  try {
    const raw = await fs.readFile(cfgPath, 'utf-8')
    const data = (yaml.load(raw) as Record<string, any>) || {}
    return { ...CONFIG_DEFAULTS, ...data }
  } catch {
    return { ...CONFIG_DEFAULTS }
  }
}

export async function getGlideSections(dirPath: string): Promise<GlideSection[]> {
  const sectionsDir = path.join(dirPath, 'sections')
  const coverPath = path.join(dirPath, 'cover.typ')

  const allFiles: string[] = []

  // cover.typ goes first (same as v1.0: valid_files.insert(0, cover_path))
  const hasCover = await fs.stat(coverPath).then(() => true).catch(() => false)
  if (hasCover) {
    allFiles.push(coverPath)
  }

  // sections/* sorted alphabetically (same as v1.0: sorted(list(sections_dir.glob("*"))))
  const hasSections = await fs.stat(sectionsDir).then(() => true).catch(() => false)
  if (hasSections) {
    const entries = await fs.readdir(sectionsDir)
    entries.sort()
    for (const entry of entries) {
      const ext = path.extname(entry).toLowerCase()
      if (ext === '.typ' || ext === '.pdf') {
        allFiles.push(path.join(sectionsDir, entry))
      }
    }
  }

  const sections: GlideSection[] = []
  let currentChapter = 0

  for (const filePath of allFiles) {
    const ext = path.extname(filePath).toLowerCase()
    const name = path.basename(filePath)

    // PDF files — mark as isPdf (same as v1.0 logic)
    if (ext === '.pdf') {
      sections.push({
        name,
        path: filePath,
        layout: 'main',
        content: '',
        metadata: { layout: 'main' },
        isPdf: true,
      })
      continue
    }

    // Parse frontmatter (same as v1.0: frontmatter.load(p))
    let rawContent = ''
    try {
      rawContent = await fs.readFile(filePath, 'utf-8')
    } catch {
      continue
    }

    const parsed = parseFrontmatter(rawContent)
    const metadata = parsed.data as Record<string, any>

    // Default layout: 'cover' for cover.typ, 'main' for everything else
    const defaultLayout = name === 'cover.typ' ? 'cover' : 'main'
    const layout: string = metadata.layout || defaultLayout

    let chapterNum: number | undefined
    if (layout === 'main' || layout === 'default') {
      currentChapter++
      chapterNum = currentChapter
    }

    sections.push({
      name,
      path: filePath,
      layout,
      content: parsed.content,  // raw Typst content (post-frontmatter)
      metadata,
      isPdf: false,
      chapterNum,
    })
  }

  return sections
}

export async function buildFileTree(dirPath: string): Promise<FileNode[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  const nodes: FileNode[] = []

  // Ignore hidden/temp dirs
  const ignored = new Set(['.git', '.gld_temp', 'node_modules', '.venv', '__pycache__', '.pytest_cache'])

  for (const entry of entries) {
    if (ignored.has(entry.name)) continue
    const fullPath = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      const children = await buildFileTree(fullPath)
      nodes.push({ name: entry.name, path: fullPath, isDir: true, children })
    } else {
      nodes.push({ name: entry.name, path: fullPath, isDir: false, ext: path.extname(entry.name).toLowerCase() })
    }
  }

  return nodes.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}
