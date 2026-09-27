import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { spawn } from 'node:child_process'
import { loadGlideConfig, getGlideSections } from './project.ts'


// ─── Resolve path to Glide 2.0 app's themes folder ───────────────────────────
function getAppThemesDir(appRoot: string): string {
  return path.join(appRoot, 'themes')
}

// ─── Copy template into project's .gld_temp/themes/ ──────────────────────────
// So that --root <project_dir> can find /themes/default/template.typ
async function ensureTemplateInProject(projectDir: string, appRoot: string): Promise<void> {
  const srcThemes = getAppThemesDir(appRoot)
  const dstThemes = path.join(projectDir, '.gld_temp', 'themes')
  await fs.mkdir(dstThemes, { recursive: true })

  // Copy each theme subfolder (currently only "default")
  const themeDirs = await fs.readdir(srcThemes).catch(() => [] as string[])
  for (const theme of themeDirs) {
    const srcTheme = path.join(srcThemes, theme)
    const dstTheme = path.join(dstThemes, theme)
    await fs.mkdir(dstTheme, { recursive: true })
    const files = await fs.readdir(srcTheme).catch(() => [] as string[])
    for (const file of files) {
      await fs.copyFile(path.join(srcTheme, file), path.join(dstTheme, file))
    }
  }
}

