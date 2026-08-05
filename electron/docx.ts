import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { getGlideSections, loadGlideConfig } from './project.ts'
import { normalizeV1Paths } from './typst.ts'

/**
 * Mengompilasi proyek Glide ke format Microsoft Word (.docx)
 * Alur Presisi Tinggi: Generate Main Typst Payload -> HTML Output File (Inspectable) -> Pandoc DOCX Converter
 */
export async function compileGlideToDocx(
  projectDir: string,
  appRoot: string,
  outputDocxPath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const tempDir = path.join(projectDir, '.gld_temp')
    await fs.mkdir(tempDir, { recursive: true })

    const tempTypPath = path.join(tempDir, 'docx_build_preview.typ')
    const tempHtmlPath = path.join(tempDir, 'docx_build_preview.html')

    // 1. Ambil bab-bab dokumen proyek & config.yaml
    const sections = await getGlideSections(projectDir)
    const config = await loadGlideConfig(projectDir)

    // Formatter penomoran halaman berdasarkan config.yaml
    const numberStyle = config.page_numbering || '1'
    const footerAlign = config.page_number_align || 'center'
    const rawFont = config.font_family?.split(',')[0]?.replace(/['"]/g, '') || 'Times New Roman'
    const fontName = rawFont.toLowerCase().includes('liberation') ? 'Times New Roman' : rawFont

    let docxPayload = `// --- Glide 2.0 Word Export Payload ---

#import "/.gld_temp/themes/default/template.typ": *

#set page(
  paper: "a4",
  margin: (top: ${config.margin_top || '3cm'}, bottom: ${config.margin_bottom || '3cm'}, left: ${config.margin_left || '4cm'}, right: ${config.margin_right || '3cm'}),
  footer: context [
    #align(${footerAlign})[
      #counter(page).display("${numberStyle}")
    ]
  ]
)
#set text(font: "${fontName}", size: ${config.font_size || '12pt'})
#set par(justify: true, leading: ${config.line_spacing || '1.5'}em)

`

    // Sisipkan semua section termasuk cover.typ ke dalam payload Typst
    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i]
      if (sec.isPdf) continue

      docxPayload += `\n// --- File: ${sec.name} ---\n`
      const cleanContent = normalizeV1Paths(sec.content, projectDir)
      docxPayload += cleanContent + '\n'

      if (i < sections.length - 1) {
        docxPayload += `\n#pagebreak()\n`
      }
    }

    await fs.writeFile(tempTypPath, docxPayload, 'utf-8')

    // 2. Jalankan Typst CLI resmi (typst compile --features html) untuk mengonversi preview.typ -> preview.html
    return new Promise((resolve) => {
      const typstProc = spawn('typst', [
        'compile',
        '--features', 'html',
        tempTypPath,
        tempHtmlPath,
        '--root', projectDir
      ], { cwd: projectDir })

      let typstStderr = ''
      typstProc.stderr?.on('data', d => typstStderr += d.toString())

      typstProc.on('close', async (typstCode) => {
        if (typstCode !== 0) {
          resolve({
            success: false,
            error: `Typst Compiler Gagal Mengonversi Dokumen ke HTML (Exit Code ${typstCode}):\n\n${typstStderr || 'Pastikan Typst CLI terpasang di sistem.'}`
          })
          return
        }

        // 3. Baca HTML hasil Typst & post-process: fix heading shift + inject CSS justify
        try {
          let htmlContent = await fs.readFile(tempHtmlPath, 'utf-8')

          // Fix Heading Level Shift:
          // Typst HTML export menggunakan <h1> untuk root dokumen, sehingga semua heading turun 1 level.
          // Kita shift naik: h6->h5, h5->h4, h4->h3, h3->h2, h2->h1 (lakukan dari bawah ke atas!)
          htmlContent = htmlContent
            .replace(/<h6(\s[^>]*)?>/gi, '<h5$1>').replace(/<\/h6>/gi, '</h5>')
            .replace(/<h5(\s[^>]*)?>/gi, '<h4$1>').replace(/<\/h5>/gi, '</h4>')
            .replace(/<h4(\s[^>]*)?>/gi, '<h3$1>').replace(/<\/h4>/gi, '</h3>')
            .replace(/<h3(\s[^>]*)?>/gi, '<h2$1>').replace(/<\/h3>/gi, '</h2>')
            .replace(/<h2(\s[^>]*)?>/gi, '<h1$1>').replace(/<\/h2>/gi, '</h1>')

          // Inject CSS: justify semua paragraf + font Times New Roman
          const wordCss = `<style>
            body, p, li, td, th {
              font-family: 'Times New Roman', Times, serif !important;
              font-size: 12pt !important;
              line-height: 1.5 !important;
              text-align: justify !important;
              text-justify: inter-word !important;
            }
            h1, h2, h3, h4 {
              font-family: 'Times New Roman', Times, serif !important;
              font-weight: bold !important;
              text-align: center !important;
            }
            h2, h3 {
              text-align: left !important;
            }
            hr, .page-break {
              page-break-after: always !important;
              break-after: page !important;
            }
          </style>`

          if (htmlContent.includes('</head>')) {
            htmlContent = htmlContent.replace('</head>', `${wordCss}\n</head>`)
          } else {
            htmlContent = `<!DOCTYPE html><html><head>${wordCss}</head><body>${htmlContent}</body></html>`
          }

          await fs.writeFile(tempHtmlPath, htmlContent, 'utf-8')
        } catch {}

        // 4. Typst -> HTML Berhasil! Lanjutkan HTML -> DOCX via Pandoc dengan reference.docx sebagai template style
        const refDocPath = path.join(appRoot, 'public', 'reference.docx')
        const hasRefDoc = await fs.stat(refDocPath).then(() => true).catch(() => false)

        const pandocArgs = [
          tempHtmlPath,
          '-f', 'html',
          '-t', 'docx',
          '-o', outputDocxPath,
          '--toc',
          '--toc-depth=3'
        ]

        // Gunakan reference.docx jika tersedia (untuk font, margin, dan style Word yang presisi)
        if (hasRefDoc) {
          pandocArgs.push('--reference-doc', refDocPath)
        } else {
          pandocArgs.push('-V', 'mainfont=Times New Roman', '-V', 'fontsize=12pt')
        }

        const pandocDocxProc = spawn('pandoc', pandocArgs, { cwd: projectDir })

        let docxStderr = ''
        pandocDocxProc.stderr?.on('data', d => docxStderr += d.toString())

        pandocDocxProc.on('close', (docxCode) => {
          if (docxCode === 0) {
            resolve({ success: true })
          } else {
            let customErr = docxStderr || `Pandoc HTML -> DOCX gagal memproses dokumen (Exit Code ${docxCode}).`
            if (docxStderr.includes('permission denied') || docxStderr.includes('Permission denied')) {
              customErr = `Gagal menyimpan dokumen Word!\nBerkas target "${path.basename(outputDocxPath)}" sedang terbuka di Microsoft Word. Silakan tutup dokumen tersebut di Microsoft Word terlebih dahulu lalu coba lagi.`
            }
            resolve({ success: false, error: `Pandoc Gagal Mengonversi HTML ke DOCX:\n\n${customErr}` })
          }
        })

        pandocDocxProc.on('error', (err) => {
          resolve({ 
            success: false, 
            error: `Pandoc CLI tidak ditemukan di sistem (${err.message}).\nSilakan install Pandoc dari https://pandoc.org untuk mengaktifkan ekspor Word (.docx).` 
          })
        })
      })

      typstProc.on('error', (err) => {
        resolve({ 
          success: false, 
          error: `Typst CLI tidak ditemukan di sistem (${err.message}).\nPastikan Typst CLI sudah terpasang dan berada di PATH sistem.` 
        })
      })
    })
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
