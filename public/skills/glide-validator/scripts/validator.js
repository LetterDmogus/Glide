#!/usr/bin/env node
/**
 * Glide Project Structure Validator & Linter (Single Source of Truth)
 * Zero external dependencies. Compatible with ES Modules & Node.js 18+.
 * Used both by standalone terminal/bat execution and AI agent inspection.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Target directory can be passed as argument or default to current directory / parent of scripts
let targetDir = process.argv[2] && !process.argv[2].startsWith('--') 
  ? path.resolve(process.argv[2]) 
  : process.cwd();

if (path.basename(targetDir) === 'scripts' || path.basename(targetDir) === 'glide-validator') {
  targetDir = path.resolve(targetDir, '..');
}

const isJsonMode = process.argv.includes('--json');

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
};

const issues = [];

// 1. Config Check
const configPath = path.join(targetDir, 'config.yaml');
const glidePath = path.join(targetDir, 'glide.yaml');
const hasConfig = fs.existsSync(configPath) || fs.existsSync(glidePath);

if (!hasConfig) {
  issues.push({
    type: 'error',
    category: 'config',
    file: 'config.yaml',
    message: 'File konfigurasi "config.yaml" atau "glide.yaml" tidak ditemukan di root proyek.',
    suggestion: 'Buat file config.yaml untuk metadata dokumen dan pengaturan layout.'
  });
}

// 2. Sections Folder & Chapter Files Check
const sectionsDir = path.join(targetDir, 'sections');
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico']);
const DOC_EXTS = new Set(['.pdf', '.docx', '.xlsx', '.pptx', '.zip', '.rar', '.7z', '.txt']);

const typFiles = [];

if (!fs.existsSync(sectionsDir)) {
  issues.push({
    type: 'warning',
    category: 'sections',
    message: 'Folder "sections/" tidak ditemukan.',
    suggestion: 'Buat folder "sections/" untuk menyimpan bab-bab Typst (.typ).'
  });
} else {
  try {
    const entries = fs.readdirSync(sectionsDir, { withFileTypes: true });
    const chapterNumbers = [];

    for (const entry of entries) {
      const fullPath = path.join(sectionsDir, entry.name);
      const ext = path.extname(entry.name).toLowerCase();

      if (entry.isDirectory()) {
        issues.push({
          type: 'warning',
          category: 'sections',
          file: `sections/${entry.name}`,
          message: `Sub-folder terdeteksi di dalam sections/: "${entry.name}".`,
          suggestion: 'Sebaiknya letakkan file bab langsung di root folder sections/.'
        });
        continue;
      }

      if (IMAGE_EXTS.has(ext)) {
        issues.push({
          type: 'warning',
          category: 'sections',
          file: `sections/${entry.name}`,
          message: `File gambar "${entry.name}" tersasar di folder sections/.`,
          suggestion: 'Pindahkan file ini ke folder "images/".'
        });
        continue;
      }

      if (DOC_EXTS.has(ext)) {
        issues.push({
          type: 'warning',
          category: 'sections',
          file: `sections/${entry.name}`,
          message: `File non-Typst "${entry.name}" terdeteksi di dalam folder sections/.`,
          suggestion: 'Folder sections/ sebaiknya hanya berisi file bab Typst (.typ).'
        });
        continue;
      }

      if (ext === '.typ') {
        typFiles.push(fullPath);

        const stats = fs.statSync(fullPath);
        if (stats.size === 0) {
          issues.push({
            type: 'warning',
            category: 'sections',
            file: `sections/${entry.name}`,
            message: `File bab "${entry.name}" masih kosong (0 byte).`,
            suggestion: 'Tuliskan heading atau isi bab pada file ini.'
          });
        }

        const numMatch = entry.name.match(/^(\d+)/);
        if (numMatch) {
          chapterNumbers.push(parseInt(numMatch[1], 10));
        } else {
          issues.push({
            type: 'info',
            category: 'sections',
            file: `sections/${entry.name}`,
            message: `Nama file bab "${entry.name}" tidak memiliki awalan nomor urut.`,
            suggestion: 'Gunakan awalan angka seperti "01_nama.typ" agar urutan tersusun rapi.'
          });
        }
      }
    }

    if (chapterNumbers.length > 1) {
      chapterNumbers.sort((a, b) => a - b);
      for (let i = 0; i < chapterNumbers.length - 1; i++) {
        if (chapterNumbers[i + 1] - chapterNumbers[i] > 1) {
          issues.push({
            type: 'info',
            category: 'sections',
            message: `Nomor urut bab melompat dari bab ${chapterNumbers[i]} ke ${chapterNumbers[i + 1]}.`,
            suggestion: 'Pastikan penomoran bab berurutan.'
          });
        }
      }
    }

    if (typFiles.length === 0) {
      issues.push({
        type: 'warning',
        category: 'sections',
        message: 'Belum ada file bab (.typ) di dalam folder sections/.',
        suggestion: 'Tambahkan file bab pertama seperti "01_pendahuluan.typ".'
      });
    }
  } catch (err) {
    issues.push({
      type: 'error',
      category: 'sections',
      message: `Gagal membaca isi folder sections/: ${err.message}`
    });
  }
}

// 3. Cover Check
const coverPath = path.join(targetDir, 'cover.typ');
if (fs.existsSync(coverPath)) {
  typFiles.push(coverPath);
} else {
  issues.push({
    type: 'info',
    category: 'structure',
    file: 'cover.typ',
    message: 'cover.typ belum dibuat di root proyek.',
    suggestion: 'Buat cover.typ untuk halaman sampul dokumen.'
  });
}

// 4. Bibliography & Image references scanning in all .typ
const bibPath = path.join(targetDir, 'bibliography.yaml');
const hasBib = fs.existsSync(bibPath);
const validBibKeys = new Set();

if (hasBib) {
  try {
    const bibRaw = fs.readFileSync(bibPath, 'utf-8');
    const lines = bibRaw.split('\n');
    for (const line of lines) {
      const match = line.match(/^([a-zA-Z0-9_-]+)\s*:/);
      if (match) validBibKeys.add(match[1]);
    }
  } catch (err) {
    issues.push({
      type: 'warning',
      category: 'bibliography',
      file: 'bibliography.yaml',
      message: `Gagal memvalidasi bibliography.yaml: ${err.message}`
    });
  }
}

const citedKeys = new Map();
const imageRefs = [];

for (const tf of typFiles) {
  try {
    const rel = path.relative(targetDir, tf).replace(/\\/g, '/');
    const content = fs.readFileSync(tf, 'utf-8');

    // Citations
    const atRegex = /(?:^|[^a-zA-Z0-9_.])@([a-zA-Z0-9_-]+)/g;
    let m;
    while ((m = atRegex.exec(content)) !== null) {
      const k = m[1];
      if (['page', 'heading', 'text', 'par'].includes(k.toLowerCase())) continue;
      if (!citedKeys.has(k)) citedKeys.set(k, []);
      citedKeys.get(k).push(rel);
    }

    // Images
    const imgRegex = /#(?:image|glide-figure)\(\s*["']([^"']+)["']/g;
    while ((m = imgRegex.exec(content)) !== null) {
      imageRefs.push({ imgPath: m[1], sourceFile: rel });
    }
  } catch (e) {}
}

// Check Citations
if (citedKeys.size > 0 && !hasBib) {
  issues.push({
    type: 'warning',
    category: 'bibliography',
    file: 'bibliography.yaml',
    message: `Terdapat ${citedKeys.size} sitasi di naskah, tetapi bibliography.yaml belum dibuat.`,
    suggestion: 'Buat file bibliography.yaml.'
  });
} else if (hasBib) {
  for (const [key, files] of citedKeys.entries()) {
    if (!validBibKeys.has(key)) {
      issues.push({
        type: 'warning',
        category: 'bibliography',
        file: 'bibliography.yaml',
        message: `Sitasi "@${key}" dipakai di [${Array.from(new Set(files)).join(', ')}] tetapi belum ada di bibliography.yaml.`,
        suggestion: `Tambahkan entri "${key}:" ke dalam bibliography.yaml.`
      });
    }
  }
}

// Check Images Exist
const referencedImageNames = new Set();
for (const ref of imageRefs) {
  const clean = ref.imgPath.replace(/\\/g, '/');
  referencedImageNames.add(path.basename(clean).toLowerCase());
  const candidates = [
    path.join(targetDir, clean),
    path.join(targetDir, 'sections', clean)
  ];
  let found = false;
  for (const c of candidates) {
    if (fs.existsSync(c)) { found = true; break; }
  }
  if (!found) {
    issues.push({
      type: 'error',
      category: 'images',
      file: ref.sourceFile,
      message: `Aset gambar "${ref.imgPath}" tidak ditemukan di disk.`,
      suggestion: 'Pastikan file gambar telah ditaruh di folder yang benar (images/).'
    });
  }
}

// 5. Unused Images Check — gambar di folder images/ yang tidak pernah dirujuk di .typ manapun
const imagesDir = path.join(targetDir, 'images');
if (fs.existsSync(imagesDir)) {
  try {
    const allImageFiles = fs.readdirSync(imagesDir, { withFileTypes: true });
    for (const imgEntry of allImageFiles) {
      if (!imgEntry.isFile()) continue;
      const imgExt = path.extname(imgEntry.name).toLowerCase();
      if (!IMAGE_EXTS.has(imgExt)) continue;
      if (!referencedImageNames.has(imgEntry.name.toLowerCase())) {
        issues.push({
          type: 'warning',
          category: 'images',
          file: `images/${imgEntry.name}`,
          message: `File gambar "${imgEntry.name}" ada di folder images/ tetapi tidak pernah digunakan di naskah.`,
          suggestion: 'Hapus gambar yang tidak terpakai, atau rujuk file ini di salah satu file bab (.typ).'
        });
      }
    }
  } catch (err) {
    // ignore
  }
}

// 6. Unused Citations Check — entri bibliography.yaml yang tidak pernah dikutip di naskah
if (hasBib && validBibKeys.size > 0) {
  for (const bibKey of validBibKeys) {
    if (!citedKeys.has(bibKey)) {
      issues.push({
        type: 'warning',
        category: 'bibliography',
        file: 'bibliography.yaml',
        message: `Entri referensi "@${bibKey}" ada di bibliography.yaml tetapi tidak pernah dikutip di naskah.`,
        suggestion: `Kutip referensi ini di naskah dengan "@${bibKey}", atau hapus entri jika tidak relevan.`
      });
    }
  }
}

// 7. Writing Style & Consistency Checks — per file .typ
// Baca exclude & blacklist dari config.yaml (linter.exclude / linter.blacklist)
const blacklistRules = [];
const linterExclude = new Set();
try {
  const configRaw = fs.existsSync(configPath)
    ? fs.readFileSync(configPath, 'utf-8')
    : fs.existsSync(glidePath) ? fs.readFileSync(glidePath, 'utf-8') : '';
  if (configRaw && /^linter\s*:/m.test(configRaw)) {
    const cfgLines = configRaw.split('\n');
    let inExclude = false;
    let inBlacklist = false;
    let currentEntry = null;
    for (const cfgLine of cfgLines) {
      // Deteksi sub-section
      if (/^\s{2}exclude\s*:/.test(cfgLine)) { inExclude = true; inBlacklist = false; continue; }
      if (/^\s{2}blacklist\s*:/.test(cfgLine)) { inBlacklist = true; inExclude = false; if (currentEntry) { blacklistRules.push(currentEntry); currentEntry = null; } continue; }
      // Keluar dari linter block jika kembali ke root key
      if (/^[^\s#]/.test(cfgLine)) { inExclude = false; inBlacklist = false; break; }

      if (inExclude) {
        const m = cfgLine.match(/^\s*-\s*(.+?)\s*$/);
        if (m) linterExclude.add(m[1].replace(/^['"]|['"]$/g, '').replace(/\\/g, '/'));
      }

      if (inBlacklist) {
        if (/^\s*- pattern\s*:/.test(cfgLine)) {
          if (currentEntry) blacklistRules.push(currentEntry);
          const m = cfgLine.match(/pattern\s*:\s*['"]?(.+?)['"]?\s*$/);
          currentEntry = { pattern: m ? m[1].replace(/^['"]|['"]$/g, '') : '', message: '', severity: 'warning' };
        } else if (currentEntry && /^\s+message\s*:/.test(cfgLine)) {
          const m = cfgLine.match(/message\s*:\s*['"]?(.+?)['"]?\s*$/);
          if (m) currentEntry.message = m[1].replace(/^['"]|['"]$/g, '');
        } else if (currentEntry && /^\s+severity\s*:/.test(cfgLine)) {
          const m = cfgLine.match(/severity\s*:\s*(\w+)/);
          if (m) currentEntry.severity = m[1] === 'info' ? 'info' : 'warning';
        }
      }
    }
    if (currentEntry) blacklistRules.push(currentEntry);
  }
} catch (e) {}

for (const tf of typFiles) {
  try {
    const rel = path.relative(targetDir, tf).replace(/\\/g, '/');

    // Skip file yang ada di daftar exclude linter
    if (linterExclude.has(rel) || linterExclude.has(path.basename(rel))) continue;

    const content = fs.readFileSync(tf, 'utf-8');
    const lines = content.split('\n');

    let trailingWsCount = 0, tabCount = 0, maxConsecBlanks = 0, consecBlanks = 0;
    let boldCount = 0, doubleSpaceCount = 0, punctSpaceCount = 0, digitStartCount = 0, missingCaptionCount = 0;
    const blacklistHits = new Map();
    let inCodeBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed.startsWith('```')) { inCodeBlock = !inCodeBlock; continue; }
      if (inCodeBlock) continue;

      const isComment = trimmed.startsWith('//');
      const isHeading = /^=+\s/.test(trimmed);
      const isBlank = trimmed === '';

      // Struktur dasar
      if (line.length > 0 && /[ \t]+$/.test(line)) trailingWsCount++;
      if (/^\t/.test(line)) tabCount++;
      if (isBlank) { consecBlanks++; if (consecBlanks > maxConsecBlanks) maxConsecBlanks = consecBlanks; }
      else consecBlanks = 0;

      if (isComment || isBlank) continue;

      // Bold: *teks* di luar heading
      if (!isHeading) {
        const boldMatches = line.match(/(?<![*])\*(?!\s)([^*\n]+?)(?<!\s)\*(?![*])/g);
        if (boldMatches) boldCount += boldMatches.length;
      }

      // Double space
      if (!isHeading && /\S  +\S/.test(line)) doubleSpaceCount++;

      // Spasi sebelum tanda baca
      if (/\s[,\.;:]/.test(line)) punctSpaceCount++;

      // Kalimat diawali angka
      if (!isHeading && !/^[#=\-+\/]/.test(trimmed) && /^\d/.test(trimmed)) digitStartCount++;

      // #image() tanpa caption:
      if (line.includes('#image(') && !line.includes('caption:')) {
        const nextLines = lines.slice(i + 1, i + 5).join(' ');
        if (!nextLines.includes('caption:')) missingCaptionCount++;
      }

      // Blacklist patterns
      for (const rule of blacklistRules) {
        try {
          const re = new RegExp(rule.pattern, 'gi');
          const matches = line.match(re);
          if (matches) blacklistHits.set(rule.pattern, (blacklistHits.get(rule.pattern) || 0) + matches.length);
        } catch (e) {}
      }
    }

    if (trailingWsCount > 0) issues.push({ type: 'info', category: 'structure', file: rel, message: `Ditemukan ${trailingWsCount} baris dengan trailing whitespace (spasi/tab di akhir baris).`, suggestion: 'Aktifkan "trim trailing whitespace on save" di editor.' });
    if (tabCount > 0) issues.push({ type: 'info', category: 'structure', file: rel, message: `Ditemukan ${tabCount} baris menggunakan karakter tab untuk indentasi.`, suggestion: 'Gunakan spasi (2 atau 4 spasi) alih-alih tab untuk konsistensi di Typst.' });
    if (maxConsecBlanks > 2) issues.push({ type: 'info', category: 'structure', file: rel, message: `Ditemukan ${maxConsecBlanks} baris kosong berturut-turut di dalam file.`, suggestion: 'Batasi spasi antar paragraf maksimal 2 baris kosong.' });
    if (boldCount > 0) issues.push({ type: 'warning', category: 'writing', file: rel, message: `Ditemukan ${boldCount} penggunaan teks tebal (*bold*) di paragraf.`, suggestion: 'Gunakan teks miring (_italic_) untuk penekanan istilah. Bold hanya untuk label/judul sesuai pedoman karya tulis.' });
    if (doubleSpaceCount > 0) issues.push({ type: 'info', category: 'writing', file: rel, message: `Ditemukan ${doubleSpaceCount} baris dengan spasi ganda antar kata.`, suggestion: 'Hapus spasi ekstra. Typst mengkolaps spasi ganda secara visual, tetapi source yang rapi penting untuk keterbacaan.' });
    if (punctSpaceCount > 0) issues.push({ type: 'info', category: 'writing', file: rel, message: `Ditemukan ${punctSpaceCount} baris dengan spasi sebelum tanda baca (contoh: "kata ," atau "kata .").`, suggestion: 'Tanda baca ditulis langsung setelah kata tanpa spasi: "kata," bukan "kata ,".' });
    if (digitStartCount > 0) issues.push({ type: 'info', category: 'writing', file: rel, message: `Ditemukan ${digitStartCount} kalimat/paragraf yang diawali angka numerik.`, suggestion: 'Dalam penulisan akademik, kalimat tidak boleh dimulai dengan angka. Tulis bilangan dalam kata (contoh: "Tiga puluh" bukan "30").' });
    if (missingCaptionCount > 0) issues.push({ type: 'warning', category: 'writing', file: rel, message: `Ditemukan ${missingCaptionCount} penggunaan #image() tanpa parameter caption:.`, suggestion: 'Setiap gambar dalam karya tulis ilmiah harus memiliki keterangan gambar (caption). Tambahkan parameter caption: "Gambar X. ...".' });

    for (const [pattern, count] of blacklistHits.entries()) {
      const rule = blacklistRules.find(r => r.pattern === pattern);
      issues.push({ type: rule?.severity || 'warning', category: 'writing', file: rel, message: rule?.message ? `${rule.message} (ditemukan ${count}x)` : `Pola terlarang "${pattern}" ditemukan ${count}x di naskah.`, suggestion: `Periksa penggunaan "${pattern}" dan sesuaikan dengan ketentuan penulisan di config.yaml.` });
    }
  } catch (e) {}
}

// Summary Calculation
const errors = issues.filter(i => i.type === 'error').length;
const warnings = issues.filter(i => i.type === 'warning').length;
const infos = issues.filter(i => i.type === 'info').length;

let score = 100 - (errors * 20) - (warnings * 8) - (infos * 2);
if (score < 0) score = 0;
if (score > 100) score = 100;

if (isJsonMode) {
  console.log(JSON.stringify({
    timestamp: Date.now(),
    projectPath: targetDir,
    score,
    passed: errors === 0,
    errorCount: errors,
    warningCount: warnings,
    infoCount: infos,
    issues
  }, null, 2));
  process.exit(errors > 0 ? 1 : 0);
}

// Terminal Output
console.log(C.bold + C.cyan + "\n=======================================================" + C.reset);
console.log(C.bold + "    GLIDE PROJECT STRUCTURE VALIDATOR & LINTER       " + C.reset);
console.log(C.dim + "    Direktori: " + targetDir + C.reset);
console.log(C.bold + C.cyan + "=======================================================\\n" + C.reset);

if (issues.length === 0) {
  console.log(C.bold + C.green + "  [OK] Proyek Sehat & Sempurna! (Score: 100/100)" + C.reset);
} else {
  for (const item of issues) {
    let icon = C.red + "[ERROR]" + C.reset;
    if (item.type === 'warning') icon = C.yellow + "[WARN] " + C.reset;
    if (item.type === 'info') icon = C.cyan + "[INFO] " + C.reset;

    console.log(`  ${icon} [${item.category.toUpperCase()}] ${item.message}`);
    if (item.file) console.log(C.dim + `         File: ${item.file}` + C.reset);
    if (item.suggestion) console.log(C.dim + `         Saran: ${item.suggestion}` + C.reset);
    console.log();
  }
}

console.log(C.bold + C.cyan + "-------------------------------------------------------" + C.reset);
console.log(`  Skor Kesehatan: ${score}/100  |  Error: ${errors}  |  Peringatan: ${warnings}  |  Info: ${infos}`);
console.log(C.bold + C.cyan + "=======================================================\\n" + C.reset);

process.exit(errors > 0 ? 1 : 0);