// ─── Backward-compat: rewrite old v1.0 absolute paths ───────────────────────
// In v1.0, projects lived at GLD/projects/<name>/ so .typ files used paths
// like /projects/Module/images/logo.webp (relative to GLD root).
// In v2.0, projects are standalone and --root = project_dir, so those paths
// need to become /images/logo.webp instead.
//
// Also handles the case where project was stored inside a named "GLD" folder:
// /projects/<name>/... → /...
// /<parentName>/<name>/... → /... (if matches project ancestry)
export function normalizeV1Paths(content: string, projectDir: string): string {
  const projectName = escapeRegex(path.basename(projectDir))

  // Pattern 1: /projects/<projectName>/... → /...  (most common v1.0 layout)
  const pattern1 = new RegExp('/projects/' + projectName + '/', 'g')
  content = content.replace(pattern1, '/')

  // Pattern 2: /<anyFolder>/<projectName>/... → /...
  // Catches e.g. /GLD/projects/Module/... or /Documents/Module/...
  const pattern2 = new RegExp('/[^/"\']+/' + projectName + '/', 'g')
  content = content.replace(pattern2, '/')

  // Pattern 3: Normalize relative ../bibliography.yaml to root /bibliography.yaml
  // Prevents "would escape the project root" sandbox error in Typst
  content = content.replace(/#bibliography\(\s*["']\.\.\/([^"']+)["']/g, '#bibliography("/$1"')
  content = content.replace(/bibliography\(\s*["']\.\.\/([^"']+)["']/g, 'bibliography("/$1"')

  return content
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Mirrors v1.0 renderer.py _generate_typst_payload()
// KEY DIFFERENCE from v1.0: --root is now <project_dir>, not app root.
// template.typ is resolved as /.gld_temp/themes/default/template.typ
// project_root is set to "/" so all project assets resolve from project_dir
export async function generateTypstPayload(projectDir: string): Promise<string> {
  const config = await loadGlideConfig(projectDir)
  const sections = await getGlideSections(projectDir)

  // Template path relative to project root (--root = project_dir)
  // .gld_temp/themes/default/template.typ
  const templatePath = '.gld_temp/themes/default/template.typ'
  let payload = `#import "/${templatePath}": project, glide-figure, glide-table, glide-field, glide-bib, glide-bab\n`

  // project_root = "/" because --root IS the project_dir
  const projectRootStr = '/'

  // ── Apply config (mirrors v1.0 lines 29-45) ──
  const fontFamily = config.font_family
    .replace(/['"]/g, '')
    .split(',')[0]
    .trim()

  payload += `#show: project.with(\n`
  payload += `  title: "${config.title}",\n`
  payload += `  author: "${config.author}",\n`
  payload += `  margin: (top: ${config.margin_top}, bottom: ${config.margin_bottom}, left: ${config.margin_left}, right: ${config.margin_right}),\n`
  payload += `  font: "${fontFamily}",\n`
  payload += `  fontsize: ${config.font_size},\n`
  payload += `  line_spacing: ${config.line_spacing},\n`
  payload += `  text_align: "${config.text_align}",\n`
  payload += `  heading_align: "${config.heading_align}",\n`
  payload += `  paragraph_spacing: ${config.paragraph_spacing},\n`
  payload += `  heading_spacing: ${config.heading_spacing},\n`
  payload += `  list_indent: ${config.list_indent},\n`
  payload += `  first_line_indent: ${config.first_line_indent || '0pt'},\n`
  payload += `  project_root: "${projectRootStr}",\n`
  payload += `  citation_style: "${config.citation_style}",\n`
  payload += `)\n\n`

  // ── Iterate sections (mirrors v1.0 lines 47-73) ──
  let currentGroup: string | null = null

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i]
    const layout = section.layout || 'main'

    // Group change logic (mirrors v1.0 lines 52-64)
    if (layout === 'cover') {
      if (currentGroup !== 'cover') {
        payload += '#set page(numbering: none)\n'
        currentGroup = 'cover'
      }
    } else if (layout === 'front') {
      if (currentGroup !== 'front') {
        payload += '#set page(numbering: "i")\n#counter(page).update(1)\n'
        currentGroup = 'front'
      }
    } else if (layout === 'main' || layout === 'default') {
      if (currentGroup !== 'main') {
        payload += '#set page(numbering: "1")\n#counter(page).update(1)\n'
        currentGroup = 'main'
      }
    }

    // Emit section content (mirrors v1.0 lines 66-71)
    if (section.isPdf) {
      payload += `// [PDF Insertion Skipped: ${path.basename(section.path)}]\n\n`
    } else {
      // ── Backward-compat path normalization ──────────────────────────────────
      // In v1.0, projects lived inside GLD/projects/<name>/, so .typ files
      // used absolute paths like /projects/Module/images/logo.webp.
      // In v2.0 projects are standalone, so --root = project_dir.
      // We rewrite /projects/<projectName>/... → /... so old .typ files work.
      const content = normalizeV1Paths(section.content, projectDir)
      payload += content + '\n\n'

      if (i < sections.length - 1) {
        payload += '#pagebreak()\n\n'
      }
    }
  }

  return payload
}


// ── Find typst binary (mirrors v1.0 renderer.py lines 89-91) ──────────────────
// Python: typst_bin = shutil.which("typst") or str(gld_root / "bin" / "typst")
export async function getTypstBinaryPath(appRoot: string): Promise<string> {
  const platform = process.platform
  const exe = platform === 'win32' ? 'typst.exe' : 'typst'

  // 1. Check bundled binary shipped with the app (resources/bin/<platform>/typst.exe)
  const bundledPaths = [
    path.join(appRoot, 'resources', 'bin', platform, exe),
    path.join(appRoot, 'resources', 'bin', exe),
    path.join(appRoot, 'bin', exe),
  ]
  for (const p of bundledPaths) {
    const exists = await fs.stat(p).then(() => true).catch(() => false)
    if (exists) return p
  }

  // 2. Check well-known winget install locations (Windows only)
  // winget adds a symlink at %LOCALAPPDATA%\Microsoft\WinGet\Links\typst.exe
  if (platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
    const wingetPaths: string[] = [
      path.join(localAppData, 'Microsoft', 'WinGet', 'Links', 'typst.exe'),
    ]

    // Also glob-search WinGet Packages directory for typst.exe
    const wingetPackages = path.join(localAppData, 'Microsoft', 'WinGet', 'Packages')
    try {
      const pkgDirs = await fs.readdir(wingetPackages)
      for (const pkgDir of pkgDirs) {
        if (pkgDir.toLowerCase().startsWith('typst.typst')) {
          const pkgPath = path.join(wingetPackages, pkgDir)
          const pkgContents = await fs.readdir(pkgPath)
          for (const sub of pkgContents) {
            const candidate = path.join(pkgPath, sub, 'typst.exe')
            const exists = await fs.stat(candidate).then(() => true).catch(() => false)
            if (exists) wingetPaths.push(candidate)
          }
        }
      }
    } catch { /* ignore if WinGet packages dir doesn't exist */ }

    for (const p of wingetPaths) {
      const exists = await fs.stat(p).then(() => true).catch(() => false)
      if (exists) return p
    }
  }

  // 3. Fallback: rely on system PATH (equivalent to shutil.which("typst"))
  return 'typst'
}


// ── PDF Compilation ────────────────────────────────────────────────────────────
// Mirrors v1.0 renderer.py render_project() (lines 75-105)
// --root is set to projectDir (not appRoot), so payload and all project assets
// are accessible. Template is copied to .gld_temp/themes/ before compile.
export async function compileTypstToPdf(
  projectDir: string,
  appRoot: string,
  outputPdfPath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const tempDir = path.join(projectDir, '.gld_temp')
    await fs.mkdir(tempDir, { recursive: true })

    // Copy template.typ into project's .gld_temp/themes/
    await ensureTemplateInProject(projectDir, appRoot)

    const typPath = path.join(tempDir, 'build.typ')
    const payload = await generateTypstPayload(projectDir)
    await fs.writeFile(typPath, payload, 'utf-8')

    const typstBin = await getTypstBinaryPath(appRoot)

    return new Promise((resolve) => {
      // --root = projectDir: payload & project assets are all inside here
      const proc = spawn(typstBin, ['compile', '--root', projectDir, typPath, outputPdfPath], {
        cwd: projectDir
      })

      let stderr = ''
      proc.stderr?.on('data', d => stderr += d.toString())
      proc.stdout?.on('data', d => stderr += d.toString())

      proc.on('close', code => {
        if (code === 0) {
          resolve({ success: true })
        } else {
          resolve({ success: false, error: stderr || `typst exited with code ${code}` })
        }
      })

      proc.on('error', err => {
        resolve({ success: false, error: `Could not launch typst: ${err.message}\nMake sure Typst is installed (https://typst.app)` })
      })
    })
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ── SVG Preview Compilation ────────────────────────────────────────────────────
// Same as PDF compile, but outputs per-page SVGs at .gld_temp/preview-{n}.svg
export async function compileTypstToSvgPages(
  projectDir: string,
  appRoot: string,
  rendererMode: 'cli' | 'wasm' = 'cli'
): Promise<{ success: boolean; pages?: string[]; error?: string }> {
  try {
    const tempDir = path.join(projectDir, '.gld_temp')
    await fs.mkdir(tempDir, { recursive: true })

    // Copy template.typ into project's .gld_temp/themes/
    await ensureTemplateInProject(projectDir, appRoot)

    const payload = await generateTypstPayload(projectDir)
    const typstBin = await getTypstBinaryPath(appRoot)

    // ── SVG Page Pattern Compilation ──
    // Typst mewajibkan pola {n} untuk mengekspor multi-page SVG (stdout '-' ditolak oleh Typst jika > 1 halaman)
    const typPath = path.join(tempDir, 'preview.typ')
    const svgPattern = path.join(tempDir, 'preview-{n}.svg')

    // Bersihkan berkas SVG lama di .gld_temp untuk mencegah bug halaman ganda
    try {
      const existingFiles = await fs.readdir(tempDir)
      const oldSvgFiles = existingFiles.filter(f => f.startsWith('preview-') && f.endsWith('.svg'))
      await Promise.all(oldSvgFiles.map(f => fs.unlink(path.join(tempDir, f)).catch(() => {})))
    } catch {
      // Ignore clean error
    }

    await fs.writeFile(typPath, payload, 'utf-8')

    return new Promise((resolve) => {
      const proc = spawn(typstBin, ['compile', '--root', projectDir, typPath, svgPattern], {
        cwd: projectDir
      })

      let stderr = ''
      proc.stderr?.on('data', d => stderr += d.toString())
      proc.stdout?.on('data', d => stderr += d.toString())

      proc.on('close', async (code) => {
        if (code === 0) {
          try {
            const files = await fs.readdir(tempDir)
            const sortedSvgFiles = files
              .filter(f => f.startsWith('preview-') && f.endsWith('.svg'))
              .sort((a, b) => {
                const numA = parseInt(a.replace('preview-', '').replace('.svg', '')) || 0
                const numB = parseInt(b.replace('preview-', '').replace('.svg', '')) || 0
                return numA - numB
              })

            // Jika mode WASM / In-Memory: baca seluruh SVG ke RAM lalu hapus berkas fisiknya dari disk
            if (rendererMode === 'wasm') {
              const svgContents = await Promise.all(
                sortedSvgFiles.map(async (f) => {
                  const fullP = path.join(tempDir, f)
                  const content = await fs.readFile(fullP, 'utf-8')
                  await fs.unlink(fullP).catch(() => {})
                  return content
                })
              )
              resolve({ success: true, pages: svgContents })
            } else {
              // Mode CLI: kembalikan daftar path file
              resolve({ success: true, pages: sortedSvgFiles.map(f => path.join(tempDir, f)) })
            }
          } catch (e: any) {
            resolve({ success: false, error: e.message })
          }
        } else {
          resolve({ success: false, error: stderr || `typst exited with code ${code}` })
        }
      })

      proc.on('error', err => {
        resolve({ success: false, error: `Could not launch typst: ${err.message}\nMake sure Typst is installed (https://typst.app)` })
      })
    })
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
