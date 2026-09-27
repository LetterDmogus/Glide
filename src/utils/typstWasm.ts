import { $typst } from '@myriaddreamin/typst.ts/contrib/snippet'

let isWasmInitialized = false
let initPromise: Promise<boolean> | null = null

/**
 * Inisialisasi engine Typst WASM Compiler & Renderer di dalam memori RAM
 */
export async function initTypstWasm(): Promise<boolean> {
  if (isWasmInitialized) return true
  if (initPromise) return initPromise

  initPromise = (async () => {
    try {
      // Setup options untuk load local WASM binary
      $typst.setCompilerInitOptions({
        beforeBuild: []
      })
      $typst.setRendererInitOptions({
        beforeBuild: []
      })

      // Tunggu instance compiler & renderer siap
      await $typst.getCompiler()
      await $typst.getRenderer()

      isWasmInitialized = true
      return true
    } catch (err) {
      console.warn('[Typst WASM Init Warning]:', err)
      return false
    }
  })()

  return initPromise
}

/**
 * Render dokumen Typst langsung di memori RAM dan kembalikan array string SVG per halaman
 */
export async function renderTypstWasmInMemory(
  mainTypContent: string,
  virtualFiles: Record<string, string> = {}
): Promise<{ success: boolean; pages?: string[]; error?: string }> {
  try {
    const ready = await initTypstWasm()
    if (!ready) {
      return { success: false, error: 'Typst WASM runtime failed to initialize' }
    }

    // Suntikkan berkas pendukung (misal template.typ, bibliography.yaml) ke RAM shadow FS
    await $typst.resetShadow()
    for (const [vPath, content] of Object.entries(virtualFiles)) {
      const cleanPath = vPath.startsWith('/') ? vPath : `/${vPath}`
      const encoder = new TextEncoder()
      await $typst.mapShadow(cleanPath, encoder.encode(content))
    }

    // Set konten file utama ke RAM
    const mainPath = '/main.typ'
    const encoder = new TextEncoder()
    await $typst.mapShadow(mainPath, encoder.encode(mainTypContent))
    $typst.setMainFilePath(mainPath)

    // Render ke SVG string langsung di memori
    const svgOutput = await $typst.svg({
      mainFilePath: mainPath
    })

    if (!svgOutput) {
      return { success: false, error: 'Empty SVG output generated from WASM' }
    }

    // Ekstrak tag SVG per halaman
    const pages: string[] = []
    const svgRegex = /<svg[\s\S]*?<\/svg>/gi
    let match: RegExpExecArray | null
    while ((match = svgRegex.exec(svgOutput)) !== null) {
      pages.push(match[0])
    }

    if (pages.length === 0 && svgOutput.trim()) {
      pages.push(svgOutput.trim())
    }

    return {
      success: true,
      pages
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || String(err)
    }
  }
}
