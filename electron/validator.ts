import fs from 'node:fs/promises'
import path from 'node:path'
import * as yaml from 'js-yaml'
import { generateDefaultConfigYaml } from './project.js'

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info'
  category: 'sections' | 'config' | 'bibliography' | 'images' | 'structure' | 'writing'
  file?: string
  line?: number
  message: string
  suggestion?: string
}

export interface ValidationReport {
  timestamp: number
  projectPath: string
  score: number // 0-100
  passed: boolean
  errorCount: number
  warningCount: number
  infoCount: number
  issues: ValidationIssue[]
}

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico', '.tiff'])
const DOC_EXTS = new Set(['.pdf', '.docx', '.xlsx', '.pptx', '.zip', '.rar', '.7z', '.tar', '.gz', '.txt'])

/**
 * Validates the project directory structure, config, sections, citations, and image assets.
 */
export async function validateProjectStructure(projectDir: string): Promise<ValidationReport> {
  const issues: ValidationIssue[] = []
  
  if (!projectDir) {
    return {
      timestamp: Date.now(),
      projectPath: '',
      score: 0,
      passed: false,
      errorCount: 1,
      warningCount: 0,
      infoCount: 0,
      issues: [{
        type: 'error',
        category: 'structure',
        message: 'Folder proyek belum dibuka.',
        suggestion: 'Buka folder proyek terlebih dahulu.'
      }]
    }
  }

  // 1. Config Validation (config.yaml / glide.yaml)
  let configData: Record<string, any> | null = null
  let configFileName = 'config.yaml'
  const configPath = path.join(projectDir, 'config.yaml')
  const glidePath = path.join(projectDir, 'glide.yaml')

  const hasConfig = await fs.stat(configPath).then(() => true).catch(() => false)
  const hasGlide = !hasConfig && await fs.stat(glidePath).then(() => true).catch(() => false)

  if (hasConfig || hasGlide) {
    const targetFile = hasConfig ? configPath : glidePath
    configFileName = hasConfig ? 'config.yaml' : 'glide.yaml'
    try {
      const raw = await fs.readFile(targetFile, 'utf-8')
      configData = (yaml.load(raw) as Record<string, any>) || {}
      
      // Check required fields
      if (!configData.title || configData.title.trim() === '' || configData.title.toLowerCase().includes('dokumen baru') || configData.title.toLowerCase().includes('laporan tugas')) {
        issues.push({
          type: 'info',
          category: 'config',
          file: configFileName,
          message: `Judul dokumen "${configData.title || ''}" masih menggunakan judul bawaan (default).`,
          suggestion: `Ganti judul di ${configFileName} agar sesuai dengan topik penelitian Anda.`
        })
      }

      if (!configData.author || configData.author.trim() === '' || configData.author.toLowerCase().includes('nama penulis') || configData.author.toLowerCase().includes('nama penyusun')) {
        issues.push({
          type: 'info',
          category: 'config',
          file: configFileName,
          message: `Nama penulis "${configData.author || ''}" masih menggunakan nama bawaan (default).`,
          suggestion: `Perbarui nama penulis di ${configFileName}.`
        })
      }
    } catch (err: any) {
      issues.push({
        type: 'error',
        category: 'config',
        file: configFileName,
        message: `Gagal membaca format YAML pada ${configFileName}: ${err.message}`,
        suggestion: `Periksa sintaks indentasi spasi pada ${configFileName}.`
      })
    }
  } else {
    issues.push({
      type: 'error',
      category: 'config',
      file: 'config.yaml',
      message: 'File konfigurasi "config.yaml" tidak ditemukan di root proyek.',
      suggestion: 'Buat file config.yaml untuk mengatur tata letak, margin, font, dan metadata laporan.'
    })
  }

  // 2. Sections Folder Validation
  const sectionsDir = path.join(projectDir, 'sections')
  const hasSections = await fs.stat(sectionsDir).then(() => true).catch(() => false)

  const sectionTypFiles: string[] = []

  if (!hasSections) {
    issues.push({
      type: 'warning',
      category: 'sections',
      message: 'Folder "sections/" tidak ditemukan.',
      suggestion: 'Buat folder "sections/" untuk menyimpan bab-bab dokumen (.typ).'
    })
  } else {
    try {
      const entries = await fs.readdir(sectionsDir, { withFileTypes: true })
      const chapterNumbers: number[] = []

      for (const entry of entries) {
        const fullPath = path.join(sectionsDir, entry.name)
        const ext = path.extname(entry.name).toLowerCase()

        if (entry.isDirectory()) {
          issues.push({
            type: 'warning',
            category: 'sections',
            file: `sections/${entry.name}`,
            message: `Sub-folder terdeteksi di dalam sections/: "${entry.name}".`,
            suggestion: 'Sebaiknya letakkan file bab langsung di root folder sections/ agar urutan bab terdeteksi rapi.'
          })
          continue
        }

        // Check if user mistakenly placed an image in sections/
        if (IMAGE_EXTS.has(ext)) {
          issues.push({
            type: 'warning',
            category: 'sections',
            file: `sections/${entry.name}`,
            message: `File gambar "${entry.name}" diletakkan di dalam folder sections/.`,
            suggestion: 'Pindahkan file gambar ini ke folder "images/" agar tidak mengacaukan pemindaian bab Typst.'
          })
          continue
        }

        // Check if user mistakenly placed a doc/pdf in sections/
        if (DOC_EXTS.has(ext)) {
          issues.push({
            type: 'warning',
            category: 'sections',
            file: `sections/${entry.name}`,
            message: `File non-Typst "${entry.name}" terdeteksi di dalam folder sections/.`,
            suggestion: 'Folder sections/ sebaiknya hanya berisi file bab Typst (.typ).'
          })
          continue
        }

        if (ext === '.typ') {
          sectionTypFiles.push(fullPath)

          // Check if file is empty
          try {
            const stats = await fs.stat(fullPath)
            if (stats.size === 0) {
              issues.push({
                type: 'warning',
                category: 'sections',
                file: `sections/${entry.name}`,
                message: `File bab "${entry.name}" masih kosong (0 byte).`,
                suggestion: 'Tuliskan isi bab atau tambahkan heading bab di file ini.'
              })
            }
          } catch {
            // ignore
          }

          // Check chapter numbering
          const numMatch = entry.name.match(/^(\d+)/)
          if (numMatch) {
            chapterNumbers.push(parseInt(numMatch[1], 10))
          } else {
            issues.push({
              type: 'info',
              category: 'sections',
              file: `sections/${entry.name}`,
              message: `Nama file bab "${entry.name}" tidak memiliki awalan nomor urut (contoh: 01_pendahuluan.typ).`,
              suggestion: 'Gunakan awalan angka seperti "01_nama.typ" agar urutan bab tersusun rapi.'
            })
          }
        }
      }

      // Check for numbering gaps (misal: 1, 2, 5)
      if (chapterNumbers.length > 1) {
        chapterNumbers.sort((a, b) => a - b)
        for (let i = 0; i < chapterNumbers.length - 1; i++) {
          const curr = chapterNumbers[i]
          const next = chapterNumbers[i + 1]
          if (next - curr > 1) {
            issues.push({
              type: 'info',
              category: 'sections',
              message: `Urutan penomoran bab melompat dari bab ${curr} ke bab ${next}.`,
              suggestion: 'Pastikan penomoran bab berurutan (01, 02, 03, ...) untuk keteraturan dokumen.'
            })
          }
        }
      }

      if (sectionTypFiles.length === 0) {
        issues.push({
          type: 'warning',
          category: 'sections',
          message: 'Belum ada file bab (.typ) di dalam folder sections/.',
          suggestion: 'Gunakan tombol "+ Tambah Bab" untuk membuat bab pertama Anda.'
        })
      }
    } catch (err: any) {
      issues.push({
        type: 'error',
        category: 'sections',
        message: `Gagal membaca isi folder sections/: ${err.message}`
      })
    }
  }

  // 3. Cover Validation (cover.typ)
  const coverPath = path.join(projectDir, 'cover.typ')
  const hasCover = await fs.stat(coverPath).then(() => true).catch(() => false)
  if (!hasCover) {
    issues.push({
      type: 'info',
      category: 'structure',
      file: 'cover.typ',
      message: 'Halaman sampul depan (cover.typ) belum dibuat.',
      suggestion: 'Klik "Halaman Sampul" pada panel outline untuk membuat sampul dokumen.'
    })
  } else {
    sectionTypFiles.push(coverPath)
  }

  // 4. Bibliography & Citations Validation
  const bibPath = path.join(projectDir, 'bibliography.yaml')
  const hasBib = await fs.stat(bibPath).then(() => true).catch(() => false)
  const validBibKeys = new Set<string>()

  if (hasBib) {
    try {
      const bibRaw = await fs.readFile(bibPath, 'utf-8')
      const bibData = (yaml.load(bibRaw) as Record<string, any>) || {}
      if (typeof bibData === 'object' && bibData !== null) {
        Object.keys(bibData).forEach(k => validBibKeys.add(k))
      }
    } catch (err: any) {
      issues.push({
        type: 'warning',
        category: 'bibliography',
        file: 'bibliography.yaml',
        message: `Sintaks bibliography.yaml tidak valid: ${err.message}`,
        suggestion: 'Periksa format YAML referensi daftar pustaka.'
      })
    }
  }

  // 5. Scan all .typ files for Citations & Image References
  const citedKeysFound = new Map<string, string[]>() // key -> [file1, file2]
  const imageReferences: Array<{ imgPath: string; sourceFile: string; rawLine: string }> = []

  for (const typFilePath of sectionTypFiles) {
    try {
      const relFile = path.relative(projectDir, typFilePath).replace(/\\/g, '/')
      const content = await fs.readFile(typFilePath, 'utf-8')

      // A. Scan Citations: @kunci atau #cite("kunci")
      // Hindari mencocokkan email: filter out if preceded by alphanumeric or period
      const atCiteRegex = /(?:^|[^a-zA-Z0-9_.])@([a-zA-Z0-9_-]+)/g
      let m: RegExpExecArray | null
      while ((m = atCiteRegex.exec(content)) !== null) {
        const key = m[1]
        // Abaikan keywords tipst bawaan seperti @page, @heading dsb jika ada
        if (['page', 'heading', 'text', 'par'].includes(key.toLowerCase())) continue
        if (!citedKeysFound.has(key)) citedKeysFound.set(key, [])
        citedKeysFound.get(key)!.push(relFile)
      }

      const hashCiteRegex = /#cite\(["']([a-zA-Z0-9_-]+)["']\)/g
      while ((m = hashCiteRegex.exec(content)) !== null) {
        const key = m[1]
        if (!citedKeysFound.has(key)) citedKeysFound.set(key, [])
        citedKeysFound.get(key)!.push(relFile)
      }

      // B. Scan Image References: #image("...") atau #glide-figure("...", ...)
      const imgRegex = /#(?:image|glide-figure)\(\s*["']([^"']+)["']/g
      while ((m = imgRegex.exec(content)) !== null) {
        imageReferences.push({
          imgPath: m[1],
          sourceFile: relFile,
          rawLine: m[0]
        })
      }
    } catch {
      // ignore read error
    }
  }

  // Verify missing citations
  if (citedKeysFound.size > 0 && !hasBib) {
    issues.push({
      type: 'warning',
      category: 'bibliography',
      file: 'bibliography.yaml',
      message: `Terdapat ${citedKeysFound.size} sitasi di dokumen, tetapi file "bibliography.yaml" belum dibuat.`,
      suggestion: 'Buat file bibliography.yaml untuk mendaftarkan kunci referensi pustaka.'
    })
  } else if (hasBib) {
    for (const [key, sourceFiles] of citedKeysFound.entries()) {
      if (!validBibKeys.has(key)) {
        const uniqueSources = Array.from(new Set(sourceFiles)).join(', ')
        issues.push({
          type: 'warning',
          category: 'bibliography',
          file: 'bibliography.yaml',
          message: `Sitasi "@${key}" yang digunakan di "${uniqueSources}" belum terdaftar di bibliography.yaml.`,
          suggestion: `Tambahkan entri "${key}:" ke dalam file bibliography.yaml.`
        })
      }
    }
  }

  // Verify image files exist on disk
  const referencedImageNames = new Set<string>()
  for (const ref of imageReferences) {
    const cleanImgPath = ref.imgPath.replace(/\\/g, '/')
    referencedImageNames.add(path.basename(cleanImgPath).toLowerCase())
    // Path bisa relative ke root atau sections
    const candidatePaths = [
      path.join(projectDir, cleanImgPath),
      path.join(projectDir, 'sections', cleanImgPath)
    ]
    let exists = false
    for (const cp of candidatePaths) {
      if (await fs.stat(cp).then(() => true).catch(() => false)) {
        exists = true
        break
      }
    }

    if (!exists) {
      issues.push({
        type: 'error',
        category: 'images',
        file: ref.sourceFile,
        message: `File gambar "${ref.imgPath}" tidak ditemukan di disk.`,
        suggestion: `Pastikan file gambar "${path.basename(cleanImgPath)}" sudah ditaruh di folder yang benar (contoh: "images/"). Typst akan gagal render jika file gambar hilang.`
      })
    }
  }

  // 6. Unused Images — gambar di images/ yang tidak dirujuk di naskah manapun
  const imagesDir = path.join(projectDir, 'images')
  const hasImagesDir = await fs.stat(imagesDir).then(() => true).catch(() => false)
  if (hasImagesDir) {
    try {
      const allImageFiles = await fs.readdir(imagesDir, { withFileTypes: true })
      for (const imgEntry of allImageFiles) {
        if (!imgEntry.isFile()) continue
        const imgExt = path.extname(imgEntry.name).toLowerCase()
        if (!IMAGE_EXTS.has(imgExt)) continue
        if (!referencedImageNames.has(imgEntry.name.toLowerCase())) {
          issues.push({
            type: 'warning',
            category: 'images',
            file: `images/${imgEntry.name}`,
            message: `File gambar "${imgEntry.name}" ada di folder images/ tetapi tidak pernah digunakan di naskah.`,
            suggestion: 'Hapus gambar yang tidak terpakai, atau rujuk file ini di salah satu file bab (.typ).'
          })
        }
      }
    } catch {
      // ignore
    }
  }

  // 7. Unused Citations — entri bibliography.yaml yang tidak pernah dikutip di naskah
  if (hasBib && validBibKeys.size > 0) {
    for (const bibKey of validBibKeys) {
      if (!citedKeysFound.has(bibKey)) {
        issues.push({
          type: 'warning',
          category: 'bibliography',
          file: 'bibliography.yaml',
          message: `Entri referensi "@${bibKey}" ada di bibliography.yaml tetapi tidak pernah dikutip di naskah.`,
          suggestion: `Kutip referensi ini dengan "@${bibKey}" di naskah, atau hapus entri jika tidak relevan.`
        })
      }
    }
  }

  // 8. Writing Style & Consistency Checks — per file .typ
  // Baca exclude & blacklist dari config.yaml (linter.exclude / linter.blacklist)
  interface BlacklistEntry { pattern: string; message?: string; severity?: 'warning' | 'info' }
  const blacklistRules: BlacklistEntry[] = []
  const linterExclude: Set<string> = new Set()

  if (configData?.linter) {
    // Exclude list
    if (Array.isArray(configData.linter.exclude)) {
      for (const p of configData.linter.exclude) {
        if (typeof p === 'string') linterExclude.add(p.trim().replace(/\\/g, '/'))
      }
    }
    // Blacklist
    if (Array.isArray(configData.linter.blacklist)) {
      for (const entry of configData.linter.blacklist) {
        if (typeof entry.pattern === 'string' && entry.pattern.trim()) {
          blacklistRules.push({
            pattern: entry.pattern.trim(),
            message: entry.message,
            severity: entry.severity === 'info' ? 'info' : 'warning'
          })
        }
      }
    }
  }

  for (const typFilePath of sectionTypFiles) {
    try {
      const relFile = path.relative(projectDir, typFilePath).replace(/\\/g, '/')

      // Skip file yang ada di daftar exclude linter
      if (linterExclude.has(relFile) || linterExclude.has(path.basename(relFile))) continue

      const content = await fs.readFile(typFilePath, 'utf-8')
      const lines = content.split('\n')

      let trailingWsCount = 0
      let tabCount = 0
      let maxConsecBlanks = 0
      let consecBlanks = 0
      let boldCount = 0
      let doubleSpaceCount = 0
      let punctSpaceCount = 0
      let digitStartCount = 0
      let missingCaptionCount = 0
      // blacklist: map pattern -> count of occurrences
      const blacklistHits = new Map<string, number>()

      let inCodeBlock = false

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const trimmed = line.trim()

        // Deteksi blok kode ``` - skip pengecekan penulisan di dalamnya
        if (trimmed.startsWith('```')) {
          inCodeBlock = !inCodeBlock
          continue
        }
        if (inCodeBlock) continue

        // Skip baris komentar Typst (//) dan baris heading (dimulai =)
        const isComment = trimmed.startsWith('//')
        const isHeading = /^=+\s/.test(trimmed)
        const isBlank = trimmed === ''

        // --- Struktur dasar ---
        if (line.length > 0 && /[ \t]+$/.test(line)) trailingWsCount++
        if (/^\t/.test(line)) tabCount++
        if (isBlank) {
          consecBlanks++
          if (consecBlanks > maxConsecBlanks) maxConsecBlanks = consecBlanks
        } else {
          consecBlanks = 0
        }

        if (isComment || isBlank) continue

        // --- Writing Checks (hanya di baris konten / paragraf) ---

        // Bold: *teks* di luar heading (Typst: * = bold/strong)
        // Hindari false positive untuk list item (* di awal baris) dan wildcard
        if (!isHeading) {
          const boldMatches = line.match(/(?<![*])\*(?!\s)([^*\n]+?)(?<!\s)\*(?![*])/g)
          if (boldMatches) boldCount += boldMatches.length
        }

        // Double space antar kata (lebih dari 1 spasi berturut)
        if (!isHeading && /\S  +\S/.test(line)) doubleSpaceCount++

        // Spasi sebelum tanda baca: " ," " ." " ;" " :"
        if (/\s[,\.;:]/.test(line)) punctSpaceCount++

        // Kalimat/paragraf diawali angka digit (bukan di dalam formula/kode Typst)
        // Hanya baris paragraf biasa (tidak dimulai #, =, -, +, /)
        if (!isHeading && !/^[#=\-+\/]/.test(trimmed) && /^\d/.test(trimmed)) digitStartCount++

        // #image() tanpa caption:
        if (line.includes('#image(') && !line.includes('caption:')) {
          // cek apakah caption ada di baris berikutnya (multiline call)
          const nextLines = lines.slice(i + 1, i + 5).join(' ')
          if (!nextLines.includes('caption:')) missingCaptionCount++
        }

        // Blacklist patterns dari config.yaml linter.blacklist
        for (const rule of blacklistRules) {
          try {
            const re = new RegExp(rule.pattern, 'gi')
            const matches = line.match(re)
            if (matches) {
              const cur = blacklistHits.get(rule.pattern) || 0
              blacklistHits.set(rule.pattern, cur + matches.length)
            }
          } catch {
            // pola regex invalid, skip
          }
        }
      }

      // --- Report issues per file ---
      if (trailingWsCount > 0) {
        issues.push({
          type: 'info', category: 'structure', file: relFile,
          message: `Ditemukan ${trailingWsCount} baris dengan trailing whitespace (spasi/tab di akhir baris).`,
          suggestion: 'Aktifkan "trim trailing whitespace on save" di editor.'
        })
      }
      if (tabCount > 0) {
        issues.push({
          type: 'info', category: 'structure', file: relFile,
          message: `Ditemukan ${tabCount} baris menggunakan karakter tab untuk indentasi.`,
          suggestion: 'Gunakan spasi (2 atau 4 spasi) alih-alih tab untuk konsistensi di Typst.'
        })
      }
      if (maxConsecBlanks > 2) {
        issues.push({
          type: 'info', category: 'structure', file: relFile,
          message: `Ditemukan ${maxConsecBlanks} baris kosong berturut-turut di dalam file.`,
          suggestion: 'Batasi spasi antar paragraf maksimal 2 baris kosong.'
        })
      }
      if (boldCount > 0) {
        issues.push({
          type: 'warning', category: 'writing', file: relFile,
          message: `Ditemukan ${boldCount} penggunaan teks tebal (*bold*) di paragraf.`,
          suggestion: 'Gunakan teks miring (_italic_) untuk penekanan istilah. Bold hanya untuk label/judul sesuai pedoman karya tulis.'
        })
      }
      if (doubleSpaceCount > 0) {
        issues.push({
          type: 'info', category: 'writing', file: relFile,
          message: `Ditemukan ${doubleSpaceCount} baris dengan spasi ganda antar kata.`,
          suggestion: 'Hapus spasi ekstra. Typst mengkolaps spasi ganda secara visual, tetapi source yang rapi penting untuk keterbacaan.'
        })
      }
      if (punctSpaceCount > 0) {
        issues.push({
          type: 'info', category: 'writing', file: relFile,
          message: `Ditemukan ${punctSpaceCount} baris dengan spasi sebelum tanda baca (contoh: "kata ," atau "kata .").`,
          suggestion: 'Tanda baca ditulis langsung setelah kata tanpa spasi: "kata," bukan "kata ,".'
        })
      }
      if (digitStartCount > 0) {
        issues.push({
          type: 'info', category: 'writing', file: relFile,
          message: `Ditemukan ${digitStartCount} kalimat/paragraf yang diawali angka numerik.`,
          suggestion: 'Dalam penulisan akademik, kalimat tidak boleh dimulai dengan angka. Tulis bilangan dalam kata (contoh: "Tiga puluh" bukan "30").'
        })
      }
      if (missingCaptionCount > 0) {
        issues.push({
          type: 'warning', category: 'writing', file: relFile,
          message: `Ditemukan ${missingCaptionCount} penggunaan #image() tanpa parameter caption:.`,
          suggestion: 'Setiap gambar dalam karya tulis ilmiah harus memiliki keterangan gambar (caption). Tambahkan parameter caption: "Gambar X. ...".'
        })
      }

      // Blacklist hits
      for (const [pattern, count] of blacklistHits.entries()) {
        const rule = blacklistRules.find(r => r.pattern === pattern)
        issues.push({
          type: rule?.severity || 'warning',
          category: 'writing',
          file: relFile,
          message: rule?.message
            ? `${rule.message} (ditemukan ${count}x)`
            : `Pola terlarang "${pattern}" ditemukan ${count}x di naskah.`,
          suggestion: `Periksa penggunaan "${pattern}" dan sesuaikan dengan ketentuan penulisan di config.yaml.`
        })
      }
    } catch {
      // ignore
    }
  }

  // Calculate Health Score
  const errorCount = issues.filter(i => i.type === 'error').length
  const warningCount = issues.filter(i => i.type === 'warning').length
  const infoCount = issues.filter(i => i.type === 'info').length

  let score = 100 - (errorCount * 20) - (warningCount * 8) - (infoCount * 2)
  if (score < 0) score = 0
  if (score > 100) score = 100

  return {
    timestamp: Date.now(),
    projectPath: projectDir,
    score,
    passed: errorCount === 0,
    errorCount,
    warningCount,
    infoCount,
    issues
  }
}

/**
 * Installs standalone validator scripts (validate.js and validate.bat) into the user's project.
 */
export async function installValidatorPluginFiles(projectDir: string): Promise<{ success: boolean; error?: string }> {
  try {
    const scriptsDir = path.join(projectDir, 'scripts')
    await fs.mkdir(scriptsDir, { recursive: true })

    const validatorJsPath = path.join(scriptsDir, 'validator.js')
    const validateBatPath = path.join(projectDir, 'validate.bat')

    // Read directly from the shared validator script (single source of truth)
    const bundledScriptPath = path.join(__dirname, '..', 'public', 'skills', 'glide-validator', 'scripts', 'validator.js')
    let validatorJsContent = ''
    try {
      validatorJsContent = await fs.readFile(bundledScriptPath, 'utf-8')
    } catch {
      // Fallback in packaged/dist mode
      const altPath = path.join(process.resourcesPath || __dirname, 'public', 'skills', 'glide-validator', 'scripts', 'validator.js')
      validatorJsContent = await fs.readFile(altPath, 'utf-8')
    }

    // Windows Batch Wrapper
    const validateBatContent = `@echo off
chcp 65001 >nul
title Glide Project Structure Validator
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js tidak ditemukan di PATH sistem Anda.
    echo Silakan install Node.js untuk menjalankan validator mandiri ini.
    pause
    exit /b 1
)
node "%~dp0scripts\\validator.js"
echo.
echo Tekan sembarang tombol untuk menutup jendela...
pause >nul
`

    await fs.writeFile(validatorJsPath, validatorJsContent, 'utf-8')
    await fs.writeFile(validateBatPath, validateBatContent, 'utf-8')

    // Inject linter: section ke config.yaml jika belum ada
    const configYamlPath = path.join(projectDir, 'config.yaml')
    const glideYamlPath = path.join(projectDir, 'glide.yaml')
    const existingConfigPath = await fs.stat(configYamlPath).then(() => configYamlPath).catch(async () =>
      await fs.stat(glideYamlPath).then(() => glideYamlPath).catch(() => null)
    )

    if (existingConfigPath) {
      const currentContent = await fs.readFile(existingConfigPath, 'utf-8')
      if (!currentContent.includes('linter:')) {
        // Ambil hanya bagian linter: dari template default (single source of truth di project.ts)
        const fullDefault = generateDefaultConfigYaml()
        const linterStart = fullDefault.indexOf('\n# ======\n# Konfigurasi Linter')
        const linterSection = linterStart !== -1
          ? '\n' + fullDefault.slice(linterStart).trimStart()
          : '\n# Linter section — tambahkan blacklist di bawah ini:\nlinter:\n  blacklist: []\n'
        await fs.appendFile(existingConfigPath, linterSection, 'utf-8')
      }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
